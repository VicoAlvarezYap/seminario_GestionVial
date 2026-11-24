import { Head, Link, useForm ,router} from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, ClipboardList, LogIn, LogOut, MapPin, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { TareaFila } from '@/components/turnos-compartidos';

/* ---------- Tipos ---------- */

type Turno = {
    id: number;
    fecha: string;
    agente: string;
    turno: string;
    estado: string;
    hora_inicio_prog: string;
    hora_fin_prog: string;
    entrada: string | null;
    salida: string | null;
    minutos_trabajados: number;
    minutos_tarde: number;
    minutos_extra: number;
    minutos_salida_anticipada: number;
};

type Fichaje = {
    id: number;
    tipo: 'entrada' | 'salida' | 'salida_anticipada';
    hora: string;
    origen: string;
    ip: string | null;
    latitud: string | number | null;
    longitud: string | number | null;
    motivo_salida: string | null;
    estado_revision: 'pendiente' | 'justificada' | 'injustificada' | null;
    comentario_revision: string | null;
    revisada_por: string | null;
    revisada_at: string | null;
};

type Reporte = {
    vehiculo_oficial: boolean;
    placa: string | null;
    radio: boolean;
    novedades: string | null;
    otros_equipos: string | null;
};


// Campos opcionales: se completan según lo que envíe el controlador
type Intervencion = { id: number; hora: string; estado: string; titulo?: string; descripcion?: string };
type Infraccion = { id: number; hora?: string; titulo?: string; descripcion?: string; estado?: string };

type Props = {
    turno: Turno;
    fichajes: Fichaje[];
    reporte: Reporte | null;
    tareas: TareaFila[];
    intervenciones: Intervencion[];
    infracciones: Infraccion[];
};

/* ---------- Textos y estilos ---------- */

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const ESTADO_TURNO: Record<string, { texto: string; clase: string }> = {
    programado: { texto: 'Programado', clase: 'bg-zinc-200 text-zinc-700' },
    en_curso: { texto: 'En curso', clase: 'bg-blue-100 text-blue-800' },
    cumplido: { texto: 'Cumplido', clase: 'bg-green-100 text-green-800' },
    ausente: { texto: 'Ausente', clase: 'bg-red-100 text-red-800' },
    cancelado: { texto: 'Cancelado', clase: 'bg-zinc-200 text-zinc-700' },
    reasignado: { texto: 'Reasignado', clase: 'bg-purple-100 text-purple-800' },
    abandonado: { texto: 'Abandonado', clase: 'bg-red-100 text-red-800' },
};

const TIPO_FICHAJE: Record<string, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    salida_anticipada: 'Salida anticipada',
};

const REVISION: Record<string, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente de revisión', clase: 'bg-yellow-100 text-yellow-800' },
    justificada: { texto: 'Justificada', clase: 'bg-green-100 text-green-800' },
    injustificada: { texto: 'Injustificada', clase: 'bg-red-100 text-red-800' },
};

const PESTANAS = [
    { id: 'resumen', nombre: 'Resumen' },
    { id: 'fichajes', nombre: 'Fichajes' },
    { id: 'reporte', nombre: 'Reporte' },
    { id: 'intervenciones', nombre: 'Intervenciones' },
    { id: 'infracciones', nombre: 'Infracciones' },
] as const;

type PestanaId = (typeof PESTANAS)[number]['id'];

const inputClase = 'w-full rounded-lg border bg-background p-2.5 text-sm';

/* ---------- Utilidades ---------- */
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
                            onClick={() => {
                                if (window.confirm(`¿Cancelar la tarea "${tr.titulo}"? Queda registrada como cancelada.`)) {
                                    router.patch(`/admin/tareas/${tr.id}/cancelar`, {}, { preserveScroll: true });
                                }
                            }}
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

function aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function Etiqueta({ texto, clase }: { texto: string; clase: string }) {
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>;
}

function Vacio({ mensaje }: { mensaje: string }) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{mensaje}</p>;
}

