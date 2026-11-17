<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('historial_licencias', function (Blueprint $table) {
            $table->string('domicilio_calle', 120)->nullable();
            $table->string('domicilio_numero', 10)->nullable();
            $table->string('domicilio_localidad')->nullable();
            $table->string('dj_a_cargo', 150)->nullable();
            $table->string('dj_parentesco')->nullable();
            $table->boolean('dj_conformidad')->default(false);
            $table->string('justificante_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('historial_licencias', function (Blueprint $table) {
            $table->dropColumn([
                'domicilio_calle',
                'domicilio_numero',
                'domicilio_localidad',
                'dj_a_cargo',
                'dj_parentesco',
                'dj_conformidad',
                'justificante_path',
            ]);
        });
    }
};