<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Relevos extends Model
{
    protected $table = 'relevos';
    public $timestamps = false;
    protected $guarded = ['id'];
    public const TEXTOS = [
        'numero_acta' => 20,
        'tercero_nombre_apellido' => 200,
        'tercero_tipo_documento' => 20,
        'tercero_dni' => 20,
        'conductor_sexo' => 1,
        'tercero_domicilio' => 255,
        'conductor_localidad' => 100,
        'conductor_codigo_postal' => 10,
        'conductor_partido' => 100,
        'conductor_provincia' => 100,
        'conductor_pais' => 100,
        'tercero_celular' => 30,
        'conductor_correo' => 150,
        'licencia_numero' => 30,
        'licencia_expedida_por' => 100,
        'licencia_clase' => 20,
        'vehiculo_placa' => 15,
        'vehiculo_tipo' => 50,
        'vehiculo_marca' => 60,
        'vehiculo_modelo' => 60,
        'vehiculo_linea' => 60,
        'vehiculo_interno' => 30,
        'vehiculo_otro_dominio' => 15,
        'vehiculo_propietario' => 200,
        'propietario_tipo_documento' => 20,
        'propietario_documento' => 20,
        'propietario_domicilio' => 255,
        'propietario_codigo_postal' => 10,
        'propietario_localidad' => 100,
        'propietario_provincia' => 100,
        'propietario_pais' => 100,
        'descripcion_legal' => 500,
        'ley_decreto' => 100,
        'articulo_inciso' => 100,
        'codigo_infraccion' => 30,
        'lugar_infraccion' => 255,
        'sentido_circulacion' => 60,
        'localidad_infraccion' => 100,
        'alcoholemia_nivel' => 20,
        'instrumento_equipo' => 100,
        'instrumento_modelo' => 100,
        'instrumento_serie' => 60,
        'instrumento_cod_aprobacion' => 60,
        'instrumento_valor' => 60,
        'observaciones' => 2000,
    ];

    public const BOOLEANOS = [
        'alcoholemia_agravante',
        'retuvo_licencia',
        'retuvo_vehiculo',
        'conductor_alternativo',
        'necesito_atencion_policial',
    ];

    protected function casts(): array
    {
        return [
            'necesito_atencion_policial' => 'boolean',
            'alcoholemia_agravante' => 'boolean',
            'retuvo_licencia' => 'boolean',
            'retuvo_vehiculo' => 'boolean',
            'conductor_alternativo' => 'boolean',
            'infracciones_codigos' => 'array',
            'fecha_hora' => 'datetime',
            'licencia_vencimiento' => 'date',
            'instrumento_fecha_hora' => 'datetime',
        ];
    }

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }

    /// todos los datos del acta, listos para el formulario, el detalle y el pdf
    public function paraVista(): array
    {
        $datos = [];

        foreach (array_keys(self::TEXTOS) as $campo) {
            $datos[$campo] = $this->{$campo} ?? '';
        }

        foreach (self::BOOLEANOS as $campo) {
            $datos[$campo] = (bool) $this->{$campo};
        }

        return $datos + [
            'id' => $this->id,
            'fecha_hora' => $this->fecha_hora->format('d/m/Y H:i'),
            'motivo_detencion' => $this->motivo_detencion,
            'infracciones_codigos' => $this->infracciones_codigos ?? [],
            'vehiculo_anio' => $this->vehiculo_anio ? (string) $this->vehiculo_anio : '',
            'licencia_vencimiento' => $this->licencia_vencimiento?->format('Y-m-d') ?? '',
            'instrumento_fecha_hora' => $this->instrumento_fecha_hora?->format('Y-m-d\TH:i') ?? '',
        ];
    }
}