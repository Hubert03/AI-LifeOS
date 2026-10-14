import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, CurrentUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const user: CurrentUser = {
    userId: '95fa6c77-1b2a-48df-aea6-77860d2eb6d3',
    email: 'learner@example.com',
    displayName: 'LifeOS Learner',
    isAdmin: false,
    mustChangePassword: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should fetch a CSRF token before signing in and retain the authenticated user', () => {
    service.login(user.email, 'A-strong-password1!').subscribe((result) => {
      expect(result).toEqual(user);
      expect(service.currentUser()).toEqual(user);
    });

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'csrf-token' });

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token');
    request.flush(user);
  });

  it('accepts a single-use invitation and stores the new account session', () => {
    const token = 'one-time-invitation-token';
    service.acceptInvitation(token, 'Strong-Password1!').subscribe((result) => {
      expect(result).toEqual(user);
      expect(service.currentUser()).toEqual(user);
    });

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'invite-csrf' });
    const request = httpTesting.expectOne('/api/auth/accept-invitation');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('invite-csrf');
    expect(request.request.body).toEqual({
      token,
      password: 'Strong-Password1!',
    });
    request.flush(user);
  });

  it('should send the CSRF header when signing out and clear the authenticated user', () => {
    service.currentUser.set(user);
    service.logout().subscribe();

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'logout-token' });

    const request = httpTesting.expectOne('/api/auth/logout');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('logout-token');
    request.flush(null);

    expect(service.currentUser()).toBeNull();
  });

  it('should update the current user profile with a CSRF-protected request', () => {
    service.updateProfile('Updated Name', 'updated@example.com').subscribe((result) => {
      expect(result).toEqual({
        ...user,
        displayName: 'Updated Name',
        email: 'updated@example.com',
      });
      expect(service.currentUser()).toEqual(result);
    });

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'profile-token' });

    const request = httpTesting.expectOne('/api/auth/profile');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('profile-token');
    expect(request.request.body).toEqual({
      displayName: 'Updated Name',
      email: 'updated@example.com',
    });
    request.flush({
      ...user,
      displayName: 'Updated Name',
      email: 'updated@example.com',
    });
  });

  it('should send a CSRF-protected password change request', () => {
    service.changePassword('Current-Strong1!', 'New-StrongPassword1!').subscribe();

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'password-token' });

    const request = httpTesting.expectOne('/api/auth/change-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('password-token');
    expect(request.request.body).toEqual({
      currentPassword: 'Current-Strong1!',
      newPassword: 'New-StrongPassword1!',
    });
    request.flush(null);
  });
});
