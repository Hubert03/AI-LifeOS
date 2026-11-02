import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { UiPreferencesService } from './ui-preferences.service';

type FocusPhase = 'focus' | 'break';

@Component({
  selector: 'app-focus-timer',
  template: `
    <section class="focus-timer-card" aria-label="Focus timer">
      <div class="focus-timer-copy">
        <p class="focus-timer-eyebrow">FOCUS MODE</p>
        <h2>{{ phase() === 'focus' ? 'One thing at a time.' : 'Take a breather.' }}</h2>
        <p>{{ phase() === 'focus' ? 'A little progress adds up.' : 'Step away before the next session.' }}</p>
      </div>
      <div class="focus-timer-clock" role="timer" [attr.aria-label]="phaseLabel() + ' timer ' + timeLabel()">
        <span>{{ timeLabel() }}</span>
        <small>{{ phaseLabel() }}</small>
      </div>
      <div class="focus-timer-actions">
        <button class="focus-primary" type="button" (click)="toggle()">{{ running() ? 'Pause' : phase() === 'focus' ? 'Start focus' : 'Start break' }}</button>
        <button class="focus-secondary" type="button" [disabled]="running()" (click)="reset()">Reset</button>
      </div>
      @if (completedMessage()) { <p class="focus-timer-status" role="status">{{ completedMessage() }}</p> }
    </section>
  `,
  styleUrl: './focus-timer.component.css',
})
export class FocusTimerComponent {
  private readonly preferences = inject(UiPreferencesService);
  private readonly destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  protected readonly phase = signal<FocusPhase>('focus');
  protected readonly running = signal(false);
  protected readonly remainingSeconds = signal(this.preferences.focusMinutes() * 60);
  protected readonly completedMessage = signal('');
  protected readonly phaseLabel = computed(() => this.phase() === 'focus' ? 'Focus session' : 'Break');
  protected readonly timeLabel = computed(() => {
    const seconds = this.remainingSeconds();
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopInterval());
  }

  protected toggle(): void {
    this.completedMessage.set('');
    if (this.running()) {
      this.stopInterval();
      return;
    }
    if (this.remainingSeconds() === 0) {
      this.reset();
    }
    this.running.set(true);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  protected reset(): void {
    this.stopInterval();
    this.phase.set('focus');
    this.remainingSeconds.set(this.preferences.focusMinutes() * 60);
    this.completedMessage.set('');
  }

  private tick(): void {
    if (this.remainingSeconds() > 1) {
      this.remainingSeconds.update((seconds) => seconds - 1);
      return;
    }

    this.stopInterval();
    if (this.phase() === 'focus') {
      this.phase.set('break');
      this.remainingSeconds.set(this.preferences.breakMinutes() * 60);
      this.completedMessage.set('Focus session complete. Your break is ready.');
    } else {
      this.phase.set('focus');
      this.remainingSeconds.set(this.preferences.focusMinutes() * 60);
      this.completedMessage.set('Break complete. Ready for another focus session?');
    }
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running.set(false);
  }
}
