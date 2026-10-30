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

// Tiene que coincidir con el valor de RelevoController
const OTROS = 'Otros';

type Relevo = {
    id: number;
    nombre_completo: string;
    dni: string;
    domicilio: string | null;
    tipo_vehiculo: string;
    placa_vehiculo: string;
    infracciones: string[];
    infraccion_otros: string;
    motivo: string;
    intervencion_policial: 'si' | 'no';
    fecha_hora: string;
    editable: boolean;
};

type Props = {
    relevos: Relevo[];
    agente: { nombre: string; apellido: string } | null;
    infracciones: string[];
};

type DatosFormulario = {
    nombre_completo: string;
    dni: string;
    domicilio: string;
    tipo_vehiculo: string;
    placa_vehiculo: string;
    infracciones: string[];
    infraccion_otros: string;
    intervencion_policial: '' | 'si' | 'no';
};

const vacio: DatosFormulario = {
    nombre_completo: '',
    dni: '',
    domicilio: '',
    tipo_vehiculo: '',
    placa_vehiculo: '',
    infracciones: [],
    infraccion_otros: '',
    intervencion_policial: '',
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

export default function RelevosIndex({ relevos, agente, infracciones }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState<Relevo | null>(null);
    const [ahora, setAhora] = useState(() => new Date());
    const formulario = useForm<DatosFormulario>(vacio);
    const datos = formulario.data;
    const errores = formulario.errors;

    // Reloj de referencia mientras se completa una carga nueva
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

    const abrirNuevo = () => {
        setEditando(null);
        setAhora(new Date());
        formulario.setData(vacio);
        formulario.clearErrors();
        setAbierto(true);
    };

    const abrirEdicion = (r: Relevo) => {
        setEditando(r);
        formulario.clearErrors();
        formulario.setData({
            nombre_completo: r.nombre_completo ?? '',
            dni: r.dni ?? '',
            domicilio: r.domicilio ?? '',
            tipo_vehiculo: r.tipo_vehiculo ?? '',
            placa_vehiculo: r.placa_vehiculo ?? '',
            infracciones: r.infracciones,
            infraccion_otros: r.infraccion_otros,
            intervencion_policial: r.intervencion_policial,
        });
        setAbierto(true);
    };

    const alternarInfraccion = (nombre: string) => {
        formulario.setData((previo) => {
            const marcada = previo.infracciones.includes(nombre);

            return {
                ...previo,
                infracciones: marcada
                    ? previo.infracciones.filter((i) => i !== nombre)
                    : [...previo.infracciones, nombre],
                // Si se desmarca "Otros", se limpia el texto
                infraccion_otros: marcada && nombre === OTROS ? '' : previo.infraccion_otros,
            };
        });
    };

    const enviar = (e: FormEvent) => {
        e.preventDefault();

        const opciones = {
            preserveScroll: true,
            onSuccess: () => cerrar(),
        };

        if (editando) {
            formulario.put(`/relevos/${editando.id}`, opciones);
        } else {
            formulario.post('/relevos', opciones);
        }
    };

    const eliminar = (r: Relevo) => {
        if (!window.confirm('¿Querés eliminar este relevo? No se puede deshacer.')) {
            return;
        }

        router.delete(`/relevos/${r.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Mis relevos" />
            <NavbarAgente />

            <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Mis relevos</h1>

                    <button
                        type="button"
                        onClick={abrirNuevo}
                        disabled={!agente}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="size-4" />
                        Nuevo relevo
                    </button>
                </div>

                {!agente && (
                    <p className="text-sm text-red-600">
                        Tu cuenta no está vinculada a un agente, así que no podés cargar relevos.
                    </p>
                )}

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {relevos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Todavía no cargaste relevos.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Fecha y hora</th>
                                        <th className="p-3">Persona</th>
                                        <th className="p-3">Vehículo</th>
                                        <th className="p-3">Infracción</th>
                                        <th className="p-3">Policía</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {relevos.map((r) => (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="p-3">{r.fecha_hora}</td>
                                            <td className="p-3">
                                                <div className="font-medium">{r.nombre_completo}</div>
                                                <div className="text-xs text-muted-foreground">DNI {r.dni}</div>
                                            </td>
                                            <td className="p-3">
                                                {r.tipo_vehiculo}
                                                <div className="text-xs text-muted-foreground">{r.placa_vehiculo}</div>
                                            </td>
                                            <td className="p-3">{r.motivo}</td>
                                            <td className="p-3">
                                                {r.intervencion_policial === 'si' ? 'Sí' : 'No'}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!r.editable}
                                                        onClick={() => abrirEdicion(r)}
                                                        title={
                                                            r.editable
                                                                ? 'Editar el relevo'
                                                                : 'Solo se puede editar un relevo cargado hoy'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!r.editable}
                                                        onClick={() => eliminar(r)}
                                                        title={
                                                            r.editable
                                                                ? 'Eliminar el relevo'
                                                                : 'Solo se puede eliminar un relevo cargado hoy'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Eliminar
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
                        <DialogTitle>{editando ? 'Editar relevo' : 'Nuevo relevo'}</DialogTitle>
                        <DialogDescription>
                            Datos de la persona y del vehículo relevado en el operativo.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={enviar} className="space-y-5">
                        <div>
                            <label className={claseEtiqueta}>Fecha y hora</label>
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

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold">Datos de la persona</legend>
                            <div>
                                <label className={claseEtiqueta}>Nombre completo</label>
                                <input
                                    type="text"
                                    value={datos.nombre_completo}
                                    onChange={(e) => formulario.setData('nombre_completo', e.target.value)}
                                    className={claseInput}
                                />
                                <MensajeError mensaje={errores.nombre_completo} />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={claseEtiqueta}>DNI</label>
                                    <input
                                        type="text"
                                        value={datos.dni}
                                        onChange={(e) => formulario.setData('dni', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.dni} />
                                </div>
                                <div>
                                    <label className={claseEtiqueta}>Domicilio</label>
                                    <input
                                        type="text"
                                        value={datos.domicilio}
                                        onChange={(e) => formulario.setData('domicilio', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.domicilio} />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold">Vehículo</legend>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={claseEtiqueta}>Tipo de vehículo</label>
                                    <input
                                        type="text"
                                        value={datos.tipo_vehiculo}
                                        onChange={(e) => formulario.setData('tipo_vehiculo', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.tipo_vehiculo} />
                                </div>
                                <div>
                                    <label className={claseEtiqueta}>Placa</label>
                                    <input
                                        type="text"
                                        value={datos.placa_vehiculo}
                                        onChange={(e) => formulario.setData('placa_vehiculo', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.placa_vehiculo} />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold">Tipo de infracción</legend>
                            {infracciones.map((inf) => (
                                <label key={inf} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={datos.infracciones.includes(inf)}
                                        onChange={() => alternarInfraccion(inf)}
                                    />
                                    {inf}
                                </label>
                            ))}

                            {datos.infracciones.includes(OTROS) && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Especificá cuál"
                                        value={datos.infraccion_otros}
                                        onChange={(e) => formulario.setData('infraccion_otros', e.target.value)}
                                        className={claseInput}
                                    />
                                    <MensajeError mensaje={errores.infraccion_otros} />
                                </div>
                            )}
                            <MensajeError mensaje={errores.infracciones} />
                        </fieldset>

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold">Intervención policial</legend>
                            <div className="flex gap-6">
                                {(['si', 'no'] as const).map((valor) => (
                                    <label key={valor} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={datos.intervencion_policial === valor}
                                            onChange={() =>
                                                formulario.setData(
                                                    'intervencion_policial',
                                                    datos.intervencion_policial === valor ? '' : valor,
                                                )
                                            }
                                        />
                                        {valor === 'si' ? 'Sí' : 'No'}
                                    </label>
                                ))}
                            </div>
                            <MensajeError mensaje={errores.intervencion_policial} />
                        </fieldset>

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