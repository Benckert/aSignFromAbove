import { describe, expect, it } from 'vitest';
import sv from '../../messages/sv.json';
import en from '../../messages/en.json';

/**
 * A missing translation in next-intl surfaces as the raw key on the page, which
 * is the kind of thing that ships unnoticed. This walks both catalogues and
 * insists they have exactly the same shape.
 */

type Node = string | number | boolean | null | Node[] | { [key: string]: Node };

function paths(node: Node, prefix = ''): string[] {
  if (Array.isArray(node)) return node.flatMap((v, i) => paths(v, `${prefix}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

/** ICU placeholders such as {name}, ignoring escaped braces. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)[^}]*\}/g)].map((m) => m[1]).sort();
}

function flatten(node: Node, prefix = ''): Record<string, string> {
  if (Array.isArray(node)) {
    return Object.assign({}, ...node.map((v, i) => flatten(v, `${prefix}[${i}]`)));
  }
  if (node && typeof node === 'object') {
    return Object.assign(
      {},
      ...Object.entries(node).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)),
    );
  }
  return { [prefix]: String(node) };
}

describe('message catalogues', () => {
  const svPaths = paths(sv as Node).sort();
  const enPaths = paths(en as Node).sort();

  it('define exactly the same keys', () => {
    const missingInEn = svPaths.filter((p) => !enPaths.includes(p));
    const missingInSv = enPaths.filter((p) => !svPaths.includes(p));
    expect({ missingInEn, missingInSv }).toEqual({ missingInEn: [], missingInSv: [] });
  });

  it('use the same ICU placeholders in both languages', () => {
    const svFlat = flatten(sv as Node);
    const enFlat = flatten(en as Node);
    const mismatched: string[] = [];
    for (const key of Object.keys(svFlat)) {
      const a = placeholders(svFlat[key]);
      const b = placeholders(enFlat[key] ?? '');
      if (a.join(',') !== b.join(',')) mismatched.push(key);
    }
    expect(mismatched).toEqual([]);
  });

  it('has no empty strings', () => {
    const empty = Object.entries(flatten(sv as Node))
      .concat(Object.entries(flatten(en as Node)))
      .filter(([, v]) => v.trim() === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('does not leave English text sitting in the Swedish catalogue', () => {
    // A crude but effective check for copy-paste: identical long strings in
    // both files almost always mean one was never translated.
    const svFlat = flatten(sv as Node);
    const enFlat = flatten(en as Node);
    const identical = Object.keys(svFlat).filter(
      (k) => svFlat[k].length > 45 && svFlat[k] === enFlat[k],
    );
    expect(identical).toEqual([]);
  });
});
