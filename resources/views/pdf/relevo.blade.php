<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Acta de relevo</title>
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
        .texto { border: 1px solid #e5e7eb; background: #f9fafb; padding: 10px; line-height: 1.6; }
        .firmas { width: 100%; margin-top: 70px; }
        .firmas td { width: 50%; text-align: center; padding: 0 25px; }
        .linea { border-top: 1px solid #1f2937; padding-top: 5px; font-size: 10px; }
        .pie { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 9px; }
    </style>
</head>
<body>
<table class="encabezado">
    <tr>
        <td>
            <h1>Acta de relevo</h1>
            <div class="sub">Gestión Vial - Municipalidad de La Merced</div>
        </td>
        <td class="derecha">
            N.º {{ str_pad((string) $d['id'], 5, '0', STR_PAD_LEFT) }}<br>
            Emitida el {{ $generado }}
        </td>
    </tr>
</table>

<h2>Datos del operativo</h2>
<table class="datos">
    <tr><td class="etiqueta">Fecha y hora</td><td>{{ $d['fecha_hora'] }}</td></tr>
    <tr><td class="etiqueta">Agente interviniente</td><td>{{ $d['agente'] }} (DNI {{ $d['agente_dni'] ?? '-' }})</td></tr>
    <tr><td class="etiqueta">Intervención policial</td><td>{{ $d['policial'] ? 'Sí, se requirió' : 'No se requirió' }}</td></tr>
</table>

<h2>Persona relevada</h2>
<table class="datos">
    <tr><td class="etiqueta">Apellido y nombre</td><td>{{ $d['persona'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">DNI</td><td>{{ $d['dni'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">Domicilio</td><td>{{ $d['domicilio'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">Celular</td><td>{{ $d['celular'] ?? '-' }}</td></tr>
</table>

<h2>Vehículo</h2>
<table class="datos">
    <tr><td class="etiqueta">Tipo</td><td>{{ $d['tipo_vehiculo'] ?? '-' }}</td></tr>
    <tr><td class="etiqueta">Placa</td><td>{{ $d['placa'] ?? '-' }}</td></tr>
</table>

<h2>Infracción constatada</h2>
<div class="texto">{{ $d['motivo'] }}</div>

@if (!empty($d['personas_implicadas']))
    <h2>Otras personas implicadas</h2>
    <div class="texto">{{ $d['personas_implicadas'] }}</div>
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