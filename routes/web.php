<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PaginaAgenteController;
use App\Http\Controllers\Admin\AgenteController;
use App\Http\Controllers\ContactoEmergenciaController;
use App\Http\Controllers\LicenciaController;
use App\Http\Controllers\RelevoController;
use App\Http\Controllers\IntervencionController;
use App\Http\Controllers\ReportesTurnoController;
use App\Http\Controllers\Admin\EventoOperativoController;
use App\Http\Controllers\Admin\TareaController;
use App\Http\Controllers\Admin\TurnoTrabajoController;
use App\Http\Controllers\Admin\LugarController;
use App\Http\Controllers\Admin\PerfilController;
use App\Http\Controllers\Admin\LicenciaAdminController;
use App\Http\Controllers\Admin\RelevoAdminController;
use App\Http\Controllers\Admin\IntervencionAdminController;
use App\Http\Controllers\EventoExcelController;
use App\Http\Controllers\EventoController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');

    /* ---------- Administración ---------- */
    Route::middleware('role:admin|super-admin|Administrador', 'modo.admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/perfiles', [PerfilController::class, 'index'])->name('perfiles.index');
        Route::get('/perfiles/{agente}', [AgenteController::class, 'show'])->name('perfiles.show');
        Route::post('/agentes', [AgenteController::class, 'store'])->name('agentes.store');
        //turnos y tareas
        Route::resource('turnos', TurnoTrabajoController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('tareas', TareaController::class)->only(['store', 'update', 'destroy']);
        Route::get('turnos/listado', [TurnoTrabajoController::class, 'listado'])->name('turnos.listado');
        Route::get('turnos/listado/pdf', [TurnoTrabajoController::class, 'listadoPdf']);
        Route::get('/turnos/listado/excel', [TurnoTrabajoController::class, 'listadoExcel'])->name('turnos.listado.excel');
        Route::get('turnos/historial', [TurnoTrabajoController::class, 'historial']);
        Route::get('turnos/{turno}/detalle', [TurnoTrabajoController::class, 'detalle'])->name('turnos.detalle');
        Route::patch('turnos/fichajes/{fichaje}/revision', [TurnoTrabajoController::class, 'revisarFichaje'])->name('turnos.fichajes.revisar');
        Route::post('turnos/jornada', [TurnoTrabajoController::class, 'storeJornada']);
        Route::get('/turnos/tareas', [TurnoTrabajoController::class, 'asignarTareasForm'])->name('turnos.tareas');
        Route::post('/turnos/tareas', [TurnoTrabajoController::class, 'storeTareas'])->name('turnos.tareas.store');

        // Licencias
        Route::get('/licencias', [LicenciaAdminController::class, 'index'])->name('licencias.index');
        Route::get('/licencias/{licencia}/pdf', [LicenciaAdminController::class, 'pdf'])->name('licencias.pdf');
        Route::patch('/licencias/{licencia}/resolver', [LicenciaAdminController::class, 'resolver'])->name('licencias.resolver');
        Route::get('/licencias/{licencia}/justificante', [LicenciaAdminController::class, 'justificante'])->name('licencias.justificante');
        Route::get('/licencias/{licencia}/justificante/descargar', [LicenciaAdminController::class, 'descargarJustificante'])->name('licencias.justificante.descargar');

        // Relevos e intervenciones
        Route::get('/relevos', [RelevoAdminController::class, 'index'])->name('relevos.index');
        Route::get('/relevos/{relevo}/pdf', [RelevoAdminController::class, 'pdf'])->name('relevos.pdf');
        Route::get('/intervenciones', [IntervencionAdminController::class, 'index'])->name('intervenciones.index');
        Route::get('/intervenciones/{intervencion}/pdf', [IntervencionAdminController::class, 'pdf'])->name('intervenciones.pdf');
        //eventos
        Route::resource('eventos-operativos', EventoOperativoController::class)->only(['store', 'update', 'destroy']);
        Route::get('/eventos-operativos/crear', [EventoController::class, 'create'])->name('eventos-operativos.create');
        Route::get('/eventos-operativos/{evento}/editar', [EventoController::class, 'edit'])->name('eventos-operativos.edit');
        Route::patch('/eventos-operativos/{evento}/cancelar', [EventoOperativoController::class, 'cancelar'])->name('eventos-operativos.cancelar');


        //reportes 
        Route::get('/reportes', [ReportesTurnoController::class, 'index'])->name('reportes.index');
    });
    ///pagina principal de los agentes
    Route::get('/pagina_principal', [PaginaAgenteController::class, 'index'])->name('pagina_principal');
    Route::post('/cambiar-modo', [PaginaAgenteController::class, 'cambiarModo'])->name('modo.cambiar');
    // Perfil y contactos de emergencia
    Route::get('/mi-perfil', [AgenteController::class, 'show'])->name('mi-perfil');
    Route::post('/mi-perfil/contactos', [ContactoEmergenciaController::class, 'store'])->name('contactos.store');
    Route::put('/mi-perfil/contactos/{contacto}', [ContactoEmergenciaController::class, 'update'])->name('contactos.update');
    Route::delete('/mi-perfil/contactos/{contacto}', [ContactoEmergenciaController::class, 'destroy'])->name('contactos.destroy');

    //Historial de turno
    Route::get('/mi-historial-turnos', [TurnoTrabajoController::class, 'miHistorial']);

    // Licencias
    Route::controller(LicenciaController::class)->prefix('licencias')->name('licencias.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('/{licencia}', 'update')->name('update');
        Route::patch('/{licencia}/cancelar', 'cancelar')->name('cancelar');
        Route::get('/{licencia}/justificante', 'justificante')->name('justificante');
        Route::get('/{licencia}/pdf', 'pdf')->name('pdf');
        Route::get('/localidades', 'localidades')->name('localidades');
    });

    // Relevos
    Route::resource('relevos', RelevoController::class)->except(['create', 'edit', 'show']);
    Route::get('/relevos/{relevo}/pdf', [RelevoController::class, 'pdf'])->name('relevos.pdf');
    Route::post('/relevos/{relevo}/enviar', [RelevoController::class, 'enviarCorreo'])->name('relevos.enviar');
    // Reportes de turno 
    Route::controller(ReportesTurnoController::class)->prefix('reportes')->name('reportes.')->group(function () {
        Route::get('/', 'misReportes')->name('index');
        Route::get('/pdf', 'pdf')->name('pdf');
        Route::get('/excel', 'excel')->name('excel');
        Route::get('/{reporte}', 'show')->name('show')->where('reporte', '[0-9]+');
    });
    //eventos
    Route::get('/eventos', [EventoController::class, 'index'])->name('eventos.index');
    Route::get('/eventos/{evento}', [EventoController::class, 'show'])->name('eventos.show')->whereNumber('evento');
    Route::get('/eventos/excel', [EventoExcelController::class, 'excel'])->name('eventos.excel');
    // Intervenciones
    Route::controller(IntervencionController::class)->prefix('intervenciones')->name('intervenciones.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/registrar', 'registrar')->name('registrar');
        Route::put('/{intervencion}', 'update')->name('update');
        Route::patch('/{intervencion}/cancelar', 'cancelar')->name('cancelar');
        Route::get('/{intervencion}/pdf', 'pdf')->name('pdf');
        Route::patch('/{intervencion}/informar', 'informar')->name('informar');
    });

    Route::post('/turnos/{turno}/iniciar', [PaginaAgenteController::class, 'iniciar'])->name('turnos.iniciar');
    Route::post('/turnos/{turno}/finalizar', [PaginaAgenteController::class, 'finalizar'])->name('turnos.finalizar');
    Route::post('/turnos/{turno}/abandonar', [PaginaAgenteController::class, 'abandonar'])->name('turnos.abandonar');
    Route::post('lugares', [LugarController::class, 'store'])->name('lugares.store');

});

require __DIR__ . '/settings.php';