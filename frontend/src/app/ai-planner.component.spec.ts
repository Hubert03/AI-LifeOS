import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AiPlannerComponent } from './ai-planner.component';

describe('AiPlannerComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AiPlannerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows a generated plan for review and saves it only after approval', async () => {
    const fixture = TestBed.createComponent(AiPlannerComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.ai-planner-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const prompt = page.querySelector('textarea') as HTMLTextAreaElement;
    prompt.value = 'Help me study biology for my exam';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((page.querySelector('form button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    (page.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    http.expectOne('/api/auth/csrf').flush({ token: 'plan-token' });
    const planRequest = http.expectOne('/api/ai/plan');
    expect(planRequest.request.body).toEqual({
      objective: 'Help me study biology for my exam',
      target: 'overview',
    });
    planRequest.flush({
      summary: 'Study in short, focused sessions.',
      note: null,
      goal: null,
      tasks: [
        {
          title: 'Review biology chapter one',
          description: 'Read the chapter and write a short summary.',
          dueAtUtc: null,
          priority: 2,
        },
      ],
    });
    fixture.detectChanges();

    expect(page.textContent).toContain('Review your plan');
    expect(page.textContent).toContain('Review biology chapter one');
    http.expectNone('/api/tasks');

    (page.querySelector('.ai-save-plan') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne('/api/auth/csrf').flush({ token: 'save-task-token' });
    const createTask = http.expectOne('/api/tasks');
    expect(createTask.request.method).toBe('POST');
    expect(createTask.request.body.title).toBe('Review biology chapter one');
    createTask.flush({
      taskId: 'task-1',
      ...createTask.request.body,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.textContent).toContain('Added 1 task to Tasks.');
  });

  it('saves a Notes-context AI result only to Notes using a database-valid color', async () => {
    const fixture = TestBed.createComponent(AiPlannerComponent);
    fixture.componentRef.setInput('context', 'notes');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.ai-planner-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const prompt = page.querySelector('textarea') as HTMLTextAreaElement;
    prompt.value = 'Capture the key ideas from my project meeting';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (page.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    http.expectOne('/api/auth/csrf').flush({ token: 'notes-plan-token' });
    const planRequest = http.expectOne('/api/ai/plan');
    expect(planRequest.request.body).toEqual({
      objective: 'Capture the key ideas from my project meeting',
      target: 'notes',
    });
    fixture.detectChanges();
    expect(page.querySelector('.ai-generation-layer')?.textContent).toContain('notes draft');
    expect(page.querySelector('.ai-gear-loader')).toBeTruthy();
    expect(page.querySelector('.ai-planner-body')?.getAttribute('aria-busy')).toBe('true');
    planRequest.flush({
      summary: 'Keep the key discussion points together.',
      note: { title: 'Project meeting', content: 'Decision: launch the pilot next month.' },
      goal: {
        title: 'Unexpected goal payload',
        description: 'Must not be saved from Notes.',
        targetDate: null,
        milestones: [],
      },
      tasks: [{
        title: 'Unexpected task payload',
        description: 'Must not be saved from Notes.',
        dueAtUtc: null,
        priority: 2,
      }],
    });
    fixture.componentRef.setInput('context', 'goals');
    fixture.detectChanges();
    expect(page.querySelector('.ai-generation-layer')).toBeNull();
    expect(page.textContent).toContain('Review your note');
    expect(page.textContent).toContain('Capture the key ideas from my project meeting');

    (page.querySelector('.ai-save-plan') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne('/api/auth/csrf').flush({ token: 'save-note-token' });
    const createNote = http.expectOne('/api/notes');
    expect(createNote.request.method).toBe('POST');
    expect(createNote.request.body).toEqual({
      title: 'Project meeting',
      content: 'Decision: launch the pilot next month.',
      isPinned: true,
      color: '#C8B8F1',
    });
    http.expectNone('/api/tasks');
    http.expectNone('/api/goals');
    createNote.flush({
      noteId: 'note-1',
      ...createNote.request.body,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.textContent).toContain('Added note to Notes.');
  });

  it('saves a Goals-context result only to Goals', async () => {
    const fixture = TestBed.createComponent(AiPlannerComponent);
    fixture.componentRef.setInput('context', 'goals');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.ai-planner-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const prompt = page.querySelector('textarea') as HTMLTextAreaElement;
    prompt.value = 'Build a steady reading habit';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (page.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    http.expectOne('/api/auth/csrf').flush({ token: 'goal-plan-token' });
    const planRequest = http.expectOne('/api/ai/plan');
    expect(planRequest.request.body).toEqual({
      objective: 'Build a steady reading habit',
      target: 'goals',
    });
    planRequest.flush({
      summary: 'Build a consistent reading practice.',
      note: null,
      goal: {
        title: 'Read every day',
        description: 'Read for at least twenty minutes each day.',
        targetDate: null,
        milestones: [{ title: 'Finish one book', isCompleted: false }],
      },
      tasks: [{
        title: 'Unexpected task payload',
        description: 'Must not be saved from Goals.',
        dueAtUtc: null,
        priority: 2,
      }],
    });
    fixture.detectChanges();
    expect(page.textContent).toContain('Review your goal');

    (page.querySelector('.ai-save-plan') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne('/api/auth/csrf').flush({ token: 'save-goal-token' });
    const createGoal = http.expectOne('/api/goals');
    expect(createGoal.request.method).toBe('POST');
    expect(createGoal.request.body.title).toBe('Read every day');
    http.expectNone('/api/tasks');
    http.expectNone('/api/notes');
    createGoal.flush({
      goalId: 'goal-1',
      ...createGoal.request.body,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.textContent).toContain('Added goal to Goals.');
  });

  it('shows a safe API error message when plan generation fails', () => {
    const fixture = TestBed.createComponent(AiPlannerComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.ai-planner-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const prompt = page.querySelector('textarea') as HTMLTextAreaElement;
    prompt.value = 'Help me study biology for my exam';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (page.querySelector('form button[type="submit"]') as HTMLButtonElement).click();

    http.expectOne('/api/auth/csrf').flush({ token: 'plan-token' });
    http.expectOne('/api/ai/plan').flush(
      { message: 'The AI planning provider could not be reached.' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    fixture.detectChanges();

    expect(page.textContent).toContain('The AI planning provider could not be reached.');
  });
});
