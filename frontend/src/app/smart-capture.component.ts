import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CaptureDraft, CaptureService, CaptureType } from './capture.service';
import { GoalsService, SaveGoal } from './goals.service';
import { NotesService, SaveNote } from './notes.service';
import { SaveTask, TasksService } from './tasks.service';

const LABELS: Record<CaptureType, string> = { task: 'Task', goal: 'Goal', note: 'Note' };

@Component({
  selector: 'app-smart-capture',
  template: `
    <article class="overview-panel capture-panel">
      <header class="overview-panel-heading">
        <div><h2>Smart capture</h2><p>Type it the way you'd say it</p></div>
      </header>

      <div class="capture-row">
        <input type="text" maxlength="300" aria-label="Describe a task, goal, or note"
               placeholder="Call the dentist next Friday at 3pm, high priority"
               [value]="text()" (input)="onText($event)" (keydown.enter)="run()" />
        <button class="capture-go" type="button" [disabled]="busy()" (click)="run()">
          {{ busy() ? 'Thinking…' : 'Capture' }}
        </button>
      </div>

      @if (error()) { <p class="overview-extra-error" role="alert">{{ error() }}</p> }
      @if (message()) { <p class="overview-restore-message" role="status">{{ message() }}</p> }

      @if (draft(); as d) {
        <div class="capture-draft">
          <div class="capture-draft-head">
            <span class="capture-badge">{{ label(d.type) }} draft</span>
            <small>AI-generated. Check before saving.</small>
          </div>

          <label>Title
            <input type="text" maxlength="200" [value]="d.title" (input)="patchText('title', $event)" />
          </label>

          @if (d.type === 'task') {
            <div class="capture-two">
              <label>Due date
                <input type="date" [value]="d.dueDate ?? ''" (input)="patchDate('dueDate', $event)" />
              </label>
              <label>Priority
                <select (change)="patchPriority($event)">
                  @for (p of priorities; track p.value) {
                    <option [value]="p.value" [selected]="p.value === d.priority">{{ p.label }}</option>
                  }
                </select>
              </label>
            </div>
            <label>Details
              <input type="text" maxlength="2000" [value]="d.description ?? ''" (input)="patchText('description', $event)" />
            </label>
          } @else if (d.type === 'goal') {
            <label>Description
              <input type="text" maxlength="2000" [value]="d.description ?? ''" (input)="patchText('description', $event)" />
            </label>
            <label>Target date
              <input type="date" [value]="d.targetDate ?? ''" (input)="patchDate('targetDate', $event)" />
            </label>
            <label>Milestones <small>One per line</small>
              <textarea rows="4" [value]="milestonesText()" (input)="onMilestones($event)"></textarea>
            </label>
          } @else {
            <label>Content
              <textarea rows="5" maxlength="5000" [value]="d.content ?? ''" (input)="patchText('content', $event)"></textarea>
            </label>
          }

          <div class="capture-actions">
            <button type="button" (click)="discard()">Discard</button>
            <button class="capture-go" type="button" [disabled]="saving() || !d.title.trim()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save ' + label(d.type).toLowerCase() }}
            </button>
          </div>
        </div>
      }
    </article>
  `,
})
export class SmartCaptureComponent {
  private readonly captureApi = inject(CaptureService);
  private readonly tasksApi = inject(TasksService);
  private readonly goalsApi = inject(GoalsService);
  private readonly notesApi = inject(NotesService);

  readonly saved = output<void>();

  protected readonly text = signal('');
  protected readonly draft = signal<CaptureDraft | null>(null);
  protected readonly milestonesText = signal('');
  protected readonly busy = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  protected readonly priorities = [
    { value: 1, label: 'High' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Low' },
    { value: 4, label: 'Lowest' },
  ];

  protected label(type: CaptureType): string {
    return LABELS[type];
  }

  protected onText(e: Event): void {
    this.text.set((e.target as HTMLInputElement).value);
    this.error.set(null);
  }

  protected onMilestones(e: Event): void {
    this.milestonesText.set((e.target as HTMLTextAreaElement).value);
  }

  protected run(): void {
    if (this.busy()) return;
    const text = this.text().trim();
    if (!text) {
      this.error.set('Describe something to capture first.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    this.captureApi.capture(text, new Date().toLocaleDateString('en-CA')).subscribe({
      next: (d) => {
        this.draft.set(d);
        this.milestonesText.set(d.milestones.join('\n'));
        this.busy.set(false);
      },
      error: (e: unknown) => { this.error.set(this.describe(e)); this.busy.set(false); },
    });
  }

  protected patchText(field: 'title' | 'description' | 'content', e: Event): void {
    const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.draft.update((d) =>
      d ? { ...d, [field]: field === 'title' ? value : value || null } : d,
    );
  }

  protected patchDate(field: 'dueDate' | 'targetDate', e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.draft.update((d) => (d ? { ...d, [field]: value || null } : d));
  }

  protected patchPriority(e: Event): void {
    const value = Number((e.target as HTMLSelectElement).value);
    this.draft.update((d) => (d ? { ...d, priority: value } : d));
  }

  protected discard(): void {
    this.draft.set(null);
  }

  protected save(): void {
    const d = this.draft();
    if (!d || this.saving()) return;
    const title = d.title.trim();
    if (!title) return;

    let request: Observable<unknown>;
    if (d.type === 'task') {
      const task: SaveTask = {
        title,
        description: d.description?.trim() || null,
        dueAtUtc: d.dueDate ? `${d.dueDate}T00:00:00.000Z` : null,
        priority: d.priority ?? 2,
        status: 'Pending',
      };
      request = this.tasksApi.createTask(task);
    } else if (d.type === 'goal') {
      const goal: SaveGoal = {
        title,
        description: d.description?.trim() || null,
        status: 'Active',
        progress: 0,
        targetDate: d.targetDate,
        milestones: this.milestonesText()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 20)
          .map((line) => ({ title: line.slice(0, 200), isCompleted: false })),
      };
      request = this.goalsApi.createGoal(goal);
    } else {
      const content = d.content?.trim();
      if (!content) {
        this.error.set('Add some content to the note first.');
        return;
      }
      const note: SaveNote = { title, content, isPinned: false, color: '#F3F4F6' };
      request = this.notesApi.createNote(note);
    }

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => {
        this.message.set(`${this.label(d.type)} saved.`);
        this.saving.set(false);
        this.draft.set(null);
        this.text.set('');
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set(`The ${d.type} could not be saved. Please try again.`);
      },
    });
  }

  private describe(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'Cannot reach the API.';
      if (e.status === 401) return 'Your session has expired. Please sign in again.';
      const detail = (e.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return 'The draft could not be created. Please try again.';
  }
}