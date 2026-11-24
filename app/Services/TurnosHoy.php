<?php

namespace App\Services;

use App\Models\TurnoTrabajo;
use Illuminate\Support\Carbon;

class TurnosHoy
{
    /**
     * Datos que necesita el componente <TurnoActual>.
     * Si pasás $agenteId, solo devuelve los turnos de ese agente.
     */
    public static function datos(?int $agenteId = null): array
    {
        $hoy = now()->toDateString();

        return [
            'hoy' => $hoy,
            'horariosConfig' => config('turnos.horarios'),
            'turnosHoy' => self::turnosDelDia($hoy, $agenteId),
        ];
    }

    private static function turnosDelDia(string $fecha, ?int $agenteId)
    {
        return TurnoTrabajo::query()
            ->whereDate('fecha', $fecha)
            ->when($agenteId, fn ($q) => $q->where('agente_id', $agenteId))
            ->with('agente:id,nombre,apellido')
            ->orderByRaw("CASE turno
                WHEN 'manana' THEN 1
                WHEN 'tarde' THEN 2
                WHEN 'noche' THEN 3
                ELSE 4 END")
            ->get()
            ->map(function (TurnoTrabajo $t) {
                $estado = $t->estado_turno;

                return [
                    'id' => $t->id,
                    'fecha' => Carbon::parse($t->fecha)->toDateString(),
                    'turno' => $t->turno,
                    'hora_inicio_prog' => $t->hora_inicio_prog,
                    'hora_fin_prog' => $t->hora_fin_prog,
                    'estado' => $estado instanceof \BackedEnum ? $estado->value : (string) $estado,
                    'agente' => $t->agente,
                ];
            })
            ->values();
    }
}