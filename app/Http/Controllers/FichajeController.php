<?php

namespace App\Http\Controllers;

use App\Http\Requests\RevisarFichajeRequest;
use App\Http\Requests\StoreFichajeRequest;
use App\Models\Fichaje;
use App\Models\TurnoTrabajo;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FichajeController extends Controller
{
    public function index(Request $request, TurnoTrabajo $turno): Response
    {
        $this->autorizarTurno($request, $turno);

        $turno->load('agente');

        return Inertia::render('Fichajes/Index', [
            'turno' => $turno,
            'fichajes' => $turno->fichajes()
                ->with(['registradaPor', 'revisadaPor'])
                ->orderBy('registrada_at')
                ->get(),
            'puedeGestionar' => $this->esDirector($request),
        ]);
    }

    /** Salidas anticipadas pendientes de revisión (solo gestores). */
    public function pendientes(Request $request): Response
    {
        abort_unless($this->esDirector($request), 403);

        return Inertia::render('Fichajes/Pendientes', [
            'fichajes' => Fichaje::salidasAnticipadas()
                ->pendientesDeRevision()
                ->with(['turnoTrabajo.agente', 'registradaPor'])
                ->latest('registrada_at')
                ->paginate(20)
                ->withQueryString(),
        ]);
    }

    //se registra una entrada o una salida
    public function store(StoreFichajeRequest $request, TurnoTrabajo $turno): RedirectResponse
    {
        $this->autorizarTurno($request, $turno);

        $user = $request->user();
        $esCargaManual = $this->esDirector($request) && $user->agente_id !== $turno->agente_id;

        $fichaje = DB::transaction(function () use ($request, $turno, $user, $esCargaManual) {
            // Bloqueo el turno para que dos pedidos simultáneos no dupliquen el fichaje
            $turno = TurnoTrabajo::whereKey($turno->id)->lockForUpdate()->firstOrFail();

            if ($turno->estaCerrado()) {
                $this->fallar('turno', 'El turno ya está cerrado, no admite más fichajes.');
            }

            // Hora del servidor; solo una carga manual puede indicar otra
            $registradaAt = ($esCargaManual && $request->filled('registrada_at'))
                ? Carbon::parse($request->input('registrada_at'))
                : now();

            $tipo = $request->input('tipo');
            $datos = [];

            if ($tipo === Fichaje::TIPO_ENTRADA) {
                if ($turno->fichajes()->entradas()->exists()) {
                    $this->fallar('tipo', 'Este turno ya tiene una entrada registrada.');
                }
            } else {
                if (! $turno->fichajes()->entradas()->exists()) {
                    $this->fallar('tipo', 'No se puede registrar una salida sin una entrada previa.');
                }
                if ($turno->fichajes()->salidas()->exists()) {
                    $this->fallar('tipo', 'Este turno ya tiene una salida registrada.');
                }

                $datos = $this->datosDeSalida($request, $turno, $registradaAt);
                $tipo = $datos['tipo'];
                unset($datos['tipo']);
            }

            return $turno->fichajes()->create([
                'tipo'              => $tipo,
                'registrada_at'     => $registradaAt,
                'origen'            => $request->input('origen', Fichaje::ORIGEN_WEB),
                'ip'                => $request->ip(),
                'registrada_por'    => $user->agente_id,
                'foto_path'         => $request->file('foto')?->store(
                    "fichajes/{$turno->id}",
                    config('fichaje.disco_fotos')
                ),
                'motivo_correccion' => $esCargaManual ? $request->input('motivo_correccion') : null,
                ...$this->datosDeGeolocalizacion($request),
                ...$datos,
            ]);

        });

        $mensaje = match ($fichaje->tipo) {
            Fichaje::TIPO_ENTRADA           => 'Entrada registrada correctamente.',
            Fichaje::TIPO_SALIDA_ANTICIPADA => 'Salida anticipada registrada. Quedó pendiente de revisión.',
            default                         => 'Salida registrada correctamente.',
        };

        $redirect = back()->with('success', $mensaje);

        return $fichaje->dentro_de_zona === false
            ? $redirect->with('warning', 'Fichaste fuera de la zona de trabajo.')
            : $redirect;
    }
    //Un director puede negar un rechar una salida 
    public function revisar(RevisarFichajeRequest $request, Fichaje $fichaje): RedirectResponse
    {
        if (! $fichaje->esSalidaAnticipada()) {
            $this->fallar('fichaje', 'Solo las salidas anticipadas se revisan.');
        }

        if ($fichaje->estaRevisada()) {
            $this->fallar('fichaje', 'Este fichaje ya fue revisado.');
        }

        $fichaje->update([
            'estado_revision'     => $request->input('estado_revision'),
            'comentario_revision' => $request->input('comentario_revision'),
            'revisada_por'        => $request->user()->agente_id,
            'revisada_at'         => now(),
        ]);

        return back()->with('success', 'Revisión guardada.');
    }

        private function esDirector(Request $request): bool
    {
        return $request->user()->hasAnyRole(['Administrador', 'Supervisor']);
    }

    
    private function autorizarTurno(Request $request, TurnoTrabajo $turno): void
    {
        abort_unless(
            $this->esDirector($request) || $request->user()->agente_id === $turno->agente_id,
            403
        );
    }

    private function datosDeSalida(StoreFichajeRequest $request, TurnoTrabajo $turno, Carbon $registradaAt): array
    {
        $limite = $turno->finProgramado()->subMinutes(config('fichaje.tolerancia_salida_min'));

        if ($registradaAt->greaterThanOrEqualTo($limite)) {
            return ['tipo' => Fichaje::TIPO_SALIDA];
        }

        $motivo = $request->input('motivo_salida');

        if (! $motivo) {
            $this->fallar('motivo_salida', 'Salís antes del horario: indicá el motivo de la salida anticipada.');
        }

        if ($motivo === 'otro' && ! $request->filled('observacion')) {
            $this->fallar('observacion', 'Si el motivo es "otro", describilo en la observación.');
        }

        return [
            'tipo'            => Fichaje::TIPO_SALIDA_ANTICIPADA,
            'motivo_salida'   => $motivo,
            'observacion'     => $request->input('observacion'),
            'estado_revision' => Fichaje::REVISION_PENDIENTE,
        ];
    }

    private function datosDeGeolocalizacion(StoreFichajeRequest $request): array
    {
        if (! $request->filled('latitud')) {
            return [
                'latitud' => null, 'longitud' => null, 'precision_m' => null,
                'dentro_de_zona' => null, 'distancia_zona_m' => null,
            ];
        }

        $zona = config('fichaje.zona');
        $distancia = $this->distanciaEnMetros(
            (float) $request->input('latitud'),
            (float) $request->input('longitud'),
            $zona['latitud'],
            $zona['longitud'],
        );

        return [
            'latitud'          => $request->input('latitud'),
            'longitud'         => $request->input('longitud'),
            'precision_m'      => $request->input('precision_m'),
            'dentro_de_zona'   => $distancia <= $zona['radio_m'],
            'distancia_zona_m' => (int) round($distancia),
        ];
    }

    
    private function distanciaEnMetros(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $radioTierra = 6371000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $radioTierra * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function fallar(string $campo, string $mensaje): never
    {
        throw ValidationException::withMessages([$campo => $mensaje]);
    }
}