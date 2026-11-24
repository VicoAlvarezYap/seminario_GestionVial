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

type PerfilAgente = {
    id: number;
    nombre: string;
    apellido: string;
    documento: string;
    rango: string | null;
    domicilio: string;
    celular: string ;
    correo: string;
    contactos_emergencia?: ContactoEmergencia[]; 
};

type Props = {
    agentes: PerfilAgente[];
};


const normalizar = (texto: string) =>
    texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

function TarjetaPerfil({ a }: { a: PerfilAgente }) {
    const inicial = a.nombre.trim().charAt(0).toUpperCase();

    return (
        <Link
            href={`/admin/perfiles/${a.id}`}
            className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:bg-neutral-900"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {inicial}
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold">
                        {a.apellido}, {a.nombre}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {a.rango} · Doc. {a.documento || '—'}
                    </p>
                </div>
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
        </Link>
    );
}

export default function PerfilesIndex({ agentes }: Props) {
    const [busqueda, setBusqueda] = useState('');
    const [creando, setCreando] = useState(false);

    const filtrados = useMemo(() => {
        const q = normalizar(busqueda.trim());
        if (!q) {
            return agentes;
        }
        return agentes.filter((a) => normalizar(`${a.apellido} ${a.nombre} ${a.documento ?? ''}`).includes(q));
    }, [agentes, busqueda]);

    return (
        <>
            <Head title="Perfiles" />

            <main className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Perfiles de agentes</h1>
                        <p className="text-muted-foreground text-sm">
                            {filtrados.length} {filtrados.length === 1 ? 'agente' : 'agentes'}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <label className="relative w-full sm:w-72">
                            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                            <input
                                type="search"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre o documento"
                                className="bg-background w-full rounded-md border py-2 pr-3 pl-8 text-sm"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={() => setCreando(true)}
                            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                        >
                            <Plus className="size-4" />
                            Nuevo agente
                        </button>
                    </div>
                </div>

                {filtrados.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtrados.map((a) => (
                            <TarjetaPerfil key={a.id} a={a} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">No se encontraron agentes.</p>
                )}
            </main>

            {creando && <FormAgente onCerrar={() => setCreando(false)} />}
        </>
    );
}