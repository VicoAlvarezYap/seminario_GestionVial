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
        EventoOperativo::create($this->datosParaGuardar($request->validated()) + [
            'tipo_recorrido' => 'estatico',
        ]);

        return back()->with('success', 'Evento creado correctamente.');
    }

    public function update(EventoOperativoRequest $request, EventoOperativo $evento): RedirectResponse
    {
        $evento->update($this->datosParaGuardar($request->validated()));

        return back()->with('success', 'Evento actualizado correctamente.');
    }

    public function destroy(EventoOperativo $evento): RedirectResponse
    {
        $evento->delete();

        return back()->with('success', 'Evento eliminado correctamente.');
    }


    private function datosParaGuardar(array $datos): array
    {
        return [
            'titulo' => $datos['titulo'],
            'descripcion' => $datos['descripcion'] ?? null,
            'direccion' => $datos['direccion'] ?? null,
            'estado' => $datos['estado'] ?? 'programado',
            'fecha_hora_inicio' => "{$datos['fecha']} {$datos['hora_inicio']}",
            'fecha_hora_fin' => ! empty($datos['hora_fin'])
                ? "{$datos['fecha']} {$datos['hora_fin']}"
                : null,
        ];
    }
}
