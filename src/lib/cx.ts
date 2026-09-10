/** Joins class names, dropping anything falsy. Deliberately tiny — the project
 *  does not need conditional-class tooling beyond this. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