function enlaceMapa(lat: string | number | null, lng: string | number | null): string | null {
    return lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

/* ---------- Página ---------- */

export default function Detalle({ turno, fichajes, reporte, tareas, intervenciones, infracciones }: Props) {
    const [pestana, setPestana] = useState<PestanaId>('resumen');

    const contador: Partial<Record<PestanaId, number>> = {
        fichajes: fichajes.length,
        intervenciones: intervenciones.length,
        infracciones: infracciones.length,
    };

    const vacia = (id: PestanaId) => (id === 'reporte' ? reporte === null : contador[id] === 0);

    const pendiente = fichajes.find((f) => f.tipo === 'salida_anticipada' && f.estado_revision === 'pendiente');
    const estado = ESTADO_TURNO[turno.estado] ?? { texto: turno.estado, clase: 'bg-zinc-200 text-zinc-700' };

    return (
        <>
            <Head title={`Turno del ${turno.fecha} - ${turno.agente}`} />

            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <Link
                    href="/admin/turnos/historial"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="size-4" /> Volver al historial
                </Link>

                {/* Encabezado */}
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">{turno.agente}</h1>
                            <p className="text-sm text-muted-foreground">
                                {turno.fecha}, turno {NOMBRE_TURNO[turno.turno] ?? turno.turno}
                            </p>
                        </div>
                        <Etiqueta texto={estado.texto} clase={estado.clase} />
                    </div>

                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Dato titulo="Programado" valor={`${turno.hora_inicio_prog} a ${turno.hora_fin_prog}`} />
                        <Dato titulo="Real" valor={`${turno.entrada ?? '—'} a ${turno.salida ?? '—'}`} />
                        <Dato titulo="Trabajado" valor={`${turno.minutos_trabajados} min`} />
                        <Dato
                            titulo="Diferencias"
                            valor={
                                [
                                    turno.minutos_tarde > 0 && `${turno.minutos_tarde} min tarde`,
                                    turno.minutos_extra > 0 && `${turno.minutos_extra} min extra`,
                                    turno.minutos_salida_anticipada > 0 && `${turno.minutos_salida_anticipada} min antes`,
                                ]
                                    .filter(Boolean)
                                    .join(', ') || 'Sin diferencias'
                            }
                        />
                    </dl>
                </header>

                {/* Lo único que pide una acción va arriba de todo */}
                {pendiente && <RevisionAbandono fichaje={pendiente} />}

                {/* Pestañas */}
                <div role="tablist" aria-label="Información del turno" className="flex flex-wrap gap-1 border-b">
                    {PESTANAS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="tab"
                            aria-selected={pestana === p.id}
                            onClick={() => setPestana(p.id)}
                            className={`-mb-px px-4 py-2 text-sm transition-colors ${
                                pestana === p.id
                                    ? 'border-b-2 border-primary font-semibold text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            } ${vacia(p.id) && pestana !== p.id ? 'opacity-50' : ''}`}
                        >
                            {p.nombre}
                            {contador[p.id] !== undefined && ` (${contador[p.id]})`}
                        </button>
                    ))}
                </div>

                <div role="tabpanel">
                    {pestana === 'resumen' && (
                        <Resumen
                            turno={turno}
                            fichajes={fichajes}
                            intervenciones={intervenciones}
                            infracciones={infracciones}
                            tareas={tareas}
                        />
                    )}
                    {pestana === 'fichajes' && <Fichajes fichajes={fichajes} />}
                    {pestana === 'reporte' && <ReporteTurno reporte={reporte} />}
                    {pestana === 'intervenciones' && <ListaIntervenciones items={intervenciones} />}
                    {pestana === 'infracciones' && <ListaInfracciones items={infracciones} />}
                </div>
            </div>
        </>
    );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
    return (
        <div className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{titulo}</dt>
            <dd className="mt-0.5 text-sm font-medium">{valor}</dd>
        </div>
    );
}

/* ---------- Revisión de abandono ---------- */

