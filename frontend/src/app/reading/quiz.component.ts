import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { Question } from '../core/reading-document';

/**
 * «اختبر فهمك» at the end of a unit: the options as library radio buttons, then «تحقق من الإجابة».
 * After checking, the options lock, the right one turns green (and a wrong pick red), the explanation shows,
 * and the sentences the answer comes from are highlighted in the text (reported through `sourcesShown`).
 */
@Component({
  selector: 'app-quiz',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css',
})
export class QuizComponent {
  readonly question = input.required<Question>();
  readonly unit = input.required<number>();
  /** The source sentences to highlight (empty when the answer is hidden again). */
  readonly sourcesShown = output<string[]>();
  /** The reader asked where the answer is: scroll to this sentence. */
  readonly whereAsked = output<string>();

  protected readonly letters: readonly (string | undefined)[] = ['أ', 'ب', 'ج', 'د'];
  protected readonly picked = signal<number | null>(null);
  protected readonly checked = signal(false);
  protected readonly right = computed(() => this.picked() === this.question().answer);
  protected readonly groupName = computed(() => 'quiz-' + this.unit());

  private readonly host = inject(ElementRef<HTMLElement>);

  // The library radio is a plain (light DOM) input, so its native change event reaches us.
  protected pick(i: number): void {
    if (!this.checked()) this.picked.set(i);
  }

  protected check(): void {
    if (this.picked() === null || this.checked()) return;
    this.checked.set(true);
    this.sourcesShown.emit(this.question().sources);
    // move focus to the result so screen readers and keyboard users land on it
    setTimeout(() => (this.host.nativeElement.querySelector('.quiz-fb') as HTMLElement | null)?.focus());
  }

  protected retry(): void {
    this.checked.set(false);
    this.picked.set(null);
    this.sourcesShown.emit([]);
    setTimeout(() => (this.host.nativeElement.querySelector('input[type=radio]') as HTMLElement | null)?.focus());
  }

  protected where(): void {
    const first = this.question().sources[0];
    if (first) this.whereAsked.emit(first);
  }

  protected stateOf(i: number): string {
    if (!this.checked()) return '';
    if (i === this.question().answer) return 'right';
    return i === this.picked() ? 'wrong' : 'other';
  }
}
