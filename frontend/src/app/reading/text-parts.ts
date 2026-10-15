import { ReadingDocument, ReadingUnit, TextBlock } from '../core/reading-document';

/** A piece of a sentence: plain text, or a term the reader can open. */
export interface TextPart { text: string; termId?: string; first?: boolean; }

/**
 * Splits every sentence and list item into parts around its term occurrences.
 * `first` marks a term's first appearance in the whole text (shown more strongly).
 */
export function sentenceParts(doc: ReadingDocument): Map<string, TextPart[]> {
  const occ = new Map<string, { start: number; end: number; id: string }[]>();
  for (const t of doc.analysis.terms) {
    for (const o of t.occurrences) {
      if (!occ.has(o.at)) occ.set(o.at, []);
      occ.get(o.at)!.push({ start: o.start, end: o.end, id: t.id });
    }
  }
  const seen = new Set<string>();
  const out = new Map<string, TextPart[]>();
  const split = (id: string, text: string) => {
    const list = (occ.get(id) ?? []).slice().sort((a, b) => a.start - b.start);
    const parts: TextPart[] = [];
    let pos = 0;
    for (const o of list) {
      if (o.start < pos) continue; // overlapping occurrence: keep the first
      if (o.start > pos) parts.push({ text: text.slice(pos, o.start) });
      parts.push({ text: text.slice(o.start, o.end), termId: o.id, first: !seen.has(o.id) });
      seen.add(o.id);
      pos = o.end;
    }
    if (pos < text.length) parts.push({ text: text.slice(pos) });
    out.set(id, parts);
  };
  for (const b of doc.text.blocks) {
    b.sentences?.forEach((s) => split(s.id, s.text));
    b.items?.forEach((i) => split(i.id, i.text));
  }
  return out;
}

const norm = (t?: string) => (t ?? '').replace(/\s+/g, ' ').trim();

/**
 * The blocks shown inside a unit: without the text's title (it is in the green band) and without
 * a leading author heading identical to the unit's title (it is already the unit's head).
 */
export function unitBlocks(doc: ReadingDocument, unit: ReadingUnit): TextBlock[] {
  const byId = new Map(doc.text.blocks.map((b) => [b.id, b]));
  const first = doc.text.blocks[0];
  const title = first?.type === 'heading' ? first : null;
  const blocks = unit.blocks.map((id) => byId.get(id)).filter((b): b is TextBlock => !!b && b !== title);
  if (blocks[0]?.type === 'heading' && norm(blocks[0].text) === norm(unit.title)) blocks.shift();
  return blocks;
}
