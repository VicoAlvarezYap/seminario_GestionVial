import { Head } from '@inertiajs/react';
import NavbarAgente from '@/components/navbar-agente';
import TurnoActual from '@/components/turno-actual';
import type { Horarios, TurnoRow } from '@/components/turnos-compartidos';

type Props = {
    nombreUsuario: string;
    hoy: string;
    horariosConfig: Horarios;
    turnosHoy: TurnoRow[];
    esAdmin: boolean;
};

export default function PaginaAgente({ nombreUsuario, hoy, horariosConfig, turnosHoy, esAdmin }: Props) {
    return (
        <>
            <Head title="Página Principal" />

            <main className="mx-auto max-w-4xl space-y-6 p-6">
                <div className="bg-card space-y-2 rounded-lg border p-6 shadow-sm">
                    <h1 className="text-2xl font-bold">¡Hola, {nombreUsuario}! 👋</h1>
                    <p className="text-muted-foreground text-sm">
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
