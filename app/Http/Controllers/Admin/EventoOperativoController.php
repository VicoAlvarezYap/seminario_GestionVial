<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventoOperativoRequest;
use App\Models\EventoOperativo;
use App\Models\EventoPuntoRecorrido;
use App\Models\Lugar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class EventoOperativoController extends Controller
{
    public function store(EventoOperativoRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        // Todo o nada: si falla el guardado de un punto, tampoco se guarda el evento
        DB::transaction(function () use ($datos) {
            $evento = EventoOperativo::create($this->datosParaGuardar($datos));
            $this->guardarPuntos($evento, $datos);
        });

        return back()->with('success', 'Evento creado correctamente.');
    }

    public function update(EventoOperativoRequest $request, EventoOperativo $evento): RedirectResponse
    {
        $datos = $request->validated();

        DB::transaction(function () use ($evento, $datos) {
            $evento->update($this->datosParaGuardar($datos));
            $this->guardarPuntos($evento, $datos);
        });

        return back()->with('success', 'Evento actualizado correctamente.');
    }

    public function destroy(EventoOperativo $evento): RedirectResponse
    {
        // Los puntos del recorrido se borran solos (clave foránea con cascada)
        $evento->delete();

        return back()->with('success', 'Evento eliminado correctamente.');
    }

    /**
     * El formulario manda fecha y horas por separado; la tabla guarda fecha y hora juntas.
     * Las coordenadas de inicio y fin salen de la ubicación (evento estático)
     * o del primer y último punto del recorrido (evento móvil).
     */
    private function datosParaGuardar(array $datos): array
    {
        $esMovil = $datos['tipo_recorrido'] === 'movil_itinerante';
        $puntos = array_values($datos['puntos'] ?? []);

        if ($esMovil && count($puntos) >= 2) {
            $primero = $puntos[0];
            $ultimo = $puntos[count($puntos) - 1];

            $coordenadas = [
                'latitud_inicio' => $primero['latitud'],
                'longitud_inicio' => $primero['longitud'],
                'latitud_fin' => $ultimo['latitud'],
                'longitud_fin' => $ultimo['longitud'],
            ];
        } else {
            $coordenadas = [
                'latitud_inicio' => $datos['latitud_inicio'] ?? null,
                'longitud_inicio' => $datos['longitud_inicio'] ?? null,
                'latitud_fin' => null,
                'longitud_fin' => null,
            ];
        }

        // Evento estático sin coordenadas propias: se usan las del lugar elegido (si las tiene)
        if (! $esMovil && $coordenadas['latitud_inicio'] === null && ! empty($datos['lugar_id'])) {
            $lugar = Lugar::find($datos['lugar_id']);

            if ($lugar && $lugar->latitud !== null && $lugar->longitud !== null) {
                $coordenadas['latitud_inicio'] = $lugar->latitud;
                $coordenadas['longitud_inicio'] = $lugar->longitud;
            }
        }

        return [
            'lugar_id' => $datos['lugar_id'] ?? null,
            'titulo' => $datos['titulo'],
            'descripcion' => $datos['descripcion'] ?? null,
            'direccion' => $datos['direccion'] ?? null,
            'estado' => $datos['estado'] ?? 'programado',
            'tipo_recorrido' => $datos['tipo_recorrido'],
            'solicitante_ente' => $datos['solicitante_ente'] ?? null,
            'solicitante_nombre' => $datos['solicitante_nombre'] ?? null,
            'solicitante_celular' => $datos['solicitante_celular'] ?? null,
            'fecha_hora_inicio' => "{$datos['fecha']} {$datos['hora_inicio']}",
            'fecha_hora_fin' => ! empty($datos['hora_fin'])
                ? "{$datos['fecha']} {$datos['hora_fin']}"
                : null,
        ] + $coordenadas;
    }

    /** Reemplaza los puntos del recorrido por los enviados en el formulario. */
    private function guardarPuntos(EventoOperativo $evento, array $datos): void
    {
        // Se borran primero para no chocar con la clave única (evento_id, orden)
        EventoPuntoRecorrido::where('evento_id', $evento->id)->delete();

        if ($datos['tipo_recorrido'] !== 'movil_itinerante') {
            return;
        }

        foreach (array_values($datos['puntos'] ?? []) as $i => $punto) {
            EventoPuntoRecorrido::create([
                'evento_id' => $evento->id,
                'orden' => $i + 1,
                'latitud' => $punto['latitud'],
                'longitud' => $punto['longitud'],
                'descripcion_referencia' => $punto['descripcion_referencia'] ?? null,
            ]);
        }
    }
}
