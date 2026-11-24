import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useRef } from 'react';

const icono = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export type PuntoMapa = {
    latitud: string | number;
    longitud: string | number;
    etiqueta?: string | null;
};

type Props = {
    puntos: PuntoMapa[];
    recorrido?: boolean;
    ruta?: [number, number][];
};

const numerado = (n: number) =>
    L.divIcon({
        className: '',
        html: `<div style="background:#2563eb;color:#fff;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });


export default function MapaEvento({ puntos, recorrido = false, ruta }: Props) {
    const contenedor = useRef<HTMLDivElement>(null);

    const validos = puntos
        .map((p) => ({ ...p, lat: Number(p.latitud), lng: Number(p.longitud) }))
        .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));

    const clave = JSON.stringify(validos.map((p) => [p.lat, p.lng]));

    useEffect(() => {
        if (!contenedor.current || validos.length === 0) {
            return;
        }

        const mapa = L.map(contenedor.current, { scrollWheelZoom: false });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(mapa);

        validos.forEach((p, i) => {
            const m = L.marker([p.lat, p.lng], { icon: recorrido ? numerado(i + 1) : icono }).addTo(mapa);
            if (p.etiqueta) {
                m.bindPopup(p.etiqueta);
            }
        });

        if (recorrido && validos.length > 1) {
            const linea = ruta && ruta.length > 1 ? ruta : validos.map((p) => [p.lat, p.lng] as [number, number]);
            L.polyline(linea, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(mapa);
        }

        if (validos.length === 1) {
            mapa.setView([validos[0].lat, validos[0].lng], 16);
        } else {
            mapa.fitBounds(L.latLngBounds(validos.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30] });
        }

        return () => {
            mapa.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, recorrido]);

    if (validos.length === 0) {
        return null;
    }

    return <div ref={contenedor} className="z-0 h-80 w-full rounded-lg border" />;
}