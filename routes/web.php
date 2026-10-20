<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    
    // Movida aquí adentro para que esté protegida y requiera estar logueado
    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');
});

require __DIR__.'/settings.php';