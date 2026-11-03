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

type Participante = {
    id: number;
    nombre: string;
    rol: string | null;
};

type Intervencion = {
    id: number;
    fecha_hora: string;
    tipo_evento: string;
    nivel_urgencia: string;
    ubicacion_direccion: string;
    descripcion_situacion: string | null;
    estado_resolucion: string;
    reportante: string;
    reportante_dni: string | null;
    participantes: Participante[];
    resuelta_en: string | null;
    tiempo_respuesta: string | null;
};

type Paginador = {
    data: Intervencion[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Filtros = {
    buscar: string;
    estado: string;
    urgencia: string;
    tipo: string;
    desde: string;
    hasta: string;
};

type Props = {
    intervenciones: Paginador;
    filtros: Filtros;
    estados: string[];
    urgencias: string[];
    tipos: string[];
};

const ETIQUETA_URGENCIA: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica',
};

const colorPorEstado: Record<string, string> = {
    reportada: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    en_curso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    resuelta: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    derivada: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    cancelada: 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-200',
};

const colorPorUrgencia: Record<string, string> = {
    baja: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    critica: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const claseInput =
    'w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60';
const claseEtiqueta = 'mb-1 block text-sm font-medium';
const claseAccion =
    'rounded-md border px-3 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800';

const sinFiltros: Filtros = { buscar: '', estado: '', urgencia: '', tipo: '', desde: '', hasta: '' };

function limpiar(f: Filtros): Record<string, string> {
    return Object.fromEntries(Object.entries(f).filter(([, valor]) => valor !== ''));
}

function nombreEstado(estado: string): string {
    return estado.replace('_', ' ');
}

function Dato({ titulo, valor }: { titulo: string; valor: string | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{titulo}</dt>
            <dd className="text-sm font-medium">{valor ?? '-'}</dd>
        </div>
    );
}

export default function AdminIntervencionesIndex({
    intervenciones,
    filtros,
    estados,
    urgencias,
    tipos,
}: Props) {
    const [borrador, setBorrador] = useState<Filtros>(filtros);
    const [seleccion, setSeleccion] = useState<Intervencion | null>(null);

    const aplicar = (f: Filtros) => {
        router.get('/admin/intervenciones', limpiar(f), {
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
            <Head title="Intervenciones - Administración" />
            <NavbarAgente />

            <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Intervenciones de emergencia</h1>
                    <p className="text-sm text-muted-foreground">
                        {intervenciones.total} {intervenciones.total === 1 ? 'resultado' : 'resultados'}, de la
                        más reciente a la más antigua.
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
                            placeholder="Ubicación o agente (nombre, apellido o DNI)"
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
                                    {nombreEstado(est).charAt(0).toUpperCase() + nombreEstado(est).slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={claseEtiqueta}>Urgencia</label>
                        <select
                            value={borrador.urgencia}
                            onChange={(e) => setBorrador({ ...borrador, urgencia: e.target.value })}
                            className={claseInput}
                        >
                            <option value="">Todas</option>
                            {urgencias.map((u) => (
                                <option key={u} value={u}>
                                    {ETIQUETA_URGENCIA[u] ?? u}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className={claseEtiqueta}>Tipo de evento</label>
                        <select
                            value={borrador.tipo}
                            onChange={(e) => setBorrador({ ...borrador, tipo: e.target.value })}
                            className={claseInput}
                        >
                            <option value="">Todos</option>
                            {tipos.map((t) => (
                                <option key={t} value={t}>
                                    {t}
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

                    <div className="flex items-end gap-2 sm:col-span-2">
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
                    {intervenciones.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay intervenciones para los filtros elegidos.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Fecha y hora</th>
                                        <th className="p-3">Evento</th>
                                        <th className="p-3">Urgencia</th>
                                        <th className="p-3">Ubicación</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Reportó</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intervenciones.data.map((i) => (
                                        <tr key={i.id} className="border-b last:border-0">
                                            <td className="p-3">{i.fecha_hora}</td>
                                            <td className="p-3 font-medium">{i.tipo_evento}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorUrgencia[i.nivel_urgencia] ?? ''}`}
                                                >
                                                    {ETIQUETA_URGENCIA[i.nivel_urgencia] ?? i.nivel_urgencia}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.ubicacion_direccion}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorEstado[i.estado_resolucion] ?? ''}`}
                                                >
                                                    {nombreEstado(i.estado_resolucion)}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.reportante}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSeleccion(i)}
                                                        className={claseAccion}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    <a
                                                        href={`/admin/intervenciones/${i.id}/pdf`}
                                                        title="Descargar el informe en PDF"
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

                    {intervenciones.last_page > 1 && (
                        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm">
                            <button
                                type="button"
                                disabled={!intervenciones.prev_page_url}
                                onClick={() => irA(intervenciones.prev_page_url)}
                                className={claseAccion}
                            >
                                Anterior
                            </button>
                            <span className="text-muted-foreground">
                                Página {intervenciones.current_page} de {intervenciones.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={!intervenciones.next_page_url}
                                onClick={() => irA(intervenciones.next_page_url)}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {seleccion && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{seleccion.tipo_evento}</DialogTitle>
                                <DialogDescription>
                                    Reportada el {seleccion.fecha_hora} por {seleccion.reportante}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5">
                                <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                                    <Dato titulo="Ubicación" valor={seleccion.ubicacion_direccion} />
                                    <Dato
                                        titulo="Urgencia"
                                        valor={ETIQUETA_URGENCIA[seleccion.nivel_urgencia] ?? seleccion.nivel_urgencia}
                                    />
                                    <Dato titulo="Estado" valor={nombreEstado(seleccion.estado_resolucion)} />
                                    <Dato titulo="Resuelta" valor={seleccion.resuelta_en} />
                                    <Dato titulo="Tiempo de respuesta" valor={seleccion.tiempo_respuesta} />
                                    <Dato titulo="DNI del agente" valor={seleccion.reportante_dni} />
                                </dl>

                                <div>
                                    <p className="text-xs text-muted-foreground">Descripción de la situación</p>
                                    <p className="text-sm">{seleccion.descripcion_situacion ?? '-'}</p>
                                </div>

                                {seleccion.participantes.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold">Otros agentes que participaron</p>
                                        <ul className="divide-y rounded-lg border">
                                            {seleccion.participantes.map((p) => (
                                                <li key={p.id} className="p-3 text-sm">
                                                    <div className="font-medium">{p.nombre}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {p.rol ?? 'Sin rol indicado'}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
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
                                    href={`/admin/intervenciones/${seleccion.id}/pdf`}
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