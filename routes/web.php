<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;
use App\Http\Controllers\Admin\EventoOperativoController;
use App\Http\Controllers\ContactoEmergenciaController;
use App\Http\Controllers\Admin\AgenteController;
use App\Http\Controllers\Admin\TareaController;
use App\Http\Controllers\Admin\TurnoTrabajoController;
use App\Http\Controllers\Admin\LugarController;
use App\Http\Controllers\LicenciaController;
use App\Http\Controllers\RelevoController;
use App\Http\Controllers\IntervencionController;
use App\Http\Controllers\FichadaController;
use App\Http\Controllers\ReportesTurnoController;
use App\Http\Controllers\Admin\PerfilController;
use App\Http\Controllers\Admin\LicenciaAdminController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');

    Route::middleware('role:admin|super-admin|Administrador')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/perfiles', [PerfilController::class, 'index'])->name('perfiles.index');

        // Licencias de Admin
        Route::get('/licencias', [LicenciaAdminController::class, 'index'])->name('licencias.index');
        Route::get('/licencias/{licencia}/pdf', [LicenciaAdminController::class, 'pdf'])->name('licencias.pdf');
        Route::patch('/licencias/{licencia}/resolver', [LicenciaAdminController::class, 'resolver'])->name('licencias.resolver');
        Route::get('/licencias/{licencia}/justificante', [LicenciaAdminController::class, 'justificante'])->name('licencias.justificante');

        Route::post('agentes', [AgenteController::class, 'store'])->name('agentes.store');

        // CRUDs de administración (Store, Update, Destroy) reducidos con resource
        Route::resource('eventos-operativos', EventoOperativoController::class)->only(['store', 'update', 'destroy']);
        Route::resource('turnos', TurnoTrabajoController::class)->only(['store', 'update', 'destroy']);
        Route::resource('tareas', TareaController::class)->only(['store', 'update', 'destroy']);
    });

    // Fichajes de turnos (
    Route::prefix('turnos/{turno}')->name('turnos.')->group(function () {
        Route::post('iniciar', [FichadaController::class, 'iniciar'])->name('iniciar');
        Route::post('finalizar', [FichadaController::class, 'finalizar'])->name('finalizar');
    });

    // Perfil y Contactos de emergencia
    Route::get('/mi-perfil', [AgenteController::class, 'show'])->name('mi-perfil');
    Route::post('/mi-perfil/contactos', [ContactoEmergenciaController::class, 'store'])->name('contactos.store');
    Route::delete('/mi-perfil/contactos/{contacto}', [ContactoEmergenciaController::class, 'destroy'])->name('contactos.destroy');

    // Licencias del Agente 
    Route::controller(LicenciaController::class)->prefix('licencias')->name('licencias.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{licencia}', 'update')->name('update');
        Route::patch('/{licencia}/cancelar', 'cancelar')->name('cancelar');
        Route::get('/{licencia}/justificante', 'justificante')->name('justificante');
    });

    // Relevos (CRUD simplificado)
    Route::resource('relevos', RelevoController::class)->except(['create', 'edit', 'show']);

    // Intervenciones 
    Route::controller(IntervencionController::class)->prefix('intervenciones')->name('intervenciones.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{intervencion}', 'update')->name('update');
        Route::delete('/{intervencion}', 'destroy')->name('destroy');
    });

     Route::get('/reportes', [ReportesTurnoController::class, 'index'])->name('reportes.index');

    Route::post('lugares', [LugarController::class, 'store'])->name('lugares.store');
});

require __DIR__ . '/settings.php';