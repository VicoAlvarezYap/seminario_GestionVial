<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\EventoOperativo;
use App\Models\Lugar;
use App\Models\Tarea;
use App\Models\TurnoTrabajo;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PaginaAgenteController extends Controller
{
    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $puedeEditar = $usuario->hasRole('Administrador');

        $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
            'ev_desde' => ['nullable', 'date'],
            'ev_hasta' => ['nullable', 'date', 'after_or_equal:ev_desde'],
        ]);

        [$desde, $hasta] = $this->leerRango($request, 'desde', 'hasta', now()->startOfWeek(), now()->endOfWeek());
        [$evDesde, $evHasta] = $this->leerRango($request, 'ev_desde', 'ev_hasta', now()->startOfMonth(), now()->endOfMonth());

        return Inertia::render('Pagina_Principal/index', [
            'puedeEditar' => $puedeEditar,
            'agentes' => $puedeEditar ? $this->listaAgentes() : [],
            'lugares' => $puedeEditar ? $this->listaLugares() : [],
            'titulosSugeridos' => $puedeEditar ? config('tareas.titulos') : [],
            'turnosDisponibles' => array_keys(TurnoTrabajo::HORARIOS),
            'miTurno' => $this->miTurno($usuario, $puedeEditar),
            'semana' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
                'turnos' => $this->turnos($usuario, $desde, $hasta),
            ],
            'mes' => [
                'desde' => $evDesde->toDateString(),
                'hasta' => $evHasta->toDateString(),
                'eventos' => $this->eventos($evDesde, $evHasta),
            ],
        ]);
    }

    private function turnos($usuario, CarbonInterface $desde, CarbonInterface $hasta): array
    {
        return TurnoTrabajo::with([
            'agente:id,nombre,apellido',
            'tareas.lugar:id,nombre',
            'tareas.evento.lugar:id,nombre',
        ])
            ->visiblesPara($usuario)
            ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
            ->orderBy('fecha')
            ->get()
            ->map(fn(TurnoTrabajo $t) => [
                'id' => $t->id,
                'fecha' => $t->fecha->toDateString(),
                'turno' => $t->turno,
                'asignacion_id' => $t->asignacion_id,
                'agente_id' => $t->agente_id,
                'agente' => $t->agente ? "{$t->agente->apellido}, {$t->agente->nombre}" : null,
                'estado' => $t->estadoCalculado(),
                'tareas' => $t->tareas->map(fn(Tarea $tarea) => [
                    'id' => $tarea->id,
                    'titulo' => $tarea->titulo_final,
                    'tipo_tarea_id' => $tarea->tipo_tarea_id,
                    'evento_operativo_id' => $tarea->evento_operativo_id,
                    'titulo_libre' => $tarea->titulo,
                    'lugar_id' => $tarea->lugar_id,
                    'lugar' => $tarea->lugar_final?->nombre,
                    'hora_inicio' => $tarea->hora_inicio_corta,
                    'hora_fin' => $tarea->hora_fin_corta,
                    'estado' => $tarea->estado,
                    'detalle' => $tarea->detalle,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    /** Turno de hoy para el botón Iniciar / Terminar (solo agentes; el admin no ficha). */
    private function miTurno($usuario, bool $puedeEditar): ?array
    {
        if (!$usuario->agente_id) {
            return null;
        }

        $candidatos = TurnoTrabajo::with([
            'tareas.lugar:id,nombre',
            'tareas.evento.lugar:id,nombre',
            'reporte:id,turno_trabajo_id',
        ])
            ->where('agente_id', $usuario->agente_id)
            ->whereIn('estado_turno', ['programado', 'cumplido'])
            ->where(fn($q) => $q
                ->whereDate('fecha', today())
                // un turno que quedó abierto (por ejemplo, el noche que cruza la medianoche)
                ->orWhere(fn($q) => $q->whereNotNull('inicio_real')->whereNull('fin_real')))
            ->orderBy('fecha')
            ->get();

        $t = $candidatos->first(fn($t) => $t->inicio_real && !$t->fin_real)  // en curso
            ?? $candidatos->first(fn($t) => !$t->inicio_real)                // el próximo sin iniciar
            ?? $candidatos->last();                                             // el último ya terminado

        if (!$t) {
            return null;
        }

        [$iniciaDesde, $terminaHasta] = FichadaController::ventana($t);

        return [
            'id' => $t->id,
            'turno' => $t->turno,
            'inicio_prog' => $t->inicioProgramado()->toIso8601String(),
            'fin_prog' => $t->finProgramado()->toIso8601String(),
            'inicio_real' => $t->inicio_real?->toIso8601String(),
            'fin_real' => $t->fin_real?->toIso8601String(),
            'inicia_desde' => $iniciaDesde->toIso8601String(),
            'termina_hasta' => $terminaHasta->toIso8601String(),
            'ahora' => now()->toIso8601String(),
            'tiene_reporte' => (bool) $t->reporte,
            'tareas' => $t->tareas->map(fn(Tarea $tarea) => [
                'id' => $tarea->id,
                'titulo' => $tarea->titulo_final,
                'evento_operativo_id' => $tarea->evento_operativo_id,
                'lugar_id' => $tarea->lugar_id,
                'lugar' => $tarea->lugar_final?->nombre,
                'hora_inicio' => $tarea->hora_inicio_corta,
                'hora_fin' => $tarea->hora_fin_corta,
                'estado' => $tarea->estado,
                'detalle' => $tarea->detalle,
            ])->values()->all(),
        ];
    }

    private function eventos(CarbonInterface $desde, CarbonInterface $hasta): array
    {
        return EventoOperativo::with(['puntosRecorrido', 'lugar:id,nombre'])
            ->whereBetween('fecha_hora_inicio', [$desde->copy()->startOfDay(), $hasta->copy()->endOfDay()])
            ->orderBy('fecha_hora_inicio')
            ->get()
            ->map(fn(EventoOperativo $e) => [
                'id' => $e->id,
                'titulo' => $e->titulo,
                'lugar_id' => $e->lugar_id,
                'lugar' => $e->lugar?->nombre,
                'fecha' => $e->fecha_hora_inicio->toDateString(),
                'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
                'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
                'direccion' => $e->direccion,
                'descripcion' => $e->descripcion,
                'estado' => $e->estado,
                'tipo_recorrido' => $e->tipo_recorrido,
                'solicitante_ente' => $e->solicitante_ente,
                'solicitante_nombre' => $e->solicitante_nombre,
                'solicitante_celular' => $e->solicitante_celular,
                'puntos' => $e->puntosRecorrido
                    ->map(fn($p) => ['descripcion_referencia' => $p->descripcion_referencia])
                    ->values()->all(),
            ])
            ->values()
            ->all();
    }

    private function listaAgentes(): array
    {
        return Agente::orderBy('apellido')->orderBy('nombre')->get(['id', 'nombre', 'apellido'])
            ->map(fn(Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
            ->values()->all();
    }

    private function listaLugares(): array
    {
        return Lugar::where('activo', true)->orderBy('nombre')->get(['id', 'nombre'])
            ->map(fn(Lugar $l) => ['id' => $l->id, 'nombre' => $l->nombre])
            ->values()->all();
    }



    /** Lee un rango desde la query; si falta o es inválido usa el de respaldo. Máximo 366 días. */
    private function leerRango(Request $request, string $kDesde, string $kHasta, CarbonInterface $respDesde, CarbonInterface $respHasta): array
    {
        $desde = $this->leerFecha($request->query($kDesde), $respDesde);
        $hasta = $this->leerFecha($request->query($kHasta), $respHasta);

        if ($hasta->lt($desde)) {
            $hasta = $desde->copy();
        }

        if ($desde->diffInDays($hasta, true) > 365) {
            $hasta = $desde->copy()->addDays(365);
        }

        return [$desde, $hasta];
    }

    private function leerFecha(mixed $valor, CarbonInterface $respaldo): CarbonInterface
    {
        if (!is_string($valor) || $valor === '') {
            return $respaldo->copy();
        }

        try {
            return Carbon::parse($valor)->startOfDay();
        } catch (\Throwable) {
            return $respaldo->copy();
        }
    }
}