function RevisionAbandono({ fichaje }: { fichaje: Fichaje }) {
    const form = useForm<{ estado_revision: string; comentario_revision: string }>({
        estado_revision: '',
        comentario_revision: '',
    });

    const resolver = (estado: 'justificada' | 'injustificada') => {
        form.transform((d) => ({ ...d, estado_revision: estado }));
        form.patch(`/admin/turnos/fichajes/${fichaje.id}/revision`, { preserveScroll: true });
    };

    return (
        <section className="space-y-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-950">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4" /> El agente abandonó el turno a las {fichaje.hora}
            </div>
            <p className="text-sm">
                <span className="font-medium">Motivo:</span> {fichaje.motivo_salida ?? 'No indicó motivo'}
            </p>

            <div className="space-y-1">
                <label htmlFor="comentario_revision" className="block text-sm font-medium">
                    Comentario de la revisión (opcional)
                </label>
                <textarea
                    id="comentario_revision"
                    rows={2}
                    value={form.data.comentario_revision}
                    onChange={(e) => form.setData('comentario_revision', e.target.value)}
                    className={`${inputClase} bg-white`}
                />
                {form.errors.comentario_revision && (
                    <p className="text-sm text-red-700">{form.errors.comentario_revision}</p>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => resolver('justificada')}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                    Marcar como justificada
                </button>
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => resolver('injustificada')}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                    Marcar como injustificada
                </button>
            </div>
        </section>
    );
}

/* ---------- Pestaña: Resumen (línea de tiempo) ---------- */

type Evento = {
    clave: string;
    hora: string;
    minutos: number;
    titulo: string;
    detalle?: string;
    icono: React.ReactNode;
    tono: string;
};

