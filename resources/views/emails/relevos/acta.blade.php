@extends('emails.layout')

@section('content')
    <p>Estimad@ {{ $relevo->tercero_nombre_apellido }},</p>
    <p>Le notificamos que se labró el acta de infracción N.º <strong>{{ $relevo->numero_acta }}</strong>.
        Encontrará el detalle en el PDF adjunto.</p>
    <p>Si tiene dudas, comuníquese con la Dirección de Tránsito Municipal.</p>
@endsection