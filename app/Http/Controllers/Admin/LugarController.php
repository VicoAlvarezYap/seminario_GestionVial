<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lugar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LugarController extends Controller
{
    /** Crea un lugar nuevo desde el formulario de turnos o de eventos. */
    public function store(Request $request): RedirectResponse
    {
        $datos = $request->validate(
            [
                'nombre' => ['required', 'string', 'max:150', 'unique:lugares,nombre'],
                'tipo' => ['nullable', 'string', 'max:50'],
                'direccion' => ['nullable', 'string', 'max:255'],
            ],
            [
                'nombre.unique' => 'Ya existe un lugar con ese nombre.',
            ],
            [
                'nombre' => 'nombre del lugar',
            ],
        );

        Lugar::create($datos);

        return back()->with('success', 'Lugar creado correctamente.');
    }
}
