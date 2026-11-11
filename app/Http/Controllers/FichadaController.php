<?php

namespace App\Http\Controllers;

use App\Models\ReporteTurno;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FichadaController extends Controller
{
    /** Minutos antes de la hora de inicio en que ya se puede iniciar el turno (0 = estricto). */
    public const MARGEN_ANTES_MIN = 15;

    /** Ventana en la que se puede iniciar un turno: [desde, hasta]. */
    public static function ventana(TurnoTrabajo $turno): array
    {
        return [
            $turno->inicioProgramado()->subMinutes(self::MARGEN_ANTES_MIN),
            $turno->finProgramado(),
        ];
    }

    public function iniciar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        $this->autorizar($request, $turno);

        if ($turno->inicio_real) {
            return $this->error('Este turno ya fue iniciado.');
        }

        if ($turno->estado_turno !== 'programado') {
            return $this->error('Este turno no se puede iniciar (estado: ' . $turno->estado_turno . ').');
        }

        // Sin chequeo de "fecha == hoy": la ventana ya lo cubre y, además,
        // un turno noche iniciado después de medianoche tiene la fecha de ayer.
        [$desde, $hasta] = self::ventana($turno);

        if (now()->lt($desde)) {
            return $this->error('Todavía no podés iniciar este turno. Se habilita a las ' . $desde->format('H:i') . '.');
        }

        if (now()->gt($hasta)) {
            return $this->error('El horario de este turno ya terminó.');
        }

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

    /** Termina el turno y guarda el reporte en una sola operación. */
    public function finalizar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        $this->autorizar($request, $turno);

        if (!$turno->inicio_real) {
            return $this->error('Este turno todavía no fue iniciado.');
        }

        if ($turno->fin_real) {
            return $this->error('Este turno ya fue terminado.');
        }

        $datos = $request->validate([
            'vehiculo_oficial' => ['sometimes', 'boolean'],
            'placa' => ['nullable', 'required_if:vehiculo_oficial,true', 'string', 'max:15'],
            'radio' => ['sometimes', 'boolean'],
            'otros_equipos' => ['nullable', 'string', 'max:255'],
            'novedades' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($turno, $datos) {
            // Un solo reporte por turno (turno_trabajo_id es único)
            if (!$turno->reporte()->exists()) {
                $turno->reporte()->create($datos);
            }

            $turno->fin_real = now();
            $turno->estado_turno = 'cumplido';
            $turno->save();
        });

        return back()->with('success', 'Turno finalizado y reporte entregado.');
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