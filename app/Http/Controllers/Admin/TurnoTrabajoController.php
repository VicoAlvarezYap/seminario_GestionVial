<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\Agente;
use Inertia\Inertia;
use App\Models\Fichaje;
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
use App\Models\Tarea;
use App\Models\Lugar;
use App\Models\EventoOperativo;
use Illuminate\Validation\Rule;
use App\Exports\TurnosExcel;

class TurnoTrabajoController extends Controller
{


    private const NOMBRES_TURNO = [
        'manana' => 'Mañana',
        'tarde' => 'Tarde',
        'noche' => 'Noche',
        'especial' => 'Especial',
    ];
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
            ->whereKeyNot($turno->id)
            ->exists();

        if ($duplicado) {
            throw ValidationException::withMessages([
                'fecha' => 'El agente ya tiene un turno asignado en esa fecha.',
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
    public function listadoExcel(Request $request)
    {
        $f = $this->filtrosProximos($request);

        $turnos = $this->turnosEntre(
            $f['desde'],
            $f['hasta'],
            $f['agente'],
            soloVigentes: true,
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

    private function turnosEntre(string $desde, string $hasta, ?int $agenteId = null, bool $soloVigentes = false, ?array $soloFechas = null, string $orden = 'desc', ?string $estado = null): Collection
    {

        return $this->queryTurnos($desde, $hasta, $agenteId, $soloVigentes, $estado)
            ->with('agente:id,nombre,apellido')
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
        $primero = TurnoTrabajo::min('fecha');
        $ultimo = TurnoTrabajo::max('fecha');

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
    /** Pantalla "Asignar tarea": agentes con turno en el día, agrupados por bloque. */
    public function asignarTareasForm(Request $request): Response
    {
        $fecha = $request->input('fecha', now()->toDateString());

        $turnos = TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereDate('fecha', $fecha)
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->get();

        $agentesPorTurno = collect(TurnoTrabajo::TURNOS)->mapWithKeys(fn(string $t) => [
            $t => $turnos->where('turno', $t)
                ->map(fn(TurnoTrabajo $x) => [
                    'turno_id' => $x->id,
                    'agente_id' => $x->agente_id,
                    'nombre' => "{$x->agente->apellido}, {$x->agente->nombre}",
                    'tiene_tarea' => $x->tareas()->exists(),
                    'hora_inicio' => $x->hora_inicio_prog ? substr($x->hora_inicio_prog, 0, 5) : null,
                    'hora_fin' => $x->hora_fin_prog ? substr($x->hora_fin_prog, 0, 5) : null,
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
                ->get(['id', 'titulo', 'fecha_hora_inicio', 'fecha_hora_fin', 'lugar_id'])
                ->map(fn(EventoOperativo $e) => [
                    'id' => $e->id,
                    'titulo' => $e->titulo,
                    'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
                    'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
                    'lugar_id' => $e->lugar_id,
                ])
                ->values()
                ->all(),
            'horariosConfig' => config('turnos.horarios'),
            'especialConfig' => config('turnos.especial'),
        ]);
    }

    /** Crea la tarea en cada turno seleccionado. Si hay bloques sin tarea, avisa antes. */
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

        // Turnos del día en otros bloques que todavía no tienen tarea
        $bloquesSinTarea = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->where('turno', '!=', $datos['turno'])
            ->whereDoesntHave('tareas')
            ->pluck('turno')
            ->unique()
            ->values();

        if ($bloquesSinTarea->isNotEmpty() && !$request->boolean('seguir_de_todos_modos')) {
            $nombres = $bloquesSinTarea->map(fn($t) => self::NOMBRES_TURNO[$t] ?? $t)->implode(', ');

            return back()->with('confirmar_seguir', [
                'mensaje' => "Hay agentes en {$nombres} que todavía no tienen tareas asignadas. ¿Seguir de todos modos?",
            ]);
        }

        // El lugar se busca por nombre; si no existe, se crea (lo escrito libre también funciona)
        $lugarId = null;
        if (!empty($datos['lugar'])) {
            $lugarId = Lugar::firstOrCreate(['nombre' => trim($datos['lugar'])])->id;
            $nombreLugar = Str::squish(trim($datos['lugar']));
            $lugarExistente = Lugar::whereRaw('LOWER(nombre) = ?', [mb_strtolower($nombreLugar)])->first();
            $lugarId = $lugarExistente?->id ?? Lugar::create(['nombre' => $nombreLugar])->id;
        }
        if ($datos['turno'] !== 'especial' && !empty($datos['hora_inicio']) && !empty($datos['hora_fin'])) {
            [$desde, $hasta] = config("turnos.horarios.{$datos['turno']}");
            $dentro = fn(string $h) => $desde < $hasta
                ? $h >= $desde && $h <= $hasta
                : $h >= $desde || $h <= $hasta;

            if (!$dentro($datos['hora_inicio']) || !$dentro($datos['hora_fin'])) {
                return back()->withErrors([
                    'hora_inicio' => "Las horas tienen que estar entre {$desde} y {$hasta}.",
                ]);
            }
        }
        // Horario permitido según el bloque (el especial toma el de sus turnos)
        if ($datos['turno'] === 'especial') {
            $turnoRef = TurnoTrabajo::whereIn('id', $datos['turno_ids'])->first();
            $desde = $turnoRef?->hora_inicio_prog ? substr($turnoRef->hora_inicio_prog, 0, 5) : null;
            $hasta = $turnoRef?->hora_fin_prog ? substr($turnoRef->hora_fin_prog, 0, 5) : null;
        } else {
            [$desde, $hasta] = config("turnos.horarios.{$datos['turno']}");
        }

        $enRango = fn(string $h) => $desde < $hasta
            ? $h >= $desde && $h <= $hasta
            : $h >= $desde || $h <= $hasta; // cruza medianoche

        if (!empty($datos['hora_inicio']) && !empty($datos['hora_fin'])) {
            if ($datos['hora_inicio'] === $datos['hora_fin']) {
                throw ValidationException::withMessages([
                    'hora_fin' => 'La hora de fin tiene que ser distinta de la de inicio.',
                ]);
            }

            if (!$enRango($datos['hora_inicio']) || !$enRango($datos['hora_fin'])) {
                throw ValidationException::withMessages([
                    'hora_inicio' => "El horario de este turno tiene que estar entre {$desde} y {$hasta}.",
                ]);
            }
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

        // Solo se asigna a los turnos del bloque elegido, que pertenezcan a la fecha
        $turnoIds = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
            ->where('turno', $datos['turno'])
            ->whereIn('id', $datos['turno_ids'])
            ->pluck('id');

        DB::transaction(function () use ($turnoIds, $base) {
            TurnoTrabajo::whereIn('id', $turnoIds)->lockForUpdate()->get();
            foreach ($turnoIds as $turnoId) {
                $existe = Tarea::where('turno_trabajo_id', $turnoId)
                    ->where('titulo', $base['titulo'])
                    ->where('hora_inicio', $base['hora_inicio'])
                    ->where('hora_fin', $base['hora_fin'])
                    ->exists();

                if (!$existe) {
                    Tarea::create(['turno_trabajo_id' => $turnoId] + $base);
                }
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
            'tareas',
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
                'hora_inicio_prog' => substr($turno->hora_inicio_prog, 0, 5),
                'hora_fin_prog' => substr($turno->hora_fin_prog, 0, 5),
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
            'tareas' => $turno->tareas->map(fn($t) => [
                'titulo' => $t->titulo_final,
                'lugar' => $t->lugar_final?->nombre,
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


}