<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE turnos_trabajo MODIFY estado_turno ENUM(
            'programado','en_curso','cumplido','ausente','cancelado','reasignado','abandonado'
        ) NOT NULL DEFAULT 'programado'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE turnos_trabajo MODIFY estado_turno ENUM(
            'programado','cumplido','ausente','cancelado','reasignado'
        ) NOT NULL DEFAULT 'programado'");
    }
};