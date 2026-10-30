<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Solicitud de licencia</title>
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
        table.datos td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
        table.datos td.etiqueta { width: 32%; background: #f3f4f6; font-weight: bold; color: #374151; }
        .estado { padding: 3px 10px; font-size: 11px; font-weight: bold; }
        .texto { border: 1px solid #e5e7eb; background: #f9fafb; padding: 10px; line-height: 1.6; }
        .firmas { width: 100%; margin-top: 70px; }
        .firmas td { width: 50%; text-align: center; padding: 0 25px; }
        .linea { border-top: 1px solid #1f2937; padding-top: 5px; font-size: 10px; }
        .pie { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 9px; }
    </style>
</head>
<body>
@php
    $colores = [
        'pendiente' => ['#FEF3C7', '#92400E'],
        'aprobada' => ['#DCFCE7', '#166534'],
        'rechazada' => ['#FEE2E2', '#991B1B'],
        'cancelada' => ['#E5E7EB', '#374151'],
        'finalizada' => ['#DBEAFE', '#1E40AF'],
    ];
    $c = $colores[$d['estado']] ?? ['#E5E7EB', '#374151'];
@endphp

<table class="encabezado">
    <tr>
        <td>
            <h1>Solicitud de licencia</h1>
            <div class="sub">Gestión Vial - Municipalidad de La Merced</div>
        </td>
        <td class="derecha">
            N.º {{ str_pad((string) $d['id'], 5, '0', STR_PAD_LEFT) }}<br>
            Emitido el {{ $generado }}
        </td>
    </tr>
</table>

<h2>Estado</h2>
<span class="estado" style="background: {{ $c[0] }}; color: {{ $c[1] }};">
    {{ strtoupper($d['estado']) }}
</span>

<h2>Datos del agente</h2>
<table class="datos">
    <tr><td class="etiqueta">Apellido y nombre</td><td>{{ $d['agente'] }}</td></tr>
    <tr><td class="etiqueta">DNI</td><td>{{ $d['dni'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">Domicilio</td><td>{{ $d['domicilio'] ?? '-' }}</td></tr>
</table>

<h2>Datos de la licencia</h2>
<table class="datos">
    <tr><td class="etiqueta">Motivo</td><td>{{ $d['tipo_licencia'] }}</td></tr>
    <tr><td class="etiqueta">Desde</td><td>{{ $d['fecha_inicio'] }}</td></tr>
    <tr><td class="etiqueta">Hasta</td><td>{{ $d['fecha_fin'] }}</td></tr>
    <tr><td class="etiqueta">Cantidad de días</td><td>{{ $dias }} {{ $dias === 1 ? 'día' : 'días' }}</td></tr>
    <tr><td class="etiqueta">Justificante adjunto</td><td>{{ $d['tiene_justificante'] ? 'Sí' : 'No' }}</td></tr>
</table>

@if ($d['tipo_licencia'] === 'Familiar enfermo')
    <h2>Declaración jurada por familiar enfermo</h2>
    <div class="texto">
        Declaro bajo juramento ser la única persona a cuyo cargo está
        <b>{{ $d['dj_a_cargo'] ?? '-' }}</b>,
        a quien me une el vínculo de <b>{{ $d['dj_parentesco'] ?? '-' }}</b>.
    </div>
@endif

<h2>Respuesta del administrador</h2>
<div class="texto">
    @if ($d['estado'] === 'pendiente')
        Pendiente de resolución.
    @else
        {{ $d['observaciones'] ?? 'Sin observaciones.' }}
    @endif
</div>

<table class="firmas">
    <tr>
        <td><div class="linea">Firma del agente</div></td>
        <td><div class="linea">Firma y sello de la Dirección</div></td>
    </tr>
</table>

<div class="pie">Documento generado por el sistema Gestión Vial</div>
</body>
</html>