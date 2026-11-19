<?php

namespace App\Exports;

use App\Models\TurnoTrabajo;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TurnosExcel
{
    private const BLOQUES = [
        'manana' => 'Mañana', 'tarde' => 'Tarde', 'noche' => 'Noche', 'especial' => 'Especial',
    ];

    public static function descargar(Collection $turnos, string $nombreArchivo): StreamedResponse
    {
        $libro = new Spreadsheet();

        self::hojaTurnos($libro->getActiveSheet(), $turnos);

        return response()->streamDownload(function () use ($libro) {
            (new Xlsx($libro))->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private static function hojaTurnos(Worksheet $hoja, Collection $turnos): void
    {
        $hoja->setTitle('Turnos');

        $filas = $turnos->map(fn (TurnoTrabajo $t) => [
            Date::dateTimeToExcel($t->fecha),
            self::BLOQUES[$t->turno] ?? $t->turno,
            $t->agente ? "{$t->agente->apellido}, {$t->agente->nombre}" : '',
            $t->hora_inicio_prog ? substr($t->hora_inicio_prog, 0, 5) : '',
            $t->hora_fin_prog ? substr($t->hora_fin_prog, 0, 5) : '',
            ucfirst(str_replace('_', ' ', $t->estado_turno)),
        ])->values()->all();

        HojaExcel::volcar(
            $hoja,
            ['Fecha', 'Turno', 'Agente', 'Desde', 'Hasta', 'Estado'],
            $filas,
            ['A' => 'dd/mm/yyyy'],
        );
    }
}