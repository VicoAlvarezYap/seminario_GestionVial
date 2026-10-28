<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agentes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('apellido', 100);
            $table->string('numero_documento', 20)->unique();
            $table->string('celular', 30)->nullable();
            $table->string('correo', 150)->nullable();
            $table->timestamps();

            $table->index(['apellido', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agentes');
    }
};
