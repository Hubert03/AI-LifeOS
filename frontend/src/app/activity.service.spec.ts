import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ActivityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads activity and trash, and restores deleted items with a CSRF token', () => {
    service.getRecentActivity().subscribe((events) => expect(events).toEqual([]));
    http.expectOne('/api/activity?take=12').flush([]);

    service.getTrash().subscribe((items) => expect(items).toEqual([]));
    http.expectOne('/api/activity/trash').flush([]);

    service.restore({
      entityType: 'Task',
      entityId: 'task-1',
      title: 'Read chapter',
      deletedAtUtc: '2026-10-11T00:00:00Z',
    }).subscribe();
    http.expectOne('/api/auth/csrf').flush({ token: 'restore-token' });
    const restore = http.expectOne('/api/activity/trash/task/task-1/restore');
    expect(restore.request.method).toBe('POST');
    expect(restore.request.headers.get('X-CSRF-TOKEN')).toBe('restore-token');
    restore.flush(null);
  });
});
