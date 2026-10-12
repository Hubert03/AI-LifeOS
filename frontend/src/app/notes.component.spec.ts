import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotesComponent } from './notes.component';

describe('NotesComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('ai-lifeos-theme');
  });

  it('renders loaded notes and offers pinning and editing actions', () => {
    const fixture = TestBed.createComponent(NotesComponent);
    fixture.detectChanges();
    http.expectOne('/api/notes').flush([
      {
        noteId: 'note-1',
        title: 'Biology revision',
        content: 'Review cell structure and make flash cards.',
        isPinned: true,
        color: '#DCCB9A',
        createdAtUtc: '2026-10-12T00:00:00Z',
        updatedAtUtc: null,
      },
    ]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Biology revision');
    expect(page.textContent).toContain('Review cell structure');
    expect(page.querySelector('app-ai-planner')).toBeTruthy();
    expect(page.querySelector('[aria-label="Unpin note"]')).toBeTruthy();
  });
});
