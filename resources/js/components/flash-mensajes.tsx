import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Flash = { success?: string | null; warning?: string | null; error?: string | null };

const ESTILOS = {
    success: 'border-green-300 bg-green-50 text-green-800',
    warning: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    error: 'border-red-300 bg-red-50 text-red-800',
} as const;

export default function FlashMensajes() {
    const { flash } = usePage<{ flash: Flash }>().props;
    const [visible, setVisible] = useState(true);

    const tipo = (['error', 'warning', 'success'] as const).find((k) => flash?.[k]);
    const mensaje = tipo ? flash[tipo] : null;

    useEffect(() => {
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 6000);
        return () => clearTimeout(t);
    }, [mensaje]);

    if (!tipo || !mensaje || !visible) return null;

    return (
        <div className={`rounded-lg border px-4 py-3 text-sm ${ESTILOS[tipo]}`} role="alert">
            {mensaje}
        </div>
    );
}