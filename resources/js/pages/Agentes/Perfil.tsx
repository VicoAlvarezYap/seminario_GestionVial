import { Head, router } from '@inertiajs/react';
import { Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import FormContacto from '@/components/form-contacto';
import type { ContactoEmergencia } from '@/components/form-contacto';
import HistorialLaboralCard from '@/components/historial-laboral-card';
import type { Periodo } from '@/components/historial-laboral-card';

type Agente = {
    id: number;
    nombre: string;
    apellido: string;
    numero_documento: string;
    rango?: string | null;
    domicilio: string;
    celular: string;
    correo: string;
    contactos_emergencia: ContactoEmergencia[];
    historial: Periodo[];
    activo: boolean;
};

type Props = {
    agente: Agente;
    esPropio: boolean;
    puedeGestionar: boolean;
};

const MAXIMO_CONTACTOS = 2; // el mismo valor que en el controlador

const ETIQUETA_RANGO: Record<string, string> = {
    inspector: 'Inspector',
    instructor_examinador: 'Instructor / examinador',
    director: 'Director/a',
};

const cardPrincipal =
    'rounded-2xl border border-slate-400/90 bg-white p-6 shadow-md shadow-slate-950/5 transition-colors hover:border-slate-500 dark:bg-zinc-900';

export default function Perfil({ agente, esPropio, puedeGestionar }: Props) {
    const iniciales = `${agente.nombre?.[0] ?? ''}${agente.apellido?.[0] ?? ''}`.toUpperCase();
    const contactos = agente.contactos_emergencia ?? [];

    const [formulario, setFormulario] = useState<ContactoEmergencia | null | undefined>(undefined);

    const eliminar = (c: ContactoEmergencia) => {
        if (!window.confirm(`¿Eliminar el contacto de ${c.nombre}?`)) {
            return;
        }
        router.delete(`/mi-perfil/contactos/${c.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title={esPropio ? 'Mi Perfil' : `Perfil de ${agente.nombre} ${agente.apellido}`} />
            <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                <h1 className="text-2xl font-bold">{esPropio ? 'Mi Perfil' : 'Perfil del agente'}</h1>

                {/* Datos personales */}
                <div className={cardPrincipal}>
                    <div className="flex flex-col items-center gap-6 sm:flex-row">
                        <div className="bg-primary/10 text-primary border-primary/40 flex size-24 shrink-0 items-center justify-center rounded-full border-2 text-2xl font-bold shadow-xs">
                            {iniciales}
                        </div>

                        <div className="w-full flex-1 text-center sm:text-left">
                            <h2 className="text-xl font-semibold">
                                {agente.nombre} {agente.apellido}
                                <span
                                    className={`ml-2 rounded-full border px-2.5 py-0.5 align-middle text-xs font-medium ${
                                        agente.activo
                                            ? 'border-green-300 bg-green-100 text-green-800'
                                            : 'border-red-300 bg-red-100 text-red-800'
                                    }`}
                                >
                                    {agente.activo ? 'Activo' : 'De baja'}
                                </span>
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-sm">
                                {agente.rango ? (ETIQUETA_RANGO[agente.rango] ?? agente.rango) : 'Agente operativo'}
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-300/80 pt-4 text-sm sm:grid-cols-2">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Documento (DNI)</span>
                                    <span className="font-medium">{agente.numero_documento || 'No especificado'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Correo electrónico</span>
                                    <span className="font-medium">{agente.correo || 'No especificado'}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-muted-foreground block text-xs">Domicilio</span>
                                    <span className="font-medium">{agente.domicilio || 'No especificado'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Celular</span>
                                    <span className="font-medium">{agente.celular || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contactos de emergencia */}
                <div className={cardPrincipal}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-lg font-semibold">Contactos de emergencia</h3>
                            <p className="text-muted-foreground text-xs">
                                {contactos.length} de {MAXIMO_CONTACTOS}
                            </p>
                        </div>

                        {esPropio && (
                            <button
                                type="button"
                                onClick={() => setFormulario(null)}
                                disabled={contactos.length >= MAXIMO_CONTACTOS}
                                title={contactos.length >= MAXIMO_CONTACTOS ? 'Alcanzaste el máximo de contactos' : undefined}
                                className="bg-primary text-primary-foreground border-primary/90 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                <Plus className="size-4" />
                                Agregar contacto
                            </button>
                        )}
                    </div>

                    {contactos.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {contactos.map((c) => (
                                <div
                                    key={c.id}
                                    className="space-y-1.5 rounded-xl border border-slate-400/90 bg-zinc-50 p-4 text-sm shadow-xs transition-colors hover:border-slate-500 dark:bg-zinc-800/50"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-base font-semibold">{c.nombre}</div>
                                        <div className="flex shrink-0 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setFormulario(c)}
                                                aria-label={`Editar contacto de ${c.nombre}`}
                                                className="hover:bg-muted rounded-xl border border-slate-400/90 bg-background p-1.5 shadow-2xs transition-colors hover:border-slate-500"
                                            >
                                                <Pencil className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => eliminar(c)}
                                                aria-label={`Eliminar contacto de ${c.nombre}`}
                                                className="hover:bg-muted rounded-xl border border-slate-400/90 bg-background p-1.5 text-red-600 shadow-2xs transition-colors hover:border-red-400"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {c.relacion && (
                                        <div>
                                            <span className="text-muted-foreground">Relación:</span> {c.relacion}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="text-muted-foreground size-3.5" />
                                        <a href={`tel:${c.celular}`} className="hover:underline">
                                            {c.celular}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground rounded-xl border border-dashed border-slate-400/80 bg-muted/20 p-4 text-center text-sm">
                            {esPropio
                                ? 'No hay contactos de emergencia registrados. Agregá al menos uno para que podamos avisar si pasa algo.'
                                : 'Este agente no tiene contactos de emergencia registrados.'}
                        </p>
                    )}
                </div>

                {puedeGestionar && (
                    <div className="[&>div,&>section]:rounded-2xl [&>div,&>section]:border-slate-400/90 [&>div,&>section]:shadow-md [&>div,&>section]:shadow-slate-950/5">
                        <HistorialLaboralCard
                            agenteId={agente.id}
                            historial={agente.historial}
                            activo={agente.activo}
                        />
                    </div>
                )}
            </main>

            {esPropio && formulario !== undefined && (
                <FormContacto contacto={formulario} onCerrar={() => setFormulario(undefined)} />
            )}
        </>
    );
}