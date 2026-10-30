import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';

export interface LifeTask {
  taskId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  dueAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveTask {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  dueAtUtc: string | null;
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  getTasks(): Observable<LifeTask[]> {
    return this.http.get<LifeTask[]>('/api/tasks');
  }

  createTask(task: SaveTask): Observable<LifeTask> {
    return this.withCsrf((headers) => this.http.post<LifeTask>('/api/tasks', task, { headers }));
  }

  updateTask(taskId: string, task: SaveTask): Observable<LifeTask> {
    return this.withCsrf((headers) =>
      this.http.put<LifeTask>(`/api/tasks/${taskId}`, task, { headers }),
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`/api/tasks/${taskId}`, { headers }),
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
