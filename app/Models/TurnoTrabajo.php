<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use InvalidArgumentException;

class TurnoTrabajo extends Model
{
    protected $table = 'turnos_trabajo';

    public const TURNOS = ['manana', 'tarde', 'noche', 'especial'];
    public const ESTADOS = ['programado', 'cumplido', 'ausente', 'cancelado', 'reasignado', 'abandonado'];

    protected $fillable = [
        'agente_id',
        'fecha',
        'turno',
        'estado_turno',
        'asignacion_id',
        'hora_inicio_prog',
        'hora_fin_prog',
        'minutos_trabajados',
        'minutos_extra',
        'minutos_tarde',
        'minutos_salida_anticipada',
    ];

    protected $casts = [
        'fecha'                     => 'date',
        'minutos_trabajados'        => 'integer',
        'minutos_extra'             => 'integer',
        'minutos_tarde'             => 'integer',
        'minutos_salida_anticipada' => 'integer',
    ];

    protected static function booted(): void
    {
        // Al crear, copia el horario del turno (el especial lo define quien lo asigna)
        static::creating(function (TurnoTrabajo $t) {
            if (! in_array($t->turno, self::TURNOS, true)) {
                throw new InvalidArgumentException("Turno inválido: {$t->turno}");
            }

            if ($t->turno === 'especial') {
                if (! $t->hora_inicio_prog || ! $t->hora_fin_prog) {
                    throw new InvalidArgumentException('El turno especial necesita hora de inicio y de fin.');
                }
                return;
            }

            $horario = config("turnos.horarios.{$t->turno}");

            if (! is_array($horario) || count($horario) < 2) {
                throw new InvalidArgumentException("No hay horario configurado para el turno {$t->turno}.");
            }

            [$ini, $fin] = $horario;
            $t->hora_inicio_prog ??= $ini;
            $t->hora_fin_prog ??= $fin;
        });
    }

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class);
    }

    public function reporte(): HasOne
    {
        return $this->hasOne(ReportesTurno::class);
    }

    public function tareas(): HasMany
    {
        return $this->hasMany(Tarea::class)->orderByRaw('hora_inicio is null, hora_inicio');
    }

    public function fichajes(): HasMany
    {
        return $this->hasMany(Fichaje::class, 'turno_trabajo_id');
    }

    public function entrada(): HasOne
    {
        return $this->hasOne(Fichaje::class, 'turno_trabajo_id')
            ->where('tipo', Fichaje::TIPO_ENTRADA)
            ->oldestOfMany('registrada_at');
    }

    public function salida(): HasOne
    {
        return $this->hasOne(Fichaje::class, 'turno_trabajo_id')
            ->whereIn('tipo', [Fichaje::TIPO_SALIDA, Fichaje::TIPO_SALIDA_ANTICIPADA])
            ->latestOfMany('registrada_at');
    }
    protected function inicioReal(): Attribute
    {
        return Attribute::get(fn () => $this->entrada?->registrada_at);
    }

    /** Fin real = hora del último fichaje de salida. */
    protected function finReal(): Attribute
    {
        return Attribute::get(fn () => $this->salida?->registrada_at);
    }

  
    public function scopeDeAgente(Builder $query, int $agenteId): Builder
{
        return $query->where('agente_id', $agenteId);
    }

    public function scopeDeFecha(Builder $query, $fecha): Builder
    {
        return $query->whereDate('fecha', $fecha);
    }

    public function scopeEntreFechas(Builder $query, $desde, $hasta): Builder
    {
        return $query->whereBetween('fecha', [$desde, $hasta]);
    }

    public function scopeDelTurno(Builder $query, string $turno): Builder
    {
        return $query->where('turno', $turno);
    }

    public function scopeConEstado(Builder $query, string $estado): Builder
    {
        return $query->where('estado_turno', $estado);
    }

    public function scopeProgramados(Builder $query): Builder
    {
        return $query->where('estado_turno', 'programado');
    }

    public function scopeConLlegadaTarde(Builder $query): Builder
    {
        return $query->where('minutos_tarde', '>', 0);
    }

    public function scopeVisiblesPara(Builder $query, $usuario): Builder
    {
        if ($usuario->hasAnyRole(['Administrador', 'Supervisor'])) {
            return $query;
        }

        return $usuario->agente_id
            ? $query->where('agente_id', $usuario->agente_id)
            : $query->whereRaw('1 = 0');
    }
    public function estaProgramado(): bool
    {
        return $this->estado_turno === 'programado';
    }

    public function estaCumplido(): bool
    {
        return $this->estado_turno === 'cumplido';
    }

    public function estaCerrado(): bool
    {
        return $this->estado_turno !== 'programado';
    }

    public function estadoCalculado(): string
    {
        return ($this->estaProgramado() && $this->inicio_real && ! $this->fin_real)
            ? 'en_curso'
            : $this->estado_turno;
    }

    public function tuvoLlegadaTarde(): bool
    {
        return $this->minutos_tarde > 0;
    }

    public function tuvoSalidaAnticipada(): bool
    {
        return $this->minutos_salida_anticipada > 0;
    }

    public function inicioProgramado(): CarbonInterface
    {
        return $this->fecha->copy()->setTimeFromTimeString($this->horaInicioProg());
    }

    public function finProgramado(): CarbonInterface
    {
        $fin = $this->fecha->copy()->setTimeFromTimeString($this->horaFinProg());

        // Turno que cruza la medianoche
        return $fin->lessThanOrEqualTo($this->inicioProgramado()) ? $fin->addDay() : $fin;
    }

    private function horaInicioProg(): string
    {
        return $this->hora_inicio_prog ?? config("turnos.horarios.{$this->turno}.0", '00:00');
    }

    private function horaFinProg(): string
    {
        return $this->hora_fin_prog ?? config("turnos.horarios.{$this->turno}.1", '23:59');
    }
    public function intervencionesDelTurno(): Builder
    {
        $desde = $this->inicio_real ?? $this->inicioProgramado();
        $hasta = $this->fin_real ?? $this->finProgramado();

        return Intervencion::query()
            ->where('estado_resolucion', '!=', 'cancelada')
            ->where(function (Builder $q) use ($desde, $hasta) {
                $q->where(fn (Builder $q) => $q
                        ->whereHas('agentes', fn ($a) => $a->where('agentes.id', $this->agente_id))
                        ->whereBetween('fecha_hora', [$desde, $hasta]))
                    ->orWhereHas('tarea', fn ($t) => $t->where('turno_trabajo_id', $this->id));
            });
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