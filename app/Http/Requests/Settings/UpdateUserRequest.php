<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends StoreUserRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        $usuario = $this->route('usuario');

        $rules['email'] = [
            'required', 'string', 'email', 'max:255',
            Rule::unique('users', 'email')->ignore($usuario),
        ];

        // En edición la contraseña es opcional: si queda vacía, no se cambia
        $rules['password'] = ['nullable', 'confirmed', Password::defaults()];

        $rules['agente_id'] = [
            'nullable', 'integer', 'exists:agentes,id',
            Rule::unique('users', 'agente_id')->ignore($usuario),
        ];

        return $rules;
    }
}
