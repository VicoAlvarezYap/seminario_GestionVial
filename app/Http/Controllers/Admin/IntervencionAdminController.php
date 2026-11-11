<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\IntervencionController;
use App\Models\Agente;
use App\Models\Intervencion;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntervencionAdminController extends Controller
{
    private const ESTADOS = ['reportada', 'en_curso', 'resuelta', 'derivada', 'cancelada'];
    private const URGENCIAS=['baja', 'media', 'alta', 'critica'];
    private const TIPOS = ['accidente', 'infraccion', 'emergencia', 'otro'];
    public function index(Request $request): Response
    {
        $filtros = $this->filtros($request);

        $intervenciones = $this->consulta($filtros)
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Intervencion $i) => $this->aArreglo($i));

       /*  $agentes = Agente::query()
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido'])
            ->map(fn (Agente $a) => ['id' => $a->id, 'nombre' => "{$a->apellido}, {$a->nombre}"])
            ->values()
            ->all();
*/
        return Inertia::render('Admin/Intervenciones/index', [
            'intervenciones' => $intervenciones,
            'filtros' => $filtros,
            'estados' => self::ESTADOS,
            'urgencias' => self::URGENCIAS,
            'tipos' => self::TIPOS,
            //'agentes' => $agentes,
            
        ]);
    }

  

    public function pdf(Intervencion $intervencion)
    {
        $intervencion->load(['lugar','agenteReporta', 'agentes']);

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
            'urgencia' => ['nullable', Rule::in(self::URGENCIAS)],
            'tipo' => ['nullable', Rule::in(self::TIPOS)],
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
        $consulta = Intervencion::query()->with(['lugar','agenteReporta', 'agentes']);

        // cada palabra tiene que aparecer en la ubic, el reportante o algun participante
        foreach (preg_split('/\s+/', $f['buscar'], -1, PREG_SPLIT_NO_EMPTY) as $palabra) {
            $like = '%'.addcslashes($palabra, '%_\\').'%';

            $consulta->where(function (Builder $c) use ($like) {
                $c->where('ubicacion_direccion', 'like', $like)
                ->orWhere('tipo_evento', 'like', $like)
                ->orWhereHas('lugar', fn (Builder $l) => $l->where('nombre', 'like', $like))    
                ->orWhereHas('agenteReporta', fn (Builder $a) => $this->coincideAgente($a, $like))
                ->orWhereHas('agentes', fn (Builder $a) => $this->coincideAgente($a, $like));
            });
        }

        $consulta
            ->when($f['estado'] !== '', fn (Builder $c) => $c->where('estado_resolucion', $f['estado']))
            ->when($f['urgencia'] !== '', fn (Builder $c) => $c->where('nivel_urgencia', $f['urgencia']))
            ->when($f['tipo'] !== '', fn (Builder $c) => $c->where('tipo', $f['tipo']))
            ->when($f['desde'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora', '>=', $f['desde']))
            ->when($f['hasta'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora', '<=', $f['hasta']));

        return $consulta->orderByDesc('fecha_hora')->orderByDesc('id');
    }

    private function coincideAgente(Builder $agente, string $like): void
    {
        $agente->where(function (Builder $w) use ($like) {
            $w->where('nombre', 'like', $like)
                ->orWhere('apellido', 'like', $like)
                ->orWhere('numero_documento', 'like', $like);
        });
    }

    private function aArreglo(Intervencion $i): array
    {


        return [
            'id' => $i->id,
            'fecha_hora' => $i->fecha_hora->format('d/m/Y H:i'),
            'tipo_evento' => $i->tipo_evento,
            'nivel_urgencia' => $i->nivel_urgencia,
            'ubicacion_direccion' => $i->ubicacion_direccion,
            'descripcion_situacion' => $i->descripcion,
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