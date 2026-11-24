<?php

namespace App\Http\Controllers;

use App\Models\Agente;
use App\Models\HistorialLaboral;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HistorialLaboralController extends Controller
{
    public function baja(Request $request, Agente $agente): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);

        $datos = $request->validate([
            'fecha_baja' => ['required', 'date'],
            'motivo_egreso' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $resultado = DB::transaction(function () use ($agente, $datos) {
            $vinculo = HistorialLaboral::where('agente_id', $agente->id)
                ->vigente()
                ->lockForUpdate()
                ->first();

            if (!$vinculo) {
                return 'El agente ya está dado de baja.';
            }

            if ($datos['fecha_baja'] < $vinculo->fecha_alta->toDateString()) {
                return 'La baja no puede ser anterior a la fecha de alta.';
            }

            $vinculo->update([
                'fecha_baja' => $datos['fecha_baja'],
                'motivo_egreso' => $datos['motivo_egreso'],
            ]);

            // Turnos futuros que ya no se van a cumplir
            TurnoTrabajo::where('agente_id', $agente->id)
                ->where('estado_turno', 'programado')
                ->whereDate('fecha', '>', $datos['fecha_baja'])
                ->delete(); // o update(['estado_turno' => 'cancelado']) si preferís conservarlos

            return null;
        });

        return $resultado
            ? back()->with('error', $resultado)
            : back()->with('success', 'Agente dado de baja.');
    }

    public function alta(Request $request, Agente $agente): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);

        $datos = $request->validate([
            'fecha_alta' => ['required', 'date'],
            'motivo_ingreso' => ['nullable', 'string', 'max:500'],
        ]);

        $creado = DB::transaction(function () use ($agente, $datos) {
            if (HistorialLaboral::where('agente_id', $agente->id)->vigente()->lockForUpdate()->exists()) {
                return false;
            }

            HistorialLaboral::create([
                'agente_id' => $agente->id,
                'fecha_alta' => $datos['fecha_alta'],
                'motivo_ingreso' => $datos['motivo_ingreso'] ?? null,
            ]);

            return true;
        });

        return $creado
            ? back()->with('success', 'Agente dado de alta.')
            : back()->with('warning', 'El agente ya está activo.');
    }
}