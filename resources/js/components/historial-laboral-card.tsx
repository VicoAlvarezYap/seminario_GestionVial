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

const campoClase =
    'bg-background w-full rounded-xl border border-slate-400/90 px-3 py-2 text-sm shadow-2xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

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

    const botonCabeceraClase = abierto
        ? 'rounded-xl border border-slate-400/90 bg-background px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-accent'
        : activo
          ? 'rounded-xl border border-red-700 bg-red-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-red-950/20 transition-all hover:-translate-y-0.5 hover:border-red-800 hover:bg-red-700 hover:shadow-md'
          : 'rounded-xl border border-primary/90 bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-md';

    return (
        <section className="space-y-4 rounded-2xl border border-slate-400/90 bg-white p-6 shadow-md shadow-slate-950/5 transition-colors hover:border-slate-500 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Historial laboral</h3>
                    <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            activo
                                ? 'border-green-300 bg-green-100 text-green-800'
                                : 'border-red-300 bg-red-100 text-red-800'
                        }`}
                    >
                        {activo ? 'Activo' : 'De baja'}
                    </span>
                </div>

                <button type="button" onClick={() => setAbierto((v) => !v)} className={botonCabeceraClase}>
                    {abierto ? 'Cancelar' : activo ? 'Dar de baja' : 'Reingresar'}
                </button>
            </div>

            {abierto && activo && (
                <form onSubmit={enviarBaja} className="space-y-3 rounded-xl border border-slate-400/90 bg-muted/20 p-4 shadow-inner">
                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">Fecha de baja</label>
                        <input
                            type="date"
                            value={baja.data.fecha_baja}
                            onChange={(e) => baja.setData('fecha_baja', e.target.value)}
                            className={campoClase}
                        />
                        {baja.errors.fecha_baja && <p className="mt-1 text-xs text-red-600">{baja.errors.fecha_baja}</p>}
                    </div>

                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">Motivo de la baja</label>
                        <textarea
                            value={baja.data.motivo_egreso}
                            onChange={(e) => baja.setData('motivo_egreso', e.target.value)}
                            className={campoClase}
                            rows={3}
                        />
                        {baja.errors.motivo_egreso && (
                            <p className="mt-1 text-xs text-red-600">{baja.errors.motivo_egreso}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={baja.processing}
                        className="rounded-xl border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/20 transition-all hover:-translate-y-0.5 hover:border-red-800 hover:bg-red-700 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
                    >
                        Confirmar baja
                    </button>
                </form>
            )}

            {abierto && !activo && (
                <form onSubmit={enviarAlta} className="space-y-3 rounded-xl border border-slate-400/90 bg-muted/20 p-4 shadow-inner">
                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">Fecha de alta</label>
                        <input
                            type="date"
                            value={alta.data.fecha_alta}
                            onChange={(e) => alta.setData('fecha_alta', e.target.value)}
                            className={campoClase}
                        />
                        {alta.errors.fecha_alta && <p className="mt-1 text-xs text-red-600">{alta.errors.fecha_alta}</p>}
                    </div>

                    <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                            Motivo de ingreso (opcional)
                        </label>
                        <input
                            value={alta.data.motivo_ingreso}
                            onChange={(e) => alta.setData('motivo_ingreso', e.target.value)}
                            className={campoClase}
                        />
                        {alta.errors.motivo_ingreso && (
                            <p className="mt-1 text-xs text-red-600">{alta.errors.motivo_ingreso}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={alta.processing}
                        className="bg-primary text-primary-foreground border-primary/90 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
                    >
                        Confirmar alta
                    </button>
                </form>
            )}

            {historial.length > 0 ? (
                <ul className="divide-y divide-slate-300/80 text-sm">
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
                <p className="text-muted-foreground rounded-xl border border-dashed border-slate-400/80 bg-muted/20 p-4 text-center text-sm">
                    Sin períodos registrados.
                </p>
            )}
        </section>
    );
}