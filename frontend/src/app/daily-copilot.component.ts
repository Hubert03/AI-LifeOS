import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { DailyCopilotPlan, DailyCopilotService } from './daily-copilot.service';
import { PopupStateService } from './popup-state.service';
import { StyleCreatorService } from './style-creator.service';
import { StyleStudioComponent } from './style-studio.component';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { SaveTask, TasksService } from './tasks.service';

@Component({
  selector: 'app-daily-copilot',
  imports: [DatePipe, RouterLink, RouterLinkActive, ThemePickerComponent, StyleStudioComponent],
  templateUrl: './daily-copilot.component.html',
  styleUrl: './daily-copilot.component.css',
})
export class DailyCopilotComponent {
  private readonly copilot = inject(DailyCopilotService);
  private readonly tasks = inject(TasksService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly popupState = inject(PopupStateService);
  protected readonly themeService = inject(ThemeService);
  protected readonly styleCreator = inject(StyleCreatorService);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly displayName = computed(
    () => this.currentUser()?.displayName.trim().split(/\s+/)[0] || 'there',
  );
  protected readonly profileMenuOpen = computed(() => this.popupState.isOpen('profile-menu'));
  protected readonly mobileNavOpen = signal(false);
  protected readonly focus = signal('');
  protected readonly plan = signal<DailyCopilotPlan | null>(null);
  protected readonly selected = signal<Set<number>>(new Set());
  protected readonly loading = signal(false);
  protected readonly approving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly logoutError = signal<string | null>(null);

  protected logout(): void {
    this.logoutError.set(null);
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.logoutError.set('Could not sign out. Please try again.'),
    });
  }

  protected setFocus(event: Event): void {
    this.focus.set((event.target as HTMLTextAreaElement).value);
  }

  protected generate(): void {
    if (this.loading() || this.focus().length > 1000) return;
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.selected.set(new Set());
    this.copilot.createPlan(this.focus()).subscribe({
      next: (plan) => this.plan.set(plan),
      error: (error: unknown) => this.error.set(this.errorMessage(error)),
      complete: () => this.loading.set(false),
    });
  }

  protected toggleAction(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = new Set(this.selected());
    if (checked) selected.add(index);
    else selected.delete(index);
    this.selected.set(selected);
  }

  protected async approveSelected(): Promise<void> {
    const plan = this.plan();
    if (!plan || this.approving() || !this.selected().size) return;

    this.approving.set(true);
    this.error.set(null);
    this.notice.set(null);
    const selectedIndices = [...this.selected()].sort((a, b) => a - b);
    let created = 0;
    const remaining = new Set(selectedIndices);

    try {
      for (const index of selectedIndices) {
        const action = plan.actions[index];
        const task: SaveTask = {
          title: action.title,
          description: action.description,
          status: 'Pending',
          priority: action.priority,
          dueAtUtc: null,
        };
        await firstValueFrom(this.tasks.createTask(task));
        created++;
        remaining.delete(index);
      }

      this.selected.set(new Set());
      this.notice.set(created === 1 ? '1 task added.' : `${created} tasks added.`);
    } catch (error: unknown) {
      this.selected.set(remaining);
      this.notice.set(created ? `${created} task${created === 1 ? '' : 's'} added before an error.` : null);
      this.error.set(this.errorMessage(error));
    } finally {
      this.approving.set(false);
    }
  }

  protected sourceRoute(type: string): string {
    switch (type) {
      case 'task': return '/tasks';
      case 'goal': return '/goals';
      case 'reminder': return '/reminders';
      default: return '/notes';
    }
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'The request could not be completed. Please try again.';
    if (error.status === 0) return 'Cannot reach the API. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 429) return 'You have reached the Copilot limit. Please wait and try again later.';
    if (error.status === 503) return 'AI is not configured. Configure the provider in Settings and try again.';
    if (error.status === 504) return 'The AI provider timed out. Try again in a moment.';
    if (error.error && typeof error.error === 'object' && 'message' in error.error
      && typeof error.error.message === 'string') return error.error.message;
    return `The request failed (HTTP ${error.status}). Please try again.`;
  }
}
