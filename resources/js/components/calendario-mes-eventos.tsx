import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import FormEvento from '@/components/form-evento';
import type { EventoEditable } from '@/components/form-evento';
import ModalSimple from '@/components/modal-simple';
import type { LugarOpcion } from '@/components/selector-lugar';
import { Button } from '@/components/ui/button';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

// Un evento del calendario tiene los mismos datos que el formulario de edición
export type EventoCalendario = EventoEditable;

export type DatosMes = {
    fecha: string; // día de referencia (define el mes)
    inicio: string; // primer lunes que se dibuja
    fin: string; // último domingo que se dibuja
    eventos: EventoCalendario[];
};

type Props = DatosMes & {
    puedeEditar: boolean;
    lugares: LugarOpcion[];
    onCambiar: (nuevaFecha: string) => void;
};

const enlaceMapa = (lat: string | number, lng: string | number): string =>
    `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`;

export default function CalendarioMesEventos({ fecha, inicio, fin, eventos, puedeEditar, lugares, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);

    const [seleccionado, setSeleccionado] = useState<EventoCalendario | null>(null); // detalle
    const [creando, setCreando] = useState(false); // formulario de evento nuevo
    const [editando, setEditando] = useState<EventoCalendario | null>(null); // formulario de edición

    // Todos los días que se dibujan (semanas completas)
    const dias: Date[] = [];
    const ultimo = parseFecha(fin).getTime();
    for (let d = parseFecha(inicio); d.getTime() <= ultimo; d = sumarDias(d, 1)) {
        dias.push(d);
    }

    const cambiarMes = (delta: number) => {
        onCambiar(formatoFecha(new Date(base.getFullYear(), base.getMonth() + delta, 1)));
    };

    const eliminar = (id: number) => {
        if (!window.confirm('¿Eliminar este evento?')) {
            return;
        }
        router.delete(`/admin/eventos/${id}`, {
            preserveScroll: true,
            onSuccess: () => setSeleccionado(null),
        });
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Flechas, mes y botones */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => cambiarMes(-1)}
                    aria-label="Mes anterior"
                    className="hover:bg-muted rounded-md border p-2"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={() => cambiarMes(1)}
                    aria-label="Mes siguiente"
                    className="hover:bg-muted rounded-md border p-2"
                >
                    <ChevronRight className="size-4" />
                </button>
                <span className="ml-2 font-medium capitalize">
                    {base.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </span>

                <div className="ml-auto flex gap-2">
                    {/* Solo el administrador crea eventos */}
                    {puedeEditar && (
                        <Button type="button" size="sm" onClick={() => setCreando(true)}>
                            <Plus className="size-4" /> Nuevo evento
                        </Button>
                    )}
                    <button
                        type="button"
                        onClick={() => onCambiar(hoy)}
                        className="hover:bg-muted rounded-md border px-3 py-2 text-sm"
                    >
                        Hoy
                    </button>
                </div>
            </div>

            {/* Grilla de 7 columnas */}
            <div className="overflow-x-auto">
                <div className="grid min-w-[700px] grid-cols-7 rounded-lg border">
                    {DIAS_CORTOS.map((d) => (
                        <div key={d} className="bg-muted/50 p-2 text-center text-sm font-medium">
                            {d}
                        </div>
                    ))}

                    {dias.map((d, idx) => {
                        const clave = formatoFecha(d);
                        const delDia = eventos.filter((e) => e.fecha === clave);
                        const esHoy = clave === hoy;
                        const otroMes = d.getMonth() !== base.getMonth();

                        return (
                            <div
                                key={clave}
                                className={`flex min-h-24 flex-col gap-1 border-t p-1 ${idx % 7 !== 0 ? 'border-l' : ''} ${
                                    otroMes ? 'bg-muted/20 text-muted-foreground' : ''
                                }`}
                            >
                                <span
                                    className={`flex size-6 items-center justify-center rounded-full text-xs ${
                                        esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                    }`}
                                >
                                    {d.getDate()}
                                </span>

                                {delDia.slice(0, 3).map((e) => (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => setSeleccionado(e)}
                                        className={`block truncate rounded bg-amber-100 px-1 py-0.5 text-left text-xs text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900 ${
                                            e.estado === 'cancelado' ? 'line-through opacity-60' : ''
                                        }`}
                                    >
                                        {e.hora_inicio} {e.titulo}
                                    </button>
                                ))}

                                {delDia.length > 3 && (
                                    <span className="text-muted-foreground text-xs">+{delDia.length - 3} más</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {eventos.length === 0 && (
                <p className="text-muted-foreground text-sm">No hay eventos operativos en este mes.</p>
            )}

            {/* Detalle del evento: lo ven todos; Editar y Eliminar, solo el administrador */}
            {seleccionado && (
                <ModalSimple titulo={seleccionado.titulo} onCerrar={() => setSeleccionado(null)}>
                    <dl className="flex flex-col gap-3 text-sm">
                        <div>
                            <dt className="text-muted-foreground">Fecha</dt>
                            <dd className="capitalize">
                                {parseFecha(seleccionado.fecha).toLocaleDateString('es-AR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Horario</dt>
                            <dd>
                                {seleccionado.hora_inicio}
                                {seleccionado.hora_fin ? ` – ${seleccionado.hora_fin}` : ''}
                            </dd>
                        </div>
                        {seleccionado.lugar && (
                            <div>
                                <dt className="text-muted-foreground">Lugar</dt>
                                <dd>{seleccionado.lugar}</dd>
                            </div>
                        )}
                        {seleccionado.direccion && (
                            <div>
                                <dt className="text-muted-foreground">Dirección</dt>
                                <dd>{seleccionado.direccion}</dd>
                            </div>
                        )}
                        {seleccionado.descripcion && (
                            <div>
                                <dt className="text-muted-foreground">Descripción</dt>
                                <dd>{seleccionado.descripcion}</dd>
                            </div>
                        )}

                        {(seleccionado.solicitante_ente ||
                            seleccionado.solicitante_nombre ||
                            seleccionado.solicitante_celular) && (
                            <div>
                                <dt className="text-muted-foreground">Solicitante</dt>
                                <dd>
                                    {[
                                        seleccionado.solicitante_ente,
                                        seleccionado.solicitante_nombre,
                                        seleccionado.solicitante_celular,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </dd>
                            </div>
                        )}

                        {/* Recorrido: evento móvil con sus puntos, o evento estático con su ubicación */}
                        {seleccionado.tipo_recorrido === 'movil_itinerante' ? (
                            <div>
                                <dt className="text-muted-foreground">Recorrido</dt>
                                <dd>
                                    <ol className="list-decimal pl-5">
                                        {(seleccionado.puntos ?? []).map((p, i) => (
                                            <li key={i}>
                                                {p.descripcion_referencia ? `${p.descripcion_referencia} · ` : ''}
                                                <a
                                                    href={enlaceMapa(p.latitud, p.longitud)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="underline"
                                                >
                                                    Ver en el mapa
                                                </a>
                                            </li>
                                        ))}
                                    </ol>
                                </dd>
                            </div>
                        ) : (
                            seleccionado.latitud_inicio != null &&
                            seleccionado.longitud_inicio != null && (
                                <div>
                                    <dt className="text-muted-foreground">Ubicación</dt>
                                    <dd>
                                        <a
                                            href={enlaceMapa(seleccionado.latitud_inicio, seleccionado.longitud_inicio)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                        >
                                            Ver en el mapa
                                        </a>
                                    </dd>
                                </div>
                            )
                        )}

                        {seleccionado.estado && (
                            <div>
                                <dt className="text-muted-foreground">Estado</dt>
                                <dd className="capitalize">{seleccionado.estado.replace('_', ' ')}</dd>
                            </div>
                        )}
                    </dl>

                    {puedeEditar && (
                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditando(seleccionado);
                                    setSeleccionado(null);
                                }}
                            >
                                Editar
                            </Button>
                            <Button type="button" variant="destructive" onClick={() => eliminar(seleccionado.id)}>
                                Eliminar
                            </Button>
                        </div>
                    )}
                </ModalSimple>
            )}

            {creando && <FormEvento fecha={fecha} lugares={lugares} onCerrar={() => setCreando(false)} />}

            {editando && (
                <FormEvento
                    fecha={editando.fecha}
                    evento={editando}
                    lugares={lugares}
                    onCerrar={() => setEditando(null)}
                />
            )}
        </div>
    );
}
