import {
    AlertTriangle,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    FileText,
    LayoutGrid,
    Settings,
    UserRound,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Accion = {
    titulo: string;
    href: string;
    icono: LucideIcon;
    modo: 'agente' | 'admin' | 'ambos';
    // Solo aparece si el usuario tiene legajo (trabajo personal)
    requiereLegajo?: boolean;
};

export const ACCIONES: Accion[] = [
    { titulo: 'Inicio', href: '/pagina_principal', icono: LayoutGrid, modo: 'ambos' },
    { titulo: 'Mis reportes', href: '/reportes', icono: ClipboardCheck, modo: 'agente', requiereLegajo: true },
    { titulo: 'Intervenciones', href: '/intervenciones', icono: AlertTriangle, modo: 'agente', requiereLegajo: true },
    { titulo: 'Infracciones', href: '/relevos', icono: ClipboardList, modo: 'agente', requiereLegajo: true },
    { titulo: 'Licencias', href: '/licencias', icono: FileText, modo: 'agente', requiereLegajo: true },
    { titulo: 'Historial de turnos', href: '/mi-historial-turnos', icono: CalendarDays, modo: 'agente', requiereLegajo: true },
    { titulo: 'Eventos', href: '/eventos', icono: CalendarDays, modo: 'ambos' },
    { titulo: 'Agentes', href: '/admin/perfiles', icono: Users, modo: 'admin' },
    { titulo: 'Asignar Turnos', href: '/admin/turnos', icono: CalendarDays, modo: 'admin' },
    { titulo: 'Asignar tarea', href: '/admin/turnos/tareas', icono: ClipboardList, modo: 'admin' },
    { titulo: 'Ver turnos', href: '/admin/turnos/listado', icono: CalendarDays, modo: 'admin' },
    { titulo: 'Historial de turnos (admin)', href: '/admin/turnos/historial', icono: CalendarDays, modo: 'admin' },
    { titulo: 'Reportes de turno', href: '/admin/reportes', icono: ClipboardCheck, modo: 'admin' },
    { titulo: 'Gestión de licencias', href: '/admin/licencias', icono: FileText, modo: 'admin' },
    { titulo: 'Gestión de infracciones', href: '/admin/relevos', icono: ClipboardList, modo: 'admin' },
    { titulo: 'Gestión de intervenciones', href: '/admin/intervenciones', icono: AlertTriangle, modo: 'admin' },
    { titulo: 'Mi perfil', href: '/mi-perfil', icono: UserRound, modo: 'ambos' },
    { titulo: 'Configuración', href: '/settings/profile', icono: Settings, modo: 'ambos' },
    {titulo: 'Dashboard', href: '/dashboard', icono:Settings, modo: 'admin'}
];

/** Acciones que puede ver un usuario en un modo dado. Es la única regla, la usan el menú y el buscador. */
export function accionesVisibles(
    modo: 'agente' | 'admin',
    { tieneAgente, esGestor }: { tieneAgente: boolean; esGestor: boolean },
): Accion[] {
    return ACCIONES.filter((a) => {
        if (a.modo !== 'ambos' && a.modo !== modo) return false;

        if (a.requiereLegajo && !tieneAgente) {
            // Sin legajo, un admin o supervisor solo ve "Mis reportes" (de todos, en modo agente)
            const verReportes = esGestor && a.href === '/reportes';
            if (!verReportes) return false;
        }

        return true;
    });
}