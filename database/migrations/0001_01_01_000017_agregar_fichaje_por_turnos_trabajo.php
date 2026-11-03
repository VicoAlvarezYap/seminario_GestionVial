<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->timestamp('inicio_real')->nullable();
            $table->timestamp('fin_real')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->dropColumn(['inicio_real', 'fin_real']);
        });
    }
};