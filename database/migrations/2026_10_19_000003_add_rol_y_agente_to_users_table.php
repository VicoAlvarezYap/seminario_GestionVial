<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reemplaza la tabla "usuarios" del diseño original:
     * se reutiliza "users" de Laravel y se le agregan rol, agente y estado.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('rol_id')->nullable()->after('id')
                ->constrained('roles')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('agente_id')->nullable()->unique()->after('rol_id')
                ->constrained('agentes')->nullOnDelete()->cascadeOnUpdate();
            $table->boolean('activo')->default(true)->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rol_id');
            $table->dropConstrainedForeignId('agente_id');
            $table->dropColumn('activo');
        });
    }
};
