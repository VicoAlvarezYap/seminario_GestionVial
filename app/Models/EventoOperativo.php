<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // 1. Importar BelongsTo

class EventoOperativo extends Model
{
    protected $table = 'eventos_operativos';

    protected $fillable = [
        'titulo',
        'descripcion',
        'fecha_hora_inicio',
        'fecha_hora_fin',
        'direccion',
        'tipo_recorrido',
        'latitud_inicio',
        'longitud_inicio',
        'latitud_fin',
        'longitud_fin',
        'solicitante_ente',
        'solicitante_nombre',
        'solicitante_celular',
        'estado',
        'lugar_id', // 2. Añadir lugar_id al fillable
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora_inicio' => 'datetime',
            'fecha_hora_fin' => 'datetime',
            'latitud_inicio' => 'decimal:8',
            'longitud_inicio' => 'decimal:8',
            'latitud_fin' => 'decimal:8',
            'longitud_fin' => 'decimal:8',
        ];
    }

    /**
     * Relación: Un evento operativo tiene muchos puntos de recorrido (itinerario).
     */
    public function puntosRecorrido(): HasMany
    {
        return $this->hasMany(EventoPuntoRecorrido::class, 'evento_id')->orderBy('orden');
    }

    /**
     * 3. Agregar la relación con Lugar
     */
    public function lugar(): BelongsTo
    {
        return $this->belongsTo(Lugar::class, 'lugar_id');
    }
}