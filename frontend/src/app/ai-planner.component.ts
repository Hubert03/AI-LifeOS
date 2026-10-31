import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, input,output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AiPlan, AiPlanningService } from './ai-planning.service';
import { GoalsService, SaveGoal } from './goals.service';
import { NotesService, SaveNote } from './notes.service';
import { SaveTask, TasksService } from './tasks.service';
import { UiPreferencesService } from './ui-preferences.service';


type PlannerContext = 'overview' | 'tasks' | 'goals' | 'notes';

@Component({
  selector: 'app-ai-planner',
  imports: [DatePipe, FormsModule],
  templateUrl: './ai-planner.component.html',
  styleUrl: './ai-planner.component.css',
})
export class AiPlannerComponent {
  readonly context = input<PlannerContext>('overview');
  private readonly aiService = inject(AiPlanningService);
  private readonly goalsService = inject(GoalsService);
  private readonly notesService = inject(NotesService);
  private readonly tasksService = inject(TasksService);
  protected readonly uiPreferences = inject(UiPreferencesService);

  protected readonly open = signal(false);
  protected readonly prompt = signal('');
  protected readonly plan = signal<AiPlan | null>(null);
  protected readonly submittedPrompt = signal('');
  protected readonly draftTarget = signal<PlannerContext | null>(null);
  protected readonly selectedTasks = signal<number[]>([]);
  protected readonly includeGoal = signal(true);
  protected readonly includeNote = signal(true);
  protected readonly generating = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  
  readonly tasksSaved = output<void>();
  readonly goalsSaved = output<void>();
  readonly notesSaved  = output<void>();

  protected toggle(): void {
    this.open.update((value) => !value);
    this.error.set(null);
  }

