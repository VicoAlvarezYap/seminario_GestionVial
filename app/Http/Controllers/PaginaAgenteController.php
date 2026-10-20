<?php

namespace App\Http\Controllers;

use App\Models\EventoOperativo;
use App\Models\TurnoTrabajo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PaginaAgenteController extends Controller
{
    public function index(Request $request): Response
    {
        $hoy = Carbon::now();

        // 1. Fechas seleccionadas o por defecto
        $fechaSemana = Carbon::parse($request->query('semana', $hoy->toDateString()));$fechaMes = Carbon::parse($request->query('mes',$hoy->format('Y-m-d')));

        // 2. Rango de la semana (Lunes a Domingo)
        $inicioSemana =$fechaSemana->copy()->startOfWeek(Carbon::MONDAY);
        $finSemana =$fechaSemana->copy()->endOfWeek(Carbon::SUNDAY);

        $agenteId =$request->user()?->agente_id;

        $turnos = TurnoTrabajo::whereBetween('fecha', [$inicioSemana->toDateString(),$finSemana->toDateString()])
            ->when($agenteId, fn ($q) => $q->where('agente_id',$agenteId))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'fecha' => $t->fecha?->toDateString() ?? '',
                'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $t->hora_fin, 0, 5), 'direccion' =>$t->direccion_asignada ?? '',
                'estado' => $t->estado_turno ?? '',
            ])
            ->values()
            ->all();

        // 3. Rango del mes (semanas completas del calendario)
        $inicioMes =$fechaMes->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY);
        $finMes =$fechaMes->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);

        // Cargamos los eventos operativos INCLUYENDO sus puntos de recorrido
        $eventos = EventoOperativo::with('puntosRecorrido')
            ->whereBetween('fecha_hora_inicio', [$inicioMes,$finMes])
            ->orderBy('fecha_hora_inicio')
            ->get()
            ->map(fn (EventoOperativo $e) => [
                'id' => $e->id,
                'titulo' => $e->titulo ?? '',
                'descripcion' => $e->descripcion ?? '',
                'fecha' => $e->fecha_hora_inicio?->toDateString() ?? '',
                'hora_inicio' => $e->fecha_hora_inicio?->format('H:i') ?? '',
                'hora_fin' => $e->fecha_hora_fin?->format('H:i') ?? '',
                'direccion' => $e->direccion ?? '',
                'tipo_recorrido' => $e->tipo_recorrido ?? 'estatico',
                'estado' => $e->estado ?? '',
                // Datos del solicitante para el modal
                'solicitante_ente' => $e->solicitante_ente ?? '',
                'solicitante_nombre' => $e->solicitante_nombre ?? '',
                'solicitante_celular' => $e->solicitante_celular ?? '',
                // Puntos del recorrido ordenados (vienen por la relación `puntosRecorrido`)
                'puntos' => $e->puntosRecorrido->map(fn ($p) => [
                    'id' => $p->id,
                    'orden' => $p->orden,
                    'latitud' => $p->latitud,
                    'longitud' => $p->longitud,
                    'descripcion_referencia' => $p->descripcion_referencia ?? '',
                ]),
            ])
            ->values()
            ->all();

        // 4. Devolver a la vista
        return Inertia::render('Pagina_Agente/index', [
            'semana' => [
                'fecha' => $fechaSemana->toDateString(),
                'inicio' => $inicioSemana->toDateString(),
                'fin' => $finSemana->toDateString(),
                'turnos' => $turnos,
            ],
            'mes' => [
                'fecha' => $fechaMes->toDateString(),
                'inicio' => $inicioMes->toDateString(),
                'fin' => $finMes->toDateString(),
                'eventos' => $eventos,
            ],
        ]);
    }
}