import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let httpTesting: HttpTestingController;

  function flushOverviewExtras(): void {
    httpTesting.expectOne('/api/goals').flush([]);
    httpTesting.expectOne('/api/notes').flush([]);
    httpTesting.expectOne('/api/activity?take=12').flush([]);
    httpTesting.expectOne('/api/activity/trash').flush([]);
  }

  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-theme');
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('ai-lifeos-theme');
  });

  it('shows a personalized dashboard and API forecast results', () => {
    TestBed.inject(AuthService).currentUser.set({
      userId: '95fa6c77-1b2a-48df-aea6-77860d2eb6d3',
      email: 'dilan@example.com',
      displayName: 'Dilan Learner',
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/WeatherForecast').flush([
      {
        date: '2026-10-13',
        temperatureC: 18,
        temperatureF: 64,
        summary: 'Mild',
      },
      {
        date: '2026-10-14',
        temperatureC: 22,
        temperatureF: 71,
        summary: 'Warm',
      },
    ]);
    httpTesting.expectOne('/api/tasks').flush([
      {
        taskId: 'e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
        title: 'Prepare presentation',
        description: 'Draft the slides',
        status: 'Pending',
        priority: 1,
        dueAtUtc: new Date().toISOString().slice(0, 10) + 'T00:00:00Z',
        createdAtUtc: '2026-10-12T00:00:00Z',
        updatedAtUtc: null,
      },
      {
        taskId: '1d558383-359f-4c17-a511-af1f1bc30c3e',
        title: 'Read project notes',
        description: null,
        status: 'Completed',
        priority: 3,
        dueAtUtc: null,
        createdAtUtc: '2026-10-11T00:00:00Z',
        updatedAtUtc: null,
      },
    ]);
    flushOverviewExtras();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Dilan');
    expect(page.querySelectorAll('.forecast-mini-row')).toHaveLength(2);
    expect(page.querySelector('.total-card strong')?.textContent).toBe('2');
    expect(page.querySelector('.total-card')?.getAttribute('href')).toBe('/tasks');
    expect(
      [...page.querySelectorAll<HTMLAnchorElement>('.summary-stat')].map((link) => link.getAttribute('href')),
    ).toContain('/tasks?status=InProgress');
    expect(page.querySelector('.month-goal-panel')?.getAttribute('href')).toBe('/goals');
    expect(page.textContent).toContain('Prepare presentation');
    expect(page.textContent).toContain('Set a meaningful goal');
    expect(page.querySelector('app-ai-planner')).toBeTruthy();
  });

  it('filters recent tasks and opens notifications and theme controls', () => {
    localStorage.setItem('ai-lifeos-theme', 'dark');
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/WeatherForecast').flush([
      { date: '2026-10-13', temperatureC: 18, temperatureF: 64, summary: 'Mild' },
      { date: '2026-10-14', temperatureC: 22, temperatureF: 71, summary: 'Warm' },
    ]);
    httpTesting.expectOne('/api/tasks').flush([
      {
        taskId: 'e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
        title: 'Prepare presentation',
        description: 'Draft the slides',
        status: 'Pending',
        priority: 1,
        dueAtUtc: null,
        createdAtUtc: '2026-10-12T00:00:00Z',
        updatedAtUtc: null,
      },
      {
        taskId: '1d558383-359f-4c17-a511-af1f1bc30c3e',
        title: 'Read project notes',
        description: null,
        status: 'Completed',
        priority: 3,
        dueAtUtc: null,
        createdAtUtc: '2026-10-11T00:00:00Z',
        updatedAtUtc: null,
      },
    ]);
    flushOverviewExtras();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const search = page.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'presentation';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.forecast-mini-row')).toHaveLength(2);
    expect(page.querySelectorAll('.history-row')).toHaveLength(1);
    expect(page.textContent).toContain('Prepare presentation');

    (page.querySelector('.notification-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('.notification-popover')?.textContent).toContain(
      'You’re all caught up.',
    );

    (page.querySelector('.theme-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('.app-shell')?.classList.contains('theme-light')).toBe(true);
    expect(localStorage.getItem('ai-lifeos-theme')).toBe('light');
  });

  it('explains when task loading fails because the session expired', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpTesting.expectOne('/WeatherForecast').flush([]);
    httpTesting.expectOne('/api/tasks').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    flushOverviewExtras();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Your session has expired. Please sign in again to load your tasks.',
    );
  });
});
