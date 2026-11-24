import { Head, usePage } from '@inertiajs/react';
import TurnoActual from '@/components/turno-actual';
import type { Horarios, TurnoRow } from '@/components/turnos-compartidos';

type Props = {
    nombreUsuario: string;
    horariosConfig: Horarios;
    hoy: string;
    turnosHoy: TurnoRow[];
    esAdmin: boolean;
};

export default function PaginaAgente({ nombreUsuario, hoy, horariosConfig, turnosHoy, esAdmin }: Props) {
    return (
        <>
            <Head title="Página Principal" />

            <main className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="p-6 bg-card border rounded-lg shadow-sm space-y-2">
                    <h1 className="text-2xl font-bold">¡Hola, {nombreUsuario}! 👋</h1>
                    <p className="text-sm text-muted-foreground">
                        Bienvenido al sistema de gestión vial. Esta es tu página principal.
                    </p>
                </div>
                <TurnoActual
                    hoy={hoy}
                    turnos={turnosHoy}
                    horarios={horariosConfig}
                    hrefDetalle={esAdmin ? (t) => `/admin/turnos/${t.id}/detalle` : undefined}
                    hrefAsignar={esAdmin ? '/admin/turnos' : undefined}
                />
            </main>
        </>
    );
}
