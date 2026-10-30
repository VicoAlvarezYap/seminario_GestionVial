<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class HistorialDeLicencias extends Model
{
    protected $table = 'historial_licencias';
    public $timestamps = false; 
    protected $fillable = [
        'agente_id',
        'tipo_licencia',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'pendiente',
        'observaciones'
    ];
    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
        ];
    }
    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }

}