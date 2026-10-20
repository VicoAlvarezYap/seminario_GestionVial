<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventoOperativoRequest;
use App\Models\EventoOperativo;
use Illuminate\Http\RedirectResponse;

class EventoOperativoController extends Controller
{
    public function store(EventoOperativoRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        // El formulario manda fecha y horas por separado; la tabla guarda fecha y hora juntas
        EventoOperativo::create([
            'titulo' => $datos['titulo'],
            'descripcion' => $datos['descripcion'] ?? null,
            'direccion' => $datos['direccion'] ?? null,
            'tipo_recorrido' => 'estatico',
            'estado' => 'programado',
            'fecha_hora_inicio' => "{$datos['fecha']} {$datos['hora_inicio']}",
            'fecha_hora_fin' => ! empty($datos['hora_fin'])
                ? "{$datos['fecha']} {$datos['hora_fin']}"
                : null,
        ]);

        return back()->with('success', 'Evento creado correctamente.');
    }

    public function destroy(EventoOperativo $evento): RedirectResponse
    {
        $evento->delete();

        return back()->with('success', 'Evento eliminado correctamente.');
    }
}
