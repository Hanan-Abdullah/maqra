import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ReportType = 'term' | 'unit-summary' | 'summary' | 'importance' | 'question' | 'other';

/** The report types offered to the reader, in the list's order (the backend accepts the same values). */
export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'term', label: 'شرح مصطلح' },
  { value: 'unit-summary', label: 'ملخص وحدة' },
  { value: 'summary', label: 'الخلاصة أو الأفكار الرئيسية' },
  { value: 'importance', label: 'تمييز المهم' },
  { value: 'question', label: 'سؤال «اختبر فهمي»' },
  { value: 'other', label: 'أخرى' },
];

export interface Report {
  documentId: string; mode: string | null; unit: number | null;
  type: ReportType; name: string; email: string; message: string;
}

/** Sends what readers tell us to the backend's "feedback" collection. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);

  sendReport(report: Report): Observable<unknown> {
    return this.http.post('/api/feedback', { kind: 'report', ...report });
  }

  sendHelpful(answer: { helpful: boolean; page: string; documentId: string | null; mode: string | null }): Observable<unknown> {
    return this.http.post('/api/feedback', { kind: 'helpful', ...answer });
  }
}
