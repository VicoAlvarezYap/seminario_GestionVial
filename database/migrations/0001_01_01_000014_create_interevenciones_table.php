<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intervenciones', function (Blueprint $table) {
            $table->id();

            // null = emergencia sin agente de servicio; con valor = surgió dentro de una tarea
            $table->foreignId('tarea_id')->nullable()
                ->constrained('tareas')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('lugar_id')->nullable()
                ->constrained('lugares')->nullOnDelete()->cascadeOnUpdate();

            $table->enum('tipo', ['accidente', 'infraccion', 'emergencia', 'otro'])->index();
            $table->string('tipo_evento', 100)->nullable()
                ->comment('Ej: caida de arbol, anegamiento');
            $table->unsignedSmallInteger('cantidad')->default(1)
                ->comment('Para infracciones: cuántas se detectaron');

            $table->enum('nivel_urgencia', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->enum('estado_resolucion', ['reportada', 'en_curso', 'resuelta', 'derivada', 'cancelada'])
                ->default('reportada')->index();

            $table->string('ubicacion_direccion')->nullable();
            $table->text('descripcion')->nullable();

            $table->foreignId('agente_reporta_id')->nullable()
                ->constrained('agentes')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('fecha_hora')->useCurrent()->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intervenciones');
    }
};