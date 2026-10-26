<?php

namespace App\Http\Requests;

use App\Models\TurnoTrabajo;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class TurnoTrabajoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // el acceso lo controla el middleware 'role:Administrador' en las rutas
    }
    private function esAlta(): bool
    {
        return $this->isMethod('POST');
    }

     protected function prepareForValidation(): void
    {
        // Compatibilidad: si el formulario manda un solo "agente_id", se trata como una lista de uno
        if ($this->esAlta() && ! $this->has('agente_ids') && $this->filled('agente_id')) {
            $this->merge(['agente_ids' => [$this->input('agente_id')]]);
        }
    }

    public function rules(): array
    {
        $reglas = [
            'fecha' => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'after:hora_inicio'],
            'lugar_id' => ['nullable', 'integer', 'exists:lugares,id'],
            // Ahora es un detalle opcional ("esquina norte", "puerta 2"); el lugar principal es lugar_id
            'direccion_asignada' => ['nullable', 'string', 'max:255'],
            'estado_turno' => ['required', 'in:programado,cumplido,ausente,cancelado,reasignado'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
        ];

        if ($this->esAlta()) {
            $reglas['agente_ids'] = ['required', 'array', 'min:1'];
            $reglas['agente_ids.*'] = ['integer', 'distinct', 'exists:agentes,id'];
        } else {
            $reglas['agente_id'] = ['required', 'integer', 'exists:agentes,id'];
        }

        return $reglas;
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $ids = $this->esAlta()
                    ? $this->input('agente_ids', [])
                    : [$this->input('agente_id')];

                $choques = TurnoTrabajo::with('agente:id,nombre,apellido')
                    ->whereIn('agente_id', $ids)
                    ->whereDate('fecha', $this->input('fecha'))
                    ->where('estado_turno', '!=', 'cancelado')
                    ->where('hora_inicio', '<', $this->input('hora_fin'))
                    ->where('hora_fin', '>', $this->input('hora_inicio'))
                    // Al editar, el propio turno no cuenta como choque
                    ->when($this->route('turno'), fn ($q, $turno) => $q->where('id', '!=', $turno->id))
                    ->get();

                if ($choques->isNotEmpty()) {
                    $nombres = $choques
                        ->map(fn (TurnoTrabajo $t) => $t->agente?->nombre_completo)
                        ->filter()
                        ->unique()
                        ->implode('; ');

                    $mensaje = "Ya tienen un turno que se superpone en ese horario: {$nombres}.";

                    // Se informa en ambos campos para que lo muestre tanto el formulario nuevo como el actual
                    $validator->errors()->add('agente_ids', $mensaje);
                    $validator->errors()->add('agente_id', $mensaje);
                }
            },
        ];
    }

     public function attributes(): array
    {
        return [
            'agente_id' => 'agente',
            'agente_ids' => 'agentes',
            'agente_ids.*' => 'agente',
            'hora_inicio' => 'hora de inicio',
            'hora_fin' => 'hora de fin',
            'lugar_id' => 'lugar',
            'direccion_asignada' => 'detalle del lugar',
            'estado_turno' => 'estado',
        ];
    }

     public function messages(): array
    {
        return [
            'agente_ids.required' => 'Elegí al menos un agente.',
            'agente_ids.min' => 'Elegí al menos un agente.',
        ];
    }
}
