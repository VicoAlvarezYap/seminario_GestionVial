import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import FormTurno from '@/components/form-turno';
import type { AgenteOpcion } from '@/components/form-turno';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

export type TurnoCalendario = {
    id: number;
    agente_id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    agente: string | null;
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
    onCambiar: (nuevaFecha: string) => void;
};

export default function CalendarioSemanaTurnos({ fecha, inicio, turnos, puedeEditar, agentes, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);
    const lunes = parseFecha(inicio);
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const domingo = dias[6];

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
            {/* Flechas, rango de la semana y botón Hoy */}
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
                    className="hover:bg-muted ml-auto rounded-md border px-3 py-2 text-sm"
                >
                    Hoy
                </button>
            </div>

            {/* Una columna por día */}
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

                                    {/* Solo el administrador puede asignar turnos */}
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
                                        {t.direccion && (
                                            <div className="truncate" title={t.direccion}>
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

            {turnos.length === 0 && (
                <p className="text-muted-foreground text-sm">No hay turnos asignados en esta semana.</p>
            )}

            {asignando && <FormTurno fecha={asignando} agentes={agentes} onCerrar={() => setAsignando(null)} />}

            {editando && (
                <FormTurno
                    fecha={editando.fecha}
                    turno={editando}
                    agentes={agentes}
                    onCerrar={() => setEditando(null)}
                />
            )}
        </div>
    );
}
