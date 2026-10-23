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

   
    public function usuario(): HasOne
    {
        return $this->hasOne(User::class, 'agente_id');
    }

    public function contactosEmergencia(): HasMany
    {
        return $this->hasMany(ContactoEmergencia::class, 'agente_id');
    }

   
     
      public function historialLaboral(): HasMany
      {
          return $this->hasMany(HistorialLaboral::class, 'agente_id');
      }
     

     
      public function observacionesMedicas(): HasMany
      {
          return $this->hasMany(ObservacionesMedicas::class, 'agente_id');
      }
 

    /** "Apellido, Nombre" para listados y selects. */
    public function getNombreCompletoAttribute(): string
    {
        return "{$this->apellido}, {$this->nombre}";
    }
      public function licencias(): HasMany
      {
          return $this->hasMany(HistorialLicencia::class, 'agente_id');
      }
public function relevos():HasMany {
    return $this->hasMany(Relevo::class, 'agente_id');
}
public function intervencion_emergencia() :HasMany{
    return $this->hasMany(Relevo::class, 'agente_id');
}

public function intervencionesReportadas(): HasMany
{
    return $this->hasMany(IntervencionesDeEmergencias::class, 'agente_reporta_id');
}

public function intervenciones(): BelongsToMany
{
    return $this->belongsToMany(
        IntervencionesDeEmergencias::class,
        'intervencion_agentes',
        'agente_id',
        'intervencion_id'
    )->withPivot('rol_en_intervencion');
}
    }


