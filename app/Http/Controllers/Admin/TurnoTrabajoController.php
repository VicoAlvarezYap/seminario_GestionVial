<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TurnoTrabajoController extends Controller
{
    /** Asigna un o varios turnos a varios agente o solo a uno */
      public function store(TurnoTrabajoRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        $agenteIds = $datos['agente_ids'];
        unset($datos['agente_ids']);

        // Los turnos creados juntos comparten un identificador de asignación
        $asignacionId = count($agenteIds) > 1 ? (string) Str::uuid() : null;

        // Todo o nada: si falla un agente, no se crea ninguno
        DB::transaction(function () use ($agenteIds, $datos, $asignacionId) {
            foreach ($agenteIds as $agenteId) {
                TurnoTrabajo::create($datos + [
                    'agente_id' => $agenteId,
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

    /** Modifica un turno (también sirve para reasignarlo a otro agente). */
    public function update(TurnoTrabajoRequest $request, TurnoTrabajo $turno): RedirectResponse
    {
        $turno->update($request->validated());

        return back()->with('success', 'Turno actualizado correctamente.');
    }

    public function destroy(TurnoTrabajo $turno): RedirectResponse
    {
        $turno->delete();

        return back()->with('success', 'Turno eliminado correctamente.');
    }
}
