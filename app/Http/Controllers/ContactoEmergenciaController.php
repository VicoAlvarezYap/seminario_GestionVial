<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactoEmergenciaRequest;
use App\Models\ContactoEmergencia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ContactoEmergenciaController extends Controller
{
    /** El maximo de contacto de emergencia es 2 */
    private const MAXIMO = 2;

    public function store(ContactoEmergenciaRequest $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403);

        if (ContactoEmergencia::where('agente_id', $agenteId)->count() >= self::MAXIMO) {
            return back()->withErrors(['nombre' => 'Ya cargaste el máximo de ' . self::MAXIMO . ' contactos.']);
        }

        ContactoEmergencia::create($request->validated() + ['agente_id' => $agenteId]);

        return back()->with('success', 'Contacto agregado correctamente.');
    }

    public function update(ContactoEmergenciaRequest $request, ContactoEmergencia $contacto): RedirectResponse
    {
        $this->autorizar($request, $contacto);

        $contacto->update($request->validated());

        return back()->with('success', 'Contacto actualizado correctamente.');
    }

    public function destroy(Request $request, ContactoEmergencia $contacto): RedirectResponse
    {
        $this->autorizar($request, $contacto);

        $contacto->delete();

        return back()->with('success', 'Contacto eliminado correctamente.');
    }
    private function autorizar(Request $request, ContactoEmergencia $contacto): void
    {
        $agenteId = $request->user()->agente_id;

        abort_unless($agenteId && $agenteId === $contacto->agente_id, 403);
    }
}