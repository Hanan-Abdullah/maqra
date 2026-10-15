import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SwitchChangeDirective } from '../core/switch-change.directive';
import { ReadingDocument, ReadingUnit, hasUnitSummaries, titleBlock } from '../core/reading-document';
import { TextPart, sentenceParts, unitBlocks } from './text-parts';

interface Prefs { terms: boolean; imp: boolean; ss: boolean; quiz: boolean; }
const PREFS_KEY = 'maqra:prefs';
const DEFAULT_PREFS: Prefs = { terms: true, imp: true, ss: true, quiz: false };

/** «العرض الميسّر»: the summary, a toolbar of switches, and the text split into unit cards. */
@Component({
  selector: 'app-easy-view',
  imports: [NgTemplateOutlet, SwitchChangeDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './easy-view.component.html',
  styleUrl: './easy-view.component.css',
})
export class EasyViewComponent {
  readonly doc = input.required<ReadingDocument>();
  /** The reader opened a term (the side panel shows it). */
  readonly termSelected = output<{ termId: string; from: HTMLElement }>();

  protected readonly prefs = signal<Prefs>(this.restorePrefs());

  protected readonly units = computed(() => this.doc().analysis.readingUnits);
  protected readonly many = computed(() => this.units().length > 1);
  protected readonly parts = computed(() => sentenceParts(this.doc()));
  protected readonly display = computed(() => this.doc().display ?? {});
  protected readonly hasTerms = computed(() => this.doc().analysis.terms.length > 0 && this.display().showTerms !== false);
  protected readonly showKeyPoints = computed(() => this.doc().analysis.keyPoints.length > 0 && this.display().showKeyPoints !== false);
  protected readonly tocSections = computed(() => this.units().map((u) => ({ Name: `${u.n}. ${u.title}`, Target: 'unit-' + u.n })));
  protected readonly tocTitle = computed(() => titleBlock(this.doc())?.text ?? 'وحدات النص');

  // which features this text has (a missing feature is left out, not shown disabled)
  protected readonly available = computed(() => ({
    terms: this.hasTerms(),
    imp: !!this.display().showImportance,
    ss: hasUnitSummaries(this.doc()),
  }));
  protected readonly on = computed(() => {
    const p = this.prefs(), a = this.available();
    return { terms: p.terms && a.terms, imp: p.imp && a.imp, ss: p.ss && a.ss };
  });

  protected blocksOf(u: ReadingUnit) { return unitBlocks(this.doc(), u); }
  protected partsOf(id: string): TextPart[] { return this.parts().get(id) ?? []; }
  protected levelOf(id: string): string { return this.doc().analysis.importance[id] ?? ''; }
  protected showUnitSummary(u: ReadingUnit): boolean { return !!u.summary && u.showSummary !== false && this.available().ss; }

  protected setPref(key: keyof Prefs, value: boolean): void {
    this.prefs.update((p) => ({ ...p, [key]: value }));
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs())); } catch { /* not saved */ }
  }

  openTerm(termId: string, event: Event): void {
    if (!this.on().terms) return;
    this.termSelected.emit({ termId, from: event.currentTarget as HTMLElement });
  }

  goToUnit(n: number): void {
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
