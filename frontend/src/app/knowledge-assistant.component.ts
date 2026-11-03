import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import {
  KnowledgeAnswer,
  KnowledgeAssistantService,
  KnowledgeSourceReference,
} from './knowledge-assistant.service';

@Component({
  selector: 'app-knowledge-assistant',
  templateUrl: './knowledge-assistant.component.html',
  styleUrl: './knowledge-assistant.component.css',
})
export class KnowledgeAssistantComponent {
  private readonly assistant = inject(KnowledgeAssistantService);

  protected readonly question = signal('');
  protected readonly answer = signal<KnowledgeAnswer | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  readonly openSource = output<KnowledgeSourceReference>();

  protected setQuestion(event: Event): void {
    this.question.set((event.target as HTMLTextAreaElement).value);
  }

  protected ask(): void {
    const question = this.question().trim();
    if (this.loading() || question.length < 3 || question.length > 1500) return;

    this.loading.set(true);
    this.error.set(null);
    this.answer.set(null);
    this.assistant.ask(question).subscribe({
      next: (answer) => this.answer.set(answer),
      error: (error: unknown) => {
        this.error.set(this.errorMessage(error));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Could not answer from your notes. Please try again.';
    if (error.status === 0) return 'Cannot reach the API. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 503) return 'AI is not configured. Configure the provider in Settings and try again.';
    if (error.status === 504) return 'The AI provider timed out. Try a shorter question.';
    if (error.error && typeof error.error === 'object' && 'message' in error.error
      && typeof error.error.message === 'string') return error.error.message;
    return `The AI request failed (HTTP ${error.status}). Please try again.`;
  }
}
