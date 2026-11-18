import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';

type AgenteOpcion = { id: number; nombre: string; apellido: string };
type TurnoDelDia = { agente_id: number; turno: string };
type Turno = 'manana' | 'tarde' | 'noche' | 'especial';

type Props = {
    agentesDisponibles: AgenteOpcion[];
    fechaInicial: string;
    horariosConfig: Record<string, [string, string]>;
    especialConfig: { min_horas: number; max_horas: number };
    turnosDelDia: TurnoDelDia[];
};

const SECUENCIA: Turno[] = ['manana', 'tarde', 'noche'];
const NOMBRES: Record<Turno, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

export default function TurnosIndex({
    agentesDisponibles,
    fechaInicial,
    horariosConfig,
    especialConfig,
    turnosDelDia,
}: Props) {
    const [paso, setPaso] = useState<'fecha' | 'tipo_jornada' | 'turno'>('fecha');
    const [fecha, setFecha] = useState(fechaInicial);
    const [tipoJornada, setTipoJornada] = useState<'normal' | 'especial'>('normal');
    const [turno, setTurno] = useState<Turno>('manana');
    const [agenteIds, setAgenteIds] = useState<number[]>([]);
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');

    // Agentes con algún turno ese día (viene del servidor)
    const ocupados = new Set(turnosDelDia.map((t) => t.agente_id));

    // ---------- PASO 1 -> 2 ----------
    const continuarFecha = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fecha) return;
        setMensaje('');

        // Carga los turnos ya existentes de ese día
        router.get(
            '/admin/turnos',
            { fecha },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['turnosDelDia', 'fechaInicial'],
                onSuccess: () => setPaso('tipo_jornada'),
            },
        );
    };

    // ---------- PASO 2 -> 3 ----------
    const elegirJornada = (tipo: 'normal' | 'especial') => {
        setTipoJornada(tipo);
        setAgenteIds([]);
        setErrores({});

        if (tipo === 'normal') {
            const [ini, fin] = horariosConfig.manana ?? ['', ''];
            setTurno('manana');
            setHoraInicio(ini);
            setHoraFin(fin);
        } else {
            setTurno('especial');
            setHoraInicio('');
            setHoraFin('');
        }
        setPaso('turno');
    };

    // ---------- AVANZAR AL SIGUIENTE TURNO O TERMINAR ----------
    const avanzar = () => {
        if (tipoJornada === 'normal' && turno !== 'noche') {
            const siguiente = SECUENCIA[SECUENCIA.indexOf(turno) + 1];
            const [ini, fin] = horariosConfig[siguiente] ?? ['', ''];
            setTurno(siguiente);
            setHoraInicio(ini);
            setHoraFin(fin);
            setAgenteIds([]);
            setErrores({});
            return;
        }

        setMensaje(
            tipoJornada === 'normal'
                ? 'Jornada normal completada correctamente.'
                : 'Turno especial creado correctamente.',
        );
        setAgenteIds([]);
        setPaso('fecha');
    };

    // ---------- GUARDAR ----------
    const guardar = (e: React.FormEvent) => {
        e.preventDefault();

        router.post(
            '/admin/turnos',
            {
                fecha,
                turno,
                agente_ids: agenteIds,
                ...(tipoJornada === 'especial' && {
                    hora_inicio_prog: horaInicio,
                    hora_fin_prog: horaFin,
                }),
            },
            {
                preserveState: true,
                preserveScroll: true,
                onStart: () => {
                    setProcesando(true);
                    setErrores({});
                },
                onError: (errs) => setErrores(errs as Record<string, string>),
                onSuccess: () => avanzar(),
                onFinish: () => setProcesando(false),
            },
        );
    };

    const toggleAgente = (id: number, marcado: boolean) => {
        setAgenteIds((prev) => (marcado ? [...prev, id] : prev.filter((x) => x !== id)));
    };

    const esUltimo = tipoJornada === 'especial' || turno === 'noche';
    const siguienteNombre =
        tipoJornada === 'normal' && turno !== 'noche'
            ? NOMBRES[SECUENCIA[SECUENCIA.indexOf(turno) + 1]]
            : '';

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Gestión y Asignación de Turnos</h1>

            {mensaje && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-md">
                    {mensaje}
                </div>
            )}

            {/* PASO 1: FECHA */}
            {paso === 'fecha' && (
                <div className="p-6 border rounded-lg shadow-sm space-y-4 bg-card">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="size-5" /> Paso 1: Seleccioná el día
                    </h2>
                    <form onSubmit={continuarFecha} className="flex gap-4 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Fecha de la jornada</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm bg-background"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1"
                        >
                            Siguiente <ArrowRight className="size-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* PASO 2: TIPO DE JORNADA */}
            {paso === 'tipo_jornada' && (
                <div className="p-6 border rounded-lg shadow-sm space-y-4 bg-card">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Paso 2: Tipo de jornada para el {fecha}</h2>
                        <button
                            type="button"
                            onClick={() => setPaso('fecha')}
                            className="text-xs text-muted-foreground hover:underline"
                        >
                            Cambiar fecha
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => elegirJornada('normal')}
                            className="p-6 border rounded-xl hover:border-primary text-left space-y-2 bg-background group"
                        >
                            <h3 className="font-bold group-hover:text-primary flex items-center gap-2">
                                <Clock className="size-5" /> Jornada Normal
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Mañana ➔ Tarde ➔ Noche con horarios preconfigurados.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => elegirJornada('especial')}
                            className="p-6 border rounded-xl hover:border-primary text-left space-y-2 bg-background group"
                        >
                            <h3 className="font-bold group-hover:text-primary flex items-center gap-2">
                                <Users className="size-5" /> Turno Especial
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Horario personalizado de {especialConfig.min_horas} a {especialConfig.max_horas} horas.
                            </p>
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 3: TURNO */}
            {paso === 'turno' && (
                <div className="p-6 border rounded-lg shadow-sm space-y-6 bg-card">
                    <div className="flex justify-between items-center border-b pb-4">
                        <div>
                            <h2 className="text-lg font-semibold uppercase tracking-wider text-primary">
                                {tipoJornada === 'normal' ? `Turno ${NOMBRES[turno]}` : 'Turno Especial'}
                            </h2>
                            <p className="text-xs text-muted-foreground">Fecha: {fecha}</p>
                        </div>
                        <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium uppercase">
                            {tipoJornada === 'normal'
                                ? `${SECUENCIA.indexOf(turno) + 1} de 3`
                                : 'Especial'}
                        </span>
                    </div>

                    {tipoJornada === 'normal' && (
                        <div className="bg-muted/40 p-3 rounded-md text-sm flex items-center justify-between border">
                            <span>Horario oficial del bloque:</span>
                            <span className="font-mono font-semibold bg-background px-2 py-1 rounded border">
                                {horaInicio} a {horaFin}
                                {turno === 'noche' && ' (cruza medianoche)'}
                            </span>
                        </div>
                    )}

                    <form onSubmit={guardar} className="space-y-4">
                        {Object.keys(errores).length > 0 && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md space-y-1">
                                {Object.entries(errores).map(([campo, msg]) => (
                                    <p key={campo}>
                                        <strong>{campo}:</strong> {msg}
                                    </p>
                                ))}
                            </div>
                        )}

                        {tipoJornada === 'especial' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Hora inicio</label>
                                    <input
                                        type="time"
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Hora fin</label>
                                    <input
                                        type="time"
                                        value={horaFin}
                                        onChange={(e) => setHoraFin(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium block mb-2">Seleccionar agentes</label>
                            <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-1 bg-background">
                                {agentesDisponibles.map((agente) => {
                                    const ocupado = ocupados.has(agente.id);
                                    return (
                                        <label
                                            key={agente.id}
                                            className={`flex items-center gap-2 p-2 rounded text-sm ${ocupado
                                                    ? 'bg-muted opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-accent cursor-pointer'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={ocupado}
                                                checked={agenteIds.includes(agente.id)}
                                                onChange={(e) => toggleAgente(agente.id, e.target.checked)}
                                            />
                                            <span>
                                                {agente.apellido}, {agente.nombre}
                                            </span>
                                            {ocupado && (
                                                <span className="ml-auto text-xs text-red-500 font-semibold">
                                                    Ya tiene turno este día
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between gap-3 pt-4 border-t">
                            {tipoJornada === 'normal' && turno !== 'manana' && !esUltimo ? (
                                <button
                                    type="button"
                                    onClick={avanzar}
                                    className="text-sm text-muted-foreground hover:underline"
                                >
                                    Omitir {NOMBRES[turno]}
                                </button>
                            ) : (
                                <span />
                            )}

                            <button
                                type="submit"
                                disabled={procesando || agenteIds.length === 0}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                            >
                                {esUltimo ? 'Guardar turno' : `Guardar y pasar a ${siguienteNombre}`}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}