import { getFont } from '@/config/carving-fonts';
import { getWood } from '@/config/woods';
import { BITS, MACHINE } from '@/config/router-profile';
import type { CarveMethod, DesignWarning, SignDesign } from './types';
import { toLines } from './geometry';

/**
 * Checks a design against what the machine and the timber can actually do.
 *
 * The point of this file is to say no before the customer pays, not after.
 * A sign shop that quietly accepts an order for 8 mm script lettering in pine
 * and then delivers an unreadable board has made a customer's problem out of
 * its own. Everything here is surfaced in the designer as it is configured.
 *
 * Severity means:
 *   blocking — the order button is disabled; this cannot be made as specified.
 *   warning  — it can be made, but the result will disappoint. Ordering allowed.
 *   note     — worth knowing; no impact on quality.
 */

/** The bit that would be used to clear material for a given carving method. */
function bitFor(method: CarveMethod) {
  if (method === 'vcarve') return BITS.find((b) => b.id === 'v60')!;
  return BITS.find((b) => b.id === 'em3')!;
}

export function validateDesign(
  design: SignDesign,
  /** Set by the preview once it has measured the laid-out text. */
  measured?: { overflows: boolean },
): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const wood = getWood(design.woodId);

  /* ── Size against the machine ───────────────────────────────────────── */

  if (
    design.widthMm > MACHINE.workAreaMm.width ||
    design.heightMm > MACHINE.workAreaMm.height
  ) {
    warnings.push({
      id: 'size-too-large',
      severity: 'blocking',
      field: 'size',
      message: {
        sv: `Skylten är större än vad fräsen klarar i ett stycke (max ${MACHINE.workAreaMm.width} × ${MACHINE.workAreaMm.height} mm). Hör av dig — större skyltar går att göra i flera delar.`,
        en: `This sign is larger than the machine can cut in one piece (max ${MACHINE.workAreaMm.width} × ${MACHINE.workAreaMm.height} mm). Get in touch — larger signs can be made in sections.`,
      },
    });
  }

  if (
    design.widthMm < MACHINE.minSignMm.width ||
    design.heightMm < MACHINE.minSignMm.height
  ) {
    warnings.push({
      id: 'size-too-small',
      severity: 'blocking',
      field: 'size',
      message: {
        sv: `Minsta storlek är ${MACHINE.minSignMm.width} × ${MACHINE.minSignMm.height} mm.`,
        en: `The smallest size made is ${MACHINE.minSignMm.width} × ${MACHINE.minSignMm.height} mm.`,
      },
    });
  }

  /* ── Lettering against the bit ──────────────────────────────────────── */

  const bit = bitFor(design.method);

  for (const block of design.texts) {
    if (!block.content.trim()) continue;
    const font = getFont(block.fontId);

    // The narrowest stroke this face will have at this size.
    const strokeMm = block.capHeightMm * font.strokeRatio;

    if (strokeMm < bit.minStrokeMm) {
      const neededMm = Math.ceil(bit.minStrokeMm / font.strokeRatio);
      warnings.push({
        id: `stroke-too-thin-${block.id}`,
        severity: design.method === 'vcarve' ? 'warning' : 'blocking',
        field: 'text',
        message: {
          sv: `${font.label} i ${Math.round(block.capHeightMm)} mm ger streck på ca ${strokeMm.toFixed(1)} mm, smalare än fräsen (${bit.label}) kommer ner i. Höj versalhöjden till minst ${neededMm} mm eller välj en kraftigare stil.`,
          en: `${font.label} at ${Math.round(block.capHeightMm)} mm gives strokes of about ${strokeMm.toFixed(1)} mm, narrower than the ${bit.label} bit can enter. Raise the cap height to at least ${neededMm} mm or pick a heavier face.`,
        },
      });
    } else if (block.capHeightMm < font.minCapHeightMm) {
      warnings.push({
        id: `below-min-cap-${block.id}`,
        severity: 'warning',
        field: 'text',
        message: {
          sv: `${font.label} börjar tappa sina detaljer under ${font.minCapHeightMm} mm versalhöjd. Den blir läsbar, men inte skarp.`,
          en: `${font.label} starts losing its detail below ${font.minCapHeightMm} mm cap height. It will be readable, but not crisp.`,
        },
      });
    }

    // Some faces are simply not built for some methods.
    const rating = font.suitability[design.method];
    if (rating === 'caution') {
      warnings.push({
        id: `font-method-${block.id}`,
        severity: 'warning',
        field: 'font',
        message: {
          sv: `${font.label} är inte ett självklart val för den här fräsmetoden. Den går att göra, men ett annat snitt ger ett bättre resultat.`,
          en: `${font.label} is not an obvious choice for this carving method. It can be done, but another method will give a better result.`,
        },
      });
    }

    // Soft timber plus fine detail is the classic disappointment.
    if (wood.machiningFactor < 0.95 && strokeMm < 2.5) {
      warnings.push({
        id: `soft-wood-fine-detail-${block.id}`,
        severity: 'warning',
        field: 'wood',
        message: {
          sv: `Fina detaljer i ${wood.name.sv.toLowerCase()} flisar sig lätt eftersom veden är mjuk. Björk eller lönn håller kanterna betydligt bättre i den här storleken.`,
          en: `Fine detail in ${wood.name.en.toLowerCase()} chips easily because the timber is soft. Birch or maple hold their edges considerably better at this size.`,
        },
      });
    }

    // A script wrapped tightly around a circle collides with itself.
    if (block.wrap === 'circle' && font.category === 'script') {
      const circumference = 2 * Math.PI * block.circleRadiusMm;
      const rough = toLines(block.content).join('').length * block.capHeightMm * 0.62;
      if (rough > circumference * 0.9) {
        warnings.push({
          id: `circle-crowded-${block.id}`,
          severity: 'warning',
          field: 'text',
          message: {
            sv: 'Texten går nästan runt hela cirkeln och bokstäverna börjar växa ihop. Öka radien eller korta texten.',
            en: 'The text nearly closes the circle and the letters are starting to run together. Increase the radius or shorten the text.',
          },
        });
      }
    }
  }

  /* ── Placement against timber and finish ────────────────────────────── */

  if (design.placement === 'outdoor' && !wood.outdoorSuitable) {
    warnings.push({
      id: 'wood-not-outdoor',
      severity: 'warning',
      field: 'wood',
      message: {
        sv: `${wood.name.sv} håller inte i väder och vind utan mycket underhåll. För en skylt som ska sitta ute rekommenderas ek eller furu.`,
        en: `${wood.name.en} will not survive the weather without a great deal of upkeep. For a sign that lives outside, oak or pine is the sound choice.`,
      },
    });
  }

  if (design.placement === 'outdoor' && design.finish === 'raw') {
    warnings.push({
      id: 'raw-outdoor',
      severity: 'note',
      field: 'method',
      message: {
        sv: 'Obehandlat trä ute grånar med tiden. Många vill ha det så — men säg till om du hellre vill behålla den ljusa tonen.',
        en: 'Untreated timber outdoors goes silver-grey over time. Plenty of people want exactly that — but say so if you would rather keep the fresh tone.',
      },
    });
  }

  if (design.placement === 'outdoor' && design.method === 'raised') {
    warnings.push({
      id: 'raised-outdoor',
      severity: 'note',
      field: 'method',
      message: {
        sv: 'Upphöjda bokstäver samlar vatten på ovansidan. Fräst text står emot väder bättre på en utomhusskylt.',
        en: 'Raised letters collect water on their upper faces. Carved-in text stands up to weather better on an outdoor sign.',
      },
    });
  }

  /* ── Content ────────────────────────────────────────────────────────── */

  const hasText = design.texts.some((b) => b.content.trim().length > 0);
  if (!hasText && !design.artwork) {
    warnings.push({
      id: 'empty',
      severity: 'blocking',
      field: 'text',
      message: {
        sv: 'Skriv en text eller lägg till en bild innan du beställer.',
        en: 'Add some text or a piece of artwork before ordering.',
      },
    });
  }

  if (measured?.overflows) {
    warnings.push({
      id: 'overflow',
      severity: 'warning',
      field: 'text',
      message: {
        sv: 'Texten går utanför den yta som säkert kan fräsas. Minska versalhöjden, korta texten eller gör skylten bredare.',
        en: 'The text runs outside the area that can safely be carved. Reduce the cap height, shorten the text, or make the sign wider.',
      },
    });
  }

  return warnings;
}

export function hasBlockingWarning(warnings: DesignWarning[]): boolean {
  return warnings.some((w) => w.severity === 'blocking');
}
