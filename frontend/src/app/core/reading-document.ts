// The display document returned by GET /api/documents/:id.
// It has the same shape as the skill's document.json (built by merge.js).
// Only the parts used so far are typed; more fields are added as the page grows.

export interface TextBlock {
  order: number;
  id: string; // h1, p3, l2 …
  type: 'heading' | 'paragraph' | 'list';
  text?: string;
}

export interface ReadingUnit {
  n: number;
  title: string;
}

export interface ReadingDocument {
  schemaVersion: string;
  segmenterVersion: string;
  text: {
    wordCount: number;
    blocks: TextBlock[];
  };
  analysis: {
    summary: string;
    readingUnits: ReadingUnit[];
  };
}

// The author's title when the text starts with a heading, otherwise the first unit's title.
export function documentTitle(doc: ReadingDocument): string {
  const first = doc.text.blocks[0];
  if (first && first.type === 'heading' && first.text) return first.text;
  return doc.analysis.readingUnits[0]?.title ?? 'النص';
}
