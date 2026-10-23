<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class IntervencionesDeEmergencias extends Model{
protected $table='intervenciones_emergencias';
protected $fillable=[
    
'tipo_evento',
'nivel_urgencia',
'ubicacion_direccion',
'descripcion_situacion',
'estado_resolucion',
'reportada',
'agente_reporta_id',
'fecha_hora_reporte'

];
public function agente():BelongsTo{
    return $this->belongsTo(Agente::class,agente_id);
}
protected function casts(): array{
    return [
    'fecha_hora_reporte' => 'datetime',
    ];
 }
 //no se si va esto(?
    public function agentes(): BelongsToMany
    {
        return $this->belongsToMany(
            Agente::class,
            'intervencion_agentes',
            'intervencion_id',
            'agente_id'
        )->withPivot('rol_en_intervencion');
    }
public function participaciones(): HasMany{
   return $this->hasMany(IntervencionDeAgente::class, 'intervencion_id');
}
}