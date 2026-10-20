<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turnos_trabajo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->string('direccion_asignada')->nullable();
            $table->enum('estado_turno', ['programado', 'cumplido', 'ausente', 'cancelado', 'reasignado'])
                ->default('programado');
            $table->text('observaciones')->nullable();

            $table->index(['agente_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnos_trabajo');
    }
};
