import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

const RANGOS = [
    { valor: 'inspector', etiqueta: 'Inspector' },
    { valor: 'instructor_examinador', etiqueta: 'Instructor / examinador' },
    { valor: 'director', etiqueta: 'Director/a (jefe)' },
];

export default function FormAgente({ onCerrar }: { onCerrar: () => void }) {
    const form = useForm({
        nombre: '',
        apellido: '',
        numero_documento: '',
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
        <ModalSimple titulo="Nuevo agente" onCerrar={onCerrar}>
            <form onSubmit={enviar} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Nombre" error={errors.nombre}>
                        <input className={CLASE_CAMPO} value={data.nombre} onChange={(e) => form.setData('nombre', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Apellido" error={errors.apellido}>
                        <input className={CLASE_CAMPO} value={data.apellido} onChange={(e) => form.setData('apellido', e.target.value)} />
                    </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="DNI" error={errors.numero_documento}>
                        <input className={CLASE_CAMPO} value={data.numero_documento} onChange={(e) => form.setData('numero_documento', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Rango" error={errors.rango}>
                        <select className={CLASE_CAMPO} value={data.rango} onChange={(e) => form.setData('rango', e.target.value)}>
                            {RANGOS.map((r) => (
                                <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
                            ))}
                        </select>
                    </Campo>
                </div>

                <Campo etiqueta="Celular (opcional)" error={errors.celular}>
                    <input className={CLASE_CAMPO} value={data.celular} onChange={(e) => form.setData('celular', e.target.value)} />
                </Campo>

                <Campo etiqueta="Email (también es su usuario de acceso)" error={errors.email}>
                    <input type="email" className={CLASE_CAMPO} value={data.email} onChange={(e) => form.setData('email', e.target.value)} />
                </Campo>

                <Campo etiqueta="Contraseña inicial (mínimo 8)" error={errors.password}>
                    <input type="password" className={CLASE_CAMPO} value={data.password} onChange={(e) => form.setData('password', e.target.value)} />
                </Campo>

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
                    <Button type="submit" disabled={form.processing}>Crear agente</Button>
                </div>
            </form>
        </ModalSimple>
    );
}