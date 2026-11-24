import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const inputClase = 'w-full rounded-lg border bg-background p-2.5 text-sm';

function Error({ mensaje }: { mensaje?: string }) {
    return mensaje ? <p className="text-sm text-red-600">{mensaje}</p> : null;
}
function useHorarioCumplido(
    inicial: boolean,
    finProgramado?: string | null,
    ahoraServidor?: string | null,
    toleranciaMin = 10,
) {
    const [cumplido, setCumplido] = useState(inicial);

    useEffect(() => {
        if (!finProgramado) {
            setCumplido(inicial);
            return;
        }

        const desfase = ahoraServidor ? new Date(ahoraServidor).getTime() - Date.now() : 0;
        const limite = new Date(finProgramado).getTime() - toleranciaMin * 60_000;

        const evaluar = () => setCumplido(Date.now() + desfase >= limite);
        evaluar();

        const id = setInterval(evaluar, 15_000);
        return () => clearInterval(id);
    }, [finProgramado, ahoraServidor, toleranciaMin, inicial]);

    return cumplido;
}

export default function CierreTurno({
    turnoId,
    horarioCumplido,
    finProgramado,
    ahora,
    toleranciaMin,
}: {
    turnoId: number;
    horarioCumplido: boolean;
    finProgramado?: string | null;
    ahora?: string | null;
    toleranciaMin?: number;
}) {
    const [abierto, setAbierto] = useState(false);
    const finalizar = useHorarioCumplido(horarioCumplido, finProgramado, ahora, toleranciaMin);
    const form = useForm({
        vehiculo_oficial: false,
        placa: '',
        radio: false,
        novedades: '',
        otros_equipos: '',
        motivo_salida: '',
    });

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();

        form.transform((d) =>
            finalizar
                ? {
                      vehiculo_oficial: d.vehiculo_oficial,
                      placa: d.vehiculo_oficial ? d.placa : null,
                      radio: d.radio,
                      novedades: d.novedades,
                      otros_equipos: d.otros_equipos,
                  }
                : { motivo_salida: d.motivo_salida },
        );

        form.post(`/turnos/${turnoId}/${finalizar ? 'finalizar' : 'abandonar'}`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setAbierto(false);
            },
        });
    };

    if (!abierto) {
        return (
            <button
                type="button"
                onClick={() => setAbierto(true)}
                className={
                    finalizar
                        ? 'rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground'
                        : 'rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700'
                }
            >
                {finalizar ? 'Finalizar turno' : 'Abandonar turno'}
            </button>
        );
    }

    return (
        <form onSubmit={enviar} className="space-y-4 rounded-xl border bg-muted/30 p-4">
            {finalizar ? (
                <>
                    <p className="text-sm font-semibold">Reporte del turno</p>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.vehiculo_oficial}
                            onChange={(e) => form.setData('vehiculo_oficial', e.target.checked)}
                        />
                        Usé vehículo oficial
                    </label>

                    {form.data.vehiculo_oficial && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium">Patente</label>
                            <input
                                type="text"
                                maxLength={15}
                                value={form.data.placa}
                                onChange={(e) => form.setData('placa', e.target.value.toUpperCase())}
                                className={inputClase}
                            />
                            <Error mensaje={form.errors.placa} />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.radio}
                            onChange={(e) => form.setData('radio', e.target.checked)}
                        />
                        Usé radio
                    </label>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium">Otros equipos (opcional)</label>
                        <input
                            type="text"
                            value={form.data.otros_equipos}
                            onChange={(e) => form.setData('otros_equipos', e.target.value)}
                            className={inputClase}
                        />
                        <Error mensaje={form.errors.otros_equipos} />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium">Novedades</label>
                        <textarea
                            rows={4}
                            value={form.data.novedades}
                            onChange={(e) => form.setData('novedades', e.target.value)}
                            className={inputClase}
                            placeholder="Si no hubo novedades, escribí 'Sin novedades'"
                        />
                        <Error mensaje={form.errors.novedades} />
                    </div>
                </>
            ) : (
                <div className="space-y-1">
                    <label className="block text-sm font-medium">¿Por qué no podés completar el turno?</label>
                    <textarea
                        rows={4}
                        value={form.data.motivo_salida}
                        onChange={(e) => form.setData('motivo_salida', e.target.value)}
                        className={inputClase}
                    />
                    <Error mensaje={form.errors.motivo_salida} />
                </div>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                    {form.processing ? 'Enviando...' : finalizar ? 'Guardar y finalizar' : 'Confirmar abandono'}
                </button>
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border px-5 py-2.5 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    );

}