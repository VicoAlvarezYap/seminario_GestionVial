import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import Toast from '@/components/toast';

type TareaOcupada = { titulo: string; hora_inicio: string; hora_fin: string };

type AgenteBloque = {
    turno_id: number;
    agente_id: number;
    nombre: string;
    tiene_tarea: boolean;
    hora_inicio: string | null;
    hora_fin: string | null;
    tareas?: TareaOcupada[];
};

type Evento = { id: number; titulo: string; hora_inicio: string; hora_fin: string | null; lugar_id: number | null };
type Lugar = { id: number; nombre: string };
type Bloque = 'manana' | 'tarde' | 'noche' | 'especial';

type Props = {
    fecha: string;
    agentesPorTurno: Record<Bloque, AgenteBloque[]>;
    tareasSugeridas: string[];
    lugares: Lugar[];
    eventosDelDia: Evento[];
    horariosConfig: Record<'manana' | 'tarde' | 'noche', [string, string]>;
    turnoPreseleccionado: number | null;
    bloqueInicial: Bloque | null;
};

const BLOQUES: { valor: Bloque; etiqueta: string }[] = [
    { valor: 'manana', etiqueta: 'Mañana' },
    { valor: 'tarde', etiqueta: 'Tarde' },
    { valor: 'noche', etiqueta: 'Noche' },
    { valor: 'especial', etiqueta: 'Especial' },
];

const NOMBRES: Record<Bloque, string> = {
    manana: 'la mañana',
    tarde: 'la tarde',
    noche: 'la noche',
    especial: 'el turno especial',
};

const enRango = (h: string, desde: string, hasta: string) =>
    desde < hasta ? h >= desde && h <= hasta : h >= desde || h <= hasta;

