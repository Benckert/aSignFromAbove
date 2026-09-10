import { signOrderSchema } from '@/lib/forms/schemas';
import { handleSubmission } from '@/lib/forms/handler';
import { describeDesign } from '@/lib/designer/spec';
import { priceSign } from '@/lib/designer/pricing';
import { site } from '@/config/site';

/**
 * A sign order.
 *
 * The email carries three things: who to reply to, the written specification
 * generated from the design, and a picture of the preview as an attachment.
 *
 * The price is recalculated here from the design rather than trusted from the
 * request. The client shows a figure, but the figure that reaches the workshop
 * must be the one the pricing engine produces from the design as submitted —
 * otherwise anyone could post their own number.
 */
export async function POST(request: Request) {
  return handleSubmission({
    request,
    schema: signOrderSchema,
    build: (input, ref) => {
      const price = priceSign(input.design);
      const attachments = [];

      if (input.previewPng) {
        attachments.push({
          filename: `${ref}-forhandsvisning.png`,
          content: input.previewPng.replace(/^data:image\/png;base64,/, ''),
          contentType: 'image/png',
        });
      }

      if (input.design.artwork) {
        // Attached as a file and never inlined anywhere, so it stays inert.
        attachments.push({
          filename: `${ref}-${input.design.artwork.fileName.replace(/[^\w.-]/g, '_')}`,
          content: Buffer.from(input.design.artwork.svg, 'utf8').toString('base64'),
          contentType: 'image/svg+xml',
        });
      }

      const lines = [
        `SKYLTFÖRFRÅGAN ${ref}`,
        '',
        `Namn:      ${input.name}`,
        `E-post:    ${input.email}`,
        `Telefon:   ${input.phone || '—'}`,
        `Leverans:  ${input.delivery === 'pickup' ? 'Hämtas i verkstaden' : 'Skickas'}`,
        input.address ? `Adress:    ${input.address}` : '',
        `Språk:     ${input.locale}`,
        `Nyhetsbrev: ${input.newsletter ? 'JA — lägg till i listan' : 'nej'}`,
        '',
        input.message ? `MEDDELANDE\n${input.message}\n` : '',
        describeDesign(input.design),
        '',
        `Pris att bekräfta: ${(price.totalOre / 100).toLocaleString('sv-SE')} kr inkl. moms.`,
        '',
        'Kunden har informerats om att specialtillverkade varor saknar ångerrätt',
        'när tillverkningen påbörjats, och har bekräftat detta.',
        '',
        `Svara på det här mejlet för att nå kunden direkt.`,
      ];

      return {
        subject: `Skylt ${ref} — ${input.name} — ${(price.totalOre / 100).toLocaleString('sv-SE')} kr`,
        text: lines.filter((l) => l !== '').join('\n'),
        replyTo: input.email,
        attachments,
      };
    },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Referenced so the module fails loudly if the contact config is ever removed.
void site.contact.ordersEmail;
