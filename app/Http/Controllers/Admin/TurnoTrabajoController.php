<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoTrabajoRequest;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;

class TurnoTrabajoController extends Controller
{
    /** Asigna un turno a un agente. */
    public function store(TurnoTrabajoRequest $request): RedirectResponse
    {
        TurnoTrabajo::create($request->validated());

        // back() vuelve a la misma página, con la misma semana y mes que se estaban viendo
        return back()->with('success', 'Turno asignado correctamente.');
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
