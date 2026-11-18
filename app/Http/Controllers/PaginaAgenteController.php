<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaginaAgenteController extends Controller
{
    public function index(Request $request): Response
    {
        $usuario = $request->user();

        return Inertia::render('Pagina_Principal/index', [
            'nombreUsuario' => $usuario ? "{$usuario->name}" : 'Invitado',
        ]);
    }
}