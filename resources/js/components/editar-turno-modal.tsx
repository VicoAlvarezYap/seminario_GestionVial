import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Horarios } from '@/components/turnos-compartidos';

export type TurnoEditable = {
    id: number;
    fecha: string; // YYYY-MM-DD
    turno: string;
    hora_inicio_prog: string | null;
    hora_fin_prog: string | null;
    agente: { id: number; nombre: string; apellido: string };
    tareas_count?: number;
};

type Agente = { id: number; nombre: string; apellido: string };

type Props = {
    turno: TurnoEditable | null; // null = modal cerrado
    agentes: Agente[];
    horariosConfig: Horarios;
    onClose: () => void;
};

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const recortar = (hora: string | null) => (hora ?? '').slice(0, 5);
const campoClase = 'w-full rounded-md border bg-background px-3 py-2 text-sm';

function Error({ mensaje }: { mensaje?: string }) {
    return mensaje ? <p className="text-sm text-red-600">{mensaje}</p> : null;
}

export default function EditarTurnoModal({ turno, agentes, horariosConfig, onClose }: Props) {
    const form = useForm({
        agente_id: 0,
        fecha: '',
        turno: 'manana',
        hora_inicio_prog: '',
        hora_fin_prog: '',
    });

    // Cada vez que se abre con otro turno, se cargan sus datos
    useEffect(() => {
        if (!turno) return;

        form.setData({
            agente_id: turno.agente.id,
            fecha: turno.fecha,
            turno: turno.turno,
            hora_inicio_prog: recortar(turno.hora_inicio_prog),
            hora_fin_prog: recortar(turno.hora_fin_prog),
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turno?.id]);

    const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
    const esEspecial = form.data.turno === 'especial';
    const horarioFijo = horariosConfig[form.data.turno];

    // Si cambia algo que condiciona las tareas (agente, día, turno u horario), se eliminan
    const cambioTareas =
        turno !== null &&
        (form.data.agente_id !== turno.agente.id ||
            form.data.fecha !== turno.fecha ||
            form.data.turno !== turno.turno ||
            (esEspecial &&
                (form.data.hora_inicio_prog !== recortar(turno.hora_inicio_prog) ||
                    form.data.hora_fin_prog !== recortar(turno.hora_fin_prog))));
    const tareasAfectadas = cambioTareas ? (turno?.tareas_count ?? 0) : 0;

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!turno) return;

        // Las horas solo viajan si el turno es especial; en los demás las pone el servidor
        form.transform((d) => {
            const base =
                d.turno === 'especial'
                    ? d
                    : { agente_id: d.agente_id, fecha: d.fecha, turno: d.turno };

            // El servidor exige esta confirmación si va a eliminar tareas
            return tareasAfectadas > 0 ? { ...base, confirmar_borrado_tareas: true } : base;
        });

        form.put(`/admin/turnos/${turno.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open={turno !== null} onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={guardar} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Editar turno</DialogTitle>
                        <DialogDescription>
                            Se puede modificar hasta una hora antes de que empiece.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="agente_id">Agente</Label>
                            <select
                                id="agente_id"
                                value={form.data.agente_id}
                                onChange={(e) => form.setData('agente_id', Number(e.target.value))}
                                className={campoClase}
                            >
                                {agentes.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.apellido}, {a.nombre}
                                    </option>
                                ))}
                            </select>
                            <Error mensaje={form.errors.agente_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input
                                id="fecha"
                                type="date"
                                min={hoy}
                                value={form.data.fecha}
                                onChange={(e) => form.setData('fecha', e.target.value)}
                            />
                            <Error mensaje={form.errors.fecha} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="turno">Turno</Label>
                            <select
                                id="turno"
                                value={form.data.turno}
                                onChange={(e) => form.setData('turno', e.target.value)}
                                className={campoClase}
                            >
                                {Object.entries(NOMBRE_TURNO).map(([valor, nombre]) => (
                                    <option key={valor} value={valor}>
                                        {nombre}
                                    </option>
                                ))}
                            </select>
                            {!esEspecial && horarioFijo && (
                                <p className="text-sm text-muted-foreground">
                                    Horario: {horarioFijo[0]} a {horarioFijo[1]}
                                </p>
                            )}
                            <Error mensaje={form.errors.turno} />
                        </div>

                        {esEspecial && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="hora_inicio_prog">Hora de inicio</Label>
                                    <Input
                                        id="hora_inicio_prog"
                                        type="time"
                                        value={form.data.hora_inicio_prog}
                                        onChange={(e) => form.setData('hora_inicio_prog', e.target.value)}
                                    />
                                    <Error mensaje={form.errors.hora_inicio_prog} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hora_fin_prog">Hora de fin</Label>
                                    <Input
                                        id="hora_fin_prog"
                                        type="time"
                                        value={form.data.hora_fin_prog}
                                        onChange={(e) => form.setData('hora_fin_prog', e.target.value)}
                                    />
                                    <Error mensaje={form.errors.hora_fin_prog} />
                                </div>
                            </div>
                        )}
                    </div>

                    {tareasAfectadas > 0 && (
                        <p className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200">
                            Al guardar se{' '}
                            {tareasAfectadas === 1
                                ? 'elimina la tarea asignada'
                                : `eliminan las ${tareasAfectadas} tareas asignadas`}{' '}
                            a este turno. Después podés asignar tareas nuevas.
                        </p>
                    )}
                    <Error mensaje={(form.errors as Record<string, string>).tareas} />

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Guardando...'
                                : tareasAfectadas > 0
                                  ? 'Guardar y eliminar tareas'
                                  : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}