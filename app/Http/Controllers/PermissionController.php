<?php
namespace App\Http\Controllers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
class PermissionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('permissions/index', [
            'permissions' => Permission::get([
                'id',
                'name',
                'guard_name',
                'created_at'
            ])
        ]);
    }
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
            'guard_name' => 'nullable|string|max:255'
        ]);
        // Por defecto usamos el guard web si no se especifica
        $validated['guard_name'] = $validated['guard_name'] ?? 'web';
        Permission::create($validated);
        return redirect()->route('permissions.index')->with('success', 'Permiso
creado correctamente.');
    }
    public function update(
        Request $request,
        Permission $permission
    ): RedirectResponse {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,' .
                $permission->id,
        ]);
        $permission->update($validated);
        return redirect()->route('permissions.index')->with('success', 'Permiso
actualizado correctamente.');
    }
    public function destroy(Permission $permission): RedirectResponse
    {
        $permission->delete();
        return redirect()->route('permissions.index')->with('success', 'Permiso
eliminado correctamente.');
    }
}