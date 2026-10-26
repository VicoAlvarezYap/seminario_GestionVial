<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;
use App\Http\Controllers\Admin\EventoOperativoController;
use App\Http\Controllers\ContactoEmergenciaController;
use App\Http\Controllers\AgenteController;
use App\Http\Controllers\Admin\TurnoTrabajoController;
use App\Http\Controllers\Admin\LugarController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');


    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');
    Route::middleware(['auth'])->group(function () { //Elimina, crea y edita
        Route::post('/admin/eventos-operativos', [EventoOperativoController::class, 'store'])->name('admin.eventos-operativos.store');
        Route::put('/admin/eventos-operativos/{evento}', [EventoOperativoController::class, 'update'])->name('admin.eventos-operativos.update');
        Route::delete('/admin/eventos-operativos/{evento}', [EventoOperativoController::class, 'destroy'])->name('admin.eventos-operativos.destroy');
    });
    Route::middleware(['auth'])->group(function () { 
    Route::post('/admin/turnos', [TurnoTrabajoController::class, 'store'])->name('admin.turnos.store');
    Route::put('/admin/turnos/{turno}', [TurnoTrabajoController::class, 'update'])->name('admin.turnos.update');
    Route::delete('/admin/turnos/{turno}', [TurnoTrabajoController::class, 'destroy'])->name('admin.turnos.destroy');
    });
    //Ruta al perfil
    Route::middleware(['auth'])->group(function () {
        // Vista principal del perfil del agente
        Route::get('/mi-perfil', [AgenteController::class, 'show'])->name('mi-perfil');

        // Gestión de contactos de emergencia
        Route::post('/mi-perfil/contactos', [ContactoEmergenciaController::class, 'store'])->name('contactos.store');
        Route::delete('/mi-perfil/contactos/{contacto}', [ContactoEmergenciaController::class, 'destroy'])->name('contactos.destroy');
    });
    Route::post('lugares', [LugarController::class, 'store'])->name('lugares.store');
});

require __DIR__ . '/settings.php';