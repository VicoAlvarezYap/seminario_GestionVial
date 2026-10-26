<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lugar extends Model
{
    protected $table = 'lugares';

    protected $fillable = [
        'nombre',
        'tipo',
        'direccion',
        'latitud',
        'longitud',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'latitud' => 'decimal:8',
            'longitud' => 'decimal:8',
            'activo' => 'boolean',
        ];
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(TurnoTrabajo::class, 'lugar_id');
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(EventoOperativo::class, 'lugar_id');
    }
}
