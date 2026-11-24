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
        $agentes = Agente::with('historialLaboral')
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->get()
            ->map(fn(Agente $a) => [
                'id' => $a->id,
                'nombre' => $a->nombre,
                'apellido' => $a->apellido,
                'documento' => $a->numero_documento,
                'celular' => $a->celular,
                'correo' => $a->correo,
                'rango' => $a->rango,
                'historial' => $a->historialLaboral->map(fn($h) => [
                    'id' => $h->id,
                    'fecha_alta' => $h->fecha_alta->format('d/m/Y'),
                    'fecha_baja' => $h->fecha_baja?->format('d/m/Y'),
                    'motivo_ingreso' => $h->motivo_ingreso,
                    'motivo_egreso' => $h->motivo_egreso,
                ])->values(),
                // Activo si algún período no tiene fecha de baja (usa la relación ya cargada)
                'activo' => $a->historialLaboral->contains(fn($h) => $h->fecha_baja === null),
            ])
            ->values()
            ->all();

        return Inertia::render('Perfiles/index', ['agentes' => $agentes]);
    }
}