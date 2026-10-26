import { router } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, List, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
    fecha: string; // día de referencia
    inicio: string; // lunes de la semana
    fin: string; // domingo de la semana
    turnos: TurnoCalendario[];
};

type Props = DatosSemana & {
    puedeEditar: boolean;
    agentes: AgenteOpcion[];
    lugares: LugarOpcion[];
    onCambiar: (nuevaFecha: string) => void;
};

export default function CalendarioSemanaTurnos({ fecha, inicio, turnos, puedeEditar, agentes, lugares, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);
    const lunes = parseFecha(inicio);
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const domingo = dias[6];

    // Estado para alternar entre 'calendario' y 'lista'
    const [vista, setVista] = useState<'calendario' | 'lista'>('calendario');

    // Día sobre el que el administrador está asignando un turno nuevo (null = cerrado)
    const [asignando, setAsignando] = useState<string | null>(null);
    // Turno que el administrador está editando (null = cerrado)
    const [editando, setEditando] = useState<TurnoCalendario | null>(null);

    const titulo =
        `${lunes.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ` +
        `${domingo.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const eliminar = (id: number) => {
        if (!window.confirm('¿Eliminar este turno?')) {
            return;
        }
        router.delete(`/admin/turnos/${id}`, { preserveScroll: true });
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Controles superiores: Flechas, rango, botón Hoy y selector de Vista */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onCambiar(formatoFecha(sumarDias(base, -7)))}
                        aria-label="Semana anterior"
                        className="hover:bg-muted rounded-md border p-2"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onCambiar(formatoFecha(sumarDias(base, 7)))}
                        aria-label="Semana siguiente"
                        className="hover:bg-muted rounded-md border p-2"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                    <span className="ml-2 font-medium">{titulo}</span>
                    <button
                        type="button"
                        onClick={() => onCambiar(hoy)}
                        className="hover:bg-muted rounded-md border px-3 py-2 text-sm"
                    >
                        Hoy
                    </button>
                </div>

                {/* Botón para alternar Vista Calendario / Lista */}
                <div className="flex items-center rounded-md border p-0.5 bg-muted/50">
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
                </div>
            </div>

            {/* VISTA 1: CALENDARIO (Cuadrícula semanal) */}
            {vista === 'calendario' && (
                <div className="overflow-x-auto">
                    <div className="grid min-w-700px grid-cols-7 rounded-lg border">
                        {dias.map((d, idx) => {
                            const clave = formatoFecha(d);
                            const delDia = turnos.filter((t) => t.fecha === clave);
                            const esHoy = clave === hoy;

                            return (
                                <div
                                    key={clave}
                                    className={`flex min-h-40 flex-col gap-2 p-2 ${idx > 0 ? 'border-l' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-muted-foreground text-xs">{DIAS_CORTOS[idx]}</div>
                                        <div
                                            className={`flex size-7 items-center justify-center rounded-full text-sm ${
                                                esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                            }`}
                                        >
                                            {d.getDate()}
                                        </div>

                                        {puedeEditar && (
                                            <button
                                                type="button"
                                                onClick={() => setAsignando(clave)}
                                                aria-label={`Asignar turno el ${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`}
                                                className="hover:bg-muted flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
                                            >
                                                <Plus className="size-3" /> Turno
                                            </button>
                                        )}
                                    </div>

                                    {delDia.map((t) => (
                                        <div
                                            key={t.id}
                                            className={`relative rounded bg-blue-100 p-1.5 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200 ${
                                                t.estado === 'cancelado' ? 'line-through opacity-60' : ''
                                            }`}
                                        >
                                            {puedeEditar && (
                                                <div className="absolute top-1 right-1 flex">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditando(t)}
                                                        aria-label="Editar turno"
                                                        className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                                    >
                                                        <Pencil className="size-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminar(t.id)}
                                                        aria-label="Eliminar turno"
                                                        className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            )}

                                            {puedeEditar && t.agente && (
                                                <div className="pr-12 font-semibold">{t.agente}</div>
                                            )}
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
                                            {t.estado && t.estado !== 'programado' && (
                                                <div className="capitalize opacity-75">{t.estado}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VISTA 2: LISTA */}
            {vista === 'lista' && (
                <div className="flex flex-col gap-2">
                    {turnos.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border">
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
                                    {turnos.map((t) => (
                                        <tr key={t.id} className={`hover:bg-muted/50 ${t.estado === 'cancelado' ? 'opacity-60 line-through' : ''}`}>
                                            <td className="p-3 font-medium whitespace-nowrap">
                                                {parseFecha(t.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {t.hora_inicio} – {t.hora_fin}
                                            </td>
                                            {puedeEditar && (
                                                <td className="p-3 font-semibold">
                                                    {t.agente || <span className="text-muted-foreground italic font-normal">Sin asignar</span>}
                                                </td>
                                            )}
                                            <td className="p-3">
                                                <div className="font-medium">{t.lugar}</div>
                                                {t.direccion && <div className="text-muted-foreground text-xs">{t.direccion}</div>}
                                                {t.observaciones && <div className="text-muted-foreground text-xs italic">{t.observaciones}</div>}
                                            </td>
                                            <td className="p-3 capitalize">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    t.estado === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                                }`}>
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
                                                            className="hover:bg-muted text-red-600 rounded-md border p-1.5"
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
                        <p className="text-muted-foreground text-sm">No hay turnos asignados en esta semana.</p>
                    )}
                </div>
            )}

            {turnos.length === 0 && vista === 'calendario' && (
                <p className="text-muted-foreground text-sm">No hay turnos asignados en esta semana.</p>
            )}

            {asignando && (
                <FormTurno
                    fecha={asignando}
                    agentes={agentes}
                    lugares={lugares}
                    onCerrar={() => setAsignando(null)}
                />
            )}

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