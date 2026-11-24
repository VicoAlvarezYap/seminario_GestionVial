import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent } from 'react';
import SelectorMapa from '@/components/selector-mapa';
import SelectorRecorrido from '@/components/selector-recorrido';
import type { Coord } from '@/components/selector-recorrido';

type Punto = { latitud: string; longitud: string; descripcion_referencia: string };

type Evento = {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    lugar_nombre: string | null;
    direccion: string | null;
    tipo_recorrido: string;
    latitud_inicio: string | null;
    longitud_inicio: string | null;
    solicitante_ente: string | null;
    solicitante_nombre: string | null;
    solicitante_celular: string | null;
    estado: string;
    puntos: Punto[];
    ruta: Coord[];
    calles: string[];
};

type Datos = {
    titulo: string;
    descripcion: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    lugar_nombre: string;
    direccion: string;
    tipo_recorrido: string;
    latitud_inicio: string;
    longitud_inicio: string;
    solicitante_ente: string;
    solicitante_nombre: string;
    solicitante_celular: string;
    estado: string;
    puntos: Punto[];
    ruta: Coord[];
    calles: string[];
};

type Props = {
    evento: Evento | null;
    mapaCentro?: { lat: number; lng: number; zoom: number };
};

const ESTADOS = ['programado', 'en_curso', 'finalizado', 'cancelado', 'suspendido'];
const input = 'w-full rounded-lg border bg-background px-3 py-2 text-sm';

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
            <h2 className="text-sm font-semibold">{titulo}</h2>
            {children}
        </section>
    );
}

