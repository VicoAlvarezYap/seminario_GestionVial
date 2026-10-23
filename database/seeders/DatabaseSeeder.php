<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Agente;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $agente = Agente::create([
            'nombre' => 'Juan',
            'apellido' => 'Pérez',
            'numero_documento' => '12345678',
            'celular' => '3871234567',
            'correo' => 'juan.perez@example.com',
        ]);

        User::create([
            'name' => 'Juan Pérez',
            'email' => 'juan.perez@example.com',
            'password' => Hash::make('password'),
            'agente_id' => $agente->id,
            'activo' => true,
        ]);
    }
}
