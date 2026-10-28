import { router } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, List, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import FormTurno from '@/components/form-turno';
import type { AgenteOpcion } from '@/components/form-turno';
import type { LugarOpcion } from '@/components/selector-lugar';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

export type TurnoCalendario = {
    id: number;
    agente_id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    agente: string | null;
    lugar_id: number | null;
    lugar: string | null;
    direccion: string | null;
    observaciones: string | null;
    estado: string | null;
};

export type DatosSemana = {
    desde: string; // inicio del rango filtrado (YYYY-MM-DD)
    hasta: string; // fin del rango filtrado (YYYY-MM-DD)
    turnos: TurnoCalendario[];
};

type Props = DatosSemana & {
    puedeEditar: boolean;
    agentes: AgenteOpcion[];
    lugares: LugarOpcion[];
    onCambiar: (desde: string, hasta: string) => void;
};

const MS_DIA = 86_400_000;
const MAX_DIAS = 366;

const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_DIA) + 1;
const lunesDe = (d: Date) => sumarDias(d, -((d.getDay() + 6) % 7));
const ultimoDiaMes = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const corto = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

/* ---------- Tarjeta de un turno (se reutiliza en la grilla) ---------- */
function TarjetaTurno({
    t,
    puedeEditar,
    onEditar,
    onEliminar,
}: {
    t: TurnoCalendario;
    puedeEditar: boolean;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    return (
        <div
            className={`relative rounded bg-blue-100 p-1.5 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200 ${
                t.estado === 'cancelado' ? 'line-through opacity-60' : ''
            }`}
        >
            {puedeEditar && (
                <div className="absolute top-1 right-1 flex">
                    <button type="button" onClick={onEditar} aria-label="Editar turno" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10">
                        <Pencil className="size-3" />
                    </button>
                    <button type="button" onClick={onEliminar} aria-label="Eliminar turno" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10">
                        <Trash2 className="size-3" />
                    </button>
                </div>
            )}

            {puedeEditar && t.agente && <div className="pr-12 font-semibold">{t.agente}</div>}
            <div className="font-medium">
                {t.hora_inicio} – {t.hora_fin}
            </div>
            {t.lugar && (
                <div className="flex items-center gap-1 font-medium" title={t.lugar}>
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{t.lugar}</span>
                </div>
            )}
            {t.direccion && (
                <div className="truncate opacity-80" title={t.direccion}>
                    {t.direccion}
                </div>
            )}
            {t.observaciones && (
                <div className="truncate opacity-80" title={t.observaciones}>
                    {t.observaciones}
                </div>
            )}
            {t.estado && t.estado !== 'programado' && <div className="capitalize opacity-75">{t.estado}</div>}
        </div>
    );
}

/* ---------- Componente principal ---------- */
export default function CalendarioSemanaTurnos({ desde, hasta, turnos, puedeEditar, agentes, lugares, onCambiar }: Props) {
    const hoy = hoyISO();
    const dDesde = parseFecha(desde);
    const dHasta = parseFecha(hasta);
    const totalDias = diasEntre(dDesde, dHasta);

    // La lista es la vista inicial
    const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
    const [asignando, setAsignando] = useState<string | null>(null);
    const [editando, setEditando] = useState<TurnoCalendario | null>(null);

    // 'todos' o el id del agente (como string, porque viene de un <select>)
    const [agenteFiltro, setAgenteFiltro] = useState<string>('todos');

    // Valores de los inputs (se aplican con el botón, para no recargar en cada tecla)
    const [desdeInput, setDesdeInput] = useState(desde);
    const [hastaInput, setHastaInput] = useState(hasta);
    const [error, setError] = useState<string | null>(null);

    // Si el rango cambia desde afuera (flechas, atajos), sincroniza los inputs
    useEffect(() => {
        setDesdeInput(desde);
        setHastaInput(hasta);
        setError(null);
    }, [desde, hasta]);

    const hayCambiosSinAplicar = desdeInput !== desde || hastaInput !== hasta;

    const esMesCompleto =
        dDesde.getDate() === 1 &&
        dHasta.getDate() === ultimoDiaMes(dDesde).getDate() &&
        dDesde.getMonth() === dHasta.getMonth() &&
        dDesde.getFullYear() === dHasta.getFullYear();

    // Fecha por defecto para "Agregar turno": hoy si está dentro del rango; si no, el primer día
    const fechaNueva = hoy >= desde && hoy <= hasta ? hoy : desde;

    /* ---- Acciones del filtro ---- */
    const aplicar = () => {
        if (!desdeInput || !hastaInput) {
            setError('Completá ambas fechas.');
            return;
        }
        if (desdeInput > hastaInput) {
            setError('"Desde" no puede ser posterior a "Hasta".');
            return;
        }
        if (diasEntre(parseFecha(desdeInput), parseFecha(hastaInput)) > MAX_DIAS) {
            setError(`El rango máximo es de ${MAX_DIAS} días.`);
            return;
        }
        setError(null);
        onCambiar(desdeInput, hastaInput);
    };

    const estaSemana = () => {
        const lunes = lunesDe(parseFecha(hoy));
        onCambiar(formatoFecha(lunes), formatoFecha(sumarDias(lunes, 6)));
    };

    const esteMes = () => {
        const h = parseFecha(hoy);
        onCambiar(formatoFecha(new Date(h.getFullYear(), h.getMonth(), 1)), formatoFecha(ultimoDiaMes(h)));
    };

    // Mueve el rango: un mes entero si es mes completo; si no, la misma cantidad de días
    const mover = (dir: 1 | -1) => {
        if (esMesCompleto) {
            const nuevo = new Date(dDesde.getFullYear(), dDesde.getMonth() + dir, 1);
            onCambiar(formatoFecha(nuevo), formatoFecha(ultimoDiaMes(nuevo)));
            return;
        }
        onCambiar(formatoFecha(sumarDias(dDesde, dir * totalDias)), formatoFecha(sumarDias(dHasta, dir * totalDias)));
    };

    const eliminar = (id: number) => {
        if (!window.confirm('¿Eliminar este turno?')) {
            return;
        }
        router.delete(`/admin/turnos/${id}`, { preserveScroll: true });
    };

    /* ---- Datos derivados ---- */
    const turnosVisibles = useMemo(
        () => (agenteFiltro === 'todos' ? turnos : turnos.filter((t) => String(t.agente_id) === agenteFiltro)),
        [turnos, agenteFiltro],
    );

    const ordenados = useMemo(
        () => [...turnosVisibles].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio)),
        [turnosVisibles],
    );

    const porDia = useMemo(() => {
        const mapa = new Map<string, TurnoCalendario[]>();
        ordenados.forEach((t) => mapa.set(t.fecha, [...(mapa.get(t.fecha) ?? []), t]));
        return mapa;
    }, [ordenados]);

    // Semanas (filas de 7 días, lunes a domingo) que cubren el rango
    const semanas = useMemo(() => {
        const res: Date[][] = [];
        const fin = parseFecha(hasta);
        let cursor = lunesDe(parseFecha(desde));
        while (cursor <= fin) {
            const inicioSemana = cursor;
            res.push(Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)));
            cursor = sumarDias(cursor, 7);
        }
        return res;
    }, [desde, hasta]);

    const titulo =
        `${corto(dDesde)} – ` + dHasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

    const btnAtajo = 'hover:bg-muted rounded-md border px-3 py-2 text-sm';

    return (
        <div className="flex flex-col gap-3">
            {/* ===== Filtro de rango ===== */}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
                <label className="flex flex-col gap-1 text-xs font-medium">
                    Desde
                    <input
                        type="date"
                        value={desdeInput}
                        max={hastaInput || undefined}
                        onChange={(e) => setDesdeInput(e.target.value)}
                        className="bg-background rounded-md border px-2 py-1.5 text-sm"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                    Hasta
                    <input
                        type="date"
                        value={hastaInput}
                        min={desdeInput || undefined}
                        onChange={(e) => setHastaInput(e.target.value)}
                        className="bg-background rounded-md border px-2 py-1.5 text-sm"
                    />
                </label>
                <button
                    type="button"
                    onClick={aplicar}
                    disabled={!hayCambiosSinAplicar}
                    className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    Filtrar
                </button>

                {/* Filtro por agente (solo quien puede editar; el resto ya ve solo sus turnos) */}
                {puedeEditar && (
                    <label className="flex flex-col gap-1 text-xs font-medium">
                        Agente
                        <select
                            value={agenteFiltro}
                            onChange={(e) => setAgenteFiltro(e.target.value)}
                            className="bg-background rounded-md border px-2 py-1.5 text-sm"
                        >
                            <option value="todos">Todos los agentes</option>
                            {agentes.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                    {a.nombre}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <div className="flex flex-wrap gap-2 sm:ml-auto">
                    {puedeEditar && (
                        <button
                            type="button"
                            onClick={() => setAsignando(fechaNueva)}
                            className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
                        >
                            <Plus className="size-4" />
                            Agregar turno
                        </button>
                    )}
                    <button type="button" onClick={estaSemana} className={btnAtajo}>
                        Esta semana
                    </button>
                    <button type="button" onClick={esteMes} className={btnAtajo}>
                        Este mes
                    </button>
                </div>

                {error && <p className="w-full text-sm text-red-600">{error}</p>}
            </div>

            {/* ===== Navegación + selector de vista ===== */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => mover(-1)}
                        aria-label="Rango anterior"
                        className="hover:bg-muted rounded-md border p-2"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => mover(1)}
                        aria-label="Rango siguiente"
                        className="hover:bg-muted rounded-md border p-2"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                    <span className="ml-2 font-medium">{titulo}</span>
                    <span className="text-muted-foreground text-sm">
                        ({turnosVisibles.length} {turnosVisibles.length === 1 ? 'turno' : 'turnos'})
                    </span>
                </div>

                <div className="bg-muted/50 flex items-center rounded-md border p-0.5">
                    <button
                        type="button"
                        onClick={() => setVista('lista')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            vista === 'lista' ? 'bg-background shadow-sm' : 'hover:bg-muted'
                        }`}
                    >
                        <List className="size-3.5" />
                        Lista
                    </button>
                    <button
                        type="button"
                        onClick={() => setVista('calendario')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            vista === 'calendario' ? 'bg-background shadow-sm' : 'hover:bg-muted'
                        }`}
                    >
                        <Calendar className="size-3.5" />
                        Calendario
                    </button>
                </div>
            </div>

            {/* ===== VISTA LISTA ===== */}
            {vista === 'lista' &&
                (ordenados.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b text-xs uppercase">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Horario</th>
                                    {puedeEditar && <th className="p-3">Agente</th>}
                                    <th className="p-3">Lugar / Dirección</th>
                                    <th className="p-3">Estado</th>
                                    {puedeEditar && <th className="p-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ordenados.map((t) => (
                                    <tr
                                        key={t.id}
                                        className={`hover:bg-muted/50 ${t.estado === 'cancelado' ? 'line-through opacity-60' : ''}`}
                                    >
                                        <td className="p-3 font-medium whitespace-nowrap">
                                            {parseFecha(t.fecha).toLocaleDateString('es-AR', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                            {t.hora_inicio} – {t.hora_fin}
                                        </td>
                                        {puedeEditar && (
                                            <td className="p-3 font-semibold">
                                                {t.agente || <span className="text-muted-foreground font-normal italic">Sin asignar</span>}
                                            </td>
                                        )}
                                        <td className="p-3">
                                            <div className="font-medium">{t.lugar}</div>
                                            {t.direccion && <div className="text-muted-foreground text-xs">{t.direccion}</div>}
                                            {t.observaciones && (
                                                <div className="text-muted-foreground text-xs italic">{t.observaciones}</div>
                                            )}
                                        </td>
                                        <td className="p-3 capitalize">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    t.estado === 'cancelado'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                                }`}
                                            >
                                                {t.estado || 'programado'}
                                            </span>
                                        </td>
                                        {puedeEditar && (
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditando(t)}
                                                        aria-label="Editar turno"
                                                        className="hover:bg-muted rounded-md border p-1.5"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminar(t.id)}
                                                        aria-label="Eliminar turno"
                                                        className="hover:bg-muted rounded-md border p-1.5 text-red-600"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">No hay turnos en el rango seleccionado.</p>
                ))}

            {/* ===== VISTA CALENDARIO (una fila por semana, solo visualización) ===== */}
            {vista === 'calendario' && (
                <div className="overflow-x-auto">
                    <div className="min-w-[700px] overflow-hidden rounded-lg border">
                        {/* Encabezado con los días */}
                        <div className="bg-muted/50 grid grid-cols-7 border-b">
                            {DIAS_CORTOS.map((d, i) => (
                                <div
                                    key={d}
                                    className={`text-muted-foreground p-2 text-center text-xs ${i > 0 ? 'border-l' : ''}`}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {semanas.map((dias, fila) => (
                            <div key={formatoFecha(dias[0])} className={`grid grid-cols-7 ${fila > 0 ? 'border-t' : ''}`}>
                                {dias.map((d, idx) => {
                                    const clave = formatoFecha(d);
                                    const dentro = clave >= desde && clave <= hasta;
                                    const delDia = porDia.get(clave) ?? [];
                                    const esHoy = clave === hoy;

                                    return (
                                        <div
                                            key={clave}
                                            className={`flex min-h-28 flex-col gap-1.5 p-2 ${idx > 0 ? 'border-l' : ''} ${
                                                dentro ? '' : 'bg-muted/30 opacity-50'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div
                                                    className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm ${
                                                        esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                                    }`}
                                                >
                                                    {d.getDate() === 1 || clave === desde
                                                        ? `${d.getDate()} ${d.toLocaleDateString('es-AR', { month: 'short' })}`
                                                        : d.getDate()}
                                                </div>
                                            </div>

                                            {dentro &&
                                                delDia.map((t) => (
                                                    <TarjetaTurno
                                                        key={t.id}
                                                        t={t}
                                                        puedeEditar={puedeEditar}
                                                        onEditar={() => setEditando(t)}
                                                        onEliminar={() => eliminar(t.id)}
                                                    />
                                                ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {turnosVisibles.length === 0 && (
                        <p className="text-muted-foreground mt-3 text-sm">No hay turnos en el rango seleccionado.</p>
                    )}
                </div>
            )}

            {asignando && <FormTurno fecha={asignando} agentes={agentes} lugares={lugares} onCerrar={() => setAsignando(null)} />}

            {editando && (
                <FormTurno
                    fecha={editando.fecha}
                    turno={editando}
                    agentes={agentes}
                    lugares={lugares}
                    onCerrar={() => setEditando(null)}
                />
            )}
        </div>
    );
}