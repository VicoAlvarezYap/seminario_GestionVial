<?php

namespace App\Http\Controllers;

use App\Models\Intervencion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionController extends Controller
{
    // Lo usa IntervencionAdminController
    public const TIPOS = [
        'Caída de árbol',
        'Anegamiento',
        'Accidente de tránsito',
        'Semáforo fuera de servicio',
        'Corte de energía',
        'Otros',
    ];

    private const TIPOS_AGENTE = ['accidente', 'infraccion', 'emergencia', 'otro'];

    private const TRANSICIONES = [
        'reportada' => ['en_curso', 'resuelta', 'derivada'],
        'en_curso' => ['resuelta', 'derivada'],
    ];

    /** Pantalla única: las intervenciones que registró el agente o en las que participa. */
    public function index(Request $request): Response
    {
        $agenteId = (int) $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        $intervenciones = Intervencion::with(['lugar:id,nombre', 'agentes:id,nombre,apellido'])
            ->where(function ($q) use ($agenteId) {
                $q->where('agente_reporta_id', $agenteId)
                    ->orWhereHas('agentes', fn ($a) => $a->where('agentes.id', $agenteId));
            })
            ->orderByDesc('fecha_hora')
            ->get()
            ->map(fn (Intervencion $i) => [
                'id' => $i->id,
                'fecha_hora' => $i->fecha_hora->format('d/m/Y H:i'),
                'evento' => $i->tipo_evento ?: ucfirst($i->tipo),
                'tipo' => $i->tipo,
                'tipo_evento' => $i->tipo_evento,
                'cantidad' => (int) $i->cantidad,
                'nivel_urgencia' => $i->nivel_urgencia,
                'ubicacion_direccion' => $i->ubicacion_direccion,
                'lugar' => $i->lugar?->nombre ?? $i->ubicacion_direccion ?? '-',
                'descripcion' => $i->descripcion,
                'estado_resolucion' => $i->estado_resolucion,
                'es_emergencia' => $i->tarea_id === null,
                'mi_rol' => $i->agentes->firstWhere('id', $agenteId)?->pivot?->rol_en_intervencion,
                'siguientes' => self::TRANSICIONES[$i->estado_resolucion] ?? [],
                'editable' => (int) $i->agente_reporta_id === $agenteId
                    && $i->estado_resolucion === 'reportada',
            ])
            ->values()
            ->all();

        return Inertia::render('Intervenciones/Asignadas', [
            'intervenciones' => $intervenciones,
            'tipos' => self::TIPOS_AGENTE,
        ]);
    }

    /** Registra una intervención nueva, de cualquier tipo. */
    public function registrar(Request $request): RedirectResponse
    {
        $agenteId = (int) $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        $v = $this->validarReporte($request);

        DB::transaction(function () use ($v, $agenteId) {
            $intervencion = Intervencion::create([
                'tipo' => $v['tipo'],
                'tipo_evento' => $v['tipo_evento'] ?? null,
                'cantidad' => $v['tipo'] === 'infraccion' ? ($v['cantidad'] ?? 1) : 1,
                'nivel_urgencia' => $v['nivel_urgencia'],
                'estado_resolucion' => 'reportada',
                'ubicacion_direccion' => $v['ubicacion_direccion'],
                'descripcion' => $v['descripcion'],
                'agente_reporta_id' => $agenteId,
                'fecha_hora' => now(),
            ]);

            $intervencion->agentes()->sync([
                $agenteId => ['rol_en_intervencion' => 'Reportante'],
            ]);
        });

        return back()->with('success', 'Intervención registrada correctamente.');
    }

    /** Solo el reportante, y solo mientras esté "reportada". */
    public function update(Request $request, Intervencion $intervencion): RedirectResponse
    {
        $this->autorizar($request, $intervencion);
        $v = $this->validarReporte($request);

        $intervencion->update([
            'tipo' => $v['tipo'],
            'tipo_evento' => $v['tipo_evento'] ?? null,
            'cantidad' => $v['tipo'] === 'infraccion' ? ($v['cantidad'] ?? 1) : 1,
            'nivel_urgencia' => $v['nivel_urgencia'],
            'ubicacion_direccion' => $v['ubicacion_direccion'],
            'descripcion' => $v['descripcion'],
        ]);

        return back()->with('success', 'Reporte actualizado correctamente.');
    }

    /** Solo el reportante, y solo mientras esté "reportada". */
    public function cancelar(Request $request, Intervencion $intervencion): RedirectResponse
    {
        $this->autorizar($request, $intervencion);

        $intervencion->update(['estado_resolucion' => 'cancelada']);

        return back()->with('success', 'Reporte cancelado.');
    }

    /** El agente informa cómo va (o cómo terminó) una intervención en la que participa. */
    public function informar(Request $request, Intervencion $intervencion): RedirectResponse
    {
        $agenteId = (int) $request->user()->agente_id;

        abort_unless(
            $agenteId && $this->participa($intervencion, $agenteId),
            403,
            'Esta intervención no te fue asignada.'
        );

        $validos = $request->validate([
            'estado_resolucion' => ['required', Rule::in(['en_curso', 'resuelta', 'derivada'])],
            'informe' => ['nullable', 'string', 'max:2000'],
        ]);

        $actual = $intervencion->estado_resolucion;

        abort_unless(
            in_array($validos['estado_resolucion'], self::TRANSICIONES[$actual] ?? [], true),
            403,
            'Ese cambio de estado no está permitido.'
        );

        $cambios = ['estado_resolucion' => $validos['estado_resolucion']];

        // La tabla tiene un solo campo de texto: el informe se agrega sin pisar lo que cargó el reportante
        if (! empty($validos['informe'])) {
            $nota = '['.now()->format('d/m/Y H:i').' - informe del agente] '.trim($validos['informe']);
            $cambios['descripcion'] = trim(($intervencion->descripcion ?? '')."\n\n".$nota);
        }

        // El where evita pisar un cambio hecho mientras tanto
        $filas = Intervencion::query()
            ->where('id', $intervencion->id)
            ->where('estado_resolucion', $actual)
            ->update($cambios);

        abort_if($filas === 0, 409, 'La intervención cambió mientras la editabas. Recargá la página.');

        return back()->with('success', 'Informe registrado.');
    }

    public function pdf(Request $request, Intervencion $intervencion)
    {
        $agenteId = (int) $request->user()->agente_id;

        abort_unless($agenteId && $this->participa($intervencion, $agenteId), 403);

        return app(\App\Http\Controllers\Admin\IntervencionAdminController::class)->pdf($intervencion);
    }

    private function validarReporte(Request $request): array
    {
        return $request->validate([
            'tipo' => ['required', Rule::in(self::TIPOS_AGENTE)],
            'tipo_evento' => ['nullable', 'string', 'max:100'],
            'cantidad' => ['nullable', 'integer', 'min:1', 'max:999'],
            'nivel_urgencia' => ['required', Rule::in(['baja', 'media', 'alta', 'critica'])],
            'ubicacion_direccion' => ['required', 'string', 'max:255'],
            'descripcion' => ['required', 'string', 'max:2000'],
        ]);
    }

    private function autorizar(Request $request, Intervencion $intervencion): void
    {
        $agenteId = (int) $request->user()->agente_id;

        abort_unless(
            $agenteId && (int) $intervencion->agente_reporta_id === $agenteId,
            403,
            'Solo el reportante puede modificar este reporte.'
        );

        abort_unless(
            $intervencion->estado_resolucion === 'reportada',
            403,
            'Solo se puede modificar un reporte recién reportado.'
        );
    }

    private function participa(Intervencion $intervencion, int $agenteId): bool
    {
        return (int) $intervencion->agente_reporta_id === $agenteId
            || $intervencion->agentes()->where('agentes.id', $agenteId)->exists();
    }
}