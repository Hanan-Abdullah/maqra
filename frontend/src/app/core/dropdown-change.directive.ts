import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * The library's dga-dropdown reports a choice only through an `onChange` callback property, which
 * Angular refuses to bind in development (properties named on*). This sets the callback directly and
 * turns it into an output: <dga-dropdown (dropdownChange)="...">, with the chosen option's value.
 */
@Directive({ selector: 'dga-dropdown[dropdownChange]' })
export class DropdownChangeDirective {
  readonly dropdownChange = output<string>();

  constructor() {
    const el = inject<ElementRef<HTMLElement & { onChange?: (v: string | string[]) => void }>>(ElementRef).nativeElement;
    el.onChange = (value) => this.dropdownChange.emit(Array.isArray(value) ? value[0] ?? '' : value);
  }
}
