<?php

namespace App\Http\Controllers;

use App\Models\SolicitudReprogramacion;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SolicitudReprogramacionController extends Controller
{
    /** El agente pide cambiar el horario de su turno o tomarse el día. */
    public function store(Request $request): RedirectResponse
    {
        $agenteId = $request->user()->agente?->id;
        abort_unless($agenteId, 403);

        $datos = $request->validate([
            'turno_trabajo_id' => ['required', 'integer', 'exists:turnos_trabajo,id'],
            'tipo' => ['required', Rule::in(SolicitudReprogramacion::TIPOS)],
            'nuevo_turno' => ['required_if:tipo,cambio_horario', 'nullable', Rule::in(TurnoTrabajo::TURNOS)],
            'nueva_hora_inicio' => ['nullable', 'date_format:H:i'],
            'nueva_hora_fin' => ['nullable', 'date_format:H:i'],
            'motivo' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'nuevo_turno.required_if' => 'Elegí el turno al que querés cambiar.',
            'motivo.required' => 'Contanos el motivo.',
            'motivo.min' => 'El motivo es muy corto.',
        ]);

        // Solo sus propios turnos
        $turno = TurnoTrabajo::where('agente_id', $agenteId)->findOrFail($datos['turno_trabajo_id']);

        if ($mensaje = $turno->motivoNoReprogramable()) {
            throw ValidationException::withMessages(['turno_trabajo_id' => $mensaje]);
        }

        if ($turno->solicitudes()->where('estado', 'pendiente')->exists()) {
            throw ValidationException::withMessages([
                'turno_trabajo_id' => 'Ya tenés una solicitud pendiente para este turno.',
            ]);
        }

        $nuevoTurno = null;
        $horaInicio = null;
        $horaFin = null;

        if ($datos['tipo'] === 'cambio_horario') {
            $nuevoTurno = $datos['nuevo_turno'];

            if ($nuevoTurno === 'especial') {
                $horaInicio = $datos['nueva_hora_inicio'] ?? null;
                $horaFin = $datos['nueva_hora_fin'] ?? null;

                if (!$horaInicio || !$horaFin) {
                    throw ValidationException::withMessages([
                        'nueva_hora_inicio' => 'El turno especial necesita hora de inicio y de fin.',
                    ]);
                }

                $this->validarDuracionEspecial($horaInicio, $horaFin);
            }

            $igualAlActual = $nuevoTurno === $turno->turno
                && ($nuevoTurno !== 'especial'
                    || (substr((string) $turno->hora_inicio_prog, 0, 5) === $horaInicio
                        && substr((string) $turno->hora_fin_prog, 0, 5) === $horaFin));

            if ($igualAlActual) {
                throw ValidationException::withMessages([
                    'nuevo_turno' => 'Elegí un horario distinto al que ya tenés.',
                ]);
            }
        }

        SolicitudReprogramacion::create([
            'turno_trabajo_id' => $turno->id,
            'agente_id' => $agenteId,
            'tipo' => $datos['tipo'],
            'nuevo_turno' => $nuevoTurno,
            'nueva_hora_inicio' => $horaInicio,
            'nueva_hora_fin' => $horaFin,
            'motivo' => trim($datos['motivo']),
        ]);

        return back()->with('success', 'Solicitud enviada. Un administrador la va a revisar.');
    }

    /** El agente retira una solicitud que todavía no fue resuelta. */
    public function cancelar(Request $request, SolicitudReprogramacion $solicitud): RedirectResponse
    {
        $agenteId = $request->user()->agente?->id;
        abort_unless($agenteId && $solicitud->agente_id === $agenteId, 403);

        if ($solicitud->estado !== 'pendiente') {
            return back()->with('error', 'Esa solicitud ya fue resuelta, no se puede cancelar.');
        }

        $solicitud->update(['estado' => 'cancelada']);

        return back()->with('success', 'Solicitud cancelada.');
    }

    /** Misma regla de duración que usa la asignación de turnos especiales. */
    private function validarDuracionEspecial(string $inicio, string $fin): void
    {
        $desde = Carbon::createFromFormat('H:i', $inicio);
        $hasta = Carbon::createFromFormat('H:i', $fin);

        if ($hasta->lessThanOrEqualTo($desde)) {
            $hasta->addDay(); // cruza medianoche
        }

        $horas = $desde->diffInMinutes($hasta) / 60;
        $min = config('turnos.especial.min_horas');
        $max = config('turnos.especial.max_horas');

        if ($horas < $min || $horas > $max) {
            throw ValidationException::withMessages([
                'nueva_hora_fin' => "El turno especial debe durar entre {$min} y {$max} horas.",
            ]);
        }
    }
}