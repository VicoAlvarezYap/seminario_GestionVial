import { Head } from '@inertiajs/react';
import { Mail, Phone, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import NavbarAgente from '@/components/navbar-agente';

type PerfilAgente = {
    id: number;
    nombre: string;
    apellido: string;
    documento: string | null;
    celular: string | null;
    correo: string | null;
};

type Props = {
    agentes: PerfilAgente[];
};

// Minúsculas y sin tildes, para que "perez" encuentre "Pérez"
const normalizar = (texto: string) =>
    texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

function TarjetaPerfil({ a }: { a: PerfilAgente }) {
    const inicial = a.nombre.trim().charAt(0).toUpperCase();

    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {inicial}
                </div>
                <div className="min-w-0">
                    <p className="truncate font-semibold">
                        {a.apellido}, {a.nombre}
                    </p>
                    <p className="text-muted-foreground text-xs">Doc. {a.documento || '—'}</p>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground size-4 shrink-0" />
                    {a.celular ? (
                        <a href={`tel:${a.celular}`} className="hover:underline">
                            {a.celular}
                        </a>
                    ) : (
                        <span className="text-muted-foreground">Sin celular</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    {a.correo ? (
                        <a href={`mailto:${a.correo}`} className="truncate hover:underline">
                            {a.correo}
                        </a>
                    ) : (
                        <span className="text-muted-foreground">Sin correo</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PerfilesIndex({ agentes }: Props) {
    const [busqueda, setBusqueda] = useState('');

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
            <NavbarAgente />

            <main className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Perfiles de agentes</h1>
                        <p className="text-muted-foreground text-sm">
                            {filtrados.length} {filtrados.length === 1 ? 'agente' : 'agentes'}
                        </p>
                    </div>

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
        </>
    );
}