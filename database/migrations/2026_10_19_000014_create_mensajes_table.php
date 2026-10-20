<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mensajes', function (Blueprint $table) {
            // agente_id = remitente
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('destinatario_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('asunto', 200);
            $table->text('contenido')->nullable();
            $table->string('archivo_pdf')->nullable();
            $table->dateTime('fecha_hora')->useCurrent()->index();
            $table->boolean('leido')->default(false);

            $table->index(['destinatario_id', 'leido']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mensajes');
    }
};
