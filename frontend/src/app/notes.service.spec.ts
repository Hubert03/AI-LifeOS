import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  let service: NotesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads notes and sends CSRF tokens with note mutations', () => {
    service.getNotes().subscribe((notes) => expect(notes).toEqual([]));
    http.expectOne('/api/notes').flush([]);

    const note = { title: 'Study plan', content: 'Review chapter one', isPinned: true, color: '#DCCB9A' };
    service.createNote(note).subscribe();
    http.expectOne('/api/auth/csrf').flush({ token: 'note-token' });
    const create = http.expectOne('/api/notes');
    expect(create.request.method).toBe('POST');
    expect(create.request.headers.get('X-CSRF-TOKEN')).toBe('note-token');
    create.flush({
      noteId: 'note-1',
      ...note,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
    });

    service.deleteNote('note-1').subscribe();
    http.expectOne('/api/auth/csrf').flush({ token: 'delete-note-token' });
    const remove = http.expectOne('/api/notes/note-1');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('X-CSRF-TOKEN')).toBe('delete-note-token');
    remove.flush(null);
  });
});
