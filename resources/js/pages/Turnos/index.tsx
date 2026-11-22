import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, CornerUpLeft, Search, Users } from 'lucide-react';

type AgenteOpcion = { id: number; nombre: string; apellido: string };
type TurnoDelDia = { agente_id: number; turno: string };
type Turno = 'manana' | 'tarde' | 'noche' | 'especial';
type Jornada = 'normal' | 'especial';
type Seleccion = Record<Turno, number[]>;

type Props = {
    agentesDisponibles: AgenteOpcion[];
    fechaInicial: string;
    horariosConfig: Record<string, [string, string]>;
    especialConfig: { min_horas: number; max_horas: number };
    turnosDelDia: TurnoDelDia[];
    urlInicio?: string; // ej: '/admin' o '/dashboard'
    conLicencia: number[];
};

const SECUENCIA: Turno[] = ['manana', 'tarde', 'noche'];
const NOMBRES: Record<Turno, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};
const PASOS = ['Elegir fecha', 'Jornada', 'Asignar agentes', 'Asignar tareas'];
const VACIA: Seleccion = { manana: [], tarde: [], noche: [], especial: [] };

export default function TurnosIndex({
    agentesDisponibles,
    fechaInicial,
    horariosConfig,
    especialConfig,
    turnosDelDia,
    urlInicio = '/pagina_principal',
    conLicencia,
}: Props) {
    const [paso, setPaso] = useState(0); // 0 fecha, 1 jornada, 2 agentes (el 3 es la página de tareas)
    const [fecha, setFecha] = useState(fechaInicial);
    const [tipoJornada, setTipoJornada] = useState<Jornada>('normal');
    const [turno, setTurno] = useState<Turno>('manana'); // bloque activo
    const [seleccion, setSeleccion] = useState<Seleccion>(VACIA);
    const [busqueda, setBusqueda] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');

    const esNormal = tipoJornada === 'normal';
    const bloques: Turno[] = esNormal ? SECUENCIA : ['especial'];
    const esUltimoBloque = turno === bloques[bloques.length - 1];
    const agentesDelBloque = seleccion[turno];
    const jornadaCompleta = bloques.some((t) => seleccion[t].length > 0);
    const bloqueCompleto = agentesDelBloque.length > 0;

    const ocupados = useMemo(() => new Set(turnosDelDia.map((t) => t.agente_id)), [turnosDelDia]);
    const conLicenciaSet = useMemo(() => new Set(conLicencia), [conLicencia]);

    const agentesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return agentesDisponibles;
        return agentesDisponibles.filter((a) => `${a.apellido} ${a.nombre}`.toLowerCase().includes(q));
    }, [agentesDisponibles, busqueda]);

    const bloqueDeAgente = (id: number): Turno | null =>
        bloques.find((t) => t !== turno && seleccion[t].includes(id)) ?? null;

    const reiniciar = (msg = '') => {
        setPaso(0);
        setTurno('manana');
        setSeleccion(VACIA);
        setBusqueda('');
        setErrores({});
        setMensaje(msg);
    };

    // Cancelar lleva al inicio de la aplicación
    const irAlInicio = () => {
        if (urlInicio) {
            router.visit(urlInicio);
        } else {
            reiniciar();
        }
    };

    // Volver a la última página que visitó el usuario antes de esta vista
    const volverUltimaPagina = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            irAlInicio();
        }
    };

    const cambiarJornada = (valor: Jornada) => {
        setTipoJornada(valor);
        setSeleccion(VACIA);
        setErrores({});
    };

    const irAJornada = () => {
        setMensaje('');
        setSeleccion(VACIA);
        router.get(
            '/admin/turnos',
            { fecha },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['turnosDelDia', 'fechaInicial', 'conLicencia'],
                onSuccess: () => setPaso(1),
            },
        );
    };

    const irAAgentes = () => {
        setTurno(esNormal ? 'manana' : 'especial');
        setBusqueda('');
        setErrores({});
        setPaso(2);
    };

    const siguiente = (e: React.FormEvent) => {
        e.preventDefault();
        if (paso === 0 && fecha) irAJornada();
        else if (paso === 1) irAAgentes();
        else if (paso === 2 && !esUltimoBloque) {
            setTurno(SECUENCIA[SECUENCIA.indexOf(turno) + 1]);
            setBusqueda('');
            setErrores({});
        }
    };

    const anterior = () => {
        setErrores({});
        setBusqueda('');
        if (paso === 2 && esNormal && turno !== 'manana') {
            setTurno(SECUENCIA[SECUENCIA.indexOf(turno) - 1]);
            return;
        }
        setPaso((p) => Math.max(0, p - 1));
    };

    const guardar = (irATareas: boolean) => {
        router.post(
            '/admin/turnos/jornada',
            {
                fecha,
                ir_a_tareas: irATareas,
                bloques: bloques
                    .filter((t) => seleccion[t].length > 0)
                    .map((t) => ({
                        turno: t,
                        agente_ids: seleccion[t],
                        ...(!esNormal && { hora_inicio_prog: horaInicio, hora_fin_prog: horaFin }),
                    })),
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcesando(true);
                    setErrores({});
                },
                onError: (errs) => setErrores(errs as Record<string, string>),
                onSuccess: () => {
                    if (!irATareas) {
                        reiniciar(esNormal ? 'Jornada guardada correctamente.' : 'Turno especial guardado correctamente.');
                    }
                },
                onFinish: () => setProcesando(false),
            },
        );
    };

    const toggleAgente = (id: number, marcado: boolean) =>
        setSeleccion((prev) => ({
            ...prev,
            [turno]: marcado ? [...prev[turno], id] : prev[turno].filter((x) => x !== id),
        }));

    const siguienteDeshabilitado = procesando || (paso === 0 && !fecha);
    const guardarDeshabilitado =
        procesando || !jornadaCompleta || (!esNormal && (!horaInicio || !horaFin));

    return (
        
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
            {mensaje && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {mensaje}
                </div>
            )}
            <form onSubmit={siguiente} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {/* ENCABEZADO: sin X, solo título y pasos con números más grandes */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
                    <div>
                        <h1 className="text-xl font-semibold leading-tight">Asignación de turnos</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {paso === 0 ? 'Elegí el día de la jornada' : `Jornada del ${fecha}`}
                        </p>
                    </div>

                    <ol className="flex flex-wrap items-center gap-2.5">
                        {PASOS.map((nombre, i) => {
                            const activo = i === paso;
                            const hecho = i < paso;
                            return (
                                <li
                                    key={nombre}
                                    aria-current={activo ? 'step' : undefined}
                                    className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium ${activo
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'text-muted-foreground'
                                        }`}
                                >
                                    <span
                                        className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${activo || hecho
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {hecho ? <Check className="size-3.5" /> : i + 1}
                                    </span>
                                    <span>{nombre}</span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {/* CUERPO */}
                <div className="min-h-[22rem] space-y-5 px-6 py-6">
                    {Object.keys(errores).length > 0 && (
                        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {Object.entries(errores).map(([campo, msg]) => (
                                <p key={campo}>{msg}</p>
                            ))}
                        </div>
                    )}

                    {/* PASO 1: FECHA */}
                    {paso === 0 && (
                        <div className="max-w-xs space-y-1.5">
                            <label htmlFor="fecha" className="flex items-center gap-2 text-sm font-medium">
                                <Calendar className="size-4 text-muted-foreground" /> Fecha de la jornada
                            </label>
                            <input
                                id="fecha"
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                required
                            />
                        </div>
                    )}

                    {/* PASO 2: JORNADA */}
                    {paso === 1 && (
                        <fieldset className="space-y-3">
                            <legend className="mb-3 text-sm font-medium">¿Qué tipo de jornada querés armar?</legend>
                            {(
                                [
                                    {
                                        valor: 'normal' as Jornada,
                                        titulo: 'Jornada normal',
                                        detalle: 'Mañana, tarde y noche con los horarios configurados.',
                                        icono: Clock,
                                    },
                                    {
                                        valor: 'especial' as Jornada,
                                        titulo: 'Turno especial',
                                        detalle: `Horario personalizado de ${especialConfig.min_horas} a ${especialConfig.max_horas} horas.`,
                                        icono: Users,
                                    },
                                ]
                            ).map(({ valor, titulo, detalle, icono: Icono }) => {
                                const sel = tipoJornada === valor;
                                return (
                                    <label
                                        key={valor}
                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${sel ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="jornada"
                                            checked={sel}
                                            onChange={() => cambiarJornada(valor)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="flex items-center gap-2 text-sm font-medium">
                                                <Icono className="size-4" /> {titulo}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{detalle}</p>
                                        </div>
                                    </label>
                                );
                            })}
                            {ocupados.size > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {ocupados.size} {ocupados.size === 1 ? 'agente ya tiene' : 'agentes ya tienen'} turno
                                    este día y no se podrán volver a elegir.
                                </p>
                            )}
                        </fieldset>
                    )}

                    {/* PASO 3: AGENTES */}
                    {paso === 2 && (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-sm font-medium">
                                    {esNormal ? `Turno ${NOMBRES[turno]}` : 'Turno especial'}
                                    {esNormal && (
                                        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                            {horariosConfig[turno]?.[0]} a {horariosConfig[turno]?.[1]}
                                            {turno === 'noche' && ' (cruza medianoche)'}
                                        </span>
                                    )}
                                </h2>

                                {esNormal && (
                                    <ol className="flex gap-1.5 text-xs">
                                        {SECUENCIA.map((t) => (
                                            <li
                                                key={t}
                                                className={`rounded-md border px-2.5 py-1 ${t === turno
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : seleccion[t].length > 0
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground'
                                                    }`}
                                            >
                                                {NOMBRES[t]} ({seleccion[t].length})
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>

                            {!esNormal && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Hora de inicio</label>
                                        <input
                                            type="time"
                                            value={horaInicio}
                                            onChange={(e) => setHoraInicio(e.target.value)}
                                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Hora de fin</label>
                                        <input
                                            type="time"
                                            value={horaFin}
                                            onChange={(e) => setHoraFin(e.target.value)}
                                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Agentes</label>
                                    <span className="text-xs text-muted-foreground">
                                        {agentesDelBloque.length}{' '}
                                        {agentesDelBloque.length === 1 ? 'seleccionado' : 'seleccionados'}
                                        {!bloqueCompleto && ' (turno sin agentes)'}
                                    </span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="search"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                        placeholder="Buscar agente…"
                                        className="w-full rounded-lg border bg-muted/40 py-2.5 pl-9 pr-3 text-sm"
                                    />
                                </div>
                                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                                    {agentesFiltrados.map((agente) => {
                                        const yaTieneTurno = ocupados.has(agente.id);
                                        const bloqueadoPorLicencia = conLicenciaSet.has(agente.id);
                                        
                                        const enOtro = bloqueDeAgente(agente.id);
                                        const deshabilitado = yaTieneTurno || bloqueadoPorLicencia || enOtro !== null;
                                        
                                        const marcado = agentesDelBloque.includes(agente.id);
                                        return (
                                            <label
                                                key={agente.id}
                                                    className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${
                                                        deshabilitado
                                                            ? 'cursor-not-allowed bg-muted opacity-50'
                                                            : marcado
                                                            ? 'cursor-pointer border-primary bg-primary/10'
                                                            : 'cursor-pointer hover:bg-accent'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        disabled={deshabilitado}
                                                        checked={marcado}
                                                        onChange={(e) => toggleAgente(agente.id, e.target.checked)}
                                                    />
                                                    <span>
                                                        {agente.apellido}, {agente.nombre}
                                                    </span>
                                                    {(bloqueadoPorLicencia || yaTieneTurno || enOtro) && (
                                                        <span className="ml-auto text-xs font-medium text-red-500">
                                                            {bloqueadoPorLicencia
                                                                ? 'Con licencia aprobada'
                                                                : yaTieneTurno
                                                                ? 'Ya tiene turno este día'
                                                                : `Elegido en ${NOMBRES[enOtro as Turno]}`}
                                                        </span>
                                                    )}
                                                </label>
                                                                                            );
                                    })}
                                    {agentesFiltrados.length === 0 && (
                                        <p className="p-3 text-sm text-muted-foreground">
                                            Ningún agente coincide con la búsqueda.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* PIE */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={irAlInicio}
                            className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={volverUltimaPagina}
                            className="flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                            <CornerUpLeft className="size-4" /> Volver
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {paso > 0 && (
                            <button
                                type="button"
                                onClick={anterior}
                                disabled={procesando}
                                className="flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                            >
                                <ArrowLeft className="size-4" /> Anterior
                            </button>
                        )}

                        {paso === 2 && esUltimoBloque ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => guardar(false)}
                                    disabled={guardarDeshabilitado}
                                    className="rounded-lg border border-primary bg-background px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                                >
                                    Guardar jornada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => guardar(true)}
                                    disabled={guardarDeshabilitado}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                >
                                    Guardar y asignar tareas <ArrowRight className="size-4" />
                                </button>
                            </>
                        ) : (
                            <button
                                type="submit"
                                disabled={siguienteDeshabilitado}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            >
                                Siguiente <ArrowRight className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
