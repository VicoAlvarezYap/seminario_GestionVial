<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\ReportesTurno;
use Carbon\CarbonInterface;
use App\Models\Intervencion;

class TurnoTrabajo extends Model
{
    protected $table = 'turnos_trabajo';
    public const TURNOS = ['manana', 'tarde', 'noche', 'especial'];

    protected $fillable = [
        'agente_id',
        'fecha',
        'turno',
        'hora_inicio_prog',
        'hora_fin_prog',
        'estado_turno',
        'asignacion_id',
        'inicio_real',
        'fin_real',
    ];
    protected $casts = [
        'fecha' => 'date',
        'inicio_real' => 'datetime',
        'fin_real' => 'datetime',
    ];

    public function reporte(): HasOne
    {
        return $this->hasOne(ReportesTurno::class);
    }
    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class);
    }

    public function tareas(): HasMany
    {
        return $this->hasMany(Tarea::class)->orderByRaw('hora_inicio is null, hora_inicio');
    }



    /** Admin y Supervisor ven todo; el resto solo sus turnos. */
    public function scopeVisiblesPara($q, $usuario)
    {
        if ($usuario->hasAnyRole(['Administrador', 'Supervisor'])) {
            return $q;
        }

        return $usuario->agente_id
            ? $q->where('agente_id', $usuario->agente_id)
            : $q->whereRaw('1 = 0');
    }

    public function inicioProgramado(): CarbonInterface
    {
        return $this->fecha->copy()->setTimeFromTimeString($this->hora_inicio_prog);
    }

    public function finProgramado(): CarbonInterface
    {
        $fin = $this->fecha->copy()->setTimeFromTimeString($this->hora_fin_prog);

        return $fin->lessThanOrEqualTo($this->inicioProgramado()) ? $fin->addDay() : $fin;
    }

    public function estadoCalculado(): string
    {
        return ($this->estado_turno === 'programado' && $this->inicio_real && !$this->fin_real)
            ? 'en_curso'
            : $this->estado_turno;
    }
}