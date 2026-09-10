import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { fontVariables } from '@/config/fonts';
import { site } from '@/config/site';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeScript } from '@/components/layout/ThemeToggle';
import { SetupNotice } from '@/components/layout/SetupNotice';
import { Toaster } from '@/components/ui/Toaster';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  const tagline = site.brand.tagline[locale === 'en' ? 'en' : 'sv'];

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.brand.name} — ${tagline}`,
      template: `%s — ${site.brand.name}`,
    },
    description: t('lede'),
    applicationName: site.brand.name,
    openGraph: {
      type: 'website',
      siteName: site.brand.shortName,
      title: `${site.brand.name} — ${tagline}`,
      description: t('lede'),
      locale: locale === 'en' ? 'en_GB' : 'sv_SE',
    },
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages: { sv: '/', en: '/en' },
    },
    // No third-party verification tags, no analytics: nothing here reaches out.
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Lets the whole tree render statically rather than opting into dynamic
  // rendering the first time a translation is read.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} data-theme="warm" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <SetupNotice />
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
