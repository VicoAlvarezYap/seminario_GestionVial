import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import type { TareaSemana, TurnoSemana } from '@/components/calendario-semana-turnos';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import type { LugarOpcion } from '@/components/selector-lugar';
import { Button } from '@/components/ui/button';

export type EventoOpcion = {
    id: number;
    titulo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    lugar_id: number | null;
};

const ESTADOS = [
    { valor: 'programado', etiqueta: 'Programado' },
    { valor: 'iniciado', etiqueta: 'Iniciado' },
    { valor: 'en_proceso', etiqueta: 'En proceso' },
    { valor: 'finalizado', etiqueta: 'Finalizado' },
];

type Props = {
    turno: TurnoSemana;
    tarea: TareaSemana | null; // null = crear
    lugares: LugarOpcion[];
    titulosSugeridos: string[];
    eventos: EventoOpcion[];
    onCerrar: () => void;
};

export default function FormTarea({ turno, tarea, lugares, titulosSugeridos, eventos, onCerrar }: Props) {
    const editando = tarea !== null;

    const form = useForm({
        turno_trabajo_id: turno.id,
        aplicar_a_grupo: false,
        evento_operativo_id: tarea?.evento_operativo_id ? String(tarea.evento_operativo_id) : '',
        titulo: tarea?.evento_operativo_id ? '' : (tarea?.titulo ?? ''),
        lugar_id: tarea?.lugar_id ? String(tarea.lugar_id) : '',
        hora_inicio: tarea?.hora_inicio ?? '',
        hora_fin: tarea?.hora_fin ?? '',
        estado: tarea?.estado ?? 'programado',
        detalle: tarea?.detalle ?? '',
    });

    const { data, errors } = form;
    const hayEvento = data.evento_operativo_id !== '';

    // Solo los eventos del día del turno
    const eventosDelDia = eventos.filter((e) => e.fecha === turno.fecha);

    const elegirEvento = (id: string) => {
        const ev = eventos.find((e) => String(e.id) === id);

        form.setData((d) => ({
            ...d,
            evento_operativo_id: id,
            titulo: id ? '' : d.titulo,
            // al elegir un evento se rellenan lugar y horas (se pueden retocar)
            lugar_id: ev?.lugar_id ? String(ev.lugar_id) : d.lugar_id,
            hora_inicio: ev ? ev.hora_inicio : d.hora_inicio,
            hora_fin: ev ? (ev.hora_fin ?? '') : d.hora_fin,
        }));
    };

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        const opciones = { preserveScroll: true, onSuccess: () => onCerrar() };

        if (tarea) {
            // En edición no se envían turno ni grupo (el backend prohíbe cambiar de turno)
            form.transform(({ turno_trabajo_id: _turno, aplicar_a_grupo: _grupo, ...resto }) => resto);
            form.put(`/admin/tareas/${tarea.id}`, opciones);
        } else {
            // Al crear, el estado arranca "programado" y no se envía
            form.transform(({ estado: _estado, ...resto }) => resto);
            form.post('/admin/tareas', opciones);
        }
    };

    return (
        <ModalSimple titulo={editando ? 'Editar tarea' : 'Nueva tarea'} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="flex flex-col gap-3">
                <p className="text-muted-foreground text-xs">
                    {turno.agente} · {turno.fecha}
                </p>

                {/* Evento (opcional) */}
                <Campo etiqueta="Evento operativo (opcional)" error={errors.evento_operativo_id}>
                    <select
                        className={CLASE_CAMPO}
                        value={data.evento_operativo_id}
                        onChange={(e) => elegirEvento(e.target.value)}
                    >
                        <option value="">Sin evento</option>
                        {eventosDelDia.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                                {ev.titulo} ({ev.hora_inicio})
                            </option>
                        ))}
                    </select>
                    {eventosDelDia.length === 0 && (
                        <span className="text-muted-foreground text-xs font-normal">No hay eventos ese día.</span>
                    )}
                </Campo>

                {/* Título: solo si no hay evento (con evento se usa el del evento) */}
                {!hayEvento && (
                    <Campo etiqueta="Tarea" error={errors.titulo}>
                        <input
                            list="titulos-sugeridos"
                            className={CLASE_CAMPO}
                            value={data.titulo}
                            placeholder="Elegí una sugerencia o escribí otra"
                            onChange={(e) => form.setData('titulo', e.target.value)}
                        />
                        <datalist id="titulos-sugeridos">
                            {titulosSugeridos.map((t) => (
                                <option key={t} value={t} />
                            ))}
                        </datalist>
                    </Campo>
                )}

                <Campo etiqueta="Lugar" error={errors.lugar_id}>
                    <select
                        className={CLASE_CAMPO}
                        value={data.lugar_id}
                        onChange={(e) => form.setData('lugar_id', e.target.value)}
                    >
                        <option value="">Sin lugar</option>
                        {lugares.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.nombre}
                            </option>
                        ))}
                    </select>
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Desde" error={errors.hora_inicio}>
                        <input
                            type="time"
                            className={CLASE_CAMPO}
                            value={data.hora_inicio}
                            onChange={(e) => form.setData('hora_inicio', e.target.value)}
                        />
                    </Campo>
                    <Campo etiqueta="Hasta" error={errors.hora_fin}>
                        <input
                            type="time"
                            className={CLASE_CAMPO}
                            value={data.hora_fin}
                            onChange={(e) => form.setData('hora_fin', e.target.value)}
                        />
                    </Campo>
                </div>

                {/* Estado y detalle solo al editar: una tarea nueva arranca "programado" */}
                {editando && (
                    <>
                        <Campo etiqueta="Estado" error={errors.estado}>
                            <select
                                className={CLASE_CAMPO}
                                value={data.estado}
                                onChange={(e) => form.setData('estado', e.target.value as typeof data.estado)}
                            >
                                {ESTADOS.map((s) => (
                                    <option key={s.valor} value={s.valor}>
                                        {s.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        <Campo etiqueta="Detalle" error={errors.detalle}>
                            <textarea
                                rows={3}
                                className={CLASE_CAMPO}
                                value={data.detalle}
                                onChange={(e) => form.setData('detalle', e.target.value)}
                            />
                        </Campo>
                    </>
                )}

                {/* Replicar a los demás agentes de la misma asignación */}
                {!editando && turno.asignacion_id && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.aplicar_a_grupo}
                            onChange={(e) => form.setData('aplicar_a_grupo', e.target.checked)}
                        />
                        Aplicar también a los demás agentes de este turno
                    </label>
                )}

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {editando ? 'Guardar cambios' : 'Crear tarea'}
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}