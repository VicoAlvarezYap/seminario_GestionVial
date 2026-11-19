<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lugares', function (Blueprint $table) {
            $table->unsignedSmallInteger('radio_m')->default(150)->after('longitud');
        });
    }

    public function down(): void
    {
        Schema::table('lugares', function (Blueprint $table) {
            $table->dropColumn('radio_m');
        });
    }
};