<?php

namespace App\Exports;

use App\Models\EventoOperativo;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventosOperativosExcel
{
    private const TIPOS = [
        'estatico' => 'Estático',
        'movil_itinerante' => 'Móvil / itinerante',
    ];

    public static function descargar(Collection $eventos, string $nombreArchivo): StreamedResponse
    {
        $libro = new Spreadsheet();

        self::hojaEventos($libro->getActiveSheet(), $eventos);
        self::hojaResumen($libro->createSheet(), $eventos);

        $libro->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($libro) {
            (new Xlsx($libro))->save('php://output');
        }, $nombreArchivo, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private static function hojaEventos(Worksheet $hoja, Collection $eventos): void
    {
        $hoja->setTitle('Eventos');

        $filas = $eventos->map(fn (EventoOperativo $e) => [
            Date::dateTimeToExcel($e->fecha_hora_inicio),
            Date::dateTimeToExcel($e->fecha_hora_inicio),
            $e->fecha_hora_fin ? Date::dateTimeToExcel($e->fecha_hora_fin) : '',
            $e->titulo,
            $e->lugar?->nombre ?? '',
            $e->direccion ?? '',
            self::TIPOS[$e->tipo_recorrido] ?? $e->tipo_recorrido,
            self::nombreEstado($e->estado),
            $e->solicitante_ente ?? '',
            $e->solicitante_nombre ?? '',
            $e->solicitante_celular ?? '',
            $e->tipo_recorrido === 'movil_itinerante' ? $e->puntosRecorrido->count() : '',
            $e->descripcion ?? '',
        ])->values()->all();

        HojaExcel::volcar(
            $hoja,
            ['Fecha', 'Inicio', 'Fin', 'Título', 'Lugar', 'Dirección o zona', 'Tipo de recorrido',
                'Estado', 'Solicitante', 'Nombre', 'Celular', 'Puntos de recorrido', 'Descripción'],
            $filas,
            ['A' => 'dd/mm/yyyy', 'B' => 'hh:mm', 'C' => 'hh:mm'],
        );

        // Estado en color: rojo para cancelado o suspendido, verde para finalizado
        foreach ($eventos->values() as $indice => $e) {
            $celda = 'H'.($indice + 2);

            if (in_array($e->estado, ['cancelado', 'suspendido'], true)) {
                $hoja->getStyle($celda)->getFont()->setBold(true)->getColor()->setRGB(HojaExcel::COLOR_ROJO);
            } elseif ($e->estado === 'finalizado') {
                $hoja->getStyle($celda)->getFont()->setBold(true)->getColor()->setRGB(HojaExcel::COLOR_VERDE);
            }
        }
    }

    private static function hojaResumen(Worksheet $hoja, Collection $eventos): void
    {
        $hoja->setTitle('Resumen');

        $filas = $eventos
            ->groupBy(fn (EventoOperativo $e) => $e->estado ?? 'programado')
            ->map(fn (Collection $grupo, string $estado) => [
                self::nombreEstado($estado),
                $grupo->count(),
                $grupo->where('tipo_recorrido', 'movil_itinerante')->count(),
                $grupo->where('tipo_recorrido', 'estatico')->count(),
            ])
            ->values()
            ->all();

        $filas[] = [
            'Total',
            $eventos->count(),
            $eventos->where('tipo_recorrido', 'movil_itinerante')->count(),
            $eventos->where('tipo_recorrido', 'estatico')->count(),
        ];

        HojaExcel::volcar($hoja, ['Estado', 'Cantidad', 'Móviles', 'Estáticos'], $filas);
    }

    private static function nombreEstado(?string $estado): string
    {
        return ucfirst(str_replace('_', ' ', $estado ?? 'programado'));
    }
}