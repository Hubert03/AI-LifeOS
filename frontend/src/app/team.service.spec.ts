import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TeamService } from './team.service';

describe('TeamService', () => {
  let service: TeamService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeamService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('creates an account with a CSRF-protected admin request', () => {
    const created = {
      userId: '95fa6c77-1b2a-48df-aea6-77860d2eb6d3',
      email: 'teammate@example.com',
      displayName: 'Team Mate',
      temporaryPassword: 'Aa1!temporary-password',
      mustChangePassword: true,
    };
    service.createUser('Team Mate', 'teammate@example.com').subscribe((user) => {
      expect(user).toEqual(created);
    });

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'admin-token' });
    const request = httpTesting.expectOne('/api/admin/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('admin-token');
    expect(request.request.body).toEqual({
      displayName: 'Team Mate',
      email: 'teammate@example.com',
    });
    request.flush(created);
  });

  it('loads only the groups available to the signed-in teammate', () => {
    const groups = [{ groupId: 'a2a16c6d-09f5-4536-a629-b87d1cb23472', name: 'Design' }];
    service.getGroups().subscribe((result) => expect(result).toEqual(groups));

    const request = httpTesting.expectOne('/api/chat/groups');
    expect(request.request.method).toBe('GET');
    request.flush(groups);
  });

  it('updates both role and active state through a CSRF-protected admin request', () => {
    service.setUserAccess('user-123', true, true).subscribe();

    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'admin-token' });
    const request = httpTesting.expectOne('/api/admin/users/user-123/access');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('admin-token');
    expect(request.request.body).toEqual({ isAdmin: true, isActive: true });
    request.flush(null);
  });
});
