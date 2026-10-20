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

        // 1. Capturamos las fechas desde los query parameters o usamos la fecha actual por defecto
        $fechaSemana = Carbon::parse($request->query('semana', $hoy->toDateString()));
        $fechaMes = Carbon::parse($request->query('mes', $hoy->format('Y-m-d')));

        // 2. Definimos los rangos para la semana (Lunes a Domingo)
        $inicioSemana = $fechaSemana->copy()->startOfWeek(Carbon::MONDAY);
        $finSemana = $fechaSemana->copy()->endOfWeek(Carbon::SUNDAY);

        // Si el usuario autenticado tiene un agente vinculado, filtramos sus turnos
        $agenteId = $request->user()?->agente_id;

        $turnos = TurnoTrabajo::whereBetween('fecha', [$inicioSemana->toDateString(), $finSemana->toDateString()])
            ->when($agenteId, fn ($q) => $q->where('agente_id', $agenteId))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'fecha' => $t->fecha?->toDateString() ?? '',
                'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $t->hora_fin, 0, 5),
                'direccion' => $t->direccion_asignada ?? '',
                'estado' => $t->estado_turno ?? '',
            ])
            ->values()
            ->all();

        // 3. Definimos los rangos para el mes (incluyendo semanas completas del calendario)
        $inicioMes = $fechaMes->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY);
        $finMes = $fechaMes->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);

        $eventos = EventoOperativo::whereBetween('fecha_hora_inicio', [$inicioMes, $finMes])
            ->orderBy('fecha_hora_inicio')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'titulo' => $e->titulo ?? '',
                'fecha' => $e->fecha_hora_inicio?->toDateString() ?? '',
                'hora_inicio' => $e->fecha_hora_inicio?->format('H:i') ?? '',
                'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
                'direccion' => $e->direccion ?? '',
                'estado' => $e->estado ?? '',
            ])
            ->values()
            ->all();

        // 4. Retornamos la vista con Inertia estructurando los objetos limpiamente
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