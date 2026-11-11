<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('relevos', function (Blueprint $table) {
            $table->string('tercero_domicilio')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('relevos', function (Blueprint $table) {
            $table->dropColumn('tercero_domicilio');
        });
    }
};
