<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Informe de intervención</title>
    <style>
        @page { margin: 40px 45px; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1f2937; }
        .encabezado { width: 100%; border-bottom: 3px solid #1F3A5F; padding-bottom: 10px; margin-bottom: 18px; }
        .encabezado td { vertical-align: bottom; }
        h1 { margin: 0; font-size: 20px; color: #1F3A5F; }
        .sub { color: #6b7280; font-size: 10px; margin-top: 3px; }
        .derecha { text-align: right; color: #6b7280; font-size: 10px; }
        h2 { font-size: 12px; color: #1F3A5F; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 18px 0 8px 0; }
        table.datos { width: 100%; border-collapse: collapse; }
        table.datos td, table.datos th { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; text-align: left; }
        table.datos td.etiqueta { width: 32%; background: #f3f4f6; font-weight: bold; color: #374151; }
        table.datos th { background: #1F3A5F; color: #fff; font-size: 10px; }
        .insignia { padding: 3px 10px; font-size: 11px; font-weight: bold; }
        .texto { border: 1px solid #e5e7eb; background: #f9fafb; padding: 10px; line-height: 1.6; }
        .firmas { width: 100%; margin-top: 70px; }
        .firmas td { width: 50%; text-align: center; padding: 0 25px; }
        .linea { border-top: 1px solid #1f2937; padding-top: 5px; font-size: 10px; }
        .pie { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 9px; }
    </style>
</head>
<body>
@php
    $colorEstado = [
        'reportada' => ['#FEF3C7', '#92400E'],
        'en_curso' => ['#DBEAFE', '#1E40AF'],
        'resuelta' => ['#DCFCE7', '#166534'],
        'derivada' => ['#EDE9FE', '#5B21B6'],
        'cancelada' => ['#E5E7EB', '#374151'],
    ];
    $colorUrgencia = [
        'baja' => ['#DCFCE7', '#166534'],
        'media' => ['#FEF3C7', '#92400E'],
        'alta' => ['#FFEDD5', '#9A3412'],
        'critica' => ['#FEE2E2', '#991B1B'],
    ];
    $nombreUrgencia = ['baja' => 'Baja', 'media' => 'Media', 'alta' => 'Alta', 'critica' => 'Crítica'];
    $ce = $colorEstado[$d['estado_resolucion']] ?? ['#E5E7EB', '#374151'];
    $cu = $colorUrgencia[$d['nivel_urgencia']] ?? ['#E5E7EB', '#374151'];
@endphp

<table class="encabezado">
    <tr>
        <td>
            <h1>Informe de intervención</h1>
            <div class="sub">Gestión Vial - Municipalidad de La Merced</div>
        </td>
        <td class="derecha">
            N.º {{ str_pad((string) $d['id'], 5, '0', STR_PAD_LEFT) }}<br>
            Emitido el {{ $generado }}
        </td>
    </tr>
</table>

<h2>Datos de la emergencia</h2>
<table class="datos">
    <tr><td class="etiqueta">Tipo de evento</td><td>{{ $d['tipo_evento'] }}</td></tr>
    <tr>
        <td class="etiqueta">Nivel de urgencia</td>
        <td><span class="insignia" style="background: {{ $cu[0] }}; color: {{ $cu[1] }};">{{ strtoupper($nombreUrgencia[$d['nivel_urgencia']] ?? $d['nivel_urgencia']) }}</span></td>
    </tr>
    <tr><td class="etiqueta">Ubicación</td><td>{{ $d['ubicacion_direccion'] }}</td></tr>
    <tr>
        <td class="etiqueta">Estado</td>
        <td><span class="insignia" style="background: {{ $ce[0] }}; color: {{ $ce[1] }};">{{ strtoupper(str_replace('_', ' ', $d['estado_resolucion'])) }}</span></td>
    </tr>
</table>

<h2>Tiempos</h2>
<table class="datos">
    <tr><td class="etiqueta">Reportada</td><td>{{ $d['fecha_hora'] }}</td></tr>
    <tr><td class="etiqueta">Resuelta</td><td>{{ $d['resuelta_en'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">Tiempo de respuesta</td><td>{{ $d['tiempo_respuesta'] ?? '-' }}</td></tr>
</table>

<h2>Agente que reportó</h2>
<table class="datos">
    <tr><td class="etiqueta">Apellido y nombre</td><td>{{ $d['reportante'] }}</td></tr>
    <tr><td class="etiqueta">DNI</td><td>{{ $d['reportante_dni'] ?? '-' }}</td></tr>
</table>

<h2>Descripción de la situación</h2>
<div class="texto">{{ $d['descripcion_situacion'] ?? 'Sin descripción.' }}</div>

<h2>Agentes intervinientes</h2>
@if (count($d['participantes']) > 0)
    <table class="datos">
        <thead>
            <tr><th style="width: 60%">Agente</th><th>Rol en la intervención</th></tr>
        </thead>
        <tbody>
        @foreach ($d['participantes'] as $p)
            <tr><td>{{ $p['nombre'] }}</td><td>{{ $p['rol'] ?? '-' }}</td></tr>
        @endforeach
        </tbody>
    </table>
@else
    <div class="texto">No hay agentes asignados.</div>
@endif

<table class="firmas">
    <tr>
        <td><div class="linea">Firma del agente</div></td>
        <td><div class="linea">Firma y sello de la Dirección</div></td>
    </tr>
</table>

<div class="pie">Documento generado por el sistema Gestión Vial</div>
</body>
</html>