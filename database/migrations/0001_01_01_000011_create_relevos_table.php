<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relevos', function (Blueprint $table) {
            $table->id();
            $table->string('tercero_nombre_apellido', 200)->nullable();
            $table->string('tercero_dni', 20)->nullable()->index();
            $table->string('tercero_celular', 30)->nullable();
            $table->string('vehiculo_placa', 15)->nullable()->index();
            $table->string('vehiculo_tipo', 50)->nullable();
            $table->text('motivo_detencion');
            $table->text('personas_implicadas')->nullable();
            $table->boolean('necesito_atencion_policial')->default(false);
            $table->foreignId('agente_id')->constrained('agentes')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('fecha_hora')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relevos');
    }
};