/** Desplegable con búsqueda: sugiere opciones mientras escribís y acepta texto libre. */
function CampoConSugerencias({
    valor,
    onChange,
    opciones,
    placeholder,
}: {
    valor: string;
    onChange: (v: string) => void;
    opciones: string[];
    placeholder: string;
}) {
    const [abierto, setAbierto] = useState(false);

    const coincidencias = useMemo(() => {
        const q = valor.trim().toLowerCase();
        if (!q) return opciones;
        return opciones.filter((o) => o.toLowerCase().includes(q));
    }, [valor, opciones]);

    return (
        <div className="relative">
            <input
                type="text"
                value={valor}
                placeholder={placeholder}
                onFocus={() => setAbierto(true)}
                onBlur={() => setTimeout(() => setAbierto(false), 150)}
                onChange={(e) => {
                    onChange(e.target.value);
                    setAbierto(true);
                }}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            {abierto && coincidencias.length > 0 && (
                <ul
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-background shadow-md"
                >
                    {coincidencias.map((o) => (
                        <li
                            key={o}
                            onMouseDown={() => {
                                onChange(o);
                                setAbierto(false);
                            }}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                        >
                            {o}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function AsignarTareas({
    fecha,
    agentesPorTurno,
    tareasSugeridas,
    lugares,
    eventosDelDia,
    horariosConfig,
    turnoPreseleccionado,
    bloqueInicial,
}: Props) {
    
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [eventoId, setEventoId] = useState('');
    const [titulo, setTitulo] = useState('');
    const [lugar, setLugar] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [bloque, setBloque] = useState<Bloque>(() => bloqueInicial ?? primerBloqueConAgentes(agentesPorTurno),
);
    
    const [toast, setToast] = useState<{ tipo: 'error' | 'exito'; titulo: string; detalles: string[] } | null>(null);

    useEffect(() => {
        if (toast?.tipo !== 'exito') return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (!turnoPreseleccionado) return;

        const orden: Bloque[] = ['manana', 'tarde', 'noche', 'especial'];
        const bloqueEncontrado = orden.find((b) =>
            (agentesPorTurno[b] ?? []).some((a) => a.turno_id === turnoPreseleccionado),
        );

        if (bloqueEncontrado) {
            setBloque(bloqueEncontrado);
            setSeleccion([turnoPreseleccionado]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const agentesDelBloque = agentesPorTurno[bloque] ?? [];

    const estadoBloque = (b: Bloque) => {
        const lista = agentesPorTurno[b] ?? [];
        return {
            total: lista.length,
            conTarea: lista.filter((a) => a.tiene_tarea).length,
        };
    };

    // Todos los agentes del bloque se pueden elegir; el horario decide si se puede guardar
    const disponibles = agentesDelBloque;
    const todosMarcados = disponibles.length > 0 && seleccion.length === disponibles.length;

    const eventoElegido = eventosDelDia.find((e) => String(e.id) === eventoId) ?? null;
    const nombresLugares = useMemo(() => lugares.map((l) => l.nombre), [lugares]);

    const rango = (() => {
        if (bloque === 'especial') {
            const primero = agentesDelBloque[0];
            return primero?.hora_inicio && primero?.hora_fin
                ? { desde: primero.hora_inicio, hasta: primero.hora_fin }
                : null;
        }
        const [desde, hasta] = horariosConfig[bloque];
        return { desde, hasta };
    })();

    const horaValida = (h: string) => {
        if (!h || !rango) return true;
        return enRango(h, rango.desde, rango.hasta);
    };

    const horasIguales = horaInicio !== '' && horaInicio === horaFin;

    const cambiarBloque = (valor: Bloque) => {
        if (estadoBloque(valor).total === 0) return;
        setBloque(valor);
        setSeleccion([]);
        setEventoId('');
        setTitulo('');
        setLugar('');
        setHoraInicio('');
        setHoraFin('');
        setErrores({});
        setMensaje(null);
       
    };

    const elegirEvento = (id: string) => {
        setEventoId(id);
        const ev = eventosDelDia.find((e) => String(e.id) === id);
        if (!ev) return;

        setHoraInicio(ev.hora_inicio);
        setHoraFin(ev.hora_fin ?? '');
        const l = lugares.find((x) => x.id === ev.lugar_id);
        if (l) setLugar(l.nombre);
    };

    const toggleAgente = (turnoId: number, marcado: boolean) =>
        setSeleccion((prev) => (marcado ? [...prev, turnoId] : prev.filter((x) => x !== turnoId)));

    const toggleTodos = (marcar: boolean) =>
        setSeleccion(marcar ? disponibles.map((a) => a.turno_id) : []);

    const conflictos = (inicio: string, fin: string): string[] => {
        if (!inicio || !fin) return [];
        return agentesDelBloque
            .filter((a) => seleccion.includes(a.turno_id))
            .flatMap((a) => {
                const ocupadas = a.tareas ?? [];
                const choca = ocupadas.some((t) => inicio < t.hora_fin && fin > t.hora_inicio);
                if (!choca) return [];
                const lista = ocupadas
                    .map((t) => `«${t.titulo}» (${t.hora_inicio} a ${t.hora_fin})`)
                    .join(', ');
                return [`${a.nombre} ya tiene: ${lista}`];
            });
    };

    const listaConflictos = conflictos(horaInicio, horaFin);

    const faltantes: string[] = [];
    if (seleccion.length === 0) faltantes.push('elegir agentes');
    if (titulo.trim() === '') faltantes.push('escribir la tarea');
    if (horasIguales) faltantes.push('corregir las horas');
    if (!horaValida(horaInicio) || !horaValida(horaFin)) faltantes.push('ajustar el horario');

    const puedeGuardar =
        seleccion.length > 0 &&
        titulo.trim() !== '' &&
        horaValida(horaInicio) &&
        horaValida(horaFin) &&
        !horasIguales &&
        !procesando &&
        listaConflictos.length === 0;

    const enviar = (seguirDeTodosModos = false) => {
        router.post(
            '/admin/turnos/tareas',
            {
                fecha,
                turno: bloque,
                turno_ids: seleccion,
                titulo,
                lugar,
                evento_operativo_id: eventoId || null,
                hora_inicio: horaInicio || null,
                hora_fin: horaFin || null,
                seguir_de_todos_modos: seguirDeTodosModos,
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcesando(true);
                    setErrores({});
                   
                    setMensaje(null);
                },
                onError: (errs) => {
                    const lista = Object.values(errs as Record<string, string>);
                    setErrores(errs as Record<string, string>);
                    setToast({ tipo: 'error', titulo: 'No se pudo guardar la tarea', detalles: lista });
                },
                onFinish: () => setProcesando(false),
                onSuccess: (page) => {
                    const confirmar = (page.props as { flash?: { confirmar_seguir?: { mensaje: string } } })
                        .flash?.confirmar_seguir;
                    const cantidad = seleccion.length;
                    const tituloGuardado = titulo.trim();
                    const horario = horaInicio && horaFin ? ` ${horaInicio}–${horaFin}` : '';

                   

                    setMensaje(`Tarea asignada a ${NOMBRES[bloque]}.`);
                    setToast({ tipo: 'exito', titulo: 'Tarea asignada', detalles: [] });
                    setSeleccion([]);
                    setTitulo('');
                    setLugar('');
                    setEventoId('');
                    setHoraInicio('');
                    setHoraFin('');
                },
            },
        );
    };

    const cancelar = () => {
        if (window.confirm('¿Seguro que querés cancelar? Los datos cargados se van a perder.')) {
            router.get('/admin/turnos/listado', { fecha }, { preserveScroll: true });
        }
    };
  const indice = BLOQUES.findIndex((b) => b.valor === bloque);
const bloqueAnterior = indice > 0 ? BLOQUES[indice - 1] : null;
const bloqueSiguiente = indice < BLOQUES.length - 1 ? BLOQUES[indice + 1] : null;
    return (
        <>
            <Head title="Asignar tarea" />

            <div className="mx-auto max-w-2xl p-4 sm:p-6">
                <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold">Asignar tarea</h1>
                        <p className="text-sm text-muted-foreground">Jornada del {fecha}</p>
                    </div>

                    {mensaje && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            {mensaje}
                        </div>
                    )}

                    {Object.keys(errores).length > 0 && (
                        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {Object.values(errores).map((m) => (
                                <p key={m}>{m}</p>
                            ))}
                        </div>
                    )}

                

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Turno</label>
                        <div className="flex flex-wrap gap-2">
                            {BLOQUES.map((b) => {
                                const { total, conTarea } = estadoBloque(b.valor);
                                const sinAgentes = total === 0;
                                const activo = bloque === b.valor;

                                return (
                                    <button
                                        key={b.valor}
                                        type="button"
                                        disabled={sinAgentes}
                                        onClick={() => cambiarBloque(b.valor)}
                                        title={sinAgentes ? 'No hay agentes con turno en este bloque' : undefined}
                                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                                            sinAgentes
                                                ? 'cursor-not-allowed border-dashed opacity-40'
                                                : activo
                                                  ? 'border-primary bg-primary/10 text-primary'
                                                  : 'hover:bg-accent'
                                        }`}
                                    >
                                        {b.etiqueta}
                                        {sinAgentes && <span className="text-xs">sin agentes</span>}
                                        {!sinAgentes && conTarea > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                {conTarea}/{total} con tarea
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Agentes</label>
                            {disponibles.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => toggleTodos(!todosMarcados)}
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    {todosMarcados ? 'Quitar todos' : 'Seleccionar todos'}
                                </button>
                            )}
                        </div>

                        {agentesDelBloque.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                No hay agentes con turno en este bloque.
                            </p>
                        ) : (
                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-2">
                                {agentesDelBloque.map((a) => (
                                    <label
                                        key={a.turno_id}
                                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={seleccion.includes(a.turno_id)}
                                            onChange={(e) => toggleAgente(a.turno_id, e.target.checked)}
                                        />
                                        <span>{a.nombre}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {a.tareas?.length ?? 0} tarea(s)
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Evento (opcional)</label>
                        <select
                            value={eventoId}
                            onChange={(e) => elegirEvento(e.target.value)}
                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                        >
                            <option value="">Sin evento</option>
                            {eventosDelDia.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.titulo} ({ev.hora_inicio}
                                    {ev.hora_fin ? `–${ev.hora_fin}` : ''})
                                </option>
                            ))}
                        </select>
                        {eventoElegido && (
                            <p className="text-xs text-muted-foreground">
                                Lugar y horas tomados del evento. Podés modificarlos.
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Tarea</label>
                        <CampoConSugerencias
                            valor={titulo}
                            onChange={setTitulo}
                            opciones={tareasSugeridas}
                            placeholder="Elegí una sugerencia o escribí otra"
                        />
                        {errores.titulo && <p className="text-xs text-red-600">{errores.titulo}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Lugar</label>
                        <CampoConSugerencias
                            valor={lugar}
                            onChange={setLugar}
                            opciones={nombresLugares}
                            placeholder="Elegí un lugar o escribí otro"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Desde</label>
                            <input
                                type="time"
                                value={horaInicio}
                                min={rango?.desde || undefined}
                                max={rango?.hasta || undefined}
                                onChange={(e) => setHoraInicio(e.target.value)}
                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Hasta</label>
                            <input
                                type="time"
                                value={horaFin}
                                min={rango?.desde || undefined}
                                max={rango?.hasta || undefined}
                                onChange={(e) => setHoraFin(e.target.value)}
                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                            />
                        </div>

                        {rango && (
                            <p className="col-span-2 text-xs text-muted-foreground">
                                Horario permitido para {NOMBRES[bloque]}: entre {rango.desde} y {rango.hasta}.
                            </p>
                        )}
                        {horasIguales && (
                            <p className="col-span-2 text-xs text-red-600">
                                La hora de fin tiene que ser distinta de la de inicio.
                            </p>
                        )}
                        {horaInicio && !horaValida(horaInicio) && (
                            <p className="col-span-2 text-xs text-red-600">
                                La hora de inicio está fuera del horario de {NOMBRES[bloque]}.
                            </p>
                        )}
                        {horaFin && !horaValida(horaFin) && (
                            <p className="col-span-2 text-xs text-red-600">
                                La hora de fin está fuera del horario de {NOMBRES[bloque]}.
                            </p>
                        )}
                        {eventoElegido && !horaValida(eventoElegido.hora_inicio) && (
                            <p className="text-xs text-red-600">
                                El evento empieza fuera del horario de {NOMBRES[bloque]}. Elegí otro bloque o cambiá la hora.
                            </p>
                        )}
                        {listaConflictos.map((c) => (
                            <p key={c} className="col-span-2 text-xs text-red-600">
                                {c}
                            </p>
                        ))}
                    </div>

                    {faltantes.length > 0 && !procesando && (
                        <p className="text-xs text-muted-foreground">
                            Para guardar falta: {faltantes.join(', ')}.
                        </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                        <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={cancelar}
                                    className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
                                >
                                    Cancelar
                                </button>
                                {bloqueAnterior && (
                                    <button
                                        type="button"
                                        disabled={estadoBloque(bloqueAnterior.valor).total === 0}
                                        onClick={() => cambiarBloque(bloqueAnterior.valor)}
                                        className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-40"
                                    >
                                        ← Volver
                                    </button>
                                )}
                            </div>

                <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => enviar(false)}
                            disabled={!puedeGuardar}
                            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                            {procesando ? 'Guardando…' : 'Guardar'}
                        </button>
                        {bloqueSiguiente && (
                            <button
                                type="button"
                                disabled={estadoBloque(bloqueSiguiente.valor).total === 0}
                                onClick={() => cambiarBloque(bloqueSiguiente.valor)}
                                className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-40"
                            >
                                Siguiente →
                            </button>
                        )}
                    </div>
                </div>
                </div>
            </div>

            {toast && (
                <Toast
                    tipo={toast.tipo}
                    titulo={toast.titulo}
                    detalles={toast.detalles}
                    onCerrar={() => setToast(null)}
                />
            )}
        </>
    );
}

function primerBloqueConAgentes(agentesPorTurno: Record<Bloque, AgenteBloque[]>): Bloque {
    const orden: Bloque[] = ['manana', 'tarde', 'noche', 'especial'];
    return orden.find((b) => (agentesPorTurno[b]?.length ?? 0) > 0) ?? 'manana';
}