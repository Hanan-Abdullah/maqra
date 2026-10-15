import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LastTextService } from '../core/last-text.service';

/**
 * The path above a page's title, on the green band. Coming from a text, the first step is that text
 * (back to it, in the same mode): «الذكاء الاصطناعي… / تواصل معنا». Otherwise: «الرئيسية / تواصل معنا».
 * Built here rather than with dga-breadcrumbs: on the green band its grey current item is unreadable,
 * and it removes the keyboard focus outline from its links.
 */
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav aria-label="مسار التنقل">
      <ol>
        @if (last.cameFrom(); as t) {
          <li><a [routerLink]="['/read', t.id]" [queryParams]="{ mode: t.mode }" [attr.aria-label]="'العودة إلى النص: ' + t.title"><span class="t">{{ t.title }}</span></a></li>
        } @else {
          <li><a routerLink="/">الرئيسية</a></li>
        }
        <li aria-current="page">{{ current() }}</li>
      </ol>
    </nav>`,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-md); font-size: .875rem; line-height: 1.25rem; color: var(--colors-alpha-alpha-white-80); }
    li { min-width: 0; }
    li + li::before { content: "/"; margin-inline-end: var(--spacing-md); opacity: .6; }
    a { display: inline-flex; align-items: center; min-height: 2.75rem; max-width: 100%; color: var(--colors-base-white); text-decoration: underline; text-underline-offset: 4px; }
    /* a long title is cut with «…» rather than taking several lines */
    .t { display: block; max-width: 28rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 599px) { .t { max-width: 14rem; } }
    a:hover { text-decoration-thickness: 2px; }
    a:focus-visible { outline-color: var(--colors-base-white); }
    [aria-current] { color: var(--colors-alpha-alpha-white-80); }
    @media print { :host { display: none; } }`,
})
export class BreadcrumbsComponent {
  /** The current page's name (the last step, not a link). */
  readonly current = input.required<string>();
  protected readonly last = inject(LastTextService);
}
