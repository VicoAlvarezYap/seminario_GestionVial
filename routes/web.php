<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;
use App\Http\Controllers\Admin\EventoOperativoController;
use App\Http\Controllers\ContactoEmergenciaController;
use App\Http\Controllers\AgenteController;
use App\Http\Controllers\Admin\TurnoTrabajoController;
use App\Http\Controllers\Admin\LugarController;
use App\Http\Controllers\LicenciaController;
use App\Http\Controllers\RelevoController;
use App\Http\Controllers\IntervencionController;
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
       
        //licencias
        Route::get('/licencias', [LicenciaController::class, 'index'])->name('licencias.index');
        Route::post('/licencias', [LicenciaController::class, 'store'])->name('licencias.store');
        Route::put('/licencias/{licencia}', [LicenciaController::class, 'update'])->name('licencias.update');
        Route::patch('/licencias/{licencia}/cancelar', [LicenciaController::class, 'cancelar'])->name('licencias.cancelar');
        Route::get('/licencias/{licencia}/justificante', [LicenciaController::class, 'justificante'])->name('licencias.justificante');
       
        //relevos
        Route::get('/relevos', [RelevoController::class, 'index'])->name('relevos.index');
        Route::post('/relevos', [RelevoController::class, 'store'])->name('relevos.store');
        Route::put('/relevos/{relevo}', [RelevoController::class, 'update'])->name('relevos.update');
        Route::delete('/relevos/{relevo}', [RelevoController::class, 'destroy'])->name('relevos.destroy');
       
        //intervencion de emergencia
        Route::get('/intervenciones', [IntervencionController::class, 'index'])->name('intervenciones.index');
        Route::post('/intervenciones', [IntervencionController::class, 'store'])->name('intervenciones.store');
        Route::put('/intervenciones/{intervencion}', [IntervencionController::class, 'update'])->name('intervenciones.update');
        Route::patch('/intervenciones/{intervencion}/cancelar', [IntervencionController::class, 'cancelar'])->name('intervenciones.cancelar');

        // ggestion de contactos de emergencia
        Route::post('/mi-perfil/contactos', [ContactoEmergenciaController::class, 'store'])->name('contactos.store');
        Route::delete('/mi-perfil/contactos/{contacto}', [ContactoEmergenciaController::class, 'destroy'])->name('contactos.destroy');
    });
    Route::post('lugares', [LugarController::class, 'store'])->name('lugares.store');
});

require __DIR__ . '/settings.php';