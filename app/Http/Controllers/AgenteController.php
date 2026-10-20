<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAgenteRequest;
use App\Http\Requests\UpdateAgenteRequest;
use App\Models\Agente;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

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
        $datos = $request->validated();
        $contactos = $datos['contactos'] ?? [];
        unset($datos['contactos']);

        DB::transaction(function () use ($datos, $contactos) {
            $agente = Agente::create($datos);
            $agente->contactosEmergencia()->createMany($contactos);
        });

        return redirect()->route('agentes.index')
            ->with('success', 'Agente creado correctamente.');
    }

    public function edit(Agente $agente): Response
    {
        $agente->load('contactosEmergencia');

        return Inertia::render('agentes/edit', [
            'agente' => $agente,
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
