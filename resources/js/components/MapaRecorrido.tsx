import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los íconos predeterminados de Leaflet en React / Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
});

type Punto = {
    id: number;
    orden: number;
    latitud: number;
    longitud: number;
    descripcion_referencia: string;
};

interface Props {
    puntos: Punto[];
}

export default function MapaRecorrido({ puntos }: Props) {
    if (!puntos || puntos.length === 0) {
        return (
            <p className="text-xs text-zinc-500 italic">
                No hay coordenadas para mostrar el mapa.
            </p>
        );
    }

    // Convertimos las coordenadas para Leaflet [lat, lng]
    const posiciones: [number, number][] = puntos.map((p) => [
        Number(p.latitud),
        Number(p.longitud),
    ]);

    // Centro inicial del mapa (el primer punto del recorrido)
    const centro = posiciones[0];

    return (
        <div className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
            <MapContainer
                center={centro}
                zoom={14}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                {/* Capa de mapa base gratuita de OpenStreetMap */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Marcadores para cada punto */}
                {puntos.map((p) => (
                    <Marker
                        key={p.id}
                        position={[Number(p.latitud), Number(p.longitud)]}
                    >
                        <Popup>
                            <div className="text-xs">
                                <strong>Punto {p.orden}:</strong>
                                <p>
                                    {p.descripcion_referencia ||
                                        'Sin descripción'}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Línea trazada que une los puntos si hay 2 o más */}
                {posiciones.length > 1 && (
                    <Polyline
                        positions={posiciones}
                        color="#2563eb"
                        weight={4}
                        dashArray="5, 10"
                    />
                )}
            </MapContainer>
        </div>
    );
}
