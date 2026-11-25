<?php

namespace App\Http\Controllers;

use App\Models\EventoOperativo;
use App\Models\Fichaje;
use App\Models\HistorialDeLicencias;
use App\Models\ReportesTurno;
use App\Models\SolicitudReprogramacion;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaginaAgenteController extends Controller
{
    private const TOLERANCIA_MIN = 10;
    private const ANTICIPO_INICIO_MIN = 10;
    private const EXIGE_FOTO = true;
    private const EXIGE_UBICACION = true;

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $modo = $request->session()->get('modo', $usuario->agente_id ? 'agente' : 'admin');

        if ($modo === 'admin') {
            abort_unless($usuario->hasRole('Administrador'), 403);

            return Inertia::render('Inicio/Admin', $this->datosAdmin($usuario));
        }

        abort_unless($usuario->agente_id, 403, 'Tu cuenta no está vinculada a un agente.');

        return Inertia::render('Inicio/Agente', $this->datosAgente($usuario));
    }

    private function datosAgente($usuario): array
    {
        $agenteId = $usuario->agente_id;
        $hoy = now()->toDateString();

        return [
            'agente' => [
                'nombre' => $usuario->agente->nombre,
                'apellido' => $usuario->agente->apellido,
            ],
            'turnoHoy' => $this->turnoHoy($agenteId, $hoy),
            'turnosSemana' => $this->turnosSemana($agenteId, $hoy),
            'novedades' => $this->novedades($agenteId),
            'eventosMes' => $this->eventosDelMes(),
        ];
    }

    private function datosAdmin($usuario): array
    {
        $hoy = now()->toDateString();

        return [
            'nombre' => $usuario->name,
            'urgente' => $this->urgentes(),
            'licenciasPendientes' => $this->licenciasPendientes(),
            'turnosNoRealizados' => $this->turnosNoRealizados($hoy),
            'eventosMes' => $this->eventosDelMes(),
            'reprogramacionesPendientes' => $this->reprogramacionesPendientes(),
        ];
    }

    /** Turno de hoy (o turno en curso), con horario y tareas. Null si no tiene turno. */
    private function turnoHoy(int $agenteId, string $hoy): ?array
    {
        $base = TurnoTrabajo::with(['tareas', 'entrada'])->where('agente_id', $agenteId);

        // Un turno en curso tiene prioridad aunque su fecha sea de ayer
        $turno = (clone $base)->where('estado_turno', 'en_curso')->latest('fecha')->first()
            ?? (clone $base)->whereDate('fecha', $hoy)->first();

        if (! $turno) {
            return null;
        }

        $habilitaDesde = $turno->inicioProgramado()->copy()->subMinutes(self::ANTICIPO_INICIO_MIN);

        return [
            'id' => $turno->id,
            'turno' => $turno->turno,
            'estado' => $turno->estado_turno,
            'hora_inicio' => $turno->hora_inicio_prog ? substr($turno->hora_inicio_prog, 0, 5) : null,
            'hora_fin' => $turno->hora_fin_prog ? substr($turno->hora_fin_prog, 0, 5) : null,
            'hora_entrada' => $turno->inicio_real?->format('H:i'),
            'horario_cumplido' => now()->gte($turno->finProgramado()->copy()->subMinutes(self::TOLERANCIA_MIN)),
            'hora_fin_iso' => $turno->finProgramado()->toIso8601String(),
            'ahora' => now()->toIso8601String(),
            'tolerancia_min' => self::TOLERANCIA_MIN,
            'tareas' => $turno->tareas->map(fn ($t) => [
                'titulo' => $t->titulo_final,
                'lugar' => $t->lugar_final?->nombre,
            ])->values()->all(),
            'puede_fichar' => $turno->estaProgramado() && $turno->inicio_real === null,
            'inicio_habilitado_iso' => $habilitaDesde->toIso8601String(),
            'inicio_habilitado_desde' => $habilitaDesde->format('H:i'),
        ];
    }

    /** Turnos de la semana actual (lunes a domingo), solo los propios. */
    private function turnosSemana(int $agenteId, string $hoy): array
    {
        return TurnoTrabajo::where('agente_id', $agenteId)
            ->whereBetween('fecha', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()])
            ->orderBy('fecha')
            ->get()
            ->map(fn (TurnoTrabajo $t) => [
                'id' => $t->id,
                'fecha' => $t->fecha->toDateString(),
                'turno' => $t->turno,
                'estado' => $t->estado_turno,
                'es_hoy' => $t->fecha->toDateString() === $hoy,
                'puede_reprogramar' => $t->puedeReprogramar(),
                'solicitud' => $t->ultimaSolicitud && in_array($t->ultimaSolicitud->estado, ['pendiente', 'rechazada'], true)
                    ? [
                        'id' => $t->ultimaSolicitud->id,
                        'tipo' => $t->ultimaSolicitud->tipo,
                        'estado' => $t->ultimaSolicitud->estado,
                        'comentario' => $t->ultimaSolicitud->comentario_resolucion,
                    ]
                    : null,
            ])
            ->values()
            ->all();
    }

    /** Últimas licencias del agente con su estado. */
    private function novedades(int $agenteId): array
    {
        return HistorialDeLicencias::where('agente_id', $agenteId)
            ->orderByDesc('id')
            ->limit(3)
            ->get()
            ->map(fn (HistorialDeLicencias $l) => [
                'id' => $l->id,
                'tipo' => $l->tipo_licencia,
                'desde' => $l->fecha_inicio->format('d/m/Y'),
                'hasta' => $l->fecha_fin->format('d/m/Y'),
                'estado' => $l->estado,
            ])
            ->values()
            ->all();
    }

    /** Eventos del mes en curso (todos). */
    private function eventosDelMes(): array
    {
        return EventoOperativo::whereBetween('fecha_hora_inicio', [now()->startOfMonth(), now()->endOfMonth()])
            ->where('estado', '!=', 'cancelado')
            ->orderBy('fecha_hora_inicio')
            ->limit(5)
            ->get(['id', 'titulo', 'fecha_hora_inicio', 'estado'])
            ->map(fn (EventoOperativo $e) => [
                'id' => $e->id,
                'titulo' => $e->titulo,
                'fecha' => $e->fecha_hora_inicio->format('d/m/Y H:i'),
                'estado' => $e->estado,
            ])
            ->values()
            ->all();
    }

    /** Justificantes y reprogramaciones que requieren atención. */
    private function urgentes(): array
    {
        $justificantes = HistorialDeLicencias::where('estado', 'pendiente')
            ->whereNotNull('justificante_path')
            ->count();

        $reprogramaciones = SolicitudReprogramacion::where('estado', 'pendiente')->count();

        return [
            'justificantes_pendientes' => $justificantes,
            'reprogramaciones_pendientes' => $reprogramaciones,
            'total' => $justificantes + $reprogramaciones,
        ];
    }

    /** Solicitudes de reprogramación sin resolver, las más antiguas primero. */
    private function reprogramacionesPendientes(): array
    {
        return SolicitudReprogramacion::with(['agente:id,nombre,apellido', 'turno:id,fecha,turno'])
            ->where('estado', 'pendiente')
            ->orderBy('created_at')
            ->limit(5)
            ->get()
            ->map(fn (SolicitudReprogramacion $s) => [
                'id' => $s->id,
                'agente' => "{$s->agente->apellido}, {$s->agente->nombre}",
                'tipo' => $s->tipo,
                'fecha' => $s->turno->fecha->format('d/m/Y'),
                'turno' => $s->turno->turno,
                'nuevo_turno' => $s->nuevo_turno,
            ])
            ->values()
            ->all();
    }

    /** Licencias pendientes de resolver, las más recientes primero. */
    private function licenciasPendientes(): array
    {
        return HistorialDeLicencias::with('agente:id,nombre,apellido')
            ->where('estado', 'pendiente')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (HistorialDeLicencias $l) => [
                'id' => $l->id,
                'agente' => "{$l->agente->apellido}, {$l->agente->nombre}",
                'tipo' => $l->tipo_licencia,
                'desde' => $l->fecha_inicio->format('d/m/Y'),
                'hasta' => $l->fecha_fin->format('d/m/Y'),
            ])
            ->values()
            ->all();
    }

    /** Turnos de días pasados que siguen en "programado" (no se cerraron). */
    private function turnosNoRealizados(string $hoy): array
    {
        return TurnoTrabajo::with('agente:id,nombre,apellido')
            ->where('estado_turno', 'programado')
            ->whereDate('fecha', '<', $hoy)
            ->whereDoesntHave('fichajes', fn ($q) => $q->entradas())
            ->orderByDesc('fecha')
            ->limit(5)
            ->get()
            ->map(fn (TurnoTrabajo $t) => [
                'id' => $t->id,
                'agente' => "{$t->agente->apellido}, {$t->agente->nombre}",
                'turno' => $t->turno,
                'fecha' => $t->fecha->format('d/m/Y'),
            ])
            ->values()
            ->all();
    }

    private function minutosTrabajados(TurnoTrabajo $turno): int
    {
        return $turno->inicio_real ? (int) $turno->inicio_real->diffInMinutes(now()) : 0;
    }

    public function iniciar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        abort_unless($request->user()->agente?->estaActivo(), 403, 'Tu cuenta de agente está dada de baja.');
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId && $turno->agente_id === $agenteId, 403);

        if (now()->lt($turno->inicioProgramado()->copy()->subMinutes(self::ANTICIPO_INICIO_MIN))) {
            return back()->with(
                'error',
                'Todavía no podés iniciar el turno. Se habilita '.self::ANTICIPO_INICIO_MIN.' minutos antes del horario.'
            );
        }

        if (! $turno->fecha->isToday()) {
            return back()->with('error', 'Solo podés iniciar el turno el día que te corresponde.');
        }

        if (! $turno->estaProgramado()) {
            return back()->with('warning', 'Este turno ya no se puede iniciar.');
        }

        $datos = $request->validate($this->reglasCaptura());

        $creado = false;

        DB::transaction(function () use ($turno, $datos, $request, $agenteId, &$creado) {
            $fichaje = Fichaje::firstOrCreate(
                ['turno_trabajo_id' => $turno->id, 'tipo' => Fichaje::TIPO_ENTRADA],
                [
                    'registrada_at' => now(),
                    'origen' => Fichaje::ORIGEN_WEB,
                    'ip' => $request->ip(),
                    'registrada_por' => $agenteId,
                ] + $this->camposCaptura($request, $datos, $turno->id)
            );

            if ($fichaje->wasRecentlyCreated) {
                $turno->update(['estado_turno' => 'en_curso']);
                $creado = true;
            }
        });

        return $creado
            ? back()->with('success', 'Turno iniciado correctamente.')
            : back()->with('warning', 'Ya iniciaste este turno.');
    }

    public function finalizar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        abort_unless($request->user()->agente?->estaActivo(), 403, 'Tu cuenta de agente está dada de baja.');
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId && $turno->agente_id === $agenteId, 403);

        $datos = $request->validate([
            'vehiculo_oficial' => ['required', 'boolean'],
            'placa' => [Rule::requiredIf(fn () => $request->boolean('vehiculo_oficial')), 'nullable', 'string', 'max:15'],
            'radio' => ['required', 'boolean'],
            'novedades' => ['nullable', 'string', 'max:5000'],
            'otros_equipos' => ['nullable', 'string', 'max:255'],
        ] + $this->reglasCaptura());

        $fin = $turno->finProgramado();

        if (now()->lt($fin->copy()->subMinutes(self::TOLERANCIA_MIN))) {
            return back()->with('error', 'Todavía no terminó tu horario. Si no podés completarlo, usá "Abandonar turno".');
        }

        $cerrado = DB::transaction(function () use ($turno, $datos, $request, $agenteId, $fin) {
            $t = TurnoTrabajo::lockForUpdate()->find($turno->id);

            if (! $t->estaEnCurso()) {
                return false;
            }

            Fichaje::create([
                'turno_trabajo_id' => $t->id,
                'tipo' => Fichaje::TIPO_SALIDA,
                'registrada_at' => now(),
                'origen' => Fichaje::ORIGEN_WEB,
                'ip' => $request->ip(),
                'registrada_por' => $agenteId,
            ] + $this->camposCaptura($request, $datos, $t->id));

            ReportesTurno::create([
                'turno_trabajo_id' => $t->id,
                'vehiculo_oficial' => $datos['vehiculo_oficial'],
                'placa' => $datos['vehiculo_oficial'] ? ($datos['placa'] ?? null) : null,
                'radio' => $datos['radio'],
                'novedades' => $datos['novedades'] ?? null,
                'otros_equipos' => $datos['otros_equipos'] ?? null,
            ]);

            $t->update([
                'estado_turno' => 'cumplido',
                'minutos_trabajados' => $this->minutosTrabajados($t),
                'minutos_extra' => now()->gt($fin) ? (int) $fin->diffInMinutes(now()) : 0,
            ]);

            return true;
        });

        return $cerrado
            ? back()->with('success', 'Turno finalizado. Reporte guardado.')
            : back()->with('warning', 'Este turno ya no está en curso.');
    }

    public function abandonar(Request $request, TurnoTrabajo $turno): RedirectResponse
    {
        abort_unless($request->user()->agente?->estaActivo(), 403, 'Tu cuenta de agente está dada de baja.');
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId && $turno->agente_id === $agenteId, 403);

        $datos = $request->validate([
            'motivo_salida' => ['required', 'string', 'min:5', 'max:1000'],
        ] + $this->reglasCaptura());

        $fin = $turno->finProgramado();

        if (now()->gte($fin->copy()->subMinutes(self::TOLERANCIA_MIN))) {
            return back()->with('error', 'Tu horario ya terminó: cerrá el turno con el reporte.');
        }

        $cerrado = DB::transaction(function () use ($turno, $datos, $request, $agenteId, $fin) {
            $t = TurnoTrabajo::lockForUpdate()->find($turno->id);

            if (! $t->estaEnCurso()) {
                return false;
            }

            Fichaje::create([
                'turno_trabajo_id' => $t->id,
                'tipo' => Fichaje::TIPO_SALIDA_ANTICIPADA,
                'registrada_at' => now(),
                'origen' => Fichaje::ORIGEN_WEB,
                'ip' => $request->ip(),
                'registrada_por' => $agenteId,
                'motivo_salida' => $datos['motivo_salida'],
                'estado_revision' => Fichaje::REVISION_PENDIENTE,
            ] + $this->camposCaptura($request, $datos, $t->id));

            $t->update([
                'estado_turno' => 'abandonado',
                'minutos_trabajados' => $this->minutosTrabajados($t),
                'minutos_salida_anticipada' => (int) now()->diffInMinutes($fin),
            ]);

            return true;
        });

        return $cerrado
            ? back()->with('warning', 'Turno cerrado por abandono. Quedó pendiente de revisión.')
            : back()->with('warning', 'Este turno ya no está en curso.');
    }

    public function cambiarModo(Request $request): RedirectResponse
    {
        $usuario = $request->user();
        abort_unless($usuario->agente_id && $usuario->hasRole('Administrador'), 403);

        $modo = $request->input('modo') === 'admin' ? 'admin' : 'agente';
        $request->session()->put('modo', $modo);

        return redirect('/pagina_principal');
    }

    private function reglasCaptura(): array
    {
        return [
            'latitud' => [Rule::requiredIf(self::EXIGE_UBICACION), 'nullable', 'numeric', 'between:-90,90'],
            'longitud' => [Rule::requiredIf(self::EXIGE_UBICACION), 'nullable', 'numeric', 'between:-180,180'],
            'precision_m' => ['nullable', 'integer', 'min:0'],
            'foto' => [Rule::requiredIf(self::EXIGE_FOTO), 'nullable', 'image', 'max:5120'],
        ];
    }

    /** Campos de ubicación y foto del fichaje. La foto se guarda en el disco privado. */
    private function camposCaptura(Request $request, array $datos, int $turnoId): array
    {
        $ruta = $request->file('foto')?->store("fichajes/{$turnoId}", 'local');

        return [
            'latitud' => $datos['latitud'] ?? null,
            'longitud' => $datos['longitud'] ?? null,
            'precision_m' => $datos['precision_m'] ?? null,
            'foto_path' => $ruta,
        ];
    }
}