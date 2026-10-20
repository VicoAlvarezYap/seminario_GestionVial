<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAgenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        // El acceso se controla con el middleware 'auth' en las rutas.
        // Más adelante se puede restringir por rol acá.
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'numero_documento' => ['required', 'string', 'max:20', 'unique:agentes,numero_documento'],
            'celular' => ['nullable', 'string', 'max:30'],
            'correo' => ['nullable', 'email', 'max:150'],

            // Máximo 2 contactos de emergencia por agente
            'contactos' => ['nullable', 'array', 'max:2'],
            'contactos.*.nombre' => ['required', 'string', 'max:150'],
            'contactos.*.celular' => ['required', 'string', 'max:30'],
            'contactos.*.relacion' => ['nullable', 'string', 'max:60'],
        ];
    }

    public function attributes(): array
    {
        return [
            'numero_documento' => 'número de documento',
            'contactos' => 'contactos de emergencia',
            'contactos.*.nombre' => 'nombre del contacto',
            'contactos.*.celular' => 'celular del contacto',
            'contactos.*.relacion' => 'relación del contacto',
        ];
    }

    public function messages(): array
    {
        return [
            'numero_documento.unique' => 'Ya existe un agente con ese número de documento.',
            'contactos.max' => 'Solo se permiten hasta 2 contactos de emergencia.',
        ];
    }
}
