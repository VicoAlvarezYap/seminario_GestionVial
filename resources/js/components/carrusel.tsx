import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

export type SlideCarrusel = {
    titulo: string;
    contenido: ReactNode;
};

export default function Carrusel({ slides }: { slides: SlideCarrusel[] }) {
    const [indice, setIndice] = useState(0);

    // Da la vuelta: después de la última vuelve a la primera
    const ir = (i: number) => setIndice((i + slides.length) % slides.length);

    return (
        <section className="flex flex-col gap-3">
            {/* Título de la diapositiva actual y flechas */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{slides[indice].titulo}</h2>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => ir(indice - 1)}
                        aria-label="Anterior"
                        className="hover:bg-muted rounded-md border p-2 cursor-pointer"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => ir(indice + 1)}
                        aria-label="Siguiente"
                        className="hover:bg-muted rounded-md border p-2 cursor-pointer"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>

            {/* Las diapositivas van una al lado de la otra; se desplaza la fila */}
            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-300"
                    style={{ transform: `translateX(-${indice * 100}%)` }}
                >
                    {slides.map((s, i) => (
                        <div 
                            key={s.titulo} 
                            className={`w-full shrink-0 ${i !== indice ? 'pointer-events-none select-none' : ''}`} 
                            aria-hidden={i !== indice}
                            tabIndex={i !== indice ? -1 : 0}
                        >
                            {s.contenido}
                        </div>
                    ))}
                </div>
            </div>

            {/* Puntos indicadores */}
            <div className="flex justify-center gap-2">
                {slides.map((s, i) => (
                    <button
                        key={s.titulo}
                        type="button"
                        onClick={() => ir(i)}
                        aria-label={`Ir a ${s.titulo}`}
                        className={`size-2.5 rounded-full cursor-pointer ${i === indice ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    />
                ))}
            </div>
        </section>
    );
}