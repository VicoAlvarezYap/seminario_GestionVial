<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;
use App\Http\Controllers\Admin\EventoOperativoController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    
    
    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');
    Route::middleware(['auth'])->prefix('admin')->as('admin.')->group(function () { //Redireccion una vez que se guarda o edita un evento
    Route::resource('eventos-operativos', EventoOperativoController::class)->except(['create', 'show', 'edit']);
    });
});

require __DIR__.'/settings.php';