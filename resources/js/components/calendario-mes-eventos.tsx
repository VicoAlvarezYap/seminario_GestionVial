import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

export type EventoCalendario = {
    id: number;
    titulo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    direccion: string | null;
    estado: string | null;
};

export type DatosMes = {
    fecha: string; // día de referencia (define el mes)
    inicio: string; // primer lunes que se dibuja
    fin: string; // último domingo que se dibuja
    eventos: EventoCalendario[];
};

type Props = DatosMes & {
    onCambiar: (nuevaFecha: string) => void;
};

export default function CalendarioMesEventos({ fecha, inicio, fin, eventos, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);

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
                                    <span
                                        key={e.id}
                                        title={`${e.hora_inicio}${e.hora_fin ? ` – ${e.hora_fin}` : ''} ${e.titulo}${
                                            e.direccion ? ` · ${e.direccion}` : ''
                                        }`}
                                        className="block truncate rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                    >
                                        {e.hora_inicio} {e.titulo}
                                    </span>
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
        </div>
    );
}