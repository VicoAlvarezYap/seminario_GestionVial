<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_reprogramacion', function (Blueprint $table) {
            $table->id();

            $table->foreignId('turno_trabajo_id')
                ->constrained('turnos_trabajo')
                ->cascadeOnDelete();
            $table->foreignId('agente_id')
                ->constrained('agentes')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // cambio_horario = pide otro bloque/horario ese día; tomar_dia = pide no trabajar ese día
            $table->enum('tipo', ['cambio_horario', 'tomar_dia'])->index();

            // Solo para cambio_horario
            $table->enum('nuevo_turno', ['manana', 'tarde', 'noche', 'especial'])->nullable();
            $table->time('nueva_hora_inicio')->nullable();
            $table->time('nueva_hora_fin')->nullable();

            $table->text('motivo');

            $table->enum('estado', ['pendiente', 'aprobada', 'rechazada', 'cancelada'])
                ->default('pendiente')->index();

            // Resolución del administrador
            $table->foreignId('resuelta_por')->nullable()
                ->constrained('agentes')->nullOnDelete();
            $table->timestamp('resuelta_at')->nullable();
            $table->text('comentario_resolucion')->nullable();

            $table->timestamps();

            $table->index(['turno_trabajo_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_reprogramacion');
    }
};