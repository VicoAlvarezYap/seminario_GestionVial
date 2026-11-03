<?php

namespace App\Http\Controllers;

use App\Http\Requests\IntervencionRequest;
use App\Models\Intervencion;
use App\Models\Tarea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionController extends Controller
{
    /** Listado de emergencias (sin tarea) para supervisores y admin. */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);

        $intervenciones = Intervencion::with(['lugar:id,nombre', 'agentes:id,nombre,apellido', 'agenteReporta:id,nombre,apellido'])
            ->emergencias()
            ->orderByDesc('fecha_hora')
            ->paginate(20)
            ->through(fn (Intervencion $i) => [
                'id'                 => $i->id,
                'tipo'               => $i->tipo,
                'tipo_evento'        => $i->tipo_evento,
                'nivel_urgencia'     => $i->nivel_urgencia,
                'estado_resolucion'  => $i->estado_resolucion,
                'fecha_hora'         => $i->fecha_hora->toIso8601String(),
                'lugar'              => $i->lugar?->nombre ?? $i->ubicacion_direccion,
                'descripcion'        => $i->descripcion,
                'reporta'            => $i->agenteReporta ? "{$i->agenteReporta->apellido}, {$i->agenteReporta->nombre}" : null,
                'agentes'            => $i->agentes->map(fn ($a) => [
                    'id'     => $a->id,
                    'nombre' => "{$a->apellido}, {$a->nombre}",
                    'rol'    => $a->pivot->rol_en_intervencion,
                ])->values()->all(),
            ]);

        return Inertia::render('Intervenciones/index', ['intervenciones' => $intervenciones]);
    }

    /** Registra una intervención (de una tarea o una emergencia). */
    public function store(IntervencionRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $agentes = collect($datos['agentes'] ?? []);
        unset($datos['agentes']);

        if (! empty($datos['tarea_id'])) {
            $tarea = Tarea::with('turno')->findOrFail($datos['tarea_id']);

            // Un agente solo puede registrar sobre sus propias tareas (admin y supervisor, sobre cualquiera)
            $this->autorizarSobreTarea($request, $tarea);

            $duenio = $tarea->turno->agente_id;
            $datos['agente_reporta_id'] ??= $duenio;

            if (! $agentes->contains('agente_id', $duenio)) {
                $agentes->prepend(['agente_id' => $duenio, 'rol_en_intervencion' => null]);
            }
        } else {
            // Las emergencias las carga personal con permiso, no cualquier agente
            abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);
        }

        DB::transaction(function () use ($datos, $agentes) {
            $intervencion = Intervencion::create($datos);
            $intervencion->agentes()->sync($this->paraPivote($agentes));
        });

        return back()->with('success', 'Intervención registrada correctamente.');
    }

    public function update(IntervencionRequest $request, Intervencion $intervencion): RedirectResponse
    {
        $this->autorizarEdicion($request, $intervencion);

        $datos = $request->validated();
        $agentes = collect($datos['agentes'] ?? []);
        unset($datos['agentes'], $datos['tarea_id']); // no se cambia el origen

        DB::transaction(function () use ($intervencion, $datos, $agentes) {
            $intervencion->update($datos);

            if ($agentes->isNotEmpty()) {
                $intervencion->agentes()->sync($this->paraPivote($agentes));
            }
        });

        return back()->with('success', 'Intervención actualizada correctamente.');
    }

    public function destroy(Request $request, Intervencion $intervencion): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);

        $intervencion->delete(); // el pivote se borra en cascada

        return back()->with('success', 'Intervención eliminada correctamente.');
    }

    /** Convierte [{agente_id, rol_en_intervencion}] al formato de sync(). */
    private function paraPivote($agentes): array
    {
        return $agentes->mapWithKeys(fn ($a) => [
            $a['agente_id'] => ['rol_en_intervencion' => $a['rol_en_intervencion'] ?? null],
        ])->all();
    }

    private function autorizarSobreTarea(Request $request, Tarea $tarea): void
    {
        $usuario = $request->user();

        if ($usuario->hasAnyRole(['Administrador', 'Supervisor'])) {
            return;
        }

        abort_unless($usuario->agente_id && $usuario->agente_id === $tarea->turno->agente_id, 403);
    }

    private function autorizarEdicion(Request $request, Intervencion $intervencion): void
    {
        $usuario = $request->user();

        if ($usuario->hasAnyRole(['Administrador', 'Supervisor'])) {
            return;
        }

        // El agente solo edita las que él reportó
        abort_unless($usuario->agente_id && $usuario->agente_id === $intervencion->agente_reporta_id, 403);
    }
}