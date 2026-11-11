import { useForm, usePage } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import type { MiTurno } from '@/components/tarjeta-bienvenida';
import { Button } from '@/components/ui/button';

type Props = {
    turno: MiTurno;
    onCerrar: () => void;
};

export default function FormReporte({ turno, onCerrar }: Props) {
    const form = useForm({
        vehiculo_oficial: false,
        placa: '',
        radio: true,
        otros_equipos: '',
        novedades: '',
        resultados: 'El servicio se realizó de manera normal durante el horario asignado.',
        observaciones: '',
    });

    const { data, errors } = form;
    const { errors: erroresPagina } = usePage().props as unknown as {
    errors: Record<string, string | undefined>;
};

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        // Sin vehículo no se envía placa
        form.transform((d) => ({ ...d, placa: d.vehiculo_oficial ? d.placa : '' }));

        form.post(`/turnos/${turno.id}/finalizar`, {
            preserveScroll: true,
            onSuccess: () => onCerrar(),
        });
    };

    return (
        <ModalSimple titulo="Reporte del turno" onCerrar={onCerrar}>
            <form onSubmit={enviar} className="flex flex-col gap-3">
                {/* Tareas del turno (solo lectura) */}
                <div className="rounded-lg border p-2 text-sm">
                    <div className="mb-1 font-medium">Tareas realizadas</div>
                    {turno.tareas.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic">Este turno no tuvo tareas cargadas.</p>
                    ) : (
                        <ul className="space-y-0.5 text-xs">
                            {turno.tareas.map((t) => (
                                <li key={t.id}>
                                    • {t.titulo ?? 'Sin título'}
                                    {t.lugar ? ` · ${t.lugar}` : ''}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="text-sm font-medium">Recursos utilizados</div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={data.vehiculo_oficial}
                        onChange={(e) => form.setData('vehiculo_oficial', e.target.checked)}
                    />
                    Vehículo oficial
                </label>

                {data.vehiculo_oficial && (
                    <Campo etiqueta="Placa" error={errors.placa}>
                        <input
                            className={CLASE_CAMPO}
                            value={data.placa}
                            onChange={(e) => form.setData('placa', e.target.value)}
                        />
                    </Campo>
                )}

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={data.radio}
                        onChange={(e) => form.setData('radio', e.target.checked)}
                    />
                    Radio / comunicación
                </label>

                <Campo etiqueta="Otros equipos" error={errors.otros_equipos}>
                    <input
                        className={CLASE_CAMPO}
                        placeholder="Ej: conos"
                        value={data.otros_equipos}
                        onChange={(e) => form.setData('otros_equipos', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Novedades relevantes" error={errors.novedades}>
                    <textarea
                        rows={2}
                        className={CLASE_CAMPO}
                        value={data.novedades}
                        onChange={(e) => form.setData('novedades', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Resultados del servicio" error={errors.resultados}>
                    <textarea
                        rows={2}
                        className={CLASE_CAMPO}
                        value={data.resultados}
                        onChange={(e) => form.setData('resultados', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Observaciones y recomendaciones" error={errors.observaciones}>
                    <textarea
                        rows={2}
                        className={CLASE_CAMPO}
                        value={data.observaciones}
                        onChange={(e) => form.setData('observaciones', e.target.value)}
                    />
                </Campo>

                {erroresPagina.fichada && <p className="text-sm text-red-600">{erroresPagina.fichada}</p>}

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        Entregar reporte y terminar turno
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}