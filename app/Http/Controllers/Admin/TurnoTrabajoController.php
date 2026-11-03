<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\Agente;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TurnoTrabajoController extends Controller
{
    /** Asigna un turno (fecha + turno) a uno o varios agentes. */
    public function store(TurnoTrabajoRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $agenteIds = $datos['agente_ids'];

        $ocupados = TurnoTrabajo::whereDate('fecha', $datos['fecha'])
            ->where('turno', $datos['turno'])
            ->whereIn('agente_id', $agenteIds)
            ->pluck('agente_id');

        if ($ocupados->isNotEmpty()) {
            $nombres = Agente::whereIn('id', $ocupados)->get()
                ->map(fn ($a) => "{$a->apellido}, {$a->nombre}")
                ->implode('; ');

            throw ValidationException::withMessages([
                'agente_ids' => "Ya tienen ese turno asignado: {$nombres}.",
            ]);
        }

        $asignacionId = count($agenteIds) > 1 ? (string) Str::uuid() : null;

        DB::transaction(function () use ($agenteIds, $datos, $asignacionId) {
            foreach ($agenteIds as $agenteId) {
                TurnoTrabajo::create([
                    'agente_id'     => $agenteId,
                    'fecha'         => $datos['fecha'],
                    'turno'         => $datos['turno'],
                    'asignacion_id' => $asignacionId,
                ]);
            }
        });

        $cantidad = count($agenteIds);

        return back()->with(
            'success',
            $cantidad === 1 ? 'Turno asignado correctamente.' : "Turno asignado a {$cantidad} agentes.",
        );
    }

    public function update(TurnoTrabajoRequest $request, TurnoTrabajo $turno): RedirectResponse
    {
        $turno->update($request->validated());

        return back()->with('success', 'Turno actualizado correctamente.');
    }

    public function destroy(TurnoTrabajo $turno): RedirectResponse
    {
        // Las intervenciones protegen a sus tareas (restrictOnDelete)
        $conIntervenciones = $turno->tareas()->whereHas('intervenciones')->exists();

        if ($conIntervenciones) {
            return back()->with('error', 'No se puede eliminar: el turno tiene tareas con intervenciones registradas.');
        }

        $turno->delete(); // borra también sus tareas (cascade)

        return back()->with('success', 'Turno eliminado correctamente.');
    }
}