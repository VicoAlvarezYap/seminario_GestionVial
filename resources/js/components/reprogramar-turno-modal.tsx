import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type TurnoParaReprogramar = { id: number; fecha: string; turno: string };

const NOMBRE_TURNO: Record<string, string> = {
    manana: 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    especial: 'Especial',
};

const fechaLarga = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

export default function ReprogramarTurnoModal({
    turno,
    onClose,
}: {
    turno: TurnoParaReprogramar | null;
    onClose: () => void;
}) {
    const form = useForm({
        turno_trabajo_id: 0,
        tipo: 'cambio_horario' as 'cambio_horario' | 'tomar_dia',
        nuevo_turno: '',
        nueva_hora_inicio: '',
        nueva_hora_fin: '',
        motivo: '',
    });

    // Cada vez que se abre para otro turno, el formulario arranca limpio
    useEffect(() => {
        if (turno) {
            form.setData({
                turno_trabajo_id: turno.id,
                tipo: 'cambio_horario',
                nuevo_turno: '',
                nueva_hora_inicio: '',
                nueva_hora_fin: '',
                motivo: '',
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turno?.id]);

    // Escape para cerrar y sin scroll de fondo mientras está abierto
    useEffect(() => {
        if (!turno) return;
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        const previo = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('keydown', esc);
            document.body.style.overflow = previo;
        };
    }, [turno, onClose]);

    if (!turno) return null;

    const opciones = Object.keys(NOMBRE_TURNO).filter((k) => k !== turno.turno || k === 'especial');
    const esCambio = form.data.tipo === 'cambio_horario';
    const esEspecial = esCambio && form.data.nuevo_turno === 'especial';

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            nuevo_turno: d.tipo === 'cambio_horario' ? d.nuevo_turno : null,
            nueva_hora_inicio: d.nuevo_turno === 'especial' && d.tipo === 'cambio_horario' ? d.nueva_hora_inicio : null,
            nueva_hora_fin: d.nuevo_turno === 'especial' && d.tipo === 'cambio_horario' ? d.nueva_hora_fin : null,
        }));
        form.post('/reprogramaciones', { preserveScroll: true, onSuccess: onClose });
    };

    const input = 'w-full rounded-lg border bg-background px-3 py-2 text-sm';
    const error = (msg?: string) => (msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <form
                onSubmit={enviar}
                className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border bg-card shadow-lg"
            >
                <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
                    <div>
                        <h3 className="font-semibold">Reprogramar turno</h3>
                        <p className="text-sm capitalize text-muted-foreground">
                            {fechaLarga(turno.fecha)} · {NOMBRE_TURNO[turno.turno] ?? turno.turno}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 hover:bg-accent">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto px-5 py-4">
                    {/* Qué quiere pedir */}
                    <fieldset className="grid grid-cols-2 gap-2">
                        <legend className="sr-only">Tipo de solicitud</legend>
                        {(
                            [
                                ['cambio_horario', 'Cambiar horario'],
                                ['tomar_dia', 'Tomar el día'],
                            ] as const
                        ).map(([valor, texto]) => (
                            <label
                                key={valor}
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                                    form.data.tipo === valor ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="tipo"
                                    value={valor}
                                    checked={form.data.tipo === valor}
                                    onChange={() => form.setData('tipo', valor)}
                                    className="sr-only"
                                />
                                {texto}
                            </label>
                        ))}
                    </fieldset>

                    {esCambio && (
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="nuevo-turno" className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Nuevo turno
                                </label>
                                <select
                                    id="nuevo-turno"
                                    value={form.data.nuevo_turno}
                                    onChange={(e) => form.setData('nuevo_turno', e.target.value)}
                                    className={input}
                                >
                                    <option value="">Elegí un turno…</option>
                                    {opciones.map((k) => (
                                        <option key={k} value={k}>
                                            {NOMBRE_TURNO[k]}
                                        </option>
                                    ))}
                                </select>
                                {error(form.errors.nuevo_turno)}
                            </div>

                            {esEspecial && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="h-ini" className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Desde
                                        </label>
                                        <input
                                            id="h-ini"
                                            type="time"
                                            value={form.data.nueva_hora_inicio}
                                            onChange={(e) => form.setData('nueva_hora_inicio', e.target.value)}
                                            className={input}
                                        />
                                        {error(form.errors.nueva_hora_inicio)}
                                    </div>
                                    <div>
                                        <label htmlFor="h-fin" className="mb-1 block text-xs font-medium text-muted-foreground">
                                            Hasta
                                        </label>
                                        <input
                                            id="h-fin"
                                            type="time"
                                            value={form.data.nueva_hora_fin}
                                            onChange={(e) => form.setData('nueva_hora_fin', e.target.value)}
                                            className={input}
                                        />
                                        {error(form.errors.nueva_hora_fin)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!esCambio && (
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                            Si te lo aprueban, no vas a tener turno ese día.
                        </p>
                    )}

                    <div>
                        <label htmlFor="motivo" className="mb-1 block text-xs font-medium text-muted-foreground">
                            Motivo
                        </label>
                        <textarea
                            id="motivo"
                            rows={3}
                            maxLength={500}
                            value={form.data.motivo}
                            onChange={(e) => form.setData('motivo', e.target.value)}
                            className={input}
                            placeholder="Contanos por qué lo pedís"
                        />
                        {error(form.errors.motivo)}
                    </div>

                    {error(form.errors.turno_trabajo_id)}

                    <p className="text-xs text-muted-foreground">
                        La solicitud queda pendiente hasta que un administrador la apruebe.
                    </p>
                </div>

                <div className="flex justify-end gap-2 border-t px-5 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                        {form.processing ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                </div>
            </form>
        </div>,
        document.body,
    );
}