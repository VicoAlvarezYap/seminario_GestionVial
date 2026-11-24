import { Deferred, Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import NavbarAgente from '@/components/navbar-agente';

const urlTareas = (fecha: string, agenteId: number) =>
    `/admin/turnos/tareas?fecha=${fecha}&agente=${agenteId}`;
const urlDetalleTurno = (turnoId: number) => `/admin/turnos/${turnoId}/detalle`;
const URL_DASHBOARD = '/dashboard';

type Tarjetas = {
    programados: number;
    en_servicio: number;
    ausentes: number;
    llegadas_tarde: number;
    con_licencia: number;
    intervenciones_hoy: {
        total: number;
        por_tipo: Record<string, number>;
        abiertas: number;
        urgentes_abiertas: number;
    };
    tareas_hoy: Record<string, number>;
};

type Alertas = {
    sin_tareas: { turno_id: number; agente_id: number; agente: string; fecha: string; turno: string }[];
    salidas_pendientes: { fichaje_id: number; turno_id: number; agente: string; registrada_at: string; motivo: string | null }[];
    sin_fichaje: { turno_id: number; agente: string; turno: string }[];
};

type PuntoMapa = {
    id: number;
    agente: string;
    tipo: string;
    hora: string;
    lat: number;
    lng: number;
    dentro_de_zona: boolean | null;
};

type Cobertura = {
    desde: string;
    hasta: string;
    turnos: { agente_id: number; agente: string; fecha: string; turno: string }[];
    licencias: { agente_id: number; desde: string; hasta: string }[];
};

type Tendencias = {
    intervenciones_por_dia: { fecha: string; total: number }[];
    intervenciones_por_tipo: { tipo: string; total: number }[];
    intervenciones_por_lugar: { lugar: string; total: number }[];
    cumplimiento_turnos: { estado: string; total: number }[];
};

type FilaPuntualidad = {
    agente: string;
    turnos: number;
    minutos_tarde: number;
    minutos_extra: number;
    salidas_anticipadas: number;
};

type Props = {
    hoy: string;
    filtros: { desde: string; hasta: string };
    tarjetas: Tarjetas;
    enServicio: { turno_id: number; agente: string; turno: string }[];
    alertas: Alertas;
    mapa: PuntoMapa[];
    cobertura: Cobertura;
    tendencias?: Tendencias;
    puntualidad?: FilaPuntualidad[];
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};
const LETRA_TURNO: Record<string, string> = { manana: 'M', tarde: 'T', noche: 'N', especial: 'E' };
const COLOR_TURNO: Record<string, string> = {
    manana: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    tarde: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    noche: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    especial: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
};
const COLOR_ESTADO: Record<string, string> = {
    cumplido: 'bg-emerald-500',
    en_proceso: 'bg-sky-500',
    programado: 'bg-slate-400',
    ausente: 'bg-red-500',
    abandonado: 'bg-orange-500',
    reasignado: 'bg-purple-400',
    cancelado: 'bg-zinc-400',
};

const etiqueta = (s: string) => {
    const t = s.replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
};
const fechaCorta = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
};
const fechaLarga = (iso: string) => iso.split('-').reverse().join('/');

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaSemana = (iso: string) => DIAS[new Date(`${iso}T00:00:00`).getDay()];


function Panel({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{titulo}</h2>
                {extra}
            </div>
            {children}
        </section>
    );
}

function Tarjeta({
    titulo,
    valor,
    detalle,
    tono = 'normal',
}: {
    titulo: string;
    valor: number | string;
    detalle?: string;
    tono?: 'normal' | 'ok' | 'warn' | 'bad';
}) {
    const color = {
        normal: 'text-neutral-900 dark:text-neutral-50',
        ok: 'text-emerald-600 dark:text-emerald-400',
        warn: 'text-amber-600 dark:text-amber-400',
        bad: 'text-red-600 dark:text-red-400',
    }[tono];

    return (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{titulo}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{valor}</p>
            {detalle && <p className="mt-1 text-xs text-neutral-500">{detalle}</p>}
        </div>
    );
}

