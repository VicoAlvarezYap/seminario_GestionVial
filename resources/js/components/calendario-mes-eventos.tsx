import { router } from '@inertiajs/react';
import { Calendar, ChevronLeft, ChevronRight, List, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import FormEvento from '@/components/form-evento'; // ← ajustá a tu formulario
import type { LugarOpcion } from '@/components/selector-lugar';
import { DIAS_CORTOS, formatoFecha, hoyISO, parseFecha, sumarDias } from '@/lib/fechas';

export type EventoCalendario = {
    id: number;
    titulo: string;
    lugar_id: number | null;
    lugar: string | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string | null;
    direccion: string | null;
    descripcion: string | null;
    estado: string | null;
    tipo_recorrido: TipoRecorrido | null;
    latitud_inicio: number | null;
    longitud_inicio: number | null;
    solicitante_ente: string | null;
    solicitante_nombre: string | null;
    solicitante_celular: string | null;
    puntos: { descripcion_referencia: string | null; latitud: number; longitud: number }[];
};

export type DatosMes = {
    desde: string;
    hasta: string;
    eventos: EventoCalendario[];
};

export type TipoRecorrido = 'fijo' | 'movil';

type Props = DatosMes & {
    puedeEditar: boolean;
    lugares: LugarOpcion[];
    onCambiar: (desde: string, hasta: string) => void;
};

const MS_DIA = 86_400_000;
const MAX_DIAS = 366;

const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_DIA) + 1;
const lunesDe = (d: Date) => sumarDias(d, -((d.getDay() + 6) % 7));
const ultimoDiaMes = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const corto = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

const colorEstado = (estado: string | null) =>
    estado === 'cancelado'
        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';

