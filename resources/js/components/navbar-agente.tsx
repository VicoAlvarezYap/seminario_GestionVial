import { Link, router, usePage } from '@inertiajs/react';
import { icon } from 'leaflet';
import { LayoutGrid, LogOut, Menu, UserRound, X, FileText, AlertTriangle, ClipboardList, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';



// Para agregar más opciones al menú, sumá una línea acá
const enlaces = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid, soloAgente: false },
    { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound, soloAgente: false },
    { titulo: 'Licencias', href: '/licencias', icono: FileText, soloAgente: true },
    { titulo: 'Relevos', href: '/relevos', icono: ClipboardList, soloAgente: true },
    { titulo: 'Intervenciones de emergencia', href: '/intervenciones', icono: AlertTriangle, soloAgente: true },
    { titulo: 'Licencias', href: '/admin/licencias', icono: ClipboardCheck, soloAdmin: true },
    { titulo: 'Relevos', href: '/admin/relevos', icono: ClipboardList, soloAdmin: true },
    { titulo: 'Perfiles', href: '/admin/perfiles', icono: UserRound, soloAdmin: true }, // <-- ¡Agregado aquí!
];


export default function NavbarAgente() {
    const [abierto, setAbierto] = useState(false);
    //para restringir paginas segun el user
    const { url, props } = usePage();
    const { auth } = usePage<{ auth: { esAdmin: boolean } }>().props;
    const roles = (props as unknown as { auth?: { roles?: string[] } }).auth?.roles ?? [];
    const tieneRol = (nombres: string[]) =>
        roles.some((r) => nombres.includes(r.toLowerCase()));

    const esAgente = tieneRol(['agente']);
    const esAdmin = tieneRol(['admin', 'super-admin', 'administrador']);

    const visibles = enlaces.filter((e) => (!e.soloAgente || esAgente) && (!e.soloAdmin || esAdmin),);

    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            <div className="relative flex h-14 items-center justify-between px-4">
                {/* Izquierda: botón de menú */}
                <button
                    type="button"
                    onClick={() => setAbierto(!abierto)}
                    aria-label="Abrir menú"
                    className="rounded-md p-2 hover:bg-muted"
                >
                    {abierto ? (
                        <X className="size-5" />
                    ) : (
                        <Menu className="size-5" />
                    )}
                </button>

                {/* Centro: nombre del sistema */}
                <span className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
                    Gestion Vial
                </span>

                {/* Derecha: cerrar sesión */}
                <button
                    type="button"
                    onClick={() => router.post('/logout')}
                    aria-label="Cerrar sesión"
                    className="rounded-md p-2 hover:bg-muted"
                >
                    <LogOut className="size-5" />
                </button>
            </div>

            {/* Menú desplegable */}
            {abierto && (
                <nav className="flex flex-col gap-1 border-t p-2">
                    {visibles.map((e) => (
                        <Link
                            key={e.href}
                            href={e.href}
                            onClick={() => setAbierto(false)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted ${url.startsWith(e.href)
                                    ? 'bg-muted font-medium'
                                    : ''
                                }`}
                        >
                            <e.icono className="size-4" />
                            {e.titulo}
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-red-600 hover:bg-muted"
                    >
                        <LogOut className="size-4" />
                        Cerrar sesión
                    </button>
                </nav>
            )}
        </header>
    );
}