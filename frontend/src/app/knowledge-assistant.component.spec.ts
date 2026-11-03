import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { KnowledgeAssistantComponent } from './knowledge-assistant.component';

describe('KnowledgeAssistantComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KnowledgeAssistantComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows a cited answer and emits the selected note source', () => {
    const fixture = TestBed.createComponent(KnowledgeAssistantComponent);
    const openedSources: string[] = [];
    fixture.componentInstance.openSource.subscribe(source => openedSources.push(source.noteId));
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const question = page.querySelector('textarea') as HTMLTextAreaElement;
    question.value = 'What was the project timeline?';
    question.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (page.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    http.expectOne('/api/auth/csrf').flush({ token: 'knowledge-token' });
    const request = http.expectOne('/api/ai/ask-notes');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('knowledge-token');
    expect(request.request.body).toEqual({ question: 'What was the project timeline?' });
    request.flush({
      answer: 'The notes say the first milestone is due in June.',
      sources: [{ noteId: 'note-1', title: 'Project timeline' }],
    });
    fixture.detectChanges();

    expect(page.textContent).toContain('The notes say the first milestone is due in June.');
    (page.querySelector('.knowledge-sources button') as HTMLButtonElement).click();
    expect(openedSources).toEqual(['note-1']);
  });
});
