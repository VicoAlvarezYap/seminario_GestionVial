<?php
namespace App\Http\Controllers;
use App\Models\ContactoEmergencia;
use Illuminate\Http\Request;

class ContactoEmergenciaController extends Controller
{
    public function store (Request $request){ //recibe
        $validated =$request ->validate([
            'nombre' => 'required|string|max: 100',
            'celular' => 'required|string|max:50',
            'relacion' => 'required|string|max:50',
        ]);
        $request->user()->agente->contactosEmergencia()->create($validated);

        return back()->with('success', 'Contacto de emergencia agregado.');
    }
    public function destroy(Request $request, ContactoEmergencia $contacto)
    {
        //elimina- modulo en prueba (cambio a un eliminar logico)
        if ($contacto->agente_id !== $request->user()->agente->id) {
            abort(403);
        }

        $contacto->delete();

        return back()->with('success', 'Contacto eliminado.');
    }
    public function update(Request $request, ContactoEmergencia $contacto)
    {
        // Importante: que pasa si el contacto a modificar no es del agente (?)
        if ($contacto->agente_id !== $request->user()->agente->id) {
            abort(403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'celular' => 'required|string|max:50',
            'relacion' => 'required|string|max:50',
        ]);

        $contacto->update($validated);

        return back()->with('success', 'Contacto actualizado correctamente.');
    }

}