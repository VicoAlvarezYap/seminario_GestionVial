<?php

namespace App\Http\Controllers;

use App\Models\IntervencionesDeEmergencias;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionController extends Controller
{
    private const TIPOS = [
        'Accidente de tránsito',
        'Inundación',
        'Caída de árbol',
        'Desmoronamiento',
    ];

    private const OTROS = 'Otros';

    private const URGENCIAS = ['baja', 'media', 'alta', 'critica'];

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $agenteId = $usuario->agente_id;
        $agente = $usuario->agente;

        $intervenciones = IntervencionesDeEmergencias::query()
            ->where(function ($q) use ($agenteId) {
                $q->where('agente_reporta_id', $agenteId)
                    ->orWhereHas('agentes', fn ($a) => $a->where('agentes.id', $agenteId));
            })
            ->orderByDesc('fecha_hora_reporte')
            ->get()
            ->map(function (IntervencionesDeEmergencias $i) use ($agenteId) {
                $esReportante = (int) $i->agente_reporta_id === (int) $agenteId;
                $esOtro = ! in_array($i->tipo_evento, self::TIPOS, true);

                return [
                    'id' => $i->id,
                    'tipo_evento' => $i->tipo_evento,
                    'tipo_seleccion' => $esOtro ? self::OTROS : $i->tipo_evento,
                    'tipo_otros' => $esOtro ? $i->tipo_evento : '',
                    'nivel_urgencia' => $i->nivel_urgencia,
                    'ubicacion_direccion' => $i->ubicacion_direccion,
                    'descripcion_situacion' => $i->descripcion_situacion,
                    'estado_resolucion' => $i->estado_resolucion,
                    'fecha_hora' => $i->fecha_hora_reporte->format('d/m/Y H:i'),
                    'es_reportante' => $esReportante,
                    'editable' => $esReportante && $i->estado_resolucion === 'reportada',
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Intervenciones/index', [
            'intervenciones' => $intervenciones,
            'agente' => $agente
                ? ['nombre' => $agente->nombre, 'apellido' => $agente->apellido]
                : null,
            'tipos' => [...self::TIPOS, self::OTROS],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        $validos = $request->validate($this->reglas($request));

        $datos = $this->datosParaGuardar($validos);
        $datos['agente_reporta_id'] = $agenteId;
        $datos['estado_resolucion'] = 'reportada';
        $datos['fecha_hora_reporte'] = now();

        IntervencionesDeEmergencias::create($datos);

        return redirect()->route('intervenciones.index');
    }

    public function update(Request $request, IntervencionesDeEmergencias $intervencion): RedirectResponse
    {
        $this->verificarReportante($request, $intervencion);
        $this->verificarReportada($intervencion);

        $validos = $request->validate($this->reglas($request));

        $intervencion->update($this->datosParaGuardar($validos));

        return redirect()->route('intervenciones.index');
    }

    public function cancelar(Request $request, IntervencionesDeEmergencias $intervencion): RedirectResponse
    {
        $this->verificarReportante($request, $intervencion);
        $this->verificarReportada($intervencion);

        $intervencion->update(['estado_resolucion' => 'cancelada']);

        return redirect()->route('intervenciones.index');
    }

    private function reglas(Request $request): array
    {
        $esOtro = $request->input('tipo_seleccion') === self::OTROS;

        return [
            'tipo_seleccion' => ['required', Rule::in([...self::TIPOS, self::OTROS])],
            'tipo_otros' => [Rule::requiredIf($esOtro), 'nullable', 'string', 'max:100'],
            'nivel_urgencia' => ['required', Rule::in(self::URGENCIAS)],
            'ubicacion_direccion' => ['required', 'string', 'max:255'],
            'descripcion_situacion' => ['required', 'string', 'max:2000'],
        ];
    }

    private function datosParaGuardar(array $v): array
    {
        $esOtro = $v['tipo_seleccion'] === self::OTROS;

        return [
            'tipo_evento' => $esOtro ? trim($v['tipo_otros'] ?? '') : $v['tipo_seleccion'],
            'nivel_urgencia' => $v['nivel_urgencia'],
            'ubicacion_direccion' => $v['ubicacion_direccion'],
            'descripcion_situacion' => $v['descripcion_situacion'],
        ];
    }

    private function verificarReportante(Request $request, IntervencionesDeEmergencias $intervencion): void
    {
        abort_unless(
            (int) $intervencion->agente_reporta_id === (int) $request->user()->agente_id,
            403
        );
    }

    private function verificarReportada(IntervencionesDeEmergencias $intervencion): void
    {
        abort_unless(
            $intervencion->estado_resolucion === 'reportada',
            403,
            'Solo se pueden modificar intervenciones recién reportadas.'
        );
    }
}