<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eventos_operativos', function (Blueprint $table) {
            $table->id();
            $table->string('titulo', 200);
            $table->text('descripcion')->nullable();
            $table->dateTime('fecha_hora_inicio')->index();
            $table->dateTime('fecha_hora_fin')->nullable();
            $table->string('direccion')->nullable();
            $table->enum('tipo_recorrido', ['estatico', 'movil_itinerante'])->default('estatico');
            $table->decimal('latitud_inicio', 10, 8)->nullable();
            $table->decimal('longitud_inicio', 11, 8)->nullable();
            $table->decimal('latitud_fin', 10, 8)->nullable();
            $table->decimal('longitud_fin', 11, 8)->nullable();
            $table->string('solicitante_ente', 150)->nullable();
            $table->string('solicitante_nombre', 150)->nullable();
            $table->string('solicitante_celular', 30)->nullable();
            $table->enum('estado', ['programado', 'en_curso', 'finalizado', 'cancelado', 'suspendido'])
                ->default('programado')->index();
            $table->timestamps();
        });

        // SQLite (usado en los tests) no soporta ADD CONSTRAINT

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'])) {
            DB::statement('ALTER TABLE eventos_operativos ADD CONSTRAINT chk_eo_fechas CHECK (fecha_hora_fin IS NULL OR fecha_hora_fin >= fecha_hora_inicio)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos_operativos');
    }
};