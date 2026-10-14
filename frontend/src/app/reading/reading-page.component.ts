import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

import { DocumentService } from '../core/document.service';
import { ReadingDocument, documentTitle } from '../core/reading-document';

type PageState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-reading-page',
  templateUrl: './reading-page.component.html',
  styleUrl: './reading-page.component.css',
})
export class ReadingPageComponent implements OnInit {
  // The :id from the link /read/:id (passed in by the router).
  readonly id = input.required<string>();

  readonly state = signal<PageState>('loading');
  readonly doc = signal<ReadingDocument | null>(null);
  readonly title = signal('');

  private readonly documents = inject(DocumentService);
  private readonly pageTitle = inject(Title);

  ngOnInit(): void {
    this.documents.getDocument(this.id()).subscribe({
      next: (doc) => {
        this.doc.set(doc);
        this.title.set(documentTitle(doc));
        this.pageTitle.setTitle(`${this.title()} · مَقرأ`);
        this.state.set('ready');
      },
      error: (err: HttpErrorResponse) => {
        this.state.set(err.status === 404 ? 'not-found' : 'error');
        this.pageTitle.setTitle(err.status === 404 ? 'النص غير موجود · مَقرأ' : 'مَقرأ');
      },
    });
  }
}
