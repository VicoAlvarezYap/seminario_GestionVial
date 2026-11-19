import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import NavbarAgente from '@/components/navbar-agente';

type AgenteBloque = {
    turno_id: number;
    agente_id: number;
    nombre: string;
    tiene_tarea: boolean;
    hora_inicio: string | null;
    hora_fin: string | null;
};
type Evento = { id: number; titulo: string; hora_inicio: string; hora_fin: string | null; lugar_id: number | null };
type Lugar = { id: number; nombre: string };

type Props = {
    fecha: string;
    agentesPorTurno: Record<'manana' | 'tarde' | 'noche' | 'especial', AgenteBloque[]>;
    tareasSugeridas: string[];
    lugares: Lugar[];
    eventosDelDia: Evento[];
    horariosConfig: Record<'manana' | 'tarde' | 'noche', [string, string]>;
};

const BLOQUES = [
    { valor: 'manana', etiqueta: 'Mañana' },
    { valor: 'tarde', etiqueta: 'Tarde' },
    { valor: 'noche', etiqueta: 'Noche' },
    { valor: 'especial', etiqueta: 'Especial' },
] as const;

type Bloque = (typeof BLOQUES)[number]['valor'];

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

export default function AsignarTareas({ fecha, agentesPorTurno, tareasSugeridas, lugares, eventosDelDia,horariosConfig }: Props) {
    const { props } = usePage<{ flash?: { confirmar_seguir?: { mensaje: string } } }>();

    const [bloque, setBloque] = useState<Bloque>('manana');
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [eventoId, setEventoId] = useState<string>('');
    const [titulo, setTitulo] = useState('');
    const [lugar, setLugar] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [procesando, setProcesando] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);

    // Agentes del bloque elegido (solo los que tienen turno en ese modo)
    const agentesDelBloque = agentesPorTurno[bloque] ?? [];

    const nombresLugares = useMemo(() => lugares.map((l) => l.nombre), [lugares]);

    const eventoElegido = eventosDelDia.find((e) => String(e.id) === eventoId) ?? null;

    // Si elige evento, se completan lugar y horas (se pueden retocar)
    const elegirEvento = (id: string) => {
        setEventoId(id);
        const ev = eventosDelDia.find((e) => String(e.id) === id);
        if (ev) {
            setHoraInicio(ev.hora_inicio);
            setHoraFin(ev.hora_fin ?? '');
            const l = lugares.find((x) => x.id === ev.lugar_id);
            if (l) setLugar(l.nombre);
        }
    };

    const cambiarBloque = (valor: Bloque) => {
        setBloque(valor);
        setSeleccion([]);
    };

    const toggleAgente = (turnoId: number, marcado: boolean) =>
        setSeleccion((prev) => (marcado ? [...prev, turnoId] : prev.filter((x) => x !== turnoId)));

    const todosMarcados = agentesDelBloque.length > 0 && seleccion.length === agentesDelBloque.length;

    const toggleTodos = (marcar: boolean) =>
        setSeleccion(marcar ? agentesDelBloque.map((a) => a.turno_id) : []);

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
                    setAviso(null);
                },
                onError: (errs) => setErrores(errs as Record<string, string>),
                onFinish: () => setProcesando(false),
                onSuccess: (page) => {
                    const confirmar = (page.props as { flash?: { confirmar_seguir?: { mensaje: string } } })
                        .flash?.confirmar_seguir;
                    if (confirmar) {
                        setAviso(confirmar.mensaje);
                    }
                },
            },
        );
    };

    const cancelar = () => {
        if (window.confirm('¿Seguro que querés cancelar? Los datos cargados se van a perder.')) {
            router.get('/admin/turnos/listado', { fecha }, { preserveScroll: true });
        }
    };

    // Rango permitido de horas según el bloque elegido
const rangoDelBloque = (): { desde: string; hasta: string } | null => {
    if (bloque === 'especial') {
        // El especial toma el horario cargado en sus agentes
        const primero = agentesDelBloque[0];
        return primero ? { desde: primero.hora_inicio ?? '', hasta: primero.hora_fin ?? '' } : null;
    }
    const [desde, hasta] = horariosConfig[bloque];
    return { desde, hasta };
};

const rango = rangoDelBloque();
 const enRango = (h: string, desde: string, hasta: string) =>
    desde < hasta ? h >= desde && h <= hasta : h >= desde || h <= hasta; // cruza medianoche

const horaValida = (h: string) => {
    if (!h || !rango || !rango.desde || !rango.hasta) return true;
    return enRango(h, rango.desde, rango.hasta);
};

const puedeGuardar =
    seleccion.length > 0 &&
    titulo.trim() !== '' &&
    horaValida(horaInicio) &&
    horaValida(horaFin) &&
    !procesando;
    return (
        <>
            <Head title="Asignar tarea" />
            <NavbarAgente />

            <div className="mx-auto max-w-2xl p-4 sm:p-6">
                <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold">Asignar tarea</h1>
                        <p className="text-sm text-muted-foreground">Jornada del {fecha}</p>
                    </div>

                    {Object.keys(errores).length > 0 && (
                        <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {Object.values(errores).map((m) => (
                                <p key={m}>{m}</p>
                            ))}
                        </div>
                    )}

                    {aviso && (
                        <div className="space-y-3 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
                            <p>{aviso}</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => enviar(true)}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                >
                                    Guardar de todos modos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAviso(null)}
                                    className="rounded-lg border bg-background px-4 py-2 text-sm font-medium"
                                >
                                    Seguir asignando
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Turno */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Turno</label>
                        <select
                            value={bloque}
                            onChange={(e) => cambiarBloque(e.target.value as Bloque)}
                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                        >
                            {BLOQUES.map((b) => (
                                <option key={b.valor} value={b.valor}>
                                    {b.etiqueta} ({(agentesPorTurno[b.valor] ?? []).length})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Agentes del turno elegido */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Agentes</label>
                            {agentesDelBloque.length > 0 && (
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
                                        {a.tiene_tarea && (
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                Ya tiene tarea
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Evento (opcional) */}
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
                        {eventosDelDia.length === 0 && (
                            <p className="text-xs text-muted-foreground">No hay eventos cargados para este día.</p>
                        )}
                    </div>

                    {/* Tarea: sugerencias + texto libre */}
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

                    {/* Lugar: sugerencias de la base + texto libre */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Lugar</label>
                        <CampoConSugerencias
                            valor={lugar}
                            onChange={setLugar}
                            opciones={nombresLugares}
                            placeholder="Elegí un lugar o escribí otro"
                        />
                    </div>

                    {/* Horas: solo se completan solas si hay evento */}
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
                    </div>

                    {eventoElegido && (
                        <p className="text-xs text-muted-foreground">
                            Lugar y horas tomados del evento. Podés modificarlos.
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                        <button
                            type="button"
                            onClick={cancelar}
                            className="rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => enviar(false)}
                            disabled={!puedeGuardar}
                            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                            {procesando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}