import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Security headers.
 *
 * The Content-Security-Policy is deliberately strict about where fonts and
 * images may come from: no requests may leave the visitor's browser to a third
 * party. That is a GDPR decision as much as a security one — embedding Google
 * Fonts from fonts.gstatic.com transmits the visitor's IP address to a third
 * country without a legal basis, which a German court found unlawful in 2022
 * (LG München I, 3 O 17493/20). All fonts here are self-hosted at build time by
 * `next/font`, so `font-src 'self'` is all we need.
 */
const csp = [
  "default-src 'self'",
  // Next.js injects small inline bootstrap scripts; 'unsafe-inline' is ignored
  // by browsers that support 'strict-dynamic', and required by those that don't.
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  // Tailwind + the wood-grain filters render through inline <style> blocks.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The floating dev badge sits on top of the designer's mobile price bar,
  // which is exactly where it is most in the way while working on that layout.
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
