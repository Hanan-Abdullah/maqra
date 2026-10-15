// The display document returned by GET /api/documents/:id.
// It has the same shape as the skill's document.json (built by merge.js).

export interface Sentence { id: string; text: string; }          // p3.s2
export interface ListItem { id: string; text: string; }          // l1.i4

export interface TextBlock {
  order: number;
  id: string;                    // h1, p3, l2 …
  type: 'heading' | 'paragraph' | 'list';
  text?: string;                 // headings and paragraphs: the whole text
  sentences?: Sentence[];        // paragraphs
  items?: ListItem[];            // lists
  ordered?: boolean;             // lists
}

export interface Occurrence { at: string; start: number; end: number; form?: string; }

export interface Term {
  id: string;
  term: string;
  translation: string | null;
  occurrences: Occurrence[];
  meaning: string;
  explanation: string;
  example: string;
}

export interface Question {
  text: string;
  options: string[];
  answer: number;
  explanation: string;
  sources: string[];
  show?: boolean;
}

export interface ReadingUnit {
  n: number;
  title: string;
  blocks: string[];
  summary?: string;
  showSummary?: boolean;
  wordCount?: number;
  question?: Question;
}

export interface KeyPoint { unit: number; text: string; sources: string[]; }

export type Importance = 'primary' | 'supporting' | 'secondary';

export interface ReadingDocument {
  schemaVersion: string;
  segmenterVersion: string;
  createdAt?: string;
  text: { wordCount: number; blocks: TextBlock[]; };
  analysis: {
    summary: string;
    keyPoints: KeyPoint[];
    readingUnits: ReadingUnit[];
    terms: Term[];
    importance: Record<string, Importance>;
  };
  display?: {
    showImportance?: boolean;
    showSectionSummaries?: boolean;
    showKeyPoints?: boolean;
    showTerms?: boolean;
    showQuestions?: boolean;
  };
}

/** The author's title: the text's first block when it is a heading. */
export function titleBlock(doc: ReadingDocument): TextBlock | null {
  const first = doc.text.blocks[0];
  return first && first.type === 'heading' ? first : null;
}

/** The author's headings inside the text (not the title). */
export function authorSections(doc: ReadingDocument): TextBlock[] {
  const title = titleBlock(doc);
  return doc.text.blocks.filter((b) => b.type === 'heading' && b !== title);
}

/**
 * The page title. The original mode never shows anything the analysis wrote,
 * so without an author's title it says «النص الأصلي».
 */
export function documentTitle(doc: ReadingDocument, original = false): string {
  const author = titleBlock(doc)?.text;
  if (author) return author;
  if (original) return 'النص الأصلي';
  return doc.analysis.readingUnits[0]?.title ?? 'النص';
}

/** True when at least one unit has a summary worth showing (short units hide theirs). */
export function hasUnitSummaries(doc: ReadingDocument): boolean {
  return !!doc.display?.showSectionSummaries && doc.analysis.readingUnits.some((u) => !!u.summary && u.showSummary !== false);
}

/** True when at least one unit has a question worth showing (short units hide theirs). */
export function hasQuestions(doc: ReadingDocument): boolean {
  return !!doc.display?.showQuestions && doc.analysis.readingUnits.some((u) => !!u.question && u.question.show !== false);
}
