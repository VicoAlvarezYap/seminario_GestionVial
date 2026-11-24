<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolicitudReprogramacion extends Model
{
    public const TIPOS = ['cambio_horario', 'tomar_dia'];

    protected $table = 'solicitudes_reprogramacion';

    protected $fillable = [
        'turno_trabajo_id',
        'agente_id',
        'tipo',
        'nuevo_turno',
        'nueva_hora_inicio',
        'nueva_hora_fin',
        'motivo',
        'estado',
        'resuelta_por',
        'resuelta_at',
        'comentario_resolucion',
    ];

    protected function casts(): array
    {
        return [
            'resuelta_at' => 'datetime',
        ];
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(TurnoTrabajo::class, 'turno_trabajo_id');
    }

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class);
    }

    public function resueltaPor(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'resuelta_por');
    }
}