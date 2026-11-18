import { router } from '@inertiajs/react';
import { useState } from 'react';

type TurnoRow = {
    id: number;
    fecha: string;
    turno: string;
    hora_inicio_prog: string | null;
    hora_fin_prog: string | null;
    agente: { id: number; nombre: string; apellido: string };
};

type Props = {
    turnos: TurnoRow[];
    filtros: { desde: string; hasta: string };
};

export default function Listado({ turnos, filtros }: Props) {
    const [desde, setDesde] = useState(filtros.desde);
    const [hasta, setHasta] = useState(filtros.hasta);

    const filtrar = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/turnos/listado', { desde, hasta }, { preserveState: true });
    };

    // Agrupar por fecha
    const porFecha = turnos.reduce<Record<string, TurnoRow[]>>((acc, t) => {
        (acc[t.fecha] ??= []).push(t);
        return acc;
    }, {});

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Turnos asignados</h1>

            <form onSubmit={filtrar} className="flex gap-3 items-end">
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm bg-background" />
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm bg-background" />
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">
                    Filtrar
                </button>
            </form>

            {Object.entries(porFecha).map(([fecha, items]) => (
                <div key={fecha} className="border rounded-lg p-4 bg-card space-y-2">
                    <h2 className="font-semibold">{fecha}</h2>
                    {items.map((t) => (
                        <div key={t.id} className="flex justify-between text-sm border-t pt-2">
                            <span>{t.agente.apellido}, {t.agente.nombre}</span>
                            <span className="text-muted-foreground capitalize">
                                {t.turno}
                                {t.hora_inicio_prog && ` (${t.hora_inicio_prog} - ${t.hora_fin_prog})`}
                            </span>
                        </div>
                    ))}
                </div>
            ))}

            {turnos.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay turnos en ese rango.</p>
            )}
        </div>
    );
}