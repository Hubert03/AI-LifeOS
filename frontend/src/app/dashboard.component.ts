import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActivityEntry, ActivityService, TrashEntry } from './activity.service';
import { AiPlannerComponent } from './ai-planner.component';
import { AuthService } from './auth.service';
import { LifeGoal, GoalsService } from './goals.service';
import { LifeTask, TasksService } from './tasks.service';
import { LifeNote, NotesService } from './notes.service';
import { WeatherForecast, WeatherForecastService } from './weather-forecast';

@Component({
  selector: 'app-dashboard',
  imports: [AiPlannerComponent, DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly forecastService = inject(WeatherForecastService);
  private readonly tasksService = inject(TasksService);
  private readonly goalsService = inject(GoalsService);
  private readonly notesService = inject(NotesService);
  private readonly activityService = inject(ActivityService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly forecasts = signal<WeatherForecast[]>([]);
  protected readonly tasks = signal<LifeTask[]>([]);
  protected readonly goals = signal<LifeGoal[]>([]);
  protected readonly notes = signal<LifeNote[]>([]);
  protected readonly activity = signal<ActivityEntry[]>([]);
  protected readonly trash = signal<TrashEntry[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly tasksLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tasksErrorMessage = signal<string | null>(null);
  protected readonly logoutError = signal<string | null>(null);
  protected readonly goalsError = signal<string | null>(null);
  protected readonly historyError = signal<string | null>(null);
  protected readonly notesError = signal<string | null>(null);
  protected readonly restoreMessage = signal<string | null>(null);
  protected readonly restoringId = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly notificationsOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly isDarkTheme = signal(true);
  protected readonly today = new Date();
  protected readonly greeting = this.getGreeting();
  protected readonly displayName = computed(
    () => this.currentUser()?.displayName.trim().split(/\s+/)[0] || 'there',
  );
  protected readonly pendingCount = computed(
    () => this.tasks().filter((task) => task.status === 'Pending').length,
  );
  protected readonly inProgressCount = computed(
    () => this.tasks().filter((task) => task.status === 'InProgress').length,
  );
  protected readonly completedCount = computed(
    () => this.tasks().filter((task) => task.status === 'Completed').length,
  );
  protected readonly cancelledCount = computed(
    () => this.tasks().filter((task) => task.status === 'Cancelled').length,
  );
  protected readonly dueTodayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.tasks().filter(
      (task) => task.status !== 'Completed' && task.dueAtUtc?.slice(0, 10) === today,
    ).length;
  });
  protected readonly taskStatusSummary = computed(() => {
    const total = this.tasks().length;
    return [
      { label: 'To do', count: this.pendingCount(), color: 'chart-fill-pending' },
      { label: 'In progress', count: this.inProgressCount(), color: 'chart-fill-inprogress' },
      { label: 'Completed', count: this.completedCount(), color: 'chart-fill-completed' },
      {
        label: 'Cancelled',
        count: this.cancelledCount(),
        color: 'chart-fill-cancelled',
      },
    ].map((status) => ({
      ...status,
      percentage: total === 0 ? 0 : Math.max(6, (status.count / total) * 100),
    }));
  });
  protected readonly recentTasks = computed(() =>
    [...this.tasks()]
      .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc))
      .slice(0, 4),
  );
  protected readonly pinnedNotes = computed(() =>
    this.notes().filter((note) => note.isPinned).slice(0, 3),
  );
  protected readonly currentGoals = computed(() =>
    this.goals().filter((goal) => goal.status === 'Active').slice(0, 4),
  );
  protected readonly goalAverage = computed(() => {
    const active = this.goals().filter((goal) => goal.status === 'Active');
    return active.length
      ? Math.round(active.reduce((sum, goal) => sum + goal.progress, 0) / active.length)
      : 0;
  });
  protected readonly visibleTasks = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const filtered = this.tasks().filter(
      (task) =>
        !query || `${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(query),
    );
    return filtered
      .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc))
      .slice(0, 4);
  });
  constructor() {
    this.isDarkTheme.set(localStorage.getItem('ai-lifeos-theme') !== 'light');
    this.loadForecast();
    this.loadTasks();
    this.loadOverviewExtras();
  }

  protected loadForecast(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.forecastService.getForecast().subscribe({
      next: (forecasts) => this.forecasts.set(forecasts),
      error: () => {
        this.errorMessage.set(
          'Could not load the forecast. Check that the API is running, then try again.',
        );
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  protected loadTasks(): void {
    this.tasksLoading.set(true);
    this.tasksErrorMessage.set(null);
    this.tasksService.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (error: unknown) => {
        this.tasksErrorMessage.set(this.getTasksErrorMessage(error));
        this.tasksLoading.set(false);
      },
      complete: () => this.tasksLoading.set(false),
    });
  }

  private getTasksErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Could not load your tasks. Please try again.';
    }
    if (error.status === 0) {
      return 'Could not reach the API. Check that it is running, then try again.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again to load your tasks.';
    }
    if (error.status === 403) {
      return 'You are not authorized to load these tasks.';
    }
    if (error.status >= 500) {
      return `The API could not load your tasks (HTTP ${error.status}). Please try again later.`;
    }
    return 'Could not load your tasks. Please try again.';
  }

  protected loadOverviewExtras(): void {
    this.goalsService.getGoals().subscribe({
      next: (goals) => this.goals.set(goals),
      error: () => this.goalsError.set('Goal summary could not be loaded.'),
    });
    this.notesService.getNotes().subscribe({
      next: (notes) => this.notes.set(notes),
      error: () => this.notesError.set('Pinned notes could not be loaded. Apply the notes database update and retry.'),
    });
    this.activityService.getRecentActivity().subscribe({
      next: (activity) => this.activity.set(activity),
      error: () => this.historyError.set('Recent activity could not be loaded. Apply the workspace database update and retry.'),
    });
    this.activityService.getTrash().subscribe({
      next: (trash) => this.trash.set(trash),
      error: () => this.historyError.set('Trash could not be loaded. Apply the workspace database update and retry.'),
    });
  }

  protected restore(item: TrashEntry): void {
    this.restoringId.set(item.entityId);
    this.historyError.set(null);
    this.activityService.restore(item).subscribe({
      next: () => {
        this.trash.update((items) => items.filter((entry) => entry.entityId !== item.entityId));
        this.restoreMessage.set(`Restored “${item.title}”.`);
        this.activityService.getRecentActivity().subscribe({
          next: (activity) => this.activity.set(activity),
          error: () => this.historyError.set('The item was restored, but activity history did not refresh.'),
        });
      },
      error: () => {
        this.historyError.set(`Could not restore “${item.title}”. Please try again.`);
        this.restoringId.set(null);
      },
      complete: () => this.restoringId.set(null),
    });
  }

  protected activityLabel(item: ActivityEntry): string {
    const verb: Record<string, string> = {
      Created: 'created',
      Updated: 'updated',
      Completed: 'completed',
      Deleted: 'moved to Trash',
      Restored: 'restored',
    };
    return `${verb[item.action] ?? item.action.toLocaleLowerCase()} ${item.entityType.toLocaleLowerCase()}`;
  }

  protected trackTrashItem(item: TrashEntry): string {
    return `${item.entityType}:${item.entityId}`;
  }

  protected setSearchTerm(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleTheme(): void {
    const nextTheme = !this.isDarkTheme();
    this.isDarkTheme.set(nextTheme);
    localStorage.setItem('ai-lifeos-theme', nextTheme ? 'dark' : 'light');
  }

  protected statusLabel(status: LifeTask['status']): string {
    return status === 'Pending' ? 'To do' : status === 'InProgress' ? 'In progress' : status;
  }

  protected logout(): void {
    this.logoutError.set(null);
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.logoutError.set('Could not sign out. Please try again.'),
    });
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }
}
