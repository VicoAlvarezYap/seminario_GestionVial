import { Camera, MapPin, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type Captura = {
    latitud: string;
    longitud: string;
    precision_m: string;
    foto: File | null;
};

export const capturaVacia: Captura = { latitud: '', longitud: '', precision_m: '', foto: null };

type Props = {
    valor: Captura;
    onChange: (parcial: Partial<Captura>) => void;
};

export default function CapturaFichaje({ valor, onChange }: Props) {
    const [gps, setGps] = useState<'pidiendo' | 'ok' | 'error'>('pidiendo');
    const [mensajeGps, setMensajeGps] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [errorCamara, setErrorCamara] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const video = useRef<HTMLVideoElement>(null);
    const cb = useRef(onChange);
    cb.current = onChange;

    /* ---------- Ubicación ---------- */
    const pedirUbicacion = () => {
        if (!navigator.geolocation) {
            setGps('error');
            setMensajeGps('Este dispositivo no permite obtener la ubicación.');
            return;
        }
        setGps('pidiendo');
        setMensajeGps(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                cb.current({
                    latitud: pos.coords.latitude.toFixed(7),
                    longitud: pos.coords.longitude.toFixed(7),
                    precision_m: String(Math.round(pos.coords.accuracy)),
                });
                setGps('ok');
            },
            (err) => {
                setGps('error');
                setMensajeGps(
                    err.code === err.PERMISSION_DENIED
                        ? 'Permití el acceso a la ubicación en el navegador.'
                        : 'No se pudo obtener la ubicación. Probá de nuevo.',
                );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    };

    useEffect(pedirUbicacion, []);

    /* ---------- Cámara en vivo ---------- */
    const detener = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

    const abrirCamara = async () => {
        setErrorCamara(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setErrorCamara('La cámara requiere HTTPS (o localhost) y un navegador compatible.');
            return;
        }
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            setStream(s);
        } catch {
            setErrorCamara('No se pudo acceder a la cámara. Permití el acceso en el navegador.');
        }
    };

    // Conecta el stream al <video> una vez que existe en pantalla
    useEffect(() => {
        if (video.current && stream) {
            video.current.srcObject = stream;
            video.current.play().catch(() => {});
        }
    }, [stream]);

    // Al desmontar, se apaga la cámara
    useEffect(() => () => detener(stream), [stream]);

    const capturar = () => {
        const v = video.current;
        if (!v || !v.videoWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(v, 0, 0);

        // Marca de fecha y hora sobre la imagen
        const sello = new Date().toLocaleString('es-AR');
        ctx.font = `${Math.max(16, Math.round(canvas.width / 40))}px sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const alto = Math.round(canvas.width / 32);
        ctx.fillRect(0, canvas.height - alto - 8, canvas.width, alto + 8);
        ctx.fillStyle = '#fff';
        ctx.fillText(sello, 10, canvas.height - 10);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onChange({ foto: new File([blob], `fichaje-${Date.now()}.jpg`, { type: 'image/jpeg' }) });
                detener(stream);
                setStream(null);
            },
            'image/jpeg',
            0.85,
        );
    };

    const repetir = () => {
        onChange({ foto: null });
        abrirCamara();
    };

    /* ---------- Vista previa de la foto tomada ---------- */
    useEffect(() => {
        if (!valor.foto) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(valor.foto);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [valor.foto]);

    return (
        <div className="space-y-3 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {gps === 'pidiendo' && 'Obteniendo ubicación…'}
                    {gps === 'ok' && `Ubicación lista (±${valor.precision_m} m)`}
                    {gps === 'error' && <span className="text-red-600">{mensajeGps}</span>}
                </span>
                {gps === 'error' && (
                    <button type="button" onClick={pedirUbicacion} className="text-xs underline">
                        Reintentar
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {stream && (
                    <>
                        <video ref={video} playsInline muted className="w-full max-w-sm rounded-lg border bg-black" />
                        <button
                            type="button"
                            onClick={capturar}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
                        >
                            <Camera className="size-4" /> Sacar foto
                        </button>
                    </>
                )}

                {!stream && preview && (
                    <>
                        <img src={preview} alt="Foto del fichaje" className="w-full max-w-sm rounded-lg border" />
                        <button
                            type="button"
                            onClick={repetir}
                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-accent"
                        >
                            <RefreshCw className="size-4" /> Volver a sacar
                        </button>
                    </>
                )}

                {!stream && !preview && (
                    <button
                        type="button"
                        onClick={abrirCamara}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-accent"
                    >
                        <Camera className="size-4" /> Abrir cámara
                    </button>
                )}

                {errorCamara && <p className="text-xs text-red-600">{errorCamara}</p>}
            </div>
        </div>
    );
}