import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard chart interactions', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).currentUser.set({
      userId: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Workspace Admin',
      isAdmin: true,
      mustChangePassword: false,
      accessRole: 'Admin',
      teamId: null,
    });
  });

  afterEach(() => httpTesting.verify());

  it('lets admins select task-status slices and activity days', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/dashboard').flush({
      totalUsers: 1,
      activeUsers: 1,
      inactiveUsers: 0,
      activeAdmins: 1,
      usersNeedingPasswordChange: 0,
      totalTasks: 3,
      openTasks: 2,
      completedTasks: 1,
      overdueTasks: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalNotes: 0,
      taskStatuses: [
        { status: 'Pending', total: 2 },
        { status: 'Completed', total: 1 },
      ],
      activityByDay: [{ dateUtc: '2026-11-02T00:00:00Z', total: 4 }],
      users: [],
    });
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const statusSlice = page.querySelector<SVGCircleElement>('.admin-analytics-grid .donut-seg');
    expect(statusSlice).toBeTruthy();
    statusSlice!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelector('.chart-selection')?.textContent).toContain('To do tasks: 2');

    page.querySelector<HTMLButtonElement>('.admin-analytics-grid .line-dot')!.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.chart-selection')[1].textContent).toContain('4 activity events');

    fixture.destroy();
  });
});
