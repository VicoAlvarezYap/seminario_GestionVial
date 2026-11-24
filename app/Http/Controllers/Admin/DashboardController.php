<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fichaje;
use App\Models\HistorialDeLicencias;
use App\Models\Tarea;
use App\Models\TurnoTrabajo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** Minutos de tolerancia antes de avisar "no fichó". */
    private const TOLERANCIA_FICHAJE_MIN = 15;

    public function index(Request $request): Response
    {
        $request->validate([
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d'],
        ]);

        [$desde, $hasta] = $this->rango($request);
        $hoy = now()->toDateString();
        $manana = now()->addDay()->toDateString();

        // Turnos de hoy (vigentes) con sus fichajes: es un conjunto chico
        $turnosHoy = TurnoTrabajo::with(['agente:id,nombre,apellido', 'fichajes'])
            ->whereDate('fecha', $hoy)
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->get();

        $enServicio = $turnosHoy->filter(fn(TurnoTrabajo $t) => $this->tieneEntrada($t) && !$this->tieneSalida($t));

        return Inertia::render('dashboard', [
            'hoy' => $hoy,
            'filtros' => ['desde' => $desde, 'hasta' => $hasta],

            'tarjetas' => [
                'programados' => $turnosHoy->count(),
                'en_servicio' => $enServicio->count(),
                'ausentes' => $turnosHoy->filter(fn($t) => $this->estado($t) === 'ausente')->count(),
                'llegadas_tarde' => $turnosHoy->filter(fn($t) => ($t->minutos_tarde ?? 0) > 0)->count(),
                'con_licencia' => count($this->agentesConLicencia($hoy)),
                'intervenciones_hoy' => $this->intervencionesDelDia($hoy),
                'tareas_hoy' => $this->tareasDelDia($hoy),
            ],

            'enServicio' => $enServicio->map(fn(TurnoTrabajo $t) => [
                'turno_id' => $t->id,
                'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                'turno' => $t->turno,
            ])->values()->all(),

            'alertas' => [
                'sin_tareas' => $this->turnosSinTareas($hoy, $manana),
                'salidas_pendientes' => $this->salidasPendientes(),
                'sin_fichaje' => $this->sinFichaje($turnosHoy),
            ],

            'mapa' => $this->fichajesConUbicacion($hoy),
            'cobertura' => $this->coberturaSemanal(),

            // Lo pesado llega después, sin bloquear la carga inicial
            'tendencias' => Inertia::defer(fn() => $this->tendencias($desde, $hasta)),
            'puntualidad' => Inertia::defer(fn() => $this->puntualidad($desde, $hasta)),
        ]);
    }

    /* ---------------------------------------------------------------
     |  Tarjetas
     | --------------------------------------------------------------- */

    private function intervencionesDelDia(string $hoy): array
    {
        $porTipo = DB::table('intervenciones')
            ->whereDate('fecha_hora', $hoy)
            ->where('estado_resolucion', '!=', 'cancelada')
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->pluck('total', 'tipo');

        $abiertas = DB::table('intervenciones')
            ->whereDate('fecha_hora', $hoy)
            ->whereIn('estado_resolucion', ['reportada', 'en_curso'])
            ->count();

        $criticas = DB::table('intervenciones')
            ->whereDate('fecha_hora', $hoy)
            ->whereIn('nivel_urgencia', ['alta', 'critica'])
            ->whereIn('estado_resolucion', ['reportada', 'en_curso'])
            ->count();

        return [
            'total' => (int) $porTipo->sum(),
            'por_tipo' => $porTipo->map(fn($n) => (int) $n)->all(),
            'abiertas' => $abiertas,
            'urgentes_abiertas' => $criticas,
        ];
    }

    /** Tareas de los turnos de hoy, agrupadas por el estado que tengan en tu base. */
    private function tareasDelDia(string $hoy): array
    {
        return Tarea::query()
            ->whereHas('turno', fn($q) => $q->whereDate('fecha', $hoy))
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->map(fn($n) => (int) $n)
            ->all();
    }

    /* ---------------------------------------------------------------
     |  Alertas
     | --------------------------------------------------------------- */

    /** Turnos de hoy y mañana sin ninguna tarea activa. */
    private function turnosSinTareas(string $hoy, string $manana): array
    {
        return TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereDate('fecha', '>=', $hoy)
            ->whereDate('fecha', '<=', $manana)
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->whereDoesntHave('tareas', fn($q) => $q->where('estado', '!=', 'cancelada'))
            ->orderBy('fecha')
            ->limit(30)
            ->get()
            ->map(fn(TurnoTrabajo $t) => [
                'turno_id' => $t->id,
                'agente_id' => $t->agente_id,
                'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                'fecha' => Carbon::parse($t->fecha)->toDateString(),
                'turno' => $t->turno,
            ])
            ->values()
            ->all();
    }

    /** Salidas anticipadas que todavía nadie revisó. */
    private function salidasPendientes(): array
    {
        $f = (new Fichaje)->getTable();

        return DB::table($f)
            ->join('turnos_trabajo', 'turnos_trabajo.id', '=', "{$f}.turno_trabajo_id")
            ->join('agentes', 'agentes.id', '=', 'turnos_trabajo.agente_id')
            ->where("{$f}.tipo", 'salida_anticipada')
            ->where(fn($q) => $q->whereNull("{$f}.estado_revision")->orWhere("{$f}.estado_revision", 'pendiente'))
            ->orderByDesc("{$f}.registrada_at")
            ->limit(30)
            ->get([
                "{$f}.id as fichaje_id",
                'turnos_trabajo.id as turno_id',
                'agentes.apellido',
                'agentes.nombre',
                "{$f}.registrada_at",
                "{$f}.motivo_salida",
            ])
            ->map(fn($r) => [
                'fichaje_id' => $r->fichaje_id,
                'turno_id' => $r->turno_id,
                'agente' => "{$r->apellido}, {$r->nombre}",
                'registrada_at' => Carbon::parse($r->registrada_at)->format('d/m/Y H:i'),
                'motivo' => $r->motivo_salida,
            ])
            ->all();
    }

    /** Turnos programados cuya hora de inicio ya pasó (con tolerancia) y no tienen entrada. */
    private function sinFichaje($turnosHoy): array
    {
        return $turnosHoy
            ->filter(function (TurnoTrabajo $t) {
                if ($this->estado($t) !== 'programado' || $this->tieneEntrada($t)) {
                    return false;
                }

                $inicio = $t->hora_inicio_prog ?: (config("turnos.horarios.{$t->turno}")[0] ?? null);
                if (!$inicio) {
                    return false;
                }

                $limite = Carbon::parse(Carbon::parse($t->fecha)->toDateString() . ' ' . substr($inicio, 0, 5))
                    ->addMinutes(self::TOLERANCIA_FICHAJE_MIN);

                return now()->greaterThan($limite);
            })
            ->map(fn(TurnoTrabajo $t) => [
                'turno_id' => $t->id,
                'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                'turno' => $t->turno,
            ])
            ->values()
            ->all();
    }

    /* ---------------------------------------------------------------
     |  Mapa y cobertura
     | --------------------------------------------------------------- */

    /** Fichajes de hoy con coordenadas. (Las intervenciones no guardan lat/lng.) */
    private function fichajesConUbicacion(string $hoy): array
    {
        $f = (new Fichaje)->getTable();

        return DB::table($f)
            ->join('turnos_trabajo', 'turnos_trabajo.id', '=', "{$f}.turno_trabajo_id")
            ->join('agentes', 'agentes.id', '=', 'turnos_trabajo.agente_id')
            ->whereDate("{$f}.registrada_at", $hoy)
            ->whereNotNull("{$f}.latitud")
            ->whereNotNull("{$f}.longitud")
            ->orderBy("{$f}.registrada_at")
            ->get([
                "{$f}.id",
                "{$f}.tipo",
                "{$f}.registrada_at",
                "{$f}.latitud",
                "{$f}.longitud",
                "{$f}.dentro_de_zona",
                'agentes.apellido',
                'agentes.nombre',
            ])
            ->map(fn($r) => [
                'id' => $r->id,
                'agente' => "{$r->apellido}, {$r->nombre}",
                'tipo' => $r->tipo,
                'hora' => Carbon::parse($r->registrada_at)->format('H:i'),
                'lat' => (float) $r->latitud,
                'lng' => (float) $r->longitud,
                'dentro_de_zona' => $r->dentro_de_zona === null ? null : (bool) $r->dentro_de_zona,
            ])
            ->all();
    }

    /** Semana actual (lunes a domingo): una fila por turno, la vista la arma agente × día. */
    private function coberturaSemanal(): array
    {
        $ini = now()->startOfWeek();
        $fin = now()->endOfWeek();

        $turnos = TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereDate('fecha', '>=', $ini->toDateString())
            ->whereDate('fecha', '<=', $fin->toDateString())
            ->whereNotIn('estado_turno', ['cancelado', 'reasignado'])
            ->get()
            ->map(fn(TurnoTrabajo $t) => [
                'agente_id' => $t->agente_id,
                'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                'fecha' => Carbon::parse($t->fecha)->toDateString(),
                'turno' => $t->turno,
            ])
            ->values()
            ->all();

        $licencias = HistorialDeLicencias::query()
            ->where('estado', 'aprobada')
            ->whereDate('fecha_inicio', '<=', $fin->toDateString())
            ->whereDate('fecha_fin', '>=', $ini->toDateString())
            ->get(['agente_id', 'fecha_inicio', 'fecha_fin'])
            ->map(fn($l) => [
                'agente_id' => $l->agente_id,
                'desde' => Carbon::parse($l->fecha_inicio)->toDateString(),
                'hasta' => Carbon::parse($l->fecha_fin)->toDateString(),
            ])
            ->all();

        return [
            'desde' => $ini->toDateString(),
            'hasta' => $fin->toDateString(),
            'turnos' => $turnos,
            'licencias' => $licencias,
        ];
    }

    /* ---------------------------------------------------------------
     |  Tendencias (diferidas)
     | --------------------------------------------------------------- */

    private function tendencias(string $desde, string $hasta): array
    {
        $base = fn() => DB::table('intervenciones')
            ->whereDate('fecha_hora', '>=', $desde)
            ->whereDate('fecha_hora', '<=', $hasta)
            ->where('estado_resolucion', '!=', 'cancelada');

        $porDia = $base()
            ->selectRaw('DATE(fecha_hora) as dia, COUNT(*) as total')
            ->groupBy('dia')
            ->orderBy('dia')
            ->pluck('total', 'dia');

        // Se rellenan los días sin datos para que el gráfico no quede cortado
        $serie = [];
        for ($d = Carbon::parse($desde); $d->lte(Carbon::parse($hasta)); $d->addDay()) {
            $k = $d->toDateString();
            $serie[] = ['fecha' => $k, 'total' => (int) ($porDia[$k] ?? 0)];
        }

        $porTipo = $base()
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => ['tipo' => $r->tipo, 'total' => (int) $r->total])
            ->all();

        $porLugar = $base()
            ->leftJoin('lugares', 'lugares.id', '=', 'intervenciones.lugar_id')
            ->selectRaw("COALESCE(lugares.nombre, 'Sin lugar') as lugar, COUNT(*) as total")
            ->groupBy('lugar')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn($r) => ['lugar' => $r->lugar, 'total' => (int) $r->total])
            ->all();

        $cumplimiento = TurnoTrabajo::query()
            ->whereDate('fecha', '>=', $desde)
            ->whereDate('fecha', '<=', $hasta)
            ->selectRaw('estado_turno, COUNT(*) as total')
            ->groupBy('estado_turno')
            ->get()
            ->map(function ($r) {
                $e = $r->estado_turno;

                return [
                    'estado' => $e instanceof \BackedEnum ? $e->value : (string) $e,
                    'total' => (int) $r->total,
                ];
            })
            ->all();

        return [
            'intervenciones_por_dia' => $serie,
            'intervenciones_por_tipo' => $porTipo,
            'intervenciones_por_lugar' => $porLugar,
            'cumplimiento_turnos' => $cumplimiento,
        ];
    }

    /** Ranking de agentes por minutos de atraso, extra y salidas anticipadas en el rango. */
    private function puntualidad(string $desde, string $hasta): array
    {
        return TurnoTrabajo::with(['agente:id,nombre,apellido', 'fichajes'])
            ->whereDate('fecha', '>=', $desde)
            ->whereDate('fecha', '<=', $hasta)
            ->whereIn('estado_turno', ['cumplido', 'en_proceso', 'abandonado'])
            ->get()
            ->groupBy('agente_id')
            ->map(function ($turnos) {
                $agente = $turnos->first()->agente;

                return [
                    'agente' => "{$agente->apellido}, {$agente->nombre}",
                    'turnos' => $turnos->count(),
                    'minutos_tarde' => (int) $turnos->sum(fn($t) => $t->minutos_tarde ?? 0),
                    'minutos_extra' => (int) $turnos->sum(fn($t) => $t->minutos_extra ?? 0),
                    'salidas_anticipadas' => $turnos->filter(
                        fn($t) => ($t->minutos_salida_anticipada ?? 0) > 0
                    )->count(),
                ];
            })
            ->sortByDesc('minutos_tarde')
            ->take(10)
            ->values()
            ->all();
    }

    /* ---------------------------------------------------------------
     |  Helpers
     | --------------------------------------------------------------- */

    /** Por defecto, los últimos 30 días; máximo 90. */
    private function rango(Request $request): array
    {
        $hasta = $request->filled('hasta') ? Carbon::parse($request->input('hasta'))->startOfDay() : now()->startOfDay();
        $desde = $request->filled('desde') ? Carbon::parse($request->input('desde'))->startOfDay() : $hasta->copy()->subDays(29);

        if ($desde->gt($hasta)) {
            $desde = $hasta->copy();
        }
        if ($desde->lt($hasta->copy()->subDays(89))) {
            $desde = $hasta->copy()->subDays(89);
        }

        return [$desde->toDateString(), $hasta->toDateString()];
    }

    private function estado(TurnoTrabajo $t): string
    {
        $e = $t->estado_turno;

        return $e instanceof \BackedEnum ? $e->value : (string) $e;
    }

    private function tieneEntrada(TurnoTrabajo $t): bool
    {
        return $t->fichajes->contains('tipo', 'entrada');
    }

    private function tieneSalida(TurnoTrabajo $t): bool
    {
        return $t->fichajes->contains(fn($f) => in_array($f->tipo, ['salida', 'salida_anticipada'], true));
    }

    /** IDs de agentes con licencia aprobada que cubre la fecha. */
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
}