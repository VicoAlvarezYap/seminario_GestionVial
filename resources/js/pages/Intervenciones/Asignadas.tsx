import { Head, useForm } from '@inertiajs/react';
import { Download, Plus } from 'lucide-react';
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

type Intervencion = {
    id: number;
    fecha_hora: string;
    evento: string;
    tipo: string;
    nivel_urgencia: string;
    lugar: string;
    descripcion: string | null;
    estado_resolucion: string;
    es_emergencia: boolean;
    mi_rol: string | null;
    siguientes: string[];
};

type Props = {
    intervenciones: Intervencion[];
    tipos: string[];
};

type DatosNueva = {
    tipo: string;
    tipo_evento: string;
    cantidad: string;
    nivel_urgencia: string;
    ubicacion_direccion: string;
    descripcion: string;
};

const vacia: DatosNueva = {
    tipo: '',
    tipo_evento: '',
    cantidad: '1',
    nivel_urgencia: 'media',
    ubicacion_direccion: '',
    descripcion: '',
};

const ETIQUETA_TIPO: Record<string, string> = {
    accidente: 'Accidente',
    infraccion: 'Infracción',
    emergencia: 'Emergencia',
    otro: 'Otro',
};

const ETIQUETA_URGENCIA: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítica',
};

const ETIQUETA_ESTADO: Record<string, string> = {
    en_curso: 'En curso',
    resuelta: 'Resuelta',
    derivada: 'Derivada',
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

function nombreEstado(estado: string): string {
    return estado.replace('_', ' ');
}

function MensajeError({ mensaje }: { mensaje?: string }) {
    if (!mensaje) {
        return null;
    }

    return <p className="mt-1 text-xs text-red-600">{mensaje}</p>;
}

function Dato({ titulo, valor }: { titulo: string; valor: string | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{titulo}</dt>
            <dd className="text-sm font-medium">{valor ?? '-'}</dd>
        </div>
    );
}

export default function IntervencionesAsignadas({ intervenciones, tipos }: Props) {
    const [seleccion, setSeleccion] = useState<Intervencion | null>(null);
    const [creando, setCreando] = useState(false);
    const informe = useForm({ estado_resolucion: '', informe: '' });
    const nueva = useForm<DatosNueva>(vacia);
    const datos = nueva.data;

    const abrir = (i: Intervencion) => {
        informe.reset();
        informe.clearErrors();
        setSeleccion(i);
    };

    const cerrar = () => {
        setSeleccion(null);
        informe.reset();
        informe.clearErrors();
    };

    const enviarInforme = (e: FormEvent) => {
        e.preventDefault();

        if (!seleccion) {
            return;
        }

        informe.patch(`/intervenciones/${seleccion.id}/informar`, {
            preserveScroll: true,
            onSuccess: () => cerrar(),
        });
    };

    const abrirNueva = () => {
        nueva.setData(vacia);
        nueva.clearErrors();
        setCreando(true);
    };

    const cerrarNueva = () => {
        setCreando(false);
        nueva.reset();
        nueva.clearErrors();
    };

    const enviarNueva = (e: FormEvent) => {
        e.preventDefault();

        nueva.post('/intervenciones/registrar', {
            preserveScroll: true,
            onSuccess: () => cerrarNueva(),
        });
    };

    return (
        <>
            <Head title="Mis intervenciones" />
            <NavbarAgente />

            <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Mis intervenciones</h1>
                        <p className="text-sm text-muted-foreground">
                            Las que registraste vos y las que te asignaron.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={abrirNueva}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                        <Plus className="size-4" />
                        Nueva intervención
                    </button>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {intervenciones.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Todavía no tenés intervenciones registradas ni asignadas.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Fecha y hora</th>
                                        <th className="p-3">Evento</th>
                                        <th className="p-3">Urgencia</th>
                                        <th className="p-3">Lugar</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Mi rol</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intervenciones.map((i) => (
                                        <tr key={i.id} className="border-b last:border-0">
                                            <td className="p-3">{i.fecha_hora}</td>
                                            <td className="p-3 font-medium">
                                                {i.evento}
                                                {i.es_emergencia && (
                                                    <div className="text-xs text-muted-foreground">Emergencia</div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorUrgencia[i.nivel_urgencia] ?? ''}`}
                                                >
                                                    {ETIQUETA_URGENCIA[i.nivel_urgencia] ?? i.nivel_urgencia}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.lugar}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorEstado[i.estado_resolucion] ?? ''}`}
                                                >
                                                    {nombreEstado(i.estado_resolucion)}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.mi_rol ?? '-'}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => abrir(i)}
                                                        className={claseAccion}
                                                    >
                                                        {i.siguientes.length > 0 ? 'Informar' : 'Ver detalle'}
                                                    </button>
                                                    <a
                                                        href={`/intervenciones/${i.id}/pdf`}
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
                </div>
            </main>

            <Dialog
                open={creando}
                onOpenChange={(valor) => {
                    if (!valor) {
                        cerrarNueva();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Nueva intervención</DialogTitle>
                        <DialogDescription>
                            Se registra con la fecha y hora del servidor al guardar.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={enviarNueva} className="space-y-4">
                        <div>
                            <label className={claseEtiqueta}>Tipo</label>
                            <select
                                value={datos.tipo}
                                onChange={(e) => nueva.setData('tipo', e.target.value)}
                                className={claseInput}
                            >
                                <option value="">Seleccioná un tipo</option>
                                {tipos.map((t) => (
                                    <option key={t} value={t}>
                                        {ETIQUETA_TIPO[t] ?? t}
                                    </option>
                                ))}
                            </select>
                            <MensajeError mensaje={nueva.errors.tipo} />
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Detalle del evento (opcional)</label>
                            <input
                                type="text"
                                placeholder="Ej: caída de árbol, bache, semáforo apagado"
                                value={datos.tipo_evento}
                                onChange={(e) => nueva.setData('tipo_evento', e.target.value)}
                                className={claseInput}
                            />
                            <MensajeError mensaje={nueva.errors.tipo_evento} />
                        </div>

                        {datos.tipo === 'infraccion' && (
                            <div>
                                <label className={claseEtiqueta}>Cantidad de infracciones</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={datos.cantidad}
                                    onChange={(e) => nueva.setData('cantidad', e.target.value)}
                                    className={claseInput}
                                />
                                <MensajeError mensaje={nueva.errors.cantidad} />
                            </div>
                        )}

                        <div>
                            <label className={claseEtiqueta}>Nivel de urgencia</label>
                            <select
                                value={datos.nivel_urgencia}
                                onChange={(e) => nueva.setData('nivel_urgencia', e.target.value)}
                                className={claseInput}
                            >
                                {Object.entries(ETIQUETA_URGENCIA).map(([valor, etiqueta]) => (
                                    <option key={valor} value={valor}>
                                        {etiqueta}
                                    </option>
                                ))}
                            </select>
                            <MensajeError mensaje={nueva.errors.nivel_urgencia} />
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Ubicación / dirección</label>
                            <input
                                type="text"
                                value={datos.ubicacion_direccion}
                                onChange={(e) => nueva.setData('ubicacion_direccion', e.target.value)}
                                className={claseInput}
                            />
                            <MensajeError mensaje={nueva.errors.ubicacion_direccion} />
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Descripción de la situación</label>
                            <textarea
                                rows={4}
                                value={datos.descripcion}
                                onChange={(e) => nueva.setData('descripcion', e.target.value)}
                                className={claseInput}
                            />
                            <MensajeError mensaje={nueva.errors.descripcion} />
                        </div>

                        <DialogFooter className="gap-2">
                            <button
                                type="button"
                                onClick={cerrarNueva}
                                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={nueva.processing}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            >
                                {nueva.processing ? 'Guardando...' : 'Guardar'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                                <DialogTitle>{seleccion.evento}</DialogTitle>
                                <DialogDescription>{seleccion.fecha_hora}</DialogDescription>
                            </DialogHeader>

                            <form onSubmit={enviarInforme} className="space-y-4">
                                <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                                    <Dato titulo="Lugar" valor={seleccion.lugar} />
                                    <Dato
                                        titulo="Urgencia"
                                        valor={ETIQUETA_URGENCIA[seleccion.nivel_urgencia] ?? seleccion.nivel_urgencia}
                                    />
                                    <Dato titulo="Estado" valor={nombreEstado(seleccion.estado_resolucion)} />
                                    <Dato titulo="Mi rol" valor={seleccion.mi_rol} />
                                </dl>

                                <div>
                                    <p className="text-xs text-muted-foreground">Descripción</p>
                                    <p className="whitespace-pre-line text-sm">{seleccion.descripcion ?? '-'}</p>
                                </div>

                                {seleccion.siguientes.length > 0 ? (
                                    <div className="space-y-3 rounded-lg border p-4">
                                        <p className="text-sm font-semibold">Informar el resultado</p>

                                        <div>
                                            <label className={claseEtiqueta}>Nuevo estado</label>
                                            <select
                                                value={informe.data.estado_resolucion}
                                                onChange={(e) => informe.setData('estado_resolucion', e.target.value)}
                                                className={claseInput}
                                            >
                                                <option value="">Seleccioná un estado</option>
                                                {seleccion.siguientes.map((s) => (
                                                    <option key={s} value={s}>
                                                        {ETIQUETA_ESTADO[s] ?? s}
                                                    </option>
                                                ))}
                                            </select>
                                            <MensajeError mensaje={informe.errors.estado_resolucion} />
                                        </div>

                                        <div>
                                            <label className={claseEtiqueta}>Informe (opcional)</label>
                                            <textarea
                                                rows={4}
                                                value={informe.data.informe}
                                                onChange={(e) => informe.setData('informe', e.target.value)}
                                                className={claseInput}
                                            />
                                            <MensajeError mensaje={informe.errors.informe} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Esta intervención ya está cerrada: no se puede modificar.
                                    </p>
                                )}

                                <DialogFooter className="gap-2">
                                    <button
                                        type="button"
                                        onClick={cerrar}
                                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        Cerrar
                                    </button>
                                    {seleccion.siguientes.length > 0 && (
                                        <button
                                            type="submit"
                                            disabled={informe.processing || informe.data.estado_resolucion === ''}
                                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                        >
                                            {informe.processing ? 'Enviando...' : 'Enviar informe'}
                                        </button>
                                    )}
                                </DialogFooter>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}