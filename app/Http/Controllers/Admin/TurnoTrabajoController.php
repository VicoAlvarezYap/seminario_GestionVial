<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\Agente;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\TurnoTrabajo;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;

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
            return back()->with('error', 'No se puede modificar: el turno ya tiene fichajess o no está programado.');
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
            return back()->with('error', 'No se puede eliminar: el turno tiene fichajess registrados.');
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
    public function listado(Request $request): Response
    {
        $f = $this->filtrosProximos($request);
        $hoy = now()->toDateString();

        $paginador = $this->fechasPaginadas($f['desde'], $f['hasta'], $f['agente']);
        $fechas = $paginador->getCollection()->all();
        return Inertia::render('Turnos/listado', [
            'hoy' => $hoy,
            'manana' => now()->addDay()->toDateString(),
            'horariosConfig' => config('turnos.horarios'),
            'turnosHoy' => $this->turnosEntre($hoy, $hoy),
            'proximos' => $this->turnosEntre(
                $f['desde'],
                $f['hasta'],
                $f['agente'],
                soloVigentes: true,
                soloFechas: $fechas,
            ),
            'filtros' => $f,
            'agentes' => Agente::orderBy('apellido')->get(['id', 'nombre', 'apellido']),
            'paginacion' => [
                'actual' => $paginador->currentPage(),
                'ultima' => $paginador->lastPage(),
                'total' => $paginador->total(),
            ],
        ]);
    }

    public function listadoPdf(Request $request)
    {
        $f = $this->filtrosProximos($request);

        $turnos = $this->turnosEntre($f['desde'], $f['hasta'], $f['agente'], soloVigentes: true);

        $pdf = Pdf::loadView('pdf.turnos-proximos', [
            'turnos' => $turnos->groupBy('fecha'),
            'desde' => $f['desde'],
            'hasta' => $f['hasta'],
            'agente' => $f['agente'] ? Agente::find($f['agente']) : null,
            'horarios' => config('turnos.horarios'),
            'generado' => now(),
        ])->setPaper('a4');

        return $pdf->download("turnos-{$f['desde']}-a-{$f['hasta']}.pdf");
    }

    /** Normaliza los filtros de "Turnos próximos": desde, hasta y agente. */
    private function filtrosProximos(Request $request): array
    {
        $request->validate([
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d'],
            'agente' => ['nullable', 'integer', 'exists:agentes,id'],
        ]);

        $manana = now()->addDay()->startOfDay();

        // Por defecto: desde mañana, una semana
        $desde = $request->filled('desde') ? Carbon::parse($request->input('desde'))->startOfDay() : $manana->copy();
        if ($desde->lt($manana)) {
            $desde = $manana->copy(); // "próximos" nunca incluye hoy ni el pasado
        }

        $hasta = $request->filled('hasta') ? Carbon::parse($request->input('hasta'))->startOfDay() : $desde->copy()->addDays(6);
        if ($hasta->lt($desde)) {
            $hasta = $desde->copy();
        }
        if ($hasta->gt($desde->copy()->addDays(365))) {
            $hasta = $desde->copy()->addDays(365); // tope de un año
        }

        return [
            'desde' => $desde->toDateString(),
            'hasta' => $hasta->toDateString(),
            'agente' => $request->filled('agente') ? (int) $request->input('agente') : null,
        ];
    }
    private function queryTurnos(string $desde, string $hasta, ?int $agenteId = null, bool $soloVigentes = false)
    {
        return TurnoTrabajo::query()
            ->whereDate('fecha', '>=', $desde)
            ->whereDate('fecha', '<=', $hasta)
            ->when($agenteId, fn($q) => $q->where('agente_id', $agenteId))
            ->when($soloVigentes, fn($q) => $q->whereNotIn('estado_turno', ['cancelado', 'reasignado']));
    }
    private function fechasPaginadas(string $desde, string $hasta, ?int $agenteId, int $porPagina = 3): LengthAwarePaginator
    {
        $dias = $this->queryTurnos($desde, $hasta, $agenteId, soloVigentes: true)
            ->selectRaw('DATE(fecha) as dia')
            ->distinct()
            ->orderBy('dia')
            ->pluck('dia');

        $total = $dias->count();
        $ultima = max(1, (int) ceil($total / $porPagina));

        // Si piden una página que no existe, se lleva a la última
        $pagina = min(max(1, (int) request()->input('page', 1)), $ultima);

        return new LengthAwarePaginator(
            $dias->forPage($pagina, $porPagina)->values(),
            $total,
            $porPagina,
            $pagina,
        );
    }

    private function turnosEntre(string $desde, string $hasta, ?int $agenteId = null, bool $soloVigentes = false, ?array $soloFechas = null): Collection
    {

        return $this->queryTurnos($desde, $hasta, $agenteId, $soloVigentes)
            ->with('agente:id,nombre,apellido')
            ->when($soloFechas !== null, fn($q) => $q->whereIn(DB::raw('DATE(fecha)'), $soloFechas))
            ->orderBy('fecha')
            ->orderByRaw("CASE turno
            WHEN 'manana' THEN 1
            WHEN 'tarde' THEN 2
            WHEN 'noche' THEN 3
            ELSE 4 END")
            ->get()
            ->map(function (TurnoTrabajo $t) {
                $estado = $t->estado_turno;

                return [
                    'id' => $t->id,
                    'fecha' => Carbon::parse($t->fecha)->toDateString(), // siempre YYYY-MM-DD
                    'turno' => $t->turno,
                    'hora_inicio_prog' => $t->hora_inicio_prog,
                    'hora_fin_prog' => $t->hora_fin_prog,
                    'estado' => $estado instanceof \BackedEnum ? $estado->value : (string) $estado,
                    'agente' => $t->agente,
                ];
            })
            ->values();
    }
}