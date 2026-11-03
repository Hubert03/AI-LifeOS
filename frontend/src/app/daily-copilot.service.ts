import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface CopilotSource {
  sourceId: string;
  sourceType: 'task' | 'goal' | 'reminder' | 'note';
  title: string;
}

export interface CopilotFocusItem extends CopilotSource {
  reason: string;
}

export interface CopilotTaskAction {
  title: string;
  description: string | null;
  priority: number;
  sources: CopilotSource[];
}

export interface DailyCopilotPlan {
  summary: string;
  focusItems: CopilotFocusItem[];
  actions: CopilotTaskAction[];
  generatedAtUtc: string;
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class DailyCopilotService {
  private readonly http = inject(HttpClient);

  createPlan(focus: string): Observable<DailyCopilotPlan> {
    return this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
      switchMap(({ token }) =>
        this.http.post<DailyCopilotPlan>(
          '/api/ai/copilot',
          { focus: focus.trim() || null },
          { headers: new HttpHeaders({ 'X-CSRF-TOKEN': token }) },
        ),
      ),
    );
  }
}
