<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventoOperativo extends Model
{
    protected $table = 'eventos_operativos';

    protected $fillable = [
        'titulo', 'descripcion', 'fecha_hora_inicio', 'fecha_hora_fin',
        'direccion', 'tipo_recorrido', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora_inicio' => 'datetime',
            'fecha_hora_fin' => 'datetime',
        ];
    }
}