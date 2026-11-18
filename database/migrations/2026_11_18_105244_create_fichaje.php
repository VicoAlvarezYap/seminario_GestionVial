<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     */
    private string $tablaTurnos = 'turnos_trabajo';
    private string $tablaAgentes = 'agentes';

    public function up(): void
    {
        Schema::create('fichaje', function (Blueprint $table) {
            $table->id();  //id del fichaje     
            $table->foreignId('turno_trabajo_id')
                ->constrained($this->tablaTurnos)
                ->restrictOnDelete(); //conservara el historial

            $table->enum('tipo', ['entrada', 'salida', 'salida_anticipada']);
            $table->timestamp('registrada_at'); //hora del servidor no del dispositivo
            $table->decimal('latitud', 10, 8)->nullable(); //Geolocalizacion 
            $table->decimal('longitud', 11, 8)->nullable();
            $table->unsignedSmallInteger('precision_m')->nullable();   // margen de error del GPS
            $table->boolean('dentro_de_zona')->nullable();
            $table->unsignedInteger('distancia_zona_m')->nullable();
            $table->string('foto_path')->nullable();
            $table->enum('origen', ['web', 'movil'])->default('web');
            $table->string('ip', 45)->nullable(); 
            $table->foreignId('registrada_por') //Permite tener el control de quien lo ingresor
                ->nullable()                    //si fue el agente o el director en forma manual
                ->constrained($this->tablaAgentes)
                ->nullOnDelete();

            $table->string('motivo_correccion')->nullable(); //correcion
            $table->enum('motivo_salida', [
                'enfermedad',
                'emergencia_familiar',
                'autorizado_superior',
                'otro',
            ])->nullable();
            $table->text('observacion')->nullable(); //En el caso de que el agente haya pedido salir 
            $table->enum('estado_revision', ['pendiente', 'justificada', 'injustificada'])->nullable(); //se necesita la autorizacion 
            $table->foreignId('revisada_por')
                ->nullable()
                ->constrained($this->tablaAgentes)
                ->nullOnDelete();
            $table->timestamp('revisada_at')->nullable();
            $table->text('comentario_revision')->nullable();

            $table->timestamps();
            $table->index(['turno_trabajo_id', 'tipo']);
            $table->index(['tipo', 'estado_revision']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fhichaje');
    }
};
