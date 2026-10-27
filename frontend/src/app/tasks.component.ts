import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AiPlannerComponent } from './ai-planner.component';
import { AuthService } from './auth.service';
import { ConfirmationService } from './confirmation.service';
import { LifeTask, SaveTask, TaskStatus, TasksService } from './tasks.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { StyleCreatorService } from './style-creator.service';
type TaskFilter = 'All' | TaskStatus;
type PriorityFilter = 'All' | number;
import { StyleStudioComponent } from './style-studio.component';
@Component({
  selector: 'app-tasks',
  imports: [AiPlannerComponent, DatePipe, FormsModule, RouterLink, ThemePickerComponent,StyleStudioComponent],
  templateUrl: './tasks.component.html',
})
export class TasksComponent {
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly tasks = signal<LifeTask[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly logoutError = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<TaskFilter>('All');
  protected readonly priorityFilter = signal<PriorityFilter>('All');
  protected readonly sortOrder = signal<'due' | 'priority' | 'newest'>('due');
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly notificationsOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly busyTaskId = signal<string | null>(null);
  protected readonly today = new Date();
  protected editingTask: LifeTask | null = null;
  protected taskForm = this.emptyForm();

protected readonly styleCreator = inject(StyleCreatorService);

  protected readonly statusFilters: TaskFilter[] = [
    'All',
    'Pending',
    'InProgress',
    'Completed',
    'Cancelled',
  ];
  protected readonly editableStatuses: TaskStatus[] = [
    'Pending',
    'InProgress',
    'Completed',
    'Cancelled',
  ];
  protected readonly priorityOptions = [
    { value: 1, label: 'High' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Low' },
    { value: 4, label: 'Lowest' },
  ];
  protected readonly displayName = computed(
    () => this.currentUser()?.displayName.trim().split(/\s+/)[0] || 'there',
  );
  protected readonly visibleTasks = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const filtered = this.tasks().filter((task) => {
      const matchesQuery =
        !query ||
        `${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(query);
      const matchesStatus =
        this.statusFilter() === 'All' || task.status === this.statusFilter();
      const matchesPriority =
        this.priorityFilter() === 'All' || task.priority === this.priorityFilter();
      return matchesQuery && matchesStatus && matchesPriority;
    });

    return filtered.sort((left, right) => {
      if (this.sortOrder() === 'newest') {
        return right.createdAtUtc.localeCompare(left.createdAtUtc);
      }
      if (this.sortOrder() === 'priority') {
        return left.priority - right.priority;
      }
      if (!left.dueAtUtc) {
        return right.dueAtUtc ? 1 : 0;
      }
      if (!right.dueAtUtc) {
        return -1;
      }
      return left.dueAtUtc.localeCompare(right.dueAtUtc);
    });
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const status = this.statusFilters.find((filter) => filter === params.get('status'));
      if (status) {
        this.statusFilter.set(status);
      }
    });
    this.loadTasks();
  }

  protected loadTasks(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.tasksService.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  protected setSearchTerm(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected setStatusFilter(filter: TaskFilter): void {
    this.statusFilter.set(filter);
  }

  protected setPriorityFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.priorityFilter.set(value === 'All' ? 'All' : Number(value));
  }

  protected setSortOrder(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as 'due' | 'priority' | 'newest');
  }

  protected openCreateDialog(): void {
    this.editingTask = null;
    this.taskForm = this.emptyForm();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.dialogOpen.set(true);
  }

  protected openEditDialog(task: LifeTask): void {
    this.editingTask = task;
    this.taskForm = {
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueAtUtc ? task.dueAtUtc.slice(0, 10) : '',
      priority: task.priority,
      status: task.status,
    };
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.dialogOpen.set(false);
    }
  }

  protected saveTask(): void {
    if (this.saving()) {
      return;
    }

    const task: SaveTask = {
      title: this.taskForm.title.trim(),
      description: this.taskForm.description.trim() || null,
      dueAtUtc: this.taskForm.dueDate
        ? `${this.taskForm.dueDate}T00:00:00.000Z`
        : null,
      priority: Number(this.taskForm.priority),
      status: this.taskForm.status,
    };
    if (!task.title) {
      this.errorMessage.set('Enter a task title before saving.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = this.editingTask
      ? this.tasksService.updateTask(this.editingTask.taskId, task)
      : this.tasksService.createTask(task);

    request.subscribe({
      next: (savedTask) => {
        this.tasks.update((tasks) =>
          this.editingTask
            ? tasks.map((item) => (item.taskId === savedTask.taskId ? savedTask : item))
            : [savedTask, ...tasks],
        );
        this.successMessage.set(this.editingTask ? 'Task updated.' : 'Task created.');
        this.dialogOpen.set(false);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.saving.set(false);
      },
    });
  }

  protected toggleComplete(task: LifeTask): void {
    if (this.busyTaskId()) {
      return;
    }

    const updatedTask: SaveTask = {
      title: task.title,
      description: task.description,
      dueAtUtc: task.dueAtUtc,
      priority: task.priority,
      status: task.status === 'Completed' ? 'Pending' : 'Completed',
    };
    this.busyTaskId.set(task.taskId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.tasksService.updateTask(task.taskId, updatedTask).subscribe({
      next: (savedTask) => {
        this.tasks.update((tasks) =>
          tasks.map((item) => (item.taskId === savedTask.taskId ? savedTask : item)),
        );
        this.successMessage.set(
          savedTask.status === 'Completed' ? 'Task completed.' : 'Task reopened.',
        );
        this.busyTaskId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.busyTaskId.set(null);
      },
    });
  }

  protected async deleteTask(task: LifeTask): Promise<void> {
    if (this.busyTaskId()) {
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this task?',
      message: `“${task.title}” will be moved to Trash. You can restore it later.`,
      confirmLabel: 'Move to Trash',
    });
    if (!confirmed || this.busyTaskId()) {
      return;
    }

    this.busyTaskId.set(task.taskId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.tasksService.deleteTask(task.taskId).subscribe({
      next: () => {
        this.tasks.update((tasks) => tasks.filter((item) => item.taskId !== task.taskId));
        this.successMessage.set('Task deleted.');
        this.busyTaskId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.busyTaskId.set(null);
      },
    });
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected logout(): void {
    this.logoutError.set(null);
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.logoutError.set('Could not sign out. Please try again.'),
    });
  }

  protected statusLabel(status: TaskStatus): string {
    return status === 'InProgress' ? 'In progress' : status;
  }

  protected priorityLabel(priority: number): string {
    return this.priorityOptions.find((option) => option.value === priority)?.label ?? 'Medium';
  }

  protected isOverdue(task: LifeTask): boolean {
    return Boolean(
      task.dueAtUtc &&
        task.status !== 'Completed' &&
        task.dueAtUtc.slice(0, 10) < new Date().toISOString().slice(0, 10),
    );
  }

  private emptyForm(): {
    title: string;
    description: string;
    dueDate: string;
    priority: number;
    status: TaskStatus;
  } {
    return { title: '', description: '', dueDate: '', priority: 2, status: 'Pending' };
  }

  private getRequestError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Cannot reach the API. Check that the .NET API and LocalDB are running.';
    }
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    return 'The task could not be saved. Please try again.';
  }
}
