import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export type GoalStatus = 'Active' | 'Paused' | 'Completed';

export interface GoalMilestone {
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface LifeGoal {
  goalId: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progress: number;
  targetDate: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  milestones: GoalMilestone[];
}

export interface SaveGoalMilestone {
  title: string;
  isCompleted: boolean;
}

export interface SaveGoal {
  title: string;
  description: string | null;
  status: GoalStatus;
  progress: number;
  targetDate: string | null;
  milestones: SaveGoalMilestone[];
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly http = inject(HttpClient);

  getGoals(): Observable<LifeGoal[]> {
    return this.http.get<LifeGoal[]>('/api/goals');
  }

  createGoal(goal: SaveGoal): Observable<LifeGoal> {
    return this.withCsrf((headers) => this.http.post<LifeGoal>('/api/goals', goal, { headers }));
  }

  updateGoal(goalId: string, goal: SaveGoal): Observable<LifeGoal> {
    return this.withCsrf((headers) =>
      this.http.put<LifeGoal>(`/api/goals/${goalId}`, goal, { headers }),
    );
  }

  deleteGoal(goalId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`/api/goals/${goalId}`, { headers }),
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
