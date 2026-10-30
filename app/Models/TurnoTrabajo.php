<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TurnoTrabajo extends Model
{
    use HasFactory;

    protected $table = 'turnos_trabajo';

    public $timestamps = false;

    protected $fillable = [
        'agente_id',
        'lugar_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'direccion_asignada',
        'observaciones',
        'estado_turno',
        'asignacion_id',
    ];

    protected $casts = [
        'fecha' => 'date',
        'inicio_real' => 'datetime', //hora de entrada real al turno
        'fin_real' => 'datetime',  //hora de finalizacion, esto puede ser despues o antes
    ];

    public function lugar(): BelongsTo
    {
        return $this->belongsTo(Lugar::class, 'lugar_id');
    }

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }
}