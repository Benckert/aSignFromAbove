'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('errors.general');

  useEffect(() => {
    // Server-side logging only; nothing is sent to a third-party error service,
    // which would mean shipping a tracking script to every visitor.
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[60vh] max-w-xl flex-col justify-center py-20">
      <h1 className="display text-[clamp(1.9rem,4.5vw,2.75rem)]">{t('title')}</h1>
      <p className="prose-workshop mt-4">{t('body')}</p>
      <Button variant="primary" size="lg" onClick={reset} className="mt-7 sm:self-start">
        {t('retry')}
      </Button>
    </div>
  );
}
