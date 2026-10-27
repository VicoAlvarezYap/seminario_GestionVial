<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\Lugar;
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

    $puedeEditar = $usuario->hasRole('Administrador');
    $verTodos = $usuario->hasAnyRole(['Administrador', 'Supervisor']);

    $request->validate([
        'desde'    => ['nullable', 'date'],
        'hasta'    => ['nullable', 'date', 'after_or_equal:desde'],
        'ev_desde' => ['nullable', 'date'],
        'ev_hasta' => ['nullable', 'date', 'after_or_equal:ev_desde'],
    ]);

    // Turnos: por defecto, la semana actual
    [$desde, $hasta] = $this->leerRango($request, 'desde', 'hasta', now()->startOfWeek(), now()->endOfWeek());

    // Eventos: por defecto, el mes actual
    [$evDesde, $evHasta] = $this->leerRango($request, 'ev_desde', 'ev_hasta', now()->startOfMonth(), now()->endOfMonth());

    $turnos = TurnoTrabajo::with(['agente:id,nombre,apellido', 'lugar:id,nombre'])
        ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
        // Antes usabas !$puedeEditar y el Supervisor veía solo lo suyo, contra tu propio comentario
        ->when(! $verTodos, fn ($q) => $q->where('agente_id', $usuario->id))
        ->orderBy('fecha')
        ->orderBy('hora_inicio')
        ->get()
        ->map(fn (TurnoTrabajo $t) => [
            'id' => $t->id,
            'lugar_id' => $t->lugar_id,
            'fecha' => $t->fecha->toDateString(),
            'lugar' => $t->lugar?->nombre,
            'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
            'hora_fin' => substr((string) $t->hora_fin, 0, 5),
            'agente_id' => $t->agente_id,
            'agente' => $t->agente ? "{$t->agente->apellido}, {$t->agente->nombre}" : null,
            'direccion' => $t->direccion_asignada,
            'observaciones' => $t->observaciones,
            'estado' => $t->estado_turno,
        ])
        ->values()
        ->all();

    $eventos = EventoOperativo::with(['puntosRecorrido', 'lugar:id,nombre'])
        // endOfDay para no perder los eventos del último día del rango
        ->whereBetween('fecha_hora_inicio', [$evDesde->copy()->startOfDay(), $evHasta->copy()->endOfDay()])
        ->orderBy('fecha_hora_inicio')
        ->get()
        ->map(fn (EventoOperativo $e) => [
            // ...tu mapeo actual, sin cambios
        ])
        ->values()
        ->all();

    $agentes = $puedeEditar
            ? Agente::orderBy('apellido')->orderBy('nombre')->get(['id', 'nombre', 'apellido'])
                ->map(fn(Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
                ->values()
                ->all()
            : [];

    return Inertia::render('Pagina_Principal/index', [
        'puedeEditar' => $puedeEditar,
        'agentes' => $agentes,
        'lugares' => $puedeEditar
                ? Lugar::where('activo', true)->orderBy('nombre')->get(['id', 'nombre'])
                    ->map(fn(Lugar $l) => ['id' => $l->id, 'nombre' => $l->nombre])
                    ->values()
                    ->all()
                : [],
        'semana' => [
            'desde' => $desde->toDateString(),
            'hasta' => $hasta->toDateString(),
            'turnos' => $turnos,
        ],
        'mes' => [   // conservo la clave "mes" para no tocar la página
            'desde' => $evDesde->toDateString(),
            'hasta' => $evHasta->toDateString(),
            'eventos' => $eventos,
        ],
    ]);
}

/** Lee un rango desde la query; si falta o es inválido usa el de respaldo. Máximo 366 días. */
private function leerRango(Request $request, string $kDesde, string $kHasta, CarbonInterface $respDesde, CarbonInterface $respHasta): array
{
    $desde = $this->leerFecha($request->query($kDesde), $respDesde);
    $hasta = $this->leerFecha($request->query($kHasta), $respHasta);

    if ($desde->diffInDays($hasta) > 365) {
        $hasta = $desde->copy()->addDays(365);
    }

    return [$desde, $hasta];
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