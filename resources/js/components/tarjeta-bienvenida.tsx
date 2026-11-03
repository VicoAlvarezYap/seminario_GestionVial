import { router, usePage } from '@inertiajs/react';
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

export type TareaMiTurno = {
    id: number;
    titulo: string | null;
    lugar: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    estado: string;
    detalle: string | null;
};

export type MiTurno = {
    id: number;
    turno: string;
    inicio_prog: string;
    fin_prog: string;
    inicio_real: string | null;
    fin_real: string | null;
    inicia_desde: string;
    termina_hasta: string;
    ahora: string;
    tiene_reporte: boolean;
    tareas: Array<{
        id: number;
        titulo: string | null;
        lugar: string | null;
        hora_inicio: string | null;
        hora_fin: string | null;
        estado: string;
        detalle: string | null;
    }>;
};

type Props = {
    nombre: string;
    turno: MiTurno | null; // null si no hay turno hoy o si es administrador
    onTerminar?: (turno: MiTurno) => void; // abre el formulario del reporte
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};
const ETIQUETA_ESTADO: Record<string, string> = {
    programado: 'Programado',
    iniciado: 'Iniciado',
    en_proceso: 'En proceso',
    finalizado: 'Finalizado',
};
const pad = (n: number) => String(n).padStart(2, '0');

const duracion = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function TarjetaBienvenida({ nombre, turno, onTerminar }: Props) {
    const inicial = nombre.trim().charAt(0).toUpperCase();

    const { errors } = usePage().props as unknown as { errors: Record<string, string | undefined> };

    const [procesando, setProcesando] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());
    const [desfase, setDesfase] = useState(0); // servidor - dispositivo

    const horaServidor = turno?.ahora;
    const enCurso = !!turno?.inicio_real && !turno?.fin_real;

    useEffect(() => {
        if (horaServidor) {
            setDesfase(Date.parse(horaServidor) - Date.now());
        }
    }, [horaServidor]);

    const reloj = !!turno && !turno.fin_real;

    useEffect(() => {
        if (!reloj) {
            return;
        }
        setAhora(Date.now());
        const id = window.setInterval(() => setAhora(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [reloj]);

    const ahoraServidor = ahora + desfase;
    const antesDeHora = !!turno && ahoraServidor < Date.parse(turno.inicia_desde);
    const pasadoDeHora = !!turno && ahoraServidor > Date.parse(turno.termina_hasta);
    const puedeIniciar = !antesDeHora && !pasadoDeHora;

    const iniciar = () => {
        if (!turno) {
            return;
        }
        setProcesando(true);
        router.post(`/turnos/${turno.id}/iniciar`, {}, {
            preserveScroll: true,
            onFinish: () => setProcesando(false),
        });
    };

    const terminar = () => {
        if (!turno) {
            return;
        }
        // Si el reporte aún no existe, se abre su formulario: reporte y salida se guardan juntos
        if (!turno.tiene_reporte && onTerminar) {
            onTerminar(turno);
            return;
        }
        if (!window.confirm('¿Terminar el turno ahora?')) {
            return;
        }
        setProcesando(true);
        router.post(`/turnos/${turno.id}/finalizar`, {}, {
            preserveScroll: true,
            onFinish: () => setProcesando(false),
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {inicial}
            </div>

            <p className="min-w-0 flex-1 text-base font-medium">
                BIENVENIDO <span className="font-bold">{nombre}</span>
            </p>

            {turno && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
                    <div className="text-sm">
                        <span className="font-medium">Turno de hoy:</span> {NOMBRE_TURNO[turno.turno] ?? turno.turno} ·{' '}
                        {hora(turno.inicio_prog)} – {hora(turno.fin_prog)}
                    </div>

                    {/* Tareas del turno */}
                    {turno.tareas.length > 0 && (
                        <ul className="space-y-1 rounded-lg border p-2 text-sm">
                            {turno.tareas.map((t) => (
                                <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-2">
                                    <span className="font-medium">{t.titulo ?? 'Sin título'}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {[t.lugar, t.hora_inicio && `${t.hora_inicio}${t.hora_fin ? `–${t.hora_fin}` : ''}`]
                                            .filter(Boolean)
                                            .join(' · ')}
                                        {' · '}
                                        {ETIQUETA_ESTADO[t.estado] ?? t.estado}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!turno.inicio_real && (
                        <button
                            type="button"
                            disabled={procesando || !puedeIniciar}
                            onClick={iniciar}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Play className="size-4" /> Iniciar turno
                        </button>
                    )}

                    {enCurso && turno.inicio_real && (
                        <>
                            <div className="text-muted-foreground text-sm">
                                Comenzaste a las <span className="text-foreground font-medium">{hora(turno.inicio_real)}</span>
                            </div>
                            <div className="text-center font-mono text-3xl font-semibold tabular-nums">
                                {duracion(ahora + desfase - Date.parse(turno.inicio_real))}
                            </div>
                            <button
                                type="button"
                                disabled={procesando}
                                onClick={terminar}
                                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                            >
                                <Square className="size-4" /> Terminar turno
                            </button>
                        </>
                    )}

                    {turno.inicio_real && turno.fin_real && (
                        <div className="text-sm">
                            Turno finalizado: {hora(turno.inicio_real)} – {hora(turno.fin_real)} (
                            {duracion(Date.parse(turno.fin_real) - Date.parse(turno.inicio_real))})
                        </div>
                    )}

                    {errors.fichada && <p className="text-sm text-red-600">{errors.fichada}</p>}
                </div>
            )}
        </div>
    );
}