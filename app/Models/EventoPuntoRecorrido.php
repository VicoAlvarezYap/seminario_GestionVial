<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventoPuntoRecorrido extends Model
{
    protected $table = 'evento_puntos_recorrido';

    // Se desactiva ya que la migración no define $table->timestamps()
    public $timestamps = false;

    protected $fillable = [
        'evento_id',
        'orden',
        'latitud',
        'longitud',
        'descripcion_referencia',
    ];

    protected $casts = [
        'orden' => 'integer',
        'latitud' => 'decimal:8',
        'longitud' => 'decimal:8',
    ];

    /**
     * Relación: El punto pertenece a un evento operativo.
     */
    public function eventoOperativo(): BelongsTo
    {
        return $this->belongsTo(EventoOperativo::class, 'evento_id');
    }
}