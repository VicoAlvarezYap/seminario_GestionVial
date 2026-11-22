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

const claseCampo = 'bg-background rounded-md border px-2 py-1.5 text-sm';

function Detalle({ r }: { r: Reporte }) {
    const recursos = [
        r.vehiculo_oficial ? `Vehículo oficial${r.placa ? ` (${r.placa})` : ''}` : null,
        r.radio ? 'Radio / comunicación' : null,
        r.otros_equipos,
    ].filter(Boolean);

    return (
        <div className="space-y-4 border-t p-4 text-sm">
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
                    <p className="text-muted-foreground italic">Sin tareas cargadas.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {r.tareas.map((t) => (
                            <li key={t.id}>
                                <span className="font-medium">{t.titulo ?? 'Sin título'}</span>
                                <span className="text-muted-foreground">
                                    {[t.lugar, t.hora_inicio && `${t.hora_inicio}${t.hora_fin ? `–${t.hora_fin}` : ''}`]
                                        .filter(Boolean)
                                        .map((x) => ` · ${x}`)
                                        .join('')}
                                </span>
                                {t.detalle && <div className="text-muted-foreground text-xs">{t.detalle}</div>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section>
                <h3 className="mb-1 font-semibold">Intervenciones</h3>
                {r.intervenciones.length === 0 ? (
                    <p className="text-muted-foreground italic">Sin intervenciones durante el turno.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {r.intervenciones.map((i) => (
                            <li key={i.id}>
                                <span className="font-medium">
                                    {NOMBRE_TIPO[i.tipo] ?? i.tipo}
                                    {i.tipo_evento ? ` · ${i.tipo_evento}` : ''}
                                    {i.tipo === 'infraccion' && i.cantidad > 1 ? ` (${i.cantidad})` : ''}
                                </span>
                                <span className="text-muted-foreground">
                                    {` · ${i.hora}`}
                                    {i.lugar ? ` · ${i.lugar}` : ''}
                                </span>
                                {i.descripcion && <div className="text-muted-foreground text-xs">{i.descripcion}</div>}
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
                <p className={r.novedades ? '' : 'text-muted-foreground italic'}>{r.novedades || 'Sin novedades.'}</p>
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

            <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
                <div className="flex items-center gap-2">
                    <FileText className="size-6" />
                    <h1 className="text-2xl font-bold">{vista === 'propios' ? 'Mis reportes' : 'Reportes de turno (todos los agentes)'}</h1>
                </div>

                {/* Filtro de fechas de la pantalla */}
                <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
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
                                    <option key={a.id} value={a.id}>{a.nombre}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={filtrar}
                        disabled={desdeInput === desde && hastaInput === hasta && agenteFiltro === (agenteId ? String(agenteId) : '')}
                        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                        Filtrar
                    </button>
                    <span className="text-muted-foreground ml-auto text-sm">
                        {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
                    </span>
                </div>

                {/* Bloque nuevo: descarga del PDF con filtros */}
                <div className="space-y-3 rounded-lg border p-3">
                    <h2 className="text-sm font-semibold">Descargar PDF</h2>

                    <fieldset className="space-y-2 text-sm">
                        <legend className="text-xs font-medium">Turnos a incluir (sin selección = todos)</legend>
                        <div className="flex flex-wrap gap-4">
                            {TURNOS_OPC.map(([valor, etiqueta]) => (
                                <label key={valor} className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={turnosPdf.includes(valor)}
                                        onChange={() => alternar(turnosPdf, valor, setTurnosPdf)}
                                    />
                                    {etiqueta}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="space-y-2 text-sm">
                        <legend className="text-xs font-medium">Secciones a incluir</legend>
                        <div className="flex flex-wrap gap-4">
                            {SECCIONES_OPC.map(([valor, etiqueta]) => (
                                <label key={valor} className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={seccionesPdf.includes(valor)}
                                        onChange={() => alternar(seccionesPdf, valor, setSeccionesPdf)}
                                    />
                                    {etiqueta}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <a
                        href={urlPdf()}
                        className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            seccionesPdf.length === 0 ? 'pointer-events-none opacity-50' : ''
                        }`}
                    >
                        Descargar PDF
                    </a>
                </div>

                {reportes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay reportes en el rango seleccionado.</p>
                ) : (
                    <div className="space-y-2">
                        {reportes.map((r) => {
                            const expandido = abierto === r.id;

                            return (
                                <div key={r.id} className="rounded-lg border bg-white shadow-sm dark:bg-zinc-900">
                                    <button
                                        type="button"
                                        onClick={() => setAbierto(expandido ? null : r.id)}
                                        aria-expanded={expandido}
                                        className="flex w-full items-center justify-between gap-3 p-4 text-left"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-semibold capitalize">{fechaLarga(r.fecha)}</div>
                                            <div className="text-muted-foreground text-sm">
                                                Turno {NOMBRE_TURNO[r.turno] ?? r.turno}
                                                {veTodo ? ` · ${r.agente}` : ''}
                                                {` · ${r.tareas.length} ${r.tareas.length === 1 ? 'tarea' : 'tareas'}`}
                                                {r.intervenciones.length > 0 &&
                                                    ` · ${r.intervenciones.length} ${r.intervenciones.length === 1 ? 'intervención' : 'intervenciones'}`}
                                            </div>
                                        </div>
                                        {expandido ? (
                                            <ChevronUp className="size-5 shrink-0" />
                                        ) : (
                                            <ChevronDown className="size-5 shrink-0" />
                                        )}
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