function Resumen({
    turno,
    fichajes,
    intervenciones,
    infracciones,
    tareas,
}: {
    turno: Turno;
    fichajes: Fichaje[];
    intervenciones: Intervencion[];
    infracciones: Infraccion[];
    tareas: TareaFila[]
}) {
    // Referencia para ordenar bien los turnos que cruzan la medianoche
    const base = aMinutos(turno.entrada ?? turno.hora_inicio_prog);
    const ordenable = (hora: string) => {
        const m = aMinutos(hora);
        return m < base ? m + 24 * 60 : m;
    };

    const eventos: Evento[] = [
        ...fichajes.map<Evento>((f) => ({
            clave: `f${f.id}`,
            hora: f.hora,
            minutos: ordenable(f.hora),
            titulo: TIPO_FICHAJE[f.tipo] ?? f.tipo,
            detalle: f.motivo_salida ?? undefined,
            icono: f.tipo === 'entrada' ? <LogIn className="size-4" /> : <LogOut className="size-4" />,
            tono: f.tipo === 'salida_anticipada' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
        })),
        ...intervenciones.map<Evento>((i) => ({
            clave: `i${i.id}`,
            hora: i.hora,
            minutos: ordenable(i.hora),
            titulo: i.titulo ?? `Intervención #${i.id}`,
            detalle: i.descripcion,
            icono: <ClipboardList className="size-4" />,
            tono: 'bg-blue-100 text-blue-700',
        })),
        ...infracciones
            .filter((x) => x.hora)
            .map<Evento>((x) => ({
                clave: `x${x.id}`,
                hora: x.hora as string,
                minutos: ordenable(x.hora as string),
                titulo: x.titulo ?? `Infracción #${x.id}`,
                detalle: x.descripcion,
                icono: <ShieldAlert className="size-4" />,
                tono: 'bg-orange-100 text-orange-700',
            })),
    ].sort((a, b) => a.minutos - b.minutos);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-3 lg:col-span-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Qué pasó durante el turno</h2>

                {eventos.length === 0 ? (
                    <Vacio mensaje="Todavía no hay registros de este turno." />
                ) : (
                    <ol className="space-y-0">
                        {eventos.map((e, idx) => (
                            <li key={e.clave} className="relative flex gap-3 pb-5 last:pb-0">
                                {idx < eventos.length - 1 && (
                                    <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden />
                                )}
                                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${e.tono}`}>
                                    {e.icono}
                                </span>
                                <div className="min-w-0 pt-1">
                                    <p className="text-sm">
                                        <span className="font-mono font-medium">{e.hora}</span>
                                        <span className="ml-2 font-medium">{e.titulo}</span>
                                    </p>
                                    {e.detalle && <p className="text-sm text-muted-foreground">{e.detalle}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">Tareas asignadas</h2>
                <TareasDelTurno tareas={tareas} />
            </section>
        </div>
    );
}

/* ---------- Pestaña: Fichajes ---------- */

function Fichajes({ fichajes }: { fichajes: Fichaje[] }) {
    if (fichajes.length === 0) return <Vacio mensaje="El agente todavía no registró fichajes." />;

    return (
        <ul className="space-y-3">
            {fichajes.map((f) => {
                const mapa = enlaceMapa(f.latitud, f.longitud);
                const revision = f.estado_revision ? REVISION[f.estado_revision] : null;

                return (
                    <li key={f.id} className="space-y-2 rounded-xl border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                                {TIPO_FICHAJE[f.tipo] ?? f.tipo} a las <span className="font-mono">{f.hora}</span>
                            </p>
                            {revision && <Etiqueta texto={revision.texto} clase={revision.clase} />}
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Desde {f.origen === 'movil' ? 'el celular' : 'la web'}
                            {f.ip && <>, IP {f.ip}</>}
                        </p>

                        {mapa ? (
                            <a
                                href={mapa}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                <MapPin className="size-4" /> Ver ubicación en el mapa
                            </a>
                        ) : (
                            <p className="text-sm text-muted-foreground">Sin ubicación registrada.</p>
                        )}

                        {f.motivo_salida && (
                            <p className="text-sm">
                                <span className="font-medium">Motivo de salida:</span> {f.motivo_salida}
                            </p>
                        )}

                        {f.revisada_at && (
                            <p className="text-sm text-muted-foreground">
                                Revisada por {f.revisada_por ?? 'un administrador'} el {f.revisada_at}
                                {f.comentario_revision && <>. Comentario: {f.comentario_revision}</>}
                            </p>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/* ---------- Pestaña: Reporte ---------- */

function ReporteTurno({ reporte }: { reporte: Reporte | null }) {
    if (!reporte) return <Vacio mensaje="Este turno no tiene reporte cargado." />;

    return (
        <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-3">
                <Dato
                    titulo="Vehículo oficial"
                    valor={reporte.vehiculo_oficial ? `Sí${reporte.placa ? `, patente ${reporte.placa}` : ''}` : 'No'}
                />
                <Dato titulo="Radio" valor={reporte.radio ? 'Sí' : 'No'} />
                <Dato titulo="Otros equipos" valor={reporte.otros_equipos || 'Ninguno'} />
            </dl>

            <section className="space-y-1 rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Novedades</h3>
                <p className="whitespace-pre-line text-sm">{reporte.novedades || 'Sin novedades.'}</p>
            </section>
        </div>
    );
}

/* ---------- Pestañas: Intervenciones e Infracciones ---------- */

function ListaIntervenciones({ items }: { items: Intervencion[] }) {
    if (items.length === 0) return <Vacio mensaje="No hubo intervenciones en este turno." />;

    return (
        <ul className="divide-y rounded-xl border bg-card">
            {items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                    <div>
                        <p className="font-medium">
                            <span className="font-mono">{i.hora}</span> {i.titulo ?? `Intervención #${i.id}`}
                        </p>
                        {i.descripcion && <p className="text-muted-foreground">{i.descripcion}</p>}
                    </div>
                    <Etiqueta texto={i.estado} clase="bg-zinc-100 text-zinc-700" />
                </li>
            ))}
        </ul>
    );
}

function ListaInfracciones({ items }: { items: Infraccion[] }) {
    if (items.length === 0) return <Vacio mensaje="No se registraron infracciones en este turno." />;

    return (
        <ul className="divide-y rounded-xl border bg-card">
            {items.map((x) => (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                    <div>
                        <p className="font-medium">
                            {x.hora && <span className="font-mono">{x.hora} </span>}
                            {x.titulo ?? `Infracción #${x.id}`}
                        </p>
                        {x.descripcion && <p className="text-muted-foreground">{x.descripcion}</p>}
                    </div>
                    {x.estado && <Etiqueta texto={x.estado} clase="bg-zinc-100 text-zinc-700" />}
                </li>
            ))}
        </ul>
    );
}