import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { CalendarClock, CalendarDays, FileText, AlertTriangle, Play } from 'lucide-react';
import CierreTurno from '@/components/cierre-turno';
import FlashMensajes from '@/components/flash-mensajes';
import ReprogramarTurnoModal from '@/components/reprogramar-turno-modal';

type TurnoHoy = {
    id: number;
    turno: string;
    estado: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    tareas: { titulo: string; lugar: string | null }[];
    puede_fichar: boolean;
    hora_entrada: string | null;
    horario_cumplido: boolean;
    hora_fin_iso: string | null;
    ahora: string;
    tolerancia_min: number;
    inicio_habilitado_iso: string;
    inicio_habilitado_desde: string;
} | null;

type SolicitudTurno = {
    id: number;
    tipo: 'cambio_horario' | 'tomar_dia';
    estado: 'pendiente' | 'rechazada';
    comentario: string | null;
};

type TurnoSemana = {
    id: number;
    fecha: string;
    turno: string;
    estado: string;
    es_hoy: boolean;
    /** Lo calcula el servidor; si no llega, se estima con la fecha del navegador. */
    puede_reprogramar?: boolean;
    solicitud?: SolicitudTurno | null;
};

type Props = {
    agente: { nombre: string; apellido: string };
    turnoHoy: TurnoHoy;
    turnosSemana: TurnoSemana[];
    novedades: { id: number; tipo: string; desde: string; hasta: string; estado: string }[];
    eventosMes: { id: number; titulo: string; fecha: string; estado: string }[];
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const ESTADO_LICENCIA: Record<string, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-yellow-100 text-yellow-800' },
    aprobada: { texto: 'Aprobada', clase: 'bg-green-100 text-green-800' },
    rechazada: { texto: 'Rechazada', clase: 'bg-red-100 text-red-800' },
    cancelada: { texto: 'Cancelada', clase: 'bg-zinc-200 text-zinc-700' },
    finalizada: { texto: 'Finalizada', clase: 'bg-blue-100 text-blue-800' },
};

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
            {children}
        </section>
    );
}

