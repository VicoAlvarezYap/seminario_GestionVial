<?php

namespace App\Mail;

use App\Models\HistorialDeLicencias;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LicenciaResueltaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public HistorialDeLicencias $licencia,
        protected string $pdf,
        public string $resolucion,
        public ?string $comentario = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Licencia '.$this->resolucion.' · '.$this->licencia->tipo_licencia,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.licencias.resuelta',
            with: ['licencia' => $this->licencia, 'resolucion' => $this->resolucion, 'comentario' => $this->comentario],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdf, 'licencia-'.$this->licencia->id.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}