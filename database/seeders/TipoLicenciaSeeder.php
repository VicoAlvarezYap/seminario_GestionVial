<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TipoLicencia;
class TipoLicenciaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
{
    TipoLicencia::updateOrCreate(['nombre' => 'Accidente laboral'], []);
    TipoLicencia::updateOrCreate(['nombre' => 'Familiar enfermo'], ['requiere_declaracion_jurada' => true]);
    TipoLicencia::updateOrCreate(['nombre' => 'Médico'], ['requiere_justificante' => true]);
    TipoLicencia::updateOrCreate(['nombre' => 'Maternidad'], ['requiere_justificante' => true]);
    TipoLicencia::updateOrCreate(['nombre' => 'Paternidad'], ['requiere_justificante' => true]);
}
}
