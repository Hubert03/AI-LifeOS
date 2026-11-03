import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface KnowledgeSourceReference {
  noteId: string;
  title: string;
}

export interface KnowledgeAnswer {
  answer: string;
  sources: KnowledgeSourceReference[];
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeAssistantService {
  private readonly http = inject(HttpClient);

  ask(question: string): Observable<KnowledgeAnswer> {
    return this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
      switchMap(({ token }) =>
        this.http.post<KnowledgeAnswer>(
          '/api/ai/ask-notes',
          { question },
          { headers: new HttpHeaders({ 'X-CSRF-TOKEN': token }) },
        ),
      ),
    );
  }
}
