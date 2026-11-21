import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    FileText,
    LayoutGrid,
    LogOut,
    Menu,
    Moon,
    Settings,
    Sun,
    ArrowLeftRight,
    UserRound,
    Users 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';

type Enlace = { titulo: string; href: string; icono: LucideIcon };

type PageProps = {
    auth?: { roles?: string[]; tieneAgente?: boolean };
    modo?: 'agente' | 'admin';
    puedeCambiarModo?: boolean;
};

const personales: Enlace[] = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid },
    { titulo: 'Mis reportes', href: '/reportes', icono: ClipboardCheck },
    { titulo: 'Intervenciones', href: '/intervenciones', icono: AlertTriangle },
    { titulo: 'Infracciones', href: '/relevos', icono: ClipboardList },
    { titulo: 'Licencias', href: '/licencias', icono: FileText },
    { titulo: 'Historial de turnos', href: '/mi-historial-turnos', icono: CalendarDays },
    { titulo: 'Eventos', href: '/eventos', icono: CalendarDays },
];

const administracion: Enlace[] = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid },
    { titulo: 'Agentes', href: '/admin/perfiles', icono: Users },
    { titulo: 'Gestión de turnos', href: '/admin/turnos', icono: CalendarDays },
    { titulo: 'Asignar tarea', href: '/admin/turnos/tareas', icono: ClipboardList },
    { titulo: 'Ver turnos', href: '/admin/turnos/listado', icono: CalendarDays },
    { titulo: 'Historial de turnos', href: '/admin/turnos/historial', icono: CalendarDays },
    { titulo: 'Reportes de turno', href: '/admin/reportes', icono: ClipboardCheck },
    { titulo: 'Gestión de licencias', href: '/admin/licencias', icono: FileText },
    { titulo: 'Gestión de infracciones', href: '/admin/relevos', icono: ClipboardList },
    { titulo: 'Gestión de intervenciones', href: '/admin/intervenciones', icono: AlertTriangle },
    { titulo: 'Eventos', href: '/eventos', icono: CalendarDays },
];

const cuenta: Enlace[] = [
    { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound },
    { titulo: 'Configuración', href: '/settings/profile', icono: Settings },
];

export default function NavbarAgente() {
    const { url, props } = usePage<PageProps>();
    const roles = (props.auth?.roles ?? []).map((r) => r.toLowerCase());
    const esAdmin = roles.some((r) => ['admin', 'super-admin', 'administrador'].includes(r));
    const esSupervisor = roles.includes('supervisor');
    const tieneAgente = props.auth?.tieneAgente ?? false;

    // El modo solo puede ser admin si el usuario realmente tiene rol de administración
    const modo = props.modo === 'admin' && esAdmin ? 'admin' : 'agente';

    const { resolvedAppearance, updateAppearance } = useAppearance();
    const oscuro = resolvedAppearance === 'dark';

    const [expandido, setExpandido] = useState(() => localStorage.getItem('menu-expandido') === 'true');
    const [abiertoMovil, setAbiertoMovil] = useState(false);

    const alternarMenu = () => {
        setExpandido((v) => {
            localStorage.setItem('menu-expandido', String(!v));
            return !v;
        });
    };

    // En modo agente: lo personal (con legajo, o Inicio y Mis reportes para admin/supervisor sin legajo)
    const listaPersonal = tieneAgente
        ? personales
        : (esAdmin || esSupervisor)
          ? personales.filter((e) => ['/pagina_principal', '/reportes'].includes(e.href))
          : [];

    const mostrarTexto = expandido || abiertoMovil;

    const activo = (href: string) => url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);

    const renderEnlace = (e: Enlace) => (
        <Link
            key={e.href}
            href={e.href}
            title={e.titulo}
            onClick={() => setAbiertoMovil(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent ${
                activo(e.href) ? 'bg-accent font-medium' : ''
            } ${mostrarTexto ? '' : 'justify-center'}`}
        >
            <e.icono className="size-4 shrink-0" />
            {mostrarTexto && <span className="truncate">{e.titulo}</span>}
        </Link>
    );

    const seccion = (titulo: string, items: Enlace[]) => (
        <div className="space-y-1">
            {mostrarTexto ? (
                <p className="px-3 pt-3 text-xs font-semibold uppercase text-muted-foreground">{titulo}</p>
            ) : (
                <div className="mx-3 my-2 border-t" />
            )}
            {items.map(renderEnlace)}
        </div>
    );

    return (
        <>
            {/* Barra superior */}
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
                <button
                    type="button"
                    onClick={() => setAbiertoMovil((v) => !v)}
                    aria-label="Abrir menú"
                    className="rounded-lg p-2 hover:bg-accent md:hidden"
                >
                    <Menu className="size-5" />
                </button>

                <span className="text-lg font-semibold">Gestion Vial</span>

                <div className="flex items-center gap-2">
                    {props.puedeCambiarModo && (
                        <button
                            type="button"
                            onClick={() => router.post('/cambiar-modo', { modo: modo === 'admin' ? 'agente' : 'admin' })}
                            className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium hover:bg-accent"
                        >
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                                <ArrowLeftRight className="size-3.5" />
                            </span>
                            {modo === 'admin' ? 'Modo agente' : 'Modo admin'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => updateAppearance(oscuro ? 'light' : 'dark')}
                        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        className="flex size-9 items-center justify-center rounded-full border hover:bg-accent"
                    >
                        {oscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </button>

                    <span className="flex size-9 items-center justify-center" aria-hidden="true">
                        <Bell className="size-5" />
                    </span>

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

            {/* Menú lateral colapsable: solo íconos, o íconos con texto */}
            <aside
                className={`fixed bottom-0 left-0 top-14 z-30 flex-col border-r bg-background transition-[width] duration-200 ${
                    abiertoMovil ? 'flex' : 'hidden'
                } md:flex ${expandido ? 'w-60' : 'w-16'}`}
            >
                <div className={`flex border-b p-2 ${expandido ? 'justify-end' : 'justify-center'}`}>
                    <button
                        type="button"
                        onClick={alternarMenu}
                        aria-label={expandido ? 'Contraer menú' : 'Expandir menú'}
                        className="hidden rounded-lg p-2 hover:bg-accent md:block"
                    >
                        {expandido ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                    {modo === 'agente' && listaPersonal.length > 0 && seccion('Mi trabajo', listaPersonal)}
                    {modo === 'admin' && seccion('Administración', administracion)}
                </nav>

                <div className="space-y-1 border-t p-2">{cuenta.map(renderEnlace)}</div>
            </aside>
        </>
    );
}