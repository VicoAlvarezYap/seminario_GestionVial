<?php

namespace App\Http\Controllers;

use App\Models\EventoOperativo;
use App\Models\Intervencion;
use App\Models\HistorialDeLicencias;
use App\Models\TurnoTrabajo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
class PaginaAgenteController extends Controller
{
    public function index(Request $request): Response
{
    $usuario = $request->user();
    $modo = $request->session()->get('modo', $usuario->agente_id ? 'agente' : 'admin');

    if ($modo === 'admin') {
        abort_unless($usuario->hasAnyRole(['Administrador', 'Supervisor']), 403);

        return Inertia::render('Inicio/Admin', $this->datosAdmin($usuario));
    }

    // Modo agente (lo que ya tenías)
    abort_unless($usuario->agente_id, 403, 'Tu cuenta no está vinculada a un agente.');

    return Inertia::render('Inicio/Agente', $this->datosAgente($usuario));
}

    /** Turno de hoy, con su horario y sus tareas. Null si no tiene turno. */
    private function turnoHoy(int $agenteId, string $hoy): ?array
    {
        $turno = TurnoTrabajo::with('tareas')
            ->where('agente_id', $agenteId)
            ->whereDate('fecha', $hoy)
            ->first();

        if (! $turno) {
            return null;
        }

        return [
            'id' => $turno->id,
            'turno' => $turno->turno,
            'estado' => $turno->estado_turno,
            'hora_inicio' => $turno->hora_inicio_prog ? substr($turno->hora_inicio_prog, 0, 5) : null,
            'hora_fin' => $turno->hora_fin_prog ? substr($turno->hora_fin_prog, 0, 5) : null,
            'tareas' => $turno->tareas->map(fn ($t) => [
                'titulo' => $t->titulo_final,
                'lugar' => $t->lugar_final?->nombre,
            ])->values()->all(),
            'puede_fichar' => $turno->estaProgramado() && $turno->inicio_real === null,
        ];
    }

    /** Turnos de la semana actual (lunes a domingo), solo los propios. */
    private function turnosSemana(int $agenteId, string $hoy): array
    {
        $lunes = now()->startOfWeek()->toDateString();
        $domingo = now()->endOfWeek()->toDateString();

        return TurnoTrabajo::where('agente_id', $agenteId)
            ->whereBetween('fecha', [$lunes, $domingo])
            ->orderBy('fecha')
            ->get()
            ->map(fn (TurnoTrabajo $t) => [
                'id' => $t->id,
                'fecha' => $t->fecha->toDateString(),
                'turno' => $t->turno,
                'estado' => $t->estado_turno,
                'es_hoy' => $t->fecha->toDateString() === $hoy,
            ])
            ->values()
            ->all();
    }

    /** Estado de las licencias recientes del agente. */
    private function novedades(int $agenteId): array
    {
        return HistorialDeLicencias::where('agente_id', $agenteId)
            ->orderByDesc('id')
            ->limit(3)
            ->get()
            ->map(fn (HistorialDeLicencias $l) => [
                'id' => $l->id,
                'tipo' => $l->tipo_licencia,
                'desde' => $l->fecha_inicio->format('d/m/Y'),
                'hasta' => $l->fecha_fin->format('d/m/Y'),
                'estado' => $l->estado,
            ])
            ->values()
            ->all();
    }

    /** Eventos del mes en curso (todos, no solo los del agente). */
    private function eventosDelMes(): array
    {
        return EventoOperativo::whereBetween('fecha_hora_inicio', [now()->startOfMonth(), now()->endOfMonth()])
            ->where('estado', '!=', 'cancelado')
            ->orderBy('fecha_hora_inicio')
            ->limit(5)
            ->get(['id', 'titulo', 'fecha_hora_inicio', 'estado'])
            ->map(fn (EventoOperativo $e) => [
                'id' => $e->id,
                'titulo' => $e->titulo,
                'fecha' => $e->fecha_hora_inicio->format('d/m/Y H:i'),
                'estado' => $e->estado,
            ])
            ->values()
            ->all();
    }
    private function datosAdmin($usuario): array
{
    $hoy = now()->toDateString();

    return [
        'nombre' => $usuario->name,
        'urgente' => $this->urgentes(),
        'licenciasPendientes' => $this->licenciasPendientes(),
        'turnosNoRealizados' => $this->turnosNoRealizados($hoy),
        'eventosMes' => $this->eventosDelMes(),
    ];
}

/** Reasignaciones y justificantes que requieren atención (lo más urgente primero). */
private function urgentes(): array
{
    $pendientes = HistorialDeLicencias::where('estado', 'pendiente')
        ->whereNotNull('justificante_path')
        ->count();

    return [
        'justificantes_pendientes' => $pendientes,
        'total' => $pendientes,
    ];
}

/** Licencias pendientes de resolver, las más recientes primero. */
private function licenciasPendientes(): array
{
    return HistorialDeLicencias::with('agente:id,nombre,apellido')
        ->where('estado', 'pendiente')
        ->orderByDesc('id')
        ->limit(5)
        ->get()
        ->map(fn (HistorialDeLicencias $l) => [
            'id' => $l->id,
            'agente' => "{$l->agente->apellido}, {$l->agente->nombre}",
            'tipo' => $l->tipo_licencia,
            'desde' => $l->fecha_inicio->format('d/m/Y'),
            'hasta' => $l->fecha_fin->format('d/m/Y'),
        ])
        ->values()
        ->all();
}

/** Turnos de días pasados que siguen en "programado" (no se cerraron). */
private function turnosNoRealizados(string $hoy): array
{
    return TurnoTrabajo::with('agente:id,nombre,apellido')
        ->where('estado_turno', 'programado')
        ->whereDate('fecha', '<', $hoy)
        ->orderByDesc('fecha')
        ->limit(5)
        ->get()
        ->map(fn (TurnoTrabajo $t) => [
            'id' => $t->id,
            'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
            'turno' => $t->turno,
            'fecha' => $t->fecha->format('d/m/Y'),
        ])
        ->values()
        ->all();
}
private function datosAgente($usuario): array
{
    $agenteId = $usuario->agente_id;
    $hoy = now()->toDateString();

    return [
        'agente' => [
            'nombre' => $usuario->agente->nombre,
            'apellido' => $usuario->agente->apellido,
        ],
        'turnoHoy' => $this->turnoHoy($agenteId, $hoy),
        'turnosSemana' => $this->turnosSemana($agenteId, $hoy),
        'novedades' => $this->novedades($agenteId),
        'eventosMes' => $this->eventosDelMes(),
    ];
}
public function cambiarModo(Request $request): RedirectResponse
{
    $usuario = $request->user();
    abort_unless(
    $usuario->agente_id && $usuario->hasRole('Administrador'),
    403
);

    $modo = $request->input('modo') === 'admin' ? 'admin' : 'agente';
    $request->session()->put('modo', $modo);

    return redirect('/pagina_principal');
}
}