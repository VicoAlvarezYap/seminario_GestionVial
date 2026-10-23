import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

export type AgenteOpcion = { id: number; nombre: string };

// Datos de un turno que ya existe (modo edición)
export type TurnoEditable = {
    id: number;
    agente_id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
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
    turno?: TurnoEditable | null; // si viene, el formulario edita ese turno; si no, crea uno nuevo
    onCerrar: () => void;
};

export default function FormTurno({ fecha, agentes, turno = null, onCerrar }: Props) {
    const form = useForm({
        agente_id: turno ? String(turno.agente_id) : '',
        fecha: turno?.fecha ?? fecha,
        hora_inicio: turno?.hora_inicio ?? '08:00',
        hora_fin: turno?.hora_fin ?? '14:00',
        direccion_asignada: turno?.direccion ?? '',
        observaciones: turno?.observaciones ?? '',
        estado_turno: turno?.estado ?? 'programado',
    });

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();
        const opciones = {
            preserveScroll: true,
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

                <Campo etiqueta="Lugar asignado" error={form.errors.direccion_asignada}>
                    <input
                        type="text"
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
