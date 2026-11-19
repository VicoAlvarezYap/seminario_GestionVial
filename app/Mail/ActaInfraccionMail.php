<?php

namespace App\Mail;

use App\Models\Relevos;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ActaInfraccionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Relevos $relevo, protected string $pdf) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Acta de infracción N.º '.$this->relevo->numero_acta,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.relevos.acta',
            with: ['relevo' => $this->relevo],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdf, 'acta-'.$this->relevo->id.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}