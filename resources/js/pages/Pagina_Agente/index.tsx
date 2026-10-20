import { Head } from '@inertiajs/react';
import NavbarAgente from '@/components/navbar-agente';

export default function PaginaAgente() {
    return (
        <>
            <Head title="Página del agente" />
            <NavbarAgente />
            <main className="p-4">
                <h1 className="text-2xl font-bold">Hola mundo</h1>
            </main>
        </>
    );
}