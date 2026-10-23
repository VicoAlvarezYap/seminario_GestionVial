<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class AgentePerfilController extends Controller
{
    public function show(Request $request)
    {
        $agente = $request->user()->agente()->with('contactosEmergencia')->first();

        return Inertia::render('Agentes/Perfil', [
            'agente' => $agente,
        ]);
    }
}