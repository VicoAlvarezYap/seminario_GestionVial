<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HistorialDeLicencias;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LicenciaAdminController extends Controller
{
    private const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'cancelada', 'finalizada'];

    public function index(Request $request): Response
    {
        $filtros = $this->filtros($request);

        $licencias = $this->consulta($filtros)
            ->paginate(15)
            ->withQueryString()
            ->through(fn (HistorialDeLicencias $l) => $this->aArreglo($l));

        return Inertia::render('Admin/Licencias/index', [
            'licencias' => $licencias,
            'filtros' => $filtros,
            'estados' => self::ESTADOS,
        ]);
    }

    public function resolver(Request $request, HistorialDeLicencias $licencia): RedirectResponse
    {
        $esRechazo = $request->input('accion') === 'rechazada';

        $validos = $request->validate([
            'accion' => ['required', Rule::in(['aprobada', 'rechazada'])],
            'observaciones' => [Rule::requiredIf($esRechazo), 'nullable', 'string', 'max:500'],
        ]);

        // El where evita pisar una licencia que el agente canceló mientras tanto
        $actualizadas = HistorialDeLicencias::query()
            ->where('id', $licencia->id)
            ->where('estado', 'pendiente')
            ->update([
                'estado' => $validos['accion'],
                'observaciones' => $validos['observaciones'] ?? null,
            ]);

        abort_if($actualizadas === 0, 409, 'La licencia ya no está pendiente.');

        return back();
    }

   public function pdf(HistorialDeLicencias $licencia)
{
    $licencia->load('agente');

    $dias = (int) $licencia->fecha_inicio->diffInDays($licencia->fecha_fin) + 1;

    return Pdf::loadView('pdf.licencia', [
        'd' => $this->aArreglo($licencia),
        'dias' => $dias,
        'generado' => now()->format('d/m/Y H:i'),
    ])
        ->setPaper('a4')
        ->download('licencia-'.$licencia->id.'.pdf');
}

    public function justificante(HistorialDeLicencias $licencia)
    {
        abort_unless(
            $licencia->justificante_path && Storage::exists($licencia->justificante_path),
            404
        );

        return Storage::response($licencia->justificante_path);
    }

    private function filtros(Request $request): array
    {
        $validos = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', Rule::in(self::ESTADOS)],
            'desde' => ['nullable', 'date'],
            'hasta' => $request->filled('desde')
                ? ['nullable', 'date', 'after_or_equal:desde']
                : ['nullable', 'date'],
        ]);

        return [
            'buscar' => trim($validos['buscar'] ?? ''),
            'estado' => $validos['estado'] ?? '',
            'desde' => $validos['desde'] ?? '',
            'hasta' => $validos['hasta'] ?? '',
        ];
    }

    private function consulta(array $f): Builder
    {
        $consulta = HistorialDeLicencias::query()->with('agente');

        // Cada palabra tiene que aparecer en nombre, apellido o DNI
        foreach (preg_split('/\s+/', $f['buscar'], -1, PREG_SPLIT_NO_EMPTY) as $palabra) {
            $like = '%'.addcslashes($palabra, '%_\\').'%';

            $consulta->whereHas('agente', function (Builder $agente) use ($like) {
                $agente->where(function (Builder $w) use ($like) {
                    $w->where('nombre', 'like', $like)
                        ->orWhere('apellido', 'like', $like)
                        ->orWhere('numero_documento', 'like', $like);
                });
            });
        }

        $consulta
            ->when($f['estado'] !== '', fn (Builder $c) => $c->where('estado', $f['estado']))
            // La licencia se superpone con el rango pedido
            ->when($f['desde'] !== '', fn (Builder $c) => $c->whereDate('fecha_fin', '>=', $f['desde']))
            ->when($f['hasta'] !== '', fn (Builder $c) => $c->whereDate('fecha_inicio', '<=', $f['hasta']));

        return $consulta->orderByDesc('id');
    }

    private function aArreglo(HistorialDeLicencias $l): array
    {
        $domicilio = collect([
            trim(($l->domicilio_calle ?? '').' '.($l->domicilio_numero ?? '')),
            $l->domicilio_localidad,
        ])->filter()->implode(', ');

        return [
            'id' => $l->id,
            'agente' => $l->agente
                ? trim($l->agente->apellido.', '.$l->agente->nombre)
                : 'Sin agente',
            'dni' => $l->agente?->numero_documento,
            'tipo_licencia' => $l->tipo_licencia,
            'fecha_inicio' => $l->fecha_inicio->format('d/m/Y'),
            'fecha_fin' => $l->fecha_fin->format('d/m/Y'),
            'estado' => $l->estado,
            'observaciones' => $l->observaciones,
            'domicilio' => $domicilio !== '' ? $domicilio : null,
            'dj_a_cargo' => $l->dj_a_cargo,
            'dj_parentesco' => $l->dj_parentesco,
            'tiene_justificante' => $l->justificante_path !== null,
            'resoluble' => $l->estado === 'pendiente',
        ];
    }
}