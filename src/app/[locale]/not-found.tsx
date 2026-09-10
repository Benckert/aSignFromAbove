import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  const t = useTranslations('errors.notFound');

  return (
    <div className="shell flex min-h-[60vh] max-w-xl flex-col justify-center py-20">
      <p className="spec">404</p>
      <h1 className="display mt-3 text-[clamp(1.9rem,4.5vw,2.75rem)]">{t('title')}</h1>
      <p className="prose-workshop mt-4">{t('body')}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="/" variant="primary">
          {t('home')}
        </ButtonLink>
        <ButtonLink href="/designer" variant="secondary">
          {t('designer')}
        </ButtonLink>
      </div>
    </div>
  );
}
