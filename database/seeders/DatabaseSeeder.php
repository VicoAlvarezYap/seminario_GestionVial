<?php

namespace Database\Seeders;

use App\Models\Agente;
use App\Models\Lugar;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Se puede ejecutar todas las veces que haga falta: si un registro ya existe,
     * no se vuelve a crear (por eso se usa updateOrCreate / firstOrCreate y no create).
     */
    public function run(): void
    {
        // Los roles tienen que existir antes de asignarlos a los usuarios
        $this->call(RolSeeder::class);

        // ---- Administrador (solo cuenta de acceso, sin legajo de agente) ----
        $admin = User::firstOrCreate(
            ['email' => 'admin@ejemplo.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('password'), // solo para desarrollo: cambiarla en producción
                'activo' => true,
            ],
        );
        $this->verificarYAsignarRol($admin, 'Administrador');

        // ---- Agentes: cada uno con su legajo y su cuenta de acceso ----
        $this->crearAgenteConUsuario([
            'nombre' => 'Juan',
            'apellido' => 'Pérez',
            'numero_documento' => '12345678',
            'celular' => '3871234567',
            'correo' => 'juan.perez@example.com',
        ]);

        $this->crearAgenteConUsuario([
            'nombre' => 'Mauro',
            'apellido' => 'Pérez',
            'numero_documento' => '2563803',
            'celular' => '3871234568',
            'correo' => 'mauro.perez@example.com',
        ]);

        $this->crearAgenteConUsuario([
            'nombre' => 'Tabita',
            'apellido' => 'Paz',
            'numero_documento' => '25638873',
            'celular' => '3871234569',
            'correo' => 'tabita.paz@example.com',
        ]);

        // ---- Lugares de ejemplo (se pueden editar o borrar) ----
        foreach ([
            ['nombre' => 'Plaza principal', 'tipo' => 'plaza'],
            ['nombre' => 'Terminal de ómnibus', 'tipo' => 'terminal'],
            ['nombre' => 'Colegio San Martín', 'tipo' => 'escuela'],
        ] as $lugar) {
            Lugar::updateOrCreate(['nombre' => $lugar['nombre']], $lugar);
        }
    }

    /** Crea (o actualiza) el legajo y su usuario, y le da el rol Agente. */
    private function crearAgenteConUsuario(array $datos): void
    {
        // El documento identifica al agente: si ya existe, se actualiza en vez de duplicarlo
        $agente = Agente::updateOrCreate(
            ['numero_documento' => $datos['numero_documento']],
            $datos,
        );

        // El correo identifica al usuario: si ya existe, se deja como está
        $usuario = User::firstOrCreate(
            ['email' => $datos['correo']],
            [
                'name' => "{$datos['nombre']} {$datos['apellido']}",
                'password' => Hash::make('password'), // solo para desarrollo
                'agente_id' => $agente->id,
                'activo' => true,
            ],
        );

        $this->verificarYAsignarRol($usuario, 'Agente');
    }

    /** Marca el correo como verificado (algunas rutas lo exigen) y asigna el rol. */
    private function verificarYAsignarRol(User $usuario, string $rol): void
    {
        if ($usuario->email_verified_at === null) {
            $usuario->forceFill(['email_verified_at' => now()])->save();
        }

        $usuario->assignRole($rol);
    }
}