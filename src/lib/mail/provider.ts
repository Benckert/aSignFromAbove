import 'server-only';
import { site } from '@/config/site';

/**
 * Sending mail.
 *
 * Orders arrive as email and are stored nowhere else. That is the whole
 * persistence layer, and it is a deliberate choice rather than a shortcut: a
 * one-person workshop that keeps no customer database has nothing to leak, no
 * retention policy to enforce in code, and no processor agreement to negotiate
 * beyond the one with its mail provider.
 *
 * The provider sits behind this interface so swapping it is one file. With no
 * API key configured — which is the case in development — mail is written to
 * the console instead, so the whole flow can be exercised without sending
 * anything to anyone.
 */

export interface Attachment {
  filename: string;
  /** Base64-encoded contents. */
  content: string;
  contentType: string;
}

export interface Mail {
  subject: string;
  /** Plain text. The workshop reads these on a phone; nobody needs HTML. */
  text: string;
  /** Set to the customer's address so hitting reply answers them directly. */
  replyTo?: string;
  attachments?: Attachment[];
}

export interface SendResult {
  ok: boolean;
  /** Present when the message was actually handed to a provider. */
  id?: string;
  error?: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<SendResult> {
  if (!isConfigured()) return logToConsole(mail);

  try {
    // Imported lazily so the SDK is not pulled into the bundle, or required at
    // all, when the site is running without mail configured.
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM!,
      to: site.contact.ordersEmail,
      subject: mail.subject,
      text: mail.text,
      replyTo: mail.replyTo,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown mail error' };
  }
}

/**
 * The development fallback.
 *
 * Prints everything except the attachment bodies, which are megabytes of
 * base64 and help nobody in a terminal.
 */
function logToConsole(mail: Mail): SendResult {
  const attachments = mail.attachments?.map(
    (a) => `${a.filename} (${a.contentType}, ${Math.round(a.content.length * 0.75 / 1024)} kB)`,
  );

  console.info(
    [
      '',
      '─'.repeat(64),
      'MAIL NOT SENT — no RESEND_API_KEY and MAIL_FROM configured.',
      `To:       ${site.contact.ordersEmail}`,
      `Reply-to: ${mail.replyTo ?? '(none)'}`,
      `Subject:  ${mail.subject}`,
      attachments?.length ? `Files:    ${attachments.join(', ')}` : '',
      '─'.repeat(64),
      mail.text,
      '─'.repeat(64),
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return { ok: true, id: 'console' };
}
