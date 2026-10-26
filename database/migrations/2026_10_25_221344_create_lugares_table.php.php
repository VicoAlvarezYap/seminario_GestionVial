<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Catálogo de lugares reutilizables: "Plaza principal", "Colegio X", sede de un evento, etc.
        Schema::create('lugares', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150)->unique();
            $table->string('tipo', 50)->nullable()->comment('Ej: Plaza Principal, Esc. Dr Mariano Moreno,  Avenida Hipolito Yrigoyen');
            $table->string('direccion')->nullable();
            $table->decimal('latitud', 10, 8)->nullable();
            $table->decimal('longitud', 11, 8)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lugares');
    }
};
