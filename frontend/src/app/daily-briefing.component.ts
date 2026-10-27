import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Briefing, BriefingService } from './briefing.service';

@Component({
  selector: 'app-daily-briefing',
  imports: [DatePipe],
  template: `
    <article class="overview-panel briefing-panel">
      <header class="overview-panel-heading">
        <div><h2>✨ Daily briefing</h2><p>Your day, summarized by AI</p></div>
        <button class="overview-refresh" type="button" [disabled]="loading()" (click)="load(true)">
          {{ loading() ? 'Thinking…' : 'Refresh' }}
        </button>
      </header>

      @if (error()) {
        <p class="overview-extra-error" role="alert">{{ error() }}</p>
      } @else if (loading() && !briefing()) {
        <p class="overview-extra-empty" role="status">Preparing your briefing…</p>
      } @else if (briefing(); as b) {
        <p class="briefing-summary">{{ b.summary }}</p>
        @if (b.priorities.length) {
          <ol class="briefing-list">
            @for (p of b.priorities; track p.title) {
              <li><strong>{{ p.title }}</strong><span>{{ p.reason }}</span></li>
            }
          </ol>
        }
        @if (b.goalToWatch; as g) {
          <p class="briefing-goal"><strong>Goal to watch: {{ g.title }}.</strong> {{ g.note }}</p>
        }
        <p class="briefing-tip">💡 {{ b.suggestion }}</p>
        <small class="briefing-time">Generated {{ b.generatedAtUtc | date: 'h:mm a' }}</small>
      }
    </article>
  `,
})
export class DailyBriefingComponent {
  private readonly service = inject(BriefingService);
  protected readonly briefing = signal<Briefing | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load(false);
  }

  protected load(refresh: boolean): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const request: Observable<Briefing> = refresh ? this.service.refresh() : this.service.get();
    request.subscribe({
      next: (b) => { this.briefing.set(b); this.loading.set(false); },
      error: (e: unknown) => { this.error.set(this.message(e)); this.loading.set(false); },
    });
  }

  private message(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return 'Cannot reach the API.';
      if (e.status === 401) return 'Your session has expired. Please sign in again.';
      const detail = (e.error as { detail?: string } | null)?.detail;
      if (detail) return detail;
    }
    return 'The briefing could not be created. Please try again.';
  }
}