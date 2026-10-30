<?php

namespace App\Http\Controllers;

use App\Models\HistorialDeLicencias;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LicenciaController extends Controller
{
    private const MOTIVOS = ['Accidente laboral', 'Familiar enfermo', 'Médico'];

    private const PARENTESCOS = ['Cónyuge', 'Hijo', 'Padre', 'Hermano'];

    // Lista de referencia: conviene completarla con la oficial de la provincia
    private const LOCALIDADES = [
        'Aguaray', 'Angastaco', 'Animaná', 'Apolinario Saravia', 'Cachi',
        'Cafayate', 'Campo Quijano', 'Campo Santo', 'Cerrillos', 'Chicoana',
        'Colonia Santa Rosa', 'Coronel Moldes', 'El Carril', 'El Galpón',
        'El Quebrachal', 'El Tala', 'Embarcación', 'General Güemes',
        'General Mosconi', 'General Pizarro', 'Guachipas', 'Hipólito Yrigoyen',
        'Iruya', 'Isla de Cañas', 'Joaquín V. González', 'La Caldera',
        'La Merced', 'La Poma', 'La Viña', 'Las Lajitas', 'Los Toldos',
        'Metán', 'Molinos', 'Nazareno', 'Payogasta', 'Pichanal',
        'Rivadavia Banda Sur', 'Rosario de la Frontera', 'Rosario de Lerma',
        'Salta', 'Salvador Mazza', 'San Antonio de los Cobres', 'San Carlos',
        'San Lorenzo', 'San Ramón de la Nueva Orán', 'Santa Victoria Este',
        'Santa Victoria Oeste', 'Seclantás', 'Tartagal', 'Tolar Grande',
        'Vaqueros',
    ];

    public function index(Request $request): Response
    {
        $usuario = $request->user();
        $agente = $usuario->agente;

        $licencias = HistorialDeLicencias::query()
            ->where('agente_id', $usuario->agente_id)
            ->orderByDesc('fecha_inicio')
            ->get()
            ->map(fn (HistorialDeLicencias $l) => [
                'id' => $l->id,
                'tipo_licencia' => $l->tipo_licencia,
                'fecha_inicio' => $l->fecha_inicio->toDateString(),
                'fecha_fin' => $l->fecha_fin->toDateString(),
                'estado' => $l->estado,
                'observaciones' => $l->observaciones,
                'domicilio_calle' => $l->domicilio_calle,
                'domicilio_numero' => $l->domicilio_numero,
                'domicilio_localidad' => $l->domicilio_localidad,
                'dj_a_cargo' => $l->dj_a_cargo,
                'dj_parentesco' => $l->dj_parentesco,
                'tiene_justificante' => $l->justificante_path !== null,
                'editable' => $l->estado === 'pendiente',
            ])
            ->values()
            ->all();

        return Inertia::render('Licencias/index', [
            'licencias' => $licencias,
            'agente' => $agente
                ? ['nombre' => $agente->nombre, 'apellido' => $agente->apellido]
                : null,
            'localidades' => self::LOCALIDADES,
            'motivos' => self::MOTIVOS,
            'parentescos' => self::PARENTESCOS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $agenteId = $request->user()->agente_id;
        abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

        $validos = $request->validate($this->reglas($request, false));

        $datos = $this->datosParaGuardar($validos);
        $datos['agente_id'] = $agenteId;
        $datos['estado'] = 'pendiente';
        $datos['justificante_path'] = $request->hasFile('justificante')
            ? $request->file('justificante')->store('licencias')
            : null;

        HistorialDeLicencias::create($datos);

        return redirect()->route('licencias.index');
    }

    public function update(Request $request, HistorialDeLicencias $licencia): RedirectResponse
    {
        $this->verificarDuenio($request, $licencia);
        $this->verificarPendiente($licencia);

        $validos = $request->validate(
            $this->reglas($request, $licencia->justificante_path !== null)
        );

        $datos = $this->datosParaGuardar($validos);

        if ($request->hasFile('justificante')) {
            if ($licencia->justificante_path) {
                Storage::delete($licencia->justificante_path);
            }
            $datos['justificante_path'] = $request->file('justificante')->store('licencias');
        }

        $licencia->update($datos);

        return redirect()->route('licencias.index');
    }

    public function cancelar(Request $request, HistorialDeLicencias $licencia): RedirectResponse
    {
        $this->verificarDuenio($request, $licencia);
        $this->verificarPendiente($licencia);

        $licencia->update(['estado' => 'cancelada']);

        return redirect()->route('licencias.index');
    }

    public function justificante(Request $request, HistorialDeLicencias $licencia)
    {
        $this->verificarDuenio($request, $licencia);

        abort_unless(
            $licencia->justificante_path && Storage::exists($licencia->justificante_path),
            404
        );

        return Storage::response($licencia->justificante_path);
    }

    private function reglas(Request $request, bool $tieneJustificante): array
    {
        $motivo = $request->input('motivo');
        $esFamiliar = $motivo === 'Familiar enfermo';
        $exigePdf = $motivo === 'Médico' && ! $tieneJustificante;

        return [
            'domicilio_calle' => ['required', 'string', 'max:120'],
            'domicilio_numero' => ['required', 'string', 'max:10'],
            'domicilio_localidad' => ['required', Rule::in(self::LOCALIDADES)],
            'motivo' => ['required', Rule::in(self::MOTIVOS)],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
            'dj_a_cargo' => [Rule::requiredIf($esFamiliar), 'nullable', 'string', 'max:150'],
            'dj_parentesco' => [Rule::requiredIf($esFamiliar), 'nullable', Rule::in(self::PARENTESCOS)],
            'dj_conformidad' => $esFamiliar ? ['accepted'] : ['nullable'],
            'justificante' => [
                Rule::requiredIf($exigePdf), 'nullable', 'file', 'mimes:pdf', 'max:5120',
            ],
        ];
    }

    private function datosParaGuardar(array $v): array
    {
        $esFamiliar = $v['motivo'] === 'Familiar enfermo';

        return [
            'tipo_licencia' => $v['motivo'],
            'fecha_inicio' => $v['fecha_inicio'],
            'fecha_fin' => $v['fecha_fin'],
            'domicilio_calle' => $v['domicilio_calle'],
            'domicilio_numero' => $v['domicilio_numero'],
            'domicilio_localidad' => $v['domicilio_localidad'],
            'dj_a_cargo' => $esFamiliar ? ($v['dj_a_cargo'] ?? null) : null,
            'dj_parentesco' => $esFamiliar ? ($v['dj_parentesco'] ?? null) : null,
            'dj_conformidad' => $esFamiliar,
        ];
    }

    private function verificarDuenio(Request $request, HistorialDeLicencias $licencia): void
    {
        abort_unless(
            (int) $licencia->agente_id === (int) $request->user()->agente_id,
            403
        );
    }

    private function verificarPendiente(HistorialDeLicencias $licencia): void
    {
        abort_unless(
            $licencia->estado === 'pendiente',
            403,
            'Solo se pueden modificar licencias pendientes.'
        );
    }
}