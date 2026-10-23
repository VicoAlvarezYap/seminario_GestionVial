<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EventoOperativoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        // Los puntos del recorrido solo se validan (y se aceptan) si el evento es móvil/itinerante
        $soloMovil = 'exclude_unless:tipo_recorrido,movil_itinerante';

        return [
            // Datos generales
            'titulo' => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'fecha' => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'in:programado,en_curso,finalizado,cancelado,suspendido'],

            // Solicitante
            'solicitante_ente' => ['nullable', 'string', 'max:150'],
            'solicitante_nombre' => ['nullable', 'string', 'max:150'],
            'solicitante_celular' => ['nullable', 'string', 'max:30'],

            // Tipo de recorrido y ubicación (evento estatico)
            'tipo_recorrido' => ['required', 'in:estatico,movil_itinerante'],
            'latitud_inicio' => ['nullable', 'numeric', 'between:-90,90'],
            'longitud_inicio' => ['nullable', 'numeric', 'between:-180,180'],

            // Puntos del recorrido (evento movil/itinerante): minimo inicio y fin
            'puntos' => [$soloMovil, 'required', 'array', 'min:2'],
            'puntos.*.descripcion_referencia' => [$soloMovil, 'nullable', 'string', 'max:255'],
            'puntos.*.latitud' => [$soloMovil, 'required', 'numeric', 'between:-90,90'],
            'puntos.*.longitud' => [$soloMovil, 'required', 'numeric', 'between:-180,180'],
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
            'solicitante_ente' => 'ente solicitante',
            'solicitante_nombre' => 'nombre del solicitante',
            'solicitante_celular' => 'celular del solicitante',
            'tipo_recorrido' => 'tipo de recorrido',
            'latitud_inicio' => 'latitud',
            'longitud_inicio' => 'longitud',
            'puntos' => 'puntos del recorrido',
            'puntos.*.descripcion_referencia' => 'referencia del punto :position',
            'puntos.*.latitud' => 'latitud del punto :position',
            'puntos.*.longitud' => 'longitud del punto :position',
        ];
    }

    public function messages(): array
    {
        return [
            'puntos.required' => 'Un evento móvil necesita al menos 2 puntos: inicio y fin.',
            'puntos.min' => 'Un evento móvil necesita al menos 2 puntos: inicio y fin.',
        ];
    }
}
