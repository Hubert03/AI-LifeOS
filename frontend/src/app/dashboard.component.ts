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
import {
  AdminDashboard,
  AdminGoal,
  AdminNote,
  AdminPage,
  AdminTask,
  AdminWorkspaceSummary,
  TeamService,
} from './team.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { forkJoin } from 'rxjs';

interface AdminWorkspace {
  tasks: AdminPage<AdminTask>;
  goals: AdminPage<AdminGoal>;
  notes: AdminPage<AdminNote>;
}

type AdminWorkspaceCollection = keyof AdminWorkspace;

@Component({
  selector: 'app-dashboard',
  imports: [AiPlannerComponent, DatePipe, RouterLink, ThemePickerComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly forecastService = inject(WeatherForecastService);
  private readonly tasksService = inject(TasksService);
  private readonly goalsService = inject(GoalsService);
  private readonly notesService = inject(NotesService);
  private readonly activityService = inject(ActivityService);
  private readonly teamService = inject(TeamService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

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
  protected readonly adminDashboard = signal<AdminDashboard | null>(null);
  protected readonly adminDashboardLoading = signal(false);
  protected readonly adminDashboardError = signal<string | null>(null);
  protected readonly selectedAdminUser = signal<AdminWorkspaceSummary | null>(null);
  protected readonly adminWorkspace = signal<AdminWorkspace | null>(null);
  protected readonly adminWorkspaceLoading = signal(false);
  protected readonly adminWorkspaceError = signal<string | null>(null);
  protected readonly loadingAdminCollection = signal<AdminWorkspaceCollection | null>(null);
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
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
  protected readonly adminTaskStatuses = computed(() => {
    const statuses = this.adminDashboard()?.taskStatuses ?? [];
    const largest = Math.max(1, ...statuses.map((status) => status.total));
    return statuses.map((status) => ({
      ...status,
      label:
        status.status === 'Pending'
          ? 'To do'
          : status.status === 'InProgress'
            ? 'In progress'
            : status.status,
      color: `chart-fill-${status.status.toLowerCase()}`,
      percentage: status.total === 0 ? 0 : Math.max(6, (status.total / largest) * 100),
    }));
  });
  protected readonly adminActivityDays = computed(() => {
    const days = this.adminDashboard()?.activityByDay ?? [];
    const peak = Math.max(1, ...days.map((day) => day.total));
    return days.map((day) => ({
      ...day,
      label: new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'short' }).format(
        new Date(day.dateUtc),
      ),
      percentage: day.total === 0 ? 0 : Math.max(8, (day.total / peak) * 100),
    }));
  });
  protected readonly adminVisibleUsers = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return (this.adminDashboard()?.users ?? []).filter(
      (user) =>
        !query ||
        `${user.displayName} ${user.email} ${user.isAdmin ? 'admin' : 'member'} ${user.isActive ? 'active' : 'inactive'}`
          .toLocaleLowerCase()
          .includes(query),
    );
  });
  protected readonly weeklyTaskActivity = computed(() => {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayUtc);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const dateKey = date.toISOString().slice(0, 10);
      return {
        dateKey,
        label: new Intl.DateTimeFormat(undefined, {
          timeZone: 'UTC',
          weekday: 'short',
        }).format(date),
        count: this.tasks().filter((task) => task.createdAtUtc.slice(0, 10) === dateKey).length,
      };
    });
    const peak = Math.max(1, ...days.map((day) => day.count));

    return days.map((day) => ({
      ...day,
      percentage: day.count === 0 ? 0 : Math.max(8, (day.count / peak) * 100),
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
    if (this.currentUser()?.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadForecast();
      this.loadTasks();
      this.loadOverviewExtras();
    }
  }

  protected loadAdminDashboard(): void {
    this.adminDashboardLoading.set(true);
    this.adminDashboardError.set(null);
    this.teamService.getDashboard().subscribe({
      next: (dashboard) => {
        this.adminDashboard.set(dashboard);
        this.adminDashboardLoading.set(false);
      },
      error: (error: unknown) => {
        this.adminDashboardError.set(
          this.getAdminLoadError(error, 'The organization dashboard could not be loaded.'),
        );
        this.adminDashboardLoading.set(false);
      },
    });
  }

  protected viewAdminWorkspace(user: AdminWorkspaceSummary): void {
    this.selectedAdminUser.set(user);
    this.adminWorkspace.set(null);
    this.adminWorkspaceError.set(null);
    this.loadingAdminCollection.set(null);
    this.adminWorkspaceLoading.set(true);
    forkJoin({
      tasks: this.teamService.getUserTasks(user.userId, 0, 25),
      goals: this.teamService.getUserGoals(user.userId, 0, 25),
      notes: this.teamService.getUserNotes(user.userId, 0, 25),
    }).subscribe({
      next: (workspace) => {
        if (this.selectedAdminUser()?.userId === user.userId) {
          this.adminWorkspace.set(workspace);
          this.adminWorkspaceLoading.set(false);
        }
      },
      error: (error: unknown) => {
        if (this.selectedAdminUser()?.userId === user.userId) {
          this.adminWorkspaceError.set(
            this.getAdminLoadError(error, 'This user workspace could not be loaded.'),
          );
          this.adminWorkspaceLoading.set(false);
        }
      },
    });
  }

  protected loadMoreAdminWorkspace(collection: AdminWorkspaceCollection): void {
    const user = this.selectedAdminUser();
    const workspace = this.adminWorkspace();
    const currentPage = workspace?.[collection];
    if (
      !user ||
      !workspace ||
      !currentPage ||
      currentPage.items.length >= currentPage.totalCount ||
      this.loadingAdminCollection()
    ) {
      return;
    }

    this.loadingAdminCollection.set(collection);
    const nextPage = (result: AdminPage<AdminTask | AdminGoal | AdminNote>) => {
      if (this.selectedAdminUser()?.userId === user.userId) {
        this.adminWorkspace.update((current) =>
          current
            ? {
                ...current,
                [collection]: {
                  ...result,
                  items: [...current[collection].items, ...result.items],
                },
              }
            : current,
        );
        this.loadingAdminCollection.set(null);
      }
    };
    const onError = (error: unknown) => {
      if (this.selectedAdminUser()?.userId === user.userId) {
        this.adminWorkspaceError.set(
          this.getAdminLoadError(error, 'More workspace data could not be loaded.'),
        );
        this.loadingAdminCollection.set(null);
      }
    };

    if (collection === 'tasks') {
      this.teamService
        .getUserTasks(user.userId, currentPage.items.length, currentPage.take)
        .subscribe({ next: nextPage, error: onError });
    } else if (collection === 'goals') {
      this.teamService
        .getUserGoals(user.userId, currentPage.items.length, currentPage.take)
        .subscribe({ next: nextPage, error: onError });
    } else {
      this.teamService
        .getUserNotes(user.userId, currentPage.items.length, currentPage.take)
        .subscribe({ next: nextPage, error: onError });
    }
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

  private getAdminLoadError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }
    if (error.status === 0) {
      return 'Cannot reach the API. Make sure the .NET API is running.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Sign in again to continue.';
    }
    if (error.status === 403) {
      return 'Administrator access is required to view organization data.';
    }
    return fallback;
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
    this.themeService.toggleTheme();
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
