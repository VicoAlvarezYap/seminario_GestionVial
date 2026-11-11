import { Head, router, useForm } from '@inertiajs/react';
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

type Opcion = { codigo: string; etiqueta: string };

type Acta = {
    id: number;
    fecha_hora: string;
    numero_acta: string;
    tercero_nombre_apellido: string;
    tercero_tipo_documento: string;
    tercero_dni: string;
    vehiculo_placa: string;
    vehiculo_tipo: string;
    motivo_detencion: string;
    editable: boolean;
    [campo: string]: string | number | boolean | string[];
};

type Props = {
    relevos: Acta[];
    agente: { nombre: string; apellido: string } | null;
    enTurno: boolean;
    infracciones: Opcion[];
    alcoholemia: Opcion[];
    tiposDocumento: string[];
};

type Datos = {
    infracciones_codigos: string[];
    alcoholemia_nivel: string;
    alcoholemia_agravante: boolean;
    retuvo_licencia: boolean;
    retuvo_vehiculo: boolean;
    conductor_alternativo: boolean;
    necesito_atencion_policial: boolean;
    [campo: string]: string | boolean | string[];
};

type Campo = {
    n: string;
    e: string;
    tipo?: 'text' | 'date' | 'datetime-local' | 'number' | 'select' | 'textarea';
    ancho?: 1 | 2;
    opciones?: string[] | 'documentos';
    req?: boolean;
};

type Seccion = {
    titulo: string;
    abierta?: boolean;
    extra?: 'infracciones' | 'alcoholemia' | 'boleta';
    campos: Campo[];
};

const SECCIONES: Seccion[] = [
    {
        titulo: 'Acta',
        abierta: true,
        campos: [{ n: 'numero_acta', e: 'N.º de acta (talonario)' }],
    },
    {
        titulo: 'Conductor',
        abierta: true,
        campos: [
            { n: 'tercero_nombre_apellido', e: 'Apellido y nombre', ancho: 2, req: true },
            { n: 'tercero_tipo_documento', e: 'Tipo de documento', tipo: 'select', opciones: 'documentos', req: true },
            { n: 'tercero_dni', e: 'N.º de documento', req: true },
            { n: 'conductor_sexo', e: 'Sexo', tipo: 'select', opciones: ['M', 'F', 'X'] },
            { n: 'tercero_celular', e: 'Teléfono' },
            { n: 'tercero_domicilio', e: 'Domicilio', ancho: 2 },
            { n: 'conductor_localidad', e: 'Localidad' },
            { n: 'conductor_codigo_postal', e: 'Código postal' },
            { n: 'conductor_partido', e: 'Partido' },
            { n: 'conductor_provincia', e: 'Provincia' },
            { n: 'conductor_pais', e: 'País' },
            { n: 'conductor_correo', e: 'Correo electrónico' },
        ],
    },
    {
        titulo: 'Licencia de conducir',
        campos: [
            { n: 'licencia_numero', e: 'N.º de licencia' },
            { n: 'licencia_expedida_por', e: 'Expedida por' },
            { n: 'licencia_clase', e: 'Clase' },
            { n: 'licencia_vencimiento', e: 'Vencimiento', tipo: 'date' },
        ],
    },
    {
        titulo: 'Vehículo',
        abierta: true,
        campos: [
            { n: 'vehiculo_placa', e: 'Dominio (patente)', req: true },
            { n: 'vehiculo_tipo', e: 'Tipo' },
            { n: 'vehiculo_marca', e: 'Marca' },
            { n: 'vehiculo_modelo', e: 'Modelo' },
            { n: 'vehiculo_anio', e: 'Año', tipo: 'number' },
            { n: 'vehiculo_linea', e: 'Línea' },
            { n: 'vehiculo_interno', e: 'Interno' },
            { n: 'vehiculo_otro_dominio', e: 'Otro dominio' },
        ],
    },
    {
        titulo: 'Titular del vehículo',
        campos: [
            { n: 'vehiculo_propietario', e: 'Propiedad de (apellido y nombre o razón social)', ancho: 2 },
            { n: 'propietario_tipo_documento', e: 'Tipo de documento', tipo: 'select', opciones: 'documentos' },
            { n: 'propietario_documento', e: 'N.º de documento / CUIT' },
            { n: 'propietario_domicilio', e: 'Domicilio', ancho: 2 },
            { n: 'propietario_codigo_postal', e: 'Código postal' },
            { n: 'propietario_localidad', e: 'Localidad' },
            { n: 'propietario_provincia', e: 'Provincia' },
            { n: 'propietario_pais', e: 'País' },
        ],
    },
    {
        titulo: 'Infracción (Anexo del Decreto 437/11)',
        abierta: true,
        extra: 'infracciones',
        campos: [
            { n: 'descripcion_legal', e: 'Descripción legal informada', tipo: 'textarea', ancho: 2 },
            { n: 'ley_decreto', e: 'Ley / Decreto' },
            { n: 'articulo_inciso', e: 'Artículo / inciso' },
            { n: 'codigo_infraccion', e: 'Cód. de infracción' },
            { n: 'lugar_infraccion', e: 'Lugar (calle, autopista, ruta, km)', ancho: 2, req: true },
            { n: 'sentido_circulacion', e: 'Sentido de circulación' },
            { n: 'localidad_infraccion', e: 'Localidad de la infracción' },
        ],
    },
    {
        titulo: 'Alcoholemia y cinemómetro / alcoholímetro',
        extra: 'alcoholemia',
        campos: [
            { n: 'instrumento_equipo', e: 'Equipo' },
            { n: 'instrumento_modelo', e: 'Modelo' },
            { n: 'instrumento_serie', e: 'N.º de serie' },
            { n: 'instrumento_cod_aprobacion', e: 'Cód. de aprobación' },
            { n: 'instrumento_valor', e: 'Valor' },
            { n: 'instrumento_fecha_hora', e: 'Fecha y hora de la medición', tipo: 'datetime-local' },
        ],
    },
    {
        titulo: 'Boleta de citación y observaciones',
        extra: 'boleta',
        campos: [{ n: 'observaciones', e: 'Observaciones / descripción / medidas precautorias', tipo: 'textarea', ancho: 2 }],
    },
];

