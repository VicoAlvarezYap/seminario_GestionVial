<?php

namespace App\Http\Requests;

use App\Http\Controllers\IntervencionController;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmergenciaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tipo_seleccion'        => ['required', Rule::in(IntervencionController::TIPOS)],
            'tipo_otros'            => ['nullable', 'required_if:tipo_seleccion,' . IntervencionController::OTROS, 'string', 'max:100'],
            'nivel_urgencia'        => ['required', Rule::in(['baja', 'media', 'alta', 'critica'])],
            'ubicacion_direccion'   => ['required', 'string', 'max:255'],
            'descripcion_situacion' => ['nullable', 'string'],
        ];
    }
}