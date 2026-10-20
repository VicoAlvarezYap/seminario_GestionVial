<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateAgenteRequest extends StoreAgenteRequest
{
    public function rules(): array
    {
        $rules = parent::rules();

        // Ignora al propio agente al validar que el documento sea único
        $rules['numero_documento'] = [
            'required',
            'string',
            'max:20',
            Rule::unique('agentes', 'numero_documento')->ignore($this->route('agente')),
        ];

        return $rules;
    }
}
