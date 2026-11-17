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
        // Los roles tienen que existir antes de asignarlos
        $this->call(RolSeeder::class);

        // ---- Director: tiene legajo (ficha, tiene perfil) y rol Administrador ----
        $this->crearAgenteConUsuario([
            'nombre'           => 'Carlos',
            'apellido'         => 'Gómez',
            'numero_documento' => '10000001',
            'celular'          => '3871000001',
            'correo'           => 'admin@ejemplo.com',
            'rango'            => 'director',
        ]);

        // ---- Instructor / examinador: rol Supervisor ----
        $this->crearAgenteConUsuario([
            'nombre'           => 'Laura',
            'apellido'         => 'Díaz',
            'numero_documento' => '10000002',
            'celular'          => '3871000002',
            'correo'           => 'laura.diaz@example.com',
            'rango'            => 'instructor_examinador',
        ]);

        // ---- Inspectores: rol Agente ----
        $this->crearAgenteConUsuario([
            'nombre'           => 'Juan',
            'apellido'         => 'Pérez',
            'numero_documento' => '12345678',
            'celular'          => '3871234567',
            'correo'           => 'juan.perez@example.com',
            'rango'            => 'inspector',
        ]);

        $this->crearAgenteConUsuario([
            'nombre'           => 'Mauro',
            'apellido'         => 'Pérez',
            'numero_documento' => '2563803',
            'celular'          => '3871234568',
            'domicilio'        => 'Siempre Verde 23',
            'correo'           => 'mauro.perez@example.com',
            'rango'            => 'inspector',
        ]);

        $this->crearAgenteConUsuario([
            'nombre'           => 'Tabita',
            'apellido'         => 'Paz',
            'numero_documento' => '25638873',
            'celular'          => '3871234569',
            'correo'           => 'tabita.paz@example.com',
            'rango'            => 'inspector',
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

    /**
     * Crea (o actualiza) el legajo y su usuario. El rol sale del rango,
     * igual que cuando se da de alta un agente desde el panel.
     */
    private function crearAgenteConUsuario(array $datos): void
    {
        // El documento identifica al agente: si ya existe, se actualiza en vez de duplicarlo
        $agente = Agente::updateOrCreate(
            ['numero_documento' => $datos['numero_documento']],
            $datos,
        );

        // El correo identifica al usuario: si ya existe, no se duplica
        $usuario = User::firstOrCreate(
            ['email' => $datos['correo']],
            [
                'name'      => "{$datos['nombre']} {$datos['apellido']}",
                'password'  => Hash::make('password'), // solo para desarrollo: cambiarla en producción
                'agente_id' => $agente->id,
                'activo'    => true,
            ],
        );

        // Si el usuario existía de antes sin legajo, se lo vincula
        if ($usuario->agente_id === null) {
            $usuario->forceFill(['agente_id' => $agente->id])->save();
        }

        // Correo verificado (las rutas usan el middleware "verified")
        if ($usuario->email_verified_at === null) {
            $usuario->forceFill(['email_verified_at' => now()])->save();
        }

        // syncRoles deja un único rol y evita acumular roles viejos
        $usuario->syncRoles(Agente::rolParaRango($agente->rango));
    }
}