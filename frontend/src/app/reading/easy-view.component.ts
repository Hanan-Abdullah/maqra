import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SwitchChangeDirective } from '../core/switch-change.directive';
import { QuizComponent } from './quiz.component';
import { mediaSignal } from '../core/media';
import { ReadingDocument, ReadingUnit, hasQuestions, hasUnitSummaries, titleBlock } from '../core/reading-document';
import { TextPart, sentenceParts, unitBlocks } from './text-parts';

interface Prefs { terms: boolean; imp: boolean; ss: boolean; quiz: boolean; }
const PREFS_KEY = 'maqra:prefs';
const DEFAULT_PREFS: Prefs = { terms: true, imp: true, ss: true, quiz: false };

/** «العرض الميسّر»: the summary, a toolbar of switches, and the text split into unit cards. */
@Component({
  selector: 'app-easy-view',
  imports: [NgTemplateOutlet, SwitchChangeDirective, QuizComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './easy-view.component.html',
  styleUrl: './easy-view.component.css',
})
export class EasyViewComponent implements AfterViewInit {
  readonly doc = input.required<ReadingDocument>();
  /** The document's id, so the reading progress is remembered per text. */
  readonly docId = input.required<string>();
  /** The reader opened a term (the side panel shows it). */
  readonly termSelected = output<{ termId: string; from: HTMLElement }>();

  protected readonly prefs = signal<Prefs>(this.restorePrefs());
  /** Wide enough for the units list beside the text (otherwise it folds above the summary). */
  protected readonly wide = mediaSignal('(min-width: 960px)');
  protected readonly tocOpen = signal(false);

  // ---- reading progress: units marked read («انتهيت») fold up; remembered on this device per text
  private readonly done = signal<ReadonlySet<number>>(new Set());
  private readonly collapsed = signal<ReadonlySet<number>>(new Set());
  protected readonly doneCount = computed(() => this.units().filter((u) => this.done().has(u.n)).length);
  protected readonly anyCollapsed = computed(() => this.collapsed().size > 0);
  protected readonly activeUnit = signal(1);
  protected isDone(n: number): boolean { return this.done().has(n); }
  protected isCollapsed(n: number): boolean { return this.collapsed().has(n); }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const saved = this.restoreDone();
    this.done.set(saved);
    this.collapsed.set(new Set(saved));
    this.watchUnits();
  }

  protected setCollapsed(n: number, value: boolean): void {
    this.collapsed.update((set) => { const next = new Set(set); if (value) next.add(n); else next.delete(n); return next; });
  }

  protected toggleAll(): void {
    this.collapsed.set(this.anyCollapsed() ? new Set() : new Set(this.units().map((u) => u.n)));
  }

  /** «انتهيت»: mark the unit read, fold it, and move on to the next one (or stay on the last). */
  protected finish(n: number): void {
    this.done.update((set) => new Set(set).add(n));
    this.saveDone();
    this.setCollapsed(n, true);
    const last = n === this.units().length;
    setTimeout(() => this.goToUnit(last ? n : n + 1, last));
  }

  protected tocGo(n: number, event: Event): void {
    event.preventDefault();
    if (!this.wide()) this.tocOpen.set(false);
    this.goToUnit(n);
  }

  // The current unit in the units list: the last one whose top has passed the upper third of the screen (the first one before that).
  private watchUnits(): void {
    if (!this.many()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = innerHeight * 0.3;
      let current = this.units()[0]?.n ?? 1;
      this.host.nativeElement.querySelectorAll<HTMLElement>('section.unit').forEach((el) => {
        if (el.getBoundingClientRect().top <= line) current = Number(el.id.replace('unit-', ''));
      });
      this.activeUnit.set(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', onScroll, { passive: true });
    update();
    this.destroyRef.onDestroy(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); });
  }

  private get doneKey(): string { return `maqra:done:${this.docId()}`; }
  private restoreDone(): Set<number> {
    try {
      const ids = JSON.parse(localStorage.getItem(this.doneKey) || '[]');
      return new Set(Array.isArray(ids) ? ids.filter((n) => this.units().some((u) => u.n === n)) : []);
    } catch { return new Set(); }
  }
  private saveDone(): void {
    try { localStorage.setItem(this.doneKey, JSON.stringify([...this.done()])); } catch { /* not saved */ }
  }

  protected readonly units = computed(() => this.doc().analysis.readingUnits);
  protected readonly many = computed(() => this.units().length > 1);
  protected readonly parts = computed(() => sentenceParts(this.doc()));
  protected readonly display = computed(() => this.doc().display ?? {});
  protected readonly hasTerms = computed(() => this.doc().analysis.terms.length > 0 && this.display().showTerms !== false);
  protected readonly showKeyPoints = computed(() => this.doc().analysis.keyPoints.length > 0 && this.display().showKeyPoints !== false);
  // With an author title: the title, and «وحدات النص» above it. Without one: just «وحدات النص» (not twice).
  protected readonly tocTitle = computed(() => titleBlock(this.doc())?.text ?? 'وحدات النص');
  protected readonly tocSub = computed(() => (titleBlock(this.doc()) ? 'وحدات النص' : undefined));

  // which features this text has (a missing feature is left out, not shown disabled)
  protected readonly available = computed(() => ({
    terms: this.hasTerms(),
    imp: !!this.display().showImportance,
    ss: hasUnitSummaries(this.doc()),
    quiz: hasQuestions(this.doc()),
  }));
  protected readonly on = computed(() => {
    const p = this.prefs(), a = this.available();
    return { terms: p.terms && a.terms, imp: p.imp && a.imp, ss: p.ss && a.ss, quiz: p.quiz && a.quiz };
  });

  protected blocksOf(u: ReadingUnit) { return unitBlocks(this.doc(), u); }
  protected partsOf(id: string): TextPart[] { return this.parts().get(id) ?? []; }
  protected levelOf(id: string): string { return this.doc().analysis.importance[id] ?? ''; }
  protected showUnitSummary(u: ReadingUnit): boolean { return !!u.summary && u.showSummary !== false && this.available().ss; }

  protected setPref(key: keyof Prefs, value: boolean): void {
    this.prefs.update((p) => ({ ...p, [key]: value }));
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs())); } catch { /* not saved */ }
  }

  // sentences highlighted as the source of a checked answer, per unit
  private readonly sources = signal<Record<number, string[]>>({});
  private readonly sourceSet = computed(() => new Set(Object.values(this.sources()).flat()));
  protected isSource(id: string): boolean { return this.sourceSet().has(id); }
  protected setSources(unit: number, ids: string[]): void { this.sources.update((m) => ({ ...m, [unit]: ids })); }

  protected setQuiz(value: boolean): void {
    this.setPref('quiz', value);
    if (!value) this.sources.set({});
  }

  protected goToSentence(id: string): void {
    const el = document.querySelector<HTMLElement>(`.easy [data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  openTerm(termId: string, event: Event): void {
    if (!this.on().terms) return;
    this.termSelected.emit({ termId, from: event.currentTarget as HTMLElement });
  }

  goToUnit(n: number, keepCollapsed = false): void {
    if (this.isCollapsed(n) && !keepCollapsed) this.setCollapsed(n, false);
    const el = document.getElementById('unit-' + n);
    if (!el) return;
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.focus({ preventScroll: true });
  }

  private restorePrefs(): Prefs {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return { ...DEFAULT_PREFS }; }
  }
}
