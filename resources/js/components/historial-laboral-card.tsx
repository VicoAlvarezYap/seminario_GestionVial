import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export type Periodo = {
    id: number;
    fecha_alta: string;
    fecha_baja: string | null;
    motivo_ingreso: string | null;
    motivo_egreso: string | null;
};

type Props = {
    agenteId: number;
    historial: Periodo[];
    activo: boolean;
};

export default function HistorialLaboralCard({ agenteId, historial, activo }: Props) {
    const [abierto, setAbierto] = useState(false);
    const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    const baja = useForm({ fecha_baja: hoy, motivo_egreso: '' });
    const alta = useForm({ fecha_alta: hoy, motivo_ingreso: '' });

    const enviarBaja = (e: React.FormEvent) => {
        e.preventDefault();
        baja.post(`/admin/agentes/${agenteId}/baja`, {
            preserveScroll: true,
            onSuccess: () => {
                setAbierto(false);
                baja.reset();
            },
        });
    };

    const enviarAlta = (e: React.FormEvent) => {
        e.preventDefault();
        alta.post(`/admin/agentes/${agenteId}/alta`, {
            preserveScroll: true,
            onSuccess: () => {
                setAbierto(false);
                alta.reset();
            },
        });
    };



    return (
        <section className="space-y-4 rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Historial laboral</h3>
                    <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {activo ? 'Activo' : 'De baja'}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setAbierto((v) => !v)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent ${activo ? 'text-red-600' : ''
                        }`}
                >
                    {abierto ? 'Cancelar' : activo ? 'Dar de baja' : 'Reingresar'}
                </button>
            </div>

            {abierto && activo && (
                <form onSubmit={enviarBaja} className="space-y-3 rounded-lg border p-4">
                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs">Fecha de baja</label>
                        <input
                            type="date"
                            value={baja.data.fecha_baja}
                            onChange={(e) => baja.setData('fecha_baja', e.target.value)}
                            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                        {baja.errors.fecha_baja && <p className="mt-1 text-xs text-red-600">{baja.errors.fecha_baja}</p>}
                    </div>

                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs">Motivo de la baja</label>
                        <textarea
                            value={baja.data.motivo_egreso}
                            onChange={(e) => baja.setData('motivo_egreso', e.target.value)}
                            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                            rows={3}
                        />
                        {baja.errors.motivo_egreso && (
                            <p className="mt-1 text-xs text-red-600">{baja.errors.motivo_egreso}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={baja.processing}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                        Confirmar baja
                    </button>
                </form>
            )}

            {abierto && !activo && (
                <form onSubmit={enviarAlta} className="space-y-3 rounded-lg border p-4">
                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs">Fecha de alta</label>
                        <input
                            type="date"
                            value={alta.data.fecha_alta}
                            onChange={(e) => alta.setData('fecha_alta', e.target.value)}
                            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                        {alta.errors.fecha_alta && <p className="mt-1 text-xs text-red-600">{alta.errors.fecha_alta}</p>}
                    </div>

                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs">Motivo de ingreso (opcional)</label>
                        <input
                            value={alta.data.motivo_ingreso}
                            onChange={(e) => alta.setData('motivo_ingreso', e.target.value)}
                            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                        />
                        {alta.errors.motivo_ingreso && (
                            <p className="mt-1 text-xs text-red-600">{alta.errors.motivo_ingreso}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={alta.processing}
                        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        Confirmar alta
                    </button>
                </form>
            )}

            {historial.length > 0 ? (
                <ul className="divide-y text-sm">
                    {historial.map((h) => (
                        <li key={h.id} className="space-y-0.5 py-2.5">
                            <p className="font-medium">
                                {h.fecha_alta} → {h.fecha_baja ?? 'Actualidad'}
                            </p>
                            {h.motivo_ingreso && (
                                <p className="text-muted-foreground text-xs">Ingreso: {h.motivo_ingreso}</p>
                            )}
                            {h.motivo_egreso && (
                                <p className="text-muted-foreground text-xs">Egreso: {h.motivo_egreso}</p>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm">Sin períodos registrados.</p>
            )}
        </section>
    );
}