  protected setPrompt(event: Event): void {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  protected generatePlan(): void {
    const prompt = this.prompt().trim();
    if (!prompt || this.generating()) {
      return;
    }

    this.generating.set(true);
    this.error.set(null);
    this.message.set(null);
    this.plan.set(null);
    this.submittedPrompt.set(prompt);
    this.draftTarget.set(null);
    const target = this.context();
    this.aiService.createPlan(prompt, target).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.draftTarget.set(target);
        this.selectedTasks.set(
          target === 'tasks' || target === 'overview'
            ? plan.tasks.map((_, index) => index)
            : [],
        );
        this.includeGoal.set(
          (target === 'goals' || target === 'overview') && plan.goal !== null,
        );
        this.includeNote.set(target === 'notes' && plan.note !== null);
      },
      error: (error: unknown) => {
        this.error.set(this.getErrorMessage(error, 'Could not create a plan. Please try again.'));
        this.generating.set(false);
      },
      complete: () => this.generating.set(false),
    });
  }

  protected setTaskSelected(index: number, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.selectedTasks.update((indices) =>
      selected ? [...indices, index] : indices.filter((item) => item !== index),
    );
  }

  protected setIncludeGoal(event: Event): void {
    this.includeGoal.set((event.target as HTMLInputElement).checked);
  }

  protected async savePlan(): Promise<void> {
    const plan = this.plan();
    if (!plan || this.saving()) {
      return;
    }
    const target = this.draftTarget();
    if (!target) {
      this.error.set('Create a new draft before saving.');
      return;
    }
    const shouldSaveNote = target === 'notes' && this.includeNote() && plan.note !== null;
    const shouldSaveGoal =
      (target === 'goals' || target === 'overview') && this.includeGoal() && plan.goal !== null;
    const taskIndexes =
      target === 'tasks' || target === 'overview' ? this.selectedTasks() : [];
    if (!shouldSaveNote && !shouldSaveGoal && taskIndexes.length === 0) {
      this.error.set(`Select at least one ${target === 'notes' ? 'note' : target === 'goals' ? 'goal' : 'task'} to add.`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    let savedNote = false;
    let savedTasks = 0;
    let savedGoal = false;
    try {
      if (shouldSaveNote && plan.note) {
        const note: SaveNote = {
          title: plan.note.title,
          content: plan.note.content,
          isPinned: true,
          color: '#C8B8F1',
        };
        await firstValueFrom(this.notesService.createNote(note));
        savedNote = true;
      }

      if (shouldSaveGoal && plan.goal) {
        const goal: SaveGoal = {
          ...plan.goal,
          status: 'Active',
          progress: 0,
          milestones: plan.goal.milestones.map((milestone) => ({
            title: milestone.title,
            isCompleted: false,
          })),
        };
        await firstValueFrom(this.goalsService.createGoal(goal));
        savedGoal = true;
      }

      for (const index of taskIndexes) {
        const proposed = plan.tasks[index];
        if (!proposed) {
          continue;
        }
        const task: SaveTask = {
          title: proposed.title,
          description: proposed.description || null,
          status: 'Pending',
          priority: Math.min(4, Math.max(1, proposed.priority)),
          dueAtUtc: proposed.dueAtUtc,
        };
        await firstValueFrom(this.tasksService.createTask(task));
        savedTasks += 1;
      }

      const savedParts = [
        ...(savedNote ? ['note'] : []),
        ...(savedGoal ? ['goal'] : []),
        ...(savedTasks ? [`${savedTasks} task${savedTasks === 1 ? '' : 's'}`] : []),
      ];
      this.message.set(`Added ${savedParts.join(' and ')} to ${savedParts.length === 1 ? this.getDestinationLabel(target) : 'your workspace'}.`);
      this.plan.set(null);
      this.prompt.set('');
    } catch (error: unknown) {
      const partial = [
        ...(savedNote ? ['the note'] : []),
        ...(savedGoal ? ['the goal'] : []),
        ...(savedTasks ? [`${savedTasks} task${savedTasks === 1 ? '' : 's'}`] : []),
      ];
      const savedMessage = partial.length ? ` Saved ${partial.join(' and ')}; ` : ' ';
      this.error.set(
        `${savedMessage}${this.getErrorMessage(error, 'Some plan items could not be saved.')}`,
      );
    } finally {
      if (savedTasks > 0) {
        this.tasksSaved.emit();
      }
      if(savedGoal) {
        this.goalsSaved.emit();
      }
      if(savedNote) {
        this.notesSaved.emit();
      }
      this.saving.set(false);
    }
  }

  protected setIncludeNote(event: Event): void {
    this.includeNote.set((event.target as HTMLInputElement).checked);
  }

  protected get contextTitle(): string {
    return this.activeContext === 'notes'
      ? 'Create a note with AI'
      : this.activeContext === 'goals'
        ? 'Create a goal plan with AI'
        : this.activeContext === 'tasks'
          ? 'Create a task plan with AI'
          : 'Plan with AI';
  }

  protected get promptLabel(): string {
    return this.activeContext === 'notes'
      ? 'What would you like to capture in a note?'
      : this.activeContext === 'goals'
        ? 'What goal would you like to work toward?'
        : this.activeContext === 'tasks'
          ? 'What tasks do you need help planning?'
          : 'What would you like to accomplish?';
  }

  protected get saveButtonLabel(): string {
    return this.activeContext === 'notes'
      ? 'Add note to Notes'
      : this.activeContext === 'goals'
        ? 'Add goal to Goals'
        : this.activeContext === 'tasks'
          ? 'Add tasks to Tasks'
          : 'Add selected items';
  }

  protected get activeContext(): PlannerContext {
    return this.draftTarget() ?? this.context();
  }

  protected getDestinationLabel(target: PlannerContext): string {
    return target === 'notes' ? 'Notes' : target === 'goals' ? 'Goals' : 'Tasks';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (error.status === 0) {
      return 'Cannot reach the API. Check that the .NET API is running.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 503) {
      return 'AI planning is not configured yet. Configure the provider in Settings and try again.';
    }
    if (error.status === 429) {
      return 'The AI provider is busy. Wait a moment and try again.';
    }
    const responseMessage = this.getResponseMessage(error.error);
    if (responseMessage) {
      return responseMessage;
    }
    if (error.status >= 500) {
      return `The API could not complete the request (HTTP ${error.status}). Please try again later.`;
    }
    return fallback;
  }

  private getResponseMessage(response: unknown): string | null {
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      typeof response.message === 'string' &&
      response.message.trim()
    ) {
      return response.message.trim();
    }
    return null;
  }
}
