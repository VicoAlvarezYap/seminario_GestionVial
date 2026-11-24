import { Link, router } from '@inertiajs/react';
import { useEffect,useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, FileDown, Pencil, Users } from 'lucide-react';
import NavbarAgente from '@/components/navbar-agente';
import {
    ESTADOS,
    NOMBRES,
    ORDEN,
    Paginador,
    fechaLarga,
    horarioDe,
    porApellido,
    type Horarios,
    type Paginacion,
    type TurnoRow,
} from '@/components/turnos-compartidos';
import EditarTurnoModal, { type TurnoEditable } from '@/components/editar-turno-modal';
import FlashMensajes from '@/components/flash-mensajes';

type Turno = 'manana' | 'tarde' | 'noche' | 'especial';

type Filtros = { desde: string; hasta: string; agente: number | null };
type AgenteOpcion = { id: number; nombre: string; apellido: string };

type Props = {
    hoy: string;
    manana: string;
    horariosConfig: Horarios;
    turnosHoy: TurnoRow[];
    proximos: TurnoRow[];
    filtros: Filtros;
    agentes: AgenteOpcion[];
    paginacion: Paginacion;
};

const hhmm = (s: string | null | undefined) => (s ? s.slice(0, 5) : '');


function TurnoActual({ hoy, turnos, horarios }: { hoy: string; turnos: TurnoRow[]; horarios: Horarios }) {
    const bloques = ORDEN.map((t) => ({
        turno: t,
        items: turnos.filter((x) => x.turno === t).sort(porApellido),
    })).filter((b) => b.items.length > 0);

    return (
        <section className="space-y-4 rounded-2xl border bg-muted/40 p-5 sm:p-6">
            <div>
                <h1 className="text-2xl font-bold">Turno actual</h1>
                <p className="text-sm capitalize text-muted-foreground">{fechaLarga(hoy)}</p>
            </div>

            {bloques.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    Hoy no hay turnos asignados.{' '}
                    <Link href="/admin/turnos" className="text-primary hover:underline">
                        Asignar turnos
                    </Link>
                </div>
            ) : (
                bloques.map(({ turno, items }) => (
                    <div key={turno} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="flex items-baseline justify-between border-b bg-muted/30 px-5 py-3">
                            <h2 className="font-semibold">{NOMBRES[turno]}</h2>
                            <span className="font-mono text-xs text-muted-foreground">
                                {horarioDe(items[0], horarios)}
                            </span>
                        </div>
                        <ul className="divide-y">
                            {items.map((t) => {
                                const estado = ESTADOS[t.estado] ?? {
                                    texto: t.estado.replace(/_/g, ' '),
                                    clase: ESTADOS.programado.clase,
                                };
                                return (
                                    <li
                                        key={t.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-medium">
                                                {t.agente.apellido}, {t.agente.nombre}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}
                                            >
                                                {estado.texto}
                                            </span>
                                        </div>
                                        <Link
                                            href={`/admin/turnos/${t.id}/detalle`}
                                            className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                                        >
                                            Ver más <ChevronRight className="size-4" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))
            )}
        </section>
    );
}
const badgeEstado = (estado: string) =>
    ESTADOS[estado] ?? { texto: estado.replace(/_/g, ' '), clase: ESTADOS.programado.clase };

function DiaProximo({
    fecha,
    items,
    horarios,
    onEditar,
}: {
    fecha: string;
    items: TurnoRow[];
    horarios: Horarios;
    onEditar: (t: TurnoRow) => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const [menu, setMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const panelId = `dia-${fecha}`;

    // Cierra el menú de "Editar" al hacer clic afuera o con Escape
    useEffect(() => {
        if (!menu) return;
        const fuera = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
        };
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
        document.addEventListener('mousedown', fuera);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', fuera);
            document.removeEventListener('keydown', esc);
        };
    }, [menu]);

    // Estado: uno solo si todos coinciden; si no, un resumen con cantidades
    const conteo = items.reduce<Record<string, number>>((acc, t) => {
        acc[t.estado] = (acc[t.estado] ?? 0) + 1;
        return acc;
    }, {});
    const estados = Object.entries(conteo);

    const bloques = ORDEN.map((turno) => ({
        turno,
        agentes: items.filter((x) => x.turno === turno).sort(porApellido),
    })).filter((b) => b.agentes.length > 0);

    const editables = items.filter((t) => t.editable).sort(porApellido);

    const clickEditar = () => {
        if (editables.length === 1) onEditar(editables[0]);
        else setMenu((v) => !v);
    };

    const boton = 'flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium';

    return (
        <div className="rounded-xl border bg-card shadow-sm">
            {/* Cabecera: fecha · agentes · estado · [Editar] [Ver más] */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold capitalize">{fechaLarga(fecha)}</span>

                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        {items.length} {items.length === 1 ? 'agente' : 'agentes'}
                    </span>

                    <span className="flex flex-wrap items-center gap-1.5">
                        {estados.map(([estado, n]) => {
                            const e = badgeEstado(estado);
                            return (
                                <span
                                    key={estado}
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.clase}`}
                                >
                                    {estados.length > 1 ? `${n} ${e.texto.toLowerCase()}` : e.texto}
                                </span>
                            );
                        })}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Editar */}
                    <div ref={menuRef} className="relative">
                        <button
                            type="button"
                            onClick={clickEditar}
                            disabled={editables.length === 0}
                            aria-haspopup={editables.length > 1 ? 'menu' : undefined}
                            aria-expanded={editables.length > 1 ? menu : undefined}
                            title={
                                editables.length === 0
                                    ? 'No se puede editar: ya empezó o falta menos de una hora'
                                    : undefined
                            }
                            className={`${boton} hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            <Pencil className="size-3.5" />
                            Editar
                            {editables.length > 1 && <ChevronDown className="size-3.5" />}
                        </button>

                        {menu && editables.length > 1 && (
                            <div
                                role="menu"
                                className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border bg-popover p-1 shadow-md"
                            >
                                <p className="px-2 py-1 text-xs text-muted-foreground">¿Qué agente querés editar?</p>
                                {editables.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenu(false);
                                            onEditar(t);
                                        }}
                                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    >
                                        <span className="truncate">
                                            {t.agente.apellido}, {t.agente.nombre}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {NOMBRES[t.turno]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ver más */}
                    <button
                        type="button"
                        aria-expanded={abierto}
                        aria-controls={panelId}
                        onClick={() => setAbierto((v) => !v)}
                        className={`${boton} hover:bg-accent`}
                    >
                        {abierto ? 'Ver menos' : 'Ver más'}
                        <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Detalle expandido: turno | agentes (sin botón de editar por agente) */}
            {abierto && (
                <div id={panelId} className="overflow-hidden rounded-b-xl border-t">
                    <div className="grid grid-cols-[6.5rem_1fr] gap-4 bg-muted/30 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[10rem_1fr]">
                        <span>Turno</span>
                        <span>Agentes</span>
                    </div>
                    <div className="divide-y">
                        {bloques.map(({ turno, agentes }) => (
                            <div
                                key={turno}
                                className="grid grid-cols-[6.5rem_1fr] gap-4 px-5 py-3 text-sm sm:grid-cols-[10rem_1fr]"
                            >
                                <div>
                                    <p className="font-medium">{NOMBRES[turno]}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {horarioDe(agentes[0], horarios)}
                                    </p>
                                </div>
                                <ul className="space-y-2">
                                    {agentes.map((t) => {
                                        const e = badgeEstado(t.estado);
                                        return (
                                            <li key={t.id} className="flex flex-wrap items-center gap-2">
                                                <span>
                                                    {t.agente.apellido}, {t.agente.nombre}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}
                                                >
                                                    {e.texto}
                                                </span>
                                                {typeof t.tareas_count === 'number' && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {t.tareas_count === 0
                                                            ? 'Sin tareas'
                                                            : `${t.tareas_count} ${t.tareas_count === 1 ? 'tarea' : 'tareas'}`}
                                                    </span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
type ProximosProps = {
    turnos: TurnoRow[];
    horarios: Horarios;
    filtros: Filtros;
    agentes: AgenteOpcion[];
    manana: string;
    paginacion: Paginacion;
    onEditar: (t: TurnoRow) => void;
};


function TurnosProximos({ turnos, horarios, filtros, agentes, manana, paginacion, onEditar  }: ProximosProps) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);
    const [agente, setAgente] = useState(filtros.agente ? String(filtros.agente) : '');
    const [editando, setEditando] = useState<TurnoEditable | null>(null);
    // El servidor puede ajustar las fechas: se vuelve a sincronizar
    useEffect(() => {
        setDesde(filtros.desde);
        setHasta(filtros.hasta);
        setAgente(filtros.agente ? String(filtros.agente) : '');
    }, [filtros.desde, filtros.hasta, filtros.agente]);


    const irA = (params: Record<string, string>) =>
        router.get('/admin/turnos/listado', params, { preserveScroll: true, preserveState: true });

    const aplicar = (e: React.FormEvent) => {
        e.preventDefault();
        irA({ desde, hasta, ...(agente ? { agente } : {}) });
    };

    const limpiar = () => irA({});

    const cambiarDesde = (valor: string) => {
        setDesde(valor);
        if (hasta < valor) setHasta(valor);
    };

    // El PDF usa los filtros ya aplicados (los que se ven en pantalla)
    const pdfUrl =
        '/admin/turnos/listado/pdf?' +
        new URLSearchParams({
            desde: filtros.desde,
            hasta: filtros.hasta,
            ...(filtros.agente ? { agente: String(filtros.agente) } : {}),
        }).toString();

    // Agrupar por fecha
    const porFecha = Object.entries(
        turnos.reduce<Record<string, TurnoRow[]>>((acc, t) => {
            (acc[t.fecha] ??= []).push(t);
            return acc;
        }, {}),
    );

    const irAPagina = (page: number) =>
        irA({
            desde: filtros.desde,
            hasta: filtros.hasta,
            ...(filtros.agente ? { agente: String(filtros.agente) } : {}),
            page: String(page),
        });


    const botonPdf = 'flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium';
    const excelUrl = '/admin/turnos/listado/excel?' +
        new URLSearchParams({
            desde: filtros.desde,
            hasta: filtros.hasta,
            ...(filtros.agente ? { agente: String(filtros.agente) } : {}),
        }).toString();
    return (
        <section className="space-y-4 rounded-2xl border bg-muted/40 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Turnos próximos</h2>
                <div className="flex flex-wrap gap-2">
                    {turnos.length > 0 ? (
                        <>
                            <a href={pdfUrl} className={`${botonPdf} hover:bg-accent`}>
                                <FileDown className="size-4" /> Exportar PDF
                            </a>
                            <a href={excelUrl} className={`${botonPdf} hover:bg-accent`}>
                                <FileDown className="size-4" /> Exportar Excel
                            </a>
                        </>
                    ) : (
                        <>
                            <button type="button" disabled className={`${botonPdf} cursor-not-allowed opacity-50`}>
                                <FileDown className="size-4" /> Exportar PDF
                            </button>
                            <button type="button" disabled className={`${botonPdf} cursor-not-allowed opacity-50`}>
                                <FileDown className="size-4" /> Exportar Excel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                    <label htmlFor="filtro-desde" className="text-xs font-medium text-muted-foreground">
                        Desde
                    </label>
                    <input
                        id="filtro-desde"
                        type="date"
                        value={desde}
                        min={manana}
                        onChange={(e) => cambiarDesde(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="filtro-hasta" className="text-xs font-medium text-muted-foreground">
                        Hasta
                    </label>
                    <input
                        id="filtro-hasta"
                        type="date"
                        value={hasta}
                        min={desde}
                        onChange={(e) => setHasta(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-2 text-sm"
                        required
                    />
                </div>
                <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <label htmlFor="filtro-agente" className="text-xs font-medium text-muted-foreground">
                        Agente
                    </label>
                    <select
                        id="filtro-agente"
                        value={agente}
                        onChange={(e) => setAgente(e.target.value)}
                        className="rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                        <option value="">Todos los agentes</option>
                        {agentes.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.apellido}, {a.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                    Filtrar
                </button>
                <button
                    type="button"
                    onClick={limpiar}
                    className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                    Limpiar
                </button>
            </form>

            {porFecha.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-background/60 p-6 text-sm text-muted-foreground">
                    {filtros.agente
                        ? 'Ese agente no tiene turnos en el rango elegido.'
                        : 'No hay turnos asignados en el rango elegido.'}
                </p>
            ) : (
                <>
                    {porFecha.map(([fecha, items]) => (
                        <DiaProximo key={fecha} fecha={fecha} items={items} horarios={horarios} onEditar={onEditar} />
                    ))}
                    <Paginador actual={paginacion.actual} ultima={paginacion.ultima} onIr={irAPagina} />
                </>
            )}
        </section>
    );
}


export default function Listado({ hoy, manana, horariosConfig, turnosHoy, proximos, filtros, agentes, paginacion }: Props) {
    const [editando, setEditando] = useState<TurnoEditable | null>(null);

    return (
        <>
            <NavbarAgente />
            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <FlashMensajes />
                <TurnoActual hoy={hoy} turnos={turnosHoy} horarios={horariosConfig} />
                <TurnosProximos
                    turnos={proximos}
                    horarios={horariosConfig}
                    filtros={filtros}
                    agentes={agentes}
                    manana={manana}
                    paginacion={paginacion}
                    onEditar={setEditando}
                />
                <EditarTurnoModal
                    turno={editando}
                    agentes={agentes}
                    horariosConfig={horariosConfig}
                    onClose={() => setEditando(null)}
                />
            </div>
        </>
    );
}