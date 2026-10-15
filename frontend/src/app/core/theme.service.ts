import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Light or dark theme. Platforms Code switches its tokens with data-theme on <html>.
 * index.html sets it before the first paint; this service reads it and keeps the reader's choice.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('maqra:theme', next); } catch { /* private mode: the choice lasts for this visit only */ }
  }
}
