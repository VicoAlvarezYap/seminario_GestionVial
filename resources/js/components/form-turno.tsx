import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import SelectorLugar from '@/components/selector-lugar';
import type { LugarOpcion } from '@/components/selector-lugar';
import { Button } from '@/components/ui/button';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';

export type AgenteOpcion = { id: number; nombre: string };

// Datos de un turno que ya existe (modo edición)
export type TurnoEditable = {
    id: number;
    agente_id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    lugar_id?: number | null;
    lugar?: string | null;
    direccion: string | null;
    observaciones: string | null;
    estado: string | null;
};

const ESTADOS = [
    { valor: 'programado', etiqueta: 'Programado' },
    { valor: 'cumplido', etiqueta: 'Cumplido' },
    { valor: 'ausente', etiqueta: 'Ausente' },
    { valor: 'cancelado', etiqueta: 'Cancelado' },
    { valor: 'reasignado', etiqueta: 'Reasignado' },
];

type Props = {
    fecha: string; // día sobre el que se hizo clic (YYYY-MM-DD)
    agentes: AgenteOpcion[];
    lugares: LugarOpcion[];
    turno?: TurnoEditable | null; // si viene, el formulario edita ese turno; si no, crea uno nuevo
    onCerrar: () => void;
};

export default function FormTurno({ fecha, agentes, lugares, turno = null, onCerrar }: Props) {
    // Punto de anclaje del desplegable del combobox (el hook va siempre, aunque no se use al editar)
    const anclaje = useComboboxAnchor();

    const form = useForm({
        agente_id: turno ? String(turno.agente_id) : '', // al editar: un solo agente
        agente_ids: [] as number[], // al crear: uno o varios agentes
        fecha: turno?.fecha ?? fecha,
        hora_inicio: turno?.hora_inicio ?? '08:00',
        hora_fin: turno?.hora_fin ?? '14:00',
        lugar_id: turno?.lugar_id ? String(turno.lugar_id) : '',
        direccion_asignada: turno?.direccion ?? '',
        observaciones: turno?.observaciones ?? '',
        estado_turno: turno?.estado ?? 'programado',
    });

    // El combobox trabaja con los objetos completos; el formulario guarda solo los ids
    const seleccionados = agentes.filter((a) => form.data.agente_ids.includes(a.id));
    const errorAgentes = form.errors.agente_ids ?? form.errors.agente_id;

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        // Se envía solo lo que corresponde: un agente al editar, la lista al crear
        form.transform(({ agente_id, agente_ids, ...resto }) =>
            turno ? { ...resto, agente_id } : { ...resto, agente_ids },
        );

        const opciones = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onCerrar(),
        };

        if (turno) {
            form.put(`/admin/turnos/${turno.id}`, opciones);
        } else {
            form.post('/admin/turnos', opciones);
        }
    };

    return (
        <ModalSimple titulo={turno ? 'Editar turno' : 'Asignar turno'} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="flex flex-col gap-3">
                {turno ? (
                    /* Al editar, un turno pertenece a un solo agente */
                    <Campo etiqueta="Agente" error={form.errors.agente_id}>
                        <select
                            className={CLASE_CAMPO}
                            value={form.data.agente_id}
                            onChange={(e) => form.setData('agente_id', e.target.value)}
                        >
                            <option value="">Elegir agente…</option>
                            {agentes.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre}
                                </option>
                            ))}
                        </select>
                    </Campo>
                ) : (
                    /* Al crear, se pueden elegir varios agentes de una vez.
                       No se usa <Campo> porque es un <label>: tocar un chip activaría otro control. */
                    <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Agentes</span>
                            <span className="text-muted-foreground text-xs">
                                {form.data.agente_ids.length === 1
                                    ? '1 seleccionado'
                                    : `${form.data.agente_ids.length} seleccionados`}
                            </span>
                        </div>

                        <Combobox
                            multiple
                            autoHighlight
                            items={agentes}
                            value={seleccionados}
                            onValueChange={(valor: AgenteOpcion[]) =>
                                form.setData(
                                    'agente_ids',
                                    valor.map((a) => a.id),
                                )
                            }
                            itemToStringLabel={(a: AgenteOpcion) => a.nombre}
                            isItemEqualToValue={(a: AgenteOpcion, b: AgenteOpcion) => a.id === b.id}
                        >
                            <ComboboxChips ref={anclaje} className="w-full">
                                <ComboboxValue>
                                    {(valores: AgenteOpcion[]) => (
                                        <>
                                            {valores.map((a) => (
                                                <ComboboxChip key={a.id}>{a.nombre}</ComboboxChip>
                                            ))}
                                            <ComboboxChipsInput
                                                placeholder={valores.length === 0 ? 'Buscar y elegir agentes…' : ''}
                                            />
                                        </>
                                    )}
                                </ComboboxValue>
                            </ComboboxChips>

                            <ComboboxContent anchor={anclaje}>
                                <ComboboxEmpty>No se encontraron agentes.</ComboboxEmpty>
                                <ComboboxList>
                                    {(a: AgenteOpcion) => (
                                        <ComboboxItem key={a.id} value={a}>
                                            {a.nombre}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <div className="flex gap-3 text-xs">
                            <button
                                type="button"
                                className="underline"
                                onClick={() =>
                                    form.setData(
                                        'agente_ids',
                                        agentes.map((a) => a.id),
                                    )
                                }
                            >
                                Seleccionar todos
                            </button>
                            <button type="button" className="underline" onClick={() => form.setData('agente_ids', [])}>
                                Quitar todos
                            </button>
                        </div>

                        {errorAgentes && <span className="text-sm text-red-600">{errorAgentes}</span>}
                    </div>
                )}

                <Campo etiqueta="Fecha" error={form.errors.fecha}>
                    <input
                        type="date"
                        className={CLASE_CAMPO}
                        value={form.data.fecha}
                        onChange={(e) => form.setData('fecha', e.target.value)}
                    />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Desde" error={form.errors.hora_inicio}>
                        <input
                            type="time"
                            className={CLASE_CAMPO}
                            value={form.data.hora_inicio}
                            onChange={(e) => form.setData('hora_inicio', e.target.value)}
                        />
                    </Campo>
                    <Campo etiqueta="Hasta" error={form.errors.hora_fin}>
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
                    actual={turno?.lugar_id ? { id: turno.lugar_id, nombre: turno.lugar ?? 'Lugar actual' } : null}
                />

                <Campo etiqueta="Detalle del lugar (opcional)" error={form.errors.direccion_asignada}>
                    <input
                        type="text"
                        placeholder="Ej: esquina norte, puerta 2"
                        className={CLASE_CAMPO}
                        value={form.data.direccion_asignada}
                        onChange={(e) => form.setData('direccion_asignada', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Tarea / observaciones" error={form.errors.observaciones}>
                    <textarea
                        rows={3}
                        className={CLASE_CAMPO}
                        value={form.data.observaciones}
                        onChange={(e) => form.setData('observaciones', e.target.value)}
                    />
                </Campo>

                {/* El estado solo se cambia al editar; un turno nuevo arranca "programado" */}
                {turno && (
                    <Campo etiqueta="Estado" error={form.errors.estado_turno}>
                        <select
                            className={CLASE_CAMPO}
                            value={form.data.estado_turno}
                            onChange={(e) => form.setData('estado_turno', e.target.value)}
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
                        {turno ? 'Guardar cambios' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}
