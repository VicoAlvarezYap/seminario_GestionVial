import { Head, router, usePage } from '@inertiajs/react';
import CalendarioMesEventos from '@/components/calendario-mes-eventos';
import type { DatosMes } from '@/components/calendario-mes-eventos';
import CalendarioSemanaTurnos from '@/components/calendario-semana-turnos';
import type { DatosSemana } from '@/components/calendario-semana-turnos';
import Carrusel from '@/components/carrusel';
import type { AgenteOpcion } from '@/components/form-turno';
import NavbarAgente from '@/components/navbar-agente';
import type { LugarOpcion } from '@/components/selector-lugar';
import TarjetaBienvenida from '@/components/tarjeta-bienvenida';
type Props = {
    puedeEditar: boolean; // true solo para el Administrador
    agentes: AgenteOpcion[]; // lista para el selector de "asignar turno"
    lugares: LugarOpcion[]; // lista para el selector de lugar (turnos y eventos)
    semana: DatosSemana;
    mes: DatosMes;
};

export default function PaginaAgente({ puedeEditar, agentes, lugares, semana, mes }: Props) {
    // Cada calendario cambia solo su fecha y mantiene la del otro
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const navegarSemana = (desde: string, hasta: string) => {
        router.get(
            '/pagina_principal',
            { desde, hasta, ev_desde: mes.desde, ev_hasta: mes.hasta },
            { only: ['semana', 'mes'], preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const navegarEventos = (ev_desde: string, ev_hasta: string) => {
        router.get(
            '/pagina_principal',
            { desde: semana.desde, hasta: semana.hasta, ev_desde, ev_hasta },
            { only: ['semana', 'mes'], preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const iniciar = () => {
        console.log('Iniciar Jornada');
    };

    return (
        <>
            <Head title="Página principal" />
            <NavbarAgente />

            <main className="p-4">
                <div className="mb-4">
                    <TarjetaBienvenida nombre={auth.user.name} onIniciar={iniciar} />
                </div>
                <Carrusel
                    slides={[
                        {
                            titulo: puedeEditar ? 'Asignación de turnos de la semana' : 'Mis turnos de la semana',
                            contenido: (
                                <CalendarioSemanaTurnos {...semana}
                                    puedeEditar={puedeEditar}
                                    agentes={agentes}
                                    lugares={lugares}
                                    onCambiar={navegarSemana} />
                            ),
                        },
                        {
                            titulo: 'Eventos del mes',
                            contenido: (
                                <CalendarioMesEventos {...mes}
                                    puedeEditar={puedeEditar}
                                    lugares={lugares}
                                    onCambiar={navegarEventos} />
                            ),
                        },
                    ]}
                />
            </main>
        </>
    );
}
