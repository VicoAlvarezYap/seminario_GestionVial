<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class ObservacionesMedicas extends Model
{
protected $table = 'observaciones_medicas';
public $timestamps = false;
protected $fillable=[
'agente_id',
'fecha_registro',
'descripcion',
'es_urgente'
];
    protected function casts(): array
    {
        return [
            'fecha_registro' => 'datetime',
            'es_urgente' => 'boolean',
        ];
    }
public function agente(): BelongsTo{
    return $this->belongsTo(Agente::class, 'agente_id ');
}
}