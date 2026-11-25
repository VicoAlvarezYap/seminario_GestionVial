import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const icono = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export type InfoPunto = { direccion: string; lugar: string };

type Props = {
    latitud: string | number | null;
    longitud: string | number | null;
    onChange: (lat: number, lng: number, info?: InfoPunto) => void;
};

type Resultado = {
    display_name: string;
    lat: string;
    lon: string;
    name?: string;
    address?: Record<string, string>;
};

const CENTRO_POR_DEFECTO: [number, number] = [-24.967, -65.486]; // La Merced

/** Arma una dirección corta y un nombre de lugar a partir de la respuesta de Nominatim. */
function armarInfo(r: Pick<Resultado, 'display_name' | 'name' | 'address'>): InfoPunto {
    const a = r.address ?? {};
    const calle = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(' ');
    const zona = a.suburb ?? a.neighbourhood ?? a.city_district;
    const ciudad = a.city ?? a.town ?? a.village;

    return {
        direccion: [calle, zona, ciudad].filter(Boolean).join(', ') || r.display_name,
        lugar: r.name || a.amenity || a.leisure || a.tourism || zona || calle || '',
    };
}

export default function SelectorMapa({ latitud, longitud, onChange }: Props) {
    const contenedor = useRef<HTMLDivElement>(null);
    const mapa = useRef<L.Map | null>(null);
    const marcador = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [consulta, setConsulta] = useState('');
    const [resultados, setResultados] = useState<Resultado[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);

    const lat = latitud !== null && latitud !== '' ? Number(latitud) : null;
    const lng = longitud !== null && longitud !== '' ? Number(longitud) : null;
    const hayPunto = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);

    /** Consulta qué hay en esas coordenadas y avisa al formulario. */
    const resolver = async (la: number, lo: number) => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=es&lat=${la}&lon=${lo}`;
            const res = await fetch(url);
            const r: Resultado = await res.json();
            if (r && r.display_name) {
                onChangeRef.current(la, lo, armarInfo(r));
            }
        } catch {
            // si falla, queda guardada la coordenada igual
        }
    };

    const crearMarcador = (la: number, lo: number) => {
        const m = L.marker([la, lo], { icon: icono, draggable: true }).addTo(mapa.current!);
        m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current(p.lat, p.lng);
            resolver(p.lat, p.lng);
        });
        marcador.current = m;
    };

    const colocar = (la: number, lo: number, info?: InfoPunto, centrar = false) => {
        if (!mapa.current) {
            return;
        }
        if (marcador.current) {
            marcador.current.setLatLng([la, lo]);
        } else {
            crearMarcador(la, lo);
        }
        if (centrar) {
            mapa.current.setView([la, lo], Math.max(mapa.current.getZoom(), 16));
        }
        onChangeRef.current(la, lo, info);
        if (!info) {
            resolver(la, lo); // clic en el mapa: se busca la dirección
        }
    };

    useEffect(() => {
        if (!contenedor.current || mapa.current) {
            return;
        }

        const inicio: [number, number] = hayPunto ? [lat!, lng!] : CENTRO_POR_DEFECTO;
        const m = L.map(contenedor.current).setView(inicio, hayPunto ? 16 : 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(m);

        mapa.current = m;

        if (hayPunto) {
            crearMarcador(lat!, lng!);
        }

        m.on('click', (e: L.LeafletMouseEvent) => colocar(e.latlng.lat, e.latlng.lng));

        return () => {
            m.remove();
            mapa.current = null;
            marcador.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Si se editan latitud/longitud a mano, el marcador las sigue
    useEffect(() => {
        if (!mapa.current || !hayPunto) {
            return;
        }
        if (marcador.current) {
            marcador.current.setLatLng([lat!, lng!]);
        } else {
            crearMarcador(lat!, lng!);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng, hayPunto]);

    const buscar = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        const q = consulta.trim();
        if (q.length < 3) {
            return;
        }
        setBuscando(true);
        setMensaje(null);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ar&accept-language=es&q=${encodeURIComponent(q)}`;
            const res = await fetch(url);
            const datos: Resultado[] = await res.json();
            setResultados(datos);
            if (datos.length === 0) {
                setMensaje('No se encontraron resultados.');
            }
        } catch {
            setMensaje('No se pudo buscar. Probá de nuevo o hacé clic en el mapa.');
        } finally {
            setBuscando(false);
        }
    };

    const elegir = (r: Resultado) => {
        colocar(Number(r.lat), Number(r.lon), armarInfo(r), true);
        setResultados([]);
        setConsulta('');
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    type="search"
                    value={consulta}
                    onChange={(e) => setConsulta(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscar(e)}
                    placeholder="Buscar dirección o lugar (ej: Hipólito Yrigoyen 345, Salta)"
                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
                <button
                    type="button"
                    onClick={buscar}
                    disabled={buscando}
                    className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                    <Search className="size-4" />
                    {buscando ? 'Buscando…' : 'Buscar'}
                </button>
            </div>

            {mensaje && <p className="text-muted-foreground text-xs">{mensaje}</p>}

            {resultados.length > 0 && (
                <ul className="bg-background divide-y rounded-md border text-sm">
                    {resultados.map((r, i) => (
                        <li key={i}>
                            <button type="button" onClick={() => elegir(r)} className="hover:bg-accent w-full px-3 py-2 text-left">
                                {r.display_name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div ref={contenedor} className="z-0 h-72 w-full rounded-md border" />
            <p className="text-muted-foreground text-xs">
                Hacé clic en el mapa para marcar el punto, o arrastrá el marcador para ajustarlo. La dirección y el lugar se completan solos.
            </p>
        </div>
    );
}