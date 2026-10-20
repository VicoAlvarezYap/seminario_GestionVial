<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega solo las claves foráneas. Las columnas rol_id y agente_id
     * ya se crean en create_users_table.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('rol_id')->references('id')->on('roles')
                ->restrictOnDelete()->cascadeOnUpdate();
            $table->foreign('agente_id')->references('id')->on('agentes')
                ->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['rol_id']);
            $table->dropForeign(['agente_id']);
        });
    }
};