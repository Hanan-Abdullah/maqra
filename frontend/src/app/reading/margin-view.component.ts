import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ReadingDocument, ReadingUnit, TextBlock, hasQuestions, hasUnitSummaries } from '../core/reading-document';
import { QuizComponent } from './quiz.component';
import { TextPart, sentenceParts, unitBlocks } from './text-parts';

interface Prefs { terms: boolean; imp: boolean; ss: boolean; quiz: boolean; }
const PREFS_KEY = 'maqra:prefs:margin';
const DEFAULT_PREFS: Prefs = { terms: true, imp: true, ss: true, quiz: true };

/** A margin note: a unit summary beside the unit's title, or a term beside the paragraph where it first appears. */
export interface MarginNote { type: 'ss' | 'term'; n: number; termId?: string; }
/** One row of the page: a block of text (or the unit's head) and the notes that belong beside it. */
interface Row { kind: 'heading' | 'list' | 'p'; block: TextBlock; lede: boolean; notes: MarginNote[]; }
interface UnitView { unit: ReadingUnit; headNotes: MarginNote[]; rows: Row[]; }

/** A line joining a note to its word (wide screens). */
interface Leader { key: string; type: string; d: string; x2: number; y2: number; }

/** A margin part: a TextPart, or the bold opening words of a unit (`lead`). */
type Part = TextPart & { lead?: boolean; n?: number };

/**
 * «النص والحواشي»: the text as an article, with unit summaries and terms as notes beside it.
 * Phones and tablets: one column, a unit's summary under its title, terms open the side panel.
 */
