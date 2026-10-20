<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contactos_emergencia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agente_id')->constrained('agentes')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('nombre', 150);
            $table->string('celular', 30);
            $table->string('relacion', 60)->nullable();
        });

        // Los triggers con SIGNAL solo existen en MySQL/MariaDB (no en SQLite)
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'])) {
            // Máximo 2 contactos de emergencia por agente
            DB::unprepared("
                CREATE TRIGGER trg_contactos_max2_insert
                BEFORE INSERT ON contactos_emergencia
                FOR EACH ROW
                BEGIN
                    IF (SELECT COUNT(*) FROM contactos_emergencia WHERE agente_id = NEW.agente_id) >= 2 THEN
                        SIGNAL SQLSTATE '45000'
                            SET MESSAGE_TEXT = 'Un agente no puede tener mas de 2 contactos de emergencia';
                    END IF;
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_contactos_max2_update
                BEFORE UPDATE ON contactos_emergencia
                FOR EACH ROW
                BEGIN
                    IF NEW.agente_id <> OLD.agente_id
                       AND (SELECT COUNT(*) FROM contactos_emergencia WHERE agente_id = NEW.agente_id) >= 2 THEN
                        SIGNAL SQLSTATE '45000'
                            SET MESSAGE_TEXT = 'Un agente no puede tener mas de 2 contactos de emergencia';
                    END IF;
                END
            ");
        }
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'])) {
            DB::unprepared('DROP TRIGGER IF EXISTS trg_contactos_max2_insert');
            DB::unprepared('DROP TRIGGER IF EXISTS trg_contactos_max2_update');
        }
        Schema::dropIfExists('contactos_emergencia');
    }
};