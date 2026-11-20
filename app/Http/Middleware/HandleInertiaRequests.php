<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user()?->getRoleNames() ?? [],   // lo que ya tenés
                'tieneAgente' => $request->user()?->agente_id !== null,
                
            ],
            'modo' => $this->modoActual($request),
            'puedeCambiarModo' => (bool) ($request->user()?->agente_id && $request->user()->hasAnyRole(['Administrador', 'Supervisor'])),
            'sidebarOpen' => !$request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'warning' => fn () => $request->session()->get('warning'),
                'error' => fn () => $request->session()->get('error'),
                'confirmar_seguir' => fn () => $request->session()->get('confirmar_seguir'),
            ],
        ];
    }
    private function modoActual(Request $request): string
{
    $usuario = $request->user();

    if (! $usuario) {
        return 'agente';
    }

    return $request->session()->get('modo', $usuario->agente_id ? 'agente' : 'admin');
}
}