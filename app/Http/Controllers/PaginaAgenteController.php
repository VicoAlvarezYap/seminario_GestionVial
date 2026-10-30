<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\EventoOperativo;
use App\Models\Lugar;
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
        $verTodos = $usuario->hasAnyRole(['Administrador', 'Supervisor']);

        $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
            'ev_desde' => ['nullable', 'date'],
            'ev_hasta' => ['nullable', 'date', 'after_or_equal:ev_desde'],
        ]);

        // Turnos: por defecto, la semana actual
        [$desde, $hasta] = $this->leerRango($request, 'desde', 'hasta', now()->startOfWeek(), now()->endOfWeek());

        // Eventos: por defecto, el mes actual
        [$evDesde, $evHasta] = $this->leerRango($request, 'ev_desde', 'ev_hasta', now()->startOfMonth(), now()->endOfMonth());

        $turnos = TurnoTrabajo::with(['agente:id,nombre,apellido', 'lugar:id,nombre'])
            ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
            // Admin y Supervisor ven todo; el resto, solo sus turnos (por el agente vinculado al usuario)
            ->when(! $verTodos, fn ($q) => $usuario->agente_id
                ? $q->where('agente_id', $usuario->agente_id)
                : $q->whereRaw('1 = 0'))
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
                // "en_curso" no se guarda: se calcula con las horas reales de la fichada
                'estado' => ($t->estado_turno === 'programado' && $t->inicio_real && ! $t->fin_real)
                    ? 'en_curso'
                    : $t->estado_turno,
            ])
            ->values()
            ->all();

        // Turno de hoy para el botón Iniciar / Terminar (solo agentes; el administrador no ficha)
        $miTurno = null;

        if ($usuario->agente_id && ! $puedeEditar) {
            $candidatos = TurnoTrabajo::with('lugar:id,nombre')
                ->where('agente_id', $usuario->agente_id)
                ->whereIn('estado_turno', ['programado', 'cumplido'])
                ->where(fn ($q) => $q
                    ->whereDate('fecha', today())
                    // incluye un turno que quedó abierto (por ejemplo, uno que cruza la medianoche)
                    ->orWhere(fn ($q) => $q->whereNotNull('inicio_real')->whereNull('fin_real')))
                ->orderBy('hora_inicio')
                ->get();

            $t = $candidatos->first(fn ($t) => $t->inicio_real && ! $t->fin_real) // en curso
                ?? $candidatos->first(fn ($t) => ! $t->inicio_real)               // el próximo sin iniciar
                ?? $candidatos->last();                                            // el último ya terminado

            if ($t) {
                [$iniciaDesde, $terminaHasta] = FichadaController::ventana($t);

                $miTurno = [
                    'id' => $t->id,
                    'lugar' => $t->lugar?->nombre,
                    'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
                    'hora_fin' => substr((string) $t->hora_fin, 0, 5),
                    'inicio_real' => $t->inicio_real?->toIso8601String(),
                    'fin_real' => $t->fin_real?->toIso8601String(),
                    'inicia_desde' => $iniciaDesde->toIso8601String(),
                    'termina_hasta' => $terminaHasta->toIso8601String(),
                    'ahora' => now()->toIso8601String(),
                ];
            }
        }

        // OJO: ajustá los nombres de columna a los de tu tabla eventos_operativos
        $eventos = EventoOperativo::with(['puntosRecorrido', 'lugar:id,nombre'])
            ->whereBetween('fecha_hora_inicio', [$evDesde->copy()->startOfDay(), $evHasta->copy()->endOfDay()])
            ->orderBy('fecha_hora_inicio')
            ->get()
            ->map(fn (EventoOperativo $e) => [
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
                    ->map(fn ($p) => ['descripcion_referencia' => $p->descripcion_referencia])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();

        $agentes = $puedeEditar
            ? Agente::orderBy('apellido')->orderBy('nombre')->get(['id', 'nombre', 'apellido'])
                ->map(fn (Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
                ->values()
                ->all()
            : [];

        return Inertia::render('Pagina_Principal/index', [
            'puedeEditar' => $puedeEditar,
            'agentes' => $agentes,
            'lugares' => $puedeEditar
                ? Lugar::where('activo', true)->orderBy('nombre')->get(['id', 'nombre'])
                    ->map(fn (Lugar $l) => ['id' => $l->id, 'nombre' => $l->nombre])
                    ->values()
                    ->all()
                : [],
            'miTurno' => $miTurno,
            'semana' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
                'turnos' => $turnos,
            ],
            'mes' => [ // conservo la clave "mes" para no tocar la página
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
        if (! is_string($valor) || $valor === '') {
            return $respaldo->copy();
        }

        try {
            return Carbon::parse($valor)->startOfDay();
        } catch (\Throwable) {
            return $respaldo->copy();
        }
    }
}