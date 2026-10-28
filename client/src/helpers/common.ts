/** Items for {@link combineClassNames}: `undefined`, `null` and `false` are dropped. */
export type ClassNameArg = string | undefined | null | false;

/** Non-empty trimmed strings only; returns `undefined` if nothing remains. */
export function combineClassNames(parts: ClassNameArg[]): string | undefined {
  const joined = parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ');
  return joined || undefined;
}

/** `[1]`, `[2][3]` in an answer → {1, 2, 3}. */
export function getCitedNumbers(text: string): Set<number> {
  return new Set([...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
}
