import { useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import SelectorLugar from '@/components/selector-lugar';
import type { LugarOpcion } from '@/components/selector-lugar';
import { Button } from '@/components/ui/button';

export type TipoRecorrido = 'estatico' | 'movil_itinerante';

// Punto de paso de un evento móvil (tabla evento_puntos_recorrido)
export type PuntoEvento = {
    descripcion_referencia: string | null;
    latitud?: string | number | null;
    longitud?: string | number | null;
};

// Datos de un evento que ya existe (modo edición)
export type EventoEditable = {
    id: number;
    titulo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    lugar_id?: number | null;
    lugar?: string | null;
    direccion: string | null;
    descripcion: string | null;
    estado: string | null;
    tipo_recorrido?: TipoRecorrido | null;
    latitud_inicio?: string | number | null;
    longitud_inicio?: string | number | null;
    solicitante_ente?: string | null;
    solicitante_nombre?: string | null;
    solicitante_celular?: string | null;
    puntos?: PuntoEvento[];
};

type PuntoForm = { descripcion_referencia: string };

type DatosFormulario = {
    titulo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    lugar_id: string;
    direccion: string;
    descripcion: string;
    estado: string;
    solicitante_ente: string;
    solicitante_nombre: string;
    solicitante_celular: string;
    tipo_recorrido: TipoRecorrido;
    puntos: PuntoForm[];
};

const ESTADOS = [
    { valor: 'programado', etiqueta: 'Programado' },
    { valor: 'en_curso', etiqueta: 'En curso' },
    { valor: 'finalizado', etiqueta: 'Finalizado' },
    { valor: 'cancelado', etiqueta: 'Cancelado' },
    { valor: 'suspendido', etiqueta: 'Suspendido' },
];

const TIPOS: { valor: TipoRecorrido; etiqueta: string; ayuda: string }[] = [
    { valor: 'estatico', etiqueta: 'Estático', ayuda: 'Un solo lugar (corte de calle, acto)' },
    { valor: 'movil_itinerante', etiqueta: 'Móvil / itinerante', ayuda: 'Con recorrido (procesión, desfile)' },
];

const puntoVacio = (): PuntoForm => ({ descripcion_referencia: '' });

type Props = {
    fecha: string; // fecha sugerida para un evento nuevo (YYYY-MM-DD)
    lugares: LugarOpcion[];
    evento?: EventoEditable | null; // si viene, el formulario edita ese evento; si no, crea uno nuevo
    onCerrar: () => void;
};

export default function FormEvento({ fecha, lugares, evento = null, onCerrar }: Props) {
    const form = useForm<DatosFormulario>({
        titulo: evento?.titulo ?? '',
        fecha: evento?.fecha ?? fecha,
        hora_inicio: evento?.hora_inicio ?? '09:00',
        hora_fin: evento?.hora_fin ?? '',
        lugar_id: evento?.lugar_id ? String(evento.lugar_id) : '',
        direccion: evento?.direccion ?? '',
        descripcion: evento?.descripcion ?? '',
        estado: evento?.estado ?? 'programado',
        solicitante_ente: evento?.solicitante_ente ?? '',
        solicitante_nombre: evento?.solicitante_nombre ?? '',
        solicitante_celular: evento?.solicitante_celular ?? '',
        tipo_recorrido: evento?.tipo_recorrido ?? 'estatico',
        puntos: (evento?.puntos ?? []).map((p) => ({
            descripcion_referencia: p.descripcion_referencia ?? '',
        })),
    });

    // Los errores de los puntos llegan como "puntos.0.descripcion_referencia", etc.
    const errores = form.errors as Record<string, string | undefined>;
    const esMovil = form.data.tipo_recorrido === 'movil_itinerante';
    const puntos = form.data.puntos;

    const cambiarTipo = (tipo: TipoRecorrido) => {
        form.setData('tipo_recorrido', tipo);
        // Al pasar a móvil se arranca con inicio y fin
        if (tipo === 'movil_itinerante' && puntos.length < 2) {
            form.setData('puntos', [puntoVacio(), puntoVacio()]);
        }
    };

    const cambiarPunto = (indice: number, valor: string) => {
        form.setData(
            'puntos',
            puntos.map((p, i) => (i === indice ? { ...p, descripcion_referencia: valor } : p)),
        );
    };

    const agregarPunto = () => form.setData('puntos', [...puntos, puntoVacio()]);

    const quitarPunto = (indice: number) =>
        form.setData(
            'puntos',
            puntos.filter((_, i) => i !== indice),
        );

    const moverPunto = (indice: number, delta: number) => {
        const destino = indice + delta;
        if (destino < 0 || destino >= puntos.length) {
            return;
        }
        const copia = [...puntos];
        [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
        form.setData('puntos', copia);
    };

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        // Un evento estático no lleva puntos de recorrido
        form.transform((d) => ({
            ...d,
            puntos: d.tipo_recorrido === 'movil_itinerante' ? d.puntos : [],
        }));

        const opciones = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onCerrar(),
        };

        if (evento) {
            form.put(`/admin/eventos-operativos/${evento.id}`, opciones);
        } else {
            form.post('/admin/eventos-operativos', opciones);
        }
    };

    return (
        <ModalSimple
            titulo={evento ? 'Editar evento operativo' : 'Nuevo evento operativo'}
            onCerrar={onCerrar}
            ancho="lg"
        >
            <form onSubmit={enviar} className="flex flex-col gap-3">
                {/* ---- Datos del evento ---- */}
                <Campo etiqueta="Título" error={form.errors.titulo}>
                    <input
                        type="text"
                        className={CLASE_CAMPO}
                        value={form.data.titulo}
                        onChange={(e) => form.setData('titulo', e.target.value)}
                    />
                </Campo>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Campo etiqueta="Fecha" error={form.errors.fecha}>
                        <input
                            type="date"
                            className={CLASE_CAMPO}
                            value={form.data.fecha}
                            onChange={(e) => form.setData('fecha', e.target.value)}
                        />
                    </Campo>
                    <Campo etiqueta="Desde" error={form.errors.hora_inicio}>
                        <input
                            type="time"
                            className={CLASE_CAMPO}
                            value={form.data.hora_inicio}
                            onChange={(e) => form.setData('hora_inicio', e.target.value)}
                        />
                    </Campo>
                    <Campo etiqueta="Hasta (opcional)" error={form.errors.hora_fin}>
                        <input
                            type="time"
                            className={CLASE_CAMPO}
                            value={form.data.hora_fin}
                            onChange={(e) => form.setData('hora_fin', e.target.value)}
                        />
                    </Campo>
                </div>

                <SelectorLugar
                    lugares={lugares}
                    valor={form.data.lugar_id}
                    onCambiar={(id) => form.setData('lugar_id', id)}
                    error={form.errors.lugar_id}
                    actual={evento?.lugar_id ? { id: evento.lugar_id, nombre: evento.lugar ?? 'Lugar actual' } : null}
                />

                <Campo etiqueta="Dirección o zona (opcional)" error={form.errors.direccion}>
                    <input
                        type="text"
                        className={CLASE_CAMPO}
                        value={form.data.direccion}
                        onChange={(e) => form.setData('direccion', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Descripción" error={form.errors.descripcion}>
                    <textarea
                        rows={2}
                        className={CLASE_CAMPO}
                        value={form.data.descripcion}
                        onChange={(e) => form.setData('descripcion', e.target.value)}
                    />
                </Campo>

                {/* ---- Solicitante ---- */}
                <div className="flex flex-col gap-3 border-t pt-3">
                    <h4 className="text-sm font-semibold">Solicitante (opcional)</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Campo etiqueta="Ente u organización" error={form.errors.solicitante_ente}>
                            <input
                                type="text"
                                className={CLASE_CAMPO}
                                value={form.data.solicitante_ente}
                                onChange={(e) => form.setData('solicitante_ente', e.target.value)}
                            />
                        </Campo>
                        <Campo etiqueta="Nombre" error={form.errors.solicitante_nombre}>
                            <input
                                type="text"
                                className={CLASE_CAMPO}
                                value={form.data.solicitante_nombre}
                                onChange={(e) => form.setData('solicitante_nombre', e.target.value)}
                            />
                        </Campo>
                        <Campo etiqueta="Celular" error={form.errors.solicitante_celular}>
                            <input
                                type="tel"
                                className={CLASE_CAMPO}
                                value={form.data.solicitante_celular}
                                onChange={(e) => form.setData('solicitante_celular', e.target.value)}
                            />
                        </Campo>
                    </div>
                </div>

                {/* ---- Tipo de recorrido ---- */}
                <div className="flex flex-col gap-3 border-t pt-3">
                    <h4 className="text-sm font-semibold">Tipo de recorrido</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {TIPOS.map((t) => {
                            const activo = form.data.tipo_recorrido === t.valor;
                            return (
                                <button
                                    key={t.valor}
                                    type="button"
                                    aria-pressed={activo}
                                    onClick={() => cambiarTipo(t.valor)}
                                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                                        activo ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                                    }`}
                                >
                                    <span className="block font-medium">{t.etiqueta}</span>
                                    <span className="text-muted-foreground block text-xs">{t.ayuda}</span>
                                </button>
                            );
                        })}
                    </div>
                    {errores.tipo_recorrido && <span className="text-sm text-red-600">{errores.tipo_recorrido}</span>}

                    {/* Móvil: puntos de paso (solo referencia) */}
                    {esMovil && (
                        <div className="flex flex-col gap-2">
                            <p className="text-muted-foreground text-xs">
                                El primer punto es el inicio y el último es el final. Mínimo 2 puntos.
                            </p>

                            {puntos.map((p, i) => (
                                <div key={i} className="rounded-md border p-2">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            Punto {i + 1}
                                            {i === 0 ? ' · Inicio' : i === puntos.length - 1 ? ' · Fin' : ''}
                                        </span>
                                        <div className="flex">
                                            <button
                                                type="button"
                                                onClick={() => moverPunto(i, -1)}
                                                disabled={i === 0}
                                                aria-label="Subir punto"
                                                className="hover:bg-muted rounded p-1 disabled:opacity-30"
                                            >
                                                <ArrowUp className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moverPunto(i, 1)}
                                                disabled={i === puntos.length - 1}
                                                aria-label="Bajar punto"
                                                className="hover:bg-muted rounded p-1 disabled:opacity-30"
                                            >
                                                <ArrowDown className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => quitarPunto(i)}
                                                disabled={puntos.length <= 2}
                                                aria-label="Quitar punto"
                                                className="hover:bg-muted rounded p-1 disabled:opacity-30"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Referencia (ej: plaza, esquina, iglesia)"
                                        aria-label={`Referencia del punto ${i + 1}`}
                                        className={CLASE_CAMPO}
                                        value={p.descripcion_referencia}
                                        onChange={(e) => cambiarPunto(i, e.target.value)}
                                    />
                                    {errores[`puntos.${i}.descripcion_referencia`] && (
                                        <span className="block text-sm text-red-600">
                                            {errores[`puntos.${i}.descripcion_referencia`]}
                                        </span>
                                    )}
                                </div>
                            ))}

                            {errores.puntos && <span className="text-sm text-red-600">{errores.puntos}</span>}

                            <div>
                                <Button type="button" variant="outline" size="sm" onClick={agregarPunto}>
                                    <Plus className="size-4" /> Agregar punto
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* El estado solo se cambia al editar; un evento nuevo arranca "programado" */}
                {evento && (
                    <Campo etiqueta="Estado" error={form.errors.estado}>
                        <select
                            className={CLASE_CAMPO}
                            value={form.data.estado}
                            onChange={(e) => form.setData('estado', e.target.value)}
                        >
                            {ESTADOS.map((s) => (
                                <option key={s.valor} value={s.valor}>
                                    {s.etiqueta}
                                </option>
                            ))}
                        </select>
                    </Campo>
                )}

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {evento ? 'Guardar cambios' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}