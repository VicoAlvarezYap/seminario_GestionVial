<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntervencionDeAgente extends Model
{
    protected $table = 'intervencion_agentes';

    protected $fillable = [
        'intervencion_id',
        'agente_id',
        'rol_en_intervencion',
    ];

    public function intervencionEmergencia(): BelongsTo
    {
        return $this->belongsTo(IntervencionesDeEmergencias::class, 'intervencion_id');
    }

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'agente_id');
    }
}