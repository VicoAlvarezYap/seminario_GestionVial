import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Accion } from '@/components/acciones';

type Props = { acciones: Accion[] };

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function BuscadorAcciones({ acciones }: Props) {
    const [texto, setTexto] = useState('');
    const [abierto, setAbierto] = useState(false);
    const [resaltado, setResaltado] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sin texto no hay sugerencias. Con texto, muestra las que contienen lo escrito
    const sugerencias = useMemo(() => {
        const q = sinAcentos(texto.trim());
        if (q === '') return [];
        return acciones.filter((a) => sinAcentos(a.titulo).includes(q));
    }, [texto, acciones]);

    // Ctrl+K o / enfocan el campo
    useEffect(() => {
        const teclado = (e: KeyboardEvent) => {
            const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
            if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (!enCampo && e.key === '/')) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', teclado);
        return () => window.removeEventListener('keydown', teclado);
    }, []);

    const ir = (a: Accion) => {
        setAbierto(false);
        setTexto('');
        router.visit(a.href);
    };

    const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setAbierto(false);
            inputRef.current?.blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setResaltado((r) => Math.min(r + 1, sugerencias.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setResaltado((r) => Math.max(r - 1, 0));
        } else if (e.key === 'Enter' && sugerencias[resaltado]) {
            e.preventDefault();
            ir(sugerencias[resaltado]);
        }
    };

    const mostrarLista = abierto && sugerencias.length > 0;

    return (
        <div className="relative w-full max-w-xs">
            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                    ref={inputRef}
                    type="text"
                    value={texto}
                    onChange={(e) => {
                        setTexto(e.target.value);
                        setResaltado(0);
                        setAbierto(true);
                    }}
                    onFocus={() => setAbierto(true)}
                    onBlur={() => setTimeout(() => setAbierto(false), 150)}
                    onKeyDown={teclas}
                    placeholder="Buscar acción… (Ctrl+K)"
                    aria-label="Buscar acción"
                    autoComplete="off"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>

            {mostrarLista && (
                <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-background p-1 shadow-md">
                    {sugerencias.map((a, i) => (
                        <li key={`${a.href}-${a.titulo}`}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setResaltado(i)}
                                onClick={() => ir(a)}
                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                                    i === resaltado ? 'bg-accent' : ''
                                }`}
                            >
                                <a.icono className="size-4 shrink-0" />
                                {a.titulo}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}