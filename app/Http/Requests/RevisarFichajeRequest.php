<?php

namespace App\Http\Requests;

use App\Models\Fichaje;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RevisarFichajeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['Administrador', 'Supervisor']);
    }

    public function rules(): array
    {
        return [
            'estado_revision'     => ['required', Rule::in([Fichaje::REVISION_JUSTIFICADA, Fichaje::REVISION_INJUSTIFICADA])],
            'comentario_revision' => ['nullable', 'string', 'max:1000'],
        ];
    }
}