function Vacio({ texto }: { texto: string }) {
    return <p className="py-4 text-center text-sm text-neutral-500">{texto}</p>;
}

function BarrasHorizontales({
    items,
    color = 'bg-sky-500',
}: {
    items: { etiqueta: string; valor: number; color?: string }[];
    color?: string;
}) {
    const max = Math.max(1, ...items.map((i) => i.valor));
    if (items.length === 0) return <Vacio texto="Sin datos en el período." />;

    return (
        <ul className="space-y-2">
            {items.map((i) => (
                <li key={i.etiqueta} className="text-sm">
                    <div className="mb-0.5 flex justify-between gap-2">
                        <span className="truncate text-neutral-700 dark:text-neutral-300">{i.etiqueta}</span>
                        <span className="font-medium tabular-nums">{i.valor}</span>
                    </div>
                    <div className="h-2 rounded bg-neutral-100 dark:bg-neutral-800">
                        <div
                            className={`h-2 rounded ${i.color ?? color}`}
                            style={{ width: `${(i.valor / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function BarrasPorDia({ datos }: { datos: { fecha: string; total: number }[] }) {
    const max = Math.max(1, ...datos.map((d) => d.total));
    const total = datos.reduce((s, d) => s + d.total, 0);
    if (total === 0) return <Vacio texto="No hubo intervenciones en el período." />;

    return (
        <div>
            <div className="flex h-40 items-end gap-px">
                {datos.map((d) => (
                    <div
                        key={d.fecha}
                        className="group relative flex-1"
                        title={`${fechaLarga(d.fecha)}: ${d.total}`}
                    >
                        <div
                            className="w-full rounded-t bg-sky-500 group-hover:bg-sky-600"
                            style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 2 : 0 }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
                <span>{fechaCorta(datos[0].fecha)}</span>
                <span>{total} en total</span>
                <span>{fechaCorta(datos[datos.length - 1].fecha)}</span>
            </div>
        </div>
    );
}

function MapaFichajes({ puntos }: { puntos: PuntoMapa[] }) {
    const contenedor = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mapa: import('leaflet').Map | null = null;
        let cancelado = false;

        (async () => {
            const L = (await import('leaflet')).default;
            await import('leaflet/dist/leaflet.css');
            if (cancelado || !contenedor.current) return;

            mapa = L.map(contenedor.current).setView([-24.7821, -65.4232], 12); // Salta
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapa);

            const grupo = L.featureGroup();
            puntos.forEach((p) => {
                const color = p.dentro_de_zona === false ? '#dc2626' : p.tipo === 'entrada' ? '#16a34a' : '#2563eb';
                L.circleMarker([p.lat, p.lng], { radius: 8, color, fillColor: color, fillOpacity: 0.7 })
                    .bindPopup(
                        `<strong>${p.agente}</strong><br>${etiqueta(p.tipo)} · ${p.hora}` +
                            (p.dentro_de_zona === false ? '<br><em>Fuera de zona</em>' : ''),
                    )
                    .addTo(grupo);
            });
            grupo.addTo(mapa);
            if (puntos.length > 0) mapa.fitBounds(grupo.getBounds().pad(0.2), { maxZoom: 16 });
        })();

        return () => {
            cancelado = true;
            mapa?.remove();
        };
    }, [puntos]);

    return (
        <div>
            <div ref={contenedor} className="z-0 h-80 w-full rounded-lg" />
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                <Leyenda color="bg-green-600" texto="Entrada" />
                <Leyenda color="bg-blue-600" texto="Salida" />
                <Leyenda color="bg-red-600" texto="Fuera de zona" />
                {puntos.length === 0 && <span>Todavía no hay fichajes con ubicación hoy.</span>}
            </div>
        </div>
    );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
            {texto}
        </span>
    );
}

function CoberturaSemanal({ cobertura }: { cobertura: Cobertura }) {
    const dias = useMemo(() => {
        const out: string[] = [];
        const d = new Date(`${cobertura.desde}T00:00:00`);
        for (let i = 0; i < 7; i++) {
            const x = new Date(d);
            x.setDate(d.getDate() + i);
            out.push(
                `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`,
            );
        }
        return out;
    }, [cobertura.desde]);

    const agentes = useMemo(() => {
        const mapa = new Map<number, string>();
        cobertura.turnos.forEach((t) => mapa.set(t.agente_id, t.agente));
        return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [cobertura.turnos]);

    const celda = (agenteId: number, fecha: string) => {
        const turno = cobertura.turnos.find((t) => t.agente_id === agenteId && t.fecha === fecha);
        const licencia = cobertura.licencias.some(
            (l) => l.agente_id === agenteId && l.desde <= fecha && l.hasta >= fecha,
        );
        return { turno, licencia };
    };

    if (agentes.length === 0) return <Vacio texto="No hay turnos programados esta semana." />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
                <thead>
                    <tr className="text-xs text-neutral-500">
                        <th className="py-1 pr-3 text-left font-medium">Agente</th>
                        {dias.map((d) => (
                            <th key={d} className="px-1 py-1 text-center font-medium">
                                {diaSemana(d)} {fechaCorta(d)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {agentes.map(([id, nombre]) => (
                        <tr key={id} className="border-t border-neutral-100 dark:border-neutral-800">
                            <td className="whitespace-nowrap py-1 pr-3">{nombre}</td>
                            {dias.map((d) => {
                                const { turno, licencia } = celda(id, d);
                                return (
                                    <td key={d} className="px-1 py-1 text-center">
                                        {licencia ? (
                                            <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs font-medium dark:bg-neutral-700">
                                                Lic
                                            </span>
                                        ) : turno ? (
                                            <span
                                                title={NOMBRE_TURNO[turno.turno] ?? turno.turno}
                                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${COLOR_TURNO[turno.turno] ?? ''}`}
                                            >
                                                {LETRA_TURNO[turno.turno] ?? '?'}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Alertas({ alertas }: { alertas: Alertas }) {
    const grupos = [
        {
            clave: 'sin_fichaje',
            titulo: 'No fichó la entrada',
            tono: 'text-red-600 dark:text-red-400',
            items: alertas.sin_fichaje.map((a) => ({
                key: `sf-${a.turno_id}`,
                texto: a.agente,
                sub: `Turno ${NOMBRE_TURNO[a.turno] ?? a.turno}`,
                href: urlDetalleTurno(a.turno_id),
            })),
        },
        {
            clave: 'salidas',
            titulo: 'Salidas anticipadas sin revisar',
            tono: 'text-amber-600 dark:text-amber-400',
            items: alertas.salidas_pendientes.map((a) => ({
                key: `sp-${a.fichaje_id}`,
                texto: a.agente,
                sub: `${a.registrada_at}${a.motivo ? ` · ${a.motivo}` : ''}`,
                href: urlDetalleTurno(a.turno_id),
            })),
        },
        {
            clave: 'sin_tareas',
            titulo: 'Turnos sin tareas (hoy y mañana)',
            tono: 'text-sky-600 dark:text-sky-400',
            items: alertas.sin_tareas.map((a) => ({
                key: `st-${a.turno_id}`,
                texto: a.agente,
                sub: `${fechaLarga(a.fecha)} · ${NOMBRE_TURNO[a.turno] ?? a.turno}`,
                href: urlTareas(a.fecha, a.agente_id),
            })),
        },
    ];

    const total = grupos.reduce((s, g) => s + g.items.length, 0);
    if (total === 0) return <Vacio texto="Todo en orden: no hay nada que requiera atención." />;

    return (
        <div className="space-y-4">
            {grupos
                .filter((g) => g.items.length > 0)
                .map((g) => (
                    <div key={g.clave}>
                        <h3 className={`mb-1 text-xs font-semibold uppercase tracking-wide ${g.tono}`}>
                            {g.titulo} ({g.items.length})
                        </h3>
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {g.items.map((i) => (
                                <li key={i.key}>
                                    <Link
                                        href={i.href}
                                        className="flex items-center justify-between gap-2 rounded px-1 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                    >
                                        <span className="font-medium">{i.texto}</span>
                                        <span className="truncate text-xs text-neutral-500">{i.sub}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
        </div>
    );
}


export default function Dashboard({
    hoy,
    filtros,
    tarjetas,
    enServicio,
    alertas,
    mapa,
    cobertura,
}: Props) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);

    // Refresca "hoy" cada minuto sin recargar la página ni los gráficos
    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['tarjetas', 'enServicio', 'alertas', 'mapa'] });
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    const aplicarRango = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            URL_DASHBOARD,
            { desde, hasta },
            { preserveScroll: true, preserveState: true, only: ['filtros', 'tendencias', 'puntualidad'] },
        );
    };

    const inter = tarjetas.intervenciones_hoy;
    const alertasTotal =
        alertas.sin_tareas.length + alertas.salidas_pendientes.length + alertas.sin_fichaje.length;

    return (
        <>
            <NavbarAgente />
            <Head title="Dashboard" />

            <div className="space-y-5 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-bold">Dashboard de gestión vial</h1>
                        <p className="text-sm text-neutral-500">Hoy, {fechaLarga(hoy)} · se actualiza cada minuto</p>
                    </div>
                </header>

                {/* Tarjetas */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Tarjeta titulo="Programados" valor={tarjetas.programados} detalle="agentes con turno hoy" />
                    <Tarjeta
                        titulo="En servicio"
                        valor={tarjetas.en_servicio}
                        detalle="con entrada y sin salida"
                        tono="ok"
                    />
                    <Tarjeta
                        titulo="Ausentes"
                        valor={tarjetas.ausentes}
                        tono={tarjetas.ausentes > 0 ? 'bad' : 'normal'}
                    />
                    <Tarjeta
                        titulo="Llegadas tarde"
                        valor={tarjetas.llegadas_tarde}
                        tono={tarjetas.llegadas_tarde > 0 ? 'warn' : 'normal'}
                    />
                    <Tarjeta titulo="Con licencia" valor={tarjetas.con_licencia} />
                    <Tarjeta
                        titulo="Intervenciones"
                        valor={inter.total}
                        detalle={`${inter.abiertas} abiertas · ${inter.urgentes_abiertas} urgentes`}
                        tono={inter.urgentes_abiertas > 0 ? 'bad' : 'normal'}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Alertas */}
                    <div className="lg:col-span-2">
                        <Panel
                            titulo={`Requiere atención${alertasTotal ? ` (${alertasTotal})` : ''}`}
                        >
                            <Alertas alertas={alertas} />
                        </Panel>
                    </div>

                    {/* Resumen del día */}
                    <div className="space-y-4">
                        <Panel titulo="Tareas de hoy">
                            {Object.keys(tarjetas.tareas_hoy).length === 0 ? (
                                <Vacio texto="No hay tareas asignadas hoy." />
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {Object.entries(tarjetas.tareas_hoy).map(([estado, n]) => (
                                        <li key={estado} className="flex justify-between">
                                            <span>{etiqueta(estado)}</span>
                                            <span className="font-semibold tabular-nums">{n}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel titulo="Intervenciones de hoy por tipo">
                            <BarrasHorizontales
                                items={Object.entries(inter.por_tipo).map(([tipo, valor]) => ({
                                    etiqueta: etiqueta(tipo),
                                    valor,
                                }))}
                            />
                        </Panel>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Panel titulo="Fichajes de hoy en el mapa">
                            <MapaFichajes puntos={mapa} />
                        </Panel>
                    </div>

                    <Panel titulo={`En servicio ahora (${enServicio.length})`}>
                        {enServicio.length === 0 ? (
                            <Vacio texto="Nadie en servicio en este momento." />
                        ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {enServicio.map((a) => (
                                    <li key={a.turno_id}>
                                        <Link
                                            href={urlDetalleTurno(a.turno_id)}
                                            className="flex items-center justify-between rounded px-1 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        >
                                            <span>{a.agente}</span>
                                            <span
                                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${COLOR_TURNO[a.turno] ?? ''}`}
                                            >
                                                {NOMBRE_TURNO[a.turno] ?? a.turno}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                <Panel titulo={`Cobertura de la semana (${fechaCorta(cobertura.desde)} al ${fechaCorta(cobertura.hasta)})`}>
                    <CoberturaSemanal cobertura={cobertura} />
                    <p className="mt-2 text-xs text-neutral-500">
                        M = Mañana · T = Tarde · N = Noche · E = Especial · Lic = licencia aprobada
                    </p>
                </Panel>

                {/* Tendencias */}
                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold">Tendencias</h2>
                    <form onSubmit={aplicarRango} className="flex flex-wrap items-end gap-2 text-sm">
                        <label className="flex flex-col text-xs text-neutral-500">
                            Desde
                            <input
                                type="date"
                                value={desde}
                                max={hasta}
                                onChange={(e) => setDesde(e.target.value)}
                                className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                            />
                        </label>
                        <label className="flex flex-col text-xs text-neutral-500">
                            Hasta
                            <input
                                type="date"
                                value={hasta}
                                min={desde}
                                onChange={(e) => setHasta(e.target.value)}
                                className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                            />
                        </label>
                        <button
                            type="submit"
                            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                        >
                            Aplicar
                        </button>
                    </form>
                </div>

                <Deferred data={['tendencias', 'puntualidad']} fallback={<Cargando />}>
                    <BloqueTendencias />
                </Deferred>
            </div>
        </>
    );
}

function Cargando() {
    return (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Cargando tendencias…
        </div>
    );
}

/* Se renderiza solo cuando llegaron las props diferidas */
import { usePage } from '@inertiajs/react';

function BloqueTendencias() {
    const { tendencias, puntualidad } = usePage<Props>().props;
    if (!tendencias || !puntualidad) return <Cargando />;

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel titulo="Intervenciones por día">
                <BarrasPorDia datos={tendencias.intervenciones_por_dia} />
            </Panel>

            <Panel titulo="Cumplimiento de turnos">
                <BarrasHorizontales
                    items={tendencias.cumplimiento_turnos.map((c) => ({
                        etiqueta: etiqueta(c.estado),
                        valor: c.total,
                        color: COLOR_ESTADO[c.estado],
                    }))}
                />
            </Panel>

            <Panel titulo="Intervenciones por tipo">
                <BarrasHorizontales
                    items={tendencias.intervenciones_por_tipo.map((t) => ({
                        etiqueta: etiqueta(t.tipo),
                        valor: t.total,
                    }))}
                    color="bg-violet-500"
                />
            </Panel>

            <Panel titulo="Lugares con más intervenciones">
                <BarrasHorizontales
                    items={tendencias.intervenciones_por_lugar.map((l) => ({
                        etiqueta: l.lugar,
                        valor: l.total,
                    }))}
                    color="bg-teal-500"
                />
            </Panel>

            <div className="lg:col-span-2">
                <Panel titulo="Puntualidad por agente (top 10 por minutos de atraso)">
                    {puntualidad.length === 0 ? (
                        <Vacio texto="No hay turnos cumplidos en el período." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-neutral-500">
                                        <th className="py-1 font-medium">Agente</th>
                                        <th className="py-1 text-right font-medium">Turnos</th>
                                        <th className="py-1 text-right font-medium">Min. tarde</th>
                                        <th className="py-1 text-right font-medium">Min. extra</th>
                                        <th className="py-1 text-right font-medium">Salidas anticip.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {puntualidad.map((f) => (
                                        <tr key={f.agente} className="border-t border-neutral-100 dark:border-neutral-800">
                                            <td className="py-1.5">{f.agente}</td>
                                            <td className="py-1.5 text-right tabular-nums">{f.turnos}</td>
                                            <td
                                                className={`py-1.5 text-right tabular-nums ${f.minutos_tarde > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}`}
                                            >
                                                {f.minutos_tarde}
                                            </td>
                                            <td className="py-1.5 text-right tabular-nums">{f.minutos_extra}</td>
                                            <td
                                                className={`py-1.5 text-right tabular-nums ${f.salidas_anticipadas > 0 ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}
                                            >
                                                {f.salidas_anticipadas}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}