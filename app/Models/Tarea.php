<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tarea extends Model
{
    protected $table = 'tareas';

    protected $fillable = [
        'turno_trabajo_id',
        'lugar_id',
        'evento_operativo_id',
        'titulo',
        'hora_inicio',
        'hora_fin',
        'estado',
        'detalles',
    ];

    protected $attributes = [
        'estado' => 'programado',
    ];

    public function turno(): BelongsTo
    {
        return $this->belongsTo(TurnoTrabajo::class, 'turno_trabajo_id');
    }

    public function lugar(): BelongsTo
    {
        return $this->belongsTo(Lugar::class);
    }

    public function evento(): BelongsTo
    {
        return $this->belongsTo(EventoOperativo::class, 'evento_operativo_id');
    }
    public function intervenciones(): HasMany
    {
        return $this->hasMany(Intervencion::class);
    }
    /** Prioridad: evento > tipo del catálogo > texto libre */
    protected function tituloFinal(): Attribute
    {
        return Attribute::get(fn() => $this->evento?->titulo
            ?? $this->tipo?->nombre
            ?? $this->titulo);
    }

    /** Lugar efectivo: el propio de la tarea o, si no tiene, el del evento */
    protected function lugarFinal(): Attribute
    {
        return Attribute::get(fn() => $this->lugar ?? $this->evento?->lugar);
    }

    /** La columna time devuelve H:i:s; esto la deja en H:i */
    protected function horaInicioCorta(): Attribute
    {
        return Attribute::get(fn() => $this->hora_inicio ? substr($this->hora_inicio, 0, 5) : null);
    }

    protected function horaFinCorta(): Attribute
    {
        return Attribute::get(fn() => $this->hora_fin ? substr($this->hora_fin, 0, 5) : null);
    }
}