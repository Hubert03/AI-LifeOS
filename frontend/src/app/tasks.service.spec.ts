import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TasksService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads tasks and includes a fresh CSRF token for task mutations', () => {
    service.getTasks().subscribe((tasks) => expect(tasks).toEqual([]));
    httpTesting.expectOne('/api/tasks').flush([]);

    const task = {
      title: 'Prepare presentation',
      description: null,
      status: 'Pending' as const,
      priority: 2,
      dueAtUtc: null,
    };
    service.createTask(task).subscribe((created) => {
      expect(created.title).toBe(task.title);
    });
    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'create-token' });
    const createRequest = httpTesting.expectOne('/api/tasks');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.headers.get('X-CSRF-TOKEN')).toBe('create-token');
    createRequest.flush({
      taskId: 'e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
      ...task,
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: null,
    });

    service.updateTask('e8bc34f7-33b9-48cd-989f-5e5dc0650bd2', {
      ...task,
      status: 'Completed',
    }).subscribe();
    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'update-token' });
    const updateRequest = httpTesting.expectOne(
      '/api/tasks/e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
    );
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.headers.get('X-CSRF-TOKEN')).toBe('update-token');
    updateRequest.flush({
      taskId: 'e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
      ...task,
      status: 'Completed',
      createdAtUtc: '2026-10-12T00:00:00Z',
      updatedAtUtc: '2026-10-12T01:00:00Z',
    });

    service.deleteTask('e8bc34f7-33b9-48cd-989f-5e5dc0650bd2').subscribe();
    httpTesting.expectOne('/api/auth/csrf').flush({ requestToken: 'delete-token' });
    const deleteRequest = httpTesting.expectOne(
      '/api/tasks/e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.headers.get('X-CSRF-TOKEN')).toBe('delete-token');
    deleteRequest.flush(null);
  });
});
