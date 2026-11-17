<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ContactoEmergenciaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre'   => ['required', 'string', 'max:150'],
            'celular'  => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{6,30}$/'],
            'relacion' => ['nullable', 'string', 'max:60'],
        ];
    }

    public function messages(): array
    {
        return ['celular.regex' => 'El celular solo puede tener números, espacios, +, - y paréntesis.'];
    }
}
