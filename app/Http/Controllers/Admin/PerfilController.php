<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Agente;
use Inertia\Inertia;
use Inertia\Response;

class PerfilController extends Controller
{
    public function index(): Response
    {
        $agentes = Agente::orderBy('apellido')->orderBy('nombre')->get()
            ->map(fn (Agente $a) => [
                'id' => $a->id,
                'nombre' => $a->nombre,
                'apellido' => $a->apellido,
                'documento' => $a->numero_documento,
                'celular' => $a->celular,
                'correo' => $a->correo,
            ])
            ->values()
            ->all();

        return Inertia::render('Perfiles/index', ['agentes' => $agentes]);
    }
}