<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class HistorialLaboral extends Model{
protected $table ='historial_laboral';

protected $fillable=[
'agente_id',
'fecha_alta',
'fecha_baja',
'motivo_ingreso_egreso'
];

public function agente():BelongsTo{
    return $this ->belongsTo(Agente::class, agente_id);
}
}