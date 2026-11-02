import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface Reminder {
  reminderId: string;
  taskId: string | null;
  title: string;
  dueAtUtc: string;
  status: 'Scheduled' | 'Triggered' | 'Dismissed';
  triggeredAtUtc: string | null;
}

export interface PushConfiguration {
  publicKey: string | null;
  enabled: boolean;
}

export interface SaveReminder {
  title: string; 
  dueAtUtc: string;
  taskId: string | null;
}

export function parseReminderUtcDate(value: string): Date {
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  return new Date(timestamp);
}

@Injectable({ providedIn: 'root' })
export class RemindersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getReminders(): Observable<Reminder[]> {
    return this.http.get<Reminder[]>('/api/reminders');
  }

  getPushConfiguration(): Observable<PushConfiguration> {
    return this.http.get<PushConfiguration>('/api/reminders/push-config');
  }

  createReminder(reminder: SaveReminder): Observable<Reminder> {
    return this.withCsrf((headers) =>
      this.http.post<Reminder>('/api/reminders', reminder, { headers }),
    );
  }

  updateReminder(id: string, reminder: SaveReminder): Observable<Reminder> {
    return this.withCsrf((headers) =>
      this.http.put<Reminder>(`/api/reminders/${id}`, reminder, { headers }),
    );
  }

  snooze(id: string, minutes: number): Observable<Reminder> {
    return this.withCsrf((headers) =>
      this.http.post<Reminder>(`/api/reminders/${id}/snooze`, { minutes }, { headers }),
    );
  }

  dismiss(id: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.post<void>(`/api/reminders/${id}/dismiss`, {}, { headers }),
    );
  }

  deleteReminder(id: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`/api/reminders/${id}`, { headers }),
    );
  }

  savePushSubscription(subscription: PushSubscriptionJSON): Observable<void> {
    const keys = subscription.keys;
    if (!subscription.endpoint || !keys?.['p256dh'] || !keys['auth']) {
      throw new Error('The browser returned an incomplete push subscription.');
    }

    return this.withCsrf((headers) =>
      this.http.put<void>(
        '/api/reminders/push-subscription',
        {
          endpoint: subscription.endpoint,
          p256dh: keys['p256dh'],
          auth: keys['auth'],
        },
        { headers },
      ),
    );
  }

  removePushSubscription(endpoint: string): Observable<void> {
    return this.withCsrf((headers) =>
      this.http.delete<void>('/api/reminders/push-subscription', {
        headers,
        body: { endpoint },
      }),
    );
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.auth.loadCsrfToken().pipe(
      switchMap(() => request(this.auth.csrfHeaders())),
    );
  }
}
