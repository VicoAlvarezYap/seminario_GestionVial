import { Head, router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import NavbarAgente from '@/components/navbar-agente';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Tiene que coincidir con el valor de IntervencionController
const OTROS = 'Otros';

const URGENCIAS: { valor: string; etiqueta: string }[] = [
    { valor: 'baja', etiqueta: 'Baja' },
    { valor: 'media', etiqueta: 'Media' },
    { valor: 'alta', etiqueta: 'Alta' },
    { valor: 'critica', etiqueta: 'Crítica' },
];

type Intervencion = {
    id: number;
    tipo_evento: string;
    tipo_seleccion: string;
    tipo_otros: string;
    nivel_urgencia: string;
    ubicacion_direccion: string;
    descripcion_situacion: string | null;
    estado_resolucion: string;
    fecha_hora: string;
    es_reportante: boolean;
    editable: boolean;
};

type Props = {
    intervenciones: Intervencion[];
    agente: { nombre: string; apellido: string } | null;
    tipos: string[];
};

type DatosFormulario = {
    tipo_seleccion: string;
    tipo_otros: string;
    nivel_urgencia: string;
    ubicacion_direccion: string;
    descripcion_situacion: string;
};

const vacio: DatosFormulario = {
    tipo_seleccion: '',
    tipo_otros: '',
    nivel_urgencia: '',
    ubicacion_direccion: '',
    descripcion_situacion: '',
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
    'rounded-md border px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800';

function etiquetaUrgencia(valor: string): string {
    return URGENCIAS.find((u) => u.valor === valor)?.etiqueta ?? valor;
}

function MensajeError({ mensaje }: { mensaje?: string }) {
    if (!mensaje) {
        return null;
    }

    return <p className="mt-1 text-xs text-red-600">{mensaje}</p>;
}

export default function IntervencionesIndex({ intervenciones, agente, tipos }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState<Intervencion | null>(null);
    const [ahora, setAhora] = useState(() => new Date());
    const formulario = useForm<DatosFormulario>(vacio);
    const datos = formulario.data;
    const errores = formulario.errors;

    // Reloj de referencia mientras se completa un reporte nuevo
    useEffect(() => {
        if (!abierto || editando) {
            return;
        }

        const reloj = setInterval(() => setAhora(new Date()), 1000);

        return () => clearInterval(reloj);
    }, [abierto, editando]);

    const cerrar = () => {
        setAbierto(false);
        setEditando(null);
        formulario.reset();
        formulario.clearErrors();
    };

    const abrirNueva = () => {
        setEditando(null);
        setAhora(new Date());
        formulario.setData(vacio);
        formulario.clearErrors();
        setAbierto(true);
    };

    const abrirEdicion = (i: Intervencion) => {
        setEditando(i);
        formulario.clearErrors();
        formulario.setData({
            tipo_seleccion: i.tipo_seleccion,
            tipo_otros: i.tipo_otros,
            nivel_urgencia: i.nivel_urgencia,
            ubicacion_direccion: i.ubicacion_direccion ?? '',
            descripcion_situacion: i.descripcion_situacion ?? '',
        });
        setAbierto(true);
    };

    const enviar = (e: FormEvent) => {
        e.preventDefault();

        const opciones = {
            preserveScroll: true,
            onSuccess: () => cerrar(),
        };

        if (editando) {
            formulario.put(`/intervenciones/${editando.id}`, opciones);
        } else {
            formulario.post('/intervenciones', opciones);
        }
    };

    const cancelarIntervencion = (i: Intervencion) => {
        if (!window.confirm('¿Querés cancelar este reporte? No se puede deshacer.')) {
            return;
        }

        router.patch(`/intervenciones/${i.id}/cancelar`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Intervenciones de emergencia" />
            <NavbarAgente />

            <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Intervenciones de emergencia</h1>

                    <button
                        type="button"
                        onClick={abrirNueva}
                        disabled={!agente}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="size-4" />
                        Reportar emergencia
                    </button>
                </div>

                {!agente && (
                    <p className="text-sm text-red-600">
                        Tu cuenta no está vinculada a un agente, así que no podés reportar emergencias.
                    </p>
                )}

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {intervenciones.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Todavía no tenés intervenciones registradas.
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
                                        <th className="p-3">Mi rol</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intervenciones.map((i) => (
                                        <tr key={i.id} className="border-b last:border-0">
                                            <td className="p-3">{i.fecha_hora}</td>
                                            <td className="p-3">
                                                <div className="font-medium">{i.tipo_evento}</div>
                                                {i.descripcion_situacion && (
                                                    <div className="max-w-xs truncate text-xs text-muted-foreground">
                                                        {i.descripcion_situacion}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorUrgencia[i.nivel_urgencia] ?? ''}`}
                                                >
                                                    {etiquetaUrgencia(i.nivel_urgencia)}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.ubicacion_direccion}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorEstado[i.estado_resolucion] ?? ''}`}
                                                >
                                                    {i.estado_resolucion.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-3">{i.es_reportante ? 'Reportante' : 'Participante'}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!i.editable}
                                                        onClick={() => abrirEdicion(i)}
                                                        title={
                                                            i.editable
                                                                ? 'Editar el reporte'
                                                                : 'Solo el reportante puede editar, y solo si está recién reportada'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!i.editable}
                                                        onClick={() => cancelarIntervencion(i)}
                                                        title={
                                                            i.editable
                                                                ? 'Cancelar el reporte'
                                                                : 'Solo el reportante puede cancelar, y solo si está recién reportada'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Cancelar
                                                    </button>
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
                open={abierto}
                onOpenChange={(valor) => {
                    if (!valor) {
                        cerrar();
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editando ? 'Editar reporte de emergencia' : 'Reportar emergencia'}
                        </DialogTitle>
                        <DialogDescription>
                            Datos de la emergencia atendida en la vía pública.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={enviar} className="space-y-5">
                        <div>
                            <label className={claseEtiqueta}>Fecha y hora del reporte</label>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={editando ? editando.fecha_hora : ahora.toLocaleString('es-AR')}
                                className={claseInput}
                            />
                            {!editando && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Se registra con la hora del servidor en el momento de guardar.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Tipo de evento</label>
                            <select
                                value={datos.tipo_seleccion}
                                onChange={(e) =>
                                    formulario.setData((previo) => ({
                                        ...previo,
                                        tipo_seleccion: e.target.value,
                                        tipo_otros: e.target.value === OTROS ? previo.tipo_otros : '',
                                    }))
                                }
                                className={claseInput}
                            >
                                <option value="">Seleccioná un tipo</option>
                                {tipos.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                            <MensajeError mensaje={errores.tipo_seleccion} />

                            {datos.tipo_seleccion === OTROS && (
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="Especificá cuál"
                                        value={datos.tipo_otros}
                                        onChange={(e) => formulario.setData('tipo_otros', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.tipo_otros} />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Nivel de urgencia</label>
                            <select
                                value={datos.nivel_urgencia}
                                onChange={(e) => formulario.setData('nivel_urgencia', e.target.value)}
                                className={claseInput}
                            >
                                <option value="">Seleccioná el nivel</option>
                                {URGENCIAS.map((u) => (
                                    <option key={u.valor} value={u.valor}>
                                        {u.etiqueta}
                                    </option>
                                ))}
                            </select>
                            <MensajeError mensaje={errores.nivel_urgencia} />
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Ubicación / dirección</label>
                            <input
                                type="text"
                                value={datos.ubicacion_direccion}
                                onChange={(e) => formulario.setData('ubicacion_direccion', e.target.value)}
                                className={claseInput}
                            />
                            <MensajeError mensaje={errores.ubicacion_direccion} />
                        </div>

                        <div>
                            <label className={claseEtiqueta}>Descripción de la situación</label>
                            <textarea
                                rows={4}
                                value={datos.descripcion_situacion}
                                onChange={(e) => formulario.setData('descripcion_situacion', e.target.value)}
                                className={claseInput}
                            />
                            <MensajeError mensaje={errores.descripcion_situacion} />
                        </div>

                        <DialogFooter className="gap-2">
                            <button
                                type="button"
                                onClick={cerrar}
                                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={formulario.processing}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            >
                                {formulario.processing ? 'Guardando...' : 'Guardar'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}