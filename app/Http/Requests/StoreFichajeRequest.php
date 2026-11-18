<?php

namespace App\Http\Requests;

use App\Models\Fichaje;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFichajeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // la autorización fina se hace en el controlador
    }

    public function rules(): array
    {
        $esGestor = $this->user()->hasAnyRole(['Administrador', 'Supervisor']);
        $turno = $this->route('turno');
        $esCargaManual = $esGestor && $turno && $this->user()->agente_id !== $turno->agente_id;

        return [
            'tipo'              => ['required', Rule::in([Fichaje::TIPO_ENTRADA, Fichaje::TIPO_SALIDA])],
            'latitud'           => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitud'],
            'longitud'          => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitud'],
            'precision_m'       => ['nullable', 'integer', 'min:0', 'max:65535'],
            'foto'              => ['nullable', 'image', 'max:4096'],
            'origen'            => ['nullable', Rule::in([Fichaje::ORIGEN_WEB, Fichaje::ORIGEN_MOVIL])],
            'motivo_salida'     => ['nullable', Rule::in(['enfermedad', 'emergencia_familiar', 'autorizado_superior', 'otro'])],
            'observacion'       => ['nullable', 'string', 'max:1000'],
            'motivo_correccion' => [Rule::requiredIf($esCargaManual), 'nullable', 'string', 'max:255'],
            // Solo el director puede marcar la hora manual
            'registrada_at'     => [$esGestor ? 'nullable' : 'prohibited', 'date', 'before_or_equal:now'],
        ];
    }
}