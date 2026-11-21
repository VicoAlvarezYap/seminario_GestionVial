<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoLicencia extends Model
{
    protected $table = 'tipos_licencia';

    protected $fillable = ['nombre', 'requiere_justificante', 'requiere_declaracion_jurada', 'activo'];

    protected function casts(): array
    {
        return [
            'requiere_justificante' => 'boolean',
            'requiere_declaracion_jurada' => 'boolean',
            'activo' => 'boolean',
        ];
    }
}