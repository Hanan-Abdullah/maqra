import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * The library's dga-switch reports changes only through an `onChange` callback property
 * (its checkbox sits inside a shadow root, so the native change event never reaches us).
 * Angular refuses to bind properties named on* in development, so this sets the callback directly
 * and turns it into a normal output: <dga-switch (switchChange)="...">, with the new checked value.
 */
@Directive({ selector: 'dga-switch[switchChange]' })
export class SwitchChangeDirective {
  readonly switchChange = output<boolean>();

  constructor() {
    const el = inject<ElementRef<HTMLElement & { onChange?: (e: Event) => void }>>(ElementRef).nativeElement;
    el.onChange = (event: Event) => this.switchChange.emit((event.target as HTMLInputElement).checked);
  }
}
