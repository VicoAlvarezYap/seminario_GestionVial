import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ACCIONES, accionesVisibles, type Accion } from '@/components/acciones';

type PageProps = {
    auth?: { roles?: string[]; tieneAgente?: boolean };
    modo?: 'agente' | 'admin';
};

// Estas van solo en el pie del menú
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
    const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

    const alternarMenu = () => {
        setExpandido((v) => {
            localStorage.setItem('menu-expandido', String(!v));
            return !v;
        });
    };

    const mostrarTexto = expandido || abiertoMovil;

    const activo = (href: string) => url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);

    // Lista de acciones: sin las de perfil, que van abajo
    const todas = accionesVisibles(modo, { tieneAgente, esGestor });
    const principales = todas.filter((a) => !PERFIL.includes(a.href));
    const sueltas = principales.filter((a) => !a.grupo);
    const grupos = [...new Set(principales.filter((a) => a.grupo).map((a) => a.grupo!))];
    const cuenta = ACCIONES.filter((a) => PERFIL.includes(a.href));

    const renderEnlace = (e: Accion) => (
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

    const renderGrupo = (g: string) => {
        const items = principales.filter((a) => a.grupo === g);
        const abierto = abiertos[g] ?? false;

        return (
            <div key={g} className="space-y-1">
                <button
                    type="button"
                    onClick={() => setAbiertos((s) => ({ ...s, [g]: !abierto }))}
                    aria-expanded={abierto}
                    title={g}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent ${
                        mostrarTexto ? 'justify-between' : 'justify-center'
                    }`}
                >
                    <span className="flex items-center gap-3">
                        <CalendarDays className="size-4 shrink-0" />
                        {mostrarTexto && <span>{g}</span>}
                    </span>
                    {mostrarTexto && (
                        <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    )}
                </button>

                {abierto && (
                    <div className={mostrarTexto ? 'ml-3 space-y-1 border-l pl-3' : 'space-y-1'}>
                        {items.map(renderEnlace)}
                    </div>
                )}
            </div>
        );
    };

    const tituloSeccion = modo === 'admin' ? 'Administración' : 'Mi trabajo';

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
                {/* Primera acción (Inicio) */}
                {sueltas.length > 0 && (
                    <div className="space-y-1">
                        {mostrarTexto && (
                            <p className="px-3 pt-3 text-xs font-semibold uppercase text-muted-foreground">
                                {tituloSeccion}
                            </p>
                        )}
                        {sueltas.slice(0, 1).map(renderEnlace)}
                    </div>
                )}

                {/* Turnos, justo después de Inicio */}
                {grupos.map(renderGrupo)}

                {/* Resto de las acciones */}
                {sueltas.length > 1 && <div className="space-y-1">{sueltas.slice(1).map(renderEnlace)}</div>}
            </nav>

            <div className="space-y-1 border-t p-2">{cuenta.map(renderEnlace)}</div>
        </aside>
    );
}