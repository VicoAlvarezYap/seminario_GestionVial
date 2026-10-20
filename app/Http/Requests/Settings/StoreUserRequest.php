<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'rol_id' => ['required', 'integer', 'exists:roles,id'],
            // Opcional, pero un agente solo puede tener una cuenta
            'agente_id' => ['nullable', 'integer', 'exists:agentes,id', 'unique:users,agente_id'],
            'activo' => ['boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'email' => 'correo electrónico',
            'password' => 'contraseña',
            'rol_id' => 'rol',
            'agente_id' => 'agente',
        ];
    }

    public function messages(): array
    {
        return [
            'agente_id.unique' => 'Ese agente ya tiene una cuenta de usuario.',
        ];
    }
}
