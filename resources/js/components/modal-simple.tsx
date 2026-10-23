import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Estilo común de inputs, selects y textareas de los formularios
export const CLASE_CAMPO = 'border-input bg-background w-full rounded-md border px-3 py-2 text-sm';

// Etiqueta + campo + mensaje de error
export function Campo({
    etiqueta,
    error,
    children,
}: {
    etiqueta: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{etiqueta}</span>
            {children}
            {error && <span className="text-sm text-red-600">{error}</span>}
        </label>
    );
}

type Props = {
    titulo: string;
    onCerrar: () => void;
    ancho?: 'md' | 'lg'; // 'lg' para formularios largos
    children: ReactNode;
};

// Ventana emergente simple: se cierra con la X, con Escape o al tocar el fondo.
// Se dibuja con un "portal" directamente en <body>, fuera del carrusel: el carrusel usa
// transform y overflow-hidden, y eso hace que un elemento "fixed" quede posicionado
// y recortado dentro del carrusel en vez de cubrir la pantalla.
export default function ModalSimple({ titulo, onCerrar, ancho = 'md', children }: Props) {
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCerrar();
            }
        };
        document.addEventListener('keydown', alTeclear);
        return () => document.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCerrar}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className={`bg-background max-h-full w-full overflow-y-auto rounded-lg border p-5 shadow-lg ${
                    ancho === 'lg' ? 'max-w-2xl' : 'max-w-md'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{titulo}</h3>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar" className="hover:bg-muted rounded-md p-1">
                        <X className="size-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}
