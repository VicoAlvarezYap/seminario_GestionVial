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

const claseCampoRedondeado = `${CLASE_CAMPO} rounded-xl border border-zinc-500 transition-colors focus:border-zinc-800 focus:outline-none dark:border-zinc-500 dark:focus:border-zinc-300`;

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
            <form onSubmit={enviar} className="flex flex-col gap-3.5">
                <Campo etiqueta="Nombre y apellido" error={errors.nombre}>
                    <input
                        className={claseCampoRedondeado}
                        value={data.nombre}
                        onChange={(e) => form.setData('nombre', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Celular" error={errors.celular}>
                    <input
                        type="tel"
                        className={claseCampoRedondeado}
                        value={data.celular}
                        onChange={(e) => form.setData('celular', e.target.value)}
                    />
                </Campo>

                <Campo etiqueta="Relación" error={errors.relacion}>
                    <input
                        className={claseCampoRedondeado}
                        placeholder="Ej: madre, esposo, hermana"
                        value={data.relacion}
                        onChange={(e) => form.setData('relacion', e.target.value)}
                    />
                </Campo>

                <div className="mt-3 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCerrar}
                        className="rounded-full border-zinc-500 px-4 hover:border-zinc-700 hover:bg-zinc-100 dark:border-zinc-500 dark:hover:border-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-full border border-primary/30 px-5 shadow-sm transition-all hover:opacity-95"
                    >
                        {contacto ? 'Guardar cambios' : 'Agregar'}
                    </Button>
                </div>
            </form>
        </ModalSimple>
    );
}