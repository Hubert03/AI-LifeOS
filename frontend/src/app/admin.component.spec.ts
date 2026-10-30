import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('ai-lifeos-theme');
  });

  it('shows server validation errors when account creation fails', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    http.expectOne('/api/admin/users').flush([]);
    http.expectOne('/api/admin/chat-groups').flush([]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const nameInput = page.querySelector<HTMLInputElement>('#create-name')!;
    const emailInput = page.querySelector<HTMLInputElement>('#create-email')!;
    nameInput.value = 'Team Mate';
    emailInput.value = 'teammate@example.com';
    nameInput.dispatchEvent(new Event('input'));
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    page.querySelector<HTMLFormElement>('#create-user form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    http.expectOne('/api/auth/csrf').flush({ token: 'admin-token' });
    http.expectOne('/api/admin/users').flush(
      {
        title: 'One or more validation errors occurred.',
        errors: { Email: ['An account with this email already exists.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'An account with this email already exists.',
    );
  });
});
