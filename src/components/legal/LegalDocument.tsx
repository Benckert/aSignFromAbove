import { site } from '@/config/site';

/**
 * Renders one of the legal documents from the message catalogue.
 *
 * The text lives in `messages/`, in both languages, which keeps a policy that
 * has to say the same thing twice from drifting apart. Business details are
 * substituted from `site.ts` at render time so a change of address or company
 * number never leaves a stale figure in a legal notice.
 *
 * The only markup allowed inside a paragraph is **bold**, handled below.
 * Anything richer would mean putting HTML into translation strings, which is
 * how injection bugs and unclosed tags get into legal pages.
 */

export interface LegalSection {
  title: string;
  body: string[];
}

export function LegalDocument({
  title,
  lede,
  sections,
  updated,
}: {
  title: string;
  lede: string;
  sections: LegalSection[];
  updated: string;
}) {
  return (
    <div className="shell py-12 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{title}</h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">{lede}</p>
        <p className="mt-5 text-[0.75rem] text-ink-3">{updated}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
        {/* A contents list, because these documents are read by people looking
            for one specific answer rather than front to back. */}
        <nav aria-label={title} className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex flex-col gap-1.5 border-l border-rule pl-4">
            {sections.map((section, i) => (
              <li key={i}>
                <a
                  href={`#section-${i}`}
                  className="text-[0.875rem] leading-snug text-ink-2 transition hover:text-ink"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose-workshop">
          {sections.map((section, i) => (
            <section key={i} id={`section-${i}`} className="scroll-mt-24">
              <h2>{section.title}</h2>
              {section.body.map((paragraph, j) => (
                <p key={j}>{renderBold(substitute(paragraph))}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Fills the business details in from the one place they are defined. */
function substitute(text: string): string {
  const address = [
    site.contact.address.street,
    `${site.contact.address.postalCode} ${site.contact.address.city}`,
  ].join(', ');

  return text
    .replaceAll('{entity}', site.legal.entityName)
    .replaceAll('{org}', site.legal.organisationNumber)
    .replaceAll('{vat}', site.legal.vatNumber)
    .replaceAll('{address}', address)
    .replaceAll('{email}', site.contact.email)
    .replaceAll('{privacyEmail}', site.contact.privacyEmail)
    .replaceAll('{leadMin}', String(site.leadTimeWeeks.min))
    .replaceAll('{leadMax}', String(site.leadTimeWeeks.max));
}

/** Turns **emphasis** into <strong>, and nothing else. */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
