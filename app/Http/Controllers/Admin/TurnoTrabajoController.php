<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\Agente;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\TurnoTrabajo;
use Inertia\Response;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;

class TurnoTrabajoController extends Controller
{
    public function index(Request $request): Response
    {
        $fecha = $request->input('fecha', now()->toDateString());

        return Inertia::render('Turnos/index', [
            'agentesDisponibles' => Agente::orderBy('apellido')->get(['id', 'nombre', 'apellido']),
            'fechaInicial' => $fecha,
            'horariosConfig' => config('turnos.horarios'),
            'especialConfig' => config('turnos.especial'),
            'turnosDelDia' => TurnoTrabajo::whereDate('fecha', $fecha)->get(['agente_id', 'turno']),
        ]);
    }
    public function store(TurnoTrabajoRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $agenteIds = $datos['agente_ids'];
        $esEspecial = $datos['turno'] === 'especial';

        $asignacionId = count($agenteIds) > 1 ? (string) Str::uuid() : null;

        try {
            DB::transaction(function () use ($agenteIds, $datos, $asignacionId, $esEspecial) {
                $ocupados = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
                    ->whereIn('agente_id', $agenteIds)
                    ->lockForUpdate()
                    ->pluck('agente_id');
                if ($ocupados->isNotEmpty()) {
                    $this->fallarPorOcupados($ocupados->all());
                }

                foreach ($agenteIds as $agenteId) {
                    TurnoTrabajo::create([
                        'agente_id' => $agenteId,
                        'fecha' => $datos['fecha'],
                        'turno' => $datos['turno'],
                        'hora_inicio_prog' => $esEspecial ? $datos['hora_inicio_prog'] : null,
                        'hora_fin_prog' => $esEspecial ? $datos['hora_fin_prog'] : null,
                        'asignacion_id' => $asignacionId,
                    ]);
                }
            });
        } catch (UniqueConstraintViolationException) {
            //  asignación simultánea no
            throw ValidationException::withMessages([
                'agente_id' => 'Alguno de los agentes ya tiene ese turno asignado.',
            ]);
        }

        $cantidad = count($agenteIds);

        return back()->with(
            'success',
            $cantidad === 1 ? 'Turno asignado correctamente.' : "Turno asignado a {$cantidad} agentes.",
        );
    }

