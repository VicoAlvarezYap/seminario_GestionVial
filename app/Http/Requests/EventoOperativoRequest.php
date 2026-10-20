<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EventoOperativoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // el acceso lo controla el middleware 'role:Administrador' en las rutas
    }

    public function rules(): array
    {
        return [
            'titulo' => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'fecha' => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'direccion' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'titulo' => 'título',
            'descripcion' => 'descripción',
            'hora_inicio' => 'hora de inicio',
            'hora_fin' => 'hora de fin',
            'direccion' => 'dirección',
        ];
    }
}
