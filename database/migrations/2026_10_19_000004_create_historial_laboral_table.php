<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_laboral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->date('fecha_alta');
            $table->date('fecha_baja')->nullable();
            $table->string('motivo_ingreso_egreso')->nullable();
        });

        DB::statement('ALTER TABLE historial_laboral ADD CONSTRAINT chk_hl_fechas CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta)');
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_laboral');
    }
};
