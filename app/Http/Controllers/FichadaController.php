<?php

namespace App\Http\Controllers;

use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class FichadaController extends Controller
{
    /** Minutos antes de la hora de inicio en que ya se puede iniciar el turno (0 = estricto). */
    public const MARGEN_ANTES_MIN = 15;

    /** Ventana en la que se puede iniciar un turno: [desde, hasta]. */
    public static function ventana(TurnoTrabajo $turno): array
    {
        $dia = $turno->fecha->toDateString();
        $inicio = Carbon::parse("{$dia} {$turno->hora_inicio}");
        $fin = Carbon::parse("{$dia} {$turno->hora_fin}");

        // Turno que cruza la medianoche: termina al día siguiente
        if ($fin->lessThanOrEqualTo($inicio)) {
            $fin->addDay();
        }

        return [$inicio->copy()->subMinutes(self::MARGEN_ANTES_MIN), $fin];
    }

    public function iniciar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        $this->autorizar($request, $turno);

        if ($turno->inicio_real) {
            return $this->error('Este turno ya fue iniciado.');
        }

        // Solo un turno "programado" se puede iniciar (no ausente, cancelado ni reasignado)
        if ($turno->estado_turno !== 'programado') {
            return $this->error('Este turno no se puede iniciar (estado: ' . $turno->estado_turno . ').');
        }

        // Solo se puede iniciar el turno del día de hoy
        if ($turno->fecha->toDateString() !== now()->toDateString()) {
            return $this->error('Solo podés iniciar un turno el día que corresponde.');
        }

        // Solo dentro del horario del turno (con el margen de antes)
        [$desde, $hasta] = self::ventana($turno);

        if (now()->lt($desde)) {
            return $this->error('Todavía no podés iniciar este turno. Se habilita a las ' . $desde->format('H:i') . '.');
        }

        if (now()->gt($hasta)) {
            return $this->error('El horario de este turno ya terminó.');
        }

        // No se puede tener dos turnos en curso a la vez
        $enCurso = TurnoTrabajo::where('agente_id', $turno->agente_id)
            ->whereNotNull('inicio_real')
            ->whereNull('fin_real')
            ->exists();

        if ($enCurso) {
            return $this->error('Ya tenés un turno en curso. Terminalo antes de iniciar otro.');
        }

        $turno->inicio_real = now();
        $turno->save();

        return back();
    }

    public function finalizar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        $this->autorizar($request, $turno);

        if (! $turno->inicio_real) {
            return $this->error('Este turno todavía no fue iniciado.');
        }

        if ($turno->fin_real) {
            return $this->error('Este turno ya fue terminado.');
        }

        $turno->fin_real = now();
        $turno->estado_turno = 'cumplido';
        $turno->save();

        return back();
    }

    /** Solo el agente dueño del turno puede iniciarlo o terminarlo. */
    private function autorizar(Request $request, TurnoTrabajo $turno): void
    {
        $agenteId = $request->user()->agente_id;

        abort_unless($agenteId !== null && $agenteId === $turno->agente_id, 403);
    }

    private function error(string $mensaje): RedirectResponse
    {
        return back()->withErrors(['fichada' => $mensaje]);
    }
}