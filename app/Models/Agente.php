<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agente extends Model
{
    protected $table = 'agentes';

    protected $fillable = [
        'nombre',
        'apellido',
        'numero_documento',
        'celular',
        'correo',
    ];

    /** Cuenta de acceso al sistema (opcional: no todo agente tiene una). */
    public function usuario(): HasOne
    {
        return $this->hasOne(User::class, 'agente_id');
    }

    public function contactosEmergencia(): HasMany
    {
        return $this->hasMany(ContactoEmergencia::class, 'agente_id');
    }

    /*
     * Descomentar a medida que se creen estos modelos:
     *
     * public function historialLaboral(): HasMany
     * {
     *     return $this->hasMany(HistorialLaboral::class, 'agente_id');
     * }
     *
     * public function licencias(): HasMany
     * {
     *     return $this->hasMany(HistorialLicencia::class, 'agente_id');
     * }
     *
     * public function observacionesMedicas(): HasMany
     * {
     *     return $this->hasMany(ObservacionMedica::class, 'agente_id');
     * }
     *
     * public function turnos(): HasMany
     * {
     *     return $this->hasMany(TurnoTrabajo::class, 'agente_id');
     * }
     */

    /** "Apellido, Nombre" para listados y selects. */
    public function getNombreCompletoAttribute(): string
    {
        return "{$this->apellido}, {$this->nombre}";
    }
}
