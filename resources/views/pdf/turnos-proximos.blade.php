@php
    use Illuminate\Support\Carbon;

    $nombres = ['manana' => 'Mañana', 'tarde' => 'Tarde', 'noche' => 'Noche', 'especial' => 'Especial'];
    $fechaLarga = fn ($f) => ucfirst(Carbon::parse($f)->locale('es')->translatedFormat('l j \d\e F \d\e Y'));
@endphp

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Turnos próximos</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #666; margin-bottom: 14px; line-height: 1.5; }
        h2 { font-size: 12px; margin: 14px 0 6px; padding: 5px 8px; background: #eee; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        th { font-size: 10px; color: #666; }
        .col-turno { width: 20%; }
        .col-horario { width: 22%; }
        .vacio { color: #666; margin-top: 20px; }
        .pie { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #888; text-align: right; }
    </style>
</head>
<body>
    <h1>Turnos próximos</h1>
    <div class="meta">
        Del {{ Carbon::parse($desde)->format('d/m/Y') }} al {{ Carbon::parse($hasta)->format('d/m/Y') }}<br>
        @if ($agente)
            Agente: {{ $agente->apellido }}, {{ $agente->nombre }}
        @else
            Todos los agentes
        @endif
    </div>

    @forelse ($turnos as $fecha => $items)
        <h2>{{ $fechaLarga($fecha) }}</h2>
        <table>
            <thead>
                <tr>
                    <th class="col-turno">Turno</th>
                    <th class="col-horario">Horario</th>
                    <th>Agentes</th>
                </tr>
            </thead>
            <tbody>
                @foreach (['manana', 'tarde', 'noche', 'especial'] as $bloque)
                    @php
                        $delBloque = $items->where('turno', $bloque)->sortBy(fn ($t) => $t['agente']->apellido);
                        $primero = $delBloque->first();
                    @endphp
                    @if ($primero)
                        @php
                            $ini = substr($primero['hora_inicio_prog'] ?: ($horarios[$bloque][0] ?? ''), 0, 5);
                            $fin = substr($primero['hora_fin_prog'] ?: ($horarios[$bloque][1] ?? ''), 0, 5);
                        @endphp
                        <tr>
                            <td>{{ $nombres[$bloque] }}</td>
                            <td>{{ $ini && $fin ? "$ini a $fin" : '' }}</td>
                            <td>
                                @foreach ($delBloque as $t)
                                    {{ $t['agente']->apellido }}, {{ $t['agente']->nombre }}<br>
                                @endforeach
                            </td>
                        </tr>
                    @endif
                @endforeach
            </tbody>
        </table>
    @empty
        <p class="vacio">No hay turnos asignados en el rango elegido.</p>
    @endforelse

    <div class="pie">Generado el {{ $generado->format('d/m/Y H:i') }}</div>
</body>
</html>