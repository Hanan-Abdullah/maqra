/**
 * Arabic counted nouns. 1 and 2 have their own words; a number whose last two digits are 3–10 takes the plural
 * (5 كلمات، 109 كلمات); 11–99 takes the singular accusative (15 مصطلحًا); 100, 200… take the plain singular.
 */
export function count(n: number, one: string, two: string, few: string, many: string, hundred?: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  if (r >= 3 && r <= 10) return `${n} ${few}`;
  if (r >= 11) return `${n} ${many}`;
  return `${n} ${hundred ?? many}`;
}

/** A date such as «14 أكتوبر 2026» (Gregorian calendar, Western digits). */
export function arabicDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
}
