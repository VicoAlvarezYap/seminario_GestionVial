import { Head, router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import NavbarAgente from '@/components/navbar-agente';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Tienen que coincidir con los valores de LicenciaController
const FAMILIAR = 'Familiar enfermo';
const MEDICO = 'Médico';

type Licencia = {
    id: number;
    tipo_licencia: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    observaciones: string | null;
    domicilio_calle: string | null;
    domicilio_numero: string | null;
    domicilio_localidad: string | null;
    dj_a_cargo: string | null;
    dj_parentesco: string | null;
    tiene_justificante: boolean;
    editable: boolean;
};

type Props = {
    licencias: Licencia[];
    agente: { nombre: string; apellido: string } | null;
    localidades: string[];
    motivos: string[];
    parentescos: string[];
};

type DatosFormulario = {
    domicilio_calle: string;
    domicilio_numero: string;
    domicilio_localidad: string;
    motivo: string;
    fecha_inicio: string;
    fecha_fin: string;
    dj_a_cargo: string;
    dj_parentesco: string;
    dj_conformidad: boolean;
    justificante: File | null;
};

const vacio: DatosFormulario = {
    domicilio_calle: '',
    domicilio_numero: '',
    domicilio_localidad: '',
    motivo: '',
    fecha_inicio: '',
    fecha_fin: '',
    dj_a_cargo: '',
    dj_parentesco: '',
    dj_conformidad: false,
    justificante: null,
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
    'rounded-md border px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800';

function MensajeError({ mensaje }: { mensaje?: string }) {
    if (!mensaje) {
        return null;
    }

    return <p className="mt-1 text-xs text-red-600">{mensaje}</p>;
}

export default function LicenciasIndex({
    licencias,
    agente,
    localidades,
    motivos,
    parentescos,
}: Props) {
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState<Licencia | null>(null);
    const inputArchivo = useRef<HTMLInputElement>(null);
    const formulario = useForm<DatosFormulario>(vacio);
    const datos = formulario.data;
    const errores = formulario.errors;

    const cerrar = () => {
        setAbierto(false);
        setEditando(null);
        formulario.reset();
        formulario.clearErrors();
    };

    const abrirNueva = () => {
        setEditando(null);
        formulario.setData(vacio);
        formulario.clearErrors();
        setAbierto(true);
    };

    const abrirEdicion = (l: Licencia) => {
        setEditando(l);
        formulario.clearErrors();
        formulario.setData({
            domicilio_calle: l.domicilio_calle ?? '',
            domicilio_numero: l.domicilio_numero ?? '',
            domicilio_localidad: l.domicilio_localidad ?? '',
            motivo: l.tipo_licencia,
            fecha_inicio: l.fecha_inicio,
            fecha_fin: l.fecha_fin,
            dj_a_cargo: l.dj_a_cargo ?? '',
            dj_parentesco: l.dj_parentesco ?? '',
            dj_conformidad: l.tipo_licencia === FAMILIAR,
            justificante: null,
        });
        setAbierto(true);
    };

    const quitarArchivo = () => {
        formulario.setData('justificante', null);

        if (inputArchivo.current) {
            inputArchivo.current.value = '';
        }
    };

    const enviar = (e: FormEvent) => {
        e.preventDefault();

        const opciones = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => cerrar(),
        };

        if (editando) {
            // PHP no lee archivos en un PUT: se envía por POST y se indica _method
            formulario.transform((d) => ({ ...d, _method: 'put' }));
            formulario.post(`/licencias/${editando.id}`, opciones);
        } else {
            formulario.transform((d) => d);
            formulario.post('/licencias', opciones);
        }
    };

    const cancelarLicencia = (l: Licencia) => {
        if (!window.confirm('¿Querés cancelar esta licencia? No se puede deshacer.')) {
            return;
        }

        router.patch(`/licencias/${l.id}/cancelar`, {}, { preserveScroll: true });
    };
//limite en las fechas 
    const hoy = new Date().toISOString().split('T')[0];
    const unAnioDespuesObj = new Date();
    unAnioDespuesObj.setFullYear(unAnioDespuesObj.getFullYear() + 1);
    const unAnioDespues = unAnioDespuesObj.toISOString().split('T')[0];
    return (
        <>
            <Head title="Mis licencias" />
            <NavbarAgente />

            <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Mis licencias</h1>

                    <button
                        type="button"
                        onClick={abrirNueva}
                        disabled={!agente}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="size-4" />
                        Solicitar nueva licencia
                    </button>
                </div>

                {!agente && (
                    <p className="text-sm text-red-600">
                        Tu cuenta no está vinculada a un agente, así que no podés solicitar licencias.
                    </p>
                )}

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {licencias.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Todavía no tenés licencias registradas.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Motivo</th>
                                        <th className="p-3">Desde</th>
                                        <th className="p-3">Hasta</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Observaciones</th>
                                        <th className="p-3">PDF</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licencias.map((l) => (
                                        <tr key={l.id} className="border-b last:border-0">
                                            <td className="p-3 font-medium">{l.tipo_licencia}</td>
                                            <td className="p-3">{l.fecha_inicio}</td>
                                            <td className="p-3">{l.fecha_fin}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-medium ${colorPorEstado[l.estado] ?? ''}`}
                                                >
                                                    {l.estado}
                                                </span>
                                            </td>
                                            <td className="p-3">{l.observaciones ?? '-'}</td>
                                            <td className="p-3">
                                                {l.tiene_justificante ? (
                                                    <a
                                                        href={`/licencias/${l.id}/justificante`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary underline"
                                                    >
                                                        Ver PDF
                                                    </a>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!l.editable}
                                                        onClick={() => abrirEdicion(l)}
                                                        title={
                                                            l.editable
                                                                ? 'Editar la solicitud'
                                                                : 'Solo se puede editar una licencia pendiente'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!l.editable}
                                                        onClick={() => cancelarLicencia(l)}
                                                        title={
                                                            l.editable
                                                                ? 'Cancelar la licencia'
                                                                : 'Solo se puede cancelar una licencia pendiente'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Cancelar licencia
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
                            {editando ? 'Editar solicitud de licencia' : 'Solicitar nueva licencia'}
                        </DialogTitle>
                        <DialogDescription>
                            Completá los datos y adjuntá el justificante en PDF.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={enviar} className="space-y-5">
                        <div>
                            <label className={claseEtiqueta}>Nombre y apellido</label>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={agente ? `${agente.nombre} ${agente.apellido}` : ''}
                                className={claseInput}
                            />
                        </div>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold">Domicilio</legend>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className={claseEtiqueta}>Calle</label>
                                    <input
                                        type="text"
                                        value={datos.domicilio_calle}
                                        onChange={(e) => formulario.setData('domicilio_calle', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.domicilio_calle} />
                                </div>
                                <div className="w-28">
                                    <label className={claseEtiqueta}>Número</label>
                                    <input
                                        type="text"
                                        value={datos.domicilio_numero}
                                        onChange={(e) => formulario.setData('domicilio_numero', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.domicilio_numero} />
                                </div>
                            </div>
                            <div>
                                <label className={claseEtiqueta}>Localidad</label>
                                <select
                                    value={datos.domicilio_localidad}
                                    onChange={(e) => formulario.setData('domicilio_localidad', e.target.value)}
                                    className={claseInput}
                                >
                                    <option value="">Seleccioná una localidad</option>
                                    {localidades.map((loc) => (
                                        <option key={loc} value={loc}>
                                            {loc}
                                        </option>
                                    ))}
                                </select>
                                <MensajeError mensaje={errores.domicilio_localidad} />
                            </div>
                        </fieldset>

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold">Motivo</legend>
                            {motivos.map((m) => (
                                <label key={m} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={datos.motivo === m}
                                        onChange={() => formulario.setData('motivo', datos.motivo === m ? '' : m)}
                                    />
                                    {m}
                                </label>
                            ))}
                            <MensajeError mensaje={errores.motivo} />
                        </fieldset>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className={claseEtiqueta}>Desde</label>
                                <input
                                    type="date"
                                    min={hoy}
                                    max={unAnioDespues}                                   
                                    value={datos.fecha_inicio}
                                    onChange={(e) => formulario.setData('fecha_inicio', e.target.value)}
                                    className={claseInput}
                                />
                                <MensajeError mensaje={errores.fecha_inicio} />
                            </div>
                            <div>
                                <label className={claseEtiqueta}>Hasta</label>
                                <input
                                    type="date"
                                    min={datos.fecha_inicio || hoy}
                                    max={unAnioDespues}
                                    value={datos.fecha_fin}
                                    onChange={(e) => formulario.setData('fecha_fin', e.target.value)}
                                    className={claseInput}
                                />
                                <MensajeError mensaje={errores.fecha_fin} />
                            </div>
                        </div>

                        {datos.motivo === FAMILIAR && (
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="px-1 text-sm font-semibold">
                                    Declaración jurada por familiar enfermo
                                </legend>

                                <div>
                                    <label className={claseEtiqueta}>
                                        Declaro bajo juramento ser la única persona a cuyo cargo está:
                                    </label>
                                    <input
                                        type="text"
                                        value={datos.dj_a_cargo}
                                        onChange={(e) => formulario.setData('dj_a_cargo', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.dj_a_cargo} />
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">A quien me une el vínculo de:</p>
                                    <div className="flex flex-wrap gap-4">
                                        {parentescos.map((p) => (
                                            <label key={p} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={datos.dj_parentesco === p}
                                                    onChange={() =>
                                                        formulario.setData('dj_parentesco', datos.dj_parentesco === p ? '' : p)
                                                    }
                                                />
                                                {p}
                                            </label>
                                        ))}
                                    </div>
                                    <MensajeError mensaje={errores.dj_parentesco} />
                                </div>

                                <div>
                                    <label className="flex items-start gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="mt-1"
                                            checked={datos.dj_conformidad}
                                            onChange={(e) => formulario.setData('dj_conformidad', e.target.checked)}
                                        />
                                        Declaro que los datos son verdaderos y firmo esta declaración jurada.
                                    </label>
                                    <MensajeError mensaje={errores.dj_conformidad} />
                                </div>
                            </fieldset>
                        )}

                        <div className="space-y-2">
                            <label className={claseEtiqueta}>
                                Justificante (PDF){datos.motivo === MEDICO ? ' *' : ''}
                            </label>

                            <input
                                ref={inputArchivo}
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                onChange={(e) => formulario.setData('justificante', e.target.files?.[0] ?? null)}
                            />

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => inputArchivo.current?.click()}
                                    className={claseAccion}
                                >
                                    {datos.justificante ? 'Cambiar archivo' : 'Elegir archivo PDF'}
                                </button>

                                {datos.justificante && (
                                    <>
                                        <span className="text-sm">{datos.justificante.name}</span>
                                        <button
                                            type="button"
                                            onClick={quitarArchivo}
                                            className="text-sm text-red-600 underline"
                                        >
                                            Quitar
                                        </button>
                                    </>
                                )}
                            </div>

                            {editando?.tiene_justificante && !datos.justificante && (
                                <p className="text-xs text-muted-foreground">
                                    Ya hay un justificante cargado. Si elegís otro archivo, lo reemplaza.
                                </p>
                            )}
                            <MensajeError mensaje={errores.justificante} />
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