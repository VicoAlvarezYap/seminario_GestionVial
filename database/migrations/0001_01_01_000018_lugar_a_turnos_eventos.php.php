<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::table('eventos_operativos', function (Blueprint $table) {
            // Lugar donde se realiza el evento (si es estático)
            $table->foreignId('lugar_id')->nullable()->after('direccion')
                ->constrained('lugares')->nullOnDelete()->cascadeOnUpdate();
        });

        // Las direcciones de texto ya cargadas en eventos pasan al catálogo
        $this->pasarTextoALugares('eventos_operativos', 'direccion');
    }

    public function down(): void
    {
        Schema::table('eventos_operativos', function (Blueprint $table) {
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
