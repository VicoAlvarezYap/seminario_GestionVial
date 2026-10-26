import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CLASE_CAMPO } from '@/components/modal-simple';
import { Button } from '@/components/ui/button';

export type LugarOpcion = { id: number; nombre: string };

type Props = {
    lugares: LugarOpcion[];
    valor: string; // id del lugar elegido, o '' si no hay ninguno
    onCambiar: (id: string) => void;
    error?: string;
    actual?: LugarOpcion | null; // lugar ya asignado (por si ahora está desactivado y no figura en la lista)
    puedeCrear?: boolean;
};

export default function SelectorLugar({
    lugares,
    valor,
    onCambiar,
    error,
    actual = null,
    puedeCrear = true,
}: Props) {
    const idSelect = useId();
    const [creando, setCreando] = useState(false);
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('');
    const [errorNuevo, setErrorNuevo] = useState<string | undefined>(undefined);
    const [guardando, setGuardando] = useState(false);

    const opciones = actual && !lugares.some((l) => l.id === actual.id) ? [...lugares, actual] : lugares;

    const cancelar = () => {
        setCreando(false);
        setNombre('');
        setTipo('');
        setErrorNuevo(undefined);
    };

    // Crea el lugar en el servidor, recarga solo la lista de lugares y lo deja elegido
    const crear = () => {
        if (nombre.trim() === '' || guardando) {
            return;
        }

        router.post(
            '/admin/lugares',
            { nombre, tipo },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['lugares'],
                onStart: () => setGuardando(true),
                onFinish: () => setGuardando(false),
                onError: (errores) => setErrorNuevo(errores.nombre ?? errores.tipo ?? 'No se pudo crear el lugar.'),
                onSuccess: (pagina) => {
                    const lista = (pagina.props as { lugares?: LugarOpcion[] }).lugares ?? [];
                    const nuevo = lista.find((l) => l.nombre.toLowerCase() === nombre.trim().toLowerCase());
                    if (nuevo) {
                        onCambiar(String(nuevo.id));
                    }
                    cancelar();
                },
            },
        );
    };

    // Enter crea el lugar (sin esto, Enter enviaría el formulario de afuera)
    const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            crear();
        }
    };

    return (
        <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
                <label htmlFor={idSelect} className="font-medium">
                    Lugar
                </label>
                {puedeCrear && !creando && (
                    <button
                        type="button"
                        onClick={() => setCreando(true)}
                        className="flex items-center gap-1 text-xs underline"
                    >
                        <Plus className="size-3" /> Nuevo lugar
                    </button>
                )}
            </div>

            <select
                id={idSelect}
                className={CLASE_CAMPO}
                value={valor}
                onChange={(e) => onCambiar(e.target.value)}
            >
                <option value="">Sin lugar asignado</option>
                {opciones.map((l) => (
                    <option key={l.id} value={l.id}>
                        {l.nombre}
                    </option>
                ))}
            </select>

            {error && <span className="text-sm text-red-600">{error}</span>}

            {creando && (
                <div className="mt-1 flex flex-col gap-2 rounded-md border p-2">
                    <input
                        type="text"
                        placeholder="Nombre (ej: Plaza principal)"
                        aria-label="Nombre del lugar nuevo"
                        className={CLASE_CAMPO}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        onKeyDown={alTeclear}
                    />
                    <input
                        type="text"
                        placeholder="Tipo (opcional: plaza, escuela, terminal…)"
                        aria-label="Tipo de lugar"
                        className={CLASE_CAMPO}
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        onKeyDown={alTeclear}
                    />
                    {errorNuevo && <span className="text-sm text-red-600">{errorNuevo}</span>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={cancelar}>
                            Cancelar
                        </Button>
                        <Button type="button" size="sm" onClick={crear} disabled={guardando || nombre.trim() === ''}>
                            Crear lugar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
