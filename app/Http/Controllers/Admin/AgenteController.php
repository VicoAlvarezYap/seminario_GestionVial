<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAgenteRequest;
use App\Http\Requests\UpdateAgenteRequest;
use App\Models\Agente;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\HistorialLaboral;

class AgenteController extends Controller
{
    public function index(Request $request): Response
    {
        $buscar = trim((string) $request->query('buscar', ''));

        $agentes = Agente::query()
            ->when($buscar !== '', function ($query) use ($buscar) {
                $query->where(function ($q) use ($buscar) {
                    $q->where('nombre', 'like', "%{$buscar}%")
                        ->orWhere('apellido', 'like', "%{$buscar}%")
                        ->orWhere('numero_documento', 'like', "%{$buscar}%")
                        ->orWhere('id', $buscar); // búsqueda por legajo
                });
            })
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('agentes/index', [
            'agentes' => $agentes,
            'filtros' => ['buscar' => $buscar],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('agentes/create');
    }

    public function store(StoreAgenteRequest $request): RedirectResponse
    {
        $d = $request->validated();

        DB::transaction(function () use ($d) {
            $agente = Agente::create([
                'nombre' => $d['nombre'],
                'apellido' => $d['apellido'],
                'numero_documento' => $d['numero_documento'],
                'domicilio' => $d['domicilio'] ?? null,
                'rango' => $d['rango'],
                'celular' => $d['celular'] ?? null,
                'correo' => $d['email'],
            ]);

            $usuario = new User([
                'name' => "{$agente->nombre} {$agente->apellido}",
                'email' => $d['email'],
                'password' => Hash::make($d['password']),
                'agente_id' => $agente->id,
                'activo' => true,
            ]);
            $usuario->email_verified_at = now();
            $usuario->save();
            HistorialLaboral::create([
                'agente_id' => $agente->id,
                'fecha_alta' => now()->toDateString(),
            ]);

            $usuario->assignRole(Agente::rolParaRango($d['rango']));
        });

        return back()->with('success', 'Agente creado correctamente.');
    }

    public function edit(Agente $agente): Response
    {
        $agente->load('contactosEmergencia');

        return Inertia::render('agentes/edit', [
            'agente' => $agente,
        ]);
    }
    public function show(Request $request, ?Agente $agente = null): Response
    {
        $usuario = $request->user();
        $esAdmin = $usuario->hasAnyRole(['Administrador', 'Supervisor']);
        $esPropio = $agente === null || $agente->id === $usuario->agente_id;

        if ($agente === null) {
            $agente = $usuario->agente;
            abort_unless($agente, 404, 'Tu cuenta no está vinculada a un agente.');
        }
        $puedeGestionar = $esAdmin && !$esPropio;

        $agente->load('contactosEmergencia');
        if ($puedeGestionar) {
            $agente->load('historialLaboral');
        }
        abort_unless($esPropio || $esAdmin, 403);


        return Inertia::render('Agentes/Perfil', [
            'agente' => [
                'id' => $agente->id,
                'nombre' => $agente->nombre,
                'apellido' => $agente->apellido,
                'numero_documento' => $agente->numero_documento,
                'domicilio' => $agente->domicilio,
                'rango' => $agente->rango,
                'celular' => $agente->celular,
                'correo' => $agente->correo,
                'contactos_emergencia' => $agente->contactosEmergencia,
                'historial' => $puedeGestionar
                    ? $agente->historialLaboral->map(fn($h) => [
                        'id' => $h->id,
                        'fecha_alta' => $h->fecha_alta->format('d/m/Y'),
                        'fecha_baja' => $h->fecha_baja?->format('d/m/Y'),
                        'motivo_ingreso' => $h->motivo_ingreso,
                        'motivo_egreso' => $h->motivo_egreso,
                    ])->values()
                    : [],
                'activo' => $puedeGestionar
                    ? $agente->historialLaboral->contains(fn($h) => $h->fecha_baja === null)
                    : true,
            ],
            'esPropio' => $esPropio,
            'puedeGestionar' => $puedeGestionar,
        ]);
    }

    public function update(UpdateAgenteRequest $request, Agente $agente): RedirectResponse
    {
        $datos = $request->validated();
        $contactos = $datos['contactos'] ?? [];
        unset($datos['contactos']);

        DB::transaction(function () use ($agente, $datos, $contactos) {
            $agente->update($datos);

            // Se reemplazan los contactos por los enviados en el formulario
            $agente->contactosEmergencia()->delete();
            $agente->contactosEmergencia()->createMany($contactos);
        });

        return redirect()->route('agentes.index')
            ->with('success', 'Agente actualizado correctamente.');
    }

    public function destroy(Agente $agente): RedirectResponse
    {
        try {
            $agente->delete();
        } catch (QueryException $e) {
            // Tiene relevos, emergencias u otros registros asociados
            return back()->with('error', 'No se puede eliminar el agente porque tiene registros asociados.');
        }

        return redirect()->route('agentes.index')
            ->with('success', 'Agente eliminado correctamente.');
    }
}
