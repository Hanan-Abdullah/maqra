import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';

/** "Was this page helpful?" Saving the answer comes with the feedback collection. */
@Component({
  selector: 'app-page-feedback',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="feedback" role="group" aria-labelledby="fb-q">
      @if (answered()) {
        <p id="fb-q" role="status">شكرًا لك، وصلتنا ملاحظتك.</p>
      } @else {
        <p id="fb-q">هل كانت هذه الصفحة مفيدة؟</p>
        <div class="actions">
          <dga-button variant="secondary-outline" size="md" label="نعم" lead-icon-type="thumbs-up" (click)="answer(true)"></dga-button>
          <dga-button variant="secondary-outline" size="md" label="لا" lead-icon-type="thumbs-down" (click)="answer(false)"></dga-button>
        </div>
      }
    </div>`,
  styles: `
    :host { display: block; }
    .feedback {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--spacing-xl);
      background: var(--background-card); border: 1px solid var(--border-neutral-secondary); border-radius: var(--radius-8);
      padding: var(--spacing-xl) var(--spacing-3xl); margin-block: 2.5rem;
    }
    p { margin: 0; font-weight: 600; }
    .actions { display: flex; gap: var(--spacing-md); }`,
})
export class PageFeedbackComponent {
  protected readonly answered = signal(false);
  answer(_helpful: boolean): void { this.answered.set(true); }
}
