import { X } from 'lucide-react';

type Props = {
    tipo: 'error' | 'exito';
    titulo: string;
    detalles?: string[];
    onCerrar: () => void;
};

export default function Toast({ tipo, titulo, detalles = [], onCerrar }: Props) {
    const colores =
        tipo === 'error'
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-green-300 bg-green-50 text-green-900';

    return (
        <div
            role="alert"
            className={`fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg ${colores}`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{titulo}</p>
                <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded p-1 hover:bg-black/5">
                    <X className="size-4" />
                </button>
            </div>
            {detalles.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {detalles.map((d) => (
                        <li key={d}>{d}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}