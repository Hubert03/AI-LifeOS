import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DailyCopilotComponent } from './daily-copilot.component';

describe('DailyCopilotComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DailyCopilotComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a plan and only saves a suggested task after explicit approval', async () => {
    const fixture = TestBed.createComponent(DailyCopilotComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('aside.sidebar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('header.topbar h1')?.textContent).toContain('Daily Copilot');
    expect(fixture.nativeElement.querySelector('aside.sidebar [aria-current="page"]')?.textContent).toContain('Daily Copilot');

    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    http.expectOne('/api/auth/csrf').flush({ token: 'copilot-token' });
    const planRequest = http.expectOne('/api/ai/copilot');
    expect(planRequest.request.method).toBe('POST');
    expect(planRequest.request.headers.get('X-CSRF-TOKEN')).toBe('copilot-token');
    expect(planRequest.request.body).toEqual({ focus: null });
    planRequest.flush({
      summary: 'Start with the upcoming deadline.',
      focusItems: [{
        sourceType: 'task',
        sourceId: 'task-1',
        title: 'Prepare the release',
        reason: 'It is due soon.',
      }],
      actions: [{
        title: 'Review release checklist',
        description: 'Check the remaining deployment steps.',
        priority: 2,
        sources: [{
          sourceId: 'task-1',
          sourceType: 'task',
          title: 'Prepare the release',
        }],
      }],
      generatedAtUtc: '2026-11-03T10:00:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Start with the upcoming deadline.');
    http.expectNone('/api/tasks');

    (fixture.nativeElement.querySelector('.action-card input') as HTMLInputElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.approve-button') as HTMLButtonElement).click();
    http.expectOne('/api/auth/csrf').flush({ token: 'task-token' });
    const taskRequest = http.expectOne('/api/tasks');
    expect(taskRequest.request.method).toBe('POST');
    expect(taskRequest.request.headers.get('X-CSRF-TOKEN')).toBe('task-token');
    expect(taskRequest.request.body).toEqual({
      title: 'Review release checklist',
      description: 'Check the remaining deployment steps.',
      status: 'Pending',
      priority: 2,
      dueAtUtc: null,
    });
    taskRequest.flush({ taskId: 'new-task' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 task added.');
  });
});
