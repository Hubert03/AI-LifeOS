import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GoalsComponent } from './goals.component';

describe('GoalsComponent', () => {
  let httpTesting: HttpTestingController;

  const sampleGoals = [
    {
      goalId: '73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b',
      title: 'Read more',
      description: 'Make time for reading',
      status: 'Active',
      progress: 25,
      targetDate: '2026-12-31',
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
      milestones: [
        { title: 'Read one book', isCompleted: true, sortOrder: 0 },
        { title: 'Build a weekly habit', isCompleted: false, sortOrder: 1 },
      ],
    },
    {
      goalId: '6c5a8f39-480d-4ad1-92dd-9126c052edac',
      title: 'Run a 5K',
      description: null,
      status: 'Paused',
      progress: 40,
      targetDate: null,
      createdAtUtc: '2026-10-11T00:00:00Z',
      updatedAtUtc: null,
      milestones: [],
    },
  ];

  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-theme');
    TestBed.configureTestingModule({
      imports: [GoalsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('ai-lifeos-theme');
  });

  it('shows actual goal progress and filters goal cards by status and search', () => {
    const fixture = TestBed.createComponent(GoalsComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/goals').flush(sampleGoals);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.goal-card')).toHaveLength(2);
    expect(page.querySelector('.goal-stat-card strong')?.textContent).toContain('1');
    expect(page.textContent).toContain('Read more');

    const pausedFilter = [...page.querySelectorAll<HTMLButtonElement>('.goal-filters button')].find(
      (button) => button.textContent?.trim() === 'Paused',
    );
    pausedFilter?.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.goal-card')).toHaveLength(1);
    expect(page.textContent).toContain('Run a 5K');

    const allFilter = [...page.querySelectorAll<HTMLButtonElement>('.goal-filters button')].find(
      (button) => button.textContent?.trim() === 'All goals',
    );
    allFilter?.click();
    fixture.detectChanges();
    const search = page.querySelector('input[aria-label="Search goals"]') as HTMLInputElement;
    search.value = 'reading';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.goal-card')).toHaveLength(1);
    expect(page.textContent).toContain('Read more');
  });

  it('opens a validated create form and persists milestone progress with CSRF', () => {
    const fixture = TestBed.createComponent(GoalsComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/goals').flush(sampleGoals);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.goals-create-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const dialog = page.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Create a goal');
    expect(dialog?.querySelector('input[name="title"]')?.hasAttribute('required')).toBe(true);
    (dialog?.querySelector('.goal-add-milestone') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(dialog?.querySelectorAll('.goal-milestone-input-row')).toHaveLength(1);

    const milestoneButton = [...page.querySelectorAll<HTMLButtonElement>('.goal-milestone-row')].find(
      (button) => button.textContent?.includes('Build a weekly habit'),
    );
    milestoneButton?.click();
    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'milestone-token' });
    const update = httpTesting.expectOne(
      '/api/goals/73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b',
    );
    expect(update.request.method).toBe('PUT');
    expect(update.request.headers.get('X-CSRF-TOKEN')).toBe('milestone-token');
    expect(update.request.body.milestones[1].isCompleted).toBe(true);
    update.flush({
      ...sampleGoals[0],
      milestones: [
        { title: 'Read one book', isCompleted: true, sortOrder: 0 },
        { title: 'Build a weekly habit', isCompleted: true, sortOrder: 1 },
      ],
      updatedAtUtc: '2026-10-12T01:00:00Z',
    });
    fixture.detectChanges();
    expect(page.textContent).toContain('Goal progress updated.');
    expect(page.querySelector('.milestone-count')?.textContent).toContain('2');
  });

  it('shows the API failure status when goal persistence fails', () => {
    const fixture = TestBed.createComponent(GoalsComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/goals').flush(sampleGoals);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const milestone = [...page.querySelectorAll<HTMLButtonElement>('.goal-milestone-row')].find(
      (button) => button.textContent?.includes('Build a weekly habit'),
    );
    milestone?.click();

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'goal-token' });
    httpTesting.expectOne('/api/goals/73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b').flush(
      {},
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    expect(page.textContent).toContain('The API could not save the goal (HTTP 500).');
  });

  it('shows the reason when the goals request is unauthorized', () => {
    const fixture = TestBed.createComponent(GoalsComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/goals').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Your session has expired. Please sign in again.');
    expect(page.textContent).toContain('Try again');
  });
});
