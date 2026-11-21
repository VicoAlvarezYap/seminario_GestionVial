import { createInertiaApp } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AuthLayout from '@/layouts/auth-layout';
import ConNavbarLayout from '@/layouts/con-navbar-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Corre el contenido a la derecha del riel de íconos (w-16) en pantallas medianas y grandes
const ConMargenMenu = ({ children }: PropsWithChildren) => <div className="md:pl-16">{children}</div>;

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [ConMargenMenu, ConNavbarLayout, SettingsLayout];
            default:
                return ConMargenMenu;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

initializeTheme();