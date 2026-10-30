import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

export interface LifeNote {
  noteId: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveNote {
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
}

interface CsrfResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly http = inject(HttpClient);

  getNotes(): Observable<LifeNote[]> {
    return this.http.get<LifeNote[]>('/api/notes');
  }

  createNote(note: SaveNote): Observable<LifeNote> {
    return this.withCsrf((headers) => this.http.post<LifeNote>('/api/notes', note, { headers }));
  }

  updateNote(noteId: string, note: SaveNote): Observable<LifeNote> {
    return this.withCsrf((headers) =>
      this.http.put<LifeNote>(`/api/notes/${noteId}`, note, { headers }),
    );
  }

  deleteNote(noteId: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`/api/notes/${noteId}`, { headers }),
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
