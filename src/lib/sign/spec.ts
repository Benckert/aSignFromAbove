import { getFont } from '@/config/carving-fonts';
import { getWood } from '@/config/woods';
import { MACHINE } from '@/config/router-profile';
import { borderInsetMm, type Sign } from './model';
import { letteringPathLengthMm, priceSign } from './pricing';
import { toLines } from './text';

/**
 * Turns a sign into a specification a person can read and work from.
 *
 * This is what actually arrives in the workshop's inbox. The preview image
 * beside it is a picture; this is the document the sign gets cut from, so it
 * states every value explicitly rather than relying on anything being visible.
 *
 * Swedish only, and deliberately so. It is read by one person, in a workshop,
 * in Sweden — translating a cutting list for the benefit of the customer who
 * cannot see it would only introduce a second version to disagree with the
 * first.
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

const HANGING_LABEL: Record<string, string> = {
  none: 'Ingen upphängning',
  keyhole: 'Nyckelhål på baksidan',
  rope: 'Rep genom borrade hål',
  posts: 'Stolpinfästning',
};

const BORDER_LABEL: Record<string, string> = {
  none: 'ingen',
  line: 'enkel linje',
  double: 'dubbel linje',
};

const ALIGN_LABEL: Record<string, string> = {
  left: 'vänsterställd',
  center: 'centrerad',
  right: 'högerställd',
};

function kr(ore: number): string {
  return `${(ore / 100).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr`;
}

export function describeSign(sign: Sign): string {
  const wood = getWood(sign.woodId);
  const price = priceSign(sign);
  const lines: string[] = [];

  lines.push('SKYLT — SPECIFIKATION');
  lines.push('='.repeat(56));
  lines.push('');

  lines.push('ÄMNE');
  lines.push(`  Mått            ${sign.widthMm} × ${sign.heightMm} mm`);
  lines.push(`  Tjocklek        ${sign.thicknessMm} mm`);
  lines.push(`  Form            ${SHAPE_LABEL[sign.shape]}`);
  lines.push(`  Kant            ${EDGE_LABEL[sign.edge]}`);
  lines.push(`  Träslag         ${wood.name.sv} (${wood.latin})`);
  lines.push('');

  lines.push('BEARBETNING');
  lines.push(`  Metod           ${METHOD_LABEL[sign.method]}`);
  lines.push(
    `  Djup            ${sign.method === 'raised' ? MACHINE.reliefDepthMm : MACHINE.carveDepthMm} mm`,
  );
  lines.push(`  Ytbehandling    ${FINISH_LABEL[sign.finish]}`);
  if (sign.finish === 'paint' || sign.finish === 'oilPaint') {
    lines.push(`  Färg            ${sign.paintColour}`);
  }
  lines.push(`  Upphängning     ${HANGING_LABEL[sign.hanging]}`);
  lines.push(`  Ram             ${BORDER_LABEL[sign.border]}`);
  if (sign.border !== 'none') {
    lines.push(`  Ramindrag       ${Math.round(borderInsetMm(sign))} mm från kant`);
  }
  lines.push('');

  lines.push('TEXT');
  const written = sign.blocks.filter((block) => block.text.trim());
  if (written.length === 0) lines.push('  (ingen text)');

  written.forEach((block, index) => {
    const font = getFont(block.fontId);
    const content = toLines(block.text);
    lines.push(`  ${index + 1}. "${content.join(' / ')}"`);
    lines.push(`     Stil         ${font.label}${font.capsOnly ? ' (endast versaler)' : ''}`);
    lines.push(`     Versalhöjd   ${Math.round(block.capHeightMm)} mm`);
    if (content.length > 1) {
      lines.push(
        `     Rader        ${content.length}, radavstånd ${block.lineSpacing.toFixed(2)}×, ${ALIGN_LABEL[block.align]}`,
      );
    }
    lines.push(`     Spärrning    ${(block.trackingEm * 1000).toFixed(0)}/1000 em`);
    /*
      Millimetres from the top-left of the board, to the centre of the block.

      The model this replaces stated a position as a percentage of a notional
      safe area, which meant the workshop had to reconstruct that area before
      the number meant anything — and the area depended on the shape and the
      border. These are the numbers you can measure on the blank with a rule.
    */
    lines.push(
      `     Mitt vid     x ${Math.round(block.xMm)} mm, y ${Math.round(block.yMm)} mm från övre vänstra hörnet`,
    );
    lines.push(
      `     Smalaste     ca ${(block.capHeightMm * font.strokeRatio).toFixed(1)} mm streckbredd`,
    );
  });
  lines.push('');

  lines.push('KALKYL (kontrollera innan bekräftelse)');
  lines.push(`  Material        ${kr(price.materialOre)}`);
  lines.push(`  Uppstart        ${kr(price.setupOre)}`);
  lines.push(`  Fräsning        ${kr(price.carveOre)}  (ca ${price.carveMinutes} min maskintid)`);
  lines.push(`  Efterarbete     ${kr(price.finishingOre)}`);
  lines.push(`  Tillval         ${kr(price.extrasOre)}`);
  if (price.minimumApplied) lines.push('  (minimidebitering tillämpad)');
  lines.push(`  Summa exkl.     ${kr(price.subtotalOre)}`);
  lines.push(`  Moms            ${kr(price.vatOre)}`);
  lines.push(`  ATT BETALA      ${kr(price.totalOre)}`);
  lines.push('');
  lines.push(`  Uppskattad banlängd text: ${Math.round(letteringPathLengthMm(sign))} mm`);

  return lines.join('\n');
}
