import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, ClipboardList, LogIn, LogOut, MapPin, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import MapaEvento from '@/components/mapa-evento';

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
    latitud: string | number | null;
    longitud: string | number | null;
    precision_m: number | null;
    foto_url: string | null;
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

type Tarea = { titulo: string; lugar: string | null };

type Intervencion = { id: number; hora: string; estado: string; titulo?: string; descripcion?: string };
type Infraccion = { id: number; hora?: string; titulo?: string; descripcion?: string; estado?: string };

type Props = {
    turno: Turno;
    fichajes: Fichaje[];
    reporte: Reporte | null;
    tareas: Tarea[];
    intervenciones: Intervencion[];
    infracciones: Infraccion[];
};

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

const cardClase = 'rounded-2xl border border-slate-400/90 bg-card shadow-sm shadow-slate-950/5';
const inputClase =
    'w-full rounded-xl border border-slate-400/90 bg-background p-2.5 text-sm shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

function aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function Etiqueta({ texto, clase }: { texto: string; clase: string }) {
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>;
}

function Vacio({ mensaje }: { mensaje: string }) {
    return (
        <p className="rounded-2xl border border-dashed border-slate-400/80 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {mensaje}
        </p>
    );
}

function enlaceMapa(lat: string | number | null, lng: string | number | null): string | null {
    return lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

function parsearNovedades(texto: string | null): {
    campos: { clave: string; valor: string }[];
    relato: string;
} {
    if (!texto?.trim()) {
        return { campos: [], relato: 'Sin novedades.' };
    }

    const segmentos = texto
        .replace(/\.\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{1,20}:)/g, '.\n')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    const campos: { clave: string; valor: string }[] = [];
    const relatoLineas: string[] = [];
    const clavesConocidas = /^(ubicación|ubicacion|urgencia|prioridad|lugar|estado|involucrados)\s*:\s*(.+)$/i;

    for (const seg of segmentos) {
        const match = seg.match(clavesConocidas);
        if (match && relatoLineas.length === 0) {
            const claveNormalizada = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            const valorLimpio = match[2].replace(/\.$/, '').trim();
            campos.push({ clave: claveNormalizada, valor: valorLimpio });
        } else {
            relatoLineas.push(seg);
        }
    }

    return {
        campos,
        relato: relatoLineas.join(' ') || 'Sin detalle adicional.',
    };
}

function badgeUrgencia(valor: string): string {
    const v = valor.toLowerCase();
    if (v.includes('alta') || v.includes('crítica') || v.includes('critica')) {
        return 'border-red-400 bg-red-100 text-red-900';
    }
    if (v.includes('media')) {
        return 'border-amber-400 bg-amber-100 text-amber-900';
    }
    if (v.includes('baja')) {
        return 'border-emerald-400 bg-emerald-100 text-emerald-900';
    }
    return 'border-slate-400 bg-muted text-foreground';
}

