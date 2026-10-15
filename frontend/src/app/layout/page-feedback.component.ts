import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FeedbackService } from '../core/feedback.service';

/** "Was this page helpful?" The answer is saved in the feedback collection, with the page (and the text and mode on a reading page). */
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
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  constructor() {
    // a new page asks again
    this.router.events.subscribe(() => { if (this.answered() && this.path() !== this.answeredOn) this.answered.set(false); });
  }
  private answeredOn = '';

  answer(helpful: boolean): void {
    const tree = this.router.parseUrl(this.router.url);
    const page = this.path();
    const read = /^\/read\/([A-Za-z0-9_-]{10})$/.exec(page);
    const mode = tree.queryParams['mode'];
    this.answeredOn = page;
    this.answered.set(true);
    // a lost answer is not worth bothering the reader about
    this.feedback.sendHelpful({ helpful, page, documentId: read ? read[1] : null, mode: read && ['original', 'easy', 'margin'].includes(mode) ? mode : null })
      .subscribe({ error: () => undefined });
  }

  private path(): string { return this.router.url.split(/[?#]/)[0] || '/'; }
}
