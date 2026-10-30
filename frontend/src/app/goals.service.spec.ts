import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GoalsService } from './goals.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoalsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads goal records from the API', () => {
    const goal = {
      goalId: '73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b',
      title: 'Read more',
      description: null,
      status: 'Active' as const,
      progress: 20,
      targetDate: '2026-12-31',
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
      milestones: [{ title: 'Read one book', isCompleted: false, sortOrder: 0 }],
    };

    service.getGoals().subscribe((goals) => expect(goals).toEqual([goal]));
    const request = httpTesting.expectOne('/api/goals');
    expect(request.request.method).toBe('GET');
    request.flush([goal]);
  });

  it('sends create, update and delete mutations with fresh CSRF tokens', () => {
    const goal = {
      title: 'Read more',
      description: 'Make time for reading',
      status: 'Active' as const,
      progress: 25,
      targetDate: '2026-12-31',
      milestones: [{ title: 'Read one book', isCompleted: false }],
    };
    service.createGoal(goal).subscribe();
    httpTesting.expectOne('/api/auth/csrf').flush({ token: 'create-goal-token' });
    const create = httpTesting.expectOne('/api/goals');
    expect(create.request.method).toBe('POST');
    expect(create.request.headers.get('X-CSRF-TOKEN')).toBe('create-goal-token');
    create.flush({
      goalId: '73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b',
      ...goal,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
      milestones: [{ ...goal.milestones[0], sortOrder: 0 }],
    });

    service
      .updateGoal('73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b', { ...goal, progress: 30 })
      .subscribe();
    httpTesting.expectOne('/api/auth/csrf').flush({ token: 'update-goal-token' });
    const update = httpTesting.expectOne('/api/goals/73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b');
    expect(update.request.method).toBe('PUT');
    expect(update.request.headers.get('X-CSRF-TOKEN')).toBe('update-goal-token');
    update.flush({
      goalId: '73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b',
      ...goal,
      progress: 30,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: '2026-10-12T01:00:00Z',
      milestones: [{ ...goal.milestones[0], sortOrder: 0 }],
    });

    service.deleteGoal('73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b').subscribe();
    httpTesting.expectOne('/api/auth/csrf').flush({ token: 'delete-goal-token' });
    const remove = httpTesting.expectOne('/api/goals/73f35d0d-8c5a-4f9f-bb3a-13f6820ea59b');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('X-CSRF-TOKEN')).toBe('delete-goal-token');
    remove.flush(null);
  });
});
