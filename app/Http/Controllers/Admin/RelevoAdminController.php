<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\RelevoController;
use App\Models\Relevos;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RelevoAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $filtros = $this->filtros($request);

        $relevos = $this->consulta($filtros)
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Relevos $r) => $this->aArreglo($r));

        return Inertia::render('Admin/Relevos/index', [
            'relevos' => $relevos,
            'filtros' => $filtros,
            'infracciones' => array_values(RelevoController::INFRACCIONES),
        ]);
    }

    public function pdf(Relevos $relevo)
    {
        $relevo->load('agente');

        return Pdf::loadView('pdf.relevo', [
            'd' => $this->aArreglo($relevo),
            'infracciones' => RelevoController::INFRACCIONES,
            'alcoholemia' => RelevoController::ALCOHOLEMIA,
            'generado' => now()->format('d/m/Y H:i'),
        ])
            ->setPaper('a4')
            ->download('acta-'.$relevo->id.'.pdf');
    }

    private function filtros(Request $request): array
    {
        $validos = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'policial' => ['nullable', Rule::in(['si', 'no'])],
            'infraccion' => ['nullable', Rule::in(array_values(RelevoController::INFRACCIONES))],
            'desde' => ['nullable', 'date'],
            'hasta' => $request->filled('desde')
                ? ['nullable', 'date', 'after_or_equal:desde']
                : ['nullable', 'date'],
        ]);

        return [
            'buscar' => trim($validos['buscar'] ?? ''),
            'policial' => $validos['policial'] ?? '',
            'infraccion' => $validos['infraccion'] ?? '',
            'desde' => $validos['desde'] ?? '',
            'hasta' => $validos['hasta'] ?? '',
        ];
    }

    private function consulta(array $f): Builder
    {
        $consulta = Relevos::query()->with('agente');

        // Cada palabra tiene que aparecer en el acta, la persona, la patente o el agente
        foreach (preg_split('/\s+/', $f['buscar'], -1, PREG_SPLIT_NO_EMPTY) as $palabra) {
            $like = '%'.addcslashes($palabra, '%_\\').'%';

            $consulta->where(function (Builder $c) use ($like) {
                $c->where('numero_acta', 'like', $like)
                    ->orWhere('tercero_nombre_apellido', 'like', $like)
                    ->orWhere('tercero_dni', 'like', $like)
                    ->orWhere('vehiculo_placa', 'like', $like)
                    ->orWhereHas('agente', function (Builder $a) use ($like) {
                        $a->where(function (Builder $w) use ($like) {
                            $w->where('nombre', 'like', $like)
                                ->orWhere('apellido', 'like', $like)
                                ->orWhere('numero_documento', 'like', $like);
                        });
                    });
            });
        }

        $consulta
            ->when(
                $f['policial'] !== '',
                fn (Builder $c) => $c->where('necesito_atencion_policial', $f['policial'] === 'si')
            )
            ->when(
                $f['infraccion'] !== '',
                fn (Builder $c) => $c->where('motivo_detencion', 'like', '%'.addcslashes($f['infraccion'], '%_\\').'%')
            )
            ->when($f['desde'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora', '>=', $f['desde']))
            ->when($f['hasta'] !== '', fn (Builder $c) => $c->whereDate('fecha_hora', '<=', $f['hasta']));

        return $consulta->orderByDesc('fecha_hora')->orderByDesc('id');
    }

    private function aArreglo(Relevos $r): array
    {
        return $r->paraVista() + [
            'agente' => $r->agente
                ? trim($r->agente->apellido.', '.$r->agente->nombre)
                : 'Sin agente',
            'agente_dni' => $r->agente?->numero_documento,
            'alcoholemia_texto' => RelevoController::ALCOHOLEMIA[$r->alcoholemia_nivel] ?? null,
            // Nombres que ya usa la página del admin
            'persona' => $r->tercero_nombre_apellido,
            'dni' => $r->tercero_dni,
            'domicilio' => $r->tercero_domicilio,
            'celular' => $r->tercero_celular,
            'tipo_vehiculo' => $r->vehiculo_tipo,
            'placa' => $r->vehiculo_placa,
            'motivo' => $r->motivo_detencion,
            'personas_implicadas' => $r->personas_implicadas,
            'policial' => (bool) $r->necesito_atencion_policial,
        ];
    }
}