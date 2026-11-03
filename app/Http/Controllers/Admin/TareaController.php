<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TareaRequest;
use App\Models\EventoOperativo;
use App\Models\Tarea;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class TareaController extends Controller
{
    /**
     * Crea una tarea en un turno. Con aplicar_a_grupo, la replica en los turnos
     * de los demás agentes asignados juntos (misma asignacion_id).
     */
    public function store(TareaRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        $aplicarAGrupo = (bool) ($datos['aplicar_a_grupo'] ?? false);
        unset($datos['aplicar_a_grupo']);

        $datos = $this->completarDesdeEvento($datos);
        $turno = TurnoTrabajo::findOrFail($datos['turno_trabajo_id']);

        $turnoIds = ($aplicarAGrupo && $turno->asignacion_id)
            ? TurnoTrabajo::where('asignacion_id', $turno->asignacion_id)->pluck('id')
            : collect([$turno->id]);

        DB::transaction(function () use ($turnoIds, $datos) {
            foreach ($turnoIds as $turnoId) {
                Tarea::create(['turno_trabajo_id' => $turnoId] + $datos);
            }
        });

        return back()->with('success', $turnoIds->count() > 1
            ? "Tarea creada en {$turnoIds->count()} turnos."
            : 'Tarea creada correctamente.');
    }

    public function update(TareaRequest $request, Tarea $tarea): RedirectResponse
    {
        $datos = $request->validated();
        unset($datos['aplicar_a_grupo']);

        $tarea->update($this->completarDesdeEvento($datos));

        return back()->with('success', 'Tarea actualizada correctamente.');
    }

    public function destroy(Tarea $tarea): RedirectResponse
    {
        if ($tarea->intervenciones()->exists()) {
            return back()->with('error', 'No se puede eliminar: la tarea tiene intervenciones registradas.');
        }

        $tarea->delete();

        return back()->with('success', 'Tarea eliminada correctamente.');
    }

    /** Si hay evento, lo que falte (lugar y horas) se toma de él. */
    private function completarDesdeEvento(array $datos): array
    {
        if (empty($datos['evento_operativo_id'])) {
            return $datos;
        }

        $evento = EventoOperativo::findOrFail($datos['evento_operativo_id']);

        $datos['lugar_id']    ??= $evento->lugar_id;
        $datos['hora_inicio'] ??= $evento->fecha_hora_inicio->format('H:i');
        $datos['hora_fin']    ??= $evento->fecha_hora_fin?->format('H:i');

        return $datos;
    }
}