export default function EventoForm({ evento, mapaCentro }: Props) {
    const form = useForm<Datos>({
        titulo: evento?.titulo ?? '',
        descripcion: evento?.descripcion ?? '',
        fecha: evento?.fecha ?? '',
        hora_inicio: evento?.hora_inicio ?? '',
        hora_fin: evento?.hora_fin ?? '',
        lugar_nombre: evento?.lugar_nombre ?? '',
        direccion: evento?.direccion ?? '',
        tipo_recorrido: evento?.tipo_recorrido ?? 'estatico',
        latitud_inicio: evento?.latitud_inicio ?? '',
        longitud_inicio: evento?.longitud_inicio ?? '',
        solicitante_ente: evento?.solicitante_ente ?? '',
        solicitante_nombre: evento?.solicitante_nombre ?? '',
        solicitante_celular: evento?.solicitante_celular ?? '',
        estado: evento?.estado ?? 'programado',
        puntos: evento?.puntos ?? [],
        ruta: evento?.ruta ?? [],
        calles: evento?.calles ?? [],
    });

    const { data, errors, setData, processing } = form;
    const movil = data.tipo_recorrido === 'movil_itinerante';

    const set = (campo: keyof Datos, valor: string) => setData(campo, valor as never);

    const cambiarTipo = (valor: string) => {
        set('tipo_recorrido', valor);
        if (valor === 'movil_itinerante') {
            set('latitud_inicio', '');
            set('longitud_inicio', '');
        }
    };

    const agregarPunto = () =>
        setData('puntos', [...data.puntos, { latitud: '', longitud: '', descripcion_referencia: '' }]);

    const quitarPunto = (i: number) => setData('puntos', data.puntos.filter((_, j) => j !== i));

    const cambiarPunto = (i: number, campo: keyof Punto, valor: string) =>
        setData(
            'puntos',
            data.puntos.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)),
        );

    const enviar = (e: FormEvent) => {
        e.preventDefault();

        if (evento) {
            form.put(`/admin/eventos-operativos/${evento.id}`);
        } else {
            form.post('/admin/eventos-operativos');
        }
    };

    return (
        <>
            <Head title={evento ? 'Editar evento' : 'Crear evento'} />

            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/eventos" className="text-sm text-primary hover:underline">
                        ← Volver a eventos
                    </Link>
                    <h1 className="text-2xl font-bold">{evento ? 'Editar evento' : 'Crear evento'}</h1>
                </div>

                <form onSubmit={enviar} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                    <Seccion titulo="Tipo de evento">
                        <Campo label="Tipo de recorrido *" error={errors.tipo_recorrido}>
                            <select className={input} value={data.tipo_recorrido} onChange={(e) => cambiarTipo(e.target.value)}>
                                <option value="estatico">Estático (un solo lugar)</option>
                                <option value="movil_itinerante">Móvil / itinerante (recorrido con varios puntos)</option>
                            </select>
                        </Campo>
                    </Seccion>

                    <Seccion titulo="Datos del evento">
                        <Campo label="Título *" error={errors.titulo}>
                            <input className={input} value={data.titulo} onChange={(e) => set('titulo', e.target.value)} />
                        </Campo>

                        <Campo label="Descripción" error={errors.descripcion}>
                            <textarea rows={3} className={input} value={data.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
                        </Campo>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo label="Fecha *" error={errors.fecha}>
                                <input type="date" className={input} value={data.fecha} onChange={(e) => set('fecha', e.target.value)} />
                            </Campo>
                            <Campo label="Hora de inicio *" error={errors.hora_inicio}>
                                <input type="time" className={input} value={data.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} />
                            </Campo>
                            <Campo label="Hora de fin" error={errors.hora_fin}>
                                <input type="time" className={input} value={data.hora_fin} onChange={(e) => set('hora_fin', e.target.value)} />
                            </Campo>
                        </div>

                        <Campo label="Estado *" error={errors.estado}>
                            <select className={input} value={data.estado} onChange={(e) => set('estado', e.target.value)}>
                                {ESTADOS.map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    </Seccion>

                    <Seccion titulo="Ubicación">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo label="Lugar" error={errors.lugar_nombre}>
                                <input
                                    className={input}
                                    placeholder="Ej: Plaza principal"
                                    value={data.lugar_nombre}
                                    onChange={(e) => set('lugar_nombre', e.target.value)}
                                />
                            </Campo>
                            <Campo label="Dirección" error={errors.direccion}>
                                <input className={input} value={data.direccion} onChange={(e) => set('direccion', e.target.value)} />
                            </Campo>
                        </div>

                        {!movil && (
                            <>
                                <Campo label="Ubicación en el mapa" error={errors.latitud_inicio ?? errors.longitud_inicio}>
                                    <SelectorMapa
                                        latitud={data.latitud_inicio}
                                        longitud={data.longitud_inicio}
                                        onChange={(lat, lng, info) =>
                                            setData((d) => ({
                                                ...d,
                                                latitud_inicio: lat.toFixed(7),
                                                longitud_inicio: lng.toFixed(7),
                                                ...(info
                                                    ? {
                                                        direccion: info.direccion,
                                                        lugar_nombre: info.lugar || d.lugar_nombre,
                                                    }
                                                    : {}),
                                            }))
                                        }
                                    />
                                </Campo>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Campo label="Latitud (opcional)" error={errors.latitud_inicio}>
                                        <input className={input} value={data.latitud_inicio} onChange={(e) => set('latitud_inicio', e.target.value)} />
                                    </Campo>
                                    <Campo label="Longitud (opcional)" error={errors.longitud_inicio}>
                                        <input className={input} value={data.longitud_inicio} onChange={(e) => set('longitud_inicio', e.target.value)} />
                                    </Campo>
                                </div>
                            </>
                        )}
                        {movil && (
                            <>
                                {errors.puntos && <p className="text-xs text-red-600">{errors.puntos}</p>}
                                <SelectorRecorrido
                                    centro={mapaCentro}
                                    puntos={data.puntos}
                                    ruta={data.ruta}
                                    calles={data.calles}
                                    onPuntos={(p) => setData('puntos', p)}
                                    onRecorrido={(ruta, calles) => setData((d) => ({ ...d, ruta, calles }))}
                                />
                            </>
                        )}
                    </Seccion>

                    <Seccion titulo="Solicitante">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo label="Ente" error={errors.solicitante_ente}>
                                <input className={input} value={data.solicitante_ente} onChange={(e) => set('solicitante_ente', e.target.value)} />
                            </Campo>
                            <Campo label="Nombre" error={errors.solicitante_nombre}>
                                <input className={input} value={data.solicitante_nombre} onChange={(e) => set('solicitante_nombre', e.target.value)} />
                            </Campo>
                            <Campo label="Celular" error={errors.solicitante_celular}>
                                <input className={input} value={data.solicitante_celular} onChange={(e) => set('solicitante_celular', e.target.value)} />
                            </Campo>
                        </div>
                    </Seccion>

                    <div className="flex justify-end gap-3 border-t pt-5">
                        <Link href="/eventos" className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                            {processing ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}