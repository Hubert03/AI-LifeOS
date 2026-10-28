import { DatePipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { NotesService } from './notes.service';
import { WeeklyReviewService } from './weekly-review.service';

@Component({
  selector: 'app-weekly-review',
  imports: [DatePipe],
  template: `
    <article class="overview-panel briefing-panel">
      <header class="overview-panel-heading">
        <div><h2>Weekly review</h2><p>The last seven days, summarized by AI</p></div>
        <button class="overview-refresh" type="button" [disabled]="store.loading()" (click)="onLoad()">
          {{ store.loading() ? 'Thinking…' : store.review() ? 'Refresh' : 'Create review' }}
        </button>
      </header>

      @if (store.error()) {
        <p class="overview-extra-error" role="alert">{{ store.error() }}</p>
      }
      @if (saveError()) {
        <p class="overview-extra-error" role="alert">{{ saveError() }}</p>
      }
      @if (message()) {
        <p class="overview-restore-message" role="status">{{ message() }}</p>
      }

      @if (store.review(); as r) {
        <p class="briefing-summary">{{ r.headline }}</p>

        @if (r.wins.length) {
          <h3 class="review-heading">Wins</h3>
          <ul class="review-list">@for (w of r.wins; track $index) { <li>{{ w }}</li> }</ul>
        }
        @if (r.slipped.length) {
          <h3 class="review-heading">Slipped</h3>
          <ul class="review-list">@for (s of r.slipped; track $index) { <li>{{ s }}</li> }</ul>
        }
        @if (r.focus.length) {
          <h3 class="review-heading">Focus next week</h3>
          <ol class="review-list">@for (f of r.focus; track $index) { <li>{{ f }}</li> }</ol>
        }

        <p class="briefing-tip">{{ r.encouragement }}</p>
        <div class="review-footer">
          <small class="briefing-time">Generated {{ r.generatedAtUtc | date: 'MMM d, h:mm a' }}</small>
          <button class="overview-refresh" type="button" [disabled]="saving()" (click)="saveAsNote()">
            {{ saving() ? 'Saving…' : 'Save as note' }}
          </button>
        </div>
      } @else if (!store.loading() && !store.error()) {
        <p class="overview-extra-empty">Create a review to see your wins, what slipped, and what to focus on next.</p>
      }
    </article>
  `,
})
export class WeeklyReviewComponent {
  protected readonly store = inject(WeeklyReviewService);
  private readonly notes = inject(NotesService);

  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    this.store.syncOwner();
  }

  protected onLoad(): void {
    this.message.set(null);
    this.saveError.set(null);
    this.store.load();
  }

  protected saveAsNote(): void {
    const r = this.store.review();
    if (!r || this.saving()) return;
    const section = (title: string, items: string[]): string =>
      items.length ? `\n\n${title}\n${items.map((i) => `- ${i}`).join('\n')}` : '';
    const content = (
      r.headline +
      section('Wins', r.wins) +
      section('Slipped', r.slipped) +
      section('Focus next week', r.focus) +
      `\n\n${r.encouragement}`
    ).slice(0, 5000);

    this.saving.set(true);
    this.saveError.set(null);
    this.message.set(null);
    this.notes
      .createNote({
        title: `Weekly review, ${new Date().toLocaleDateString('en-CA')}`,
        content,
        isPinned: false,
        color: '#F3F4F6',
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Saved to your notes.');
          this.saved.emit();
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set('The note could not be saved. Please try again.');
        },
      });
  }
}

// import { DatePipe } from '@angular/common';
// import { HttpErrorResponse } from '@angular/common/http';
// import { Component, inject, output, signal } from '@angular/core';
// import { Observable } from 'rxjs';
// import { NotesService } from './notes.service';
// import { WeeklyReview, WeeklyReviewService } from './weekly-review.service';

// @Component({
//   selector: 'app-weekly-review',
//   imports: [DatePipe],
//   template: `
//     <article class="overview-panel briefing-panel">
//       <header class="overview-panel-heading">
//         <div><h2>Weekly review</h2><p>The last seven days, summarized by AI</p></div>
//         <button class="overview-refresh" type="button" [disabled]="loading()" (click)="load(review() !== null)">
//           {{ loading() ? 'Thinking…' : review() ? 'Refresh' : 'Create review' }}
//         </button>
//       </header>

