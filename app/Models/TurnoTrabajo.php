<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\ReportesTurno;
use Carbon\CarbonInterface;

class TurnoTrabajo extends Model
{
    protected $table = 'turnos_trabajo';
    public const HORARIOS = [
        'manana' => ['06:00', '14:00'],
        'tarde' => ['14:00', '22:00'],
        'noche' => ['22:00', '06:00'],   // cruza medianoche
        'especial' => ['00:00', '09:00'],  // sin horario fijo: ventana de todo el día
    ];

    protected $fillable = [
        'agente_id',
        'fecha',
        'turno',
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
        return $this->fecha->copy()->setTimeFromTimeString(self::HORARIOS[$this->turno][0]);
    }

    public function finProgramado(): CarbonInterface
    {
        $inicio = $this->inicioProgramado();
        $fin = $this->fecha->copy()->setTimeFromTimeString(self::HORARIOS[$this->turno][1]);

        return $fin->lessThanOrEqualTo($inicio) ? $fin->addDay() : $fin;
    }

    public function estadoCalculado(): string
    {
        return ($this->estado_turno === 'programado' && $this->inicio_real && !$this->fin_real)
            ? 'en_curso'
            : $this->estado_turno;
    }
}