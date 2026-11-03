<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tareas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turno_trabajo_id')->constrained('turnos_trabajo')->cascadeOnDelete();
            $table->foreignId('lugar_id')->nullable()->constrained('lugares')->nullOnDelete();
            $table->foreignId('evento_operativo_id')->nullable()->constrained('eventos_operativos')->nullOnDelete();
            $table->string('titulo')->nullable();
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->enum('estado', ['programado', 'iniciado', 'en_proceso', 'finalizado'])->default('programado');
            $table->text('detalle')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tareas');
    }
};