export default function Detalle({ turno, fichajes, reporte, tareas, intervenciones, infracciones }: Props) {
    const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-400/90 bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-accent hover:shadow-sm"
                >
                    <ChevronLeft className="size-4" /> Volver al historial
                </Link>

                {/* Encabezado */}
                <header className="space-y-4">
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
                <div role="tablist" aria-label="Información del turno" className="flex flex-wrap gap-1 border-b border-slate-300">
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
                    {pestana === 'fichajes' && <Fichajes fichajes={fichajes} onFoto={setFotoAbierta} />}
                    {pestana === 'reporte' && <ReporteTurno reporte={reporte} />}
                    {pestana === 'intervenciones' && <ListaIntervenciones items={intervenciones} />}
                    {pestana === 'infracciones' && <ListaInfracciones items={infracciones} />}
                </div>
            </div>

            {fotoAbierta && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setFotoAbierta(null)}
                >
                    <img
                        src={fotoAbierta}
                        alt="Foto del fichaje"
                        className="max-h-full max-w-full rounded-xl border border-slate-400"
                    />
                </div>
            )}
        </>
    );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
    return (
        <div className={`${cardClase} p-3.5 transition-colors hover:border-slate-500`}>
            <dt className="text-xs font-medium text-muted-foreground">{titulo}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{valor}</dd>
        </div>
    );
}

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
        <section className="space-y-3 rounded-2xl border border-yellow-500/80 bg-yellow-50 p-4 text-yellow-950 shadow-md shadow-yellow-950/5">
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
                    className={`${inputClase} border-yellow-600/50 bg-white`}
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
                    className="rounded-xl border border-green-800 bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-md disabled:opacity-60"
                >
                    Marcar como justificada
                </button>
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => resolver('injustificada')}
                    className="rounded-xl border border-red-800 bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-md disabled:opacity-60"
                >
                    Marcar como injustificada
                </button>
            </div>
        </section>
    );
}

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
    tareas: Tarea[];
}) {
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
                    <ol className={`${cardClase} space-y-0 p-5`}>
                        {eventos.map((e, idx) => (
                            <li key={e.clave} className="relative flex gap-3 pb-5 last:pb-0">
                                {idx < eventos.length - 1 && (
                                    <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-300" aria-hidden />
                                )}
                                <span
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-black/10 ${e.tono}`}
                                >
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
                {tareas.length === 0 ? (
                    <Vacio mensaje="Sin tareas asignadas." />
                ) : (
                    <ul className={`${cardClase} divide-y divide-slate-300/80 text-sm`}>
                        {tareas.map((t, i) => (
                            <li key={i} className="px-4 py-3">
                                <span className="font-medium">{t.titulo}</span>
                                {t.lugar && <span className="text-muted-foreground"> en {t.lugar}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function Fichajes({ fichajes, onFoto }: { fichajes: Fichaje[]; onFoto: (url: string) => void }) {
    if (fichajes.length === 0) return <Vacio mensaje="El agente todavía no registró fichajes." />;

    return (
        <ul className="space-y-4">
            {fichajes.map((f) => {
                const mapa = enlaceMapa(f.latitud, f.longitud);
                const revision = f.estado_revision ? REVISION[f.estado_revision] : null;

                return (
                    <li key={f.id} className={`${cardClase} space-y-3 p-4 transition-colors hover:border-slate-500`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300/80 pb-2.5">
                            <p className="text-sm font-semibold">
                                {TIPO_FICHAJE[f.tipo] ?? f.tipo} a las <span className="font-mono">{f.hora}</span>
                            </p>
                            {revision && <Etiqueta texto={revision.texto} clase={revision.clase} />}
                        </div>

                        <div className="flex flex-wrap items-start gap-4">
                            {f.foto_url ? (
                                <button type="button" onClick={() => onFoto(f.foto_url!)} className="shrink-0">
                                    <img
                                        src={f.foto_url}
                                        alt={`Foto de ${TIPO_FICHAJE[f.tipo] ?? f.tipo}`}
                                        loading="lazy"
                                        className="h-28 w-28 rounded-xl border border-slate-400/90 object-cover shadow-xs transition-opacity hover:opacity-85"
                                    />
                                </button>
                            ) : (
                                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-400/80 bg-muted/20 text-xs text-muted-foreground">
                                    Sin foto
                                </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1.5">
                                {f.latitud !== null && f.longitud !== null ? (
                                    <>
                                        {f.precision_m !== null && (
                                            <p className="text-xs text-muted-foreground">Precisión: ±{f.precision_m} m</p>
                                        )}
                                        <div className="max-w-sm overflow-hidden rounded-xl border border-slate-400/90 [&>div]:h-40">
                                            <MapaEvento
                                                puntos={[
                                                    {
                                                        latitud: f.latitud,
                                                        longitud: f.longitud,
                                                        etiqueta: `${TIPO_FICHAJE[f.tipo] ?? f.tipo} · ${f.hora}`,
                                                    },
                                                ]}
                                            />
                                        </div>
                                        {mapa && (
                                            <a
                                                href={mapa}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                            >
                                                <MapPin className="size-3.5" /> Abrir en Google Maps
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Sin ubicación registrada.</p>
                                )}
                            </div>
                        </div>

                        {f.motivo_salida && (
                            <p className="text-sm">
                                <span className="font-medium">Motivo de salida:</span> {f.motivo_salida}
                            </p>
                        )}

                        {f.revisada_at && (
                            <p className="border-t border-slate-300/80 pt-2 text-sm text-muted-foreground">
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

function ReporteTurno({ reporte }: { reporte: Reporte | null }) {
    if (!reporte) return <Vacio mensaje="Este turno no tiene reporte cargado." />;

    const { campos, relato } = parsearNovedades(reporte.novedades);
    const ubicacion = campos.find((c) => c.clave === 'Ubicación' || c.clave === 'Ubicacion');
    const urgencia = campos.find((c) => c.clave === 'Urgencia' || c.clave === 'Prioridad');
    const otrosCampos = campos.filter((c) => c !== ubicacion && c !== urgencia);

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

            {(ubicacion || urgencia || otrosCampos.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ubicacion && (
                        <div className={`${cardClase} p-3.5 transition-colors hover:border-slate-500`}>
                            <p className="text-xs font-medium text-muted-foreground">Ubicación</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{ubicacion.valor}</p>
                        </div>
                    )}

                    {urgencia && (
                        <div className={`${cardClase} flex flex-col justify-between p-3.5 transition-colors hover:border-slate-500`}>
                            <p className="text-xs font-medium text-muted-foreground">Urgencia</p>
                            <div className="mt-1.5">
                                <span
                                    className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${badgeUrgencia(
                                        urgencia.valor,
                                    )}`}
                                >
                                    {urgencia.valor}
                                </span>
                            </div>
                        </div>
                    )}

                    {otrosCampos.map((c) => (
                        <div key={c.clave} className={`${cardClase} p-3.5 transition-colors hover:border-slate-500`}>
                            <p className="text-xs font-medium text-muted-foreground">{c.clave}</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{c.valor}</p>
                        </div>
                    ))}
                </div>
            )}

            <section className={`${cardClase} space-y-2 p-4 transition-colors hover:border-slate-500`}>
                <div className="flex items-center justify-between border-b border-slate-300/80 pb-2">
                    <h3 className="text-sm font-semibold">Detalle de novedades</h3>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{relato}</p>
            </section>
        </div>
    );
}

function ListaIntervenciones({ items }: { items: Intervencion[] }) {
    if (items.length === 0) return <Vacio mensaje="No hubo intervenciones en este turno." />;

    return (
        <ul className={`${cardClase} divide-y divide-slate-300/80`}>
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
        <ul className={`${cardClase} divide-y divide-slate-300/80`}>
            {items.map((x) => (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                    <div>
                        <p className="font-medium">
                            {x.hora && <span className="font-mono">{x.hora} </span>}
                            {x.titulo ?? `Infracción #${x.id}`}
                        </p>
                        {x.descripcion && <p className="whitespace-pre-line text-muted-foreground">{x.descripcion}</p>}
                    </div>
                    {x.estado && <Etiqueta texto={x.estado} clase="bg-zinc-100 text-zinc-700" />}
                </li>
            ))}
        </ul>
    );
}