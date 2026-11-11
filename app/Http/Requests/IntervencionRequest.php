<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IntervencionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tarea_id'            => ['nullable', 'exists:tareas,id'],
            'lugar_id'            => ['nullable', 'exists:lugares,id'],

            'tipo'                => ['required', Rule::in(['accidente', 'infraccion', 'emergencia', 'otro'])],
            'tipo_evento'         => ['nullable', 'string', 'max:100'],
            'cantidad'            => ['nullable', 'integer', 'min:1'],

            'nivel_urgencia'      => ['sometimes', Rule::in(['baja', 'media', 'alta', 'critica'])],
            'estado_resolucion'   => ['sometimes', Rule::in(['reportada', 'en_curso', 'resuelta', 'derivada', 'cancelada'])],

            'ubicacion_direccion' => ['nullable', 'string', 'max:255'],
            'descripcion'         => ['required', 'string'],
            'fecha_hora'          => ['required', 'date'],

            // Emergencia (sin tarea): exige quién reporta y al menos un agente
            'agente_reporta_id'   => ['required_without:tarea_id', 'nullable', 'exists:agentes,id'],

            'agentes'                       => ['required_without:tarea_id', 'nullable', 'array'],
            'agentes.*.agente_id'           => ['required', 'distinct', 'exists:agentes,id'],
            'agentes.*.rol_en_intervencion' => ['nullable', 'string', 'max:80'],
        ];
    }

    /** Una emergencia sin lugar del catálogo necesita al menos una dirección. */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->filled('tarea_id')
                && ! $this->filled('lugar_id')
                && ! $this->filled('ubicacion_direccion')) {
                $validator->errors()->add('ubicacion_direccion', 'Indicá un lugar o una dirección.');
            }
        });
    }
}