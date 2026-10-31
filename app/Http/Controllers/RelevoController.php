<?php

namespace App\Http\Controllers;

use App\Models\Relevos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RelevoController extends Controller
{
    public const INFRACCIONES = [
        'Alcohol',
        'Documentación',
        'Condición de licencia',
        'Menores',
        'Otros',
    ];

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $agente = $usuario->agente;

        $relevos = Relevos::query()
            ->where('agente_id', $usuario->agente_id)
            ->orderByDesc('fecha_hora')
            ->get()
            ->map(function (Relevos $r) {
                [$infracciones, $otros] = $this->separarMotivo($r->motivo_detencion);

                return [
                    'id' => $r->id,
                    'nombre_completo' => $r->tercero_nombre_apellido,
                    'dni' => $r->tercero_dni,
                    'celular'=>$r->tercero_celular,
                    'domicilio' => $r->tercero_domicilio,
                    'tipo_vehiculo' => $r->vehiculo_tipo,
                    'placa_vehiculo' => $r->vehiculo_placa,
                    'infracciones' => $infracciones,
                    'infraccion_otros' => $otros,
                    'motivo' => $r->motivo_detencion,
                    'intervencion_policial' => $r->necesito_atencion_policial ? 'si' : 'no',
                    'fecha_hora' => $r->fecha_hora->format('d/m/Y H:i'),
                    'editable' => $r->fecha_hora->isToday(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Relevos/index', [
            'relevos' => $relevos,
            'agente' => $agente
                ? ['nombre' => $agente->nombre, 'apellido' => $agente->apellido]
                : null,
            'infracciones' => self::INFRACCIONES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        $validos = $request->validate($this->reglas($request));

        $datos = $this->datosParaGuardar($validos);
        $datos['agente_id'] = $agenteId;
        $datos['fecha_hora'] = now();

        Relevos::create($datos);

        return redirect()->route('relevos.index');
    }

    public function update(Request $request, Relevos $relevo): RedirectResponse
    {
        $this->verificarDuenio($request, $relevo);
        $this->verificarDelDia($relevo);

        $validos = $request->validate($this->reglas($request));

        $relevo->update($this->datosParaGuardar($validos));

        return redirect()->route('relevos.index');
    }

    public function destroy(Request $request, Relevos $relevo): RedirectResponse
    {
        $this->verificarDuenio($request, $relevo);
        $this->verificarDelDia($relevo);

        $relevo->delete();

        return redirect()->route('relevos.index');
    }

    private function reglas(Request $request): array
    {
        $marcoOtros = in_array('Otros', (array) $request->input('infracciones', []), true);

        return [
            'nombre_completo' => ['required', 'string', 'max:200'],
            'dni' => ['required', 'string', 'max:20'],
            'celular'=>['required','string','max:30'],
            'domicilio' => ['required', 'string', 'max:255'],
            'tipo_vehiculo' => ['required', 'string', 'max:50'],
            'placa_vehiculo' => ['required', 'string', 'max:15'],
            'infracciones' => ['required', 'array', 'min:1'],
            'infracciones.*' => [Rule::in(self::INFRACCIONES)],
            'infraccion_otros' => [Rule::requiredIf($marcoOtros), 'nullable', 'string', 'max:150'],
            'intervencion_policial' => ['required', Rule::in(['si', 'no'])],
        ];
    }

    private function datosParaGuardar(array $v): array
    {
        return [
            'tercero_nombre_apellido' => $v['nombre_completo'],
            'tercero_dni' => $v['dni'],
            'tercero_celular'=>$v['celular'],
            'tercero_domicilio' => $v['domicilio'],
            'vehiculo_tipo' => $v['tipo_vehiculo'],
            'vehiculo_placa' => strtoupper($v['placa_vehiculo']),
            'motivo_detencion' => $this->armarMotivo($v),
            'necesito_atencion_policial' => $v['intervencion_policial'] === 'si',
        ];
    }

    private function armarMotivo(array $v): string
    {
        $partes = array_values(array_filter(
            $v['infracciones'],
            fn (string $i) => $i !== 'Otros'
        ));

        if (in_array('Otros', $v['infracciones'], true)) {
            $partes[] = 'Otros: '.str_replace('|', '/', trim($v['infraccion_otros'] ?? ''));
        }

        return implode(' | ', $partes);
    }
    private function separarMotivo(string $motivo): array
    {
        $infracciones = [];
        $otros = '';

        foreach (explode(' | ', $motivo) as $parte) {
            if (str_starts_with($parte, 'Otros: ')) {
                $infracciones[] = 'Otros';
                $otros = substr($parte, 7);
            } elseif (in_array($parte, self::INFRACCIONES, true)) {
                $infracciones[] = $parte;
            }
        }

        return [$infracciones, $otros];
    }

    private function verificarDuenio(Request $request, Relevos $relevo): void
    {
        abort_unless(
            (int) $relevo->agente_id === (int) $request->user()->agente_id,
            403
        );
    }

    private function verificarDelDia(Relevos $relevo): void
    {
        abort_unless(
            $relevo->fecha_hora->isToday(),
            403,
            'Solo se pueden modificar relevos cargados hoy.'
        );
    }
}