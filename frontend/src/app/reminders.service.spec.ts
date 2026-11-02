import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { parseReminderUtcDate, RemindersService } from './reminders.service';

describe('RemindersService', () => {
  let service: RemindersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RemindersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('treats timezone-less reminder timestamps as UTC', () => {
    expect(parseReminderUtcDate('2026-11-02T12:45:00').toISOString()).toBe(
      '2026-11-02T12:45:00.000Z',
    );
  });

  it('preserves explicit UTC offsets in reminder timestamps', () => {
    expect(parseReminderUtcDate('2026-11-02T12:45:00Z').toISOString()).toBe(
      '2026-11-02T12:45:00.000Z',
    );
    expect(parseReminderUtcDate('2026-11-02T18:15:00+05:30').toISOString()).toBe(
      '2026-11-02T12:45:00.000Z',
    );
  });

  it('loads reminders and push configuration', () => {
    service.getReminders().subscribe((reminders) => expect(reminders).toEqual([]));
    http.expectOne('/api/reminders').flush([]);

    const configuration = { publicKey: null, enabled: false };
    service.getPushConfiguration().subscribe((result) => expect(result).toEqual(configuration));
    http.expectOne('/api/reminders/push-config').flush(configuration);
  });

  it('creates a reminder with CSRF protection', () => {
    const reminder = {
      title: 'Take a break',
      taskId: null,
      dueAtUtc: '2026-11-02T12:00:00.000Z',
    };
    service.createReminder(reminder).subscribe((result) => expect(result.title).toBe(reminder.title));
    http.expectOne('/api/auth/csrf').flush({ token: 'reminder-token' });

    const request = http.expectOne('/api/reminders');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('reminder-token');
    expect(request.request.body).toEqual(reminder);
    request.flush({
      reminderId: '4c89e59c-02c2-41cc-9632-2963b0f908b0',
      ...reminder,
      status: 'Scheduled',
      triggeredAtUtc: null,
    });
  });

  it('saves browser push keys without exposing them in the URL', () => {
    service.savePushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    }).subscribe();
    http.expectOne('/api/auth/csrf').flush({ token: 'push-token' });

    const request = http.expectOne('/api/reminders/push-subscription');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe('push-token');
    expect(request.request.body).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/subscription',
      p256dh: 'public-key',
      auth: 'auth-secret',
    });
    request.flush(null);
  });
});
