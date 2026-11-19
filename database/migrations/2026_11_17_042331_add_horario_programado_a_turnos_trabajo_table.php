<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->time('hora_inicio_prog')->nullable()->after('turno');
            $table->time('hora_fin_prog')->nullable()->after('hora_inicio_prog');
        });
    }

    public function down(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->dropColumn(['hora_inicio_prog', 'hora_fin_prog']);
        });
    }
};