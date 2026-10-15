import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, computed, inject, input, signal } from '@angular/core';
import { DropdownChangeDirective } from '../core/dropdown-change.directive';
import { FeedbackService, REPORT_TYPES, ReportType } from '../core/feedback.service';
import { mediaSignal } from '../core/media';
import { registerFormFields } from '../core/platforms-code';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * «الإبلاغ عن خطأ في التحليل»: name, email, report type and message, all required; send stays
 * disabled until every field is right. The text, the mode and the unit being read are attached
 * automatically. Saved in the backend's "feedback" collection.
 */
@Component({
  selector: 'app-report-dialog',
  imports: [DropdownChangeDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './report-dialog.component.html',
  styleUrl: './report-dialog.component.css',
})
export class ReportDialogComponent {
  readonly docId = input.required<string>();
  readonly mode = input<string | null>(null);

  protected readonly types = REPORT_TYPES;
  protected readonly isOpen = signal(false);
  protected readonly phone = mediaSignal('(max-width: 599px)');

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly type = signal<ReportType | ''>('');
  protected readonly message = signal('');
  /** A wrong email is pointed out when the reader leaves the field, not while typing. */
  protected readonly emailLeft = signal(false);
  protected readonly emailOk = computed(() => EMAIL.test(this.email().trim()));
  protected readonly emailError = computed(() => this.emailLeft() && !!this.email().trim() && !this.emailOk());
  protected readonly ready = computed(() => !!this.name().trim() && this.emailOk() && !!this.type() && !!this.message().trim());

  protected readonly state = signal<'form' | 'sending' | 'done' | 'failed'>('form');
  private unit: number | null = null;

  private readonly feedback = inject(FeedbackService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The fields are drawn only once their components are defined, so the values given to them are not lost. */
  protected readonly fieldsReady = signal(false);
  constructor() { registerFormFields().then(() => this.fieldsReady.set(true)); }

  /** Opens the form; `unit` is the unit being read now (attached to the report). */
  open(unit: number | null): void {
    this.unit = unit;
    if (this.state() !== 'form') this.state.set('form');
    this.isOpen.set(true);
  }

  protected close(): void { this.isOpen.set(false); }

  protected onOpenChange(event: Event): void {
    this.isOpen.set(!!(event as CustomEvent<boolean>).detail);
    // after a sent report, the next opening starts with an empty form
    if (!this.isOpen() && this.state() === 'done') this.reset();
  }

  // the library fields report what is typed through dgaInput (their value prop is not updated)
  protected typed(event: Event): string { return (event as CustomEvent<{ value: string }>).detail?.value ?? ''; }

  protected send(event?: Event): void {
    event?.preventDefault();
    if (!this.ready() || this.state() === 'sending') return;
    this.state.set('sending');
    this.feedback.sendReport({
      documentId: this.docId(), mode: this.mode(), unit: this.unit,
      type: this.type() as ReportType, name: this.name().trim(), email: this.email().trim(), message: this.message().trim(),
    }).subscribe({
      next: () => {
        this.state.set('done');
        setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#rp-done-h')?.focus());
      },
      error: () => this.state.set('failed'),
    });
  }

  private reset(): void {
    this.name.set(''); this.email.set(''); this.type.set(''); this.message.set('');
    this.emailLeft.set(false); this.state.set('form');
  }
}
