<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\EventoOperativo;
use App\Models\TurnoTrabajo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\CarbonInterface;

class PaginaAgenteController extends Controller
{
    public function index(Request $request): Response
    {
        $usuario = $request->user();

        // Solo el Administrador modifica. Administrador y Supervisor ven los turnos de todos.
        $puedeEditar = $usuario->hasRole('Administrador');
        $verTodos = $usuario->hasAnyRole(['Administrador', 'Supervisor']);

        $hoy = now()->startOfDay();
        $fechaSemana = $this->leerFecha($request->query('semana'), $hoy);
        $fechaMes = $this->leerFecha($request->query('mes'), $hoy);

        // ---- Semana: turnos de trabajo (de lunes a domingo) ----
        $inicioSemana = $fechaSemana->copy()->startOfWeek(Carbon::MONDAY);
        $finSemana = $fechaSemana->copy()->endOfWeek(Carbon::SUNDAY);

        $turnos = TurnoTrabajo::with('agente:id,nombre,apellido')
            ->whereBetween('fecha', [$inicioSemana->toDateString(), $finSemana->toDateString()])
            // Un agente ve solo los suyos (si no está vinculado a un agente, no ve ninguno)
            ->when(!$verTodos, fn($q) => $q->where('agente_id', $usuario->agente_id))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(TurnoTrabajo $t) => [
                'id' => $t->id,
                'fecha' => $t->fecha->toDateString(),
                'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
                'hora_fin' => substr((string) $t->hora_fin, 0, 5),
                'agente' => $t->agente?->nombre_completo,
                'direccion' => $t->direccion_asignada,
                'observaciones' => $t->observaciones,
                'estado' => $t->estado_turno,
            ])
            ->values()
            ->all();

        // ---- Mes: eventos operativos (semanas completas) ----
        $inicioMes = $fechaMes->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY);
        $finMes = $fechaMes->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);

        $eventos = EventoOperativo::with('puntosRecorrido')
            ->whereBetween('fecha_hora_inicio', [$inicioMes, $finMes])
            ->orderBy('fecha_hora_inicio')
            ->get()
            ->map(fn(EventoOperativo $e) => [
                'id' => $e->id,
                'titulo' => $e->titulo,
                'fecha' => $e->fecha_hora_inicio->toDateString(),
                'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
                'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
                'direccion' => $e->direccion,
                'descripcion' => $e->descripcion,
                'estado' => $e->estado,
                'tipo_recorrido' => $e->tipo_recorrido,
                'latitud_inicio' => $e->latitud_inicio,
                'longitud_inicio' => $e->longitud_inicio,
                'solicitante_ente' => $e->solicitante_ente,
                'solicitante_nombre' => $e->solicitante_nombre,
                'solicitante_celular' => $e->solicitante_celular,
                'puntos' => $e->puntosRecorrido->map(fn($p) => [
                    'descripcion_referencia' => $p->descripcion_referencia,
                    'latitud' => $p->latitud,
                    'longitud' => $p->longitud,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        // Lista de agentes para el selector de "asignar turno" (solo el administrador la necesita)
        $agentes = $puedeEditar
            ? Agente::orderBy('apellido')->orderBy('nombre')->get(['id', 'nombre', 'apellido'])
                ->map(fn(Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
                ->values()
                ->all()
            : [];

        return Inertia::render('Pagina_Principal/index', [
            'puedeEditar' => $puedeEditar,
            'agentes' => $agentes,
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

    /** Convierte el texto recibido en fecha; si falta o es inválido, usa la de respaldo. */
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
