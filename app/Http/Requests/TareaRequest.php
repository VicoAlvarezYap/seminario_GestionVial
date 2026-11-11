<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TareaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'turno_trabajo_id'    => [$this->isMethod('POST') ? 'required' : 'prohibited', 'exists:turnos_trabajo,id'],
            'aplicar_a_grupo'     => ['sometimes', 'boolean'],

            'evento_operativo_id' => ['nullable', 'exists:eventos_operativos,id'],
            'titulo'              => ['nullable', 'string', 'max:150',
                'required_without_all:evento_operativo_id,tipo_tarea_id'],

            'lugar_id'            => ['nullable', 'exists:lugares,id'],
            'hora_inicio'         => ['nullable', 'date_format:H:i'],
            'hora_fin'            => ['nullable', 'date_format:H:i'],
            'estado'              => ['sometimes', Rule::in(['programado', 'iniciado', 'en_proceso', 'finalizado'])],
            'detalle'             => ['nullable', 'string'],
        ];
    }
}