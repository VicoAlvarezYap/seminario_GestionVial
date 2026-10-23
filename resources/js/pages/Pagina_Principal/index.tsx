import { Head, router } from '@inertiajs/react';
import CalendarioMesEventos from '@/components/calendario-mes-eventos';
import type { DatosMes } from '@/components/calendario-mes-eventos';
import CalendarioSemanaTurnos from '@/components/calendario-semana-turnos';
import type { DatosSemana } from '@/components/calendario-semana-turnos';
import Carrusel from '@/components/carrusel';
import type { AgenteOpcion } from '@/components/form-turno';
import NavbarAgente from '@/components/navbar-agente';

type Props = {
    puedeEditar: boolean; // true solo para el Administrador
    agentes: AgenteOpcion[]; // lista para el selector de "asignar turno"
    semana: DatosSemana;
    mes: DatosMes;
};

export default function PaginaAgente({
    puedeEditar,
    agentes,
    semana,
    mes,
}: Props) {
    const navegar = (cambios: { semana?: string; mes?: string }) => {
    router.get( //con la ultima modificacion el usuario puede moverse entre las semanas y los meses
        '/pagina_principal', 
        { semana: semana.fecha, mes: mes.fecha, ...cambios },
        {
            only: ['semana', 'mes'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        },
    );
};

    return (
        <>
            <Head title="Página principal" />
            <NavbarAgente />

            <main className="p-4">
                <Carrusel
                    slides={[
                        {
                            titulo: puedeEditar
                                ? 'Asignación de turnos de la semana'
                                : 'Mis turnos de la semana',
                            contenido: (
                                <CalendarioSemanaTurnos
                                    {...semana}
                                    puedeEditar={puedeEditar}
                                    agentes={agentes}
                                    onCambiar={(f) => navegar({ semana: f })}
                                />
                            ),
                        },
                        {
                            titulo: 'Eventos del Mes',
                            contenido: (
                                <CalendarioMesEventos
                                    {...mes}
                                    puedeEditar={puedeEditar}
                                    onCambiar={(f) => navegar({ mes: f })}
                                />
                            ),
                        },
                    ]}
                />
            </main>
        </>
    );
}
