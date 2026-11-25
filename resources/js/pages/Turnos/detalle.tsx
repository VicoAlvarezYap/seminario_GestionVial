import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import MapaEvento from '@/components/mapa-evento';
import type { TareaFila } from '@/components/turnos-compartidos';

type Fichaje = {
    tipo: string;
    hora: string;
    origen: string;
    latitud: string | number | null;
    longitud: string | number | null;
    precision_m: number | null;
    foto_url: string | null;
    motivo_salida: string | null;
};

type Props = {
    turno: {
        id: number;
        fecha: string;
        turno: string;
        estado: string;
        agente: string;
        hora_inicio: string | null;
        hora_fin: string | null;
    };
    fichajes: Fichaje[];
    tareas: TareaFila[];
    tieneReporte: boolean;
};

const NOMBRE: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

function TareasDelTurno({ tareas }: { tareas: TareaFila[] }) {
    if (tareas.length === 0) {
        return <p className="text-xs text-muted-foreground">Sin tareas asignadas.</p>;
    }

    const cancelarTarea = (tr: TareaFila) => {
        if (window.confirm(`¿Cancelar la tarea "${tr.titulo}"? Queda registrada como cancelada.`)) {
            router.patch(`/admin/tareas/${tr.id}/cancelar`, {}, { preserveScroll: true });
        }
    };

    return (
        <ul className="space-y-1">
            {tareas.map((tr) => (
                <li key={tr.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                        {tr.titulo}
                        {tr.lugar && <span className="text-muted-foreground"> · {tr.lugar}</span>}
                        {tr.hora_inicio && (
                            <span className="font-mono text-muted-foreground">
                                {' '}· {tr.hora_inicio}–{tr.hora_fin}
                            </span>
                        )}
                    </span>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => router.visit(`/admin/turnos/tareas?fecha=${tr.fecha}&editar=${tr.id}`)}
                            className="rounded border px-2 py-0.5 hover:bg-accent"
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => cancelarTarea(tr)}
                            className="rounded border border-red-200 px-2 py-0.5 text-red-700 hover:bg-red-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
            {children}
        </section>
    );
}

export default function TurnoDetalle({ turno, fichajes, tareas, tieneReporte }: Props) {
    const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

    return (
        <>
            <Head title="Detalle del turno" />

            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                <Link href="/admin/turnos/listado" className="text-sm text-primary hover:underline">
                    ← Volver a turnos
                </Link>

                <Tarjeta titulo="Turno">
                    <p className="text-lg font-semibold">{turno.agente}</p>
                    <p className="text-sm text-muted-foreground">
                        {turno.fecha} · {NOMBRE[turno.turno] ?? turno.turno}
                        {turno.hora_inicio && ` · ${turno.hora_inicio} a ${turno.hora_fin}`}
                    </p>
                    <p className="text-sm">Estado: {turno.estado}</p>
                </Tarjeta>

                <Tarjeta titulo="Fichajes">
                    {fichajes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin fichajes registrados.</p>
                    ) : (
                        <ul className="divide-y">
                            {fichajes.map((f, i) => (
                                <li key={i} className="flex flex-wrap items-start gap-4 py-3 text-sm">
                                    {f.foto_url ? (
                                        <button type="button" onClick={() => setFotoAbierta(f.foto_url)} className="shrink-0">
                                            <img
                                                src={f.foto_url}
                                                alt={`Foto de ${f.tipo}`}
                                                loading="lazy"
                                                className="h-24 w-24 rounded-lg border object-cover hover:opacity-80"
                                            />
                                        </button>
                                    ) : (
                                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                                            Sin foto
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="font-medium">
                                            {f.tipo.replace('_', ' ')} · {f.hora}{' '}
                                            <span className="font-normal text-muted-foreground">({f.origen})</span>
                                        </p>

                                        {f.motivo_salida && (
                                            <p className="text-xs text-muted-foreground">Motivo: {f.motivo_salida}</p>
                                        )}

                                        {f.latitud && f.longitud ? (
                                            <div className="space-y-1 pt-1">
                                                {f.precision_m !== null && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Precisión: ±{f.precision_m} m
                                                    </p>
                                                )}
                                                <div className="max-w-sm [&>div]:h-40">
                                                    <MapaEvento
                                                        puntos={[
                                                            {
                                                                latitud: f.latitud,
                                                                longitud: f.longitud,
                                                                etiqueta: `${f.tipo.replace('_', ' ')} · ${f.hora}`,
                                                            },
                                                        ]}
                                                    />
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Abrir en Google Maps
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Sin ubicación registrada.</p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Tarjeta>

                <Tarjeta titulo="Tareas">
                    <TareasDelTurno tareas={tareas} />
                </Tarjeta>

                <Tarjeta titulo="Reporte">
                    <p className="text-sm">{tieneReporte ? 'Reporte cargado.' : 'Todavía no hay reporte de este turno.'}</p>
                </Tarjeta>
            </div>

            {fotoAbierta && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setFotoAbierta(null)}
                >
                    <img src={fotoAbierta} alt="Foto del fichaje" className="max-h-full max-w-full rounded-lg" />
                </div>
            )}
        </>
    );
}