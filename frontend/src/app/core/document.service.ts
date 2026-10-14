import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ReadingDocument } from './reading-document';

// Talks to the backend. Every part of the app that needs a document asks this service.
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);

  getDocument(id: string): Observable<ReadingDocument> {
    return this.http.get<ReadingDocument>(`/api/documents/${encodeURIComponent(id)}`);
  }
}
