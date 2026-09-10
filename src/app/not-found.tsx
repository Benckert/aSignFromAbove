import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * A request that never matched the locale segment at all — a malformed URL, or
 * a path the proxy did not rewrite. There is no locale to render a message in,
 * so send them to the default language's home page rather than showing an
 * unstyled framework error.
 */
export default function RootNotFound() {
  redirect(`/${routing.defaultLocale}`);
}
