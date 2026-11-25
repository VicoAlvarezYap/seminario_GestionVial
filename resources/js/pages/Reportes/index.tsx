import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useState } from 'react';
import { parseFecha } from '@/lib/fechas';

type Tarea = {
    id: number;
    titulo: string | null;
    lugar: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    detalle: string | null;
};

type IntervencionReporte = {
    id: number;
    tipo: string;
    tipo_evento: string | null;
    cantidad: number;
    hora: string;
    lugar: string | null;
    descripcion: string | null;
};

type Reporte = {
    id: number;
    fecha: string;
    turno: string;
    agente: string;
    inicio_real: string | null;
    fin_real: string | null;
    entregado: string;
    vehiculo_oficial: boolean;
    placa: string | null;
    radio: boolean;
    otros_equipos: string | null;
    novedades: string | null;
    tareas: Tarea[];
    intervenciones: IntervencionReporte[];
};

type Props = {
    reportes: Reporte[];
    desde: string;
    hasta: string;
    veTodo: boolean;
    vista?: 'propios' | 'todos';
    agentes?: { id: number; nombre: string }[];
    agenteId?: number | null;
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const NOMBRE_TIPO: Record<string, string> = {
    accidente: 'Accidente',
    infraccion: 'Infracción',
    emergencia: 'Emergencia',
    otro: 'Otro',
};

// Opciones de los filtros del PDF (a nivel de módulo: no usan estado)
const TURNOS_OPC: [string, string][] = [
    ['manana', 'Mañana'],
    ['tarde', 'Tarde'],
    ['noche', 'Noche'],
    ['especial', 'Especial'],
];

const SECCIONES_OPC: [string, string][] = [
    ['horario', 'Horario'],
    ['tareas', 'Tareas'],
    ['intervenciones', 'Intervenciones'],
    ['recursos', 'Recursos'],
    ['novedades', 'Novedades'],
];

const alternar = (lista: string[], valor: string, set: (v: string[]) => void) =>
    set(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

const hora = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

const fechaLarga = (f: string) =>
    parseFecha(f).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Bordes más marcados y esquinas redondeadas consistentes
const claseCampo =
    'rounded-xl border border-slate-400/90 bg-background px-3 py-2 text-sm shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

const claseTarjeta =
    'rounded-2xl border border-slate-400/90 bg-white shadow-md shadow-slate-950/5 transition-colors hover:border-slate-500 dark:bg-zinc-900';

function Detalle({ r }: { r: Reporte }) {
    const recursos = [
        r.vehiculo_oficial ? `Vehículo oficial${r.placa ? ` (${r.placa})` : ''}` : null,
        r.radio ? 'Radio / comunicación' : null,
        r.otros_equipos,
    ].filter(Boolean);

    return (
        <div className="space-y-4 border-t border-slate-300/90 p-4 text-sm dark:border-zinc-700/80">
            <section>
                <h3 className="mb-1 font-semibold">Horario</h3>
                <p>
                    Inicio: {hora(r.inicio_real)} · Fin: {hora(r.fin_real)} · Entregado:{' '}
                    {new Date(r.entregado).toLocaleString('es-AR')}
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold">Tareas realizadas</h3>
                {r.tareas.length === 0 ? (
                    <p className="italic text-muted-foreground">Sin tareas cargadas.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {r.tareas.map((t) => (
                            <li key={t.id} className="rounded-xl border border-slate-200/90 bg-muted/20 px-3 py-2 dark:border-zinc-800">
                                <span className="font-medium">{t.titulo ?? 'Sin título'}</span>
                                <span className="text-muted-foreground">
                                    {[t.lugar, t.hora_inicio && `${t.hora_inicio}${t.hora_fin ? `–${t.hora_fin}` : ''}`]
                                        .filter(Boolean)
                                        .map((x) => ` · ${x}`)
                                        .join('')}
                                </span>
                                {t.detalle && <div className="text-xs text-muted-foreground">{t.detalle}</div>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section>
                <h3 className="mb-1 font-semibold">Intervenciones</h3>
                {r.intervenciones.length === 0 ? (
                    <p className="italic text-muted-foreground">Sin intervenciones durante el turno.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {r.intervenciones.map((i) => (
                            <li key={i.id} className="rounded-xl border border-slate-200/90 bg-muted/20 px-3 py-2 dark:border-zinc-800">
                                <span className="font-medium">
                                    {NOMBRE_TIPO[i.tipo] ?? i.tipo}
                                    {i.tipo_evento ? ` · ${i.tipo_evento}` : ''}
                                    {i.tipo === 'infraccion' && i.cantidad > 1 ? ` (${i.cantidad})` : ''}
                                </span>
                                <span className="text-muted-foreground">
                                    {` · ${i.hora}`}
                                    {i.lugar ? ` · ${i.lugar}` : ''}
                                </span>
                                {i.descripcion && <div className="text-xs text-muted-foreground">{i.descripcion}</div>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section>
                <h3 className="mb-1 font-semibold">Recursos utilizados</h3>
                <p>{recursos.length > 0 ? recursos.join(' · ') : 'Ninguno informado.'}</p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold">Novedades</h3>
                <p className={r.novedades ? '' : 'italic text-muted-foreground'}>{r.novedades || 'Sin novedades.'}</p>
            </section>
        </div>
    );
}

export default function ReportesIndex({ reportes, desde, hasta, veTodo, vista = 'todos', agentes = [], agenteId = null }: Props) {
    const [abierto, setAbierto] = useState<number | null>(null);
    const [desdeInput, setDesdeInput] = useState(desde);
    const [hastaInput, setHastaInput] = useState(hasta);

    // Filtros del PDF: estado dentro del componente
    const [turnosPdf, setTurnosPdf] = useState<string[]>([]);
    const [seccionesPdf, setSeccionesPdf] = useState<string[]>(['tareas', 'intervenciones']);
    const [agenteFiltro, setAgenteFiltro] = useState<string>(agenteId ? String(agenteId) : '');

    // Usa desdeInput y hastaInput, por eso va dentro del componente
    const urlPdf = () => {
        const p = new URLSearchParams({ desde: desdeInput, hasta: hastaInput });
        turnosPdf.forEach((t) => p.append('turnos[]', t));
        seccionesPdf.forEach((s) => p.append('secciones[]', s));
        if (agenteFiltro) p.append('agente_id', agenteFiltro);
        return `/reportes/pdf?${p.toString()}`;
    };

    const filtrar = () => {
        if (!desdeInput || !hastaInput || desdeInput > hastaInput) {
            return;
        }

        router.get(
            veTodo ? '/admin/reportes' : '/reportes',
            { desde: desdeInput, hasta: hastaInput, agente_id: agenteFiltro || undefined },
            { preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Mis reportes" />

            <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-slate-400/90 bg-background shadow-2xs">
                        <FileText className="size-5" />
                    </div>
                    <h1 className="text-2xl font-bold">
                        {vista === 'propios' ? 'Mis reportes' : 'Reportes de turno (todos los agentes)'}
                    </h1>
                </div>

                {/* Filtro de fechas de la pantalla */}
                <div className={`flex flex-wrap items-end gap-3 p-4 ${claseTarjeta}`}>
                    <label className="flex flex-col gap-1 text-xs font-medium">
                        Desde
                        <input
                            type="date"
                            value={desdeInput}
                            max={hastaInput || undefined}
                            onChange={(e) => setDesdeInput(e.target.value)}
                            className={claseCampo}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium">
                        Hasta
                        <input
                            type="date"
                            value={hastaInput}
                            min={desdeInput || undefined}
                            onChange={(e) => setHastaInput(e.target.value)}
                            className={claseCampo}
                        />
                    </label>
                    {veTodo && (
                        <label className="flex flex-col gap-1 text-xs font-medium">
                            Agente
                            <select
                                value={agenteFiltro}
                                onChange={(e) => setAgenteFiltro(e.target.value)}
                                className={claseCampo}
                            >
                                <option value="">Todos</option>
                                {agentes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={filtrar}
                        disabled={desdeInput === desde && hastaInput === hasta && agenteFiltro === (agenteId ? String(agenteId) : '')}
                        className="rounded-xl border border-primary/90 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
                    >
                        Filtrar
                    </button>
                    <span className="ml-auto rounded-xl border border-slate-300/90 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
                    </span>
                </div>

                {/* Bloque nuevo: descarga del PDF con filtros */}
                <div className={`space-y-3.5 p-4 ${claseTarjeta}`}>
                    <h2 className="text-sm font-semibold">Descargar PDF</h2>

                    <fieldset className="space-y-2 text-sm">
                        <legend className="text-xs font-medium text-muted-foreground">
                            Turnos a incluir (sin selección = todos)
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {TURNOS_OPC.map(([valor, etiqueta]) => {
                                const activo = turnosPdf.includes(valor);
                                return (
                                    <label
                                        key={valor}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                                            activo
                                                ? 'border-primary/90 bg-primary/10 text-primary shadow-2xs'
                                                : 'border-slate-300/90 bg-background hover:border-slate-400 hover:bg-accent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={activo}
                                            onChange={() => alternar(turnosPdf, valor, setTurnosPdf)}
                                            className="accent-primary"
                                        />
                                        {etiqueta}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <fieldset className="space-y-2 text-sm">
                        <legend className="text-xs font-medium text-muted-foreground">Secciones a incluir</legend>
                        <div className="flex flex-wrap gap-2">
                            {SECCIONES_OPC.map(([valor, etiqueta]) => {
                                const activo = seccionesPdf.includes(valor);
                                return (
                                    <label
                                        key={valor}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                                            activo
                                                ? 'border-primary/90 bg-primary/10 text-primary shadow-2xs'
                                                : 'border-slate-300/90 bg-background hover:border-slate-400 hover:bg-accent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={activo}
                                            onChange={() => alternar(seccionesPdf, valor, setSeccionesPdf)}
                                            className="accent-primary"
                                        />
                                        {etiqueta}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div>
                        <a
                            href={urlPdf()}
                            className={`inline-flex items-center rounded-xl border border-slate-400/90 bg-background px-4 py-2 text-sm font-medium shadow-2xs transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-accent hover:shadow-sm ${
                                seccionesPdf.length === 0 ? 'pointer-events-none opacity-50' : ''
                            }`}
                        >
                            Descargar PDF
                        </a>
                    </div>
                </div>

                {reportes.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-400/80 bg-muted/20 p-6 text-sm text-muted-foreground">
                        No hay reportes en el rango seleccionado.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {reportes.map((r) => {
                            const expandido = abierto === r.id;

                            return (
                                <div key={r.id} className={claseTarjeta}>
                                    <button
                                        type="button"
                                        onClick={() => setAbierto(expandido ? null : r.id)}
                                        aria-expanded={expandido}
                                        className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-muted/20"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-semibold capitalize">{fechaLarga(r.fecha)}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Turno {NOMBRE_TURNO[r.turno] ?? r.turno}
                                                {veTodo ? ` · ${r.agente}` : ''}
                                                {` · ${r.tareas.length} ${r.tareas.length === 1 ? 'tarea' : 'tareas'}`}
                                                {r.intervenciones.length > 0 &&
                                                    ` · ${r.intervenciones.length} ${r.intervenciones.length === 1 ? 'intervención' : 'intervenciones'}`}
                                            </div>
                                        </div>
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-300/90 bg-background">
                                            {expandido ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                        </span>
                                    </button>

                                    {expandido && <Detalle r={r} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </>
    );
}