<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evento_puntos_recorrido', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evento_id')->constrained('eventos_operativos')
                ->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedSmallInteger('orden');
            $table->decimal('latitud', 10, 8);
            $table->decimal('longitud', 11, 8);
            $table->string('descripcion_referencia')->nullable();

            $table->unique(['evento_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evento_puntos_recorrido');
    }
};
