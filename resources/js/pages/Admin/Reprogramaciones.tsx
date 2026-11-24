import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import FlashMensajes from '@/components/flash-mensajes';

type Solicitud = {
    id: number;
    tipo: 'cambio_horario' | 'tomar_dia';
    estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
    motivo: string;
    agente: string;
    fecha: string;
    turno_actual: string;
    horario_actual: string;
    nuevo_turno: string | null;
    horario_nuevo: string | null;
    creada: string;
    resuelta_por: string | null;
    resuelta_at: string | null;
    comentario_resolucion: string | null;
};

type Props = { pendientes: Solicitud[]; recientes: Solicitud[] };

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const ESTADO: Record<string, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-yellow-100 text-yellow-800' },
    aprobada: { texto: 'Aprobada', clase: 'bg-green-100 text-green-800' },
    rechazada: { texto: 'Rechazada', clase: 'bg-red-100 text-red-800' },
    cancelada: { texto: 'Cancelada', clase: 'bg-zinc-200 text-zinc-700' },
};

const fechaLarga = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

function descripcion(s: Solicitud) {
    if (s.tipo === 'tomar_dia') return 'Quiere tomarse el día';
    return `Quiere cambiar a ${NOMBRE_TURNO[s.nuevo_turno ?? ''] ?? s.nuevo_turno}${s.horario_nuevo ? ` (${s.horario_nuevo})` : ''}`;
}

function TarjetaPendiente({ s }: { s: Solicitud }) {
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);
    const errors = usePage<{ errors: Record<string, string> }>().props.errors ?? {};

    const resolver = (estado: 'aprobada' | 'rechazada') => {
        setEnviando(true);
        router.patch(
            `/admin/reprogramaciones/${s.id}/resolver`,
            { estado, comentario_resolucion: comentario || null },
            { preserveScroll: true, onFinish: () => setEnviando(false) },
        );
    };

    return (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-semibold">{s.agente}</p>
                    <p className="text-sm capitalize text-muted-foreground">{fechaLarga(s.fecha)}</p>
                </div>
                <span className="text-xs text-muted-foreground">Pedida el {s.creada}</span>
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p>
                    <span className="text-muted-foreground">Turno actual: </span>
                    {NOMBRE_TURNO[s.turno_actual] ?? s.turno_actual}
                    {s.horario_actual && <span className="font-mono text-xs"> · {s.horario_actual}</span>}
                </p>
                <p className="font-medium">{descripcion(s)}</p>
            </div>

            <p className="text-sm">
                <span className="text-muted-foreground">Motivo: </span>
                {s.motivo}
            </p>

            <div>
                <label htmlFor={`com-${s.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                    Comentario (obligatorio si la rechazás)
                </label>
                <textarea
                    id={`com-${s.id}`}
                    rows={2}
                    maxLength={500}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
                {errors.comentario_resolucion && (
                    <p className="mt-1 text-xs text-red-600">{errors.comentario_resolucion}</p>
                )}
                {errors.estado && <p className="mt-1 text-xs text-red-600">{errors.estado}</p>}
            </div>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    disabled={enviando}
                    onClick={() => resolver('rechazada')}
                    className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                >
                    Rechazar
                </button>
                <button
                    type="button"
                    disabled={enviando}
                    onClick={() => resolver('aprobada')}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                    Aprobar
                </button>
            </div>
        </div>
    );
}

export default function Reprogramaciones({ pendientes, recientes }: Props) {
    return (
        <>
            <Head title="Reprogramaciones" />

            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <FlashMensajes />

                <header>
                    <h1 className="text-2xl font-bold">Solicitudes de reprogramación</h1>
                    <p className="text-sm text-muted-foreground">
                        Cambios de horario y pedidos para tomar el día, enviados por los agentes.
                    </p>
                </header>

                <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Pendientes ({pendientes.length})
                    </h2>
                    {pendientes.length === 0 ? (
                        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                            No hay solicitudes pendientes.
                        </p>
                    ) : (
                        pendientes.map((s) => <TarjetaPendiente key={s.id} s={s} />)
                    )}
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Resueltas recientemente
                    </h2>
                    {recientes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Todavía no hay solicitudes resueltas.</p>
                    ) : (
                        <ul className="divide-y rounded-xl border bg-card shadow-sm">
                            {recientes.map((s) => {
                                const e = ESTADO[s.estado];
                                return (
                                    <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-medium">
                                                {s.agente} · <span className="capitalize">{fechaLarga(s.fecha)}</span>
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.clase}`}>
                                                {e.texto}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground">{descripcion(s)}</p>
                                        {s.resuelta_por && (
                                            <p className="text-xs text-muted-foreground">
                                                Resuelta por {s.resuelta_por} el {s.resuelta_at}
                                            </p>
                                        )}
                                        {s.comentario_resolucion && (
                                            <p className="text-xs">Comentario: {s.comentario_resolucion}</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}