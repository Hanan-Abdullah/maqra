import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Any address the app does not know. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="notice">
        <h1>هذه الصفحة غير موجودة</h1>
        <p>قد يكون الرابط غير صحيح. <a routerLink="/">انتقل إلى الصفحة الرئيسية</a></p>
      </div>
    </div>`,
  styles: `
    .notice { max-width: 30rem; margin: 6rem auto; text-align: center; background: var(--background-card); border: 1px solid var(--border-neutral-secondary); border-radius: var(--radius-8); padding: var(--spacing-4xl) var(--spacing-3xl); }
    h1 { margin: 0 0 var(--spacing-md); font-size: 1.5rem; line-height: 2rem; font-weight: 700; }
    p { margin: 0; color: var(--text-primary-paragraph); line-height: 1.75rem; }
    a { color: var(--text-primary); text-underline-offset: 4px; text-decoration: underline; }`,
})
export class NotFoundPageComponent {}
