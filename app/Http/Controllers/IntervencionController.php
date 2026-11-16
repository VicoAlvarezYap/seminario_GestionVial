<?php

namespace App\Http\Controllers;

use App\Http\Requests\EmergenciaRequest;
use App\Models\Intervencion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Validation\Rule;


class IntervencionController extends Controller
<<<<<<< HEAD
{     private const TRANSICIONES = [
    'reportada' => ['en_curso', 'resuelta', 'derivada'],
    'en_curso' => ['resuelta', 'derivada'],
];
    private const TIPOS_AGENTE = ['accidente', 'infraccion', 'emergencia', 'otro'];
    /** Listado de emergencias (sin tarea) para supervisores y admin. */
   public function index(Request $request): Response
{
    $usuario = $request->user();

    // Administración: el listado de emergencias que ya tenía el controlador
    if ($usuario->hasAnyRole(['Administrador', 'Supervisor', 'admin', 'super-admin'])) {
        $intervenciones = Intervencion::with(['lugar:id,nombre', 'agentes:id,nombre,apellido', 'agenteReporta:id,nombre,apellido'])
            ->emergencias()
=======
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
>>>>>>> 3558c4aae40d54af468d8c42bafb84fdb28045ca
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

<<<<<<< HEAD
        return Inertia::render('Intervenciones/index', ['intervenciones' => $intervenciones]);
    }

    // Agente: solo las intervenciones en las que participa
    $agenteId = $usuario->agente_id;
    abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

    $intervenciones = Intervencion::with(['lugar:id,nombre', 'agentes:id,nombre,apellido'])
        ->where(function ($q) use ($agenteId) {
            $q->where('agente_reporta_id', $agenteId)
                ->orWhereHas('agentes', fn ($a) => $a->where('agentes.id', $agenteId));
        })
        ->orderByDesc('fecha_hora')
        ->get()
        ->map(fn (Intervencion $i) => [
            'id'                => $i->id,
            'fecha_hora'        => $i->fecha_hora->format('d/m/Y H:i'),
            'evento'            => $i->tipo_evento ?: ucfirst($i->tipo),
            'tipo'              => $i->tipo,
            'nivel_urgencia'    => $i->nivel_urgencia,
            'lugar'             => $i->lugar?->nombre ?? $i->ubicacion_direccion ?? '-',
            'descripcion'       => $i->descripcion,
            'estado_resolucion' => $i->estado_resolucion,
            'es_emergencia'     => $i->tarea_id === 'emergencia',
            'mi_rol'            => $i->agentes->firstWhere('id', $agenteId)?->pivot?->rol_en_intervencion,
            'siguientes'        => self::TRANSICIONES[$i->estado_resolucion] ?? [],
        ])
        ->values()
        ->all();

    return Inertia::render('Intervenciones/Asignadas', ['intervenciones' => $intervenciones,'tipos' => self::TIPOS_AGENTE,]);
}

    /** Registra una intervención (de una tarea o una emergencia). */
    public function store(IntervencionRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $agentes = collect($datos['agentes'] ?? []);
        unset($datos['agentes']);

        if (! empty($datos['tarea_id'])) {
            $tarea = Tarea::with('turno')->findOrFail($datos['tarea_id']);

            // Un agente solo puede registrar sobre sus propias tareas (admin y supervisor, sobre cualquiera)
            $this->autorizarSobreTarea($request, $tarea);

            $duenio = $tarea->turno->agente_id;
            $datos['agente_reporta_id'] ??= $duenio;

            if (! $agentes->contains('agente_id', $duenio)) {
                $agentes->prepend(['agente_id' => $duenio, 'rol_en_intervencion' => null]);
            }
        } else {
            // Las emergencias las carga personal con permiso, no cualquier agente
            abort_unless($request->user()->hasAnyRole(['Administrador', 'Supervisor']), 403);
        }

        DB::transaction(function () use ($datos, $agentes) {
            $intervencion = Intervencion::create($datos);
            $intervencion->agentes()->sync($this->paraPivote($agentes));
=======
            $intervencion->agentes()->attach($agenteId, ['rol_en_intervencion' => 'Reportante']);
>>>>>>> 3558c4aae40d54af468d8c42bafb84fdb28045ca
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
    /** El agente informa cómo va (o cómo terminó) una intervención en la que participa. */
public function informar(Request $request, Intervencion $intervencion): RedirectResponse
{
    $agenteId = $request->user()->agente_id;

    abort_unless(
        $agenteId && $this->participa($intervencion, (int) $agenteId),
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

    // La tabla tiene un solo campo de texto: el informe se agrega sin pisar lo que cargó el admin
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

private function participa(Intervencion $intervencion, int $agenteId): bool
{
    return (int) $intervencion->agente_reporta_id === $agenteId
        || $intervencion->agentes()->where('agentes.id', $agenteId)->exists();
}
public function pdf(Request $request, Intervencion $intervencion)
{
    $agenteId = (int) $request->user()->agente_id;

    abort_unless(
        $agenteId && (
            (int) $intervencion->agente_reporta_id === $agenteId
            || $intervencion->agentes()->where('agentes.id', $agenteId)->exists()
        ),
        403
    );

    return app(\App\Http\Controllers\Admin\IntervencionAdminController::class)->pdf($intervencion);
}
/** El agente registra una intervención por su cuenta, en cualquier momento. */
public function registrar(Request $request): RedirectResponse
{
    $agenteId = $request->user()->agente_id;
    abort_unless($agenteId, 403, 'Tu cuenta no está vinculada a un agente.');

    $v = $request->validate([
        'tipo' => ['required', Rule::in(self::TIPOS_AGENTE)],
        'tipo_evento' => ['nullable', 'string', 'max:100'],
        'cantidad' => ['nullable', 'integer', 'min:1', 'max:999'],
        'nivel_urgencia' => ['required', Rule::in(['baja', 'media', 'alta', 'critica'])],
        'ubicacion_direccion' => ['required', 'string', 'max:255'],
        'descripcion' => ['required', 'string', 'max:2000'],
    ]);

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
}