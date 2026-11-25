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
    urlInicio?: string;
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
    const [paso, setPaso] = useState(0);
    const [fecha, setFecha] = useState(fechaInicial);
    const [tipoJornada, setTipoJornada] = useState<Jornada>('normal');
    const [turno, setTurno] = useState<Turno>('manana');
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

    const irAlInicio = () => {
        if (urlInicio) {
            router.visit(urlInicio);
        } else {
            reiniciar();
        }
    };

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

    const guardar = (irATareas: boolean, irAListado = false) => {
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
                    if (irAListado) {
                        router.visit('/admin/turnos/listado');
                    } else if (!irATareas) {
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
        <div className="mx-auto max-w-3xl p-4 sm:p-8">
            {mensaje && (
                <div className="mb-5 rounded-2xl border border-green-300/80 bg-green-50/90 p-4 text-sm font-medium text-green-800 shadow-md shadow-green-950/5">
                    {mensaje}
                </div>
            )}

            <form
                onSubmit={siguiente}
                className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl shadow-slate-950/12 ring-1 ring-black/5"
            >
                {/* ENCABEZADO con relieve sutil */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-gradient-to-b from-muted/50 to-card px-7 py-6">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Asignación de turnos</h1>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
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
                                    className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${activo
                                            ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                                            : hecho
                                                ? 'border-border/80 bg-background/80 text-foreground shadow-xs'
                                                : 'border-transparent bg-muted/40 text-muted-foreground'
                                        }`}
                                >
                                    <span
                                        className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold shadow-xs ${activo || hecho
                                                ? 'bg-primary text-primary-foreground shadow-primary/25'
                                                : 'bg-background text-muted-foreground ring-1 ring-border'
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
                <div className="min-h-[22rem] space-y-6 bg-card px-7 py-7">
                    {Object.keys(errores).length > 0 && (
                        <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 shadow-sm">
                            {Object.entries(errores).map(([campo, msg]) => (
                                <p key={campo}>{msg}</p>
                            ))}
                        </div>
                    )}

                    {/* PASO 1: FECHA */}
                    {paso === 0 && (
                        <div className="max-w-xs space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-5 shadow-inner">
                            <label htmlFor="fecha" className="flex items-center gap-2 text-sm font-semibold">
                                <Calendar className="size-4 text-primary" /> Fecha de la jornada
                            </label>
                            <input
                                id="fecha"
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
                                required
                            />
                        </div>
                    )}

                    {/* PASO 2: JORNADA */}
                    {paso === 1 && (
                        <fieldset className="space-y-3.5">
                            <legend className="mb-3 text-sm font-semibold">¿Qué tipo de jornada querés armar?</legend>
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
                                        className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all ${sel
                                                ? '-translate-y-0.5 border-primary bg-primary/10 shadow-md shadow-primary/10'
                                                : 'border-border/80 bg-background shadow-sm hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md'
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
                                            <p className="flex items-center gap-2 text-sm font-semibold">
                                                <Icono className="size-4 text-primary" /> {titulo}
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">{detalle}</p>
                                        </div>
                                    </label>
                                );
                            })}
                            {ocupados.size > 0 && (
                                <p className="rounded-xl bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
                                    {ocupados.size} {ocupados.size === 1 ? 'agente ya tiene' : 'agentes ya tienen'} turno
                                    este día y no se podrán volver a elegir.
                                </p>
                            )}
                        </fieldset>
                    )}

                    {paso === 2 && (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold">
                                    {esNormal ? `Turno ${NOMBRES[turno]}` : 'Turno especial'}
                                    {esNormal && (
                                        <span className="ml-2 rounded-lg bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                                            {horariosConfig[turno]?.[0]} a {horariosConfig[turno]?.[1]}
                                            {turno === 'noche' && ' (cruza medianoche)'}
                                        </span>
                                    )}
                                </h2>

                                {esNormal && (
                                    <ol className="flex gap-2 text-xs">
                                        {SECUENCIA.map((t) => (
                                            <li
                                                key={t}
                                                className={`rounded-xl border px-3 py-1.5 font-medium transition-all ${t === turno
                                                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                                                        : seleccion[t].length > 0
                                                            ? 'border-border bg-background text-foreground shadow-2xs'
                                                            : 'border-transparent bg-muted/40 text-muted-foreground'
                                                    }`}
                                            >
                                                {NOMBRES[t]} ({seleccion[t].length})
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>

                            {!esNormal && (
                                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-inner">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Hora de inicio</label>
                                        <input
                                            type="time"
                                            value={horaInicio}
                                            onChange={(e) => setHoraInicio(e.target.value)}
                                            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Hora de fin</label>
                                        <input
                                            type="time"
                                            value={horaFin}
                                            onChange={(e) => setHoraFin(e.target.value)}
                                            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold">Agentes</label>
                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                        {agentesDelBloque.length}{' '}
                                        {agentesDelBloque.length === 1 ? 'seleccionado' : 'seleccionados'}
                                        {!bloqueCompleto && ' (turno sin agentes)'}
                                    </span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="search"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                        placeholder="Buscar agente…"
                                        className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>

                                {/* Contenedor con profundidad interior (shadow-inner) */}
                                <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-border/80 bg-muted/25 p-3 shadow-inner">
                                    {agentesFiltrados.map((agente) => {
                                        const yaTieneTurno = ocupados.has(agente.id);
                                        const bloqueadoPorLicencia = conLicenciaSet.has(agente.id);
                                        const enOtro = bloqueDeAgente(agente.id);
                                        const deshabilitado = yaTieneTurno || bloqueadoPorLicencia || enOtro !== null;
                                        const marcado = agentesDelBloque.includes(agente.id);

                                        return (
                                            <label
                                                key={agente.id}
                                                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${deshabilitado
                                                        ? 'cursor-not-allowed border-transparent bg-muted/60 opacity-50'
                                                        : marcado
                                                            ? 'cursor-pointer border-primary bg-background font-medium shadow-md shadow-primary/10 ring-1 ring-primary/30'
                                                            : 'cursor-pointer border-border/60 bg-background shadow-2xs hover:border-border hover:shadow-sm'
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
                                                    <span className="ml-auto rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
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
                                        <p className="p-4 text-center text-sm text-muted-foreground">
                                            Ningún agente coincide con la búsqueda.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* PIE con elevación inversa */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/40 px-7 py-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={irAlInicio}
                            className="rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:shadow-sm"
                        >
                            Cancelar
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {paso > 0 && (
                            <button
                                type="button"
                                onClick={anterior}
                                disabled={procesando}
                                className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:shadow-sm disabled:opacity-50"
                            >
                                <ArrowLeft className="size-4" /> Anterior
                            </button>
                        )}

                        {paso === 2 && esUltimoBloque ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => guardar(false, true)}
                                    disabled={guardarDeshabilitado}
                                    className="rounded-xl border border-primary/80 bg-background px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-all hover:bg-primary/10 hover:shadow-md disabled:opacity-50"
                                >
                                    Guardar jornada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => guardar(true)}
                                    disabled={guardarDeshabilitado}
                                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:translate-y-0 disabled:opacity-50"
                                >
                                    Guardar y asignar tareas <ArrowRight className="size-4" />
                                </button>
                            </>
                        ) : (
                            <button
                                type="submit"
                                disabled={siguienteDeshabilitado}
                                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 disabled:translate-y-0 disabled:opacity-50"
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