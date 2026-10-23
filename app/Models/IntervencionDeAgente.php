<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class intervencionDeAgente extends model{
protected $table='intervencion_agentes';
protected $fillable=[
    
  'intervencion_id',
  'agente_id',
  'rol_en_intervencion'  

];
public function intervencion_emergencia():BelongsTo{
  return $this->belongsTo(InterVEncionesDeEmergencia::class,'intervencion_id');
}
    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }
}