/* ---------- Tarjeta de evento para la grilla ---------- */
function TarjetaEvento({
    e,
    puedeEditar,
    onEditar,
    onEliminar,
}: {
    e: EventoCalendario;
    puedeEditar: boolean;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    return (
        <div
            className={`relative rounded bg-emerald-100 p-1.5 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 ${
                e.estado === 'cancelado' ? 'line-through opacity-60' : ''
            }`}
        >
            {puedeEditar && (
                <div className="absolute top-1 right-1 flex">
                    <button type="button" onClick={onEditar} aria-label="Editar evento" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10">
                        <Pencil className="size-3" />
                    </button>
                    <button type="button" onClick={onEliminar} aria-label="Eliminar evento" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10">
                        <Trash2 className="size-3" />
                    </button>
                </div>
            )}
            <div className={`font-semibold ${puedeEditar ? 'pr-12' : ''}`}>{e.titulo}</div>
            <div className="font-medium">
                {e.hora_inicio}
                {e.hora_fin ? ` – ${e.hora_fin}` : ''}
            </div>
            {e.lugar && (
                <div className="flex items-center gap-1" title={e.lugar}>
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{e.lugar}</span>
                </div>
            )}
        </div>
    );
}

/* ---------- Componente principal ---------- */
export default function CalendarioMesEventos({ desde, hasta, eventos, puedeEditar, lugares, onCambiar }: Props) {
    const hoy = hoyISO();
    const dDesde = parseFecha(desde);
    const dHasta = parseFecha(hasta);
    const totalDias = diasEntre(dDesde, dHasta);

    const [vista, setVista] = useState<'lista' | 'calendario'>('lista');
    const [creando, setCreando] = useState<string | null>(null);
    const [editando, setEditando] = useState<EventoCalendario | null>(null);

    const [desdeInput, setDesdeInput] = useState(desde);
    const [hastaInput, setHastaInput] = useState(hasta);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDesdeInput(desde);
        setHastaInput(hasta);
        setError(null);
    }, [desde, hasta]);

    const hayCambiosSinAplicar = desdeInput !== desde || hastaInput !== hasta;

    const esMesCompleto =
        dDesde.getDate() === 1 &&
        dHasta.getDate() === ultimoDiaMes(dDesde).getDate() &&
        dDesde.getMonth() === dHasta.getMonth() &&
        dDesde.getFullYear() === dHasta.getFullYear();

    const aplicar = () => {
        if (!desdeInput || !hastaInput) {
            setError('Completá ambas fechas.');
            return;
        }
        if (desdeInput > hastaInput) {
            setError('"Desde" no puede ser posterior a "Hasta".');
            return;
        }
        if (diasEntre(parseFecha(desdeInput), parseFecha(hastaInput)) > MAX_DIAS) {
            setError(`El rango máximo es de ${MAX_DIAS} días.`);
            return;
        }
        setError(null);
        onCambiar(desdeInput, hastaInput);
    };

    const estaSemana = () => {
        const lunes = lunesDe(parseFecha(hoy));
        onCambiar(formatoFecha(lunes), formatoFecha(sumarDias(lunes, 6)));
    };

    const esteMes = () => {
        const h = parseFecha(hoy);
        onCambiar(formatoFecha(new Date(h.getFullYear(), h.getMonth(), 1)), formatoFecha(ultimoDiaMes(h)));
    };

    const mover = (dir: 1 | -1) => {
        if (esMesCompleto) {
            const nuevo = new Date(dDesde.getFullYear(), dDesde.getMonth() + dir, 1);
            onCambiar(formatoFecha(nuevo), formatoFecha(ultimoDiaMes(nuevo)));
            return;
        }
        onCambiar(formatoFecha(sumarDias(dDesde, dir * totalDias)), formatoFecha(sumarDias(dHasta, dir * totalDias)));
    };

    const eliminar = (id: number) => {
        if (!window.confirm('¿Eliminar este evento?')) {
            return;
        }
        router.delete(`/admin/eventos-operativos/${id}`, { preserveScroll: true });
    };

    const ordenados = useMemo(
        () => [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio)),
        [eventos],
    );

    const porDia = useMemo(() => {
        const mapa = new Map<string, EventoCalendario[]>();
        ordenados.forEach((e) => mapa.set(e.fecha, [...(mapa.get(e.fecha) ?? []), e]));
        return mapa;
    }, [ordenados]);

    const semanas = useMemo(() => {
        const res: Date[][] = [];
        const fin = parseFecha(hasta);
        let cursor = lunesDe(parseFecha(desde));
        while (cursor <= fin) {
            const inicioSemana = cursor;
            res.push(Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)));
            cursor = sumarDias(cursor, 7);
        }
        return res;
    }, [desde, hasta]);

    const titulo = `${corto(dDesde)} – ` + dHasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
    const btnAtajo = 'hover:bg-muted rounded-md border px-3 py-2 text-sm';

    return (
        <div className="flex flex-col gap-3">
            {/* ===== Filtro de rango ===== */}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
                <label className="flex flex-col gap-1 text-xs font-medium">
                    Desde
                    <input
                        type="date"
                        value={desdeInput}
                        max={hastaInput || undefined}
                        onChange={(e) => setDesdeInput(e.target.value)}
                        className="bg-background rounded-md border px-2 py-1.5 text-sm"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                    Hasta
                    <input
                        type="date"
                        value={hastaInput}
                        min={desdeInput || undefined}
                        onChange={(e) => setHastaInput(e.target.value)}
                        className="bg-background rounded-md border px-2 py-1.5 text-sm"
                    />
                </label>
                <button
                    type="button"
                    onClick={aplicar}
                    disabled={!hayCambiosSinAplicar}
                    className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    Filtrar
                </button>

                <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <button type="button" onClick={estaSemana} className={btnAtajo}>
                        Esta semana
                    </button>
                    <button type="button" onClick={esteMes} className={btnAtajo}>
                        Este mes
                    </button>
                </div>

                {error && <p className="w-full text-sm text-red-600">{error}</p>}
            </div>

            {/* ===== Navegación + selector de vista ===== */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => mover(-1)} aria-label="Rango anterior" className="hover:bg-muted rounded-md border p-2">
                        <ChevronLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => mover(1)} aria-label="Rango siguiente" className="hover:bg-muted rounded-md border p-2">
                        <ChevronRight className="size-4" />
                    </button>
                    <span className="ml-2 font-medium">{titulo}</span>
                    <span className="text-muted-foreground text-sm">
                        ({eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'})
                    </span>
                    {puedeEditar && (
                        <button
                            type="button"
                            onClick={() => setCreando(hoy >= desde && hoy <= hasta ? hoy : desde)}
                            className="hover:bg-muted ml-2 flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
                        >
                            <Plus className="size-4" /> Evento
                        </button>
                    )}
                </div>

                <div className="bg-muted/50 flex items-center rounded-md border p-0.5">
                    <button
                        type="button"
                        onClick={() => setVista('lista')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            vista === 'lista' ? 'bg-background shadow-sm' : 'hover:bg-muted'
                        }`}
                    >
                        <List className="size-3.5" /> Lista
                    </button>
                    <button
                        type="button"
                        onClick={() => setVista('calendario')}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                            vista === 'calendario' ? 'bg-background shadow-sm' : 'hover:bg-muted'
                        }`}
                    >
                        <Calendar className="size-3.5" /> Calendario
                    </button>
                </div>
            </div>

            {/* ===== VISTA LISTA ===== */}
            {vista === 'lista' &&
                (ordenados.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b text-xs uppercase">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Horario</th>
                                    <th className="p-3">Evento</th>
                                    <th className="p-3">Lugar / Dirección</th>
                                    <th className="p-3">Solicitante</th>
                                    <th className="p-3">Estado</th>
                                    {puedeEditar && <th className="p-3 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ordenados.map((e) => (
                                    <tr key={e.id} className={`hover:bg-muted/50 ${e.estado === 'cancelado' ? 'line-through opacity-60' : ''}`}>
                                        <td className="p-3 font-medium whitespace-nowrap">
                                            {parseFecha(e.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                            {e.hora_inicio}
                                            {e.hora_fin ? ` – ${e.hora_fin}` : ''}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-semibold">{e.titulo}</div>
                                            {e.descripcion && <div className="text-muted-foreground max-w-xs truncate text-xs">{e.descripcion}</div>}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium">{e.lugar}</div>
                                            {e.direccion && <div className="text-muted-foreground text-xs">{e.direccion}</div>}
                                        </td>
                                        <td className="p-3">
                                            {e.solicitante_ente || e.solicitante_nombre ? (
                                                <>
                                                    <div>{e.solicitante_ente}</div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {[e.solicitante_nombre, e.solicitante_celular].filter(Boolean).join(' · ')}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="p-3 capitalize">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colorEstado(e.estado)}`}>
                                                {e.estado || 'programado'}
                                            </span>
                                        </td>
                                        {puedeEditar && (
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditando(e)}
                                                        aria-label="Editar evento"
                                                        className="hover:bg-muted rounded-md border p-1.5"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => eliminar(e.id)}
                                                        aria-label="Eliminar evento"
                                                        className="hover:bg-muted rounded-md border p-1.5 text-red-600"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">No hay eventos en el rango seleccionado.</p>
                ))}

            {/* ===== VISTA CALENDARIO ===== */}
            {vista === 'calendario' && (
                <div className="overflow-x-auto">
                    <div className="min-w-700px overflow-hidden rounded-lg border">
                        <div className="bg-muted/50 grid grid-cols-7 border-b">
                            {DIAS_CORTOS.map((d, i) => (
                                <div key={d} className={`text-muted-foreground p-2 text-center text-xs ${i > 0 ? 'border-l' : ''}`}>
                                    {d} 
                                </div>
                            ))}
                        </div>

                        {semanas.map((dias, fila) => (
                            <div key={formatoFecha(dias[0])} className={`grid grid-cols-7 ${fila > 0 ? 'border-t' : ''}`}>
                                {dias.map((d, idx) => {
                                    const clave = formatoFecha(d);
                                    const dentro = clave >= desde && clave <= hasta;
                                    const delDia = porDia.get(clave) ?? [];
                                    const esHoy = clave === hoy;

                                    return (
                                        <div
                                            key={clave}
                                            className={`flex min-h-28 flex-col gap-1.5 p-2 ${idx > 0 ? 'border-l' : ''} ${
                                                dentro ? '' : 'bg-muted/30 opacity-50'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div
                                                    className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm ${
                                                        esHoy ? 'bg-primary text-primary-foreground font-semibold' : ''
                                                    }`}
                                                >
                                                    {d.getDate() === 1 || clave === desde
                                                        ? `${d.getDate()} ${d.toLocaleDateString('es-AR', { month: 'short' })}`
                                                        : d.getDate()}
                                                </div>
                                        
                                            </div>

                                            {dentro &&
                                                delDia.map((e) => (
                                                    <TarjetaEvento
                                                        key={e.id}
                                                        e={e}
                                                        puedeEditar={puedeEditar}
                                                        onEditar={() => setEditando(e)}
                                                        onEliminar={() => eliminar(e.id)}
                                                    />
                                                ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {eventos.length === 0 && <p className="text-muted-foreground mt-3 text-sm">No hay eventos en el rango seleccionado.</p>}
                </div>
            )}

            
            {creando && <FormEvento fecha={creando} lugares={lugares} onCerrar={() => setCreando(null)} />}
            {/*{editando && <FormEvento fecha={editando.fecha} evento={editando} lugares={lugares} onCerrar={() => setEditando(null)} />}*/}
        </div>
    );
}