    public function update(TurnoTrabajoRequest $request, TurnoTrabajo $turno): RedirectResponse
    {
        if (!$turno->estaProgramado() || $turno->fichajes()->exists()) {
            return back()->with('error', 'No se puede modificar: el turno ya tiene fichajes o no está programado.');
        }

        $datos = $request->validated();

        $duplicado = TurnoTrabajo::where('agente_id', $turno->agente_id)
            ->where('fecha', $datos['fecha'])
            ->where('turno', $datos['turno'])
            ->whereKeyNot($turno->id)
            ->exists();

        if ($duplicado) {
            throw ValidationException::withMessages([
                'turno' => 'El agente ya tiene ese turno asignado en esa fecha.',
            ]);
        }

        if ($datos['turno'] !== 'especial') {
            $horario = config("turnos.horarios.{$datos['turno']}");

            abort_unless(is_array($horario) && count($horario) >= 2, 500, 'Horario de turno no configurado.');

            [$datos['hora_inicio_prog'], $datos['hora_fin_prog']] = $horario;
        }

        try {
            $turno->update($datos);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'turno' => 'El agente ya tiene ese turno asignado en esa fecha.',
            ]);
        }

        return back()->with('success', 'Turno actualizado correctamente.');
    }
    public function storeJornada(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'fecha' => ['required', 'date'],
            'ir_a_tareas' => ['sometimes', 'boolean'],
            'bloques' => ['required', 'array', 'min:1', 'max:3'],
            'bloques.*.turno' => ['required', 'in:manana,tarde,noche,especial'],
            'bloques.*.agente_ids' => ['required', 'array', 'min:1'],
            'bloques.*.agente_ids.*' => ['integer', 'exists:agentes,id'], // ajustá el nombre de la tabla
            'bloques.*.hora_inicio_prog' => ['nullable', 'date_format:H:i'],
            'bloques.*.hora_fin_prog' => ['nullable', 'date_format:H:i'],
        ]);

        $bloques = collect($datos['bloques']);

        // La jornada normal exige los tres turnos; la especial, uno solo
        $turnos = $bloques->pluck('turno')->sort()->values()->all();
        $esEspecial = in_array('especial', $turnos, true);
        $esperado = $esEspecial ? ['especial'] : ['manana', 'noche', 'tarde'];

        if ($turnos !== $esperado) {
            throw ValidationException::withMessages([
                'bloques' => 'La jornada normal necesita mañana, tarde y noche, con al menos un agente en cada una.',
            ]);
        }

        // Un agente no puede estar en dos bloques el mismo día
        $todos = $bloques->pluck('agente_ids')->flatten();
        if ($todos->count() !== $todos->unique()->count()) {
            throw ValidationException::withMessages([
                'bloques' => 'Un agente no puede estar en más de un turno el mismo día.',
            ]);
        }

        // Turno especial: horas obligatorias y dentro del rango configurado
        if ($esEspecial) {
            $b = $bloques->first();

            if (empty($b['hora_inicio_prog']) || empty($b['hora_fin_prog'])) {
                throw ValidationException::withMessages([
                    'bloques' => 'El turno especial necesita hora de inicio y de fin.',
                ]);
            }

            $inicio = Carbon::createFromFormat('H:i', $b['hora_inicio_prog']);
            $fin = Carbon::createFromFormat('H:i', $b['hora_fin_prog']);
            if ($fin->lessThanOrEqualTo($inicio)) {
                $fin->addDay(); // cruza medianoche
            }
            $horas = $inicio->diffInMinutes($fin) / 60;

            $min = config('turnos.especial.min_horas');
            $max = config('turnos.especial.max_horas');
            if ($horas < $min || $horas > $max) {
                throw ValidationException::withMessages([
                    'bloques' => "El turno especial debe durar entre {$min} y {$max} horas.",
                ]);
            }
        }

        try {
            DB::transaction(function () use ($bloques, $datos, $todos, $esEspecial) {
                $ocupados = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
                    ->whereIn('agente_id', $todos->all())
                    ->lockForUpdate()
                    ->pluck('agente_id');

                if ($ocupados->isNotEmpty()) {
                    $this->fallarPorOcupados($ocupados->all());
                }

                foreach ($bloques as $bloque) {
                    $asignacionId = count($bloque['agente_ids']) > 1 ? (string) Str::uuid() : null;

                    foreach ($bloque['agente_ids'] as $agenteId) {
                        TurnoTrabajo::create([
                            'agente_id' => $agenteId,
                            'fecha' => $datos['fecha'],
                            'turno' => $bloque['turno'],
                            'hora_inicio_prog' => $esEspecial ? $bloque['hora_inicio_prog'] : null,
                            'hora_fin_prog' => $esEspecial ? $bloque['hora_fin_prog'] : null,
                            'asignacion_id' => $asignacionId,
                        ]);
                    }
                }
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'bloques' => 'Alguno de los agentes ya tiene turno asignado en esa fecha.',
            ]);
        }

        if ($request->boolean('ir_a_tareas')) {
            return redirect('/admin/turnos/tareas?' . http_build_query(['fecha' => $datos['fecha']]))
                ->with('success', 'Jornada guardada. Ahora podés asignar las tareas.');
        }

        return back()->with('success', 'Jornada guardada correctamente.');
    }


    public function destroy(TurnoTrabajo $turno): RedirectResponse
    {
        // Protege el historial no es una eliminacion completa
        if ($turno->fichajes()->exists()) {
            return back()->with('error', 'No se puede eliminar: el turno tiene fichajes registrados.');
        }

        // Las intervenciones protegen a sus tareas (restrictOnDelete)
        if ($turno->tareas()->whereHas('intervenciones')->exists()) {
            return back()->with('error', 'No se puede eliminar: el turno tiene tareas con intervenciones registradas.');
        }

        $turno->delete(); // borra también sus tareas 

        return back()->with('success', 'Turno eliminado correctamente.');
    }

    private function fallarPorOcupados(array $agenteIds): never
    {
        $nombres = Agente::whereIn('id', $agenteIds)->get()
            ->map(fn($a) => "{$a->apellido}, {$a->nombre}")
            ->implode('; ');

        throw ValidationException::withMessages([
            'agente_ids' => "Ya tienen ese turno asignado: {$nombres}.",
        ]);
    }
    public function listado(Request $request)
    {
        $desde = $request->input('desde', now()->startOfMonth()->toDateString());
        $hasta = $request->input('hasta', now()->endOfMonth()->toDateString());

        $turnos = TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereBetween('fecha', [$desde, $hasta])
            ->orderBy('fecha')
            ->orderByRaw("FIELD(turno, 'manana','tarde','noche','especial')")
            ->get();

        return Inertia::render('Turnos/listado', [
            'turnos' => $turnos,
            'filtros' => ['desde' => $desde, 'hasta' => $hasta],
        ]);
    }
}