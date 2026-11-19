import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    ChevronDown,
    ClipboardCheck,
    ClipboardList,
    FileText,
    LayoutGrid,
    LogOut,
    Menu,
    Settings,
    UserRound,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Enlace = {
    titulo: string;
    href: string;
    icono: LucideIcon;
    admin?: boolean; 
    soloAgente?: boolean; 
};
type Grupo = { clave: string; titulo: string; icono: LucideIcon; enlaces: Enlace[] };
type Item = { tipo: 'enlace'; enlace: Enlace } | { tipo: 'grupo'; grupo: Grupo };

type PropsAuth = { auth?: { roles?: string[]; tieneAgente?: boolean } };


const SIN_LEGAJO_PERMITIDOS = ['/pagina_principal', '/reportes'];

const MENU: Item[] = [
    { tipo: 'enlace', enlace: { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid } },
    { tipo: 'enlace', enlace: { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound } },
    {
        tipo: 'grupo',
        grupo: {
            clave: 'trabajo',
            titulo: 'Mi trabajo',
            icono: ClipboardCheck,
            enlaces: [
                { titulo: 'Mis reportes', href: '/reportes', icono: ClipboardCheck },
                { titulo: 'Intervenciones', href: '/intervenciones', icono: AlertTriangle },
                { titulo: 'Infracciones', href: '/relevos', icono: ClipboardList },
                { titulo: 'Licencias', href: '/licencias', icono: FileText },
            ],
        },
    },
    {
        tipo: 'grupo',
        grupo: {
            clave: 'turnos',
            titulo: 'Turnos',
            icono: CalendarDays,
            enlaces: [
                { titulo: 'Ver turnos', href: '/turnos/listado', icono: CalendarDays, soloAgente: true },
                { titulo: 'Mi historial de turnos', href: '/mi-historial-turnos', icono: CalendarDays, soloAgente: true },
                // Admi
                { titulo: 'Ver turnos', href: '/admin/turnos/listado', icono: CalendarDays, admin: true },
                { titulo: 'Gestión de turnos', href: '/admin/turnos', icono: FileText, admin: true },
                { titulo: 'Historial de turnos', href: '/admin/turnos/historial', icono: CalendarDays, admin: true },
            ],
        },
    },
    {
        tipo: 'grupo',
        grupo: {
            clave: 'admin',
            titulo: 'Administración',
            icono: Users,
            enlaces: [
                { titulo: 'Agentes', href: '/admin/perfiles', icono: Users, admin: true },
                { titulo: 'Gestión de infracciones', href: '/admin/relevos', icono: ClipboardList, admin: true },
                { titulo: 'Gestión de intervenciones', href: '/admin/intervenciones', icono: AlertTriangle, admin: true },
            ],
        },
    },
];

