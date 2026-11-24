import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, FileDown } from 'lucide-react';
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
    type TareaFila,
    type TurnoRow,
} from '@/components/turnos-compartidos';

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

function TareasDelTurno({ tareas }: { tareas: TareaFila[] }) {
    if (tareas.length === 0) {
        return <p className="text-xs italic text-muted-foreground">Sin tareas asignadas todavía.</p>;
    }

    return (
        <ul className="divide-y rounded-md border bg-muted/30">
            {tareas.map((tr) => (
                <li key={tr.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="min-w-0">
                        <p className="font-medium text-foreground">{tr.titulo}</p>
                        <p className="text-muted-foreground">
                            {tr.hora_inicio && <span className="font-mono">{tr.hora_inicio}–{tr.hora_fin}</span>}
                            {tr.lugar && <span> · {tr.lugar}</span>}
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={() => router.visit(`/admin/turnos/tareas?fecha=${tr.fecha}&editar=${tr.id}`)}
                            className="rounded-md border bg-background px-2.5 py-1 font-medium hover:bg-accent"
                        >
                            Editar tarea
                        </button>
                        <button
                            type="button"
                            onClick={() => cancelarTarea(tr)}
                            className="rounded-md border bg-background px-2.5 py-1 font-medium text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                            Cancelar tarea
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

const cancelarTarea = (tr: TareaFila) => {
    if (window.confirm(`¿Cancelar la tarea "${tr.titulo}"? Queda registrada como cancelada.`)) {
        router.patch(`/admin/tareas/${tr.id}/cancelar`, {}, { preserveScroll: true });
    }
};

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

function DiaProximo({ fecha, items, horarios }: { fecha: string; items: TurnoRow[]; horarios: Horarios }) {
    const [abierto, setAbierto] = useState(false);
    const panelId = `dia-${fecha}`;

    const clave = items.every((t) => t.estado === items[0].estado) ? items[0].estado : 'programado';
    const estado = ESTADOS[clave] ?? ESTADOS.programado;

    const bloques = ORDEN.map((turno) => ({
        turno,
        agentes: items.filter((x) => x.turno === turno).sort(porApellido),
    })).filter((b) => b.agentes.length > 0);

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold capitalize">{fechaLarga(fecha)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                        {estado.texto}
                    </span>
                </div>
                <button
                    type="button"
                    aria-expanded={abierto}
                    aria-controls={panelId}
                    onClick={() => setAbierto((v) => !v)}
                    className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                    {abierto ? 'Ver menos' : 'Ver más'}
                    <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {abierto && (
                <div id={panelId} className="space-y-6 border-t bg-muted/20 px-5 py-4">
                    {bloques.map(({ turno, agentes }) => (
                        <section key={turno} className="space-y-3">
                            <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-2">
                                <div>
                                    <p className="font-semibold">{NOMBRES[turno]}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {horarioDe(agentes[0], horarios)}
                                    </p>
                                </div>
                                <Link
                                    href={`/admin/turnos/tareas?fecha=${fecha}&bloque=${turno}`}
                                    className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                                >
                                    + Asignar tarea grupal
                                </Link>
                            </div>

                            <div className="space-y-3">
                                {agentes.map((t) => (
                                    <article key={t.id} className="space-y-3 rounded-lg border bg-background p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {t.agente.apellido}, {t.agente.nombre}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                    {t.tareas.length} tarea(s)
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/admin/turnos/tareas?fecha=${t.fecha}&agente=${t.id}`}
                                                    className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                                                >
                                                    Asignar tarea
                                                </Link>
                                                <Link
                                                    href={`/admin/turnos/${t.id}/detalle`}
                                                    className="rounded-lg border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                                                >
                                                    Ver turno
                                                </Link>
                                                <button
                                                    type="button"
                                                    disabled
                                                    title="Próximamente"
                                                    className="rounded-lg border bg-background px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Editar turno
                                                </button>
                                            </div>
                                        </div>

                                        <TareasDelTurno tareas={t.tareas} />
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
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
};


function TurnosProximos({ turnos, horarios, filtros, agentes, manana,paginacion }: ProximosProps) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);
    const [agente, setAgente] = useState(filtros.agente ? String(filtros.agente) : '');

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
    const excelUrl ='/admin/turnos/listado/excel?' +
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
                        <DiaProximo key={fecha} fecha={fecha} items={items} horarios={horarios} />
                    ))}
                    <Paginador actual={paginacion.actual} ultima={paginacion.ultima} onIr={irAPagina} />
                </>
            )}
        </section>
    );
}


export default function Listado({ hoy, manana, horariosConfig, turnosHoy, proximos, filtros, agentes, paginacion }: Props) {
    return (
        <>
            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <TurnoActual hoy={hoy} turnos={turnosHoy} horarios={horariosConfig} />
                <TurnosProximos
                    turnos={proximos}
                    horarios={horariosConfig}
                    filtros={filtros}
                    agentes={agentes}
                    manana={manana}
                    paginacion={paginacion}
                />
            </div>
        </>
    );
}