<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportesTurno extends Model
{
     protected $table = 'reportes_turnos';

    protected $fillable = [
        'turno_trabajo_id',
        'vehiculo_oficial',
        'placa',
        'radio',
        'otros_equipos',
        'novedades',
    ];

    protected $casts = [
        'vehiculo_oficial' => 'boolean',
        'radio'            => 'boolean',
    ];

    protected $attributes = [
        'vehiculo_oficial' => false,
        'radio'            => false,
    ];

    public function turno(): BelongsTo
    {
        return $this->belongsTo(TurnoTrabajo::class, 'turno_trabajo_id');
    }

}
