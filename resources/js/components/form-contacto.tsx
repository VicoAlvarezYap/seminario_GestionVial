import { useForm } from '@inertiajs/react';
import type { SyntheticEvent } from 'react';
import ModalSimple, { CLASE_CAMPO, Campo } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

export type ContactoEmergencia = {
    id: number;
    nombre: string;
    celular: string;
    relacion: string | null;
};

type Props = {
    contacto: ContactoEmergencia | null; // null = crear
    onCerrar: () => void;
};

export default function FormContacto({ contacto, onCerrar }: Props) {
    const form = useForm({
        nombre: contacto?.nombre ?? '',
        celular: contacto?.celular ?? '',
        relacion: contacto?.relacion ?? '',
    });
    const { data, errors } = form;

    const enviar = (e: SyntheticEvent) => {
        e.preventDefault();

        const opciones = { preserveScroll: true, onSuccess: () => onCerrar() };

        if (contacto) {
            form.put(`/mi-perfil/contactos/${contacto.id}`, opciones);
        } else {
            form.post('/mi-perfil/contactos', opciones);
        }
    };

    return (
        <ModalSimple titulo={contacto ? 'Editar contacto' : 'Nuevo contacto de emergencia'} onCerrar={onCerrar}>
            <form onSubmit={enviar} className="flex flex-col gap-3">
                <Campo etiqueta="Nombre y apellido" error={errors.nombre}>
                    <input className={CLASE_CAMPO} value={data.nombre} onChange={(e) => form.setData('nombre', e.target.value)} />
                </Campo>

                <Campo etiqueta="Celular" error={errors.celular}>
                    <input
                        type="tel"
                        className={CLASE_CAMPO}
                        value={data.celular}
                        onChange={(e) => form.setData('celular', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Relación" error={errors.relacion}>
                    <input
                        className={CLASE_CAMPO}
                        placeholder="Ej: madre, esposo, hermana"
                        value={data.relacion}
                        onChange={(e) => form.setData('relacion', e.target.value)}
                    />
                </Campo>

                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button>
                    <Button type="submit" disabled={form.processing}>{contacto ? 'Guardar cambios' : 'Agregar'}</Button>
                </div>
            </form>
        </ModalSimple>
    );
}