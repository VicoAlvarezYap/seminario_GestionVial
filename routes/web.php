<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});
Route::inertia('pagina_agente', 'Pagina_Agente/index')->name('pagina_agente');

require __DIR__.'/settings.php';
