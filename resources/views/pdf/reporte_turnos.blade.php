<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Reporte de turnos</title>
    <style>
        @page { margin: 36px 40px; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #000; }
        h1 { font-size: 15px; margin: 0; }
        .sub { font-size: 9px; color: #666; margin-top: 2px; }
        hr { border: 0; border-top: 1px solid #999; margin: 8px 0 12px; }
        .reporte { border: 1px solid #ccc; margin-bottom: 12px; }
        .cab { background: #f2f2f2; padding: 6px 8px; font-size: 11px; font-weight: bold; }
        .gris { color: #666; font-weight: normal; }
        .bloque { padding: 6px 8px; border-top: 1px solid #e5e5e5; }
        .titulo { font-size: 8px; text-transform: uppercase; color: #666; letter-spacing: .6px; margin-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 4px; border-bottom: 1px solid #eee; vertical-align: top; }
        .vacio { color: #888; font-style: italic; }
        .ok { color: #1b7f3b; font-weight: bold; }
        .cancelada { color: #b00020; font-weight: bold; }
    </style>
</head>
<body>
@php
    $nombresTurno = ['manana' => 'Mañana', 'tarde' => 'Tarde', 'noche' => 'Noche', 'especial' => 'Especial'];
    $nombresTipo = ['accidente' => 'Accidente', 'infraccion' => 'Infracción', 'emergencia' => 'Emergencia', 'otro' => 'Otro'];
    $hora = fn ($iso) => $iso ? \Carbon\Carbon::parse($iso)->format('H:i') : '—';
@endphp

<h1>Reporte de turnos</h1>
<div class="sub">Gestión Vial - Municipalidad de La Merced · Agente: {{ $agente }} · Período: {{ $desde }} al {{ $hasta }}</div>
<div class="sub">Generado el {{ $generado }}</div>
<hr>

@forelse ($reportes as $r)
    <div class="reporte">
        <div class="cab">
            {{ \Carbon\Carbon::parse($r['fecha'])->format('d/m/Y') }}
            <span class="gris">· Turno {{ $nombresTurno[$r['turno']] ?? $r['turno'] }}
                @if ($agente === 'Todos') · {{ $r['agente'] }} @endif
            </span>
        </div>

        @if (in_array('horario', $secciones))
            <div class="bloque">
                <div class="titulo">Horario</div>
                Inicio: {{ $hora($r['inicio_real']) }} · Fin: {{ $hora($r['fin_real']) }}
            </div>
        @endif

        @if (in_array('tareas', $secciones))
            <div class="bloque">
                <div class="titulo">Tareas</div>
                <table>
                    @forelse ($r['tareas'] as $t)
                        <tr>
                            <td style="width: 35%"><b>{{ $t['titulo'] ?? 'Sin título' }}</b></td>
                            <td class="gris">
                                {{ $t['lugar'] }}
                                {{ $t['hora_inicio'] ? '· '.$t['hora_inicio'].($t['hora_fin'] ? '–'.$t['hora_fin'] : '') : '' }}
                                @if ($t['detalle']) <br>{{ $t['detalle'] }} @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td class="vacio">Sin tareas cargadas.</td></tr>
                    @endforelse
                </table>
            </div>
        @endif

        @if (in_array('intervenciones', $secciones))
            <div class="bloque">
                <div class="titulo">Intervenciones</div>
                <table>
                    @forelse ($r['intervenciones'] as $i)
                        <tr>
                            <td style="width: 35%">
                                <b>{{ $nombresTipo[$i['tipo']] ?? $i['tipo'] }}</b>{{ $i['tipo_evento'] ? ' · '.$i['tipo_evento'] : '' }}
                            </td>
                            <td class="gris">{{ $i['hora'] }} {{ $i['lugar'] ? '· '.$i['lugar'] : '' }}</td>
                            <td style="width: 14%">
                                @if ($i['estado'] === 'cancelada')
                                    <span class="cancelada">Cancelada</span>
                                @elseif ($i['estado'] === 'resuelta')
                                    <span class="ok">Resuelta</span>
                                @else
                                    <span class="gris">{{ ucfirst(str_replace('_', ' ', $i['estado'])) }}</span>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td class="vacio">Sin intervenciones durante el turno.</td></tr>
                    @endforelse
                </table>
            </div>
        @endif

        @if (in_array('recursos', $secciones))
            <div class="bloque">
                <div class="titulo">Recursos</div>
                {{ $r['vehiculo_oficial'] ? 'Vehículo oficial'.($r['placa'] ? ' ('.$r['placa'].')' : '') : 'Sin vehículo oficial' }}
                · {{ $r['radio'] ? 'Radio sí' : 'Radio no' }}
                @if ($r['otros_equipos']) · {{ $r['otros_equipos'] }} @endif
            </div>
        @endif

        @if (in_array('novedades', $secciones))
            <div class="bloque">
                <div class="titulo">Novedades</div>
                @if ($r['novedades']) {{ $r['novedades'] }} @else <span class="vacio">Sin novedades.</span> @endif
            </div>
        @endif
    </div>
@empty
    <p class="vacio">No hay turnos en el período elegido.</p>
@endforelse
</body>
</html>