import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { ReadingDocument, Term } from '../core/reading-document';

/**
 * The side panel that explains a term (the library's dga-drawer-v2).
 * It slides in from the left edge on wide screens and up from the bottom on phones.
 * The library handles the backdrop, Escape, the focus trap and returning focus to the term.
 */
@Component({
  selector: 'app-term-drawer',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './term-drawer.component.html',
  styleUrl: './term-drawer.component.css',
})
export class TermDrawerComponent {
  readonly doc = input.required<ReadingDocument>();

  protected readonly isOpen = signal(false);
  // kept after closing, so the panel does not empty while it slides out
  private readonly termId = signal<string | null>(null);
  protected readonly term = computed<Term | null>(() => this.doc().analysis.terms.find((t) => t.id === this.termId()) ?? null);
  protected readonly times = computed(() => {
    const n = this.term()?.occurrences.length ?? 0;
    return n === 1 ? 'مرة واحدة' : n === 2 ? 'مرتين' : n >= 3 && n <= 10 ? `${n} مرات` : `${n} مرة`;
  });

  private readonly phoneQuery = matchMedia('(max-width: 599px)');
  protected readonly phone = signal(this.phoneQuery.matches);

  constructor() {
    const onChange = (e: MediaQueryListEvent) => this.phone.set(e.matches);
    this.phoneQuery.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.phoneQuery.removeEventListener('change', onChange));
  }

  open(termId: string): void {
    this.termId.set(termId);
    this.isOpen.set(true);
  }

  // The drawer reports every open/close (close button, backdrop, Escape).
  protected onOpenChange(event: Event): void {
    this.isOpen.set(!!(event as CustomEvent<boolean>).detail);
  }
}
