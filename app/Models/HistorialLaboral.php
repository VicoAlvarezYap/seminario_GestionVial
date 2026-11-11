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
protected function casts(): array
    {
        return [
            'fecha_alta' => 'date',
            'fecha_baja' => 'date',
        ];
    }
public function agente():BelongsTo{
    return $this ->belongsTo(Agente::class, 'agente_id');
}
}