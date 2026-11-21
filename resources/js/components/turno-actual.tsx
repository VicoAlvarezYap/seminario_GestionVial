import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    ESTADOS,
    NOMBRES,
    ORDEN,
    fechaLarga,
    horarioDe,
    porApellido,
    type Horarios,
    type TurnoRow,
} from '@/components/turnos-compartidos';

type Props = {
    hoy: string;
    turnos: TurnoRow[];
    horarios: Horarios;
    /** Si se pasa, cada agente muestra el botón "Ver más" hacia esa ruta. */
    hrefDetalle?: (turno: TurnoRow) => string;
    /** Si se pasa, el aviso de "sin turnos" muestra el enlace "Asignar turnos". */
    hrefAsignar?: string;
    /** Nivel del título: h1 si es lo principal de la página, h2 si hay otro h1 arriba. */
    como?: 'h1' | 'h2';
};

export default function TurnoActual({ hoy, turnos, horarios, hrefDetalle, hrefAsignar, como = 'h2' }: Props) {
    const Titulo = como;

    const bloques = ORDEN.map((t) => ({
        turno: t,
        items: turnos.filter((x) => x.turno === t).sort(porApellido),
    })).filter((b) => b.items.length > 0);

    return (
        <section className="bg-muted/40 space-y-4 rounded-2xl border p-5 sm:p-6">
            <div>
                <Titulo className="text-2xl font-bold">Turno actual</Titulo>
                <p className="text-muted-foreground text-sm capitalize">{fechaLarga(hoy)}</p>
            </div>

            {bloques.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                    Hoy no hay turnos asignados.
                    {hrefAsignar && (
                        <>
                            {' '}
                            <Link href={hrefAsignar} className="text-primary hover:underline">
                                Asignar turnos
                            </Link>
                        </>
                    )}
                </div>
            ) : (
                bloques.map(({ turno, items }) => (
                    <div key={turno} className="bg-card overflow-hidden rounded-xl border shadow-sm">
                        <div className="bg-muted/30 flex items-baseline justify-between border-b px-5 py-3">
                            <h3 className="font-semibold">{NOMBRES[turno]}</h3>
                            <span className="text-muted-foreground font-mono text-xs">
                                {horarioDe(items[0], horarios)}
                            </span>
                        </div>
                        <ul className="divide-y">
                            {items.map((t) => {
                                const estado = ESTADOS[t.estado] ?? {
                                    texto: t.estado.replace(/_/g, ' '),
                                    clase: ESTADOS.programado.clase,
                                };
                                return (
                                    <li
                                        key={t.id}
                                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-medium">
                                                {t.agente.apellido}, {t.agente.nombre}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}
                                            >
                                                {estado.texto}
                                            </span>
                                        </div>
                                        {hrefDetalle && (
                                            <Link
                                                href={hrefDetalle(t)}
                                                className="bg-background hover:bg-accent flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                            >
                                                Ver más <ChevronRight className="size-4" />
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))
            )}
        </section>
    );
}
