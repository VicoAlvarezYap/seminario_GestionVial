<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\IntervencionController;
use App\Models\Agente;
use App\Models\IntervencionesDeEmergencias;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionAdminController extends Controller
{
    private const ESTADOS = ['reportada', 'en_curso', 'resuelta', 'derivada', 'cancelada'];
   

    public function index(Request $request): Response
    {
        $filtros = $this->filtros($request);

        $intervenciones = $this->consulta($filtros)
            ->paginate(15)
            ->withQueryString()
            ->through(fn (IntervencionesDeEmergencias $i) => $this->aArreglo($i));

        $agentes = Agente::query()
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido'])
            ->map(fn (Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
            ->values()
            ->all();

        return Inertia::render('Admin/Intervenciones/index', [
            'intervenciones' => $intervenciones,
            'filtros' => $filtros,
            'estados' => self::ESTADOS,
            'urgencias' => IntervencionController::URGENCIAS,
            'tipos' => [...IntervencionController::TIPOS, IntervencionController::OTROS],
            'agentes' => $agentes,
            
        ]);
    }

  

    public function pdf(IntervencionesDeEmergencias $intervencion)
    {
        $intervencion->load(['agenteReporta', 'agentes']);

        return Pdf::loadView('pdf.intervencion', [
            'd' => $this->aArreglo($intervencion),
            'generado' => now()->format('d/m/Y H:i'),
        ])
            ->setPaper('a4')
            ->download('intervencion-'.$intervencion->id.'.pdf');
    }

    private function filtros(Request $request): array
    {
        $validos = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', Rule::in(self::ESTADOS)],
            'urgencia' => ['nullable', Rule::in(IntervencionController::URGENCIAS)],
            'tipo' => ['nullable', Rule::in([...IntervencionController::TIPOS, IntervencionController::OTROS])],
            'desde' => ['nullable', 'date'],
            'hasta' => $request->filled('desde')
                ? ['nullable', 'date', 'after_or_equal:desde']
                : ['nullable', 'date'],
        ]);

        return [
            'buscar' => trim($validos['buscar'] ?? ''),
            'estado' => $validos['estado'] ?? '',
            'urgencia' => $validos['urgencia'] ?? '',
            'tipo' => $validos['tipo'] ?? '',
            'desde' => $validos['desde'] ?? '',
            'hasta' => $validos['hasta'] ?? '',
        ];
    }

    private function consulta(array $f): Builder
    {
        $consulta = IntervencionesDeEmergencias::query()->with(['agenteReporta', 'agentes']);

        // cada palabra tiene que aparecer en la ubic, el reportante o algun participante
        foreach (preg_split('/\s+/', $f['buscar'], -1, PREG_SPLIT_NO_EMPTY) as $palabra) {
            $like = '%'.addcslashes($palabra, '%_\\').'%';

            $consulta->where(function (Builder $c) use ($like) {
                $c->where('ubicacion_direccion', 'like', $like)
                    ->orWhereHas('agenteReporta', fn (Builder $a) => $this->coincideAgente($a, $like))
                    ->orWhereHas('agentes', fn (Builder $a) => $this->coincideAgente($a, $like));
            });
        }

        $consulta
            ->when($f['estado'] !== '', fn (Builder $c) => $c->where('estado_resolucion', $f['estado']))
            ->when($f['urgencia'] !== '', fn (Builder $c) => $c->where('nivel_urgencia', $f['urgencia']))
            ->when($f['tipo'] !== '', function (Builder $c) use ($f) {
                // "Otros" son los tipos que no están en la lista fija
                if ($f['tipo'] === IntervencionController::OTROS) {
                    $c->whereNotIn('tipo_evento', IntervencionController::TIPOS);
                } else {
                    $c->where('tipo_evento', $f['tipo']);
                }
            })
            ->when($f['desde'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora_reporte', '>=', $f['desde']))
            ->when($f['hasta'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora_reporte', '<=', $f['hasta']));

        return $consulta->orderByDesc('fecha_hora_reporte')->orderByDesc('id');
    }

    private function coincideAgente(Builder $agente, string $like): void
    {
        $agente->where(function (Builder $w) use ($like) {
            $w->where('nombre', 'like', $like)
                ->orWhere('apellido', 'like', $like)
                ->orWhere('numero_documento', 'like', $like);
        });
    }

    private function aArreglo(IntervencionesDeEmergencias $i): array
    {
        $tiempo = null;

        if ($i->resuelta_en) {
            $minutos = max(0, intdiv($i->resuelta_en->timestamp - $i->fecha_hora_reporte->timestamp, 60));
            $tiempo = $this->duracion($minutos);
        }

        return [
            'id' => $i->id,
            'fecha_hora' => $i->fecha_hora_reporte->format('d/m/Y H:i'),
            'tipo_evento' => $i->tipo_evento,
            'nivel_urgencia' => $i->nivel_urgencia,
            'ubicacion_direccion' => $i->ubicacion_direccion,
            'descripcion_situacion' => $i->descripcion_situacion,
            'estado_resolucion' => $i->estado_resolucion,
            'reportante' => $i->agenteReporta
                ? trim($i->agenteReporta->apellido.', '.$i->agenteReporta->nombre)
                : 'Sin agente',
            'reportante_dni' => $i->agenteReporta?->numero_documento,
            'participantes' => $i->agentes
                ->map(fn (Agente $a) => [
                    'id' => $a->id,
                    'nombre' => trim($a->apellido.', '.$a->nombre),
                    'rol' => $a->pivot->rol_en_intervencion,
                ])
                ->values()
                ->all(),
            'resuelta_en' => $i->resuelta_en?->format('d/m/Y H:i'),
            'tiempo_respuesta' => $tiempo,
            
        ];
    }

    private function duracion(int $minutos): string
    {
        $dias = intdiv($minutos, 1440);
        $horas = intdiv($minutos % 1440, 60);
        $min = $minutos % 60;

        $partes = [];

        if ($dias > 0) {
            $partes[] = "{$dias} d";
        }

        if ($horas > 0) {
            $partes[] = "{$horas} h";
        }

        if ($min > 0 || $partes === []) {
            $partes[] = "{$min} min";
        }

        return implode(' ', $partes);
    }
}