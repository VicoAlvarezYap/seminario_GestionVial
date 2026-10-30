import { Link, router, usePage } from '@inertiajs/react';
import { LayoutGrid, LogOut, Menu, UserRound, X,FileText,AlertTriangle } from 'lucide-react';
import { useState } from 'react';

// Para agregar más opciones al menú, sumá una línea acá
const enlaces = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid },
    { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound },
    {titulo: 'Licencias',href:'/licencias', icono:FileText},
    {titulo:'Relevos', href:'/relevos',icono:FileText},
    {titulo:'Intervencion de emergencias', href:'/intervenciones',icono:AlertTriangle}
];

export default function NavbarAgente() {
    const [abierto, setAbierto] = useState(false);
    const { url } = usePage();

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
                <span className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
                    Gestion Vial
                </span>

                {/* Cerrar sesion */}
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
                    {enlaces.map((e) => (
                        <Link
                            key={e.href}
                            href={e.href}
                            onClick={() => setAbierto(false)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted ${
                                url.startsWith(e.href)
                                    ? 'bg-muted font-medium'
                                    : ''
                            }`}
                        >
                            <e.icono className="size-4" />
                            {e.titulo}
                        </Link>
                    ))}
                </nav>
            )}
        </header>
    );
}
