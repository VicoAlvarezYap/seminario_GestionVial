<?php

namespace App\Http\Controllers;

use App\Http\Requests\EmergenciaRequest;
use App\Models\Intervencion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionController extends Controller
{
    public const OTROS = 'Otros';

    public const TIPOS = [
        'Caída de árbol',
        'Anegamiento',
        'Accidente de tránsito',
        'Semáforo fuera de servicio',
        'Corte de energía',
        self::OTROS,
    ];

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $agenteId = $usuario->agente_id;
        $veTodo = $usuario->hasAnyRole(['Administrador', 'Supervisor']);

        $intervenciones = Intervencion::emergencias()
            ->with(['lugar:id,nombre'])
            ->when(! $veTodo, fn ($q) => $agenteId
                ? $q->whereHas('agentes', fn ($a) => $a->where('agentes.id', $agenteId))
                : $q->whereRaw('1 = 0'))
            ->orderByDesc('fecha_hora')
            ->paginate(20)
            ->withQueryString()
            ->through(function (Intervencion $i) use ($agenteId, $veTodo) {
                $esReportante = $agenteId && $i->agente_reporta_id === $agenteId;
                $enTipos = in_array($i->tipo_evento, self::TIPOS, true);

                return [
                    'id'                    => $i->id,
                    'tipo_evento'           => $i->tipo_evento,
                    'tipo_seleccion'        => $enTipos ? $i->tipo_evento : self::OTROS,
                    'tipo_otros'            => $enTipos ? '' : (string) $i->tipo_evento,
                    'nivel_urgencia'        => $i->nivel_urgencia,
                    'ubicacion_direccion'   => $i->ubicacion_direccion ?? $i->lugar?->nombre ?? '',
                    'descripcion_situacion' => $i->descripcion,
                    'estado_resolucion'     => $i->estado_resolucion,
                    'fecha_hora'            => $i->fecha_hora->format('d/m/Y H:i'),
                    'es_reportante'         => (bool) $esReportante,
                    'editable'              => ($esReportante || $veTodo) && $i->estado_resolucion === 'reportada',
                ];
            });

        $agente = $usuario->agente;

        return Inertia::render('Intervenciones/index', [
            'intervenciones' => $intervenciones,
            'agente'         => $agente ? ['nombre' => $agente->nombre, 'apellido' => $agente->apellido] : null,
            'tipos'          => self::TIPOS,
        ]);
    }

    /** El agente reporta una emergencia: queda como reportante y participante. */
    public function store(EmergenciaRequest $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403);

        $d = $request->validated();

        DB::transaction(function () use ($d, $agenteId) {
            $intervencion = Intervencion::create([
                'tipo'                => 'emergencia',
                'tipo_evento'         => $this->tipoEvento($d),
                'nivel_urgencia'      => $d['nivel_urgencia'],
                'ubicacion_direccion' => $d['ubicacion_direccion'],
                'descripcion'         => $d['descripcion_situacion'] ?? null,
                'agente_reporta_id'   => $agenteId,
                'fecha_hora'          => now(),
            ]);

            $intervencion->agentes()->attach($agenteId, ['rol_en_intervencion' => 'Reportante']);
        });

        return back()->with('success', 'Emergencia reportada correctamente.');
    }

    public function update(EmergenciaRequest $request, Intervencion $intervencion): RedirectResponse
    {
        $this->autorizar($request, $intervencion);
        $d = $request->validated();

        $intervencion->update([
            'tipo_evento'         => $this->tipoEvento($d),
            'nivel_urgencia'      => $d['nivel_urgencia'],
            'ubicacion_direccion' => $d['ubicacion_direccion'],
            'descripcion'         => $d['descripcion_situacion'] ?? null,
        ]);

        return back()->with('success', 'Reporte actualizado correctamente.');
    }

    public function cancelar(Request $request, Intervencion $intervencion): RedirectResponse
    {
        $this->autorizar($request, $intervencion);
        $intervencion->update(['estado_resolucion' => 'cancelada']);

        return back()->with('success', 'Reporte cancelado.');
    }

    private function tipoEvento(array $d): string
    {
        return $d['tipo_seleccion'] === self::OTROS ? $d['tipo_otros'] : $d['tipo_seleccion'];
    }

    /** Reportante o supervisor/admin, solo en emergencias y mientras esté "reportada". */
    private function autorizar(Request $request, Intervencion $intervencion): void
    {
        $usuario = $request->user();
        $permitido = $usuario->hasAnyRole(['Administrador', 'Supervisor'])
            || ($usuario->agente_id && $usuario->agente_id === $intervencion->agente_reporta_id);

        abort_unless($permitido && $intervencion->tarea_id === null, 403);
        abort_unless($intervencion->estado_resolucion === 'reportada', 403, 'Solo se puede modificar un reporte recién reportado.');
    }
}