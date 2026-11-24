import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ACCIONES, accionesVisibles, type Accion } from '@/components/acciones';

type Enlace = Accion;

type PageProps = {
    auth?: { roles?: string[]; tieneAgente?: boolean };
    modo?: 'agente' | 'admin';
};

// Estas van abajo del menú, separadas del resto
const PERFIL = ['/mi-perfil', '/settings/profile'];

export default function NavbarAgente({
    abiertoMovil = false,
    onCerrarMovil,
}: {
    abiertoMovil?: boolean;
    onCerrarMovil?: () => void;
}) {
    const { url, props } = usePage<PageProps>();
    const roles = (props.auth?.roles ?? []).map((r) => r.toLowerCase());
    const esAdmin = roles.some((r) => ['admin', 'super-admin', 'administrador'].includes(r));
    const esGestor = esAdmin || roles.includes('supervisor');
    const tieneAgente = props.auth?.tieneAgente ?? false;
    const modo = props.modo === 'admin' && esAdmin ? 'admin' : 'agente';

    const [expandido, setExpandido] = useState(() => localStorage.getItem('menu-expandido') === 'true');

    const alternarMenu = () => {
        setExpandido((v) => {
            localStorage.setItem('menu-expandido', String(!v));
            return !v;
        });
    };

    const mostrarTexto = expandido || abiertoMovil;

    const activo = (href: string) => url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);

    const renderEnlace = (e: Enlace) => (
        <Link
            key={`${e.href}-${e.titulo}`}
            href={e.href}
            title={e.titulo}
            onClick={onCerrarMovil}
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

    const visibles = accionesVisibles(modo, { tieneAgente, esGestor }).filter((a) => !PERFIL.includes(a.href));
    const cuenta = ACCIONES.filter((a) => PERFIL.includes(a.href));

    return (
        <aside
            className={`${
                abiertoMovil ? 'fixed inset-y-14 left-0 z-30 flex' : 'hidden'
            } shrink-0 flex-col border-r bg-background transition-[width] duration-200 md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:self-start ${
                expandido ? 'w-60' : 'w-16'
            }`}
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
                {visibles.length > 0 && seccion(modo === 'admin' ? 'Administración' : 'Mi trabajo', visibles)}
            </nav>

            <div className="space-y-1 border-t p-2">{cuenta.map(renderEnlace)}</div>
        </aside>
    );
}