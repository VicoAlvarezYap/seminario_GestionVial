import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Gestión Vial" />

            <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#FDFDFC] p-6 text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <img
                    src="/images/transito.png"
                    alt="Dirección de Tránsito Municipal"
                    className="h-48 w-auto"
                />

                <div className="text-center">
                    <h1 className="text-3xl font-semibold">Gestión Vial</h1>
                    <p className="mt-2 text-sm text-[#706f6c] dark:text-[#A1A09A]">
                        Dirección de Tránsito Municipal · La Merced
                    </p>
                </div>

                {auth.user ? (
                    <Link
                        href={dashboard()}
                        className="inline-block rounded-sm border border-[#19140035] px-6 py-2 text-sm leading-normal hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b]"
                    >
                        Dashboard
                    </Link>
                ) : (
                    <Link
                        href={login()}
                        className="inline-block rounded-sm border border-black bg-[#1b1b18] px-6 py-2 text-sm leading-normal text-white hover:bg-black dark:border-[#eeeeec] dark:bg-[#eeeeec] dark:text-[#1C1C1A] dark:hover:bg-white"
                    >
                        Iniciar sesión
                    </Link>
                )}
            </div>
        </>
    );
}