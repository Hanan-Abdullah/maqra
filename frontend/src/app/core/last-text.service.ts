import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** A text the reader opened, so the next page can lead back to it. */
export interface LastText { id: string; title: string; mode: string; }

/**
 * Remembers where the reader came from. When the page before was a text, the breadcrumbs lead
 * back to it (in its mode); otherwise they lead to «الرئيسية». Created with the app (see AppComponent),
 * so it sees every navigation.
 */
@Injectable({ providedIn: 'root' })
export class LastTextService {
  private readonly text = signal<LastText | null>(null);
  private readonly previousPath = signal<string | null>(null);
  private currentPath: string | null = null;

  /** The text of the page just before this one, or null when the reader did not come from a text. */
  readonly cameFrom = computed(() => {
    const t = this.text(), prev = this.previousPath();
    return t && prev === `/read/${t.id}` ? t : null;
  });

  constructor() {
    inject(Router).events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const path = e.urlAfterRedirects.split(/[?#]/)[0];
      if (path === this.currentPath) return; // a change of mode on the same text is not a new page
      this.previousPath.set(this.currentPath);
      this.currentPath = path;
    });
  }

  /** Called by the reading page once its text is loaded (and when its mode changes). */
  remember(text: LastText): void { this.text.set(text); }
}
