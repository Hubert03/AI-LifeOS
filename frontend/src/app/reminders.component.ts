import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { LifeTask, TasksService } from './tasks.service';
import { parseReminderUtcDate, PushConfiguration, Reminder, RemindersService } from './reminders.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { StyleCreatorService } from './style-creator.service';
import { StyleStudioComponent } from './style-studio.component';

@Component({
  selector: 'app-reminders',
  imports: [DatePipe, FormsModule, RouterLink, ThemePickerComponent, StyleStudioComponent],
  templateUrl: './reminders.component.html',
})
export class RemindersComponent {
  private readonly document = inject(DOCUMENT);
  private readonly remindersService = inject(RemindersService);
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly styleCreator = inject(StyleCreatorService);
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly mobileNavOpen = signal(false);
  protected readonly reminders = signal<Reminder[]>([]);
  protected readonly tasks = signal<LifeTask[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly pushConfiguration = signal<PushConfiguration | null>(null);
  protected readonly pushBusy = signal(false);
  protected readonly notificationsGranted = signal(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  protected readonly pushMessage = signal<string | null>(null);
  protected readonly snoozeReminderId = signal<string | null>(null);
  protected readonly snoozeMinutes = signal(10);
  protected readonly editingReminderId = signal<string | null>(null);
  protected title = '';
  protected dueAtLocal = '';
  protected taskId = '';
  private pendingTriggeredId: string | null = null;
  private pendingNotificationAction: string | null = null;
  protected readonly activeTasks = computed(() =>
    this.tasks().filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled'),
  );
  protected readonly scheduledReminders = computed(() =>
    this.reminders().filter((reminder) => reminder.status === 'Scheduled'),
  );
  protected readonly triggeredReminders = computed(() =>
    this.reminders().filter((reminder) => reminder.status === 'Triggered'),
  );

  constructor() {
    this.resetForm();
    this.load();
    this.remindersService.getPushConfiguration().subscribe({
      next: (configuration) => this.pushConfiguration.set(configuration),
      error: (error: unknown) => this.fail(error),
    });
    this.route.queryParamMap.subscribe((params) => {
      this.pendingTriggeredId = params.get('triggered');
      this.pendingNotificationAction = params.get('action');
      this.handleNotificationAction();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.tasksService.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (error: unknown) => this.fail(error),
    });
    this.remindersService.getReminders().subscribe({
      next: (reminders) => {
        this.reminders.set(reminders);
        this.loading.set(false);
        this.handleNotificationAction();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected saveReminder(): void {
    const title = this.title.trim();
    const dueAt = new Date(this.dueAtLocal);
    if (!title || Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
      this.errorMessage.set('Enter a title and choose a future date and time.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const reminder = {
      title,
      taskId: this.taskId || null,
      dueAtUtc: dueAt.toISOString(),
    };
    const request = this.editingReminderId()
      ? this.remindersService.updateReminder(this.editingReminderId()!, reminder)
      : this.remindersService.createReminder(reminder);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set(this.editingReminderId() ? 'Reminder updated.' : 'Reminder set.');
        this.resetForm();
        this.load();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected editReminder(reminder: Reminder): void {
    this.editingReminderId.set(reminder.reminderId);
    this.title = reminder.title;
    this.taskId = reminder.taskId ?? '';
    this.dueAtLocal = this.toLocalDateTime(reminder.dueAtUtc);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.document.getElementById('reminder-title')?.focus();
  }

  protected cancelEdit(): void {
    this.resetForm();
    this.errorMessage.set(null);
  }

  protected async deleteReminder(reminder: Reminder): Promise<void> {
    if (!window.confirm(`Delete the reminder “${reminder.title}”?`)) return;
    this.remindersService.deleteReminder(reminder.reminderId).subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.fail(error),
    });
  }

  protected openSnooze(reminder: Reminder): void {
    this.snoozeReminderId.set(reminder.reminderId);
    this.snoozeMinutes.set(10);
  }

  protected snooze(minutes = this.snoozeMinutes()): void {
    const id = this.snoozeReminderId();
    if (!id || !Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      this.errorMessage.set('Choose a snooze timer from 1 to 120 minutes.');
      return;
    }
    this.remindersService.snooze(id, minutes).subscribe({
      next: () => {
        this.snoozeReminderId.set(null);
        this.successMessage.set(`Snoozed for ${minutes} minutes.`);
        this.load();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected dismiss(reminder: Reminder): void {
    this.remindersService.dismiss(reminder.reminderId).subscribe({
      next: () => {
        this.snoozeReminderId.set(null);
        this.successMessage.set('Reminder stopped.');
        this.load();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected async enableNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      this.pushMessage.set('This browser does not support web push notifications.');
      return;
    }
    const configuration = this.pushConfiguration();
    if (!configuration?.enabled || !configuration.publicKey) {
      this.pushMessage.set('Push notifications are not configured on the API yet.');
      return;
    }

    this.pushBusy.set(true);
    this.pushMessage.set(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.pushMessage.set('Allow notifications in your browser settings to receive reminders.');
        return;
      }
      this.notificationsGranted.set(true);
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.decodeVapidKey(configuration.publicKey),
        });
      await firstValueFrom(
        this.remindersService.savePushSubscription(subscription.toJSON()),
      );
      this.pushMessage.set('This device can now receive reminder notifications.');
    } catch (error) {
      this.fail(error);
      this.pushMessage.set(this.getErrorMessage(error));
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected async disableNotifications(): Promise<void> {
    this.pushBusy.set(true);
    this.pushMessage.set(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await firstValueFrom(this.remindersService.removePushSubscription(subscription.endpoint));
        await subscription.unsubscribe();
      }
      this.notificationsGranted.set(false);
      this.pushMessage.set('Notifications disabled for this device.');
    } catch (error) {
      this.fail(error);
      this.pushMessage.set(this.getErrorMessage(error));
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected taskTitle(taskId: string | null): string | null {
    return taskId ? this.tasks().find((task) => task.taskId === taskId)?.title ?? 'Linked task' : null;
  }

  protected reminderDate(value: string): Date {
    return parseReminderUtcDate(value);
  }

  protected resetForm(): void {
    this.editingReminderId.set(null);
    this.title = '';
    this.taskId = '';
    this.dueAtLocal = this.toLocalDateTime(new Date(Date.now() + 5 * 60_000).toISOString());
  }

  private handleNotificationAction(): void {
    const id = this.pendingTriggeredId;
    if (!id || this.loading()) return;
    const reminder = this.reminders().find((item) => item.reminderId === id);
    if (!reminder) return;

    if (this.pendingNotificationAction === 'stop' && reminder.status !== 'Dismissed') {
      this.pendingNotificationAction = null;
      this.clearNotificationQuery();
      this.dismiss(reminder);
    } else {
      if (this.pendingNotificationAction === 'snooze') this.openSnooze(reminder);
      this.pendingNotificationAction = null;
      this.clearNotificationQuery();
    }
  }

  private clearNotificationQuery(): void {
    this.pendingTriggeredId = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { triggered: null, action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private decodeVapidKey(value: string): Uint8Array<ArrayBuffer> {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  private toLocalDateTime(value: string): string {
    const date = parseReminderUtcDate(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private fail(error: unknown): void {
    this.errorMessage.set(this.getErrorMessage(error));
    this.loading.set(false);
    this.saving.set(false);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (typeof message === 'string') return message;
      if (error.status === 0) return 'Cannot reach the API. Check that the backend is running.';
    }
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
