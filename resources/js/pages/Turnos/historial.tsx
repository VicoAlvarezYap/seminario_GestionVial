import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    DiaHistorial,
    ESTADOS,
    Paginador,
    type Horarios,
    type Paginacion,
    type TurnoRow,
} from '@/components/turnos-compartidos';

type Filtros = { desde: string; hasta: string; agente: number | null; estado: string | null };
type AgenteOpcion = { id: number; nombre: string; apellido: string };

type Props = {
    turnos: TurnoRow[];
    horariosConfig: Horarios;
    filtros: Filtros;
    agentes: AgenteOpcion[];
    paginacion: Paginacion;
    ruta: string;
    esAdmin: boolean;
};

const input = 'rounded-lg border bg-background px-3 py-2 text-sm';
const label = 'text-xs font-medium text-muted-foreground';

export default function Historial({ turnos, horariosConfig, filtros, agentes, paginacion, ruta, esAdmin }: Props) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);
    const [agente, setAgente] = useState(filtros.agente ? String(filtros.agente) : '');
    const [estado, setEstado] = useState(filtros.estado ?? '');

    useEffect(() => {
        setDesde(filtros.desde);
        setHasta(filtros.hasta);
        setAgente(filtros.agente ? String(filtros.agente) : '');
        setEstado(filtros.estado ?? '');
    }, [filtros.desde, filtros.hasta, filtros.agente, filtros.estado]);

    const irA = (params: Record<string, string>) =>
        router.get(ruta, params, { preserveScroll: true, preserveState: true });

    const aplicar = (e: React.FormEvent) => {
        e.preventDefault();
        irA({ desde, hasta, ...(agente ? { agente } : {}), ...(estado ? { estado } : {}) });
    };

    const limpiar = () => irA({});

    const irAPagina = (page: number) =>
        irA({
            desde: filtros.desde,
            hasta: filtros.hasta,
            ...(filtros.agente ? { agente: String(filtros.agente) } : {}),
            ...(filtros.estado ? { estado: filtros.estado } : {}),
            page: String(page),
        });

    const porFecha = Object.entries(
        turnos.reduce<Record<string, TurnoRow[]>>((acc, t) => {
            (acc[t.fecha] ??= []).push(t);
            return acc;
        }, {}),
    );

    return (
        <>
            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <section className="space-y-4 rounded-2xl border bg-muted/40 p-5 sm:p-6">
                    <div>
                        <h1 className="text-2xl font-bold">{esAdmin ? 'Historial de turnos' : 'Mi historial de turnos'}</h1>
                        <p className="text-sm text-muted-foreground">
                            {paginacion.total} {paginacion.total === 1 ? 'día' : 'días'} con turnos en el rango
                        </p>
                    </div>

                    <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="h-desde" className={label}>Desde</label>
                            <input
                                id="h-desde"
                                type="date"
                                value={desde}
                                onChange={(e) => {
                                    setDesde(e.target.value);
                                    if (hasta < e.target.value) setHasta(e.target.value);
                                }}
                                className={input}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="h-hasta" className={label}>Hasta</label>
                            <input
                                id="h-hasta"
                                type="date"
                                value={hasta}
                                min={desde}
                                onChange={(e) => setHasta(e.target.value)}
                                className={input}
                                required
                            />
                        </div>
                        <div className="flex min-w-40 flex-1 flex-col gap-1">
                
                            {esAdmin && (
                                <div className="flex min-w-40 flex-1 flex-col gap-1">
                                    <label htmlFor="h-agente" className={label}>Agente</label>
                                    <select id="h-agente" value={agente} onChange={(e) => setAgente(e.target.value)} className={input}>
                                        <option value="">Todos los agentes</option>
                                        {agentes.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.apellido}, {a.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex min-w-36 flex-col gap-1">
                            <label htmlFor="h-estado" className={label}>Estado</label>
                            <select id="h-estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={input}>
                                <option value="">Todos</option>
                                {Object.entries(ESTADOS).map(([clave, { texto }]) => (
                                    <option key={clave} value={clave}>
                                        {texto}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={limpiar}
                            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                        >
                            Limpiar
                        </button>
                    </form>

                    {porFecha.length === 0 ? (
                        <p className="rounded-xl border border-dashed bg-background/60 p-6 text-sm text-muted-foreground">
                            No hay turnos que coincidan con los filtros.
                        </p>
                    ) : (
                        <>
                            {porFecha.map(([fecha, items]) => (
                                <DiaHistorial
                                    key={fecha}
                                    fecha={fecha}
                                    items={items}
                                    horarios={horariosConfig}
                                    detalleHref={esAdmin ? (id) => `/admin/turnos/${id}/detalle` : undefined}
                                />
                            ))}
                            <Paginador actual={paginacion.actual} ultima={paginacion.ultima} onIr={irAPagina} />
                        </>
                    )}
                </section>
            </div>
        </>
    );
}