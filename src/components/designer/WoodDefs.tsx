import type { Wood } from '@/config/woods';
import type { CarveMethod } from '@/lib/designer/types';

/**
 * The SVG filters and gradients that make a rectangle look like a piece of
 * timber with something cut into it.
 *
 * All of it is generated in the browser. There are no photographs of wood
 * anywhere on this site, which means the preview costs nothing to load, never
 * tiles visibly, and changes species instantly rather than swapping an image.
 *
 * ── How the grain works ───────────────────────────────────────────────────
 * `feTurbulence` with a deliberately lopsided `baseFrequency` produces noise
 * that varies quickly down the board and slowly across it — which is exactly
 * what growth rings look like from the face. That noise is then pushed through
 * a gamma curve to separate it into distinct darker bands rather than a soft
 * fog, and finally tinted with the species' own latewood colour.
 *
 * ── How a cut looks ───────────────────────────────────────────────────────
 * A carved letter reads as carved because of where the light falls: the wall
 * facing the light is bright, the wall facing away is dark. Each filter below
 * builds those two edges by offsetting the letter's own alpha channel in
 * opposite directions and keeping only the sliver that does not overlap.
 * Reversing which edge is light turns a cut letter into a raised one, which is
 * why the raised and engraved filters are near mirror images.
 */

interface Props {
  wood: Wood;
  method: CarveMethod;
  /** Unique per preview instance so two previews on one page cannot collide. */
  uid: string;
}

export function WoodDefs({ wood, method, uid }: Props) {
  // Bevel width in millimetres. A V-carved letter has a visibly wider bevel
  // than a flat-bottomed pocket, because its walls slope.
  const bevel = method === 'vcarve' ? 1.1 : method === 'pocket' ? 0.5 : 0.9;

  return (
    <defs>
      {/* ── Grain ─────────────────────────────────────────────────────── */}
      <filter id={`${uid}-grain`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          /*
            Slow across the board, quick down it: growth rings seen on a
            flat-sawn face. Few octaves on purpose — piling them up turns
            distinct rings into a smear, which is what fake wood looks like.
          */
          baseFrequency="0.0055 0.16"
          numOctaves="3"
          seed="11"
          result="noise"
        />
        {/* Keep only the red channel, as alpha, discarding the colour. */}
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  1 0 0 0 0"
          result="mono"
        />
        {/*
          A steep gamma pushes the midtones apart, which is what turns an even
          fog into rings with edges. Then a slight horizontal smear, because
          grain is continuous along the length of a board and never dotty.
        */}
        <feComponentTransfer in="mono" result="banded">
          <feFuncA type="gamma" exponent="3.4" amplitude="1.15" offset="-0.05" />
        </feComponentTransfer>
        <feGaussianBlur in="banded" stdDeviation="1.4 0.12" />
      </filter>

      {/* A second, finer pass for the pores and ray fleck of open-grained
          species. Only drawn where the species warrants it. */}
      <filter id={`${uid}-pores`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9 0.35"
          numOctaves="2"
          seed="29"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  1 0 0 0 0"
        />
        <feComponentTransfer>
          <feFuncA type="gamma" exponent="5" />
        </feComponentTransfer>
        {/* Pores are short dashes following the grain, not round dots. */}
        <feGaussianBlur stdDeviation="0.9 0.05" />
      </filter>

      {/* Light falling across the board from the top-left, plus the slight
          darkening every real board has towards its edges. */}
      <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0.75" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.02" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
      </linearGradient>

      <radialGradient id={`${uid}-vignette`} cx="0.5" cy="0.45" r="0.75">
        <stop offset="55%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
      </radialGradient>

      {/* ── Engraved: light on the lower-right wall of the cut ─────────── */}
      <filter id={`${uid}-engrave`} x="-20%" y="-20%" width="140%" height="140%">
        <feOffset in="SourceAlpha" dx={bevel} dy={bevel} result="shifted" />
        <feComposite in="SourceAlpha" in2="shifted" operator="out" result="upperEdge" />
        <feGaussianBlur in="upperEdge" stdDeviation={bevel * 0.28} result="upperSoft" />
        <feFlood floodColor="#000000" floodOpacity="0.55" result="darkFlood" />
        <feComposite in="darkFlood" in2="upperSoft" operator="in" result="darkEdge" />

        <feOffset in="SourceAlpha" dx={-bevel} dy={-bevel} result="shiftedBack" />
        <feComposite in="SourceAlpha" in2="shiftedBack" operator="out" result="lowerEdge" />
        <feGaussianBlur in="lowerEdge" stdDeviation={bevel * 0.28} result="lowerSoft" />
        <feFlood floodColor="#ffffff" floodOpacity="0.42" result="lightFlood" />
        <feComposite in="lightFlood" in2="lowerSoft" operator="in" result="lightEdge" />

        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="darkEdge" />
          <feMergeNode in="lightEdge" />
        </feMerge>
      </filter>

      {/* ── Raised: the mirror image, plus a shadow cast onto the ground ── */}
      <filter id={`${uid}-raise`} x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow
          dx={bevel * 1.5}
          dy={bevel * 1.5}
          stdDeviation={bevel * 0.9}
          floodColor="#000000"
          floodOpacity="0.42"
          result="cast"
        />
        <feOffset in="SourceAlpha" dx={-bevel} dy={-bevel} result="shifted" />
        <feComposite in="SourceAlpha" in2="shifted" operator="out" result="lowerEdge" />
        <feFlood floodColor="#000000" floodOpacity="0.3" result="darkFlood" />
        <feComposite in="darkFlood" in2="lowerEdge" operator="in" result="darkEdge" />

        <feOffset in="SourceAlpha" dx={bevel} dy={bevel} result="shiftedBack" />
        <feComposite in="SourceAlpha" in2="shiftedBack" operator="out" result="upperEdge" />
        <feFlood floodColor="#ffffff" floodOpacity="0.5" result="lightFlood" />
        <feComposite in="lightFlood" in2="upperEdge" operator="in" result="lightEdge" />

        <feMerge>
          <feMergeNode in="cast" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="darkEdge" />
          <feMergeNode in="lightEdge" />
        </feMerge>
      </filter>

      {/* ── Painted letters: flat colour, with just enough edge to read as
             sitting inside a cut rather than printed on top. ────────────── */}
      <filter id={`${uid}-painted`} x="-20%" y="-20%" width="140%" height="140%">
        <feOffset in="SourceAlpha" dx="0.45" dy="0.45" result="shifted" />
        <feComposite in="SourceAlpha" in2="shifted" operator="out" result="upperEdge" />
        <feFlood floodColor="#000000" floodOpacity="0.35" result="darkFlood" />
        <feComposite in="darkFlood" in2="upperEdge" operator="in" result="darkEdge" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="darkEdge" />
        </feMerge>
      </filter>

      {/* The shallow shadow a chamfered or rounded edge casts on itself. */}
      <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.26" />
      </linearGradient>

      {/* Hardwax oil deepens the colour and adds a faint sheen. */}
      <linearGradient id={`${uid}-oil`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={wood.colour.dark} stopOpacity="0.2" />
        <stop offset="50%" stopColor={wood.colour.dark} stopOpacity="0.08" />
        <stop offset="100%" stopColor={wood.colour.dark} stopOpacity="0.24" />
      </linearGradient>
    </defs>
  );
}
