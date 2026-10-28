type Props = {
    nombre: string;
    onIniciar: () => void;
};

export default function TarjetaBienvenida({ nombre, onIniciar }: Props) {
    const inicial = nombre.trim().charAt(0).toUpperCase();

    return (
        <div className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
            {/* Círculo con la inicial */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {inicial}
            </div>

            {/* Texto de bienvenida */}
            <p className="flex-1 text-base font-medium">
                BIENVENIDO   <span className="font-bold">{nombre}</span>
            </p>

            {/* Botón */}
            <button
                type="button"
                onClick={onIniciar}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-900"
            >
                Iniciar
            </button>
        </div>
    );
}