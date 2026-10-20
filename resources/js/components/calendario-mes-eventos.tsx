import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';
import { useState } from 'react';
import { createPortal } from 'react-dom';

export type Punto = {
    id: number;
    orden: number;
    latitud: number;
    longitud: number;
    descripcion_referencia: string;
};

export type Evento = {
    id: number;
    titulo: string;
    descripcion: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    direccion: string | null;
    tipo_recorrido: string;
    estado: string | null;
    solicitante_ente: string | null;
    solicitante_nombre: string | null;
    solicitante_celular: string | null;
    puntos: Punto[];
};

export type DatosMes = {
    fecha: string; // día de referencia (define el mes)
    inicio: string; // primer lunes que se dibuja
    fin: string; // último domingo que se dibuja
    eventos: Evento[];
};

type Props = DatosMes & {
    onCambiar: (nuevaFecha: string) => void;
};

export default function CalendarioMesEventos({ fecha, inicio, fin, eventos, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);

    // Estado local para controlar qué evento abrió el modal
    const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

    // Todos los días que se dibujan (semanas completas)
    const dias: Date[] = [];
    const ultimo = parseFecha(fin).getTime();
    for (let d = parseFecha(inicio); d.getTime() <= ultimo; d = sumarDias(d, 1)) {
        dias.push(d);
    }

    const cambiarMes = (delta: number) => {
        onCambiar(formatoFecha(new Date(base.getFullYear(), base.getMonth() + delta, 1)));
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Flechas, mes y botón Hoy */}
            <div className="flex items-center gap-2">
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
                <button
                    type="button"
                    onClick={() => onCambiar(hoy)}
                    className="hover:bg-muted ml-auto rounded-md border px-3 py-2 text-sm"
                >
                    Hoy
                </button>
            </div>

            {/* Grilla de 7 columnas */}
            <div className="overflow-x-auto">
                <div className="grid min-w-700px grid-cols-7 rounded-lg border">
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
                                className={`flex min-h-24 flex-col gap-1 border-t p-1 ${idx % 7 !== 0 ? 'border-l' : ''} ${otroMes ? 'bg-muted/20 text-muted-foreground' : ''
                                    }`}
                            >
                                <span
                                    className={`flex size-6 items-center justify-center rounded-full text-xs ${esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                        }`}
                                >
                                    {d.getDate()}
                                </span>

                                {delDia.slice(0, 3).map((e) => (
                                    <button
                                        type="button"
                                        key={e.id}
                                        onClick={(evt) => {
                                            evt.stopPropagation(); // Stop propagation to prevent carrusel or outer container interference
                                            setEventoSeleccionado(e);
                                        }}
                                        title={`${e.hora_inicio}${e.hora_fin ? ` – ${e.hora_fin}` : ''} ${e.titulo}${e.direccion ? ` · ${e.direccion}` : ''
                                            }`}
                                        className="block w-full text-left truncate rounded bg-amber-100 px-1.5 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900 transition cursor-pointer relative z-10"
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

            {/* MODAL / POP-UP DE DETALLES DEL EVENTO */}
            {eventoSeleccionado && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-9999"
                    onClick={() => setEventoSeleccionado(null)}
                >
                    <div
                        className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800"
                        onClick={(e) => e.stopPropagation()} // Evita cerrar el modal al hacer clic dentro
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">{eventoSeleccionado.titulo}</h3>
                            <button
                                type="button"
                                onClick={() => setEventoSeleccionado(null)}
                                className="text-gray-500 hover:text-gray-700 font-bold text-lg p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <p><strong>Descripción:</strong> {eventoSeleccionado.descripcion || 'Sin descripción'}</p>
                            <p><strong>Horario:</strong> {eventoSeleccionado.hora_inicio} a {eventoSeleccionado.hora_fin || 'Indefinido'}</p>
                            <p><strong>Dirección:</strong> {eventoSeleccionado.direccion || 'No especificada'}</p>
                            <p><strong>Tipo de Recorrido:</strong> <span className="uppercase">{eventoSeleccionado.tipo_recorrido}</span></p>

                            <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-md border dark:border-zinc-700">
                                <h4 className="font-semibold mb-1">Datos del Solicitante</h4>
                                <p><strong>Ente:</strong> {eventoSeleccionado.solicitante_ente || '-'}</p>
                                <p><strong>Nombre:</strong> {eventoSeleccionado.solicitante_nombre || '-'}</p>
                                <p><strong>Celular:</strong> {eventoSeleccionado.solicitante_celular || '-'}</p>
                            </div>

                            {/* Puntos de recorrido vinculados */}
                            <div>
                                <h4 className="font-semibold mb-2">Puntos de Recorrido / Itinerario</h4>
                                {eventoSeleccionado.puntos && eventoSeleccionado.puntos.length > 0 ? (
                                    <ul className="space-y-2">
                                        {eventoSeleccionado.puntos.map((punto) => (
                                            <li key={punto.id} className="bg-blue-50 dark:bg-zinc-800 p-2 rounded border border-blue-100 dark:border-zinc-700">
                                                <span className="font-bold text-blue-800 dark:text-blue-400">Punto {punto.orden}:</span> {punto.descripcion_referencia}
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    Lat: {punto.latitud} | Long: {punto.longitud}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic">No hay puntos de recorrido registrados para este evento.</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setEventoSeleccionado(null)}
                                className="bg-gray-800 text-white dark:bg-zinc-700 px-4 py-2 rounded hover:bg-gray-700 text-sm font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}