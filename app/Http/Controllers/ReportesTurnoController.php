<?php

namespace App\Http\Controllers;

use App\Models\ReportesTurno;
use App\Models\Tarea;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportesTurnoController extends Controller
{
    /** Admin y Supervisor ven todos los reportes; el agente, solo los suyos. */
    public function index(Request $request): Response
    {
        $usuario = $request->user();

        $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $desde = $request->query('desde', now()->subMonths(1)->toDateString());
        $hasta = $request->query('hasta', now()->toDateString());

        $reportes = ReportesTurno::with([
            'turno.agente:id,nombre,apellido',
            'turno.tareas.lugar:id,nombre',
            'turno.tareas.evento.lugar:id,nombre',
        ])
            ->whereHas('turno', fn($q) => $q
                ->whereBetween('fecha', [$desde, $hasta])
                ->when(!$this->veTodo($usuario), fn($q) => $usuario->agente_id
                    ? $q->where('agente_id', $usuario->agente_id)
                    : $q->whereRaw('1 = 0')))
            ->get()
            ->sortByDesc(fn(ReportesTurno $r) => $r->turno->fecha)
            ->map(function (ReportesTurno $r) {
                $t = $r->turno;
                $intervenciones = $t->intervencionesDelTurno()
                    ->with('lugar:id,nombre')
                    ->orderBy('fecha_hora')
                    ->get();

                return [
                    'id' => $r->id,
                    'fecha' => $t->fecha->toDateString(),
                    'turno' => $t->turno,
                    'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                    'inicio_real' => $t->inicio_real?->toIso8601String(),
                    'fin_real' => $t->fin_real?->toIso8601String(),
                    'entregado' => $r->created_at->toIso8601String(),
                    'vehiculo_oficial' => $r->vehiculo_oficial,
                    'placa' => $r->placa,
                    'radio' => $r->radio,
                    'otros_equipos' => $r->otros_equipos,
                    'novedades' => $r->novedades,
                    'tareas' => $t->tareas->map(fn(Tarea $x) => [
                        'id' => $x->id,
                        'titulo' => $x->titulo_final,
                        'lugar' => $x->lugar_final?->nombre,
                        'hora_inicio' => $x->hora_inicio_corta,
                        'hora_fin' => $x->hora_fin_corta,
                        'detalle' => $x->detalle,
                    ])->values()->all(),
                    'intervenciones' => $intervenciones->map(fn($i) => [
                        'id' => $i->id,
                        'tipo' => $i->tipo,
                        'tipo_evento' => $i->tipo_evento,
                        'cantidad' => $i->cantidad,
                        'hora' => $i->fecha_hora->format('H:i'),
                        'lugar' => $i->lugar?->nombre ?? $i->ubicacion_direccion,
                        'descripcion' => $i->descripcion,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Reportes/index', [ // 👈 Estandarizado con mayúscula
            'reportes' => $reportes,
            'desde' => $desde,
            'hasta' => $hasta,
            'veTodo' => $this->veTodo($usuario),
        ]);
    }

    /** La hoja completa: datos generales, tareas, intervenciones y recursos. */
    public function show(Request $request, ReportesTurno $reporte): Response
    {
        $usuario = $request->user();

        $reporte->load([
            'turno.agente',
            'turno.tareas.lugar:id,nombre',
            'turno.tareas.evento.lugar:id,nombre',
        ]);

        $turno = $reporte->turno;

        // 🛡️ Validación de seguridad al principio
        abort_unless(
            $this->veTodo($usuario) || ($usuario->agente_id && $usuario->agente_id === $turno->agente_id),
            403
        );

        $intervenciones = $turno->intervencionesDelTurno()
            ->with('lugar:id,nombre')
            ->orderBy('fecha_hora')
            ->get();

        $infracciones = $intervenciones->where('tipo', 'infraccion');

        return Inertia::render('Reportes/show', [
            'reporte' => [
                'id' => $reporte->id,
                'vehiculo_oficial' => $reporte->vehiculo_oficial,
                'placa' => $reporte->placa,
                'radio' => $reporte->radio,
                'otros_equipos' => $reporte->otros_equipos,
                'novedades' => $reporte->novedades,
                'entregado' => $reporte->created_at->toIso8601String(),
            ],
            'turno' => [
                'fecha' => $turno->fecha->toDateString(),
                'turno' => $turno->turno,
                'agente' => "{$turno->agente->apellido}, {$turno->agente->nombre}",
                'inicio_real' => $turno->inicio_real?->toIso8601String(),
                'fin_real' => $turno->fin_real?->toIso8601String(),
            ],
            'tareas' => $turno->tareas->map(fn(Tarea $t) => [
                'id' => $t->id,
                'titulo' => $t->titulo_final,
                'lugar' => $t->lugar_final?->nombre,
                'hora_inicio' => $t->hora_inicio_corta,
                'hora_fin' => $t->hora_fin_corta,
                'detalle' => $t->detalle,
            ])->values()->all(),
            'intervenciones' => $intervenciones->map(fn($i) => [
                'id' => $i->id,
                'tipo' => $i->tipo,
                'tipo_evento' => $i->tipo_evento,
                'cantidad' => $i->cantidad,
                'urgencia' => $i->nivel_urgencia,
                'lugar' => $i->lugar?->nombre ?? $i->ubicacion_direccion,
                'descripcion' => $i->descripcion,
                'hora' => $i->fecha_hora->format('H:i'),
            ])->values()->all(),
            'resumen' => [
                'hubo_accidentes' => $intervenciones->where('tipo', 'accidente')->isNotEmpty(),
                'hubo_infracciones' => $infracciones->isNotEmpty(),
                'total_infracciones' => (int) $infracciones->sum('cantidad'),
            ],
        ]);
    }

    private function veTodo($usuario): bool
    {
        return $usuario->hasAnyRole(['Administrador', 'Supervisor']);
    }
}