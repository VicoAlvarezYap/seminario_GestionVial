<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fichaje', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turno_trabajo_id')->constrained('turnos_trabajo')->cascadeOnDelete();
            $table->enum('tipo', ['entrada', 'salida']);
            $table->timestamp('registrada_at')->useCurrent();
            $table->decimal('latitud', 10, 8)->nullable();
            $table->decimal('longitud', 11, 8)->nullable();
            $table->unsignedSmallInteger('precision_m')->nullable();
            $table->boolean('dentro_de_zona')->nullable();
            $table->unsignedInteger('distancia_zona_m')->nullable();
            $table->string('foto_path')->nullable();
            $table->enum('origen', ['web', 'movil'])->default('web');
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->unique(['turno_trabajo_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fichaje');
    }
};