import { enquirySchema } from '@/lib/forms/schemas';
import { handleSubmission } from '@/lib/forms/handler';

const KIND = {
  furniture: 'Möbel',
  sign: 'Skylt utöver det vanliga',
  other: 'Annat',
} as const;

const TIMEFRAME = {
  flexible: 'Ingen brådska',
  months: 'Inom några månader',
  date: 'Till ett bestämt datum',
} as const;

/**
 * Everything that is not a sign configured in the designer: custom work,
 * questions, and anything else someone writes in.
 *
 * Deliberately carries no price and no budget field. A one-off cannot be
 * costed from a form, so this exists to start a conversation.
 */
export async function POST(request: Request) {
  return handleSubmission({
    request,
    schema: enquirySchema,
    build: (input, ref) => ({
      subject: `Förfrågan ${ref} — ${KIND[input.kind]} — ${input.name}`,
      text: [
        `FÖRFRÅGAN ${ref}`,
        '',
        `Namn:       ${input.name}`,
        `E-post:     ${input.email}`,
        `Telefon:    ${input.phone || '—'}`,
        `Språk:      ${input.locale}`,
        `Nyhetsbrev: ${input.newsletter ? 'JA — lägg till i listan' : 'nej'}`,
        '',
        `Gäller:     ${KIND[input.kind]}`,
        `Tidsram:    ${TIMEFRAME[input.timeframe]}${input.date ? ` (${input.date})` : ''}`,
        '',
        'BESKRIVNING',
        input.description,
        '',
        'Svara på det här mejlet för att nå kunden direkt.',
      ].join('\n'),
      replyTo: input.email,
    }),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
