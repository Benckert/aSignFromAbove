import { DEFAULT_FONT_ID } from '@/config/carving-fonts';
import { DEFAULT_WOOD } from '@/config/woods';
import type { SignDesign, TextBlock } from './types';

/** Fresh id for a text block. Only needs to be unique within one design. */
export function newBlockId(): string {
  return `t${Math.random().toString(36).slice(2, 9)}`;
}

export function makeTextBlock(overrides: Partial<TextBlock> = {}): TextBlock {
  return {
    id: newBlockId(),
    content: '',
    fontId: DEFAULT_FONT_ID,
    capHeightMm: 40,
    letterSpacing: 0.02,
    lineHeight: 1.5,
    align: 'center',
    wrap: 'straight',
    curvature: 0.35,
    circleRadiusMm: 70,
    x: 0.5,
    y: 0.5,
    ...overrides,
  };
}

/**
 * What a visitor sees the first time they open the designer.
 *
 * It is deliberately already a finished-looking sign rather than a blank board:
 * arriving at an empty canvas with twenty controls is the fastest way to lose
 * someone. They can see what the tool does before they have decided anything.
 */
export function defaultDesign(): SignDesign {
  return {
    widthMm: 400,
    heightMm: 220,
    thicknessMm: 20,
    shape: 'rounded',
    edge: 'chamfer',
    woodId: DEFAULT_WOOD,
    method: 'vcarve',
    finish: 'oil',
    paintColour: '#1d1813',
    texts: [
      makeTextBlock({
        // Sized so the default board is not overflowing the moment it loads —
        // the first thing a visitor sees should be a sign that works.
        content: 'Björkhaga',
        capHeightMm: 34,
        y: 0.42,
      }),
      makeTextBlock({
        content: 'sedan 1953',
        fontId: 'baskerville',
        capHeightMm: 16,
        letterSpacing: 0.12,
        y: 0.7,
      }),
    ],
    artwork: null,
    decoration: { border: 'line', insetMm: 12, corners: 'none' },
    hanging: 'keyhole',
  };
}

export interface Preset {
  id: string;
  name: { sv: string; en: string };
  /** One line on who this is for. */
  blurb: { sv: string; en: string };
  design: SignDesign;
}

/**
 * Starting points. Most people do not want to design a sign from nothing —
 * they want to recognise theirs and change three things.
 */
export const PRESETS: Preset[] = [
  {
    id: 'house',
    name: { sv: 'Husnamn', en: 'House name' },
    blurb: {
      sv: 'Namnet på huset eller gården, med årtal under.',
      en: 'The name of the house or holding, with a date beneath.',
    },
    design: defaultDesign(),
  },
  {
    id: 'welcome',
    name: { sv: 'Välkomstskylt', en: 'Welcome sign' },
    blurb: {
      sv: 'Bågformad text över en bredare bräda. Klassiskt över en dörr.',
      en: 'Arched text across a wider board. The classic over a door.',
    },
    design: {
      ...defaultDesign(),
      widthMm: 500,
      heightMm: 260,
      shape: 'arch',
      woodId: 'ek',
      decoration: { border: 'double', insetMm: 14, corners: 'diamond' },
      texts: [
        makeTextBlock({
          content: 'Välkommen',
          fontId: 'cinzel',
          capHeightMm: 34,
          wrap: 'arcUp',
          curvature: 0.42,
          y: 0.42,
        }),
        makeTextBlock({
          content: 'Stig på',
          fontId: 'dancing',
          capHeightMm: 26,
          y: 0.74,
        }),
      ],
    },
  },
  {
    id: 'cabin',
    name: { sv: 'Stugskylt', en: 'Cabin sign' },
    blurb: {
      sv: 'Tålig furu för utomhusbruk, med rejäl text som syns från vägen.',
      en: 'Hard-wearing pine for outdoors, with lettering that reads from the road.',
    },
    design: {
      ...defaultDesign(),
      widthMm: 600,
      heightMm: 240,
      thicknessMm: 27,
      shape: 'rect',
      edge: 'chamfer',
      woodId: 'furu',
      method: 'vcarve',
      finish: 'paint',
      paintColour: '#26312a',
      hanging: 'posts',
      decoration: { border: 'inset', insetMm: 16, corners: 'none' },
      texts: [
        makeTextBlock({
          content: 'Sjöstugan',
          fontId: 'oswald',
          capHeightMm: 62,
          y: 0.42,
        }),
        makeTextBlock({
          content: 'Familjen Lind',
          fontId: 'oswald',
          capHeightMm: 20,
          letterSpacing: 0.08,
          y: 0.71,
        }),
      ],
    },
  },
  {
    id: 'round',
    name: { sv: 'Rund skylt', en: 'Round sign' },
    blurb: {
      sv: 'Text runt kanten på en oval bricka. Vanlig till kök och verkstad.',
      en: 'Text around the rim of an oval plaque. Common in kitchens and workshops.',
    },
    design: {
      ...defaultDesign(),
      widthMm: 300,
      heightMm: 300,
      shape: 'oval',
      woodId: 'valnot',
      method: 'vcarve',
      finish: 'oil',
      decoration: { border: 'line', insetMm: 10, corners: 'none' },
      hanging: 'rope',
      texts: [
        makeTextBlock({
          content: 'Bageriet',
          fontId: 'cinzel',
          capHeightMm: 22,
          letterSpacing: 0.16,
          wrap: 'circle',
          // A ring is its radius plus a letter in every direction, so this is
          // set from the 216 mm safe area rather than from the 300 mm board.
          circleRadiusMm: 80,
          x: 0.5,
          y: 0.5,
        }),
        makeTextBlock({
          content: 'Est.\n1998',
          fontId: 'baskerville',
          capHeightMm: 24,
          lineHeight: 1.4,
          y: 0.5,
        }),
      ],
    },
  },
];

/** Sizes offered as one-tap choices before anyone touches a slider. */
export const SIZE_PRESETS = [
  { id: 'small', widthMm: 300, heightMm: 150 },
  { id: 'medium', widthMm: 400, heightMm: 220 },
  { id: 'large', widthMm: 600, heightMm: 300 },
  { id: 'wide', widthMm: 800, heightMm: 250 },
  { id: 'square', widthMm: 300, heightMm: 300 },
] as const;
