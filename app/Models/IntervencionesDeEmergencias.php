<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class IntervencionesDeEmergencias extends Model
{
    protected $table = 'intervenciones_emergencias';
   public $timestamps = false;
    protected $fillable = [
        'tipo_evento',
        'nivel_urgencia',
        'ubicacion_direccion',
        'descripcion_situacion',
        'estado_resolucion',
        'agente_reporta_id',
        'fecha_hora_reporte',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora_reporte' => 'datetime',
        ];
    }

    // eel agente que registro la emergencia
    public function agenteReporta(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_reporta_id');
    }

    public function agentes(): BelongsToMany
    {
        return $this->belongsToMany(
            Agente::class,
            'intervencion_agentes',
            'intervencion_id',
            'agente_id'
        )->withPivot('rol_en_intervencion');
    }


    public function participaciones(): HasMany
    {
        return $this->hasMany(IntervencionDeAgente::class, 'intervencion_id');
    }
}