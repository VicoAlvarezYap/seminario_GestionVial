import { Head, Link } from '@inertiajs/react';
import { Mail, Phone, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import FormAgente from '@/components/form-agente';

type ContactoEmergencia = {
    id: number;
    nombre: string;
    celular: string;
    relacion: string | null;
};

type Periodo = {
    id: number;
    fecha_alta: string;
    fecha_baja: string | null;
    motivo_ingreso: string | null;
    motivo_egreso: string | null;
};

type PerfilAgente = {
    id: number;
    nombre: string;
    apellido: string;
    documento: string;
    rango: string | null;
    domicilio: string;
    celular: string;
    correo: string;
    contactos_emergencia?: ContactoEmergencia[];
    historial: Periodo[]; // viene ordenado: el más reciente primero
    activo: boolean;
};

type Props = {
    agentes: PerfilAgente[];
};

type Filtro = 'activos' | 'bajas' | 'todos';

const normalizar = (texto: string) =>
    texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

function resumenVinculo(a: PerfilAgente): string | null {
    const ultimo = a.historial[0];
    if (!ultimo) {
        return null;
    }
    return a.activo
        ? `Alta: ${ultimo.fecha_alta}`
        : `Baja: ${ultimo.fecha_baja ?? '—'}${ultimo.motivo_egreso ? ` · ${ultimo.motivo_egreso}` : ''}`;
}

function TarjetaPerfil({ a }: { a: PerfilAgente }) {
    const inicial = a.nombre.trim().charAt(0).toUpperCase();
    const resumen = resumenVinculo(a);

    return (
        <Link
            href={`/admin/perfiles/${a.id}`}
            className={`flex flex-col gap-3 rounded-2xl border border-slate-400/90 bg-white p-4 shadow-md shadow-slate-950/5 transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-lg dark:bg-neutral-900 ${
                a.activo ? '' : 'opacity-75'
            }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 text-lg font-bold text-white shadow-xs ${
                        a.activo ? 'bg-blue-600' : 'bg-zinc-400'
                    }`}
                >
                    {inicial}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                        {a.apellido}, {a.nombre}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {a.rango ?? 'Sin rango'} · Doc. {a.documento || '—'}
                    </p>
                </div>
                <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        a.activo
                            ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                >
                    {a.activo ? 'Activo' : 'De baja'}
                </span>
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground size-4 shrink-0" />
                    {a.celular ? (
                        <span className="hover:underline">{a.celular}</span>
                    ) : (
                        <span className="text-muted-foreground">Sin celular</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    {a.correo ? (
                        <span className="truncate hover:underline">{a.correo}</span>
                    ) : (
                        <span className="text-muted-foreground">Sin correo</span>
                    )}
                </div>
            </div>

            {resumen && (
                <p className="text-muted-foreground border-t border-slate-300/80 pt-2 text-xs">
                    <span className="line-clamp-2">{resumen}</span>
                </p>
            )}
        </Link>
    );
}

export default function PerfilesIndex({ agentes }: Props) {
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('activos');
    const [creando, setCreando] = useState(false);

    const conteo = useMemo(() => {
        const activos = agentes.filter((a) => a.activo).length;
        return { activos, bajas: agentes.length - activos, todos: agentes.length };
    }, [agentes]);

    const filtrados = useMemo(() => {
        const q = normalizar(busqueda.trim());

        return agentes.filter((a) => {
            if (filtro === 'activos' && !a.activo) {
                return false;
            }
            if (filtro === 'bajas' && a.activo) {
                return false;
            }
            if (!q) {
                return true;
            }
            return normalizar(`${a.apellido} ${a.nombre} ${a.documento ?? ''}`).includes(q);
        });
    }, [agentes, busqueda, filtro]);

    const pestañas: { valor: Filtro; texto: string }[] = [
        { valor: 'activos', texto: 'Activos' },
        { valor: 'bajas', texto: 'De baja' },
        { valor: 'todos', texto: 'Todos' },
    ];

    return (
        <>
            <Head title="Perfiles" />

            <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold">Perfiles de agentes</h1>
                        <p className="text-muted-foreground text-sm">
                            {filtrados.length} {filtrados.length === 1 ? 'agente' : 'agentes'}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                        <label className="relative w-full sm:w-72">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <input
                                type="search"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre o documento"
                                className="bg-background w-full rounded-xl border border-slate-400/90 py-2 pr-3 pl-9 text-sm shadow-xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={() => setCreando(true)}
                            className="bg-primary text-primary-foreground border-primary/90 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            <Plus className="size-4" />
                            Nuevo agente
                        </button>
                    </div>
                </div>

                {/* Filtro por estado laboral */}
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
                    {pestañas.map((p) => (
                        <button
                            key={p.valor}
                            type="button"
                            role="tab"
                            aria-selected={filtro === p.valor}
                            onClick={() => setFiltro(p.valor)}
                            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                                filtro === p.valor
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-background border-slate-400/90 shadow-2xs hover:border-slate-500 hover:bg-accent'
                            }`}
                        >
                            {p.texto}{' '}
                            <span className={filtro === p.valor ? 'opacity-80' : 'text-muted-foreground'}>
                                {conteo[p.valor]}
                            </span>
                        </button>
                    ))}
                </div>

                {filtrados.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtrados.map((a) => (
                            <TarjetaPerfil key={a.id} a={a} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground rounded-2xl border border-dashed border-slate-400/80 bg-muted/20 p-6 text-center text-sm">
                        {busqueda.trim()
                            ? 'No se encontraron agentes con esa búsqueda.'
                            : filtro === 'bajas'
                              ? 'No hay agentes dados de baja.'
                              : 'No se encontraron agentes.'}
                    </p>
                )}
            </main>

            {creando && <FormAgente onCerrar={() => setCreando(false)} />}
        </>
    );
}