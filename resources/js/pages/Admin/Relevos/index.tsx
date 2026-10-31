import { Head, router } from '@inertiajs/react';
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

type Relevo = {
    id: number;
    fecha_hora: string;
    agente: string;
    agente_dni: string | null;
    persona: string | null;
    dni: string | null;
    domicilio: string | null;
    celular: string | null;
    tipo_vehiculo: string | null;
    placa: string | null;
    motivo: string;
    personas_implicadas: string | null;
    policial: boolean;
};

type Paginador = {
    data: Relevo[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filtros = {
    buscar: string;
    policial: string;
    infraccion: string;
    desde: string;
    hasta: string;
};

type Props = {
    relevos: Paginador;
    filtros: Filtros;
    infracciones: string[];
};

const claseInput =
    'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60';
const claseEtiqueta = 'mb-1 block text-sm font-medium';
const claseAccion =
    'rounded-md border px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800';

const sinFiltros: Filtros = { buscar: '', policial: '', infraccion: '', desde: '', hasta: '' };

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

export default function AdminRelevosIndex({ relevos, filtros, infracciones }: Props) {
    const [borrador, setBorrador] = useState<Filtros>(filtros);
    const [seleccion, setSeleccion] = useState<Relevo | null>(null);

    const aplicar = (f: Filtros) => {
        router.get('/admin/relevos', limpiar(f), {
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

    const hayFiltros = Object.values(filtros).some((v) => v !== '');

    return (
        <>
            <Head title="Relevos - Administración" />
            <NavbarAgente />

            <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Historial de relevos</h1>
                    <p className="text-sm text-muted-foreground">
                        {relevos.total} {relevos.total === 1 ? 'resultado' : 'resultados'}, del más reciente al
                        más antiguo.
                    </p>
                </div>

                <form
                    onSubmit={buscar}
                    className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-900"
                >
                    <div className="sm:col-span-2 lg:col-span-4">
                        <label className={claseEtiqueta}>Buscar</label>
                        <input
                            type="text"
                            placeholder="Agente, persona relevada, DNI o placa"
                            value={borrador.buscar}
                            onChange={(e) => setBorrador({ ...borrador, buscar: e.target.value })}
                            className={claseInput}
                        />
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Infracción</label>
                        <select
                            value={borrador.infraccion}
                            onChange={(e) => setBorrador({ ...borrador, infraccion: e.target.value })}
                            className={claseInput}
                        >
                            <option value="">Todas</option>
                            {infracciones.map((inf) => (
                                <option key={inf} value={inf}>
                                    {inf}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Intervención policial</label>
                        <select
                            value={borrador.policial}
                            onChange={(e) => setBorrador({ ...borrador, policial: e.target.value })}
                            className={claseInput}
                        >
                            <option value="">Todas</option>
                            <option value="si">Con intervención</option>
                            <option value="no">Sin intervención</option>
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

                    <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
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
                    {relevos.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay relevos para los filtros elegidos.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Fecha y hora</th>
                                        <th className="p-3">Agente</th>
                                        <th className="p-3">Persona</th>
                                        <th className="p-3">Vehículo</th>
                                        <th className="p-3">Infracción</th>
                                        <th className="p-3">Policía</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {relevos.data.map((r) => (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="p-3">{r.fecha_hora}</td>
                                            <td className="p-3">{r.agente}</td>
                                            <td className="p-3">
                                                <div className="font-medium">{r.persona ?? '-'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    DNI {r.dni ?? '-'}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {r.tipo_vehiculo ?? '-'}
                                                <div className="text-xs text-muted-foreground">{r.placa ?? '-'}</div>
                                            </td>
                                            <td className="p-3">{r.motivo}</td>
                                            <td className="p-3">{r.policial ? 'Sí' : 'No'}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeleccion(r)}
                                                        className={claseAccion}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    <a
                                                        href={`/admin/relevos/${r.id}/pdf`}
                                                        title="Descargar el acta en PDF"
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

                    {relevos.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm">
                            <button
                                type="button"
                                disabled={!relevos.prev_page_url}
                                onClick={() => irA(relevos.prev_page_url)}
                                className={claseAccion}
                            >
                                Anterior
                            </button>
                            <span className="text-muted-foreground">
                                Página {relevos.current_page} de {relevos.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!relevos.next_page_url}
                                onClick={() => irA(relevos.next_page_url)}
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
                        setSeleccion(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    {seleccion && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Detalle del relevo</DialogTitle>
                                <DialogDescription>
                                    {seleccion.fecha_hora} - {seleccion.agente}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                                    <Dato titulo="Persona relevada" valor={seleccion.persona} />
                                    <Dato titulo="DNI" valor={seleccion.dni} />
                                    <Dato titulo="Domicilio" valor={seleccion.domicilio} />
                                    <Dato titulo="Celular" valor={seleccion.celular} />
                                    <Dato titulo="Tipo de vehículo" valor={seleccion.tipo_vehiculo} />
                                    <Dato titulo="Placa" valor={seleccion.placa} />
                                </dl>

                                <div>
                                    <p className="text-xs text-muted-foreground">Infracción constatada</p>
                                    <p className="text-sm font-medium">{seleccion.motivo}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground">Intervención policial</p>
                                    <p className="text-sm font-medium">
                                        {seleccion.policial ? 'Sí, se requirió' : 'No se requirió'}
                                    </p>
                                </div>

                                {seleccion.personas_implicadas && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Otras personas implicadas</p>
                                        <p className="text-sm">{seleccion.personas_implicadas}</p>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSeleccion(null)}
                                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Cerrar
                                </button>
                                <a
                                    href={`/admin/relevos/${seleccion.id}/pdf`}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                                >
                                    <Download className="size-4" />
                                    Descargar PDF
                                </a>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}