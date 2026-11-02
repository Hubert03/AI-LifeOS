import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfirmationService } from './confirmation.service';
import {
  SaveTeamGoal,
  SaveTeamNote,
  SaveTeamTask,
  TeamGoalStatus,
  TeamTaskStatus,
  TeamWorkspace,
  TeamWorkspaceGoal,
  TeamWorkspaceNote,
  TeamWorkspaceService,
  TeamWorkspaceTask,
} from './team-workspace.service';

type WorkspaceTab = 'tasks' | 'goals' | 'notes';

@Component({
  selector: 'app-team-workspace',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './team-workspace.component.html',
  styleUrl: './team-workspace.component.css',
})
export class TeamWorkspaceComponent {
  private readonly workspaceService = inject(TeamWorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly workspace = signal<TeamWorkspace | null>(null);
  protected readonly tasks = signal<TeamWorkspaceTask[]>([]);
  protected readonly goals = signal<TeamWorkspaceGoal[]>([]);
  protected readonly notes = signal<TeamWorkspaceNote[]>([]);
  protected readonly activeTab = signal<WorkspaceTab>('tasks');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly taskDialogOpen = signal(false);
  protected readonly goalDialogOpen = signal(false);
  protected readonly noteDialogOpen = signal(false);
  protected readonly taskStatuses: TeamTaskStatus[] = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
  protected readonly goalStatuses: TeamGoalStatus[] = ['Active', 'Paused', 'Completed'];
  protected editingTaskId: string | null = null;
  protected editingGoalId: string | null = null;
  protected editingNoteId: string | null = null;
  protected taskForm = this.newTask();
  protected goalForm = this.newGoal();
  protected noteForm = this.newNote();
  protected milestoneText = '';

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      workspace: this.workspaceService.getWorkspace(),
      tasks: this.workspaceService.getTasks(),
      goals: this.workspaceService.getGoals(),
      notes: this.workspaceService.getNotes(),
    }).subscribe({
      next: (result) => {
        this.workspace.set(result.workspace);
        this.tasks.set(result.tasks);
        this.goals.set(result.goals);
        this.notes.set(result.notes);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected canEdit(createdByUserId: string): boolean {
    const workspace = this.workspace();
    return !!workspace &&
      (workspace.canManageAll || workspace.currentUserId === createdByUserId);
  }

  protected openNewTask(): void {
    this.editingTaskId = null;
    this.taskForm = this.newTask();
    this.taskDialogOpen.set(true);
  }

  protected editTask(task: TeamWorkspaceTask): void {
    this.editingTaskId = task.taskId;
    this.taskForm = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAtUtc: task.dueAtUtc?.slice(0, 10) ?? null,
      assignedToUserId: task.assignedToUserId,
    };
    this.taskDialogOpen.set(true);
  }

  protected saveTask(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const request = {
      ...this.taskForm,
      title: this.taskForm.title.trim(),
      dueAtUtc: this.toUtcDate(this.taskForm.dueAtUtc),
    };
    const operation = this.editingTaskId
      ? this.workspaceService.updateTask(this.editingTaskId, request)
      : this.workspaceService.createTask(request);
    operation.subscribe({
      next: () => {
        this.taskDialogOpen.set(false);
        this.successMessage.set('Team task saved.');
        this.saving.set(false);
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected async deleteTask(task: TeamWorkspaceTask): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this team task?',
      message: `"${task.title}" will be removed from the shared team workspace.`,
      confirmLabel: 'Delete task',
    });
    if (!confirmed || this.saving()) return;
    this.saving.set(true);
    this.workspaceService.deleteTask(task.taskId).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Team task removed from the shared workspace.');
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected openNewGoal(): void {
    this.editingGoalId = null;
    this.goalForm = this.newGoal();
    this.milestoneText = '';
    this.goalDialogOpen.set(true);
  }

  protected editGoal(goal: TeamWorkspaceGoal): void {
    this.editingGoalId = goal.goalId;
    this.goalForm = {
      title: goal.title,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      targetDate: goal.targetDate,
      milestones: goal.milestones,
    };
    this.milestoneText = goal.milestones.map((milestone) => milestone.title).join('\n');
    this.goalDialogOpen.set(true);
  }

  protected saveGoal(): void {
    if (this.saving()) return;
    const existingGoal = this.goals().find((goal) => goal.goalId === this.editingGoalId);
    const previousMilestones = existingGoal?.milestones ?? [];
    const milestones = this.milestoneText
      .split(/\r?\n/)
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title, index) => ({
        title,
        isCompleted: previousMilestones[index]?.title === title
          ? previousMilestones[index].isCompleted
          : false,
      }));
    this.saving.set(true);
    this.errorMessage.set(null);
    const request: SaveTeamGoal = {
      ...this.goalForm,
      title: this.goalForm.title.trim(),
      milestones,
    };
    const operation = this.editingGoalId
      ? this.workspaceService.updateGoal(this.editingGoalId, request)
      : this.workspaceService.createGoal(request);
    operation.subscribe({
      next: () => {
        this.goalDialogOpen.set(false);
        this.successMessage.set('Team goal saved.');
        this.saving.set(false);
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected async deleteGoal(goal: TeamWorkspaceGoal): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this team goal?',
      message: `"${goal.title}" will be removed from the shared team workspace.`,
      confirmLabel: 'Delete goal',
    });
    if (!confirmed || this.saving()) return;
    this.saving.set(true);
    this.workspaceService.deleteGoal(goal.goalId).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Team goal removed from the shared workspace.');
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected openNewNote(): void {
    this.editingNoteId = null;
    this.noteForm = this.newNote();
    this.noteDialogOpen.set(true);
  }

  protected editNote(note: TeamWorkspaceNote): void {
    this.editingNoteId = note.noteId;
    this.noteForm = { title: note.title, content: note.content, color: note.color };
    this.noteDialogOpen.set(true);
  }

  protected saveNote(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const request: SaveTeamNote = {
      ...this.noteForm,
      title: this.noteForm.title.trim(),
      color: this.noteForm.color.toUpperCase(),
    };
    const operation = this.editingNoteId
      ? this.workspaceService.updateNote(this.editingNoteId, request)
      : this.workspaceService.createNote(request);
    operation.subscribe({
      next: () => {
        this.noteDialogOpen.set(false);
        this.successMessage.set('Team note saved.');
        this.saving.set(false);
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected async deleteNote(note: TeamWorkspaceNote): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this team note?',
      message: `"${note.title}" will be removed from the shared team workspace.`,
      confirmLabel: 'Delete note',
    });
    if (!confirmed || this.saving()) return;
    this.saving.set(true);
    this.workspaceService.deleteNote(note.noteId).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Team note removed from the shared workspace.');
        this.load();
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  protected closeDialogs(): void {
    this.taskDialogOpen.set(false);
    this.goalDialogOpen.set(false);
    this.noteDialogOpen.set(false);
    this.errorMessage.set(null);
  }

  private newTask(): SaveTeamTask {
    return {
      title: '',
      description: null,
      status: 'Pending',
      priority: 2,
      dueAtUtc: null,
      assignedToUserId: this.workspace()?.currentUserId ?? null,
    };
  }

  private newGoal(): SaveTeamGoal {
    return {
      title: '',
      description: null,
      status: 'Active',
      progress: 0,
      targetDate: null,
      milestones: [],
    };
  }

  private newNote(): SaveTeamNote {
    return { title: '', content: '', color: '#f3f4f6' };
  }

  private toUtcDate(value: string | null): string | null {
    return value ? `${value}T00:00:00.000Z` : null;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return this.auth.getErrorMessage(error);
  }
}
