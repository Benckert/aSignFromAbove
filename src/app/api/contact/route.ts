import { contactSchema } from '@/lib/forms/schemas';
import { handleSubmission } from '@/lib/forms/handler';

export async function POST(request: Request) {
  return handleSubmission({
    request,
    schema: contactSchema,
    build: (input, ref) => ({
      subject: `Meddelande ${ref} — ${input.subject}`,
      text: [
        `MEDDELANDE FRÅN SAJTEN ${ref}`,
        '',
        `Namn:       ${input.name}`,
        `E-post:     ${input.email}`,
        `Telefon:    ${input.phone || '—'}`,
        `Språk:      ${input.locale}`,
        `Nyhetsbrev: ${input.newsletter ? 'JA — lägg till i listan' : 'nej'}`,
        '',
        `Ämne:       ${input.subject}`,
        '',
        input.message,
        '',
        'Svara på det här mejlet för att nå avsändaren direkt.',
      ].join('\n'),
      replyTo: input.email,
    }),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
