import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { Campo } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

const RANGOS = [
    { valor: 'inspector', etiqueta: 'Inspector' },
    { valor: 'instructor_examinador', etiqueta: 'Instructor / examinador' },
];

const CAMPO_FUERTE =
    'w-full rounded-xl border-2 border-slate-500/90 bg-white px-3.5 py-2 text-sm font-medium text-[#111827] shadow-xs transition-all focus:border-[#0F2C85] focus:outline-none focus:ring-2 focus:ring-[#0F2C85]/25 dark:border-slate-500 dark:bg-neutral-900 dark:text-white';

export default function FormAgente({ onCerrar }: { onCerrar: () => void }) {
    const form = useForm({
        nombre: '',
        apellido: '',
        numero_documento: '',
        domicilio: '',
        rango: 'inspector',
        celular: '',
        email: '',
        password: '',
    });
    const { data, errors } = form;

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post('/admin/agentes', { preserveScroll: true, onSuccess: () => onCerrar() });
    };

    return (
        <div className="[&_[data-slot='dialog-content'],&_[role='dialog'],&>div>div]:rounded-3xl [&_[data-slot='dialog-content'],&_[role='dialog'],&>div>div]:border-2 [&_[data-slot='dialog-content'],&_[role='dialog'],&>div>div]:border-slate-500 [&_[data-slot='dialog-content'],&_[role='dialog'],&>div>div]:shadow-2xl">
            <ModalSimple titulo="Nuevo agente" onCerrar={onCerrar}>
                <form onSubmit={enviar} className="flex flex-col gap-3.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="Nombre" error={errors.nombre}>
                            <input
                                className={CAMPO_FUERTE}
                                value={data.nombre}
                                onChange={(e) => form.setData('nombre', e.target.value)}
                            />
                        </Campo>
                        <Campo etiqueta="Apellido" error={errors.apellido}>
                            <input
                                className={CAMPO_FUERTE}
                                value={data.apellido}
                                onChange={(e) => form.setData('apellido', e.target.value)}
                            />
                        </Campo>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="DNI" error={errors.numero_documento}>
                            <input
                                className={CAMPO_FUERTE}
                                value={data.numero_documento}
                                onChange={(e) => form.setData('numero_documento', e.target.value)}
                            />
                        </Campo>
                        <Campo etiqueta="Rango" error={errors.rango}>
                            <select
                                className={CAMPO_FUERTE}
                                value={data.rango}
                                onChange={(e) => form.setData('rango', e.target.value)}
                            >
                                {RANGOS.map((r) => (
                                    <option key={r.valor} value={r.valor}>
                                        {r.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    </div>

                    <Campo etiqueta="Celular" error={errors.celular}>
                        <input
                            className={CAMPO_FUERTE}
                            value={data.celular}
                            onChange={(e) => form.setData('celular', e.target.value)}
                        />
                    </Campo>

                    <Campo etiqueta="Domicilio" error={errors.domicilio}>
                        <input
                            className={CAMPO_FUERTE}
                            value={data.domicilio}
                            onChange={(e) => form.setData('domicilio', e.target.value)}
                        />
                    </Campo>

                    <Campo etiqueta="Email (también es su usuario de acceso)" error={errors.email}>
                        <input
                            type="email"
                            className={CAMPO_FUERTE}
                            value={data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                    </Campo>

                    <Campo etiqueta="Contraseña inicial (mínimo 8)" error={errors.password}>
                        <input
                            type="password"
                            className={CAMPO_FUERTE}
                            value={data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                        />
                    </Campo>

                    <div className="mt-2 flex justify-end gap-2.5 border-t-2 border-slate-300/90 pt-3.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCerrar}
                            className="rounded-xl border-2 border-slate-500 bg-white px-4 py-2 font-semibold text-[#111827] shadow-xs hover:border-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl border-2 border-[#0F2C85] bg-[#0F2C85] px-4 py-2 font-semibold text-white shadow-md shadow-[#0F2C85]/25 transition-all hover:-translate-y-0.5 hover:bg-[#0B2166] hover:shadow-lg"
                        >
                            Crear agente
                        </Button>
                    </div>
                </form>
            </ModalSimple>
        </div>
    );
}