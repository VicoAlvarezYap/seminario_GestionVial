<?php

namespace App\Http\Controllers\Admin;

use App\Exports\TurnosExcel;
use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\Agente;
use App\Models\EventoOperativo;
use App\Models\Fichaje;
use App\Models\HistorialDeLicencias;
use App\Models\Lugar;
use App\Models\Tarea;
use App\Models\TurnoTrabajo;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TurnoTrabajoController extends Controller
{
    private const NOMBRES_TURNO = [
        'manana' => 'Mañana',
        'tarde' => 'Tarde',
        'noche' => 'Noche',
        'especial' => 'Especial',
    ];

    /* ---------------------------------------------------------------
     |  Asignación de turnos
     | --------------------------------------------------------------- */

    public function index(Request $request): Response
    {
        $fecha = $request->input('fecha', now()->toDateString());

        return Inertia::render('Turnos/index', [
            'agentesDisponibles' => Agente::orderBy('apellido')->get(['id', 'nombre', 'apellido']),
            'fechaInicial' => $fecha,
            'horariosConfig' => config('turnos.horarios'),
            'especialConfig' => config('turnos.especial'),
            'turnosDelDia' => TurnoTrabajo::whereDate('fecha', $fecha)->get(['agente_id', 'turno']),
            'conLicencia' => $this->agentesConLicencia($fecha),
        ]);
    }

    public function store(TurnoTrabajoRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $agenteIds = $datos['agente_ids'];
        $esEspecial = $datos['turno'] === 'especial';

        $asignacionId = count($agenteIds) > 1 ? (string) Str::uuid() : null;

        $conLicencia = $this->conLicenciaAprobada($agenteIds, $datos['fecha']);
        if ($conLicencia->isNotEmpty()) {
            $this->fallarPorLicencia($conLicencia->all());
        }

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
            // Asignación simultánea del mismo agente
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

        if (!$turno->enPlazoDeEdicion()) {
            $limite = $turno->limiteEdicion()->format('d/m/Y H:i');

            return back()->with('error', "Ya no se puede modificar: el plazo venció el {$limite} (una hora antes del inicio).");
        }

        $datos = $request->validated();

        // Un agente, un turno por día (igual que al asignar)
        $duplicado = TurnoTrabajo::where('agente_id', $datos['agente_id'])
            ->whereDate('fecha', $datos['fecha'])
            ->whereKeyNot($turno->id)
            ->exists();

        if ($duplicado) {
            throw ValidationException::withMessages([
                'fecha' => 'El agente ya tiene un turno asignado en esa fecha.',
            ]);
        }

        // Licencia aprobada en la nueva fecha / para el nuevo agente
        $conLicencia = $this->conLicenciaAprobada([(int) $datos['agente_id']], $datos['fecha']);
        if ($conLicencia->isNotEmpty()) {
            $this->fallarPorLicencia($conLicencia->all(), 'fecha');
        }

        if ($datos['turno'] !== 'especial') {
            $horario = config("turnos.horarios.{$datos['turno']}");

            abort_unless(is_array($horario) && count($horario) >= 2, 500, 'Horario de turno no configurado.');

            [$datos['hora_inicio_prog'], $datos['hora_fin_prog']] = $horario;
        }

        // El nuevo horario tampoco puede quedar en el pasado ni dentro de la hora previa
        $nuevoInicio = Carbon::parse("{$datos['fecha']} {$datos['hora_inicio_prog']}");
        if ($nuevoInicio->lt(now()->addMinutes(TurnoTrabajo::MINUTOS_LIMITE_EDICION))) {
            throw ValidationException::withMessages([
                'fecha' => 'El turno tiene que empezar al menos una hora después de este momento.',
            ]);
        }

        $cambio = $turno->agente_id !== (int) $datos['agente_id']
            || $turno->fecha->toDateString() !== $datos['fecha']
            || $turno->turno !== $datos['turno']
            || substr((string) $turno->hora_inicio_prog, 0, 5) !== substr($datos['hora_inicio_prog'], 0, 5)
            || substr((string) $turno->hora_fin_prog, 0, 5) !== substr($datos['hora_fin_prog'], 0, 5);

        $conTareas = $cambio && $turno->tareas()->exists();
        if ($conTareas) {
            // Las intervenciones protegen a sus tareas (igual que en destroy)
            if ($turno->tareas()->whereHas('intervenciones')->exists()) {
                return back()->with('error', 'No se puede modificar: el turno tiene tareas con intervenciones registradas.');
            }

            // Protege contra tareas agregadas después de abrir el formulario
            if (!$request->boolean('confirmar_borrado_tareas')) {
                throw ValidationException::withMessages([
                    'tareas' => 'Este turno tiene tareas asignadas y se eliminarían al modificarlo. Volvé a abrir el formulario y confirmá.',
                ]);
            }
        }

        try {
            DB::transaction(function () use ($turno, $datos, $conTareas) {
                if ($conTareas) {
                    Tarea::where('turno_trabajo_id', $turno->id)->delete();
                }

                $turno->update(Arr::only($datos, ['agente_id', 'fecha', 'turno', 'hora_inicio_prog', 'hora_fin_prog']));
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'turno' => 'El agente ya tiene ese turno asignado en esa fecha.',
            ]);
        }

        return back()->with(
            'success',
            $conTareas
                ? 'Turno actualizado. Se eliminaron sus tareas: asignalas de nuevo.'
                : 'Turno actualizado correctamente.',
        );
    }

    public function storeJornada(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'fecha' => ['required', 'date'],
            'ir_a_tareas' => ['sometimes', 'boolean'],
            'bloques' => ['required', 'array', 'min:1', 'max:3'],
            'bloques.*.turno' => ['required', 'in:manana,tarde,noche,especial'],
            'bloques.*.agente_ids' => ['required', 'array', 'min:1'],
            'bloques.*.agente_ids.*' => ['integer', 'exists:agentes,id'],
            'bloques.*.hora_inicio_prog' => ['nullable', 'date_format:H:i'],
            'bloques.*.hora_fin_prog' => ['nullable', 'date_format:H:i'],
        ]);

        $bloques = collect($datos['bloques']);

        $turnos = $bloques->pluck('turno');
        $esEspecial = $turnos->contains('especial');

        if ($turnos->count() !== $turnos->unique()->count()) {
            throw ValidationException::withMessages([
                'bloques' => 'No puede repetirse un turno en la misma jornada.',
            ]);
        }

        if ($esEspecial && $turnos->count() > 1) {
            throw ValidationException::withMessages([
                'bloques' => 'El turno especial no se puede combinar con mañana, tarde o noche.',
            ]);
        }

        // Un agente no puede estar en dos bloques el mismo día
        $todos = $bloques->pluck('agente_ids')->flatten();
        if ($todos->count() !== $todos->unique()->count()) {
            throw ValidationException::withMessages([
                'bloques' => 'Un agente no puede estar en más de un turno el mismo día.',
            ]);
        }

        // Agentes con licencia aprobada ese día
        $conLicencia = $this->conLicenciaAprobada($todos->all(), $datos['fecha']);
        if ($conLicencia->isNotEmpty()) {
            $this->fallarPorLicencia($conLicencia->all(), 'bloques');
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
                    $this->fallarPorOcupados($ocupados->all(), 'bloques');
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
        // Protege el historial: no es una eliminación completa
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

    /* ---------------------------------------------------------------
     |  Listado de turnos próximos (+ Excel / PDF)
     | --------------------------------------------------------------- */

    public function listado(Request $request): Response
    {
        $f = $this->filtrosProximos($request);
        $hoy = now()->toDateString();

        $paginador = $this->fechasPaginadas($f['desde'], $f['hasta'], $f['agente'], orden: 'asc');
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
                orden: 'asc',
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

    public function listadoExcel(Request $request)
    {
        $f = $this->filtrosProximos($request);

        $turnos = $this->turnosEntre(
            $f['desde'],
            $f['hasta'],
            $f['agente'],
            soloVigentes: true,
            orden: 'asc',
        );

        // turnosEntre devuelve arreglos; el exportador espera modelos, así que los reconstruimos
        $modelos = TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereIn('id', $turnos->pluck('id'))
            ->orderBy('fecha')
            ->orderByRaw("CASE turno WHEN 'manana' THEN 1 WHEN 'tarde' THEN 2 WHEN 'noche' THEN 3 ELSE 4 END")
            ->get();

        return TurnosExcel::descargar($modelos, "turnos-{$f['desde']}-a-{$f['hasta']}.xlsx");
    }

    public function listadoPdf(Request $request)
    {
        $f = $this->filtrosProximos($request);

        $turnos = $this->turnosEntre($f['desde'], $f['hasta'], $f['agente'], soloVigentes: true, orden: 'asc');

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

    /* ---------------------------------------------------------------
     |  Historial
     | --------------------------------------------------------------- */

    public function historial(Request $request): Response
    {
        return $this->vistaHistorial($request, null, '/admin/turnos/historial', true);
    }

    public function miHistorial(Request $request): Response
    {
        $agenteId = $request->user()->agente?->id; // ajustá según tu relación
        abort_unless($agenteId, 403);

        return $this->vistaHistorial($request, $agenteId, '/mi-historial-turnos', false);
    }

    private function vistaHistorial(Request $request, ?int $agenteForzado, string $ruta, bool $esAdmin): Response
    {
        $f = $this->filtrosHistorial($request, $agenteForzado);

        $paginador = $this->fechasPaginadas(
            $f['desde'],
            $f['hasta'],
            $f['agente'],
            porPagina: 10,
            soloVigentes: false,
            orden: 'desc',
            estado: $f['estado'],
        );

        return Inertia::render('Turnos/historial', [
            'turnos' => $this->turnosEntre(
                $f['desde'],
                $f['hasta'],
                $f['agente'],
                soloFechas: $paginador->getCollection()->all(),
                orden: 'desc',
                estado: $f['estado'],
            ),
            'horariosConfig' => config('turnos.horarios'),
            'filtros' => $f,
            'agentes' => $esAdmin ? Agente::orderBy('apellido')->get(['id', 'nombre', 'apellido']) : [],
            'paginacion' => [
                'actual' => $paginador->currentPage(),
                'ultima' => $paginador->lastPage(),
                'total' => $paginador->total(),
            ],
            'ruta' => $ruta,
            'esAdmin' => $esAdmin,
        ]);
    }

    /** Pantalla "Asignar tarea": agentes con turno en el dia, agrupados por bloque. */
    public function asignarTareasForm(Request $request): Response
    {
        $fecha = $request->input('fecha', now()->toDateString());

        $turnos = TurnoTrabajo::with([
            'agente:id,nombre,apellido',
            'tareas' => fn($q) => $q->where('estado', '!=', 'cancelada')->orderBy('hora_inicio'),
        ])
            ->whereDate('fecha', $fecha)
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->get();

        $agentesPorTurno = collect(TurnoTrabajo::TURNOS)->mapWithKeys(fn(string $t) => [
            $t => $turnos->where('turno', $t)
                ->map(fn(TurnoTrabajo $x) => [
                    'turno_id' => $x->id,
                    'agente_id' => $x->agente_id,
                    'nombre' => "{$x->agente->apellido}, {$x->agente->nombre}",
                    'tiene_tarea' => $x->tareas->isNotEmpty(),
                    'hora_inicio' => $x->hora_inicio_prog ? substr($x->hora_inicio_prog, 0, 5) : null,
                    'hora_fin' => $x->hora_fin_prog ? substr($x->hora_fin_prog, 0, 5) : null,
                    'tareas' => $x->tareas->map(fn($tarea) => [
                        'titulo' => $tarea->titulo_final,
                        'hora_inicio' => $tarea->hora_inicio_corta,
                        'hora_fin' => $tarea->hora_fin_corta,
                    ])->values()->all(),
                ])
                ->values()
                ->all(),
        ]);

        return Inertia::render('Turnos/tareas', [
            'fecha' => $fecha,
            'agentesPorTurno' => $agentesPorTurno,
            'tareasSugeridas' => config('tareas.titulos'),
            'lugares' => Lugar::orderBy('nombre')->get(['id', 'nombre']),
            'eventosDelDia' => EventoOperativo::whereDate('fecha_hora_inicio', $fecha)
                ->orderBy('fecha_hora_inicio')
                ->get(['id', 'titulo', 'fecha_hora_inicio', 'fecha_hora_fin'])
                ->map(fn(EventoOperativo $e) => [
                    'id' => $e->id,
                    'titulo' => $e->titulo,
                    'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
                    'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
                ])
                ->values()
                ->all(),
            'horariosConfig' => config('turnos.horarios'),
            'especialConfig' => config('turnos.especial'),
            'turnoPreseleccionado' => $request->input('agente') ? (int) $request->input('agente') : null,
        ]);
    }

    /** Crea la tarea en cada turno seleccionado. Valida horario y solapamiento. */
    public function storeTareas(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'fecha' => ['required', 'date'],
            'turno' => ['required', Rule::in(TurnoTrabajo::TURNOS)],
            'turno_ids' => ['required', 'array', 'min:1'],
            'turno_ids.*' => ['integer', 'exists:turnos_trabajo,id'],
            'titulo' => ['required', 'string', 'max:255'],
            'lugar' => ['nullable', 'string', 'max:255'],
            'evento_operativo_id' => ['nullable', 'integer', 'exists:eventos_operativos,id'],
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i'],
            'seguir_de_todos_modos' => ['sometimes', 'boolean'],
        ]);

        // Turnos del día en otros bloques que todavía no tienen tarea (activa)
        $bloquesSinTarea = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->where('turno', '!=', $datos['turno'])
            ->whereDoesntHave('tareas', fn($q) => $q->where('estado', '!=', 'cancelada'))
            ->pluck('turno')
            ->unique()
            ->values();

        if ($bloquesSinTarea->isNotEmpty() && !$request->boolean('seguir_de_todos_modos')) {
            $nombres = $bloquesSinTarea->map(fn($t) => self::NOMBRES_TURNO[$t] ?? $t)->implode(', ');

            return back()->with('confirmar_seguir', [
                'mensaje' => "Hay agentes en {$nombres} que todavía no tienen tareas asignadas. ¿Seguir de todos modos?",
            ]);
        }

        // Horario del bloque (el método valida fin distinto de inicio y rango del bloque)
        $turnoRef = TurnoTrabajo::whereIn('id', $datos['turno_ids'])->first();
        if ($turnoRef) {
            $turnoRef->validarHorarioDelBloque($datos['hora_inicio'] ?? null, $datos['hora_fin'] ?? null);
        }

        // Lugar: se busca sin distinguir mayúsculas; si no existe, se crea
        $lugarId = null;
        if (!empty($datos['lugar'])) {
            $nombreLugar = Str::squish(trim($datos['lugar']));
            $lugarId = Lugar::whereRaw('LOWER(nombre) = ?', [mb_strtolower($nombreLugar)])->value('id')
                ?? Lugar::create(['nombre' => $nombreLugar])->id;
        }

        // Si hay evento, lo que falte (lugar y horas) se toma de él
        $evento = !empty($datos['evento_operativo_id'])
            ? EventoOperativo::find($datos['evento_operativo_id'])
            : null;

        $base = [
            'titulo' => trim($datos['titulo']),
            'lugar_id' => $lugarId ?? $evento?->lugar_id,
            'evento_operativo_id' => $evento?->id,
            'hora_inicio' => $datos['hora_inicio'] ?? $evento?->fecha_hora_inicio?->format('H:i'),
            'hora_fin' => $datos['hora_fin'] ?? $evento?->fecha_hora_fin?->format('H:i'),
        ];

        // Solo los turnos del bloque elegido, de la fecha indicada
        $turnoIds = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
            ->where('turno', $datos['turno'])
            ->whereIn('id', $datos['turno_ids'])
            ->pluck('id');

        DB::transaction(function () use ($turnoIds, $base) {
            // Bloquea los turnos para que dos cargas simultáneas no se pisen
            TurnoTrabajo::whereIn('id', $turnoIds)->lockForUpdate()->get();

            // 1) Se valida a TODOS los agentes antes de crear nada
            $porCrear = [];

            foreach ($turnoIds as $turnoId) {
                $existe = Tarea::where('turno_trabajo_id', $turnoId)
                    ->where('titulo', $base['titulo'])
                    ->where('hora_inicio', $base['hora_inicio'])
                    ->where('hora_fin', $base['hora_fin'])
                    ->exists();

                if ($existe) {
                    continue;
                }

                // Regla de superposición: el agente no puede tener dos tareas en el mismo horario
                if ($base['hora_inicio'] && $base['hora_fin']) {
                    $choca = Tarea::where('turno_trabajo_id', $turnoId)
                        ->where('estado', '!=', 'cancelada')
                        ->where('hora_inicio', '<', $base['hora_fin'])
                        ->where('hora_fin', '>', $base['hora_inicio'])
                        ->exists();

                    if ($choca) {
                        $turnoAgente = TurnoTrabajo::with('agente:id,nombre,apellido')->find($turnoId);
                        $nombre = "{$turnoAgente->agente->apellido}, {$turnoAgente->agente->nombre}";

                        $ocupadas = Tarea::where('turno_trabajo_id', $turnoId)
                            ->where('estado', '!=', 'cancelada')
                            ->orderBy('hora_inicio')
                            ->get()
                            ->map(fn($t) => '«' . $t->titulo . '» (' . substr($t->hora_inicio, 0, 5) . ' a ' . substr($t->hora_fin, 0, 5) . ')')
                            ->implode(', ');

                        throw ValidationException::withMessages([
                            'hora_inicio' => "{$nombre} ya tiene ocupado: {$ocupadas}. Elegí otro horario o quitá a este agente de la tarea.",
                        ]);
                    }
                }

                $porCrear[] = $turnoId;
            }

            // 2) Recién ahí se crean
            foreach ($porCrear as $turnoId) {
                Tarea::create(['turno_trabajo_id' => $turnoId] + $base);
            }
        });

        return redirect('/admin/turnos/listado?' . http_build_query(['fecha' => $datos['fecha']]))
            ->with('success', "Tarea asignada a {$turnoIds->count()} agente(s).");
    }
    public function detalle(TurnoTrabajo $turno): Response
    {
        $turno->load([
            'agente:id,nombre,apellido',
            'fichajes.revisadaPor:id,nombre,apellido',
            'reporte',
            'tareas.lugar:id,nombre',
        ]);

        $fichajes = $turno->fichajes->sortBy('registrada_at')->values();
        $intervenciones = $turno->intervencionesDelTurno()->orderBy('fecha_hora')->get();

        return Inertia::render('Admin/Turnos/Detalle', [
            'turno' => [
                'id' => $turno->id,
                'fecha' => $turno->fecha->format('d/m/Y'),
                'agente' => "{$turno->agente->apellido}, {$turno->agente->nombre}",
                'turno' => $turno->turno,
                'estado' => $turno->estado_turno,
                'hora_inicio_prog' => $turno->hora_inicio_prog ? substr($turno->hora_inicio_prog, 0, 5) : null,
                'hora_fin_prog' => $turno->hora_fin_prog ? substr($turno->hora_fin_prog, 0, 5) : null,
                'entrada' => $turno->inicio_real?->format('H:i'),
                'salida' => $turno->fin_real?->format('H:i'),
                'minutos_trabajados' => $turno->minutos_trabajados,
                'minutos_tarde' => $turno->minutos_tarde,
                'minutos_extra' => $turno->minutos_extra,
                'minutos_salida_anticipada' => $turno->minutos_salida_anticipada,
            ],
            'fichajes' => $fichajes->map(fn(Fichaje $f) => [
                'id' => $f->id,
                'tipo' => $f->tipo,
                'hora' => $f->registrada_at->format('H:i'),
                'origen' => $f->origen,
                'ip' => $f->ip,
                'latitud' => $f->latitud,
                'longitud' => $f->longitud,
                'motivo_salida' => $f->motivo_salida,
                'estado_revision' => $f->estado_revision,
                'comentario_revision' => $f->comentario_revision,
                'revisada_por' => $f->revisadaPor
                    ? "{$f->revisadaPor->apellido}, {$f->revisadaPor->nombre}"
                    : null,
                'revisada_at' => $f->revisada_at?->format('d/m/Y H:i'),
            ])->all(),
            'reporte' => $turno->reporte,
            'tieneReporte' => $turno->reporte !== null,
            'tareas' => $turno->tareas
                ->where('estado', '!=', 'cancelada')
                ->map(fn($t) => [
                    'id' => $t->id,
                    'titulo' => $t->titulo_final,
                    'lugar' => $t->lugar_final?->nombre,
                    'hora_inicio' => $t->hora_inicio_corta,
                    'hora_fin' => $t->hora_fin_corta,
                    'estado' => $t->estado,
                ])->values()->all(),
            'intervenciones' => $intervenciones->map(fn($i) => [
                'id' => $i->id,
                'hora' => $i->fecha_hora->format('H:i'),
                'estado' => $i->estado_resolucion,
                // sumá los campos que quieras mostrar
            ])->all(),
            'infracciones' => [], // pendiente
        ]);
    }

    public function revisarFichaje(Request $request, Fichaje $fichaje): RedirectResponse
    {
        abort_unless($fichaje->esSalidaAnticipada(), 422, 'Solo se revisan salidas anticipadas.');

        $datos = $request->validate([
            'estado_revision' => ['required', Rule::in([Fichaje::REVISION_JUSTIFICADA, Fichaje::REVISION_INJUSTIFICADA])],
            'comentario_revision' => ['nullable', 'string', 'max:1000'],
        ]);

        $fichaje->update([
            ...$datos,
            'revisada_por' => $request->user()->agente_id,
            'revisada_at' => now(),
        ]);

        return back()->with('success', 'Revisión guardada.');
    }
    private function agentesConLicencia(string $fecha): array
    {
        return HistorialDeLicencias::query()
            ->where('estado', 'aprobada')
            ->whereDate('fecha_inicio', '<=', $fecha)
            ->whereDate('fecha_fin', '>=', $fecha)
            ->pluck('agente_id')
            ->unique()
            ->values()
            ->all();
    }

    /** De los agentes dados, los que tienen licencia aprobada que cubre la fecha. */
    private function conLicenciaAprobada(array $agenteIds, string $fecha): Collection
    {
        return HistorialDeLicencias::query()
            ->where('estado', 'aprobada')
            ->whereIn('agente_id', $agenteIds)
            ->whereDate('fecha_inicio', '<=', $fecha)
            ->whereDate('fecha_fin', '>=', $fecha)
            ->pluck('agente_id')
            ->unique()
            ->values();
    }

    private function fallarPorLicencia(array $agenteIds, string $campo = 'agente_ids'): never
    {
        $nombres = Agente::whereIn('id', $agenteIds)->get()
            ->map(fn($a) => "{$a->apellido}, {$a->nombre}")
            ->implode('; ');

        throw ValidationException::withMessages([
            $campo => "Tienen licencia aprobada ese día: {$nombres}.",
        ]);
    }

    private function fallarPorOcupados(array $agenteIds, string $campo = 'agente_ids'): never
    {
        $nombres = Agente::whereIn('id', $agenteIds)->get()
            ->map(fn($a) => "{$a->apellido}, {$a->nombre}")
            ->implode('; ');

        throw ValidationException::withMessages([
            $campo => "Ya tienen ese turno asignado: {$nombres}.",
        ]);
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

    private function filtrosHistorial(Request $request, ?int $agenteForzado = null): array
    {
        $request->validate([
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d'],
            'agente' => ['nullable', 'integer', 'exists:agentes,id'],
            'estado' => ['nullable', 'in:programado,en_proceso,cumplido,ausente,abandonado,reasignado,cancelado'],
        ]);

        $hoy = now()->toDateString();
        $base = TurnoTrabajo::query()->when($agenteForzado, fn($q) => $q->where('agente_id', $agenteForzado));
        $primero = (clone $base)->min('fecha');
        $ultimo = (clone $base)->max('fecha');

        $min = $primero ? Carbon::parse($primero)->toDateString() : $hoy;
        $max = $ultimo ? Carbon::parse($ultimo)->toDateString() : $hoy;

        $desde = $request->input('desde') ?: $min;
        $hasta = $request->input('hasta') ?: $max;
        if ($hasta < $desde) {
            $hasta = $desde;
        }

        return [
            'desde' => $desde,
            'hasta' => $hasta,
            'agente' => $agenteForzado ?? ($request->filled('agente') ? (int) $request->input('agente') : null),
            'estado' => $request->input('estado') ?: null,
        ];
    }

    private function queryTurnos(string $desde, string $hasta, ?int $agenteId = null, bool $soloVigentes = false, ?string $estado = null)
    {
        return TurnoTrabajo::query()
            ->whereDate('fecha', '>=', $desde)
            ->whereDate('fecha', '<=', $hasta)
            ->when($agenteId, fn($q) => $q->where('agente_id', $agenteId))
            ->when($soloVigentes, fn($q) => $q->whereNotIn('estado_turno', ['cancelado', 'reasignado']))
            ->when($estado, fn($q) => $q->where('estado_turno', $estado));
    }

    private function fechasPaginadas(string $desde, string $hasta, ?int $agenteId, int $porPagina = 3, bool $soloVigentes = true, string $orden = 'desc', ?string $estado = null): LengthAwarePaginator
    {
        $dias = $this->queryTurnos($desde, $hasta, $agenteId, $soloVigentes, $estado)
            ->selectRaw('DATE(fecha) as dia')
            ->distinct()
            ->orderBy('dia', $orden)
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

    private function turnosEntre(string $desde, string $hasta, ?int $agenteId = null, bool $soloVigentes = false, ?array $soloFechas = null, string $orden = 'desc', ?string $estado = null): Collection
    {
        return $this->queryTurnos($desde, $hasta, $agenteId, $soloVigentes, $estado)
            ->with([
                'agente:id,nombre,apellido',
                'tareas' => fn($q) => $q->where('estado', '!=', 'cancelada')->orderBy('hora_inicio'),
                'tareas.lugar',
            ])
            ->when($soloFechas !== null, fn($q) => $q->whereIn(DB::raw('DATE(fecha)'), $soloFechas))
            ->orderBy('fecha', $orden)
            ->orderByRaw("CASE turno
                WHEN 'manana' THEN 1
                WHEN 'tarde' THEN 2
                WHEN 'noche' THEN 3
                ELSE 4 END")
            ->get()
            ->map(function (TurnoTrabajo $t) {
                $estado = $t->estado_turno;
                $fecha = Carbon::parse($t->fecha)->toDateString(); // siempre YYYY-MM-DD

                return [
                    'id' => $t->id,
                    'fecha' => $fecha,
                    'turno' => $t->turno,
                    'hora_inicio_prog' => $t->hora_inicio_prog,
                    'hora_fin_prog' => $t->hora_fin_prog,
                    'estado' => $estado instanceof \BackedEnum ? $estado->value : (string) $estado,
                    'agente' => $t->agente,
                    'editable' => $t->enPlazoDeEdicion(),
                    'tareas_count' => $t->tareas->count(),
                    'tareas' => $t->tareas->map(fn($x) => [
                        'id' => $x->id,
                        'titulo' => $x->titulo_final,
                        'lugar' => $x->lugar_final?->nombre,
                        'hora_inicio' => $x->hora_inicio_corta,
                        'hora_fin' => $x->hora_fin_corta,
                        'fecha' => $fecha,
                    ])->values()->all(),
                ];
            })
            ->values();
    }

    /** Control de duración del turno especial (misma regla que en storeJornada). */
    private function validarDuracionEspecial(string $inicio, string $fin): void
    {
        $desde = Carbon::parse($inicio);
        $hasta = Carbon::parse($fin);

        if ($hasta->lessThanOrEqualTo($desde)) {
            $hasta->addDay(); // cruza medianoche
        }

        $horas = $desde->diffInMinutes($hasta) / 60;
        $min = config('turnos.especial.min_horas');
        $max = config('turnos.especial.max_horas');

        if ($horas < $min || $horas > $max) {
            throw ValidationException::withMessages([
                'hora_fin' => "El turno especial debe durar entre {$min} y {$max} horas.",
            ]);
        }
    }
}