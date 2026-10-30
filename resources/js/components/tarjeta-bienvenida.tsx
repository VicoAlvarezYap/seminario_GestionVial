import { router, usePage } from '@inertiajs/react';
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

export type MiTurno = {
    id: number;
    lugar: string | null;
    hora_inicio: string; // horario programado (HH:mm)
    hora_fin: string;
    inicio_real: string | null; // ISO, null si todavía no empezó
    fin_real: string | null; // ISO, null si todavía no terminó
    inicia_desde: string; // ISO: desde cuándo se puede iniciar
    termina_hasta: string; // ISO: hasta cuándo se puede iniciar
    ahora: string; // hora del servidor (ISO), para que el contador no dependa del reloj del celular
};

type Props = {
    nombre: string;
    turno: MiTurno | null; // null si no hay turno hoy o si es administrador
};

const pad = (n: number) => String(n).padStart(2, '0');

const duracion = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

const hora = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function TarjetaBienvenida({ nombre, turno }: Props) {
    const inicial = nombre.trim().charAt(0).toUpperCase();

    const { errors } = usePage().props as unknown as { errors: Record<string, string | undefined> };

    const [procesando, setProcesando] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());
    const [desfase, setDesfase] = useState(0); // servidor - dispositivo

    const horaServidor = turno?.ahora;
    const enCurso = !!turno?.inicio_real && !turno?.fin_real;

    // Corrige la diferencia entre el reloj del dispositivo y el del servidor
    useEffect(() => {
        if (horaServidor) {
            setDesfase(Date.parse(horaServidor) - Date.now());
        }
    }, [horaServidor]);

    // El reloj corre mientras el turno no haya terminado (para el contador y para habilitar el botón a su hora)
    const reloj = !!turno && !turno.fin_real;

    useEffect(() => {
        if (!reloj) {
            return;
        }
        setAhora(Date.now());
        const id = window.setInterval(() => setAhora(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [reloj]);

    // ¿Estamos dentro del horario en que se puede iniciar?
    const ahoraServidor = ahora + desfase;
    const antesDeHora = !!turno && ahoraServidor < Date.parse(turno.inicia_desde);
    const pasadoDeHora = !!turno && ahoraServidor > Date.parse(turno.termina_hasta);
    const puedeIniciar = !antesDeHora && !pasadoDeHora;

    const enviar = (accion: 'iniciar' | 'finalizar') => {
        if (!turno) {
            return;
        }
        if (accion === 'finalizar' && !window.confirm('¿Terminar el turno ahora?')) {
            return;
        }
        setProcesando(true);
        router.post(`/turnos/${turno.id}/${accion}`, {}, { preserveScroll: true, onFinish: () => setProcesando(false) });
    };

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
            {/* Círculo con la inicial */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {inicial}
            </div>

            {/* Texto de bienvenida */}
            <p className="min-w-0 flex-1 text-base font-medium">
                BIENVENIDO <span className="font-bold">{nombre}</span>
            </p>

            {/* Fichada: solo si hay turno hoy (el administrador nunca lo recibe) */}
            {turno && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
                    <div className="text-sm">
                        <span className="font-medium">Turno de hoy:</span> {turno.hora_inicio} – {turno.hora_fin}
                        {turno.lugar ? ` · ${turno.lugar}` : ''}
                    </div>

                    {/* Todavía no empezó */}
                    {!turno.inicio_real && (
                        <button
                            type="button"
                            disabled={procesando || !puedeIniciar}
                            onClick={() => enviar('iniciar')}
                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Play className="size-4" /> Iniciar turno
                        </button>
                    )}

                    {/* En curso: contador + botón para terminar */}
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
                                onClick={() => enviar('finalizar')}
                                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                            >
                                <Square className="size-4" /> Terminar turno
                            </button>
                        </>
                    )}

                    {/* Ya terminó */}
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