<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Acta de infracción</title>
    <style>
        @page { margin: 30px 36px; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #1f2937; }
        .encabezado { width: 100%; border-bottom: 3px solid #1F3A5F; padding-bottom: 8px; margin-bottom: 8px; }
        .encabezado td { vertical-align: bottom; }
        h1 { margin: 0; font-size: 18px; color: #1F3A5F; }
        .sub { color: #6b7280; font-size: 9px; margin-top: 3px; }
        .derecha { text-align: right; color: #6b7280; font-size: 9px; }
        h2 { font-size: 10px; color: #1F3A5F; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; margin: 11px 0 4px 0; }
        table.datos { width: 100%; border-collapse: collapse; }
        table.datos td { padding: 3px 5px; border: 1px solid #e5e7eb; vertical-align: top; }
        table.datos td.etiqueta { width: 17%; background: #f3f4f6; font-weight: bold; color: #374151; }
        table.lista { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.lista td { padding: 2px 5px; border: 1px solid #e5e7eb; width: 50%; }
        .marca { font-family: 'DejaVu Sans Mono', monospace; font-weight: bold; }
        .texto { border: 1px solid #e5e7eb; background: #f9fafb; padding: 6px; line-height: 1.5; }
        .linea { border-top: 1px solid #1f2937; padding-top: 4px; font-size: 9px; text-align: center; }
        .pie { margin-top: 18px; text-align: center; color: #9ca3af; font-size: 8px; }
    </style>
</head>
<body>
@php
    $infracciones = $infracciones ?? \App\Http\Controllers\RelevoController::INFRACCIONES;
    $alcoholemia = $alcoholemia ?? \App\Http\Controllers\RelevoController::ALCOHOLEMIA;
    $valor = function (string $clave) use ($d) {
        $v = $d[$clave] ?? '';

        if ($v === '' || $v === null) {
            return '-';
        }

        if ($clave === 'licencia_vencimiento') {
            return \Illuminate\Support\Carbon::parse($v)->format('d/m/Y');
        }

        if ($clave === 'instrumento_fecha_hora') {
            return \Illuminate\Support\Carbon::parse($v)->format('d/m/Y H:i');
        }

        return (string) $v;
    };

    $tabla = function (array $campos) use ($valor) {
        $html = '<table class="datos">';

        foreach (array_chunk($campos, 2) as $fila) {
            $html .= '<tr>';

            foreach ($fila as [$etiqueta, $clave]) {
                $html .= '<td class="etiqueta">'.e($etiqueta).'</td><td>'.e($valor($clave)).'</td>';
            }

            if (count($fila) === 1) {
                $html .= '<td class="etiqueta"></td><td></td>';
            }

            $html .= '</tr>';
        }

        return new \Illuminate\Support\HtmlString($html.'</table>');
    };

    $lista = function (array $items, array $activos) {
        $html = '<table class="lista">';

        foreach (array_chunk($items, 2, true) as $fila) {
            $html .= '<tr>';

            foreach ($fila as $codigo => $etiqueta) {
                $marca = in_array($codigo, $activos, true) ? '[X]' : '[&nbsp;&nbsp;]';
                $html .= '<td><span class="marca">'.$marca.'</span> '.e($etiqueta).'</td>';
            }

            if (count($fila) === 1) {
                $html .= '<td></td>';
            }

            $html .= '</tr>';
        }

        return new \Illuminate\Support\HtmlString($html.'</table>');
    };

    $si = fn ($v) => $v ? 'Sí' : 'No';

    $conductor = [
        ['Apellido y nombre', 'tercero_nombre_apellido'],
        ['Tipo de documento', 'tercero_tipo_documento'],
        ['N.º de documento', 'tercero_dni'],
        ['Sexo', 'conductor_sexo'],
        ['Domicilio', 'tercero_domicilio'],
        ['Localidad', 'conductor_localidad'],
        ['Código postal', 'conductor_codigo_postal'],
        ['Partido', 'conductor_partido'],
        ['Provincia', 'conductor_provincia'],
        ['País', 'conductor_pais'],
        ['Teléfono', 'tercero_celular'],
        ['Correo electrónico', 'conductor_correo'],
    ];

    $licencia = [
        ['N.º de licencia', 'licencia_numero'],
        ['Expedida por', 'licencia_expedida_por'],
        ['Clase', 'licencia_clase'],
        ['Vencimiento', 'licencia_vencimiento'],
    ];

    $vehiculo = [
        ['Dominio', 'vehiculo_placa'],
        ['Tipo', 'vehiculo_tipo'],
        ['Marca', 'vehiculo_marca'],
        ['Modelo', 'vehiculo_modelo'],
        ['Año', 'vehiculo_anio'],
        ['Línea', 'vehiculo_linea'],
        ['Interno', 'vehiculo_interno'],
        ['Otro dominio', 'vehiculo_otro_dominio'],
    ];

    $titular = [
        ['Propiedad de', 'vehiculo_propietario'],
        ['Tipo de documento', 'propietario_tipo_documento'],
        ['N.º de documento / CUIT', 'propietario_documento'],
        ['Domicilio', 'propietario_domicilio'],
        ['Código postal', 'propietario_codigo_postal'],
        ['Localidad', 'propietario_localidad'],
        ['Provincia', 'propietario_provincia'],
        ['País', 'propietario_pais'],
    ];

    $legal = [
        ['Descripción legal informada', 'descripcion_legal'],
        ['Ley / Decreto', 'ley_decreto'],
        ['Artículo / inciso', 'articulo_inciso'],
        ['Cód. de infracción', 'codigo_infraccion'],
    ];

    $lugar = [
        ['Lugar (calle, autopista, ruta, km)', 'lugar_infraccion'],
        ['Sentido de circulación', 'sentido_circulacion'],
        ['Localidad', 'localidad_infraccion'],
    ];

    $instrumento = [
        ['Equipo', 'instrumento_equipo'],
        ['Modelo', 'instrumento_modelo'],
        ['N.º de serie', 'instrumento_serie'],
        ['Cód. de aprobación', 'instrumento_cod_aprobacion'],
        ['Valor', 'instrumento_valor'],
        ['Fecha y hora', 'instrumento_fecha_hora'],
    ];

    $alcoholItems = $alcoholemia + [
        'agravante' => 'Agravantes: menores o incapaces a bordo / transporte profesional (Art. 3 inc. 5)',
    ];
    $alcoholActivos = array_values(array_filter([
        $d['alcoholemia_nivel'] ?? null,
        ! empty($d['alcoholemia_agravante']) ? 'agravante' : null,
    ]));
@endphp

<table class="encabezado">
    <tr>
        <td>
            <h1>Acta de infracción</h1>
            <div class="sub">Gestión Vial - Municipalidad de La Merced</div>
        </td>
        <td class="derecha">
            Acta N.º {{ $valor('numero_acta') }}<br>
            Registro interno N.º {{ str_pad((string) $d['id'], 5, '0', STR_PAD_LEFT) }}<br>
            Fecha y hora: {{ $d['fecha_hora'] }}<br>
            Emitido el {{ $generado }}
        </td>
    </tr>
</table>

<h2>Conductor</h2>
{{ $tabla($conductor) }}

<h2>Licencia de conducir</h2>
{{ $tabla($licencia) }}

<h2>Vehículo</h2>
{{ $tabla($vehiculo) }}

<h2>Titular del vehículo</h2>
{{ $tabla($titular) }}

<h2>Infracción (Anexo del Decreto N.º 437/11)</h2>
{{ $tabla($legal) }}
{{ $lista($infracciones, $d['infracciones_codigos'] ?? []) }}

<h2>Lugar de la infracción</h2>
{{ $tabla($lugar) }}

<h2>Alcoholemia (Ley N.º 7846)</h2>
{{ $lista($alcoholItems, $alcoholActivos) }}

<h2>Cinemómetro / alcoholímetro</h2>
{{ $tabla($instrumento) }}

<h2>Boleta de citación del inculpado</h2>
<table class="datos">
    <tr>
        <td class="etiqueta">Retuvo licencia</td><td>{{ $si($d['retuvo_licencia'] ?? false) }}</td>
        <td class="etiqueta">Retuvo vehículo</td><td>{{ $si($d['retuvo_vehiculo'] ?? false) }}</td>
    </tr>
    <tr>
        <td class="etiqueta">Conductor alternativo</td><td>{{ $si($d['conductor_alternativo'] ?? false) }}</td>
        <td class="etiqueta">Intervención policial</td><td>{{ $si($d['necesito_atencion_policial'] ?? false) }}</td>
    </tr>
</table>

<h2>Observaciones / descripción / medidas precautorias</h2>
<div class="texto">{{ ($d['observaciones'] ?? '') !== '' ? $d['observaciones'] : 'Sin observaciones.' }}</div>

<table style="width: 100%; margin-top: 50px;">
    <tr>
        <td style="width: 25%;"></td>
        <td style="width: 50%;">
            <div class="linea">
                Firma del agente<br>
                {{ $d['agente'] }} - DNI {{ $d['agente_dni'] ?? '-' }}
            </div>
        </td>
        <td style="width: 25%;"></td>
    </tr>
</table>

<div class="pie">Documento generado por el sistema Gestión Vial</div>
</body>
</html>