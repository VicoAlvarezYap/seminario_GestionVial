<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\EventoOperativo;
use App\Models\Lugar;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventoController extends Controller
{
    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $gestiona = $this->gestiona($request);

        $f = $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
            'agentes' => ['nullable', 'array'],
            'agentes.*' => ['integer', 'exists:agentes,id'],
            'alcance' => ['nullable', 'in:propios,todos'],
            'buscar' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', 'in:programado,en_curso,finalizado,cancelado,suspendido'],
        ]);

        $consulta = EventoOperativo::query()
           ->with(['lugar:id,nombre', 'tareas.turno.agente:id,nombre,apellido'])
           ->filtrar($f, $gestiona, $usuario->agente_id);

        $eventos = $consulta
            ->orderByDesc('fecha_hora_inicio')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (EventoOperativo $e) => $this->fila($e));
        if ($request->filled('desde')) {
            $consulta->whereDate('fecha_hora_inicio', '>=', $f['desde']);
        }
        if ($request->filled('hasta')) {
            $consulta->whereDate('fecha_hora_inicio', '<=', $f['hasta']);
        }

        if ($gestiona) {
            // Admin: filtra por uno o más agentes (vacío = todos)
            $ids = array_map('intval', $f['agentes'] ?? []);
            if ($ids) {
                $consulta->whereHas('tareas.turno', fn ($q) => $q->whereIn('agente_id', $ids));
            }
        } elseif ($usuario->agente_id && ($f['alcance'] ?? 'propios') === 'propios') {
            // Agente: por defecto, solo sus eventos
            $consulta->whereHas('tareas.turno', fn ($q) => $q->where('agente_id', $usuario->agente_id));
        }

        $eventos = $consulta
            ->orderByDesc('fecha_hora_inicio')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (EventoOperativo $e) => $this->fila($e));

        return Inertia::render('Eventos/Index', [
            'eventos' => $eventos,
            'filtros' => [
                'desde' => $request->input('desde', ''),
                'hasta' => $request->input('hasta', ''),
                'agentes' => array_map('strval', $f['agentes'] ?? []),
                'alcance' => $f['alcance'] ?? 'propios',
            ],
            'agentes' => Agente::orderBy('apellido')->orderBy('nombre')
                ->get(['id', 'nombre', 'apellido'])
                ->map(fn (Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
                ->values()
                ->all(),
            'gestiona' => $gestiona,
            'puedeFiltrarPorAlcance' => (bool) $usuario->agente_id && ! $gestiona,
        ]);
    }

    public function show(Request $request, EventoOperativo $evento): Response
    {
        $evento->load(['lugar:id,nombre', 'puntosRecorrido', 'tareas.turno.agente:id,nombre,apellido']);

        return Inertia::render('Eventos/Show', [
            'evento' => array_merge($this->fila($evento), [
                'descripcion' => $evento->descripcion,
                'direccion' => $evento->direccion,
                'solicitante_ente' => $evento->solicitante_ente,
                'solicitante_nombre' => $evento->solicitante_nombre,
                'solicitante_celular' => $evento->solicitante_celular,
                'latitud_inicio' => $evento->latitud_inicio,
                'longitud_inicio' => $evento->longitud_inicio,
                'puntos' => $evento->puntosRecorrido->map(fn ($p) => [
                    'orden' => $p->orden,
                    'latitud' => $p->latitud,
                    'longitud' => $p->longitud,
                    'descripcion_referencia' => $p->descripcion_referencia,
                ])->values()->all(),
            ]),
            'gestiona' => $this->gestiona($request),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Eventos/Form', [
            'evento' => null,
            'lugares' => $this->lugares(),
        ]);
    }

    public function edit(EventoOperativo $evento): Response
    {
        $evento->load('puntosRecorrido');

        return Inertia::render('Eventos/Form', [
            'evento' => $this->datosFormulario($evento),
            'lugares' => $this->lugares(),
        ]);
    }

    /** Solo el administrador en modo admin puede gestionar eventos. */
    private function gestiona(Request $request): bool
    {
        $usuario = $request->user();
        $modo = $request->session()->get('modo', $usuario->agente_id ? 'agente' : 'admin');

        return $modo === 'admin' && $usuario->hasRole('Administrador');
    }

    private function fila(EventoOperativo $e): array
    {
        $agentes = $e->tareas
            ->map(fn ($t) => $t->turno?->agente)
            ->filter()
            ->unique('id')
            ->map(fn ($a) => "{$a->apellido}, {$a->nombre}")
            ->values()
            ->all();

        return [
            'id' => $e->id,
            'titulo' => $e->titulo,
            'fecha' => $e->fecha_hora_inicio->format('d/m/Y'),
            'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
            'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
            'lugar' => $e->lugar?->nombre ?? $e->direccion,
            'tipo_recorrido' => $e->tipo_recorrido,
            'estado' => $e->estado,
            'agentes' => $agentes,
        ];
    }

    /** Valores del formulario de edición: fecha y hora separadas, como las envía el formulario. */
    private function datosFormulario(EventoOperativo $e): array
    {
        return [
            'id' => $e->id,
            'titulo' => $e->titulo,
            'descripcion' => $e->descripcion,
            'fecha' => $e->fecha_hora_inicio->format('Y-m-d'),
            'hora_inicio' => $e->fecha_hora_inicio->format('H:i'),
            'hora_fin' => $e->fecha_hora_fin?->format('H:i'),
            'lugar_id' => $e->lugar_id,
            'direccion' => $e->direccion,
            'tipo_recorrido' => $e->tipo_recorrido,
            'latitud_inicio' => $e->latitud_inicio,
            'longitud_inicio' => $e->longitud_inicio,
            'solicitante_ente' => $e->solicitante_ente,
            'solicitante_nombre' => $e->solicitante_nombre,
            'solicitante_celular' => $e->solicitante_celular,
            'estado' => $e->estado,
            'puntos' => $e->puntosRecorrido->map(fn ($p) => [
                'latitud' => $p->latitud,
                'longitud' => $p->longitud,
                'descripcion_referencia' => $p->descripcion_referencia,
            ])->values()->all(),
        ];
    }

    private function lugares(): array
    {
        return Lugar::orderBy('nombre')->get(['id', 'nombre'])->map(fn ($l) => ['id' => $l->id, 'nombre' => $l->nombre])->all();
    }
}