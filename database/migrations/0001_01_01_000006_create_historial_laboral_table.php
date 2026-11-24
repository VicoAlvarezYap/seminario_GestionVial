<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('historial_laboral', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete(); // ajustá el nombre de la tabla
            $table->date('fecha_alta');
            $table->date('fecha_baja')->nullable();
            $table->string('motivo_ingreso')->nullable();
            $table->string('motivo_egreso')->nullable();
            $table->timestamps();

            $table->index(['agente_id', 'fecha_baja']);
        });
        DB::table('agentes')->orderBy('id')->each(function ($a) {
            DB::table('historial_laboral')->insert([
                'agente_id' => $a->id,
                'fecha_alta' => substr($a->created_at ?? now(), 0, 10),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_laboral');
    }
};