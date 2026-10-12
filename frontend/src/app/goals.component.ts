import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AiPlannerComponent } from './ai-planner.component';
import { AuthService } from './auth.service';
import {
  GoalStatus,
  GoalsService,
  LifeGoal,
  SaveGoal,
  SaveGoalMilestone,
} from './goals.service';

type GoalFilter = 'All' | GoalStatus;

@Component({
  selector: 'app-goals',
  imports: [AiPlannerComponent, DatePipe, FormsModule, RouterLink],
  templateUrl: './goals.component.html',
})
export class GoalsComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly goals = signal<LifeGoal[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly logoutError = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<GoalFilter>('All');
  protected readonly isDarkTheme = signal(true);
  protected readonly notificationsOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly updatingGoalId = signal<string | null>(null);
  protected readonly today = new Date();
  protected readonly filters: GoalFilter[] = ['All', 'Active', 'Paused', 'Completed'];
  protected editingGoal: LifeGoal | null = null;
  protected goalForm = this.emptyForm();

  protected readonly displayName = computed(
    () => this.currentUser()?.displayName.trim().split(/\s+/)[0] || 'there',
  );
  protected readonly visibleGoals = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return this.goals()
      .filter((goal) => {
        const matchesSearch =
          !query ||
          `${goal.title} ${goal.description ?? ''} ${goal.milestones.map((item) => item.title).join(' ')}`
            .toLocaleLowerCase()
            .includes(query);
        return matchesSearch && (this.statusFilter() === 'All' || goal.status === this.statusFilter());
      })
      .sort((left, right) => {
        if (left.status === 'Completed' && right.status !== 'Completed') {
          return 1;
        }
        if (right.status === 'Completed' && left.status !== 'Completed') {
          return -1;
        }
        if (!left.targetDate) {
          return right.targetDate ? 1 : left.title.localeCompare(right.title);
        }
        if (!right.targetDate) {
          return -1;
        }
        return left.targetDate.localeCompare(right.targetDate);
      });
  });
  protected readonly activeCount = computed(
    () => this.goals().filter((goal) => goal.status === 'Active').length,
  );
  protected readonly pausedCount = computed(
    () => this.goals().filter((goal) => goal.status === 'Paused').length,
  );
  protected readonly completedCount = computed(
    () => this.goals().filter((goal) => goal.status === 'Completed').length,
  );
  protected readonly milestoneCount = computed(() =>
    this.goals().reduce((count, goal) => count + goal.milestones.length, 0),
  );
  protected readonly completedMilestoneCount = computed(() =>
    this.goals().reduce(
      (count, goal) => count + goal.milestones.filter((milestone) => milestone.isCompleted).length,
      0,
    ),
  );
  protected readonly overallProgress = computed(() => {
    const activeGoals = this.goals().filter((goal) => goal.status !== 'Completed');
    if (activeGoals.length === 0) {
      return 0;
    }
    return Math.round(
      activeGoals.reduce((total, goal) => total + goal.progress, 0) / activeGoals.length,
    );
  });
  protected readonly dueThisMonthCount = computed(() => {
    const year = this.today.getFullYear();
    const month = this.today.getMonth();
    return this.goals().filter((goal) => {
      if (!goal.targetDate || goal.status === 'Completed') {
        return false;
      }
      const target = new Date(`${goal.targetDate}T00:00:00`);
      return target.getFullYear() === year && target.getMonth() === month;
    }).length;
  });
  protected readonly milestoneRate = computed(() =>
    this.milestoneCount() === 0
      ? 0
      : Math.round((this.completedMilestoneCount() / this.milestoneCount()) * 100),
  );

  constructor() {
    this.isDarkTheme.set(localStorage.getItem('ai-lifeos-theme') !== 'light');
    this.loadGoals();
  }

  protected loadGoals(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.goalsService.getGoals().subscribe({
      next: (goals) => this.goals.set(goals),
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error, 'load'));
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  protected setSearchTerm(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected setStatusFilter(filter: GoalFilter): void {
    this.statusFilter.set(filter);
  }

  protected setGoalStatusFromEvent(goal: LifeGoal, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as GoalStatus;
    this.setGoalStatus(goal, status);
  }

  protected openCreateDialog(): void {
    this.editingGoal = null;
    this.goalForm = this.emptyForm();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.dialogOpen.set(true);
  }

  protected openEditDialog(goal: LifeGoal): void {
    this.editingGoal = goal;
    this.goalForm = {
      title: goal.title,
      description: goal.description ?? '',
      targetDate: goal.targetDate ?? '',
      progress: goal.progress,
      status: goal.status,
      milestones: goal.milestones.map((milestone) => ({
        title: milestone.title,
        isCompleted: milestone.isCompleted,
      })),
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

  protected addMilestone(): void {
    if (this.goalForm.milestones.length < 30) {
      this.goalForm.milestones.push({ title: '', isCompleted: false });
    }
  }

  protected removeMilestone(index: number): void {
    this.goalForm.milestones.splice(index, 1);
  }

  protected saveGoal(): void {
    if (this.saving()) {
      return;
    }

    const goal: SaveGoal = {
      title: this.goalForm.title.trim(),
      description: this.goalForm.description.trim() || null,
      status: this.goalForm.status,
      progress: Number(this.goalForm.progress),
      targetDate: this.goalForm.targetDate || null,
      milestones: this.goalForm.milestones
        .filter((milestone) => milestone.title.trim())
        .map((milestone) => ({
          title: milestone.title.trim(),
          isCompleted: milestone.isCompleted,
        })),
    };
    if (!goal.title) {
      this.errorMessage.set('Enter a goal title before saving.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const request = this.editingGoal
      ? this.goalsService.updateGoal(this.editingGoal.goalId, goal)
      : this.goalsService.createGoal(goal);

    request.subscribe({
      next: (savedGoal) => {
        this.goals.update((goals) =>
          this.editingGoal
            ? goals.map((item) => (item.goalId === savedGoal.goalId ? savedGoal : item))
            : [savedGoal, ...goals],
        );
        this.successMessage.set(this.editingGoal ? 'Goal updated.' : 'Goal created.');
        this.dialogOpen.set(false);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.saving.set(false);
      },
    });
  }

  protected toggleMilestone(goal: LifeGoal, milestoneIndex: number): void {
    if (this.updatingGoalId()) {
      return;
    }

    const milestones: SaveGoalMilestone[] = goal.milestones.map((milestone, index) => ({
      title: milestone.title,
      isCompleted:
        index === milestoneIndex ? !milestone.isCompleted : milestone.isCompleted,
    }));
    this.saveInlineUpdate(goal, {
      title: goal.title,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      targetDate: goal.targetDate,
      milestones,
    });
  }

  protected setGoalStatus(goal: LifeGoal, status: GoalStatus): void {
    this.saveInlineUpdate(goal, {
      title: goal.title,
      description: goal.description,
      status,
      progress: goal.progress,
      targetDate: goal.targetDate,
      milestones: goal.milestones.map(({ title, isCompleted }) => ({ title, isCompleted })),
    });
  }

  protected deleteGoal(goal: LifeGoal): void {
    if (
      this.updatingGoalId() ||
      !window.confirm(`Delete “${goal.title}” and its milestones? This cannot be undone.`)
    ) {
      return;
    }

    this.updatingGoalId.set(goal.goalId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.goalsService.deleteGoal(goal.goalId).subscribe({
      next: () => {
        this.goals.update((goals) => goals.filter((item) => item.goalId !== goal.goalId));
        this.successMessage.set('Goal deleted.');
        this.updatingGoalId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.updatingGoalId.set(null);
      },
    });
  }

  protected toggleTheme(): void {
    const nextTheme = !this.isDarkTheme();
    this.isDarkTheme.set(nextTheme);
    localStorage.setItem('ai-lifeos-theme', nextTheme ? 'dark' : 'light');
  }

  protected logout(): void {
    this.logoutError.set(null);
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.logoutError.set('Could not sign out. Please try again.'),
    });
  }

  protected isPastTarget(goal: LifeGoal): boolean {
    return Boolean(
      goal.targetDate &&
        goal.status !== 'Completed' &&
        goal.targetDate < new Date().toISOString().slice(0, 10),
    );
  }

  protected completedMilestones(goal: LifeGoal): number {
    return goal.milestones.filter((milestone) => milestone.isCompleted).length;
  }

  private saveInlineUpdate(goal: LifeGoal, update: SaveGoal): void {
    this.updatingGoalId.set(goal.goalId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.goalsService.updateGoal(goal.goalId, update).subscribe({
      next: (savedGoal) => {
        this.goals.update((goals) =>
          goals.map((item) => (item.goalId === savedGoal.goalId ? savedGoal : item)),
        );
        this.successMessage.set('Goal progress updated.');
        this.updatingGoalId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getRequestError(error));
        this.updatingGoalId.set(null);
      },
    });
  }

  private emptyForm(): {
    title: string;
    description: string;
    targetDate: string;
    progress: number;
    status: GoalStatus;
    milestones: SaveGoalMilestone[];
  } {
    return {
      title: '',
      description: '',
      targetDate: '',
      progress: 0,
      status: 'Active',
      milestones: [],
    };
  }

  private getRequestError(error: unknown, operation: 'load' | 'save' = 'save'): string {
    if (!(error instanceof HttpErrorResponse)) {
      return operation === 'load'
        ? 'Could not load your goals. Please try again.'
        : 'The goal could not be saved. Please try again.';
    }
    if (error.status === 0) {
      return 'Cannot reach the API. Check that the .NET API and LocalDB are running.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string' &&
      error.error.message.trim()
    ) {
      return error.error.message.trim();
    }
    if (operation === 'save' && error.status === 400) {
      return 'The API rejected the goal details. Check the title, status, and milestones.';
    }
    if (error.status >= 500) {
      return operation === 'load'
        ? `The API could not load your goals (HTTP ${error.status}). Please try again later.`
        : `The API could not save the goal (HTTP ${error.status}). Please try again later.`;
    }
    return operation === 'load'
      ? `Could not load your goals (HTTP ${error.status}). Please try again.`
      : 'The goal could not be saved. Please try again.';
  }
}
