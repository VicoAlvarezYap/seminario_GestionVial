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
    protected static function booted(): void
    {
        // Al crear, copia el horario del turno (el especial lo define quien lo asigna)
        static::creating(function (TurnoTrabajo $t) {
            if ($t->turno === 'especial') {
                if (!$t->hora_inicio_prog || !$t->hora_fin_prog) {
                    throw new \InvalidArgumentException('El turno especial necesita hora de inicio y de fin.');
                }
                return;
            }

            [$ini, $fin] = config('turnos.horarios')[$t->turno];
            $t->hora_inicio_prog ??= $ini;
            $t->hora_fin_prog ??= $fin;
        });
    }
    public function minutosTrabajados(): int
    {
        if (!$this->inicio_real) {
            return 0;
        }

        $hasta = $this->fin_real ?? now();

        return max(0, intdiv($hasta->timestamp - $this->inicio_real->timestamp, 60));
    }

    public function minutosAtraso(): int
    {
        if (!$this->inicio_real) {
            return 0;
        }

        $d = intdiv($this->inicio_real->timestamp - $this->inicioProgramado()->timestamp, 60);

        return $d > config('turnos.tolerancia_min') ? $d : 0;
    }
    public function minutosExtra(): int
    {
        $hasta = $this->fin_real ?? ($this->inicio_real ? now() : null);

        if (!$hasta) {
            return 0;
        }

        $d = intdiv($hasta->timestamp - $this->finProgramado()->timestamp, 60);

        return $d > config('turnos.tolerancia_min') ? $d : 0;
    }
    public function cumplimiento(): string
    {
        if (!$this->inicio_real) {
            return 'sin_iniciar';
        }
        if (!$this->fin_real) {
            return $this->minutosExtra() > 0 ? 'en_curso_extendido' : 'en_curso';
        }
        if ($this->minutosExtra() > 0) {
            return 'extendido';
        }
        // Salió antes de tiempo (más allá de la tolerancia)
        if ($this->fin_real->lt($this->finProgramado()->subMinutes(config('turnos.tolerancia_min')))) {
            return 'salida_anticipada';
        }

        return 'en_horario';
    }


}