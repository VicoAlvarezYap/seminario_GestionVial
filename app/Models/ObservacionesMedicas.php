<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ObservacionesMedicas extends Model
{
protected $table = 'observaciones_medicas';
protected $fillable=[
'agente_id',
'fecha_registro',
'descripcion',
'es_urgente'
];

public function agente(): BelongsTo{
    return $this->belongsTo(Agente::class, agente_id );
}
}
