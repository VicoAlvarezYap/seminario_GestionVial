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

            // Turno al que pertenece el fichaje
            $table->foreignId('turno_trabajo_id')
                ->constrained('turnos_trabajo')
                ->cascadeOnDelete();

            // Tipo y momento del registro
            $table->enum('tipo', ['entrada', 'salida', 'salida_anticipada']);
            $table->timestamp('registrada_at')->useCurrent();

            // Geolocalización
            $table->decimal('latitud', 10, 8)->nullable();
            $table->decimal('longitud', 11, 8)->nullable();
            $table->unsignedSmallInteger('precision_m')->nullable();
            $table->boolean('dentro_de_zona')->nullable();
            $table->unsignedInteger('distancia_zona_m')->nullable();

            // Evidencia y origen
            $table->string('foto_path')->nullable();
            $table->enum('origen', ['web', 'movil'])->default('web');
            $table->string('ip', 45)->nullable();

            // Quién lo registró (útil cuando lo carga/corrige un supervisor)
            $table->foreignId('registrada_por')
                ->nullable()
                ->constrained('agentes')
                ->nullOnDelete();

            // Correcciones y salidas especiales
            $table->text('motivo_correccion')->nullable();
            $table->text('motivo_salida')->nullable();
            $table->text('observacion')->nullable();

            // Revisión posterior
            $table->enum('estado_revision', ['pendiente', 'justificada', 'injustificada'])->nullable();
            $table->foreignId('revisada_por')
                ->nullable()
                ->constrained('agentes')
                ->nullOnDelete();
            $table->timestamp('revisada_at')->nullable();
            $table->text('comentario_revision')->nullable();

            $table->timestamps();

            // Un solo fichaje de cada tipo por turno (evita fichar dos veces)
            $table->unique(['turno_trabajo_id', 'tipo']);

            // Consultas frecuentes
            $table->index('estado_revision');
            $table->index('dentro_de_zona');
            $table->index('registrada_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fichaje');
    }
};