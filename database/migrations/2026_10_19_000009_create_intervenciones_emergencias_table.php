<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intervenciones_emergencias', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_evento', 100)->comment('Ej: caida de arbol, anegamiento');
            $table->enum('nivel_urgencia', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->string('ubicacion_direccion');
            $table->text('descripcion_situacion')->nullable();
            $table->enum('estado_resolucion', ['reportada', 'en_curso', 'resuelta', 'derivada', 'cancelada'])
                ->default('reportada')->index();
            $table->foreignId('agente_reporta_id')->constrained('agentes')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('fecha_hora_reporte')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intervenciones_emergencias');
    }
};