//       @if (error()) {
//         <p class="overview-extra-error" role="alert">{{ error() }}</p>
//       }
//       @if (message()) {
//         <p class="overview-restore-message" role="status">{{ message() }}</p>
//       }

//       @if (review(); as r) {
//         <p class="briefing-summary">{{ r.headline }}</p>

//         @if (r.wins.length) {
//           <h3 class="review-heading">Wins</h3>
//           <ul class="review-list">@for (w of r.wins; track $index) { <li>{{ w }}</li> }</ul>
//         }
//         @if (r.slipped.length) {
//           <h3 class="review-heading">Slipped</h3>
//           <ul class="review-list">@for (s of r.slipped; track $index) { <li>{{ s }}</li> }</ul>
//         }
//         @if (r.focus.length) {
//           <h3 class="review-heading">Focus next week</h3>
//           <ol class="review-list">@for (f of r.focus; track $index) { <li>{{ f }}</li> }</ol>
//         }

//         <p class="briefing-tip">{{ r.encouragement }}</p>
//         <div class="review-footer">
//           <small class="briefing-time">Generated {{ r.generatedAtUtc | date: 'MMM d, h:mm a' }}</small>
//           <button class="overview-refresh" type="button" [disabled]="saving()" (click)="saveAsNote()">
//             {{ saving() ? 'Saving…' : 'Save as note' }}
//           </button>
//         </div>
//       } @else if (!loading() && !error()) {
//         <p class="overview-extra-empty">Create a review to see your wins, what slipped, and what to focus on next.</p>
//       }
//     </article>
//   `,
// })
// export class WeeklyReviewComponent {
//   private readonly api = inject(WeeklyReviewService);
//   private readonly notes = inject(NotesService);

//   readonly saved = output<void>();

//   protected readonly review = signal<WeeklyReview | null>(null);
//   protected readonly loading = signal(false);
//   protected readonly saving = signal(false);
//   protected readonly error = signal<string | null>(null);
//   protected readonly message = signal<string | null>(null);

//   protected load(refresh: boolean): void {
//     if (this.loading()) return;
//     this.loading.set(true);
//     this.error.set(null);
//     this.message.set(null);
//     const request: Observable<WeeklyReview> = refresh ? this.api.refresh() : this.api.get();
//     request.subscribe({
//       next: (r) => { this.review.set(r); this.loading.set(false); },
//       error: (e: unknown) => { this.error.set(this.describe(e)); this.loading.set(false); },
//     });
//   }

//   protected saveAsNote(): void {
//     const r = this.review();
//     if (!r || this.saving()) return;
//     const section = (title: string, items: string[]): string =>
//       items.length ? `\n\n${title}\n${items.map((i) => `- ${i}`).join('\n')}` : '';
//     const content = (
//       r.headline +
//       section('Wins', r.wins) +
//       section('Slipped', r.slipped) +
//       section('Focus next week', r.focus) +
//       `\n\n${r.encouragement}`
//     ).slice(0, 5000);

//     this.saving.set(true);
//     this.error.set(null);
//     this.notes
//       .createNote({
//         title: `Weekly review, ${new Date().toLocaleDateString('en-CA')}`,
//         content,
//         isPinned: false,
//         color: '#F3F4F6',
//       })
//       .subscribe({
//         next: () => {
//           this.saving.set(false);
//           this.message.set('Saved to your notes.');
//           this.saved.emit();
//         },
//         error: () => {
//           this.saving.set(false);
//           this.error.set('The note could not be saved. Please try again.');
//         },
//       });
//   }

//   private describe(e: unknown): string {
//     if (e instanceof HttpErrorResponse) {
//       if (e.status === 0) return 'Cannot reach the API.';
//       if (e.status === 401) return 'Your session has expired. Please sign in again.';
//       const detail = (e.error as { detail?: string } | null)?.detail;
//       if (detail) return detail;
//     }
//     return 'The review could not be created. Please try again.';
//   }
// }