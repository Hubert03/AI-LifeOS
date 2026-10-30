import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export type CaptureType = 'task' | 'goal' | 'note';

export interface CaptureDraft {
  type: CaptureType;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: number | null;
  targetDate: string | null;
  milestones: string[];
  content: string | null;
}

@Injectable({ providedIn: 'root' })
export class CaptureService {
  private readonly http = inject(HttpClient);

  capture(text: string, localDate: string): Observable<CaptureDraft> {
    return this.http.get<{ token: string }>('/api/auth/csrf').pipe(
      switchMap(({ token }) =>
        this.http.post<CaptureDraft>(
          '/api/ai/capture',
          { text, localDate },
          { headers: new HttpHeaders({ 'X-CSRF-TOKEN': token }) },
        ),
      ),
    );
  }
}