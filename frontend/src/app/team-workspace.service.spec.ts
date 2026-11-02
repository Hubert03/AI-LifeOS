import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TeamWorkspaceService } from './team-workspace.service';

describe('TeamWorkspaceService', () => {
  let service: TeamWorkspaceService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeamWorkspaceService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads team workspace metadata without accepting a client-supplied team id', () => {
    const workspace = {
      teamId: 'team-1',
      teamName: 'Product',
      accessRole: 'Manager' as const,
      canManageAll: true,
      currentUserId: 'user-1',
      members: [],
    };
    service.getWorkspace().subscribe((result) => expect(result).toEqual(workspace));

    const request = httpTesting.expectOne('/api/team/workspace');
    expect(request.request.method).toBe('GET');
    request.flush(workspace);
  });

  it('creates team tasks with a CSRF token', () => {
    const task = {
      title: 'Review launch plan',
      description: null,
      status: 'Pending' as const,
      priority: 2,
      dueAtUtc: null,
      assignedToUserId: 'user-1',
    };
    service.createTask(task).subscribe((result) => expect(result.title).toBe(task.title));

    httpTesting.expectOne('/api/auth/csrf').flush({ token: 'csrf-token' });
    const request = httpTesting.expectOne('/api/team/workspace/tasks');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token');
    expect(request.request.body).toEqual(task);
    request.flush({ ...task, taskId: 'task-1', createdByUserId: 'user-1', createdByDisplayName: 'Alex' });
  });
});
