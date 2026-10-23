<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Relevos extends model
{
    protected $table = 'relevos';
    protected $fillable = [
        'tercero_nombre_apellido',
        'tercero_dni',
        'tercero_celular',
        'vehiculo_placa',
        'vehiculo_tipo',
        'motivo_detencion',
        'personas_implicadas',
        'necesito_atencion_policial',
        'agente_id',
        'fecha_hora'
    ];
    public function agente()
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }
    protected function casts(): array
    {
        return [
            'necesito_atencion_policial' => 'boolean',
            'fecha_hora' => 'datetime',
        ];
    }
}