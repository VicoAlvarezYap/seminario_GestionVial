import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    ClipboardCheck,
    ClipboardList,
    FileText,
    LayoutGrid,
    LogOut,
    Menu,
    UserRound,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

type Enlace = { titulo: string; href: string; icono: LucideIcon };

type PropsAuth = { auth?: { roles?: string[]; tieneAgente?: boolean } };

// Lo personal: cualquiera con legajo (agentes, supervisores y el director)
const enlacesPersonales: Enlace[] = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid },
    { titulo: 'Mis reportes', href: '/reportes', icono: ClipboardCheck },
    { titulo: 'Intervenciones', href: '/intervenciones', icono: AlertTriangle },
    { titulo: 'Infracciones', href: '/relevos', icono: ClipboardList },
    { titulo: 'Licencias', href: '/licencias', icono: FileText },
    { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound },
];

// Solo el rol Administrador
const enlacesAdmin: Enlace[] = [
    { titulo: 'Agentes', href: '/admin/perfiles', icono: Users },
    { titulo: 'Gestión de licencias', href: '/admin/licencias', icono: FileText },
    { titulo: 'Gestión de infracciones', href: '/admin/relevos', icono: ClipboardList },
    { titulo: 'Gestión de intervenciones', href: '/admin/intervenciones', icono: AlertTriangle },
];

export default function NavbarAgente() {
    const [abierto, setAbierto] = useState(false);
    const { url, props } = usePage();
    const auth = (props as unknown as PropsAuth).auth;

    const roles = (auth?.roles ?? []).map((r) => r.toLowerCase());
    const esAdmin = roles.some((r) => ['admin', 'super-admin', 'administrador'].includes(r));
    const esSupervisor = roles.includes('supervisor');
    const tieneAgente = auth?.tieneAgente ?? false;

    // Un administrador o supervisor sin legajo igual necesita "Inicio" y "Mis reportes" (ve los de todos)
    const personales = enlacesPersonales.filter((e) => {
        if (tieneAgente) {
            return true;
        }
        return (esAdmin || esSupervisor) && ['/pagina_principal', '/reportes'].includes(e.href);
    });

    const administracion = esAdmin ? enlacesAdmin : [];
    const hayDosGrupos = personales.length > 0 && administracion.length > 0;

    const activo = (href: string) => url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);

    const renderEnlace = (e: Enlace) => (
        <Link
            key={e.href}
            href={e.href}
            onClick={() => setAbierto(false)}
            className={`hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 ${activo(e.href) ? 'bg-muted font-medium' : ''}`}
        >
            <e.icono className="size-4" />
            {e.titulo}
        </Link>
    );

    return (
        <header className="bg-background sticky top-0 z-40 border-b">
            <div className="relative flex h-14 items-center justify-between px-4">
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    aria-label="Abrir menú"
                    className="hover:bg-muted rounded-md p-2"
                >
                    {abierto ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>

                <span className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Gestion Vial</span>

                {/* Derecha: campana (solo ícono) + cerrar sesión */}
                <div className="flex items-center gap-1">
                    <span className="p-2" aria-hidden="true">
                        <Bell className="size-5" />
                    </span>

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        aria-label="Cerrar sesión"
                        className="hover:bg-muted rounded-md p-2"
                    >
                        <LogOut className="size-5" />
                    </button>
                </div>
            </div>

            {abierto && (
                <nav className="flex flex-col gap-1 border-t p-2">
                    {hayDosGrupos && (
                        <p className="text-muted-foreground px-3 pt-1 text-xs font-semibold uppercase">Mi trabajo</p>
                    )}
                    {personales.map(renderEnlace)}

                    {administracion.length > 0 && (
                        <>
                            {hayDosGrupos && (
                                <p className="text-muted-foreground mt-2 border-t px-3 pt-3 text-xs font-semibold uppercase">
                                    Administración
                                </p>
                            )}
                            {administracion.map(renderEnlace)}
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="hover:bg-muted mt-1 flex items-center gap-2 rounded-md border-t px-3 py-2 pt-3 text-left text-red-600"
                    >
                        <LogOut className="size-4" />
                        Cerrar sesión
                    </button>
                </nav>
            )}
        </header>
    );
}