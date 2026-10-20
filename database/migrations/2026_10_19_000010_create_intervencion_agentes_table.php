<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intervencion_agentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intervencion_id')->constrained('intervenciones_emergencias')
                ->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('agente_id')->constrained('agentes')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('rol_en_intervencion', 80)->nullable();

            $table->unique(['intervencion_id', 'agente_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intervencion_agentes');
    }
};
