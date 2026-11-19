<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
{
    Schema::table('turnos_trabajo', function (Blueprint $table) {
        // Primero el índice nuevo, para que la clave foránea de agente_id siga cubierta
        $table->unique(['agente_id', 'fecha'], 'turnos_trabajo_agente_fecha_unique');
    });

    Schema::table('turnos_trabajo', function (Blueprint $table) {
        $table->dropUnique('turnos_trabajo_agente_id_fecha_turno_unique');
    });
}

public function down(): void
{
    Schema::table('turnos_trabajo', function (Blueprint $table) {
        $table->unique(['agente_id', 'fecha', 'turno'], 'turnos_trabajo_agente_id_fecha_turno_unique');
    });

    Schema::table('turnos_trabajo', function (Blueprint $table) {
        $table->dropUnique('turnos_trabajo_agente_fecha_unique');
    });
}
};