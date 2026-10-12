import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AiPlanningService } from './ai-planning.service';

describe('AiPlanningService', () => {
  let service: AiPlanningService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiPlanningService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a proposed plan without persisting it', () => {
    const plan = { summary: 'Study steadily', note: null, goal: null, tasks: [] };
    service.createPlan('Prepare for biology', 'tasks').subscribe((result) => {
      expect(result).toEqual(plan);
    });
    http.expectOne('/api/auth/csrf').flush({ requestToken: 'plan-token' });
    const request = http.expectOne('/api/ai/plan');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('plan-token');
    expect(request.request.body).toEqual({
      objective: 'Prepare for biology',
      target: 'tasks',
    });
    request.flush(plan);
  });
});
