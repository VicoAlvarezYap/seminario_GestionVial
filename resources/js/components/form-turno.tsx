import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

export type AgenteOpcion = { id: number; nombre: string };

type Props = {
    fecha: string; // día sobre el que se hizo clic (YYYY-MM-DD)
    agentes: AgenteOpcion[];
    onCerrar: () => void;
};

export default function FormTurno({ fecha, agentes, onCerrar }: Props) {
    const form = useForm({
        agente_id: '',
        fecha,
        hora_inicio: '08:00',
        hora_fin: '14:00',
        direccion_asignada: '',
        observaciones: '',
        estado_turno: 'programado',
    });

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        form.post('/admin/turnos', {
            preserveScroll: true,
            onSuccess: () => onCerrar(),
        });
    };

    return (
        <ModalSimple titulo="Asignar turno" onCerrar={onCerrar}>
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

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        Guardar
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}