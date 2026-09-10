# A Sign From Above

Website for a one-person woodworking shop in Sweden: hand-routed signs, made to
order, plus one-off furniture.

The centre of the site is a **sign designer** — pick a size, a timber and a
shape, type the wording, choose a face and how it is cut, and watch the sign
being drawn as you go. It produces a fixed price and a specification the
workshop can actually cut from.

> **The business details are placeholders.** Name, address, organisation number,
> VAT number and email addresses are marked `TODO` in `src/config/site.ts` and
> must be filled in before the site goes live — Swedish e-commerce law requires
> them to be directly accessible, and the privacy policy is legally incomplete
> without the controller's identity.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (pricing, geometry, catalogues, translations) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

No environment variables are needed to run it. Without mail credentials,
submitted orders are printed to the terminal instead of being sent, so the whole
flow can be exercised offline. See `.env.example`.

---

## The stack, and why

| Choice | Reason |
| --- | --- |
| **Next.js 16** (App Router) | Static generation for every content page; the designer is a client island. |
| **TypeScript** | The pricing and geometry code is arithmetic on physical measurements — the place types earn their keep. |
| **Tailwind v4** | Design tokens live in `globals.css` under `@theme`; both themes are the same tokens with different values. |
| **next-intl** | Swedish and English with *localised URLs* (`/designa-skylt`, `/en/design-your-sign`) rather than a query string. |
| **Zustand** | The designer's state, persisted to `localStorage` so nobody loses a half-drawn sign. |
| **react-hook-form + Zod** | One schema validates in the browser and again on the server. |
| **SVG, no canvas** | The preview's viewBox is measured in millimetres, so every number in it is a real dimension on the finished board. |

Nothing renders wood from a photograph. The grain, the light and the carved
edges are all SVG filters, which is why changing timber is instant and the page
loads no images at all.

---

## Where things live

```
src/
├── config/            Everything a person would want to change
│   ├── site.ts            Business identity, contact, VAT   ← rename the shop here
│   ├── router-profile.ts  Machine, bits, feeds, shop rate   ← real specs go here
│   ├── woods.ts           Timber catalogue, colours, prices
│   ├── carving-fonts.ts   The faces, and how each behaves under a bit
│   └── fonts.ts           Site typography
├── lib/designer/      The domain: pricing, geometry, validation, export
├── components/        UI, grouped by area
├── content/           Furniture gallery entries
└── app/[locale]/      Routes
messages/              All copy, sv + en
```

### Three files worth knowing about

**`src/config/router-profile.ts`** holds every machine assumption — bit sizes,
feed rates, pass depth, hourly rate, minimum order. **These are development
placeholders**, realistic but invented. Replacing them with the real workshop's
figures is a single edit; nothing downstream hard-codes a feed rate or a price.

**`src/config/carving-fonts.ts`** is the font catalogue with the numbers that
make the designer honest: `strokeRatio` (narrowest stroke as a fraction of cap
height) decides whether a given bit physically fits, and drives the warnings.
Those ratios are read off the outlines by eye — worth re-measuring in CAM once
the real bits are known.

**`src/lib/designer/pricing.ts`** is the price. It is deterministic and works in
integer öre, so the same design always produces the same figure and no price
ever drifts through floating point.

---

## Adding furniture to the gallery

1. Put the photographs in `public/furniture/`.
2. Add an entry to `src/content/furniture.ts` and list the paths in `images`.

Entries with no images render a quiet placeholder rather than a broken frame —
which is what every entry does today. Replace them with real work before launch.

---

## Swedish and EU law

The site was built to comply, and the relevant rules are cited in the code and
in the policies themselves rather than paraphrased.

- **GDPR.** No analytics, no tracking, no third-party cookies, no cookie banner
  — because there is nothing to consent to. Fonts are self-hosted by `next/font`
  at build time, so no visitor's IP address reaches Google.
- **Orders are email only.** Nothing is stored server-side, which is the
  strongest position available: no database to breach, no retention policy to
  enforce in code.
- **Consent is unbundled.** Handling an enquiry and joining a mailing list are
  separate, never pre-ticked boxes.
- **Prices include VAT** (Prisinformationslagen 2004:347).
- **Right of withdrawal.** Custom-made goods are exempt under
  distansavtalslagen (2005:59) 2 kap. 11 § — this is stated on the order form
  and acknowledged separately, not buried in the terms.
- **Three-year complaint right** under konsumentköplagen (2022:260).
- **ARN** is named for disputes. The EU ODR platform is *not* linked: it closed
  on 20 July 2025.
- **Trader information** (name, address, org.nr, VAT) appears in the footer and
  on the contact page, per lagen om elektronisk handel (2002:562).

`localStorage` is used for the in-progress design and the theme choice. Both are
storage strictly necessary for something the visitor asked for, so neither needs
consent — and both are described in the cookie policy anyway.

---

## Accessibility

Semantic landmarks, a skip link, labelled controls with `aria-describedby`
wiring, visible focus rings, `prefers-reduced-motion` respected, the piece
dialog built on native `<dialog>` so the browser handles focus trapping. The
preview is `role="img"` with a description; it is decoration, and the
specification beside it is the real content.

## Still to do

- Real business details in `src/config/site.ts`
- Real machine specs in `src/config/router-profile.ts`
- Photographs of finished furniture
- Mail provider credentials
- A newsletter, when wanted — `site.features.newsletter` gates the UI already
