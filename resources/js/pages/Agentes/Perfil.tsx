import { Head } from '@inertiajs/react';
import NavbarAgente from '@/components/navbar-agente';

type ContactoEmergencia = {
    id: number;
    nombre: string;
    celular: string;
    relacion: string;
};

type Agente = {
    id: number;
    nombre: string;
    apellido: string;
    numero_documento: string;
    celular: string;
    correo: string;
    contactos_emergencia: ContactoEmergencia[];
};

type Props = {
    agente: Agente;
};

export default function Perfil({ agente }: Props) {
    const iniciales = `${agente.nombre?.[0] ?? ''}${agente.apellido?.[0] ?? ''}`.toUpperCase();

    return (
        <>
            <Head title="Mi Perfil" />
            <NavbarAgente />

            <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
                <h1 className="text-2xl font-bold">Mi Perfil</h1>

                {/* Tarjeta de Datos Personales */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border-2 border-primary/20 shrink-0">
                            {iniciales}
                        </div>

                        <div className="flex-1 text-center sm:text-left w-full">
                            <h2 className="text-xl font-semibold">
                                {agente.nombre} {agente.apellido}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Agente operativo
                            </p>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t pt-4">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Documento (DNI)</span>
                                    <span className="font-medium">{agente.numero_documento || 'No especificado'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Correo electrónico</span>
                                    <span className="font-medium">{agente.correo || 'No especificado'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Celular</span>
                                    <span className="font-medium">{agente.celular || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Apartado de los Contactos de Emergencia */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Contactos de Emergencia</h3>

                    {agente.contactos_emergencia && agente.contactos_emergencia.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {agente.contactos_emergencia.map((contacto) => (
                                <div key={contacto.id} className="border rounded-lg p-4 text-sm space-y-1 bg-zinc-50 dark:bg-zinc-800/50">
                                    <div className="font-semibold text-base">{contacto.nombre}</div>
                                    <div><span className="text-muted-foreground">Relación:</span> {contacto.relacion}</div>
                                    <div><span className="text-muted-foreground">Celular:</span> {contacto.celular}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay contactos de emergencia registrados.</p>
                    )}
                </div>
            </main>
        </>
    );
}