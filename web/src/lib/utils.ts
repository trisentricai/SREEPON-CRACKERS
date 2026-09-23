/** Merge Tailwind classes — falsy values are dropped, later wins on conflicts. */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}