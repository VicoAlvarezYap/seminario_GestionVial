<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Intervencion extends Model
{
    protected $table = 'intervenciones';

    protected $fillable = [
        'tarea_id',
        'lugar_id',
        'tipo',
        'tipo_evento',
        'cantidad',
        'nivel_urgencia',
        'estado_resolucion',
        'ubicacion_direccion',
        'descripcion',
        'agente_reporta_id',
        'fecha_hora',
    ];

    protected $casts = [
        'fecha_hora' => 'datetime',
    ];

    protected $attributes = [
        'cantidad'          => 1,
        'nivel_urgencia'    => 'media',
        'estado_resolucion' => 'reportada',
    ];

    public function tarea(): BelongsTo
    {
        return $this->belongsTo(Tarea::class);
    }

    public function lugar(): BelongsTo
    {
        return $this->belongsTo(Lugar::class);
    }

    public function agenteReporta(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_reporta_id');
    }

    public function agentes(): BelongsToMany
    {
        return $this->belongsToMany(Agente::class, 'intervencion_agentes', 'intervencion_id', 'agente_id')
            ->withPivot('rol_en_intervencion');
    }
    /** Emergencias: las que no nacieron dentro de una tarea */
    public function scopeEmergencias($query)
    {
        return $query->whereNull('tarea_id');
    }

    /** Las que surgieron durante una tarea */
    public function scopeDeTareas($query)
    {
        return $query->whereNotNull('tarea_id');
    }
}