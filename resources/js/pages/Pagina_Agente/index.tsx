import { Head, router } from '@inertiajs/react';
import CalendarioMesEventos, { DatosMes } from '@/components/calendario-mes-eventos';
import CalendarioSemanaTurnos, { DatosSemana } from '@/components/calendario-semana-turnos';
import Carrusel from '@/components/carrusel';
import NavbarAgente from '@/components/navbar-agente';

type Props = {
    semana?: DatosSemana;
    mes?: DatosMes;
};

export default function PaginaAgente({ semana, mes }: Props) {
    // Valores de respaldo seguros en caso de renderizado inicial vacío
    const fechaActualStr = new Date().toISOString().split('T')[0];
    const fechaSemanaActual = semana?.fecha ?? fechaActualStr;
    const fechaMesActual = mes?.fecha ?? fechaActualStr;

    // Función de navegación que recarga exclusivamente las props de semana y mes mediante Inertia
    const navegar = (cambios: { semana?: string; mes?: string }) => {
        router.get(
            '/pagina-agente',
            { 
                semana: fechaSemanaActual, 
                mes: fechaMesActual, 
                ...cambios 
            },
            { 
                only: ['semana', 'mes'], 
                preserveState: true, 
                preserveScroll: true, 
                replace: true 
            },
        );
    };

    return (
        <>
            <Head title="Página del agente" />
            <NavbarAgente />

            <main className="p-4 max-w-7xl mx-auto">
                <Carrusel
                    slides={[
                        {
                            titulo: 'Mis turnos de la semana',
                            contenido: (
                                <CalendarioSemanaTurnos 
                                    {...(semana || { fecha: fechaSemanaActual, inicio: '', fin: '', turnos: [] })} 
                                    onCambiar={(f) => navegar({ semana: f })} 
                                />
                            ),
                        },
                        {
                            titulo: 'Eventos operativos del mes',
                            contenido: (
                                <CalendarioMesEventos 
                                    {...(mes || { fecha: fechaMesActual, inicio: '', fin: '', eventos: [] })} 
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