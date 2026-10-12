import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface ActivityEntry {
  activityId: string;
  action: string;
  entityType: string;
  entityId: string;
  title: string;
  createdAtUtc: string;
}

export interface TrashEntry {
  entityType: string;
  entityId: string;
  title: string;
  deletedAtUtc: string;
}

interface CsrfResponse {
  requestToken: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  getRecentActivity(): Observable<ActivityEntry[]> {
    return this.http.get<ActivityEntry[]>('/api/activity?take=12');
  }

  getTrash(): Observable<TrashEntry[]> {
    return this.http.get<TrashEntry[]>('/api/activity/trash');
  }

  restore(item: TrashEntry): Observable<void> {
    const type = encodeURIComponent(item.entityType.toLowerCase());
    return this.withCsrf((headers) =>
      this.http.post<void>(`/api/activity/trash/${type}/${item.entityId}/restore`, {}, { headers }),
    );
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
      switchMap(({ requestToken }) =>
        request(new HttpHeaders({ 'X-CSRF-TOKEN': requestToken })),
      ),
    );
  }
}
