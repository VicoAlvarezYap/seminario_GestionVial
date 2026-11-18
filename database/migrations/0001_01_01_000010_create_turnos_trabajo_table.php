<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('turnos_trabajo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->date('fecha');
            $table->enum('turno', ['manana', 'tarde', 'noche', 'especial']);
            $table->enum('estado_turno', ['programado', 'cumplido', 'ausente', 'cancelado', 'reasignado', 'abandonado'])
                ->default('programado');
            $table->uuid('asignacion_id')->nullable()->index();
            $table->time('hora_inicio_prog')->nullable();
            $table->time('hora_fin_prog')->nullable();
            $table->unsignedSmallInteger('minutos_trabajados')->default(0);
            $table->unsignedSmallInteger('minutos_extra')->default(0);
            $table->unsignedSmallInteger('minutos_tarde')->default(0);
            $table->unsignedSmallInteger('minutos_salida_anticipada')->default(0);
            $table->timestamps();

            $table->unique(['agente_id', 'fecha', 'turno']);
            $table->index(['fecha', 'turno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnos_trabajo');
    }
};
