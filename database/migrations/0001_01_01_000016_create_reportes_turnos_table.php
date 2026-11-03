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
        Schema::create('reportes_turnos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turno_trabajo_id')->unique()
                ->constrained('turnos_trabajo')->cascadeOnDelete();
            // Recursos utilizados
            $table->boolean('vehiculo_oficial')->default(false);
            $table->string('placa', 15)->nullable();
            $table->boolean('radio')->default(false);
            $table->text('novedades')->nullable(); 
            $table->string('otros_equipos')->nullable();


            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reportes_turnos');
    }
};
