import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import NavbarAgente from '@/components/navbar-agente';

type Fila = {
    id: number;
    titulo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    lugar: string | null;
    tipo_recorrido: string;
    estado: string;
    agentes: string[];
};

type Props = {
    eventos: { data: Fila[]; current_page: number; last_page: number; total: number };
    filtros: { desde: string; hasta: string; agentes: string[]; alcance: string };
    agentes: { id: number; nombre: string }[];
    gestiona: boolean;
    puedeFiltrarPorAlcance: boolean;
};

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    programado: { texto: 'Programado', clase: 'bg-blue-100 text-blue-800' },
    en_curso: { texto: 'En curso', clase: 'bg-yellow-100 text-yellow-800' },
    finalizado: { texto: 'Finalizado', clase: 'bg-green-100 text-green-800' },
    cancelado: { texto: 'Cancelado', clase: 'bg-zinc-200 text-zinc-700' },
    suspendido: { texto: 'Suspendido', clase: 'bg-red-100 text-red-800' },
};

const campo = 'rounded-lg border bg-background px-3 py-2 text-sm';
function SelectorAgentes({
    agentes,
    valor,
    onChange,
}: {
    agentes: { id: number; nombre: string }[];
    valor: string[];
    onChange: (v: string[]) => void;
}) {
    const [abierto, setAbierto] = useState(false);

    const toggle = (id: string) =>
        onChange(valor.includes(id) ? valor.filter((x) => x !== id) : [...valor, id]);

    const etiqueta =
        valor.length === 0
            ? 'Todos los agentes'
            : valor.length === 1
              ? agentes.find((a) => String(a.id) === valor[0])?.nombre ?? '1 agente'
              : `${valor.length} agentes`;

    return (
        <div className="relative flex flex-col gap-1 text-xs font-medium">
            Agente
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="flex min-w-56 items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm font-normal"
            >
                {etiqueta}
                <span className="text-muted-foreground">▾</span>
            </button>

            {abierto && (
                <div className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-background p-2 shadow-md">
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                        Todos los agentes
                    </button>
                    {agentes.map((a) => (
                        <label
                            key={a.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal hover:bg-accent"
                        >
                            <input
                                type="checkbox"
                                checked={valor.includes(String(a.id))}
                                onChange={() => toggle(String(a.id))}
                            />
                            {a.nombre}
                        </label>
                    ))}
                    <button
                        type="button"
                        onClick={() => setAbierto(false)}
                        className="mt-1 w-full rounded-md bg-primary px-2 py-1.5 text-sm text-primary-foreground"
                    >
                        Listo
                    </button>
                </div>
            )}
        </div>
    );
}
export default function EventosIndex({ eventos, filtros, agentes, gestiona, puedeFiltrarPorAlcance }: Props) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);
    const [alcance, setAlcance] = useState(filtros.alcance);
    const [agentesSel, setAgentesSel] = useState<string[]>(filtros.agentes);

    const aplicar = (pagina?: number) =>
        router.get(
            '/eventos',
            {
                desde,
                hasta,
                ...(puedeFiltrarPorAlcance ? { alcance } : {}),
                ...(gestiona ? { agentes: agentesSel } : {}),
                ...(pagina ? { page: pagina } : {}),
            },
            { preserveScroll: true, preserveState: true },
        );

    const limpiar = () => {
        setDesde('');
        setHasta('');
        setAgentesSel([]);
        setAlcance('propios');
        router.get('/eventos', {}, { preserveScroll: true });
    };

    const cancelar = (f: Fila) => {
        if (window.confirm(`¿Cancelar el evento "${f.titulo}"? Queda registrado como cancelado.`)) {
            router.patch(`/admin/eventos-operativos/${f.id}/cancelar`, {}, { preserveScroll: true });
        }
    };

    const eliminar = (f: Fila) => {
        if (window.confirm(`¿Eliminar el evento "${f.titulo}"? No se puede deshacer.`)) {
            router.delete(`/admin/eventos-operativos/${f.id}`, { preserveScroll: true });
        }
    };
    const excelUrl =
    '/eventos/excel?' +
    new URLSearchParams({
        desde: filtros.desde,
        hasta: filtros.hasta,
        ...(puedeFiltrarPorAlcance ? { alcance: filtros.alcance } : {}),
        ...(gestiona ? Object.fromEntries(filtros.agentes.map((a, i) => [`agentes[${i}]`, a])) : {}),
    }).toString();
    return (
        <>
            <Head title="Eventos" />
            <NavbarAgente />

            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Eventos</h1>
                        <p className="text-sm text-muted-foreground">
                            {gestiona ? 'Todos los eventos, del más reciente al más antiguo.' : 'Tus eventos, del más reciente al más antiguo.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href={excelUrl} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
                            Exportar Excel
                        </a>
                        {gestiona && (
                            <Link
                                href="/admin/eventos-operativos/crear"
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                            >
                                Crear evento
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
                    <label className="flex flex-col gap-1 text-xs font-medium">
                        Desde
                        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium">
                        Hasta
                        <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={campo} />
                    </label>

                    {puedeFiltrarPorAlcance && (
                        <label className="flex flex-col gap-1 text-xs font-medium">
                            Mostrar
                            <select value={alcance} onChange={(e) => setAlcance(e.target.value)} className={campo}>
                                <option value="propios">Solo mis eventos</option>
                                <option value="todos">Todos los eventos</option>
                            </select>
                        </label>
                    )}

                    {gestiona && (
                        <SelectorAgentes
                           agentes={agentes}
                           valor={agentesSel}
                           onChange={setAgentesSel}
                        />
                    )}

                    <button type="button" onClick={() => aplicar()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                        Filtrar
                    </button>
                    <button type="button" onClick={limpiar} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
                        Limpiar
                    </button>
                </div>

                {/* Lista */}
                {eventos.data.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                        No hay eventos con los filtros elegidos.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/40 text-muted-foreground">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Horario</th>
                                    <th className="p-3">Evento</th>
                                    <th className="p-3">Lugar</th>
                                    <th className="p-3">Agentes</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventos.data.map((f) => {
                                    const estado = ESTADOS[f.estado] ?? { texto: f.estado, clase: 'bg-zinc-100 text-zinc-700' };
                                    return (
                                        <tr key={f.id} className="border-b last:border-0">
                                            <td className="p-3">{f.fecha}</td>
                                            <td className="p-3 font-mono text-xs">
                                                {f.hora_inicio}
                                                {f.hora_fin ? ` a ${f.hora_fin}` : ''}
                                            </td>
                                            <td className="p-3 font-medium">{f.titulo}</td>
                                            <td className="p-3">{f.lugar ?? '-'}</td>
                                            <td className="p-3 text-xs">{f.agentes.length ? f.agentes.join('; ') : '-'}</td>
                                            <td className="p-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <Link href={`/eventos/${f.id}`} className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent">
                                                        Ver
                                                    </Link>
                                                    {gestiona && (
                                                        <>
                                                            <Link
                                                                href={`/admin/eventos-operativos/${f.id}/editar`}
                                                                className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                                                            >
                                                                Editar
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                disabled={f.estado === 'cancelado'}
                                                                onClick={() => cancelar(f)}
                                                                className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => eliminar(f)}
                                                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {eventos.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <button
                            type="button"
                            disabled={eventos.current_page <= 1}
                            onClick={() => aplicar(eventos.current_page - 1)}
                            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="text-muted-foreground">
                            Página {eventos.current_page} de {eventos.last_page}
                        </span>
                        <button
                            type="button"
                            disabled={eventos.current_page >= eventos.last_page}
                            onClick={() => aplicar(eventos.current_page + 1)}
                            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}