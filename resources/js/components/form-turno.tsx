import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
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

// Datos de un turno que ya existe (modo edición). TurnoSemana es compatible con este tipo.
export type TurnoEditable = {
    id: number;
    agente_id: number;
    fecha: string;
    turno: string;
    estado: string | null;
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
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
    turnosDisponibles: string[]; // ['manana', 'tarde', 'noche', 'especial']
    turno?: TurnoEditable | null; // si viene, edita ese turno; si no, crea uno nuevo
    onCerrar: () => void;
};

export default function FormTurno({ fecha, agentes, turnosDisponibles, turno = null, onCerrar }: Props) {
    const anclaje = useComboboxAnchor();

    // "en_curso" se calcula en el servidor y no existe como estado guardado: se muestra como "programado"
    const estadoInicial = ESTADOS.some((s) => s.valor === turno?.estado) ? (turno?.estado as string) : 'programado';

    const form = useForm({
        agente_id: turno ? String(turno.agente_id) : '', // al editar: un solo agente
        agente_ids: [] as number[], // al crear: uno o varios agentes
        fecha: turno?.fecha ?? fecha,
        turno: turno?.turno ?? turnosDisponibles[0] ?? 'manana',
        estado_turno: estadoInicial,
    });

    const seleccionados = agentes.filter((a) => form.data.agente_ids.includes(a.id));
    const errorAgentes = form.errors.agente_ids ?? form.errors.agente_id;

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        // Al editar: un agente + estado. Al crear: la lista de agentes (el estado arranca "programado").
        form.transform(({ agente_id, agente_ids, estado_turno, ...resto }) =>
            turno ? { ...resto, agente_id, estado_turno } : { ...resto, agente_ids },
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

                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Fecha" error={form.errors.fecha}>
                        <input
                            type="date"
                            className={CLASE_CAMPO}
                            value={form.data.fecha}
                            onChange={(e) => form.setData('fecha', e.target.value)}
                        />
                    </Campo>

                    <Campo etiqueta="Turno" error={form.errors.turno}>
                        <select
                            className={CLASE_CAMPO}
                            value={form.data.turno}
                            onChange={(e) => form.setData('turno', e.target.value)}
                        >
                            {turnosDisponibles.map((t) => (
                                <option key={t} value={t}>
                                    {NOMBRE_TURNO[t] ?? t}
                                </option>
                            ))}
                        </select>
                    </Campo>
                </div>

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