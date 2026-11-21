import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';

export type Turno = 'manana' | 'tarde' | 'noche' | 'especial';
export type TareaFila = {
    id: number;
    titulo: string;
    lugar: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha: string;
};
export type TurnoRow = {
    id: number;
    fecha: string;
    turno: Turno;
    hora_inicio_prog: string | null;
    hora_fin_prog: string | null;
    estado: string;
    agente: { id: number; nombre: string; apellido: string };
    tareas: TareaFila[];
};

export type Horarios = Record<string, [string, string]>;
export type Paginacion = { actual: number; ultima: number; total: number };

export const ORDEN: Turno[] = ['manana', 'tarde', 'noche', 'especial'];
export const NOMBRES: Record<Turno, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};
export const ESTADOS: Record<string, { texto: string; clase: string }> = {
    programado: { texto: 'Programado', clase: 'bg-muted text-muted-foreground' },
    en_proceso: {
        texto: 'En proceso',
        clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
    cumplido: {
        texto: 'Cumplido',
        clase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    ausente: { texto: 'Ausente', clase: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    abandonado: {
        texto: 'Abandonado',
        clase: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    reasignado: {
        texto: 'Reasignado',
        clase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    cancelado: { texto: 'Cancelado', clase: 'bg-muted text-muted-foreground line-through' },
};

const hhmm = (s: string | null | undefined) => (s ? s.slice(0, 5) : '');

export const horarioDe = (t: TurnoRow, cfg: Horarios) => {
    const ini = hhmm(t.hora_inicio_prog) || hhmm(cfg[t.turno]?.[0]);
    const fin = hhmm(t.hora_fin_prog) || hhmm(cfg[t.turno]?.[1]);
    return ini && fin ? `${ini} a ${fin}` : '';
};

export const fechaLarga = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const porApellido = (a: TurnoRow, b: TurnoRow) => a.agente.apellido.localeCompare(b.agente.apellido, 'es');

const badge = (estado: string) =>
    ESTADOS[estado] ?? { texto: estado.replace(/_/g, ' '), clase: ESTADOS.programado.clase };

export function DiaHistorial({
    fecha,
    items,
    horarios,
    detalleHref,
}: {
    fecha: string;
    items: TurnoRow[];
    horarios: Horarios;
    detalleHref?: (id: number) => string;
}) {
    const [abierto, setAbierto] = useState(false);
    const panelId = `hist-${fecha}`;

    const unico = items.every((t) => t.estado === items[0].estado);
    const resumen = unico ? badge(items[0].estado) : { texto: 'Mixto', clase: 'bg-muted text-muted-foreground' };

    const bloques = ORDEN.map((turno) => ({
        turno,
        agentes: items.filter((x) => x.turno === turno).sort(porApellido),
    })).filter((b) => b.agentes.length > 0);

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold capitalize">{fechaLarga(fecha)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${resumen.clase}`}>
                        {resumen.texto}
                    </span>
                </div>
                <button
                    type="button"
                    aria-expanded={abierto}
                    aria-controls={panelId}
                    onClick={() => setAbierto((v) => !v)}
                    className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                    {abierto ? 'Ver menos' : 'Ver más'}
                    <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {abierto && (
                <div id={panelId} className="border-t">
                    <div className="grid grid-cols-[6.5rem_1fr] gap-4 bg-muted/30 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[10rem_1fr]">
                        <span>Turno</span>
                        <span>Agentes</span>
                    </div>
                    <div className="divide-y">
                        {bloques.map(({ turno, agentes }) => (
                            <div
                                key={turno}
                                className="grid grid-cols-[6.5rem_1fr] gap-4 px-5 py-3 text-sm sm:grid-cols-[10rem_1fr]"
                            >
                                <div>
                                    <p className="font-medium">{NOMBRES[turno]}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {horarioDe(agentes[0], horarios)}
                                    </p>
                                </div>
                                <ul className="space-y-2">
                                    {agentes.map((t) => {
                                        const e = badge(t.estado);
                                        return (
                                            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span>
                                                        {t.agente.apellido}, {t.agente.nombre}
                                                    </span>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}
                                                    >
                                                        {e.texto}
                                                    </span>
                                                </div>
                                                {detalleHref && (
                                                    <Link
                                                        href={detalleHref(t.id)}
                                                        className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                                                    >
                                                        Ver más <ChevronRight className="size-3.5" />
                                                    </Link>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function Paginador({ actual, ultima, onIr }: { actual: number; ultima: number; onIr: (p: number) => void }) {
    if (ultima <= 1) return null;

    const paginas = Array.from({ length: ultima }, (_, i) => i + 1).filter(
        (p) => p === 1 || p === ultima || Math.abs(p - actual) <= 2,
    );
    const base = 'rounded-lg border px-3 py-1.5 text-sm font-medium';

    return (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
                type="button"
                disabled={actual === 1}
                onClick={() => onIr(actual - 1)}
                className={`${base} bg-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50`}
            >
                Anterior
            </button>
            {paginas.map((p, i) => (
                <span key={p} className="flex items-center gap-2">
                    {i > 0 && p - paginas[i - 1] > 1 && <span className="text-muted-foreground">…</span>}
                    <button
                        type="button"
                        aria-current={p === actual ? 'page' : undefined}
                        onClick={() => onIr(p)}
                        className={`${base} ${p === actual
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-background hover:bg-accent'
                            }`}
                    >
                        {p}
                    </button>
                </span>
            ))}
            <button
                type="button"
                disabled={actual === ultima}
                onClick={() => onIr(actual + 1)}
                className={`${base} bg-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50`}
            >
                Siguiente
            </button>
        </nav>
    );
}