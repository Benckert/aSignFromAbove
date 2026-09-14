import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SignDesigner } from '@/components/sign/SignDesigner';

export const metadata: Metadata = {
  title: 'Rita din skylt',
  // A work in progress living beside the tool it will replace. Nothing here
  // should reach a search result before it is the real designer.
  robots: { index: false, follow: false },
};

export default async function NextDesignerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignDesigner />;
}
