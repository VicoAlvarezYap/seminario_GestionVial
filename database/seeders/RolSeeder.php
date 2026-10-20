<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['nombre' => 'Administrador', 'descripcion' => 'Acceso total al sistema'],
            ['nombre' => 'Supervisor', 'descripcion' => 'Gestion de turnos, eventos y reportes'],
            ['nombre' => 'Agente', 'descripcion' => 'Acceso operativo: relevos, emergencias, mensajes'],
        ];

        foreach ($roles as $rol) {
            DB::table('roles')->updateOrInsert(['nombre' => $rol['nombre']], $rol);
        }
    }
}
