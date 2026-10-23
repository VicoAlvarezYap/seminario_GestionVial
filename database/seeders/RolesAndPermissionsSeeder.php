<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
       
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Crear Permisos específicos para Eventos Operativos y Turnos
        Permission::firstOrCreate(['name' => 'listar eventos operativos']);
        Permission::firstOrCreate(['name' => 'crear eventos operativos']);
        Permission::firstOrCreate(['name' => 'editar eventos operativos']);
        Permission::firstOrCreate(['name' => 'eliminar eventos operativos']);
        
        Permission::firstOrCreate(['name' => 'ver pagina agente']); // Para ver el calendario mensual y turnos

       
        $roleSuperAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $roleAdmin = Role::firstOrCreate(['name' => 'admin']);
        $roleAgente = Role::firstOrCreate(['name' => 'agente']);

        
        $roleSuperAdmin->givePermissionTo(Permission::all());
        
        $roleAdmin->givePermissionTo([
            'listar eventos operativos',
            'crear eventos operativos',
            'editar eventos operativos',
            'eliminar eventos operativos',
            'ver pagina agente',
        ]);

        $roleAgente->givePermissionTo([
            'listar eventos operativos',
            'ver pagina agente',
        ]);

        // 5. Crear usuarios de prueba y asignarles roles[cite: 5, 6]
        
        // ADMIN PRINCIPAL
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Administrador Vial',
                'password' => bcrypt('1234'),
            ]
        );
        $adminUser->assignRole($roleAdmin); // Corregido: se usa la variable $roleAdmin[cite: 6]

        // AGENTE DE PRUEBA
        $agenteUser = User::firstOrCreate(
            ['email' => 'agente@example.com'],
            [
                'name' => 'Agente Municipal',
                'password' => bcrypt('1234'),
            ]
        );
        $agenteUser->assignRole($roleAgente);
    }
}