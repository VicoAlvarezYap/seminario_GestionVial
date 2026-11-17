<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agente extends Model
{
    protected $table = 'agentes';

    public const RANGOS = ['inspector', 'instructor_examinador', 'director'];

    public const ROL_POR_RANGO = [
        'director' => 'Administrador',
        'instructor_examinador' => 'Supervisor',
        'inspector' => 'Agente',
    ];


    protected $fillable = [
        'nombre',
        'apellido',
        'numero_documento',
        'domicilio',
        'celular',
        'correo',
        'rango',
    ];

    public static function rolParaRango(?string $rango): string
    {
        return self::ROL_POR_RANGO[$rango] ?? 'Agente';
    }


    public function usuario(): HasOne
    {
        return $this->hasOne(User::class, 'agente_id');
    }

    public function contactosEmergencia(): HasMany
    {
        return $this->hasMany(ContactoEmergencia::class, 'agente_id');
    }

    /** "Apellido, Nombre" para listados y selects. */
    public function getNombreCompletoAttribute(): string
    {
        return "{$this->apellido}, {$this->nombre}";
    }
    protected static function booted(): void
    {
        // Si cambia el rango, el rol del usuario se actualiza solo
        static::updated(function (Agente $agente) {
            if ($agente->wasChanged('rango')) {
                $agente->user?->syncRoles(self::rolParaRango($agente->rango));
            }
        });
    }
}
