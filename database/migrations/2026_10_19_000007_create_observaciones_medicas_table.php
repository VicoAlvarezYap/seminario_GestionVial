<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observaciones_medicas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->dateTime('fecha_registro')->useCurrent();
            $table->text('descripcion');
            $table->boolean('es_urgente')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observaciones_medicas');
    }
};
