import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent } from 'react';
import NavbarAgente from '@/components/navbar-agente';

type Punto = { latitud: string; longitud: string; descripcion_referencia: string };

type Evento = {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    lugar_id: number | null;
    direccion: string | null;
    tipo_recorrido: string;
    latitud_inicio: string | null;
    longitud_inicio: string | null;
    solicitante_ente: string | null;
    solicitante_nombre: string | null;
    solicitante_celular: string | null;
    estado: string;
    puntos: Punto[];
};

type Datos = {
    titulo: string;
    descripcion: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    lugar_id: string;
    direccion: string;
    tipo_recorrido: string;
    latitud_inicio: string;
    longitud_inicio: string;
    solicitante_ente: string;
    solicitante_nombre: string;
    solicitante_celular: string;
    estado: string;
    puntos: Punto[];
};

type Props = {
    evento: Evento | null;
    lugares: { id: number; nombre: string }[];
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

export default function EventoForm({ evento, lugares }: Props) {
    const form = useForm<Datos>({
        titulo: evento?.titulo ?? '',
        descripcion: evento?.descripcion ?? '',
        fecha: evento?.fecha ?? '',
        hora_inicio: evento?.hora_inicio ?? '',
        hora_fin: evento?.hora_fin ?? '',
        lugar_id: evento?.lugar_id ? String(evento.lugar_id) : '',
        direccion: evento?.direccion ?? '',
        tipo_recorrido: evento?.tipo_recorrido ?? 'estatico',
        latitud_inicio: evento?.latitud_inicio ?? '',
        longitud_inicio: evento?.longitud_inicio ?? '',
        solicitante_ente: evento?.solicitante_ente ?? '',
        solicitante_nombre: evento?.solicitante_nombre ?? '',
        solicitante_celular: evento?.solicitante_celular ?? '',
        estado: evento?.estado ?? 'programado',
        puntos: evento?.puntos ?? [],
    });

    const { data, errors, setData, processing } = form;
    const movil = data.tipo_recorrido === 'movil_itinerante';

    // Cambia un campo sin repetir setData en cada input
    const set = (campo: keyof Datos, valor: string) => setData(campo, valor as never);

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
            <NavbarAgente />

            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/eventos" className="text-sm text-primary hover:underline">
                        ← Volver a eventos
                    </Link>
                    <h1 className="text-2xl font-bold">{evento ? 'Editar evento' : 'Crear evento'}</h1>
                </div>

                <form onSubmit={enviar} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Campo label="Lugar" error={errors.lugar_id}>
                            <select className={input} value={data.lugar_id} onChange={(e) => set('lugar_id', e.target.value)}>
                                <option value="">Sin lugar</option>
                                {lugares.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.nombre}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                        <Campo label="Dirección" error={errors.direccion}>
                            <input className={input} value={data.direccion} onChange={(e) => set('direccion', e.target.value)} />
                        </Campo>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Campo label="Tipo de recorrido *" error={errors.tipo_recorrido}>
                            <select className={input} value={data.tipo_recorrido} onChange={(e) => set('tipo_recorrido', e.target.value)}>
                                <option value="estatico">Estático</option>
                                <option value="movil_itinerante">Móvil / itinerante</option>
                            </select>
                        </Campo>
                        <Campo label="Estado *" error={errors.estado}>
                            <select className={input} value={data.estado} onChange={(e) => set('estado', e.target.value)}>
                                {ESTADOS.map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    </div>

                    {!movil && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo label="Latitud (opcional)" error={errors.latitud_inicio}>
                                <input className={input} value={data.latitud_inicio} onChange={(e) => set('latitud_inicio', e.target.value)} />
                            </Campo>
                            <Campo label="Longitud (opcional)" error={errors.longitud_inicio}>
                                <input className={input} value={data.longitud_inicio} onChange={(e) => set('longitud_inicio', e.target.value)} />
                            </Campo>
                        </div>
                    )}

                    {movil && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold">Recorrido (mínimo 2 puntos)</p>
                                <button type="button" onClick={agregarPunto} className="flex items-center gap-1 text-sm text-primary hover:underline">
                                    <Plus className="size-4" /> Agregar punto
                                </button>
                            </div>
                            {errors.puntos && <p className="text-xs text-red-600">{errors.puntos}</p>}

                            {data.puntos.map((p, i) => (
                                <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-4">
                                    <input className={input} placeholder="Latitud" value={p.latitud} onChange={(e) => cambiarPunto(i, 'latitud', e.target.value)} />
                                    <input className={input} placeholder="Longitud" value={p.longitud} onChange={(e) => cambiarPunto(i, 'longitud', e.target.value)} />
                                    <input
                                        className={input}
                                        placeholder="Referencia"
                                        value={p.descripcion_referencia}
                                        onChange={(e) => cambiarPunto(i, 'descripcion_referencia', e.target.value)}
                                    />
                                    <button type="button" onClick={() => quitarPunto(i)} className="flex items-center justify-center gap-1 text-sm text-red-600 hover:underline">
                                        <Trash2 className="size-4" /> Quitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3 border-t pt-5">
                        <p className="text-sm font-semibold">Solicitante</p>
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
                    </div>

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