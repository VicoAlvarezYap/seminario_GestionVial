<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\TareaRequest;
use App\Models\EventoOperativo;
use App\Models\Tarea;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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
    if (in_array($tarea->estado, ['finalizado', 'cancelada'], true)) {
        return back()->with('error', 'Solo se pueden editar tareas pendientes o en curso.');
    }

    $datos = $request->validated();
    unset($datos['aplicar_a_grupo']);
    $datos = $this->completarDesdeEvento($datos);

    if (! empty($datos['hora_inicio']) && ! empty($datos['hora_fin'])) {
        $tarea->turno->validarHorarioDelBloque($datos['hora_inicio'], $datos['hora_fin']);

            $choca = Tarea::where('turno_trabajo_id', $tarea->turno_trabajo_id)
            ->where('estado', '!=', 'cancelada')
            ->whereKeyNot($tarea->id)
            ->where('hora_inicio', '<', $datos['hora_fin'])
            ->where('hora_fin', '>', $datos['hora_inicio'])
            ->first();

        if ($choca) {
            $tramo = substr($choca->hora_inicio, 0, 5).' a '.substr($choca->hora_fin, 0, 5);

            throw ValidationException::withMessages([
                'hora_inicio' => "Se superpone con la tarea «{$choca->titulo}» ({$tramo}) de este agente. Cambiá la hora o cancelá esa tarea.",
            ]);
        }
    }

    $tarea->update($datos);

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
 public function cancelar(Tarea $tarea): RedirectResponse
{
    if ($tarea->turno?->fichajes()->exists()) {
        return back()->with('error', 'No se puede cancelar: el turno ya tiene fichajes registrados.');
    }

    $tarea->update(['estado' => 'cancelada']);

    return back()->with('success', 'Tarea cancelada.');
}
}