import { Head, Link } from '@inertiajs/react';
import MapaEvento from '@/components/mapa-evento';

type Punto = { orden: number; latitud: string; longitud: string; descripcion_referencia: string | null };

type Props = {
    evento: {
        id: number;
        titulo: string;
        descripcion: string | null;
        fecha: string;
        hora_inicio: string;
        hora_fin: string | null;
        lugar: string | null;
        direccion: string | null;
        tipo_recorrido: string;
        estado: string;
        agentes: string[];
        solicitante_ente: string | null;
        solicitante_nombre: string | null;
        solicitante_celular: string | null;
        latitud_inicio: string | null;
        longitud_inicio: string | null;
        puntos: Punto[];
    };
    gestiona: boolean;
};

function Dato({ label, valor }: { label: string; valor: string | null | undefined }) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm">{valor || '-'}</p>
        </div>
    );
}

export default function EventoShow({ evento, gestiona }: Props) {
    const movil = evento.tipo_recorrido === 'movil_itinerante';

    return (
        <>
            <Head title={evento.titulo} />

            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/eventos" className="text-sm text-primary hover:underline">
                        ← Volver a eventos
                    </Link>
                    {gestiona && (
                        <Link
                            href={`/admin/eventos-operativos/${evento.id}/editar`}
                            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                        >
                            Editar
                        </Link>
                    )}
                </div>

                <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold">{evento.titulo}</h1>
                        <p className="text-sm text-muted-foreground">
                            {evento.fecha} · {evento.hora_inicio}
                            {evento.hora_fin ? ` a ${evento.hora_fin}` : ''} · Estado: {evento.estado}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Dato label="Lugar" valor={evento.lugar} />
                        <Dato label="Dirección" valor={evento.direccion} />
                        <Dato label="Tipo de recorrido" valor={movil ? 'Móvil / itinerante' : 'Estático'} />
                        <Dato label="Agentes asignados" valor={evento.agentes.join('; ')} />
                        <Dato label="Solicitante (ente)" valor={evento.solicitante_ente} />
                        <Dato label="Solicitante (nombre)" valor={evento.solicitante_nombre} />
                        <Dato label="Celular" valor={evento.solicitante_celular} />
                        {!movil && (
                            <Dato
                                label="Coordenadas"
                                valor={
                                    evento.latitud_inicio && evento.longitud_inicio
                                        ? `${evento.latitud_inicio}, ${evento.longitud_inicio}`
                                        : null
                                }
                            />
                        )}
                    </div>

                    {evento.descripcion && <Dato label="Descripción" valor={evento.descripcion} />}
                    {!movil && evento.latitud_inicio && evento.longitud_inicio && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold">Ubicación</p>
                            <MapaEvento
                                puntos={[
                                    {
                                        latitud: evento.latitud_inicio,
                                        longitud: evento.longitud_inicio,
                                        etiqueta: evento.lugar ?? evento.direccion,
                                    },
                                ]}
                            />
                            <a
                                href={`https://www.google.com/maps?q=${evento.latitud_inicio},${evento.longitud_inicio}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                            >
                                Abrir en Google Maps
                            </a>
                        </div>
                    )}
                    {movil && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold">Recorrido</p>
                            {evento.puntos.length > 0 && (
                                <MapaEvento
                                    recorrido
                                    puntos={evento.puntos.map((p) => ({
                                        latitud: p.latitud,
                                        longitud: p.longitud,
                                        etiqueta: `Punto ${p.orden}${p.descripcion_referencia ? ` · ${p.descripcion_referencia}` : ''}`,
                                    }))}
                                />
                            )}
                            {evento.puntos.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay puntos cargados.</p>
                            ) : (
                                <ol className="space-y-2 text-sm">
                                    {evento.puntos.map((p) => (
                                        <li key={p.orden} className="rounded-lg border p-3">
                                            <span className="font-medium">Punto {p.orden}</span>
                                            {p.descripcion_referencia && <span> · {p.descripcion_referencia}</span>}
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {p.latitud}, {p.longitud}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}