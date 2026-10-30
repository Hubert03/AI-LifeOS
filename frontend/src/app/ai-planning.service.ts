import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface ProposedGoal {
  title: string;
  description: string;
  targetDate: string | null;
  milestones: { title: string; isCompleted: boolean }[];
}

export interface ProposedTask {
  title: string;
  description: string;
  dueAtUtc: string | null;
  priority: number;
}

export interface ProposedNote {
  title: string;
  content: string;
}

export interface AiPlan {
  summary: string;
  note: ProposedNote | null;
  goal: ProposedGoal | null;
  tasks: ProposedTask[];
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AiPlanningService {
  private readonly http = inject(HttpClient);

  createPlan(objective: string, target: 'overview' | 'tasks' | 'goals' | 'notes'): Observable<AiPlan> {
    return this.withCsrf((headers) =>
      this.http.post<AiPlan>('/api/ai/plan', { objective, target }, { headers }),
    );
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
      switchMap(({ token }) =>
        request(new HttpHeaders({ 'X-CSRF-TOKEN': token })),
      ),
    );
  }
}
