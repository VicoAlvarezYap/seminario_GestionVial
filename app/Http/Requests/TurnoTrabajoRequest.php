<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TurnoTrabajoRequest extends FormRequest
{
    public function rules(): array
    {
        $reglas = [
            'fecha' => ['required', 'date'],
            // Debe coincidir con los valores del enum de la migración
            'turno' => ['required', Rule::in(['manana', 'tarde', 'noche', 'especial'])],
        ];

        if ($this->isMethod('POST')) {
            return $reglas + [
                'agente_ids' => ['required', 'array', 'min:1'],
                'agente_ids.*' => ['integer', 'distinct', 'exists:agentes,id'],
            ];
        }

        // Edición: un solo agente, sin repetir fecha + turno
        return $reglas + [
            'agente_id' => [
                'required',
                'integer',
                'exists:agentes,id',
                Rule::unique('turnos_trabajo')
                    ->where('fecha', $this->input('fecha'))
                    ->where('turno', $this->input('turno'))
                    ->ignore($this->route('turno')),
            ],
            'estado_turno' => ['sometimes', Rule::in(['programado', 'cumplido', 'ausente', 'cancelado', 'reasignado'])],
        ];
    }
}