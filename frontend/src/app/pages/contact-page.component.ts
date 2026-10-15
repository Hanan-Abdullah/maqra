import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ACADEMY, SOCIAL } from '../core/academy';

/** The academy's map, found by name until its exact coordinates arrive. */
const MAP_QUERY = 'مجمع الملك سلمان العالمي للغة العربية، حي الورود، الرياض';

/** «تواصل معنا»: the academy's contact details, its accounts and its location. */
@Component({
  selector: 'app-contact-page',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="hero hero-sm" aria-labelledby="contact-title">
      <div class="container"><h1 id="contact-title">تواصل معنا</h1></div>
    </section>
    <div class="container">
      <div class="contact">
        <ul class="ct-cards">
          <li class="ct-card">
            <span class="fi green"><dga-icon name="mail-01"></dga-icon></span>
            <h2>البريد الإلكتروني</h2>
            <a [href]="'mailto:' + academy.email" dir="ltr">{{ academy.email }}</a>
          </li>
          <li class="ct-card">
            <span class="fi gold"><dga-icon name="call-02"></dga-icon></span>
            <h2>رقم التواصل</h2>
            <a [href]="'tel:' + academy.phone" dir="ltr">{{ academy.phoneDisplay }}</a>
          </li>
          <li class="ct-card">
            <span class="fi lavender"><dga-icon name="location-01"></dga-icon></span>
            <h2>العنوان</h2>
            <p>@for (line of academy.address; track line) { {{ line }}@if (!$last) {<br>} }</p>
          </li>
        </ul>

        <section class="ct-block" aria-labelledby="ct-follow">
          <h2 id="ct-follow">تابعنا</h2>
          <ul class="social">
            @for (s of social; track s.url) {
              <li>
                @if (s.url.startsWith('http')) {
                  <a [href]="s.url" target="_blank" rel="noopener noreferrer" [attr.aria-label]="s.name + ' (يفتح في نافذة جديدة)'" [title]="s.name"><dga-icon [name]="s.icon"></dga-icon></a>
                } @else {
                  <a [href]="s.url" [attr.aria-label]="s.name" [title]="s.name"><dga-icon [name]="s.icon"></dga-icon></a>
                }
              </li>
            }
          </ul>
        </section>

        <section class="ct-block" aria-labelledby="ct-loc">
          <h2 id="ct-loc">موقع المجمع</h2>
          <div class="map-frame">
            <iframe [src]="mapUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              title="خريطة موقع مجمع الملك سلمان العالمي للغة العربية في حي الورود بالرياض"></iframe>
          </div>
        </section>
      </div>
    </div>`,
  styles: `
    .contact { display: grid; gap: 1.5rem; padding-block: 2.5rem 0; }
    .ct-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
    .ct-card, .ct-block {
      background: var(--background-card); border: 1px solid var(--border-neutral-secondary); border-radius: var(--radius-8);
      padding: 1.5rem; box-shadow: var(--shadow-xs);
    }
    .ct-card { display: grid; gap: var(--spacing-md); align-content: start; }
    .fi { inline-size: 3rem; block-size: 3rem; margin-bottom: var(--spacing-xs); border-radius: var(--radius-full); display: grid; place-items: center; }
    .fi dga-icon { width: 1.5rem; height: 1.5rem; display: block; }
    .fi.green { background: var(--background-primary-50); color: var(--text-primary); }
    .fi.gold { background: var(--background-secondary-50); color: var(--text-secondary); }
    .fi.lavender { background: var(--colors-tertiary-lavendar-50); color: var(--colors-tertiary-lavendar-700); }
    :host-context([data-theme=dark]) .fi.lavender { background: var(--colors-tertiary-lavendar-950); color: var(--colors-tertiary-lavendar-200); }
    h2 { margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 700; color: var(--text-default); }
    .ct-block h2 { margin-bottom: var(--spacing-lg); }
    .ct-card a, .ct-card p { margin: 0; font-size: 1.125rem; line-height: 1.75rem; color: var(--text-primary-paragraph); }
    .ct-card a { color: var(--text-primary); font-weight: 600; text-underline-offset: 5px; justify-self: start; min-height: 2.75rem; display: inline-flex; align-items: center; }
    .social { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--spacing-md); }
    .social a {
      inline-size: 2.75rem; block-size: 2.75rem; border-radius: var(--radius-full); display: grid; place-items: center;
      border: 1px solid var(--border-neutral-primary); color: var(--text-default); transition: background .15s, color .15s, border-color .15s;
    }
    .social a:hover { background: var(--background-primary); border-color: transparent; color: var(--text-oncolor-primary); }
    .social dga-icon { width: 1.25rem; height: 1.25rem; display: block; }
    .map-frame {
      border-radius: var(--radius-8); overflow: hidden; border: 1px solid var(--border-neutral-secondary);
      background: var(--background-neutral-100); aspect-ratio: 16 / 7; min-height: 18rem;
    }
    .map-frame iframe { display: block; inline-size: 100%; block-size: 100%; border: 0; }
    @media (max-width: 599px) { .map-frame { aspect-ratio: 4 / 3; } }
    @media (prefers-reduced-motion: reduce) { .social a { transition: none; } }`,
})
export class ContactPageComponent {
  protected readonly academy = ACADEMY;
  protected readonly social = SOCIAL;
  // a fixed Google Maps embed address built here (not from user input), so it is safe to trust
  protected readonly mapUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(
    `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&hl=ar&z=15&output=embed`,
  );
}
