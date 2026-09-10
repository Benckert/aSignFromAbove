import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { checkRateLimit, rateLimitKey } from './rate-limit';
import { sendMail, type Mail } from '@/lib/mail/provider';

/**
 * The shared plumbing behind all three forms.
 *
 * Every submission takes the same path: rate limit, parse against the schema,
 * drop anything that tripped the honeypot, build an email, send it. Doing that
 * once here rather than three times means a fix to any of those steps applies
 * everywhere, and the individual routes are left saying only what makes them
 * different.
 */

/** A short, human-quotable reference so a customer can refer to their enquiry. */
export function reference(prefix: string): string {
  const now = new Date();
  const stamp = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

export async function handleSubmission<T extends z.ZodTypeAny>({
  request,
  schema,
  build,
}: {
  request: Request;
  schema: T;
  build: (input: z.infer<T>, reference: string) => Mail;
}): Promise<NextResponse> {
  /* Rate limit before doing any work on the body. */
  const key = await rateLimitKey(request.headers);
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate-limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // The specific failures are useful to us and to nobody else; the client
    // already validated with the same schema, so a failure here is either a bug
    // or someone poking at the endpoint.
    console.warn('Rejected submission:', parsed.error.issues.map((i) => i.path.join('.')));
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const input = parsed.data as z.infer<T> & { website?: string };

  /*
    Honeypot. A bot filled in a field no human can see. Answer exactly as if it
    had worked — telling a bot why it was rejected only helps it try again.
  */
  if (input.website) {
    return NextResponse.json({ ok: true, reference: reference('X') });
  }

  const ref = reference('S');
  const result = await sendMail(build(input, ref));

  if (!result.ok) {
    console.error('Mail send failed:', result.error);
    return NextResponse.json({ ok: false, error: 'send-failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, reference: ref });
}
