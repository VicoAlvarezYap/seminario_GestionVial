<?php

namespace App\Exports;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class HojaExcel
{
    public const COLOR_ENCABEZADO = '3F3F3F';
    public const COLOR_ALTERNO = 'F7F7F7';
    public const COLOR_BORDE = 'D0D0D0';
    public const COLOR_ROJO = 'B00020';
    public const COLOR_VERDE = '1B7F3B';

    /** Escribe encabezado, filas y estilos comunes. */
    public static function volcar(Worksheet $hoja, array $encabezados, array $filas, array $formatos = []): void
    {
        $columnas = count($encabezados);
        $ultimaCol = Coordinate::stringFromColumnIndex($columnas);
        $ultimaFila = count($filas) + 1;

        $hoja->fromArray($encabezados, null, 'A1');

        $hoja->getStyle("A1:{$ultimaCol}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::COLOR_ENCABEZADO]],
        ]);

        if ($filas !== []) {
            $hoja->fromArray($filas, null, 'A2');

            $hoja->getStyle("A1:{$ultimaCol}{$ultimaFila}")->applyFromArray([
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => self::COLOR_BORDE]],
                ],
            ]);

            for ($fila = 3; $fila <= $ultimaFila; $fila += 2) {
                $hoja->getStyle("A{$fila}:{$ultimaCol}{$fila}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB(self::COLOR_ALTERNO);
            }

            foreach ($formatos as $columna => $formato) {
                $hoja->getStyle("{$columna}2:{$columna}{$ultimaFila}")->getNumberFormat()->setFormatCode($formato);
            }
        }

        $hoja->freezePane('A2');
        $hoja->setAutoFilter("A1:{$ultimaCol}{$ultimaFila}");

        for ($i = 1; $i <= $columnas; $i++) {
            $hoja->getColumnDimensionByColumn($i)->setAutoSize(true);
        }
    }
}