<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_licencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('tipo_licencia', 80);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->enum('estado', ['pendiente', 'aprobada', 'rechazada', 'cancelada', 'finalizada'])
                ->default('pendiente');
            $table->text('observaciones')->nullable();

            $table->index(['fecha_inicio', 'fecha_fin']);
        });

        DB::statement('ALTER TABLE historial_licencias ADD CONSTRAINT chk_lic_fechas CHECK (fecha_fin >= fecha_inicio)');
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_licencias');
    }
};
