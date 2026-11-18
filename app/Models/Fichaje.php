<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fichaje extends Model{
    use HasFactory;

    public const TIPO_ENTRADA = 'entrada';
    public const TIPO_SALIDA = 'salida';
    public const TIPO_SALIDA_ANTICIPADA = 'salida_anticipada';
    public const ORIGEN_WEB = 'web';
    public const ORIGEN_MOVIL = 'movil';
    public const REVISION_PENDIENTE = 'pendiente';
    public const REVISION_JUSTIFICADA = 'justificada';
    public const REVISION_INJUSTIFICADA = 'injustificada';

    protected $fillable = [ 
        'turno_trabajo_id',
        'tipo',
        'registrada_at',
        'latitud',
        'longitud',
        'precision_m',
        'dentro_de_zona',
        'distancia_zona_m',
        'foto_path',
        'origen',
        'ip',
        'registrada_por',
        'motivo_correccion',
        'motivo_salida',
        'observacion',
        'estado_revision',
        'revisada_por',
        'revisada_at',
        'comentario_revision',
    ];
    protected function casts(): array
    {
        return [
            'registrada_at'    => 'datetime',
            'revisada_at'      => 'datetime',
            'latitud'          => 'decimal:8',
            'longitud'         => 'decimal:8',
            'precision_m'      => 'integer',
            'distancia_zona_m' => 'integer',
            'dentro_de_zona'   => 'boolean',
        ];
    }
    //RElaciones con otras tablas
    public function turnoTrabajo(): BelongsTo
    {
        return $this->belongsTo(TurnoTrabajo::class, 'turno_trabajo_id');
    }
    public function registradaPor(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'registrada_por');
    }
     public function revisadaPor(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'revisada_por');
    }
    
    //Atajos de devolucion de datos 
    public function scopeEntradas(Builder $query): Builder
    {
        return $query->where('tipo', self::TIPO_ENTRADA);
    }
    public function scopeSalidas(Builder $query): Builder
    {
        return $query->whereIn('tipo', [self::TIPO_SALIDA, self::TIPO_SALIDA_ANTICIPADA]);
    }
    public function scopeSalidasAnticipadas(Builder $query): Builder
    {
        return $query->where('tipo', self::TIPO_SALIDA_ANTICIPADA);
    }
    public function scopePendientesDeRevision(Builder $query): Builder
    {
        return $query->where('estado_revision', self::REVISION_PENDIENTE);
    }
    public function scopeFueraDeZona(Builder $query): Builder
    {
        return $query->where('dentro_de_zona', false);
    }
    public function esSalidaAnticipada(): bool
    {
        return $this->tipo === self::TIPO_SALIDA_ANTICIPADA;
    }

    public function fueCorregidoManualmente(): bool
    {
        return ! is_null($this->motivo_correccion);
    }

    public function estaRevisada(): bool
    {
        return ! is_null($this->revisada_at);
    }

}
//scopes no ayudara con las consultas grandes antes de traerlos de la base de datos
//el restos nos ayudara como auxiliares a ver los registros ya carados 
//el scope filtra cuáles fichajes traer; el helper pregunta algo sobre un fichaje que ya tenés en mano.