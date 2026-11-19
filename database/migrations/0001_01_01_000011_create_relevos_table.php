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

            // --- Tercero ---
            $table->string('tercero_nombre_apellido', 200)->nullable();
            $table->string('tercero_dni', 20)->nullable()->index();
            $table->string('tercero_celular', 30)->nullable();
            $table->string('tercero_domicilio')->nullable();
            $table->string('tercero_tipo_documento', 20)->nullable();

            // --- Vehículo (datos originales) ---
            $table->string('vehiculo_placa', 15)->nullable()->index();
            $table->string('vehiculo_tipo', 50)->nullable();

            // --- Relevo ---
            $table->text('motivo_detencion');
            $table->text('personas_implicadas')->nullable();
            $table->boolean('necesito_atencion_policial')->default(false);
            $table->foreignId('agente_id')->constrained('agentes')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('fecha_hora')->index();

            // --- Acta de infracción ---
            $table->string('numero_acta', 20)->nullable()->unique();

            // Conductor
            $table->string('conductor_sexo', 1)->nullable();
            $table->string('conductor_localidad', 100)->nullable();
            $table->string('conductor_codigo_postal', 10)->nullable();
            $table->string('conductor_partido', 100)->nullable();
            $table->string('conductor_provincia', 100)->nullable();
            $table->string('conductor_pais', 100)->nullable();
            $table->string('conductor_correo', 150)->nullable();
            $table->boolean('conductor_alternativo')->default(false);

            // Licencia
            $table->string('licencia_numero', 30)->nullable();
            $table->string('licencia_expedida_por', 100)->nullable();
            $table->string('licencia_clase', 20)->nullable();
            $table->date('licencia_vencimiento')->nullable();
            $table->boolean('retuvo_licencia')->default(false);

            // Vehículo (acta)
            $table->string('vehiculo_marca', 60)->nullable();
            $table->string('vehiculo_modelo', 60)->nullable();
            $table->string('vehiculo_linea', 60)->nullable();
            $table->string('vehiculo_interno', 30)->nullable();
            $table->string('vehiculo_otro_dominio', 15)->nullable();
            $table->string('vehiculo_propietario', 200)->nullable();
            $table->unsignedSmallInteger('vehiculo_anio')->nullable();
            $table->boolean('retuvo_vehiculo')->default(false);

            // Propietario
            $table->string('propietario_tipo_documento', 20)->nullable();
            $table->string('propietario_documento', 20)->nullable();
            $table->string('propietario_domicilio', 255)->nullable();
            $table->string('propietario_codigo_postal', 10)->nullable();
            $table->string('propietario_localidad', 100)->nullable();
            $table->string('propietario_provincia', 100)->nullable();
            $table->string('propietario_pais', 100)->nullable();

            // Infracción
            $table->string('ley_decreto', 100)->nullable();
            $table->string('articulo_inciso', 100)->nullable();
            $table->string('codigo_infraccion', 30)->nullable();
            $table->json('infracciones_codigos')->nullable();
            $table->text('descripcion_legal')->nullable();
            $table->string('lugar_infraccion', 255)->nullable();
            $table->string('sentido_circulacion', 60)->nullable();
            $table->string('localidad_infraccion', 100)->nullable();
            $table->text('observaciones')->nullable();

            // Alcoholemia / instrumento
            $table->string('alcoholemia_nivel', 20)->nullable();
            $table->boolean('alcoholemia_agravante')->default(false);
            $table->string('instrumento_equipo', 100)->nullable();
            $table->string('instrumento_modelo', 100)->nullable();
            $table->string('instrumento_serie', 60)->nullable();
            $table->string('instrumento_cod_aprobacion', 60)->nullable();
            $table->string('instrumento_valor', 60)->nullable();
            $table->dateTime('instrumento_fecha_hora')->nullable();
            $table->timestamp('correo_enviado_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relevos');
    }
};