const vacio = {
    ...Object.fromEntries(SECCIONES.flatMap((s) => s.campos.map((c) => [c.n, '']))),
    infracciones_codigos: [],
    alcoholemia_nivel: '',
    alcoholemia_agravante: false,
    retuvo_licencia: false,
    retuvo_vehiculo: false,
    conductor_alternativo: false,
    necesito_atencion_policial: false,
} as Datos;

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

function CampoForm({
    campo,
    valor,
    error,
    onChange,
    documentos,
}: {
    campo: Campo;
    valor: string;
    error?: string;
    onChange: (v: string) => void;
    documentos: string[];
}) {
    const opciones = campo.opciones === 'documentos' ? documentos : campo.opciones;

    return (
        <div className={campo.ancho === 2 ? 'sm:col-span-2' : ''}>
            <label className={claseEtiqueta}>
                {campo.e}
                {campo.req ? ' *' : ''}
            </label>

            {campo.tipo === 'select' ? (
                <select value={valor} onChange={(e) => onChange(e.target.value)} className={claseInput}>
                    <option value="">Seleccioná</option>
                    {(opciones ?? []).map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            ) : campo.tipo === 'textarea' ? (
                <textarea rows={3} value={valor} onChange={(e) => onChange(e.target.value)} className={claseInput} />
            ) : (
                <input
                    type={campo.tipo ?? 'text'}
                    value={valor}
                    onChange={(e) => onChange(e.target.value)}
                    className={claseInput}
                />
            )}

            <MensajeError mensaje={error} />
        </div>
    );
}

export default function ActasIndex({ relevos, agente, enTurno, infracciones, alcoholemia, tiposDocumento }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState<Acta | null>(null);
    const [ahora, setAhora] = useState(() => new Date());
    const formulario = useForm<Datos>(vacio);
    const datos = formulario.data;
    const errores = formulario.errors as Record<string, string | undefined>;

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

    const abrirEdicion = (r: Acta) => {
        setEditando(r);
        formulario.clearErrors();

        const cargados: Datos = { ...vacio };

        for (const clave of Object.keys(vacio)) {
            const valor = r[clave];

            if (valor !== undefined && valor !== null) {
                cargados[clave] = valor as string | boolean | string[];
            }
        }

        formulario.setData(cargados);
        setAbierto(true);
    };

    const alternarInfraccion = (codigo: string) => {
        const marcadas = datos.infracciones_codigos;

        formulario.setData(
            'infracciones_codigos',
            marcadas.includes(codigo) ? marcadas.filter((c) => c !== codigo) : [...marcadas, codigo],
        );
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

    const eliminar = (r: Acta) => {
        if (!window.confirm('¿Querés eliminar esta acta? No se puede deshacer.')) {
            return;
        }

        router.delete(`/relevos/${r.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Mis infracciones" />
            <NavbarAgente />

            <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Mis infracciones</h1>

                    <button
                        type="button"
                        onClick={abrirNueva}
                        disabled={!agente || !enTurno}
                        title={enTurno ? 'Cargar un acta de infracción' : 'Necesitás un turno en curso'}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="size-4" />
                        Nueva acta de infracción
                    </button>
                </div>

                {!agente && (
                    <p className="text-sm text-red-600">
                        Tu cuenta no está vinculada a un agente, así que no podés cargar actas.
                    </p>
                )}

                {agente && !enTurno && (
                    <p className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                        Para cargar un acta tenés que tener un turno en curso. Iniciá tu turno desde tu página de
                        inicio. Podés seguir consultando y corrigiendo las actas de hoy.
                    </p>
                )}

                <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
                    {relevos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Todavía no cargaste actas de infracción.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-3">Fecha y hora</th>
                                        <th className="p-3">Acta N.º</th>
                                        <th className="p-3">Conductor</th>
                                        <th className="p-3">Vehículo</th>
                                        <th className="p-3">Infracciones</th>
                                        <th className="p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {relevos.map((r) => (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="p-3">{r.fecha_hora}</td>
                                            <td className="p-3">{r.numero_acta || '-'}</td>
                                            <td className="p-3">
                                                <div className="font-medium">{r.tercero_nombre_apellido}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {r.tercero_tipo_documento} {r.tercero_dni}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {r.vehiculo_tipo || '-'}
                                                <div className="text-xs text-muted-foreground">{r.vehiculo_placa}</div>
                                            </td>
                                            <td className="max-w-xs p-3">{r.motivo_detencion}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!r.editable}
                                                        onClick={() => abrirEdicion(r)}
                                                        title={
                                                            r.editable
                                                                ? 'Editar el acta'
                                                                : 'Solo se puede editar un acta cargada hoy'
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
                                                                ? 'Eliminar el acta'
                                                                : 'Solo se puede eliminar un acta cargada hoy'
                                                        }
                                                        className={claseAccion}
                                                    >
                                                        Eliminar
                                                    </button>
                                                    <a
                                                        href={`/relevos/${r.id}/pdf`}
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
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{editando ? 'Editar acta de infracción' : 'Acta de infracción'}</DialogTitle>
                        <DialogDescription>
                            Los campos con * son obligatorios. Las secciones plegadas son opcionales.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={enviar} className="space-y-4">
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

                        {SECCIONES.map((s) => (
                            <details
                                key={s.titulo}
                                open={s.abierta || s.campos.some((c) => errores[c.n])}
                                className="rounded-lg border p-4"
                            >
                                <summary className="cursor-pointer text-sm font-semibold">{s.titulo}</summary>

                                <div className="mt-4 space-y-4">
                                    {s.extra === 'infracciones' && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Infracciones constatadas</p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {infracciones.map((inf) => (
                                                    <label key={inf.codigo} className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={datos.infracciones_codigos.includes(inf.codigo)}
                                                            onChange={() => alternarInfraccion(inf.codigo)}
                                                        />
                                                        {inf.etiqueta}
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Marcá al menos una, o completá la descripción legal.
                                            </p>
                                            <MensajeError mensaje={errores.infracciones_codigos} />
                                        </div>
                                    )}

                                    {s.extra === 'alcoholemia' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className={claseEtiqueta}>Alcoholemia (Ley 7846)</label>
                                                <select
                                                    value={datos.alcoholemia_nivel}
                                                    onChange={(e) => formulario.setData('alcoholemia_nivel', e.target.value)}
                                                    className={claseInput}
                                                >
                                                    <option value="">Sin dato</option>
                                                    {alcoholemia.map((a) => (
                                                        <option key={a.codigo} value={a.codigo}>
                                                            {a.etiqueta}
                                                        </option>
                                                    ))}
                                                </select>
                                                <MensajeError mensaje={errores.alcoholemia_nivel} />
                                            </div>
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={datos.alcoholemia_agravante}
                                                    onChange={(e) =>
                                                        formulario.setData('alcoholemia_agravante', e.target.checked)
                                                    }
                                                />
                                                Agravantes: menores o incapaces a bordo / transporte profesional (Art. 3 inc. 5)
                                            </label>
                                        </div>
                                    )}

                                    {s.extra === 'boleta' && (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {(
                                                [
                                                    ['retuvo_licencia', 'Retuvo la licencia'],
                                                    ['retuvo_vehiculo', 'Retuvo el vehículo'],
                                                    ['conductor_alternativo', 'Conductor alternativo'],
                                                    ['necesito_atencion_policial', 'Requirió intervención policial'],
                                                ] as const
                                            ).map(([clave, etiqueta]) => (
                                                <label key={clave} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(datos[clave])}
                                                        onChange={(e) => formulario.setData(clave, e.target.checked)}
                                                    />
                                                    {etiqueta}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {s.campos.map((c) => (
                                            <CampoForm
                                                key={c.n}
                                                campo={c}
                                                valor={String(datos[c.n] ?? '')}
                                                error={errores[c.n]}
                                                onChange={(v) => formulario.setData(c.n, v)}
                                                documentos={tiposDocumento}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </details>
                        ))}

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