@Component({
  selector: 'app-margin-view',
  imports: [NgTemplateOutlet, QuizComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './margin-view.component.html',
  styleUrl: './margin-view.component.css',
})
export class MarginViewComponent implements AfterViewInit {
  readonly doc = input.required<ReadingDocument>();
  readonly termSelected = output<{ termId: string; from: HTMLElement }>();

  protected readonly prefs = signal<Prefs>(this.restorePrefs());
  protected readonly units = computed(() => this.doc().analysis.readingUnits);
  protected readonly many = computed(() => this.units().length > 1);
  private readonly display = computed(() => this.doc().display ?? {});
  protected readonly showKeyPoints = computed(() => this.doc().analysis.keyPoints.length > 0 && this.display().showKeyPoints !== false);

  protected readonly available = computed(() => ({
    terms: this.doc().analysis.terms.length > 0 && this.display().showTerms !== false,
    imp: !!this.display().showImportance,
    ss: hasUnitSummaries(this.doc()),
    quiz: hasQuestions(this.doc()),
  }));
  /** The toolbar's buttons, in the agreed order; a feature the text does not have gets no button. */
  protected readonly chips = computed(() => {
    const a = this.available();
    const all: { key: keyof Prefs; label: string; cls: string; icon: string }[] = [
      { key: 'terms', label: 'المصطلحات', cls: 't-term', icon: 'translation' },
      { key: 'imp', label: 'تمييز المهم', cls: 't-imp', icon: 'sparkles' },
      { key: 'ss', label: 'ملخصات الوحدات', cls: 't-ss', icon: 'note-01' },
      { key: 'quiz', label: 'اختبر فهمي', cls: 't-quiz', icon: 'quiz-01' },
    ];
    return all.filter((c) => a[c.key]);
  });
  protected readonly on = computed(() => {
    const p = this.prefs(), a = this.available();
    return { terms: p.terms && a.terms, imp: p.imp && a.imp, ss: p.ss && a.ss, quiz: p.quiz && a.quiz };
  });

  private readonly termById = computed(() => new Map(this.doc().analysis.terms.map((t) => [t.id, t])));
  protected termOf(id: string | undefined) { return this.termById().get(id ?? '')!; }

  /**
   * The page laid out once: rows, notes, numbering, the bold opening words.
   * Only a term's first appearance in the whole text gets a note and a link; later ones are plain text.
   */
  private readonly layout = computed(() => {
    const doc = this.doc();
    const base = sentenceParts(doc);
    const parts = new Map<string, Part[]>();
    let termN = 0;
    const units: UnitView[] = doc.analysis.readingUnits.map((unit) => {
      const headNotes: MarginNote[] = unit.summary && unit.showSummary !== false && this.available().ss ? [{ type: 'ss', n: unit.n }] : [];
      let firstParagraph = true;
      const rows: Row[] = unitBlocks(doc, unit).map((block) => {
        const notes: MarginNote[] = [];
        const ids = block.type === 'list' ? (block.items ?? []).map((i) => i.id) : (block.sentences ?? []).map((s) => s.id);
        for (const id of ids) {
          const list: Part[] = (base.get(id) ?? []).map((p) => {
            if (!p.termId) return { ...p };
            if (!p.first) return { text: p.text }; // later appearances: plain text
            const n = ++termN;
            notes.push({ type: 'term', n, termId: p.termId });
            return { ...p, n };
          });
          parts.set(id, list);
        }
        const kind = block.type === 'heading' ? 'heading' : block.type === 'list' ? 'list' : 'p';
        const lede = kind === 'p' && firstParagraph;
        if (kind === 'p') {
          if (firstParagraph && ids.length) this.markLeadIn(parts.get(ids[0])!);
          firstParagraph = false;
        }
        return { kind, block, lede, notes };
      });
      return { unit, headNotes, rows };
    });
    return { units, parts };
  });
  protected readonly unitViews = computed(() => this.layout().units);
  protected partsOf(id: string): Part[] { return this.layout().parts.get(id) ?? []; }
  protected levelOf(id: string): string { return this.doc().analysis.importance[id] ?? ''; }

  // The first two words of a unit open it in bold (the Arabic answer to a drop cap).
  private markLeadIn(list: Part[]): void {
    const first = list[0];
    if (!first || first.termId) return;
    const m = /^(\s*\S+(?:\s+\S+)?)/.exec(first.text);
    if (!m) return;
    list.splice(0, 1, { text: m[1], lead: true }, { text: first.text.slice(m[1].length) });
  }

  protected pad(n: number): string { return String(n).padStart(2, '0'); }

  protected setPref(key: keyof Prefs, value: boolean): void {
    // hold the line being read steady while notes above it appear or disappear
    const ref = this.readingLine();
    this.prefs.update((p) => ({ ...p, [key]: value }));
    if (key === 'quiz' && !value) this.sources.set({});
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs())); } catch { /* not saved */ }
    // after Angular has drawn the notes that just appeared (a frame callback could run before that)
    afterNextRender(() => {
      this.layoutNotes();
      this.revealNotes();
      if (ref) scrollBy(0, ref.el.getBoundingClientRect().top - ref.top);
    }, { injector: this.injector });
  }

  private readingLine(): { el: HTMLElement; top: number } | null {
    for (const el of Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.mrow'))) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 80) return { el, top: r.top };
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Wide screens: every note sits level with its word (a term) or its unit's title (a summary).
  // From 1280px there are two margins: summaries on the right, terms on the left, a term moving to the
  // right when the left is taken at that height. Between 960 and 1279px there is one margin, on the left.
  // A note is pushed down only to avoid the one above; a term card pushed far from its word keeps just
  // the term and its translation. A thin line joins a note to its word while either is pointed at.
  // ---------------------------------------------------------------------------------------------
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  protected readonly leaders = signal<Leader[]>([]);
  protected readonly sheetSize = signal({ w: 0, h: 0 });
  protected readonly linked = signal<string | null>(null);
  private static readonly PUSH_LIMIT = 96;

  ngAfterViewInit(): void {
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; this.layoutNotes(); }); };
    // text heights change with the window, the fonts, an answered question: lay the notes out again
    addEventListener('resize', schedule);
    let tick = 0;
    const onScroll = () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; this.updateThread(); }); };
    addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(tick); });
    const units = new ResizeObserver(schedule);
    this.host.nativeElement.querySelectorAll('.m-unit, .m-open').forEach((el) => units.observe(el));
    document.fonts?.ready.then(schedule);
    this.destroyRef.onDestroy(() => { removeEventListener('resize', schedule); units.disconnect(); cancelAnimationFrame(frame); this.noteObserver?.disconnect(); });
    this.layoutNotes();
    this.revealNotes();
  }

  private layoutNotes(): void {
    const root = this.host.nativeElement;
    const sheet = root.querySelector<HTMLElement>('.msheet');
    if (!sheet) return;
    const notes = Array.from(root.querySelectorAll<HTMLElement>('.mnote'));
    notes.forEach((n) => n.classList.remove('compact', 'place-start', 'place-end'));
    if (!matchMedia('(min-width: 960px)').matches) {
      notes.forEach((n) => (n.style.top = ''));
      sheet.style.minHeight = '';
      this.leaders.set([]);
      this.placeThread();
      return;
    }
    const two = matchMedia('(min-width: 1280px)').matches;
    const sr = sheet.getBoundingClientRect();
    const bottoms = { start: 0, end: 0 };
    const lines: Leader[] = [];
    for (const n of notes) {
      if (getComputedStyle(n).display === 'none') continue;
      const key = n.dataset['key']!;
      const anchor = root.querySelector<HTMLElement>(`.mterm[data-key="${key}"], .m-title[data-key="${key}"]`);
      if (!anchor || !anchor.offsetParent) continue;
      const ar = anchor.getBoundingClientRect();
      const target = ar.top - sr.top - 6;
      const isTerm = n.classList.contains('t-term');
      let side: 'start' | 'end' = !two || isTerm ? 'end' : 'start';
      if (two && isTerm && Math.max(target, bottoms.start) < Math.max(target, bottoms.end) - 8) side = 'start';
      n.classList.add('place-' + side);
      const top = Math.max(target, bottoms[side]);
      if (isTerm && top - target > MarginViewComponent.PUSH_LIMIT) n.classList.add('compact');
      n.style.top = top + 'px';
      bottoms[side] = top + n.offsetHeight + 16;
      // RTL: the inline-start margin is on the right. The line starts at the edge of the text, never across it.
      const nr = n.getBoundingClientRect();
      const block = (anchor.closest('p, li') ?? anchor) as HTMLElement;
      const br = block.getBoundingClientRect();
      const toRight = side === 'start';
      const x1 = toRight ? br.right - sr.left + 8 : br.left - sr.left - 8;
      const y1 = ar.top - sr.top + ar.height / 2;
      const x2 = toRight ? nr.left - sr.left - 6 : nr.right - sr.left + 6;
      const y2 = top + 14;
      const mid = x1 + (x2 - x1) * 0.55;
      lines.push({ key, type: isTerm ? 't-term' : 't-ss', d: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`, x2, y2 });
    }
    sheet.style.minHeight = Math.max(bottoms.start, bottoms.end) + 40 + 'px';
    this.sheetSize.set({ w: sr.width, h: sheet.scrollHeight });
    this.leaders.set(lines);
    this.placeThread();
  }

  // ---- the reading thread: a line beside the text that fills as the reader goes, one dot per unit
  protected readonly thread = signal<{ top: number; height: number; dots: number[] } | null>(null);
  protected readonly threadFill = signal(0);
  protected readonly threadCurrent = signal(0);

  private placeThread(): void {
    if (!this.many()) return;
    const units = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.m-unit'));
    if (!units.length) return;
    const top = units[0].offsetTop + 8;
    const last = units[units.length - 1];
    const height = last.offsetTop + last.offsetHeight - top;
    this.thread.set({ top, height, dots: units.map((u) => u.offsetTop + 8 - top) });
    this.updateThread();
  }

  private updateThread(): void {
    const t = this.thread();
    const el = this.host.nativeElement.querySelector<HTMLElement>('.thread');
    if (!t || !el) return;
    const r = el.getBoundingClientRect();
    const line = innerHeight * 0.35;
    this.threadFill.set(Math.max(0, Math.min(1, (line - r.top) / r.height)));
    let current = 0;
    t.dots.forEach((y, i) => { if (r.top + y <= line) current = i + 1; });
    this.threadCurrent.set(current);
  }

  // notes glide in as their paragraph reaches the screen
  private noteObserver?: IntersectionObserver;
  private revealNotes(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    this.noteObserver ??= new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); this.noteObserver!.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px' });
    this.host.nativeElement.querySelectorAll('.mnote:not(.pre)').forEach((n) => { n.classList.add('pre'); this.noteObserver!.observe(n); });
  }

  // pointing at a word or a note lights up the pair and the line between them
  protected link(event: Event, on: boolean): void {
    const t = (event.target as HTMLElement).closest?.('.mterm, .mnote') as HTMLElement | null;
    if (!t) return;
    const key = t.dataset['key'] ?? null;
    if (on) this.linked.set(key);
    else if (this.linked() === key) this.linked.set(null);
  }
  protected isLinked(key: string): boolean { return this.linked() === key; }

  // ---- the question: the sentences a checked answer comes from
  private readonly sources = signal<Record<number, string[]>>({});
  private readonly sourceSet = computed(() => new Set(Object.values(this.sources()).flat()));
  protected isSource(id: string): boolean { return this.sourceSet().has(id); }
  protected setSources(unit: number, ids: string[]): void { this.sources.update((m) => ({ ...m, [unit]: ids })); }
  protected goToSentence(id: string): void {
    document.querySelector<HTMLElement>(`.mag [data-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: this.motion(), block: 'center' });
  }

  protected openTerm(termId: string, event: Event): void {
    if (!this.on().terms) return;
    this.termSelected.emit({ termId, from: event.currentTarget as HTMLElement });
  }

  protected goToUnit(n: number, event?: Event): void {
    event?.preventDefault();
    const el = document.getElementById('mu-' + n);
    if (!el) return;
    el.scrollIntoView({ behavior: this.motion(), block: 'start' });
    el.focus({ preventScroll: true });
  }

  private motion(): ScrollBehavior { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; }

  private restorePrefs(): Prefs {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return { ...DEFAULT_PREFS }; }
  }
}
