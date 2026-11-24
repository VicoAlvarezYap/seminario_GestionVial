<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SolicitudReprogramacion;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SolicitudReprogramacionAdminController extends Controller
{
    public function index(): Response
    {
        $con = ['agente:id,nombre,apellido', 'turno', 'resueltaPor:id,nombre,apellido'];

        $pendientes = SolicitudReprogramacion::with($con)
            ->where('estado', 'pendiente')
            ->orderBy('created_at')
            ->get()
            ->map(fn(SolicitudReprogramacion $s) => $this->formatear($s))
            ->values()
            ->all();

        $recientes = SolicitudReprogramacion::with($con)
            ->where('estado', '!=', 'pendiente')
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(fn(SolicitudReprogramacion $s) => $this->formatear($s))
            ->values()
            ->all();

        return Inertia::render('Admin/Reprogramaciones', [
            'pendientes' => $pendientes,
            'recientes' => $recientes,
        ]);
    }

    public function resolver(Request $request, SolicitudReprogramacion $solicitud): RedirectResponse
    {
        $datos = $request->validate([
            'estado' => ['required', Rule::in(['aprobada', 'rechazada'])],
            'comentario_resolucion' => ['required_if:estado,rechazada', 'nullable', 'string', 'max:500'],
        ], [
            'comentario_resolucion.required_if' => 'Contale al agente por qué se rechaza.',
        ]);

        $aviso = null;

        DB::transaction(function () use ($solicitud, $datos, $request, &$aviso) {
            $s = SolicitudReprogramacion::lockForUpdate()->findOrFail($solicitud->id);

            if ($s->estado !== 'pendiente') {
                throw ValidationException::withMessages([
                    'estado' => 'Esa solicitud ya fue resuelta o la canceló el agente.',
                ]);
            }

            if ($datos['estado'] === 'aprobada') {
                $aviso = $this->aplicar($s);
            }

            $s->update([
                'estado' => $datos['estado'],
                'comentario_resolucion' => $datos['comentario_resolucion'] ?? null,
                'resuelta_por' => $request->user()->agente_id,
                'resuelta_at' => now(),
            ]);
        });

        return back()->with(
            'success',
            $datos['estado'] === 'aprobada' ? ('Solicitud aprobada.' . ($aviso ? " {$aviso}" : '')) : 'Solicitud rechazada.',
        );
    }

    /** Aplica el cambio sobre el turno. Devuelve un aviso si hubo efectos que el admin debe conocer. */
    private function aplicar(SolicitudReprogramacion $s): ?string
    {
        $turno = TurnoTrabajo::lockForUpdate()->findOrFail($s->turno_trabajo_id);

        if (!$turno->estaProgramado() || $turno->fichajes()->exists()) {
            throw ValidationException::withMessages([
                'estado' => 'No se puede aprobar: el turno ya no está programado o tiene fichajes.',
            ]);
        }

        if ($s->tipo === 'tomar_dia') {
            $turno->estado_turno = 'cancelado';
            $turno->save();

            return $turno->tareas()->exists()
                ? 'El turno quedó cancelado; sus tareas siguen cargadas, reasignalas si hace falta.'
                : null;
        }

        // cambio_horario
        if ($turno->tareas()->whereHas('intervenciones')->exists()) {
            throw ValidationException::withMessages([
                'estado' => 'No se puede aprobar: el turno tiene tareas con intervenciones registradas.',
            ]);
        }

        if ($s->nuevo_turno === 'especial') {
            $inicio = substr((string) $s->nueva_hora_inicio, 0, 5);
            $fin = substr((string) $s->nueva_hora_fin, 0, 5);
        } else {
            $horario = config("turnos.horarios.{$s->nuevo_turno}");
            abort_unless(is_array($horario) && count($horario) >= 2, 500, 'Horario de turno no configurado.');
            [$inicio, $fin] = $horario;
        }

        $tuvoTareas = $turno->tareas()->exists();
        if ($tuvoTareas) {
            // Las tareas dependían del horario anterior (igual que al editar un turno)
            $turno->tareas()->delete();
        }

        $turno->update([
            'turno' => $s->nuevo_turno,
            'hora_inicio_prog' => $inicio,
            'hora_fin_prog' => $fin,
        ]);

        return $tuvoTareas ? 'Se eliminaron las tareas del turno: asignalas de nuevo.' : null;
    }

    private function formatear(SolicitudReprogramacion $s): array
    {
        $t = $s->turno;

        return [
            'id' => $s->id,
            'tipo' => $s->tipo,
            'estado' => $s->estado,
            'motivo' => $s->motivo,
            'agente' => "{$s->agente->apellido}, {$s->agente->nombre}",
            'fecha' => Carbon::parse($t->fecha)->toDateString(),
            'turno_actual' => $t->turno,
            'horario_actual' => $this->horario($t->turno, $t->hora_inicio_prog, $t->hora_fin_prog),
            'nuevo_turno' => $s->nuevo_turno,
            'horario_nuevo' => $s->nuevo_turno
                ? $this->horario($s->nuevo_turno, $s->nueva_hora_inicio, $s->nueva_hora_fin)
                : null,
            'creada' => $s->created_at->format('d/m/Y H:i'),
            'resuelta_por' => $s->resueltaPor ? "{$s->resueltaPor->apellido}, {$s->resueltaPor->nombre}" : null,
            'resuelta_at' => $s->resuelta_at?->format('d/m/Y H:i'),
            'comentario_resolucion' => $s->comentario_resolucion,
        ];
    }

    private function horario(string $turno, ?string $inicio, ?string $fin): string
    {
        $cfg = config("turnos.horarios.{$turno}") ?? [];
        $ini = $inicio ? substr($inicio, 0, 5) : ($cfg[0] ?? null);
        $fi = $fin ? substr($fin, 0, 5) : ($cfg[1] ?? null);

        return $ini && $fi ? "{$ini} a {$fi}" : '';
    }
}