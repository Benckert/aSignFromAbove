import { getFont } from '@/config/carving-fonts';
import { getWood } from '@/config/woods';
import { MACHINE } from '@/config/router-profile';
import type { SignDesign } from './types';
import { priceSign, letteringPathLengthMm } from './pricing';
import { toLines } from './geometry';

/**
 * Turns a design into a specification a person can read and work from.
 *
 * This is what actually arrives in the workshop's inbox. The preview image
 * beside it is a picture; this is the document the sign gets cut from, so it
 * states every value explicitly rather than relying on anything being visible.
 */

const METHOD_LABEL: Record<string, string> = {
  vcarve: 'V-fräst (nedsänkt text, avsmalnande snitt)',
  pocket: 'Urfräst (plan botten)',
  raised: 'Upphöjd text (bakgrunden bortfräst)',
};

const SHAPE_LABEL: Record<string, string> = {
  rect: 'Rektangulär',
  rounded: 'Rundade hörn',
  arch: 'Bågformad överkant',
  oval: 'Oval',
};

const EDGE_LABEL: Record<string, string> = {
  square: 'Skarp kant',
  chamfer: 'Fasad kant',
  roundover: 'Rundad kant',
};

const FINISH_LABEL: Record<string, string> = {
  raw: 'Obehandlad',
  oil: 'Hårdvaxolja',
  paint: 'Färgfyllda bokstäver',
  oilPaint: 'Färgfyllda bokstäver + hårdvaxolja',
};

const PLACEMENT_LABEL: Record<string, string> = {
  indoor: 'Inomhus',
  sheltered: 'Skyddat utomhus (under tak)',
  outdoor: 'Utomhus, oskyddat',
};

const HANGING_LABEL: Record<string, string> = {
  none: 'Ingen upphängning',
  keyhole: 'Nyckelhål på baksidan',
  rope: 'Rep genom borrade hål',
  posts: 'Stolpinfästning',
};

const WRAP_LABEL: Record<string, string> = {
  straight: 'rak',
  arcUp: 'båge uppåt',
  arcDown: 'båge nedåt',
  circle: 'cirkel',
};

const BORDER_LABEL: Record<string, string> = {
  none: 'ingen',
  line: 'enkel linje',
  double: 'dubbel linje',
  inset: 'nedsänkt fält',
  notch: 'bruten linje med skurna hörn',
};

const CORNER_LABEL: Record<string, string> = {
  none: 'inga',
  diamond: 'romb',
  leaf: 'blad',
  drilled: 'borrade punkter',
};

function kr(ore: number): string {
  return `${(ore / 100).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr`;
}

export function describeDesign(design: SignDesign): string {
  const wood = getWood(design.woodId);
  const price = priceSign(design);
  const lines: string[] = [];

  lines.push('SKYLT — SPECIFIKATION');
  lines.push('='.repeat(56));
  lines.push('');

  lines.push('ÄMNE');
  lines.push(`  Mått            ${design.widthMm} × ${design.heightMm} mm`);
  lines.push(`  Tjocklek        ${design.thicknessMm} mm`);
  lines.push(`  Form            ${SHAPE_LABEL[design.shape]}`);
  lines.push(`  Kant            ${EDGE_LABEL[design.edge]}`);
  lines.push(`  Träslag         ${wood.name.sv} (${wood.latin})`);
  lines.push(`  Placering       ${PLACEMENT_LABEL[design.placement]}`);
  lines.push('');

  lines.push('BEARBETNING');
  lines.push(`  Metod           ${METHOD_LABEL[design.method]}`);
  lines.push(
    `  Djup            ${design.method === 'raised' ? MACHINE.reliefDepthMm : MACHINE.carveDepthMm} mm`,
  );
  lines.push(`  Ytbehandling    ${FINISH_LABEL[design.finish]}`);
  if (design.finish === 'paint' || design.finish === 'oilPaint') {
    lines.push(`  Färg            ${design.paintColour}`);
  }
  lines.push(`  Upphängning     ${HANGING_LABEL[design.hanging]}`);
  lines.push('');

  lines.push('TEXT');
  const withContent = design.texts.filter((t) => t.content.trim());
  if (withContent.length === 0) {
    lines.push('  (ingen text)');
  }
  withContent.forEach((block, i) => {
    const font = getFont(block.fontId);
    const content = toLines(block.content);
    lines.push(`  ${i + 1}. "${content.join(' / ')}"`);
    lines.push(`     Stil         ${font.label}${font.capsOnly ? ' (endast versaler)' : ''}`);
    lines.push(`     Versalhöjd   ${Math.round(block.capHeightMm)} mm`);
    if (content.length > 1) {
      lines.push(`     Rader        ${content.length}, radavstånd ${block.lineHeight.toFixed(2)}×`);
    }
    lines.push(`     Spärrning    ${(block.letterSpacing * 1000).toFixed(0)}/1000 em`);
    lines.push(`     Form         ${WRAP_LABEL[block.wrap]}`);
    if (block.wrap === 'circle') {
      lines.push(`     Radie        ${Math.round(block.circleRadiusMm)} mm`);
    }
    lines.push(
      `     Placering    ${(block.x * 100).toFixed(0)} % från vänster, ${(block.y * 100).toFixed(0)} % från överkant`,
    );
    lines.push(
      `     Smalaste     ca ${(block.capHeightMm * font.strokeRatio).toFixed(1)} mm streckbredd`,
    );
  });
  lines.push('');

  lines.push('DEKOR');
  lines.push(`  Ram             ${BORDER_LABEL[design.decoration.border]}`);
  if (design.decoration.border !== 'none') {
    lines.push(`  Indrag          ${design.decoration.insetMm} mm från kant`);
  }
  lines.push(`  Hörn            ${CORNER_LABEL[design.decoration.corners]}`);
  lines.push(`  Egen bild       ${design.artwork ? design.artwork.fileName : 'nej'}`);
  if (design.artwork) {
    lines.push(`                  bredd ${Math.round(design.artwork.widthMm)} mm`);
  }
  lines.push('');

  lines.push('KALKYL (kontrollera innan bekräftelse)');
  lines.push(`  Material        ${kr(price.materialOre)}`);
  lines.push(`  Uppstart        ${kr(price.setupOre)}`);
  lines.push(`  Fräsning        ${kr(price.carveOre)}  (ca ${price.carveMinutes} min maskintid)`);
  lines.push(`  Efterarbete     ${kr(price.finishingOre)}`);
  lines.push(`  Tillval         ${kr(price.extrasOre)}`);
  if (price.minimumApplied) {
    lines.push('  (minimidebitering tillämpad)');
  }
  lines.push(`  Summa exkl.     ${kr(price.subtotalOre)}`);
  lines.push(`  Moms            ${kr(price.vatOre)}`);
  lines.push(`  ATT BETALA      ${kr(price.totalOre)}`);
  lines.push('');
  lines.push(`  Uppskattad banlängd text: ${Math.round(letteringPathLengthMm(design))} mm`);

  return lines.join('\n');
}
