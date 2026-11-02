import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export type TeamTaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
export type TeamGoalStatus = 'Active' | 'Paused' | 'Completed';

export interface TeamWorkspaceMember {
  userId: string;
  displayName: string;
  accessRole: 'Manager' | 'TeamLead' | 'User';
}

export interface TeamWorkspace {
  teamId: string;
  teamName: string;
  accessRole: TeamWorkspaceMember['accessRole'];
  canManageAll: boolean;
  currentUserId: string;
  members: TeamWorkspaceMember[];
}

export interface SaveTeamTask {
  title: string;
  description: string | null;
  status: TeamTaskStatus;
  priority: number;
  dueAtUtc: string | null;
  assignedToUserId: string | null;
}

export interface TeamWorkspaceTask extends SaveTeamTask {
  taskId: string;
  createdByUserId: string;
  createdByDisplayName: string;
  assignedToDisplayName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveTeamGoalMilestone {
  title: string;
  isCompleted: boolean;
}

export interface SaveTeamGoal {
  title: string;
  description: string | null;
  status: TeamGoalStatus;
  progress: number;
  targetDate: string | null;
  milestones: SaveTeamGoalMilestone[];
}

export interface TeamWorkspaceGoal extends SaveTeamGoal {
  goalId: string;
  createdByUserId: string;
  createdByDisplayName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveTeamNote {
  title: string;
  content: string;
  color: string;
}

export interface TeamWorkspaceNote extends SaveTeamNote {
  noteId: string;
  createdByUserId: string;
  createdByDisplayName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class TeamWorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/team/workspace';

  getWorkspace(): Observable<TeamWorkspace> {
    return this.http.get<TeamWorkspace>(this.baseUrl);
  }

  getTasks(): Observable<TeamWorkspaceTask[]> {
    return this.http.get<TeamWorkspaceTask[]>(`${this.baseUrl}/tasks`);
  }

  createTask(task: SaveTeamTask): Observable<TeamWorkspaceTask> {
    return this.withCsrf((headers) =>
      this.http.post<TeamWorkspaceTask>(`${this.baseUrl}/tasks`, task, { headers }),
    );
  }

  updateTask(taskId: string, task: SaveTeamTask): Observable<TeamWorkspaceTask> {
    return this.withCsrf((headers) =>
      this.http.put<TeamWorkspaceTask>(`${this.baseUrl}/tasks/${taskId}`, task, { headers }),
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.baseUrl}/tasks/${taskId}`, { headers }),
    );
  }

  getGoals(): Observable<TeamWorkspaceGoal[]> {
    return this.http.get<TeamWorkspaceGoal[]>(`${this.baseUrl}/goals`);
  }

  createGoal(goal: SaveTeamGoal): Observable<TeamWorkspaceGoal> {
    return this.withCsrf((headers) =>
      this.http.post<TeamWorkspaceGoal>(`${this.baseUrl}/goals`, goal, { headers }),
    );
  }

  updateGoal(goalId: string, goal: SaveTeamGoal): Observable<TeamWorkspaceGoal> {
    return this.withCsrf((headers) =>
      this.http.put<TeamWorkspaceGoal>(`${this.baseUrl}/goals/${goalId}`, goal, { headers }),
    );
  }

  deleteGoal(goalId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.baseUrl}/goals/${goalId}`, { headers }),
    );
  }

  getNotes(): Observable<TeamWorkspaceNote[]> {
    return this.http.get<TeamWorkspaceNote[]>(`${this.baseUrl}/notes`);
  }

  createNote(note: SaveTeamNote): Observable<TeamWorkspaceNote> {
    return this.withCsrf((headers) =>
      this.http.post<TeamWorkspaceNote>(`${this.baseUrl}/notes`, note, { headers }),
    );
  }

  updateNote(noteId: string, note: SaveTeamNote): Observable<TeamWorkspaceNote> {
    return this.withCsrf((headers) =>
      this.http.put<TeamWorkspaceNote>(`${this.baseUrl}/notes/${noteId}`, note, { headers }),
    );
  }

  deleteNote(noteId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.baseUrl}/notes/${noteId}`, { headers }),
    );
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
      switchMap(({ token }) => request(new HttpHeaders({ 'X-CSRF-TOKEN': token }))),
    );
  }
}
