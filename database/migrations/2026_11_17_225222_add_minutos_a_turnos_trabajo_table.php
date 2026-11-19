<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->unsignedSmallInteger('minutos_trabajados')->nullable()->after('fin_real');
            $table->unsignedSmallInteger('minutos_extra')->nullable()->after('minutos_trabajados');
        });
    }

    public function down(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->dropColumn(['minutos_trabajados', 'minutos_extra']);
        });
    }
};