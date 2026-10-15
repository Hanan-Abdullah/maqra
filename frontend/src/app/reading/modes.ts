import { ReadingDocument, hasQuestions, hasUnitSummaries } from '../core/reading-document';

export type Mode = 'original' | 'easy' | 'margin';

export const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: 'original', label: 'النص الأصلي', icon: 'book-open-01' },
  { id: 'easy', label: 'العرض الميسّر', icon: 'sparkles' },
  { id: 'margin', label: 'النص والحواشي', icon: 'sticky-note-01' },
];

/** The mode a reader sees first. */
export const DEFAULT_MODE: Mode = 'easy';

export function isMode(value: unknown): value is Mode {
  return value === 'original' || value === 'easy' || value === 'margin';
}

/** The line under the title: names only what this text actually shows. */
export function leadFor(mode: Mode, doc: ReadingDocument): string {
  if (mode === 'original') return 'النص كما كتبه صاحبه، بلا أي تعديل على كلماته، في تنسيق مريح للقراءة.';
  const d = doc.display ?? {};
  const many = doc.analysis.readingUnits.length > 1;
  const terms = doc.analysis.terms.length > 0 && d.showTerms !== false;
  const summaries = hasUnitSummaries(doc);
  const and = (xs: string[]) => xs.join(' و');
  if (mode === 'easy') {
    const xs: string[] = [];
    if (summaries) xs.push('ملخصات');
    if (d.showImportance) xs.push('تمييز للمهم');
    if (terms) xs.push('شرح للمصطلحات');
    if (hasQuestions(doc)) xs.push(many ? 'أسئلة لاختبار الفهم' : 'سؤال لاختبار الفهم');
    if (!xs.length) return many ? 'النص مقسّمًا إلى وحدات، مع خلاصته.' : 'النص مع خلاصته.';
    return (many ? 'النص مقسّمًا إلى وحدات، مع ' : 'النص مع ') + and(xs) + '.';
  }
  const notes: string[] = [];
  if (terms) notes.push('شروح المصطلحات');
  if (summaries) notes.push('ملخصات الوحدات');
  return notes.length ? 'النص في المتن، و' + and(notes) + ' في الحواشي بجانبه.' : 'النص في المتن مع خلاصته.';
}
