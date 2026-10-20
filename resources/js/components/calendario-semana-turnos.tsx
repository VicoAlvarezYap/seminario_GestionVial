import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

export type TurnoCalendario = {
    id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    direccion: string | null;
    estado: string | null;
};

export type DatosSemana = {
    fecha: string; // día de referencia
    inicio: string; // lunes de la semana
    fin: string; // domingo de la semana
    turnos: TurnoCalendario[];
};

type Props = DatosSemana & {
    onCambiar: (nuevaFecha: string) => void;
};

export default function CalendarioSemanaTurnos({ fecha, inicio, turnos, onCambiar }: Props) {
    const hoy = hoyISO();
    const base = parseFecha(fecha);
    const lunes = parseFecha(inicio);
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const domingo = dias[6];

    const titulo =
        `${lunes.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ` +
        `${domingo.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

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
                                <div className="text-center">
                                    <div className="text-muted-foreground text-xs">{DIAS_CORTOS[idx]}</div>
                                    <div
                                        className={`mx-auto flex size-7 items-center justify-center rounded-full text-sm ${
                                            esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                        }`}
                                    >
                                        {d.getDate()}
                                    </div>
                                </div>

                                {delDia.map((t) => (
                                    <div
                                        key={t.id}
                                        className="rounded bg-blue-100 p-1.5 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                                    >
                                        <div className="font-medium">
                                            {t.hora_inicio} – {t.hora_fin}
                                        </div>
                                        {t.direccion && (
                                            <div className="truncate" title={t.direccion}>
                                                {t.direccion}
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
        </div>
    );
}