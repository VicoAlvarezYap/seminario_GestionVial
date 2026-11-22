import { Head, usePage } from '@inertiajs/react';

type Props = {
    nombreUsuario: string;
};

export default function PaginaAgente({ nombreUsuario }: Props) {
    return (
        <>
            <Head title="Página Principal" />

            <main className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="p-6 bg-card border rounded-lg shadow-sm space-y-2">
                    <h1 className="text-2xl font-bold">¡Hola, {nombreUsuario}! 👋</h1>
                    <p className="text-sm text-muted-foreground">
                        Bienvenido al sistema de gestión vial. Esta es tu página principal.
                    </p>
                </div>
            </main>
        </>
    );
}
