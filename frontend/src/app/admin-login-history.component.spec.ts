import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminLoginHistoryComponent } from './admin-login-history.component';

describe('AdminLoginHistoryComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminLoginHistoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows recent successful and failed login attempts', () => {
    const fixture = TestBed.createComponent(AdminLoginHistoryComponent);
    fixture.detectChanges();
    http.expectOne('/api/admin/login-history?take=50').flush([
      {
        loginHistoryId: 'login-1',
        userId: 'user-1',
        displayName: 'Alex',
        email: 'alex@example.com',
        succeeded: true,
        attemptedAtUtc: '2026-01-01T10:00:00Z',
      },
      {
        loginHistoryId: 'login-2',
        userId: 'user-1',
        displayName: 'Alex',
        email: 'alex@example.com',
        succeeded: false,
        attemptedAtUtc: '2026-01-01T09:00:00Z',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Successful');
    expect(fixture.nativeElement.textContent).toContain('Failed');
    expect(fixture.nativeElement.textContent).toContain('alex@example.com');
  });
});
