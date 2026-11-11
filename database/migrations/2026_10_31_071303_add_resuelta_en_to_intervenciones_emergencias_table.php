<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('intervenciones_emergencias', function (Blueprint $table) {
            $table->dateTime('resuelta_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('intervenciones_emergencias', function (Blueprint $table) {
            $table->dropColumn('resuelta_en');
        });
    }
};