import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type PuntoRuta = { latitud: string; longitud: string; descripcion_referencia: string };
export type Coord = [number, number];

type Props = {
    puntos: PuntoRuta[];
    ruta: Coord[];
    calles: string[];
    centro?: { lat: number; lng: number; zoom: number };
    onPuntos: (p: PuntoRuta[]) => void;
    onRecorrido: (ruta: Coord[], calles: string[]) => void;
};

const CENTRO_POR_DEFECTO: Coord = [-24.7821, -65.4232];

const numerado = (n: number, total: number) => {
    const color = n === 1 ? '#16a34a' : n === total ? '#dc2626' : '#2563eb'; // inicio verde, fin rojo
    return L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });
};

/** Pide a OSRM el trazado por calles entre todos los puntos, en orden. */
async function calcularRuta(pts: PuntoRuta[]) {
    const coords = pts.map((p) => `${p.longitud},${p.latitud}`).join(';');
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const j = await res.json();
    if (j.code !== 'Ok' || !j.routes?.[0]) {
        throw new Error('sin ruta');
    }
    const r = j.routes[0];
    const ruta: Coord[] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

    const calles: string[] = [];
    for (const leg of r.legs) {
        for (const step of leg.steps) {
            const nombre: string = step.name;
            if (nombre && calles[calles.length - 1] !== nombre) {
                calles.push(nombre);
            }
        }
    }
    return { ruta, calles, km: r.distance / 1000 };
}

export default function SelectorRecorrido({ puntos, ruta, calles, centro, onPuntos, onRecorrido }: Props) {
    const contenedor = useRef<HTMLDivElement>(null);
    const mapa = useRef<L.Map | null>(null);
    const capaPuntos = useRef<L.LayerGroup | null>(null);
    const lineaRuta = useRef<L.Polyline | null>(null);
    const pedido = useRef(0);

    const puntosRef = useRef(puntos);
    puntosRef.current = puntos;
    const cbPuntos = useRef(onPuntos);
    cbPuntos.current = onPuntos;
    const cbRecorrido = useRef(onRecorrido);
    cbRecorrido.current = onRecorrido;

    const [estado, setEstado] = useState<'ok' | 'calculando' | 'error'>('ok');
    const [km, setKm] = useState<number | null>(null);

    /** Guarda los puntos y recalcula el trazado. */
    const actualizar = async (nuevos: PuntoRuta[]) => {
        cbPuntos.current(nuevos);
        const n = ++pedido.current;

        if (nuevos.length < 2) {
            cbRecorrido.current([], []);
            setKm(null);
            setEstado('ok');
            return;
        }

        setEstado('calculando');
        try {
            const r = await calcularRuta(nuevos);
            if (n !== pedido.current) return; // llegó una respuesta vieja
            cbRecorrido.current(r.ruta, r.calles);
            setKm(r.km);
            setEstado('ok');
        } catch {
            if (n !== pedido.current) return;
            cbRecorrido.current([], []);
            setEstado('error');
        }
    };

    // Crear el mapa una sola vez
    useEffect(() => {
        if (!contenedor.current || mapa.current) return;

        const base: Coord = centro ? [centro.lat, centro.lng] : CENTRO_POR_DEFECTO;
        const m = L.map(contenedor.current).setView(base, centro?.zoom ?? 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(m);

        capaPuntos.current = L.layerGroup().addTo(m);
        mapa.current = m;

        // Al editar, se encuadra lo ya guardado
        const inicial: Coord[] = ruta.length > 1 ? ruta : puntos.map((p) => [Number(p.latitud), Number(p.longitud)]);
        if (inicial.length > 0) {
            m.fitBounds(L.latLngBounds(inicial), { padding: [30, 30], maxZoom: 17 });
        }

        m.on('click', (e: L.LeafletMouseEvent) =>
            actualizar([
                ...puntosRef.current,
                { latitud: e.latlng.lat.toFixed(7), longitud: e.latlng.lng.toFixed(7), descripcion_referencia: '' },
            ]),
        );

        return () => {
            m.remove();
            mapa.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Marcadores numerados y arrastrables
    useEffect(() => {
        const capa = capaPuntos.current;
        if (!capa) return;
        capa.clearLayers();

        puntos.forEach((p, i) => {
            const mk = L.marker([Number(p.latitud), Number(p.longitud)], {
                icon: numerado(i + 1, puntos.length),
                draggable: true,
            }).addTo(capa);

            mk.on('dragend', () => {
                const pos = mk.getLatLng();
                actualizar(
                    puntosRef.current.map((q, j) =>
                        j === i ? { ...q, latitud: pos.lat.toFixed(7), longitud: pos.lng.toFixed(7) } : q,
                    ),
                );
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [puntos]);

    // Línea del trazado por calles
    useEffect(() => {
        if (!mapa.current) return;
        lineaRuta.current?.remove();
        lineaRuta.current = null;
        if (ruta.length > 1) {
            lineaRuta.current = L.polyline(ruta, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(mapa.current);
        }
    }, [ruta]);

    const quitarUltimo = () => actualizar(puntos.slice(0, -1));
    const limpiar = () => actualizar([]);
    const quitar = (i: number) => actualizar(puntos.filter((_, j) => j !== i));
    const cambiarReferencia = (i: number, texto: string) =>
        onPuntos(puntos.map((p, j) => (j === i ? { ...p, descripcion_referencia: texto } : p)));

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                    Hacé clic en el mapa: el primer punto es el inicio (verde) y el último el final (rojo). Arrastrá los puntos para ajustarlos.
                </p>
                <div className="flex gap-2">
                    <button type="button" onClick={quitarUltimo} disabled={puntos.length === 0} className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs disabled:opacity-50">
                        <Undo2 className="size-3.5" /> Deshacer
                    </button>
                    <button type="button" onClick={limpiar} disabled={puntos.length === 0} className="hover:bg-accent inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-red-600 disabled:opacity-50">
                        <Trash2 className="size-3.5" /> Limpiar
                    </button>
                </div>
            </div>

            <div ref={contenedor} className="z-0 h-96 w-full rounded-md border" />

            <p className="text-xs">
                {estado === 'calculando' && <span className="text-muted-foreground">Calculando recorrido…</span>}
                {estado === 'error' && (
                    <span className="text-red-600">No se pudo calcular el recorrido por calles. Probá mover los puntos a una calle o intentá de nuevo.</span>
                )}
                {estado === 'ok' && km !== null && <span className="text-muted-foreground">Distancia aproximada: {km.toFixed(1)} km</span>}
            </p>

            {puntos.length > 0 && (
                <ol className="space-y-2">
                    {puntos.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-16 shrink-0 font-medium">{i === 0 ? 'Inicio' : i === puntos.length - 1 ? 'Final' : `Punto ${i + 1}`}</span>
                            <input
                                className="bg-background w-full rounded-md border px-3 py-1.5 text-sm"
                                placeholder="Referencia (opcional)"
                                value={p.descripcion_referencia}
                                onChange={(e) => cambiarReferencia(i, e.target.value)}
                            />
                            <button type="button" onClick={() => quitar(i)} aria-label="Quitar punto" className="text-red-600">
                                <Trash2 className="size-4" />
                            </button>
                        </li>
                    ))}
                </ol>
            )}

            {calles.length > 0 && (
                <div className="space-y-1">
                    <p className="text-sm font-semibold">Calles del recorrido</p>
                    <ol className="flex flex-wrap gap-1.5">
                        {calles.map((c, i) => (
                            <li key={i} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                                {i + 1}. {c}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}