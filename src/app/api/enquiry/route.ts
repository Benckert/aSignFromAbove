import { customEnquirySchema } from '@/lib/forms/schemas';
import { handleSubmission } from '@/lib/forms/handler';

const KIND = {
  furniture: 'Möbel',
  sign: 'Skylt utöver det vanliga',
  repair: 'Reparation eller ombyggnad',
  other: 'Annat',
} as const;

const TIMEFRAME = {
  flexible: 'Ingen brådska',
  months: 'Inom några månader',
  date: 'Till ett bestämt datum',
} as const;

const BUDGET = {
  unknown: 'Vet inte än',
  under5: 'Under 5 000 kr',
  '5to15': '5 000–15 000 kr',
  '15to40': '15 000–40 000 kr',
  over40: 'Över 40 000 kr',
} as const;

/**
 * A custom-work enquiry.
 *
 * Deliberately carries no price. A one-off cannot be costed from a form, so
 * this exists to start a conversation rather than to close a sale.
 */
export async function POST(request: Request) {
  return handleSubmission({
    request,
    schema: customEnquirySchema,
    build: (input, ref) => ({
      subject: `Specialbeställning ${ref} — ${KIND[input.kind]} — ${input.name}`,
      text: [
        `SPECIALBESTÄLLNING ${ref}`,
        '',
        `Namn:       ${input.name}`,
        `E-post:     ${input.email}`,
        `Telefon:    ${input.phone || '—'}`,
        `Språk:      ${input.locale}`,
        `Nyhetsbrev: ${input.newsletter ? 'JA — lägg till i listan' : 'nej'}`,
        '',
        `Gäller:     ${KIND[input.kind]}`,
        `Tidsram:    ${TIMEFRAME[input.timeframe]}${input.date ? ` (${input.date})` : ''}`,
        `Budget:     ${BUDGET[input.budget]}`,
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
