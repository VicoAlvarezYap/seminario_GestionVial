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

    public function scopeVisiblesPara($q, $usuario)
    {
        if ($usuario->hasAnyRole(['Administrador', 'Supervisor'])) {
            return $q;
        }

        return $usuario->agente_id
            ? $q->where('agente_id', $usuario->agente_id)
            : $q->whereRaw('1 = 0');
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

    public function inicioProgramado(): CarbonInterface
    {
        return $this->fecha->copy()->setTimeFromTimeString($this->horaInicioProg());
    }

    public function finProgramado(): CarbonInterface
    {
        $fin = $this->fecha->copy()->setTimeFromTimeString($this->horaFinProg());

        return $fin->lessThanOrEqualTo($this->inicioProgramado()) ? $fin->addDay() : $fin;
    }

    private function horaInicioProg(): string
    {
        return $this->hora_inicio_prog ?? config('turnos.horarios')[$this->turno][0] ?? '00:00';
    }

    private function horaFinProg(): string
    {
        return $this->hora_fin_prog ?? config('turnos.horarios')[$this->turno][1] ?? '23:59';
    }
    public function intervencionesDelTurno()
{
    if (! $this->inicio_real || ! $this->fin_real) {
        return Intervencion::query()->whereRaw('1 = 0');
    }

    return Intervencion::query()
        ->whereBetween('fecha_hora', [$this->inicio_real, $this->fin_real])
        ->where(function ($q) {
            $q->where('agente_reporta_id', $this->agente_id)
                ->orWhereHas('agentes', fn ($a) => $a->where('agentes.id', $this->agente_id));
        });
}
}