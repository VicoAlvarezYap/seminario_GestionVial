import type { ReactNode } from 'react';
import NavbarAgente from '@/components/navbar-agente';

export default function ConNavbarLayout({ children }: { children: ReactNode }) {
    return (
        <>
            {children}
        </>
    );
}