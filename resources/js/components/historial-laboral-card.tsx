import { useForm } from '@inertiajs/react';
import { useState } from 'react';

type Periodo = {
    id: number;
    fecha_alta: string;
    fecha_baja: string | null;
    motivo_ingreso: string | null;
    motivo_egreso: string | null;
};

export default function HistorialLaboralCard({
    agenteId, historial, activo,
}: { agenteId: number; historial: Periodo[]; activo: boolean }) {
    const [abierto, setAbierto] = useState(false);
    const hoy = new Date().toLocaleDateString('en-CA');

    const baja = useForm({ fecha_baja: hoy, motivo_egreso: '' });
    const alta = useForm({ fecha_alta: hoy, motivo_ingreso: '' });

    const enviarBaja = (e: React.FormEvent) => {
        e.preventDefault();
        baja.post(`/agentes/${agenteId}/baja`, {
            preserveScroll: true,
            onSuccess: () => { setAbierto(false); baja.reset(); },
        });
    };

    const enviarAlta = (e: React.FormEvent) => {
        e.preventDefault();
        alta.post(`/agentes/${agenteId}/alta`, {
            preserveScroll: true,
            onSuccess: () => { setAbierto(false); alta.reset(); },
        });
    };

    return (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Historial laboral
                </h2>
                <button
                    type="button"
                    onClick={() => setAbierto((v) => !v)}
                    className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-accent"
                >
                    {activo ? 'Dar de baja' : 'Reingresar'}
                </button>
            </div>

            {abierto && activo && (
                <form onSubmit={enviarBaja} className="space-y-3 rounded-lg border p-3">
                    <input
                        type="date"
                        value={baja.data.fecha_baja}
                        onChange={(e) => baja.setData('fecha_baja', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <textarea
                        placeholder="Motivo de la baja"
                        value={baja.data.motivo_egreso}
                        onChange={(e) => baja.setData('motivo_egreso', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        rows={3}
                    />
                    {(baja.errors.fecha_baja || baja.errors.motivo_egreso) && (
                        <p className="text-xs text-red-600">{baja.errors.fecha_baja ?? baja.errors.motivo_egreso}</p>
                    )}
                    <button
                        type="submit"
                        disabled={baja.processing}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                        Confirmar baja
                    </button>
                </form>
            )}

            {abierto && !activo && (
                <form onSubmit={enviarAlta} className="space-y-3 rounded-lg border p-3">
                    <input
                        type="date"
                        value={alta.data.fecha_alta}
                        onChange={(e) => alta.setData('fecha_alta', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                        placeholder="Motivo de ingreso (opcional)"
                        value={alta.data.motivo_ingreso}
                        onChange={(e) => alta.setData('motivo_ingreso', e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={alta.processing}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                        Confirmar alta
                    </button>
                </form>
            )}

            <ul className="divide-y text-sm">
                {historial.map((h) => (
                    <li key={h.id} className="space-y-0.5 py-2.5">
                        <p className="font-medium">
                            {h.fecha_alta} → {h.fecha_baja ?? 'Actualidad'}
                        </p>
                        {h.motivo_ingreso && <p className="text-xs text-muted-foreground">Ingreso: {h.motivo_ingreso}</p>}
                        {h.motivo_egreso && <p className="text-xs text-muted-foreground">Egreso: {h.motivo_egreso}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}