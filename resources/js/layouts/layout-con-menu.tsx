import { router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import BuscadorAcciones from '@/components/buscador-acciones';
import { accionesVisibles } from '@/components/acciones';
import NavbarAgente from '@/components/navbar-agente';
import { useAppearance } from '@/hooks/use-appearance';

type PageProps = {
    modo?: 'agente' | 'admin';
    puedeCambiarModo?: boolean;
    auth?: { roles?: string[]; tieneAgente?: boolean };
};

export default function LayoutConMenu({ children }: PropsWithChildren) {
    const { props } = usePage<PageProps>();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const oscuro = resolvedAppearance === 'dark';

    const roles = (props.auth?.roles ?? []).map((r) => r.toLowerCase());
    const esAdmin = roles.some((r) => ['admin', 'super-admin', 'administrador'].includes(r));
    const esGestor = esAdmin || roles.includes('supervisor');
    const modo = props.modo === 'admin' && esAdmin ? 'admin' : 'agente';

    const [abiertoMovil, setAbiertoMovil] = useState(false);

    const acciones = accionesVisibles(modo, { tieneAgente: props.auth?.tieneAgente ?? false, esGestor });

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background px-4">
    {/* Izquierda: menú móvil (el buscador ya no va acá) */}
<div className="flex items-center justify-start">
    <button
        type="button"
        onClick={() => setAbiertoMovil((v) => !v)}
        aria-label="Abrir menú"
        className="rounded-lg p-2 hover:bg-accent md:hidden"
    >
        <Menu className="size-5" />
    </button>
</div>

{/* Centro: título */}
<span className="whitespace-nowrap text-lg font-semibold">Gestion Vial</span>

{/* Derecha: buscador, modo y controles */}
<div className="flex items-center justify-end gap-2">
    <div className="hidden w-48 md:block lg:w-64">
        <BuscadorAcciones acciones={acciones} />
    </div>

    {props.puedeCambiarModo && (
        <div role="tablist" aria-label="Modo" className="flex rounded-full border bg-muted p-0.5 text-sm font-medium">
            {(['agente', 'admin'] as const).map((m) => {
                const activo = modo === m;
                return (
                    <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={activo}
                        disabled={activo}
                        onClick={() => router.post('/cambiar-modo', { modo: m })}
                        className={`rounded-full px-4 py-1 transition-colors ${
                            activo ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {m === 'agente' ? 'Agente' : 'Admin'}
                    </button>
                );
            })}
        </div>
    )}

    <button
        type="button"
        onClick={() => updateAppearance(oscuro ? 'light' : 'dark')}
        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="flex size-9 items-center justify-center rounded-full border hover:bg-accent"
    >
        {oscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>


    <button
        type="button"
        onClick={() => router.post('/logout')}
        aria-label="Cerrar sesión"
        className="rounded-lg p-2 hover:bg-accent"
    >
        <LogOut className="size-5" />
    </button>
</div>
   
</header>

            <div className="flex">
                <NavbarAgente abiertoMovil={abiertoMovil} onCerrarMovil={() => setAbiertoMovil(false)} />
                <main className="min-w-0 flex-1">{children}</main>
            </div>
        </div>
    );
}