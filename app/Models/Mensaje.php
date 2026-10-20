<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensaje extends Model
{
    use HasFactory;

    protected $table = 'mensajes';

    protected $fillable = [
        'agente_id',
        'destinatario_id',
        'asunto',
        'contenido',
        'archivo_pdf',
        'fecha_hora',
        'leido',
    ];

    protected $casts = [
        'fecha_hora' => 'datetime',
        'leido' => 'boolean',
    ];

    /**
     * Relación: El agente que envió el mensaje (remitente).
     */
    public function remitente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }

    /**
     * Relación: El agente que recibe el mensaje (destinatario).
     */
    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'destinatario_id');
    }
}