export default function InicioAgente({ agente, turnoHoy, turnosSemana, novedades, eventosMes }: Props) {
    const [reprogramando, setReprogramando] = useState<TurnoSemana | null>(null);
    const hoyLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const [ahoraMs, setAhoraMs] = useState(() => Date.now());
    const cancelarSolicitud = (id: number) => {
        router.patch(`/reprogramaciones/${id}/cancelar`, {}, { preserveScroll: true });
    };

    const iniciarTurno = () => {
        if (turnoHoy) {
            router.post(`/turnos/${turnoHoy.id}/iniciar`, {}, { preserveScroll: true });
        }
    };
    useEffect(() => {
        const id = setInterval(() => setAhoraMs(Date.now()), 15000);
        return () => clearInterval(id);
    }, []);

    const inicioHabilitado = turnoHoy
        ? ahoraMs >= new Date(turnoHoy.inicio_habilitado_iso).getTime()
        : false;

    return (
        <>
            <Head title="Inicio" />

            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <FlashMensajes />

                <header>
                    <h1 className="text-2xl font-bold">Hola, {agente.nombre}</h1>
                    <p className="text-sm text-muted-foreground">Resumen de tu trabajo</p>
                </header>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Turno de hoy: lo más importante de la pantalla */}
                        <Tarjeta titulo="Tu turno de hoy">
                            {turnoHoy ? (
                                <>
                                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                                        <p className="text-lg font-semibold">
                                            {NOMBRE_TURNO[turnoHoy.turno] ?? turnoHoy.turno}
                                        </p>
                                        <p className="font-mono text-sm text-muted-foreground">
                                            {turnoHoy.hora_inicio} a {turnoHoy.hora_fin}
                                        </p>
                                    </div>

                                    {turnoHoy.tareas.length > 0 ? (
                                        <ul className="space-y-1 text-sm">
                                            {turnoHoy.tareas.map((t, i) => (
                                                <li key={i}>
                                                    {t.titulo}
                                                    {t.lugar && <span className="text-muted-foreground"> · {t.lugar}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Todavía no tenés tareas asignadas.</p>
                                    )}

                                    {turnoHoy.puede_fichar && (
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={iniciarTurno}
                                                disabled={!inicioHabilitado}
                                                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Play className="size-4" /> Iniciar turno
                                            </button>
                                            {!inicioHabilitado && (
                                                <p className="text-xs text-muted-foreground">
                                                    Podés iniciar desde las {turnoHoy.inicio_habilitado_desde}.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {turnoHoy.estado === 'en_curso' && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-green-700">
                                                Turno en curso
                                                {turnoHoy.hora_entrada && <> · iniciaste a las {turnoHoy.hora_entrada}</>}
                                            </p>
                                            <CierreTurno
                                                turnoId={turnoHoy.id}
                                                horarioCumplido={turnoHoy.horario_cumplido}
                                                finProgramado={turnoHoy.hora_fin_iso}
                                                ahora={turnoHoy.ahora}
                                                toleranciaMin={turnoHoy.tolerancia_min}
                                            />
                                        </div>
                                    )}

                                    {turnoHoy.estado === 'cumplido' && (
                                        <p className="text-sm font-medium text-green-700">
                                            Turno finalizado. ¡Buen trabajo!
                                        </p>
                                    )}

                                    {turnoHoy.estado === 'abandonado' && (
                                        <p className="text-sm font-medium text-red-700">
                                            Turno cerrado por abandono. Queda pendiente de revisión.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Hoy no tenés turno asignado.</p>
                            )}
                        </Tarjeta>

                        {/* Turnos de la semana */}
                        <Tarjeta titulo="Turnos de la semana">
                            {turnosSemana.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No tenés turnos esta semana.</p>
                            ) : (
                                <ul className="divide-y">
                                    {turnosSemana.map((t) => {
                                        const pendiente = t.solicitud?.estado === 'pendiente';
                                        const rechazada = t.solicitud?.estado === 'rechazada';
                                        const programado = t.estado === 'programado';
                                        // Se puede pedir hasta el día anterior al turno
                                        const puede = t.puede_reprogramar ?? (programado && t.fecha > hoyLocal);

                                        return (
                                            <li
                                                key={t.id}
                                                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                                            >
                                                <span className={t.es_hoy ? 'font-semibold' : ''}>
                                                    {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                                                        weekday: 'long',
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                    {t.es_hoy && <span className="ml-2 text-xs text-primary">(hoy)</span>}
                                                </span>

                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <span className="text-muted-foreground">
                                                        {NOMBRE_TURNO[t.turno] ?? t.turno}
                                                    </span>

                                                    {pendiente && t.solicitud && (
                                                        <>
                                                            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                                                {t.solicitud.tipo === 'tomar_dia'
                                                                    ? 'Día solicitado'
                                                                    : 'Cambio solicitado'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => cancelarSolicitud(t.solicitud!.id)}
                                                                className="text-xs text-muted-foreground underline hover:text-foreground"
                                                            >
                                                                Cancelar solicitud
                                                            </button>
                                                        </>
                                                    )}

                                                    {rechazada && (
                                                        <span
                                                            title={t.solicitud?.comentario ?? undefined}
                                                            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                                                        >
                                                            Solicitud rechazada
                                                        </span>
                                                    )}

                                                    {!pendiente && !rechazada && programado && (
                                                        <button
                                                            type="button"
                                                            disabled={!puede}
                                                            onClick={() => setReprogramando(t)}
                                                            title={
                                                                puede
                                                                    ? undefined
                                                                    : 'Solo podés pedirlo hasta el día anterior al turno'
                                                            }
                                                            className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <CalendarClock className="size-3.5" /> Reprogramar
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Tarjeta>

                        {/* Novedades: licencias recientes con su estado */}
                        <Tarjeta titulo="Novedades">
                            {novedades.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No tenés novedades.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {novedades.map((n) => {
                                        const estado = ESTADO_LICENCIA[n.estado] ?? {
                                            texto: n.estado,
                                            clase: 'bg-zinc-100 text-zinc-700',
                                        };
                                        return (
                                            <li
                                                key={n.id}
                                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                                            >
                                                <span>
                                                    Licencia · {n.tipo} ({n.desde} al {n.hasta})
                                                </span>
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}
                                                >
                                                    {estado.texto}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Tarjeta>
                    </div>

                    {/* Columna lateral: acciones rápidas y eventos */}
                    <div className="space-y-6">
                        <Tarjeta titulo="Acciones rápidas">
                            <div className="grid gap-2">
                                <Link
                                    href="/intervenciones"
                                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
                                >
                                    <AlertTriangle className="size-4" /> Reportar intervención
                                </Link>
                                <Link
                                    href="/licencias"
                                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
                                >
                                    <FileText className="size-4" /> Pedir licencia
                                </Link>
                                <Link
                                    href="/mi-historial-turnos"
                                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
                                >
                                    <CalendarDays className="size-4" /> Ver mi historial
                                </Link>
                            </div>
                        </Tarjeta>

                        <Tarjeta titulo="Eventos del mes">
                            {eventosMes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay eventos programados este mes.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {eventosMes.map((e) => (
                                        <li key={e.id} className="text-sm">
                                            <p className="font-medium">{e.titulo}</p>
                                            <p className="text-xs text-muted-foreground">{e.fecha}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>
                    </div>
                </div>
            </div>

            <ReprogramarTurnoModal turno={reprogramando} onClose={() => setReprogramando(null)} />
        </>
    );
}