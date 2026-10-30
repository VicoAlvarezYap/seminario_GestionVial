import { Head, router, useForm } from '@inertiajs/react';
import { Download, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import NavbarAgente from '@/components/navbar-agente';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Licencia = {
    id: number;
    agente: string;
    dni: string | null;
    tipo_licencia: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    observaciones: string | null;
    domicilio: string | null;
    dj_a_cargo: string | null;
    dj_parentesco: string | null;
    tiene_justificante: boolean;
    resoluble: boolean;
};

type Paginador = {
    data: Licencia[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filtros = {
    buscar: string;
    estado: string;
    desde: string;
    hasta: string;
};

type Props = {
    licencias: Paginador;
    filtros: Filtros;
    estados: string[];
};

const colorPorEstado: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    aprobada: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    rechazada: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    cancelada: 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-200',
    finalizada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

const claseInput =
    'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60';
const claseEtiqueta = 'mb-1 block text-sm font-medium';
const claseAccion =
    'rounded-md border px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800';

const sinFiltros: Filtros = { buscar: '', estado: '', desde: '', hasta: '' };

function limpiar(f: Filtros): Record<string, string> {
    return Object.fromEntries(Object.entries(f).filter(([, valor]) => valor !== ''));
}

function Dato({ titulo, valor }: { titulo: string; valor: string | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{titulo}</dt>
            <dd className="text-sm font-medium">{valor ?? '-'}</dd>
        </div>
    );
}

export default function AdminLicenciasIndex({ licencias, filtros, estados }: Props) {
    const [borrador, setBorrador] = useState<Filtros>(filtros);
    const [seleccion, setSeleccion] = useState<Licencia | null>(null);
    const resolver = useForm({ accion: '', observaciones: '' });

    const aplicar = (f: Filtros) => {
        router.get('/admin/licencias', limpiar(f), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const buscar = (e: FormEvent) => {
        e.preventDefault();
        aplicar(borrador);
    };

    const quitarFiltros = () => {
        setBorrador(sinFiltros);
        aplicar(sinFiltros);
    };

    const irA = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveScroll: true });
        }
    };

    const abrir = (l: Licencia) => {
        resolver.reset();
        resolver.clearErrors();
        setSeleccion(l);
    };

    const cerrar = () => {
        setSeleccion(null);
        resolver.reset();
        resolver.clearErrors();
    };

    const decidir = (accion: 'aprobada' | 'rechazada') => {
        if (!seleccion) {
            return;
        }

        resolver.transform((d) => ({ ...d, accion }));
        resolver.patch(`/admin/licencias/${seleccion.id}/resolver`, {
            preserveScroll: true,
            onSuccess: () => cerrar(),
        });
    };


    const hayFiltros = Object.values(filtros).some((v) => v !== '');

    return (
        <>
            <Head title="Licencias - Administración" />
            <NavbarAgente />

            <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Historial de licencias</h1>
                        <p className="text-sm text-muted-foreground">
                            {licencias.total} {licencias.total === 1 ? 'resultado' : 'resultados'}, de la
                            más reciente a la más antigua.
                        </p>
                    </div>

                    
                </div>

                <form
                    onSubmit={buscar}
                    className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-900"
                >
                    <div className="sm:col-span-2 lg:col-span-4">
                        <label className={claseEtiqueta}>Buscar agente</label>
                        <input
                            type="text"
                            placeholder="Nombre, apellido o DNI"
                            value={borrador.buscar}
                            onChange={(e) => setBorrador({ ...borrador, buscar: e.target.value })}
                            className={claseInput}
                        />
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Estado</label>
                        <select
                            value={borrador.estado}
                            onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
                            className={claseInput}
                        >
                            <option value="">Todos</option>
                            {estados.map((est) => (
                                <option key={est} value={est}>
                                    {est.charAt(0).toUpperCase() + est.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Desde</label>
                        <input
                            type="date"
                            value={borrador.desde}
                            onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
                            className={claseInput}
                        />
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Hasta</label>
                        <input
                            type="date"
                            min={borrador.desde}
                            value={borrador.hasta}
                            onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
                            className={claseInput}
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                            <Search className="size-4" />
                            Buscar
                        </button>
                        {hayFiltros && (
                            <button
                                type="button"
                                onClick={quitarFiltros}
                                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </form>

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {licencias.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay licencias para los filtros elegidos.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Agente</th>
                                        <th className="p-3">Motivo</th>
                                        <th className="p-3">Desde</th>
                                        <th className="p-3">Hasta</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licencias.data.map((l) => (
                                        <tr key={l.id} className="border-b last:border-0">
                                            <td className="p-3">
                                                <div className="font-medium">{l.agente}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI {l.dni ?? '-'}
                                                </div>
                                            </td>
                                            <td className="p-3">{l.tipo_licencia}</td>
                                            <td className="p-3">{l.fecha_inicio}</td>
                                            <td className="p-3">{l.fecha_fin}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorEstado[l.estado] ?? ''}`}
                                                >
                                                    {l.estado}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                               <div className="flex flex-wrap gap-2">
        <button
            type="button"
            onClick={() => abrir(l)}
            className={claseAccion}
        >
            {l.resoluble ? 'Revisar' : 'Ver detalle'}
        </button>
        <a
            href={`/admin/licencias/${l.id}/pdf`}
            title="Descargar la solicitud en PDF"
            className={`${claseAccion} inline-flex items-center gap-1`}
        >
            <Download className="size-3" />
            Descargar PDF
        </a>
    </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {licencias.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm">
                            <button
                                type="button"
                                disabled={!licencias.prev_page_url}
                                onClick={() => irA(licencias.prev_page_url)}
                                className={claseAccion}
                            >
                                Anterior
                            </button>
                            <span className="text-muted-foreground">
                                Página {licencias.current_page} de {licencias.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!licencias.next_page_url}
                                onClick={() => irA(licencias.next_page_url)}
                                className={claseAccion}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <Dialog
                open={seleccion !== null}
                onOpenChange={(valor) => {
                    if (!valor) {
                        cerrar();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    {seleccion && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {seleccion.resoluble ? 'Revisar solicitud' : 'Detalle de la licencia'}
                                </DialogTitle>
                                <DialogDescription>
                                    {seleccion.agente} - {seleccion.tipo_licencia}
                                </DialogDescription>
                            </DialogHeader>

                            <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                                <Dato titulo="Desde" valor={seleccion.fecha_inicio} />
                                <Dato titulo="Hasta" valor={seleccion.fecha_fin} />
                                <Dato titulo="DNI" valor={seleccion.dni} />
                                <Dato titulo="Domicilio" valor={seleccion.domicilio} />
                                {seleccion.tipo_licencia === 'Familiar enfermo' && (
                                    <>
                                        <Dato titulo="A cargo de" valor={seleccion.dj_a_cargo} />
                                        <Dato titulo="Vínculo" valor={seleccion.dj_parentesco} />
                                    </>
                                )}
                            </dl>

                            {seleccion.tiene_justificante && (
                                <a
                                    href={`/admin/licencias/${seleccion.id}/justificante`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary underline"
                                >
                                    Ver justificante (PDF)
                                </a>
                            )}

                            {seleccion.resoluble ? (
                                <div className="space-y-2">
                                    <label className={claseEtiqueta}>
                                        Respuesta para el agente (obligatoria si rechazás)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={resolver.data.observaciones}
                                        onChange={(e) => resolver.setData('observaciones', e.target.value)}
                                        className={claseInput}
                                    />
                                    {resolver.errors.observaciones && (
                                        <p className="text-xs text-red-600">{resolver.errors.observaciones}</p>
                                    )}
                                    {resolver.errors.accion && (
                                        <p className="text-xs text-red-600">{resolver.errors.accion}</p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-muted-foreground">Estado</p>
                                    <p className="text-sm font-medium capitalize">{seleccion.estado}</p>
                                    <p className="mt-2 text-xs text-muted-foreground">Respuesta del administrador</p>
                                    <p className="text-sm">{seleccion.observaciones ?? '-'}</p>
                                </div>
                            )}

                            <DialogFooter className="gap-2">
                                <button
                                    type="button"
                                    onClick={cerrar}
                                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Cerrar
                                </button>
                                {seleccion.resoluble && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={resolver.processing}
                                            onClick={() => decidir('rechazada')}
                                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                                        >
                                            Rechazar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={resolver.processing}
                                            onClick={() => decidir('aprobada')}
                                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                                        >
                                            Aprobar
                                        </button>
                                    </>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}