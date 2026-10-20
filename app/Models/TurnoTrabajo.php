<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TurnoTrabajo extends Model
{
    protected $table = 'turnos_trabajo';

    public $timestamps = false;

    protected $fillable = [
        'agente_id', 'fecha', 'hora_inicio', 'hora_fin',
        'direccion_asignada', 'estado_turno', 'observaciones',
    ];

    protected function casts(): array
    {
        return ['fecha' => 'date'];
    }
}