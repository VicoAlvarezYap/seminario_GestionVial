<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Agente;
use App\Models\Rol;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $usuarios = User::with(['rol:id,nombre', 'agente:id,nombre,apellido'])
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('usuarios/index', [
            'usuarios' => $usuarios,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('usuarios/create', [
            'roles' => Rol::orderBy('nombre')->get(['id', 'nombre']),
            // Solo agentes que todavía no tienen cuenta
            'agentes' => Agente::whereDoesntHave('usuario')
                ->orderBy('apellido')->orderBy('nombre')
                ->get(['id', 'nombre', 'apellido']),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $datos = $request->validated();
        $datos['activo'] = $request->boolean('activo', true);

        // El cast 'hashed' del modelo User encripta la contraseña
        User::create($datos);

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario creado correctamente.');
    }

    public function edit(User $usuario): Response
    {
        return Inertia::render('usuarios/edit', [
            'usuario' => $usuario->only(['id', 'name', 'email', 'rol_id', 'agente_id', 'activo']),
            'roles' => Rol::orderBy('nombre')->get(['id', 'nombre']),
            // Agentes sin cuenta + el agente de este usuario
            'agentes' => Agente::whereDoesntHave('usuario')
                ->orWhere('id', $usuario->agente_id)
                ->orderBy('apellido')->orderBy('nombre')
                ->get(['id', 'nombre', 'apellido']),
        ]);
    }

    public function update(UpdateUserRequest $request, User $usuario): RedirectResponse
    {
        $datos = $request->validated();
        $datos['activo'] = $request->boolean('activo', true);

        // Si la contraseña viene vacía, se mantiene la actual
        if (empty($datos['password'])) {
            unset($datos['password']);
        }

        $usuario->update($datos);

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy(Request $request, User $usuario): RedirectResponse
    {
        if ($request->user()->is($usuario)) {
            return back()->with('error', 'No podés eliminar tu propia cuenta desde acá.');
        }

        $usuario->delete();

        return redirect()->route('usuarios.index')
            ->with('success', 'Usuario eliminado correctamente.');
    }
}
