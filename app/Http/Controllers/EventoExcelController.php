<?php

namespace App\Http\Controllers;

use App\Exports\EventosOperativosExcel;
use App\Models\EventoOperativo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventoExcelController extends Controller
{
    private const ESTADOS = ['programado', 'en_curso', 'finalizado', 'cancelado', 'suspendido'];
    private const TIPOS = ['estatico', 'movil_itinerante'];

   public function excel(Request $request)
{
    $usuario = $request->user();
    $gestiona = $request->session()->get('modo', $usuario->agente_id ? 'agente' : 'admin') === 'admin'
        && $usuario->hasRole('Administrador');

    $f = $request->validate([
        'desde' => ['nullable', 'date'],
        'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        'agentes' => ['nullable', 'array'],
        'agentes.*' => ['integer', 'exists:agentes,id'],
        'alcance' => ['nullable', 'in:propios,todos'],
        'buscar' => ['nullable', 'string', 'max:100'],
        'estado' => ['nullable', 'in:programado,en_curso,finalizado,cancelado,suspendido'],
    ]);

    $eventos = EventoOperativo::query()
        ->with(['lugar:id,nombre', 'tareas.turno.agente:id,nombre,apellido'])
        ->filtrar($f, $gestiona, $usuario->agente_id)
        ->orderByDesc('fecha_hora_inicio')
        ->get();

    return EventosOperativosExcel::descargar($eventos, 'eventos-'.now()->format('Ymd').'.xlsx');
}
}