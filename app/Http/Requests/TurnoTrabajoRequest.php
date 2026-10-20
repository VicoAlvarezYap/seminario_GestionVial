<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TurnoTrabajoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // el acceso lo controla el middleware 'role:Administrador' en las rutas
    }

    public function rules(): array
    {
        return [
            'agente_id' => ['required', 'integer', 'exists:agentes,id'],
            'fecha' => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'direccion_asignada' => ['nullable', 'string', 'max:255'],
            'estado_turno' => ['required', 'in:programado,cumplido,ausente,cancelado,reasignado'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'agente_id' => 'agente',
            'hora_inicio' => 'hora de inicio',
            'hora_fin' => 'hora de fin',
            'direccion_asignada' => 'lugar asignado',
            'estado_turno' => 'estado',
        ];
    }
}