export default function NavbarAgente() {
    const [menuMovil, setMenuMovil] = useState(false);
    const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
    const headerRef = useRef<HTMLElement>(null);
    const { url, props } = usePage();
    const auth = (props as unknown as PropsAuth).auth;

    const roles = (auth?.roles ?? []).map((r) => r.toLowerCase());
    const esAdmin = roles.some((r) => ['admin', 'super-admin', 'administrador'].includes(r));
    const esSupervisor = roles.includes('supervisor');
    const tieneAgente = auth?.tieneAgente ?? false;

   
    useEffect(() => {
        const alClic = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setGrupoAbierto(null);
            }
        };
        const alTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setGrupoAbierto(null);
            }
        };
        document.addEventListener('mousedown', alClic);
        document.addEventListener('keydown', alTecla);
        return () => {
            document.removeEventListener('mousedown', alClic);
            document.removeEventListener('keydown', alTecla);
        };
    }, []);

    const visible = (e: Enlace) => {
        if (e.admin) {
            return esAdmin;
        }
        if (e.soloAgente) {
            return !esAdmin && tieneAgente;
        }
        if (tieneAgente) {
            return true;
        }
        return (esAdmin || esSupervisor) && SIN_LEGAJO_PERMITIDOS.includes(e.href);
    };

    
    const items: Item[] = MENU.flatMap((item): Item[] => {
        if (item.tipo === 'enlace') {
            return visible(item.enlace) ? [item] : [];
        }
        const enlaces = item.grupo.enlaces.filter(visible);
        if (enlaces.length === 0) {
            return [];
        }
        if (enlaces.length === 1) {
            return [{ tipo: 'enlace', enlace: enlaces[0] }];
        }
        return [{ tipo: 'grupo', grupo: { ...item.grupo, enlaces } }];
    });

    
    const todos = items.flatMap((i) => (i.tipo === 'enlace' ? [i.enlace] : i.grupo.enlaces));
    const hrefActivo = todos
        .filter((e) => url === e.href || url.startsWith(`${e.href}/`) || url.startsWith(`${e.href}?`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
    const activo = (href: string) => href === hrefActivo;

    const cerrarTodo = () => {
        setMenuMovil(false);
        setGrupoAbierto(null);
    };

    const enlaceEscritorio = (e: Enlace) => (
        <Link
            key={e.href}
            href={e.href}
            className={`hover:bg-muted flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                activo(e.href) ? 'bg-muted font-medium' : ''
            }`}
        >
            <e.icono className="size-4" />
            {e.titulo}
        </Link>
    );

    const enlaceMovil = (e: Enlace) => (
        <Link
            key={e.href}
            href={e.href}
            onClick={cerrarTodo}
            className={`hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 ${
                activo(e.href) ? 'bg-muted font-medium' : ''
            }`}
        >
            <e.icono className="size-4" />
            {e.titulo}
        </Link>
    );

    return (
        <header ref={headerRef} className="bg-background sticky top-0 z-40 border-b">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
                {/* Izquierda: hamburguesa (solo celular) + título */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMenuMovil(!menuMovil)}
                        aria-label="Abrir menú"
                        aria-expanded={menuMovil}
                        className="hover:bg-muted rounded-md p-2 md:hidden"
                    >
                        {menuMovil ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                    <Link href="/pagina_principal" className="whitespace-nowrap text-lg font-semibold">
                        Gestion Vial
                    </Link>
                </div>

                {/* Menu de solo escritorio */}
                <nav className="hidden items-center gap-1 md:flex">
                    {items.map((item) => {
                        if (item.tipo === 'enlace') {
                            return enlaceEscritorio(item.enlace);
                        }

                        const { grupo } = item;
                        const abierto = grupoAbierto === grupo.clave;
                        const grupoActivo = grupo.enlaces.some((e) => activo(e.href));

                        return (
                            <div key={grupo.clave} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setGrupoAbierto(abierto ? null : grupo.clave)}
                                    aria-haspopup="menu"
                                    aria-expanded={abierto}
                                    className={`hover:bg-muted flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                                        grupoActivo || abierto ? 'bg-muted font-medium' : ''
                                    }`}
                                >
                                    <grupo.icono className="size-4" />
                                    {grupo.titulo}
                                    <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                                </button>

                                {abierto && (
                                    <div
                                        role="menu"
                                        onClick={() => setGrupoAbierto(null)}
                                        className="bg-background absolute left-0 top-full z-50 mt-1 flex min-w-56 flex-col gap-0.5 rounded-md border p-1 shadow-md"
                                    >
                                        {grupo.enlaces.map(enlaceEscritorio)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Iconos de la derecha*/}
                <div className="flex items-center gap-1">
                    <span className="p-2" aria-hidden="true">
                        <Bell className="size-5" />
                    </span>

                    <Link
                        href="/settings/profile"
                        aria-label="Configuración"
                        className="hover:bg-muted hidden rounded-md p-2 md:inline-flex"
                    >
                        <Settings className="size-5" />
                    </Link>

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

            {/* Para Celu */}
            {menuMovil && (
                <nav className="flex flex-col gap-1 border-t p-2 md:hidden">
                    {items.map((item) =>
                        item.tipo === 'enlace' ? (
                            enlaceMovil(item.enlace)
                        ) : (
                            <div key={item.grupo.clave} className="mt-2 flex flex-col gap-1 border-t pt-2">
                                <p className="text-muted-foreground px-3 text-xs font-semibold uppercase">
                                    {item.grupo.titulo}
                                </p>
                                {item.grupo.enlaces.map(enlaceMovil)}
                            </div>
                        ),
                    )}

                    <Link
                        href="/settings/profile"
                        onClick={cerrarTodo}
                        className="hover:bg-muted mt-2 flex items-center gap-2 rounded-md border-t px-3 py-2 pt-3"
                    >
                        <Settings className="size-4" />
                        Configuración
                    </Link>

                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-left text-red-600"
                    >
                        <LogOut className="size-4" />
                        Cerrar sesión
                    </button>
                </nav>
            )}
        </header>
    );
}