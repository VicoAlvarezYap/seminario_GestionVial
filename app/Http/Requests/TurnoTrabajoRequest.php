<?php

namespace App\Http\Requests;

use App\Models\TurnoTrabajo;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TurnoTrabajoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['Administrador']) ?? false;
    }

    public function rules(): array
    {
        $reglas = [
            'fecha' => ['required', 'date_format:Y-m-d'],
            'turno' => ['required', Rule::in(TurnoTrabajo::TURNOS)],

            'hora_inicio_prog' => ['required_if:turno,especial', 'nullable', 'date_format:H:i'],
            'hora_fin_prog' => ['required_if:turno,especial', 'nullable', 'date_format:H:i'],
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
                Rule::unique('turnos_trabajo', 'agente_id')
                    ->where('fecha', $this->input('fecha'))
                    ->where('turno', $this->input('turno'))
                    ->ignore($this->route('turno')),
            ],
            'estado_turno' => ['sometimes', Rule::in(TurnoTrabajo::ESTADOS)],
        ];
    }

    public function messages(): array
    {
        return [
            'agente_id.unique' => 'El agente ya tiene ese turno asignado en esa fecha.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (
                $this->input('turno') !== 'especial'
                || $validator->errors()->hasAny(['hora_inicio_prog', 'hora_fin_prog'])
            ) {
                return;
            }

            [$hi, $mi] = array_map('intval', explode(':', $this->input('hora_inicio_prog')));
            [$hf, $mf] = array_map('intval', explode(':', $this->input('hora_fin_prog')));

            $minutos = ($hf * 60 + $mf) - ($hi * 60 + $mi);
            if ($minutos <= 0) {
                $minutos += 24 * 60; // cruza la medianoche
            }

            // Valores por defecto de ejemplo: ajustalos a tu realidad
            $min = config('turnos.especial.min_horas', 1) * 60;
            $max = config('turnos.especial.max_horas', 16) * 60;

            if ($minutos < $min || $minutos > $max) {
                $validator->errors()->add(
                    'hora_fin_prog',
                    sprintf(
                        'El turno especial debe durar entre %d y %d horas (este dura %d h %02d min).',
                        $min / 60,
                        $max / 60,
                        intdiv($minutos, 60),
                        $minutos % 60
                    )
                );
            }
        });
    }
}