<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turnos_trabajo', function (Blueprint $table) {
            // Lugar donde trabaja el agente (sale del catálogo "lugares")
            $table->foreignId('lugar_id')->nullable()->after('hora_fin')
                ->constrained('lugares')->nullOnDelete()->cascadeOnUpdate();

            // Identifica los turnos que se crearon juntos en una misma asignación
            // (cada agente sigue teniendo su propia fila). Sirve para editar o borrar el grupo.
            $table->uuid('asignacion_id')->nullable()->after('lugar_id')->index();
        });

        Schema::table('eventos_operativos', function (Blueprint $table) {
            // Lugar donde se realiza el evento (si es estático)
            $table->foreignId('lugar_id')->nullable()->after('direccion')
                ->constrained('lugares')->nullOnDelete()->cascadeOnUpdate();
        });

        // Los textos que ya estaban cargados pasan al catálogo, para no perder datos
        $this->pasarTextoALugares('turnos_trabajo', 'direccion_asignada');
        $this->pasarTextoALugares('eventos_operativos', 'direccion');
    }

    public function down(): void
    {
        Schema::table('eventos_operativos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lugar_id');
        });

        Schema::table('turnos_trabajo', function (Blueprint $table) {
            $table->dropIndex(['asignacion_id']);
            $table->dropColumn('asignacion_id');
            $table->dropConstrainedForeignId('lugar_id');
        });
    }

    /** Crea un lugar por cada texto distinto y lo vincula a las filas que lo usaban. */
    private function pasarTextoALugares(string $tabla, string $columna): void
    {
        $textos = DB::table($tabla)
            ->whereNotNull($columna)
            ->where($columna, '!=', '')
            ->distinct()
            ->pluck($columna);

        foreach ($textos as $texto) {
            $nombre = mb_substr(trim($texto), 0, 150);

            $lugarId = DB::table('lugares')->where('nombre', $nombre)->value('id')
                ?? DB::table('lugares')->insertGetId([
                    'nombre' => $nombre,
                    'direccion' => $texto,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table($tabla)->where($columna, $texto)->update(['lugar_id' => $lugarId]);
        }
    }
};
