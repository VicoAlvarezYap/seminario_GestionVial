@extends('emails.layout')

@section('content')
    <p>Estimad@ {{ $licencia->agente->nombre }} {{ $licencia->agente->apellido }},</p>

    @if ($resolucion === 'aprobada')
        <p>Le informamos que su solicitud de licencia por <strong>{{ $licencia->tipo_licencia }}</strong>
            del {{ $licencia->fecha_inicio->format('d/m/Y') }} al {{ $licencia->fecha_fin->format('d/m/Y') }}
            fue <strong>aprobada</strong>.</p>
    @else
        <p>Le informamos que su solicitud de licencia por <strong>{{ $licencia->tipo_licencia }}</strong>
            del {{ $licencia->fecha_inicio->format('d/m/Y') }} al {{ $licencia->fecha_fin->format('d/m/Y') }}
            fue <strong>rechazada</strong>.</p>
    @endif

    @if ($comentario)
        <p><strong>Observaciones:</strong> {{ $comentario }}</p>
    @endif

    <p>Encontrará el detalle en el PDF adjunto. Ante cualquier consulta, comuníquese con la Dirección de Tránsito Municipal.</p>
@endsection