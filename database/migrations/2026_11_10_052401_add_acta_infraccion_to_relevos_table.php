<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CADENAS = [
        'tercero_tipo_documento' => 20,
        'conductor_sexo' => 1,
        'conductor_localidad' => 100,
        'conductor_codigo_postal' => 10,
        'conductor_partido' => 100,
        'conductor_provincia' => 100,
        'conductor_pais' => 100,
        'conductor_correo' => 150,
        'licencia_numero' => 30,
        'licencia_expedida_por' => 100,
        'licencia_clase' => 20,
        'vehiculo_marca' => 60,
        'vehiculo_modelo' => 60,
        'vehiculo_linea' => 60,
        'vehiculo_interno' => 30,
        'vehiculo_otro_dominio' => 15,
        'vehiculo_propietario' => 200,
        'propietario_tipo_documento' => 20,
        'propietario_documento' => 20,
        'propietario_domicilio' => 255,
        'propietario_codigo_postal' => 10,
        'propietario_localidad' => 100,
        'propietario_provincia' => 100,
        'propietario_pais' => 100,
        'ley_decreto' => 100,
        'articulo_inciso' => 100,
        'codigo_infraccion' => 30,
        'lugar_infraccion' => 255,
        'sentido_circulacion' => 60,
        'localidad_infraccion' => 100,
        'alcoholemia_nivel' => 20,
        'instrumento_equipo' => 100,
        'instrumento_modelo' => 100,
        'instrumento_serie' => 60,
        'instrumento_cod_aprobacion' => 60,
        'instrumento_valor' => 60,
    ];

    private const TEXTOS = ['descripcion_legal', 'observaciones'];

    private const BOOLEANOS = [
        'alcoholemia_agravante',
        'retuvo_licencia',
        'retuvo_vehiculo',
        'conductor_alternativo',
    ];

    private const OTRAS = [
        'numero_acta',
        'licencia_vencimiento',
        'vehiculo_anio',
        'infracciones_codigos',
        'instrumento_fecha_hora',
    ];

    public function up(): void
    {
        Schema::table('relevos', function (Blueprint $table) {
            foreach (self::CADENAS as $columna => $largo) {
                if (! Schema::hasColumn('relevos', $columna)) {
                    $table->string($columna, $largo)->nullable();
                }
            }

            foreach (self::TEXTOS as $columna) {
                if (! Schema::hasColumn('relevos', $columna)) {
                    $table->text($columna)->nullable();
                }
            }

            foreach (self::BOOLEANOS as $columna) {
                if (! Schema::hasColumn('relevos', $columna)) {
                    $table->boolean($columna)->default(false);
                }
            }

            if (! Schema::hasColumn('relevos', 'numero_acta')) {
                $table->string('numero_acta', 20)->nullable()->unique();
            }

            if (! Schema::hasColumn('relevos', 'licencia_vencimiento')) {
                $table->date('licencia_vencimiento')->nullable();
            }

            if (! Schema::hasColumn('relevos', 'vehiculo_anio')) {
                $table->unsignedSmallInteger('vehiculo_anio')->nullable();
            }

            if (! Schema::hasColumn('relevos', 'infracciones_codigos')) {
                $table->json('infracciones_codigos')->nullable();
            }

            if (! Schema::hasColumn('relevos', 'instrumento_fecha_hora')) {
                $table->dateTime('instrumento_fecha_hora')->nullable();
            }
        });
    }

    public function down(): void
    {
        $columnas = [
            ...array_keys(self::CADENAS),
            ...self::TEXTOS,
            ...self::BOOLEANOS,
            ...self::OTRAS,
        ];

        Schema::table('relevos', function (Blueprint $table) use ($columnas) {
            foreach ($columnas as $columna) {
                if (Schema::hasColumn('relevos', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};