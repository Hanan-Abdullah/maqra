import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DocumentService } from '../core/document.service';
import { ReadingDocument, documentTitle } from '../core/reading-document';
import { arabicDate } from '../core/arabic';
import { DEFAULT_MODE, MODES, Mode, isMode } from './modes';
import { ReadingHeroComponent } from './reading-hero.component';
import { OriginalViewComponent } from './original-view.component';
import { EasyViewComponent } from './easy-view.component';
import { TermDrawerComponent } from './term-drawer.component';
import { MarginViewComponent } from './margin-view.component';
import { ReportDialogComponent } from './report-dialog.component';

type PageState = 'loading' | 'ready' | 'not-found' | 'error';
const MODE_KEY = 'maqra:mode';

/**
 * The reading page: /read/:id?mode=original|easy|margin.
 * The mode is kept in the address (a shared link opens on the same mode, Back goes to the previous mode)
 * and remembered on the device for links without one.
 */
@Component({
  selector: 'app-reading-page',
  imports: [ReadingHeroComponent, OriginalViewComponent, EasyViewComponent, MarginViewComponent, TermDrawerComponent, ReportDialogComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reading-page.component.html',
  styleUrl: './reading-page.component.css',
})
export class ReadingPageComponent implements OnInit {
  // The :id from the link /read/:id (passed in by the router).
  readonly id = input.required<string>();

  readonly state = signal<PageState>('loading');
  readonly doc = signal<ReadingDocument | null>(null);

  private readonly documents = inject(DocumentService);
  private readonly pageTitle = inject(Title);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly modeParam = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('mode'))), { initialValue: null });
  readonly mode = computed<Mode>(() => {
    const p = this.modeParam();
    if (isMode(p)) return p;
    return this.savedMode() ?? DEFAULT_MODE;
  });

  protected readonly modes = MODES;
  protected readonly modeIndex = computed(() => MODES.findIndex((m) => m.id === this.mode()));
  protected readonly analysedOn = computed(() => (this.doc()?.createdAt ? arabicDate(this.doc()!.createdAt!) : ''));

  // The library's tabs emit dgaChange with the chosen tab's value.
  protected onTabChange(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail?.value;
    if (isMode(value)) this.setMode(value);
  }

  constructor() {
    // Keep the tab title in step with the mode (the original mode never shows the analysis's title).
    effect(() => {
      const doc = this.doc();
      if (doc) this.pageTitle.setTitle(`${documentTitle(doc, this.mode() === 'original')} · مَقرأ`);
    });
  }

  ngOnInit(): void {
    this.documents.getDocument(this.id()).subscribe({
      next: (doc) => { this.doc.set(doc); this.state.set('ready'); },
      error: (err: HttpErrorResponse) => {
        this.state.set(err.status === 404 ? 'not-found' : 'error');
        this.pageTitle.setTitle(err.status === 404 ? 'النص غير موجود · مَقرأ' : 'مَقرأ');
      },
    });
  }

  /** The unit being read: the last one whose top has passed the upper part of the screen (none in the original text). */
  protected unitInView(): number | null {
    let n: number | null = null;
    document.querySelectorAll<HTMLElement>('section.unit, section.m-unit').forEach((u) => {
      if (u.getBoundingClientRect().top < innerHeight * 0.4) n = Number(u.id.replace(/\D/g, '')) || null;
    });
    if (n === null && document.querySelector('section.unit, section.m-unit')) n = 1;
    return n;
  }

  setMode(mode: Mode): void {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* not saved */ }
    if (mode !== this.mode()) this.router.navigate([], { relativeTo: this.route, queryParams: { mode }, queryParamsHandling: 'merge' });
  }

  private savedMode(): Mode | null {
    let saved: string | null = null;
    try { saved = localStorage.getItem(MODE_KEY); } catch { /* not available */ }
    return isMode(saved) ? saved : null;
  }
}
