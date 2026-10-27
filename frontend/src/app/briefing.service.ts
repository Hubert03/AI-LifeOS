import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface Briefing {
  summary: string;
  priorities: { title: string; reason: string }[];
  goalToWatch: { title: string; note: string } | null;
  suggestion: string;
  generatedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class BriefingService {
  private readonly http = inject(HttpClient);

  get(): Observable<Briefing> {
    return this.http.get<Briefing>('/api/ai/briefing');
  }

  refresh(): Observable<Briefing> {
    return this.http.get<{ requestToken: string }>('/api/auth/csrf').pipe(
      switchMap(({ requestToken }) =>
        this.http.post<Briefing>('/api/ai/briefing/refresh', {}, {
          headers: new HttpHeaders({ 'X-CSRF-TOKEN': requestToken }),
        }),
      ),
    );
  }
}