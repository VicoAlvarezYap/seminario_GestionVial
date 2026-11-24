import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

// Color de fondo del login (cambialo por el que prefieras)
const COLOR_FONDO = '#F8FAFC';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div
            className="flex min-h-svh items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: COLOR_FONDO }}
        >
            {/* Tarjeta */}
            <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-2xl sm:p-10">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={home()} className="flex flex-col items-center gap-2 font-medium">
                            <img src="/images/transito.png" alt="Tránsito" className="h-35 w-auto" />
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold">{title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}