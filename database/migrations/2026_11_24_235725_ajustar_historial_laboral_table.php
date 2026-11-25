<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('historial_laboral', function (Blueprint $table) {
            if (! Schema::hasColumn('historial_laboral', 'motivo_ingreso')) {
                $table->string('motivo_ingreso')->nullable();
            }
            if (! Schema::hasColumn('historial_laboral', 'motivo_egreso')) {
                $table->string('motivo_egreso')->nullable();
            }
            if (! Schema::hasColumn('historial_laboral', 'created_at')) {
                $table->timestamps();
            }
        });

        // Pasa el dato viejo a la columna de ingreso, si existía
        if (Schema::hasColumn('historial_laboral', 'motivo_ingreso_egreso')) {
            \DB::statement('UPDATE historial_laboral SET motivo_ingreso = motivo_ingreso_egreso WHERE motivo_ingreso_egreso IS NOT NULL');

            Schema::table('historial_laboral', function (Blueprint $table) {
                $table->dropColumn('motivo_ingreso_egreso');
            });
        }
    }

    public function down(): void
    {
        // No se revierte: la estructura nueva es la correcta
    }
};