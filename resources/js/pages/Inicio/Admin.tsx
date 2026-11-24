import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CalendarDays, FileText, Plus } from 'lucide-react';

type Props = {
    nombre: string;
    urgente: { justificantes_pendientes: number; total: number };
    licenciasPendientes: { id: number; agente: string; tipo: string; desde: string; hasta: string }[];
    turnosNoRealizados: { id: number; agente: string; turno: string; fecha: string }[];
    eventosMes: { id: number; titulo: string; fecha: string; estado: string }[];
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

function Tarjeta({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
                {accion}
            </div>
            {children}
        </section>
    );
}

export default function InicioAdmin({
    nombre,
    urgente,
    licenciasPendientes,
    turnosNoRealizados,
    eventosMes,
}: Props) {
    return (
        <>
            <Head title="Inicio" />

            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <header>
                    <h1 className="text-2xl font-bold">Hola, {nombre}</h1>
                    <p className="text-sm text-muted-foreground">Resumen de administración</p>
                    
                </header>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Lo urgente, arriba de todo */}
                        <Tarjeta titulo="Urgente">
                            {urgente.total === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay nada urgente por ahora.</p>
                            ) : (
                                <Link
                                    href="/admin/licencias"
                                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100"
                                >
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="size-4" />
                                        {urgente.justificantes_pendientes} justificante(s) para revisar
                                    </span>
                                    <span>Ver</span>
                                </Link>
                            )}
                        </Tarjeta>

                        {/* Licencias por resolver */}
                        <Tarjeta
                            titulo="Licencias por resolver"
                            accion={
                                <Link href="/admin/licencias" className="text-xs font-medium text-primary hover:underline">
                                    Ver todas
                                </Link>
                            }
                        >
                            {licenciasPendientes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay licencias pendientes.</p>
                            ) : (
                                <ul className="divide-y">
                                    {licenciasPendientes.map((l) => (
                                        <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                            <span>
                                                <span className="font-medium">{l.agente}</span> · {l.tipo}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {l.desde} al {l.hasta}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>

                        {/* Turnos sin cerrar */}
                        <Tarjeta titulo="Turnos no realizados">
                            {turnosNoRealizados.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Todos los turnos pasados están cerrados.</p>
                            ) : (
                                <ul className="divide-y">
                                    {turnosNoRealizados.map((t) => (
                                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                            <span>
                                                <span className="font-medium">{t.agente}</span> · {NOMBRE_TURNO[t.turno] ?? t.turno}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{t.fecha}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>
                    </div>

                    <div className="space-y-6">
                        {/* Acciones rápidas de administración */}
                        <Tarjeta titulo="Acciones">
                            <div className="grid gap-2">
                                <Link href="/admin/turnos" className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                                    <CalendarDays className="size-4" /> Asignar turnos
                                </Link>
                                <Link href="/admin/turnos/tareas" className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                                    <FileText className="size-4" /> Asignar tarea
                                </Link>
                                <Link href="/admin/eventos-operativos/crear" className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                                    <Plus className="size-4" /> Crear evento
                                </Link>
                            </div>
                        </Tarjeta>

                        <Tarjeta titulo="Eventos del mes">
                            {eventosMes.length === 0 ? (
                                <div className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">No hay eventos este mes.</p>
                                    <Link href="/admin/eventos-operativos/crear" className="inline-flex items-center gap-1 text-primary hover:underline">
                                        <Plus className="size-4" /> Crear el primero
                                    </Link>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {eventosMes.map((e) => (
                                        <li key={e.id} className="text-sm">
                                            <p className="font-medium">{e.titulo}</p>
                                            <p className="text-xs text-muted-foreground">{e.fecha}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>
                    </div>
                </div>
            </div>
        </>
    );
}