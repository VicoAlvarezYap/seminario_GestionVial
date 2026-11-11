<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\RelevoAdminController;
use App\Models\Relevos;
use App\Models\TurnoTrabajo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RelevoController extends Controller
{
    //anexo del decreto 437/11 del acta de infraccion
    public const INFRACCIONES = [
        'sin_luces' => 'Circular sin luces encendidas (Art. 66)',
        'exceso_pasajeros' => 'Exceso de pasajeros (Art. 30)',
        'adelantamiento' => 'Adelantamiento indebido (Art. 76)',
        'moto_sin_casco' => 'Circular con moto sin casco (Art. 33)',
        'exceso_velocidad' => 'Exceso de velocidad (Art. 104)',
        'celular_auriculares' => 'Circular usando celular o auriculares (Art. 91)',
        'sin_cinturon' => 'Ocupantes no usan cinturón de seguridad (Art. 34)',
        'sin_rto' => 'Sin R.T.O. (Art. 19)',
        'sin_seguro' => 'Circular sin seguro (Art. 114)',
        'sin_licencia' => 'Circular sin licencia habilitada (Art. 25, 1.ª parte)',
    ];

    public const ALCOHOLEMIA = [
        'menos_02' => 'Menos de 0,2 g/l (Art. 3 inc. 1)',
        'de_02_a_05' => 'Desde 0,2 y menos de 0,5 g/l (Art. 3 inc. 2)',
        'de_05_a_1' => 'Desde 0,5 y menos de 1 g/l (Art. 3 inc. 3)',
        'desde_1' => 'Desde 1 g/l o más (Art. 3 inc. 4)',
    ];

    public const TIPOS_DOCUMENTO = ['DNI', 'LE', 'LC', 'CI', 'Pasaporte', 'CUIT', 'CUIL', 'Otro'];

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $agente = $usuario->agente;

        $relevos = Relevos::query()
            ->where('agente_id', $usuario->agente_id)
            ->orderByDesc('fecha_hora')
            ->get()
            ->map(fn (Relevos $r) => $r->paraVista() + [
                'editable' => $r->fecha_hora->isToday(),
            ])
            ->values()
            ->all();

        return Inertia::render('Relevos/index', [
            'relevos' => $relevos,
            'agente' => $agente
                ? ['nombre' => $agente->nombre, 'apellido' => $agente->apellido]
                : null,
            'enTurno' => $this->turnoEnCurso($usuario->agente_id) !== null,
            'infracciones' => $this->comoLista(self::INFRACCIONES),
            'alcoholemia' => $this->comoLista(self::ALCOHOLEMIA),
            'tiposDocumento' => self::TIPOS_DOCUMENTO,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        abort_unless(
            $this->turnoEnCurso($agenteId) !== null,
            403,
            'Solo podés cargar actas mientras tenés un turno en curso. Iniciá tu turno primero.'
        );

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

        $validos = $request->validate($this->reglas($request, $relevo->id));

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

    public function pdf(Request $request, Relevos $relevo)
    {
        $this->verificarDuenio($request, $relevo);

        return app(RelevoAdminController::class)->pdf($relevo);
    }

    private function reglas(Request $request, ?int $ignorarId = null): array
    {
        $reglas = [];

        foreach (Relevos::TEXTOS as $campo => $maximo) {
            $reglas[$campo] = ['nullable', 'string', 'max:'.$maximo];
        }

        return array_merge($reglas, [
            'numero_acta' => [
                'nullable', 'string', 'max:20',
                Rule::unique('relevos', 'numero_acta')->ignore($ignorarId),
            ],
            'tercero_nombre_apellido' => ['required', 'string', 'max:200'],
            'tercero_tipo_documento' => ['required', Rule::in(self::TIPOS_DOCUMENTO)],
            'tercero_dni' => ['required', 'string', 'max:20'],
            'conductor_sexo' => ['nullable', Rule::in(['M', 'F', 'X'])],
            'propietario_tipo_documento' => ['nullable', Rule::in(self::TIPOS_DOCUMENTO)],
            'vehiculo_placa' => ['required', 'string', 'max:15'],
            'lugar_infraccion' => ['required', 'string', 'max:255'],
            'alcoholemia_nivel' => ['nullable', Rule::in(array_keys(self::ALCOHOLEMIA))],
            'licencia_vencimiento' => ['nullable', 'date'],
            'vehiculo_anio' => ['nullable', 'integer', 'between:1900,'.(now()->year + 1)],
            'instrumento_fecha_hora' => ['nullable', 'date'],
            'infracciones_codigos' => ['nullable', 'array'],
            'infracciones_codigos.*' => ['string', Rule::in(array_keys(self::INFRACCIONES))],
            'descripcion_legal' => [
                Rule::requiredIf(fn () => empty($request->input('infracciones_codigos'))),
                'nullable', 'string', 'max:500',
            ],
            'alcoholemia_agravante' => ['boolean'],
            'retuvo_licencia' => ['boolean'],
            'retuvo_vehiculo' => ['boolean'],
            'conductor_alternativo' => ['boolean'],
            'necesito_atencion_policial' => ['boolean'],
        ]);
    }

    private function datosParaGuardar(array $v): array
    {
        $datos = [];

        foreach (array_keys(Relevos::TEXTOS) as $campo) {
            $datos[$campo] = $v[$campo] ?? null;
        }

        $datos['vehiculo_placa'] = strtoupper((string) $datos['vehiculo_placa']);
        $datos['vehiculo_otro_dominio'] = $datos['vehiculo_otro_dominio']
            ? strtoupper($datos['vehiculo_otro_dominio'])
            : null;

        $datos['licencia_vencimiento'] = $v['licencia_vencimiento'] ?? null;
        $datos['vehiculo_anio'] = $v['vehiculo_anio'] ?? null;
        $datos['instrumento_fecha_hora'] = $v['instrumento_fecha_hora'] ?? null;

        $codigos = array_values(array_unique($v['infracciones_codigos'] ?? []));
        $datos['infracciones_codigos'] = $codigos;
        $datos['motivo_detencion'] = $this->armarMotivo($codigos, $datos['descripcion_legal']);

        foreach (Relevos::BOOLEANOS as $campo) {
            $datos[$campo] = (bool) ($v[$campo] ?? false);
        }

        return $datos;
    }

    //resumende las infracciones
    private function armarMotivo(array $codigos, ?string $descripcionLegal): string
    {
        $partes = array_map(fn (string $c) => self::INFRACCIONES[$c], $codigos);

        if ($descripcionLegal) {
            $partes[] = $descripcionLegal;
        }

        return implode(' | ', $partes);
    }

    private function comoLista(array $opciones): array
    {
        return collect($opciones)
            ->map(fn (string $etiqueta, string $codigo) => ['codigo' => $codigo, 'etiqueta' => $etiqueta])
            ->values()
            ->all();
    }
    private function turnoEnCurso(?int $agenteId): ?TurnoTrabajo
    {
        if (! $agenteId) {
            return null;
        }

        return TurnoTrabajo::query()
            ->where('agente_id', $agenteId)
            ->whereNotNull('inicio_real')
            ->whereNull('fin_real')
            ->first();
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
            'Solo se pueden modificar actas cargadas hoy.'
        );
    }
}