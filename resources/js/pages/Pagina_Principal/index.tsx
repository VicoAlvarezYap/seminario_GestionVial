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
import type { MiTurno } from '@/components/tarjeta-bienvenida';

type Props = {
    puedeEditar: boolean;
    agentes: AgenteOpcion[];
    lugares: LugarOpcion[];
    titulosSugeridos: string[];     // sugerencias para el título de la tarea (solo admin)
    turnosDisponibles: string[];    // ['manana', 'tarde', 'noche', 'especial']
    miTurno: MiTurno | null;
    semana: DatosSemana;
    mes: DatosMes;
};

export default function PaginaAgente({
    puedeEditar,
    agentes,
    lugares,
    titulosSugeridos,
    turnosDisponibles,
    miTurno,
    semana,
    mes,
}: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    // Cada calendario cambia solo su rango y mantiene el del otro
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

    return (
        <>
            <Head title="Página principal" />
            <NavbarAgente />

            <main className="p-4">
                <div className="mb-4">
                    <TarjetaBienvenida nombre={auth.user.name} turno={miTurno} />
                </div>
                <Carrusel
                    slides={[
                        {
                            titulo: puedeEditar ? 'Asignación de turnos de la semana' : 'Mis turnos de la semana',
                            contenido: (
                                <CalendarioSemanaTurnos
                                    {...semana}
                                    puedeEditar={puedeEditar}
                                    agentes={agentes}
                                    lugares={lugares}
                                    turnosDisponibles={turnosDisponibles}
                                    titulosSugeridos={titulosSugeridos}
                                    eventos={mes.eventos}
                                    onCambiar={navegarSemana}
                                />
                            ),
                        },
                        {
                            titulo: 'Eventos del mes',
                            contenido: (
                                <CalendarioMesEventos
                                    {...mes}
                                    puedeEditar={puedeEditar}
                                    lugares={lugares}
                                    onCambiar={navegarEventos}
                                />
                            ),
                        },
                    ]}
                />
            </main>
        </>
    );
}