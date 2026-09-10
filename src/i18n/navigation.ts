import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware replacements for next/link and the navigation hooks. Using these
 * means a component can link to the canonical `/designer` and get
 * `/designa-skylt` or `/en/design-your-sign` depending on the active locale.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
