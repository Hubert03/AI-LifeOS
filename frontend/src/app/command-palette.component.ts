import { Component, HostListener, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { StyleCreatorService } from './style-creator.service';
import { ThemeMode, ThemeService } from './theme.service';

interface Command {
  id: string;
  label: string;
  group: 'Go to' | 'Theme' | 'Style' | 'Account';
  run: () => void;
}

const PALETTES: Record<ThemeMode, Record<string, string>> = {
  dark:   { '--p-bg': '#141a25', '--p-ink': '#f4f5fa', '--p-muted': '#969fb1', '--p-line': '#293244', '--p-accent': '#a78bfa' },
  light:  { '--p-bg': '#ffffff', '--p-ink': '#10232e', '--p-muted': '#71838c', '--p-line': '#dfe6e9', '--p-accent': '#6743dc' },
  ocean:  { '--p-bg': '#102737', '--p-ink': '#effaff', '--p-muted': '#88aebb', '--p-line': '#25495c', '--p-accent': '#56c6d5' },
  forest: { '--p-bg': '#192923', '--p-ink': '#f2f8f3', '--p-muted': '#96ad9d', '--p-line': '#30473b', '--p-accent': '#8ed3a3' },
};

@Component({
  selector: 'app-command-palette',
  template: `
    @if (open()) {
      <div class="cp-backdrop" (click)="close()"></div>
      <div class="cp-panel" role="dialog" aria-modal="true" aria-label="Command palette" [style]="vars()">
        <input #field class="cp-input" type="text" placeholder="Type a command or page…"
               role="combobox" aria-expanded="true" aria-controls="cp-list"
               [attr.aria-activedescendant]="results().length ? 'cp-' + results()[active()].id : null"
               [value]="query()" (input)="onQuery($event)" (keydown)="onKey($event)" />
        <ul id="cp-list" class="cp-list" role="listbox">
          @for (c of results(); track c.id; let i = $index) {
            <li [id]="'cp-' + c.id" role="option" [class.on]="i === active()" [attr.aria-selected]="i === active()"
                (mouseenter)="active.set(i)" (click)="exec(c)">
              <span>{{ c.label }}</span><small>{{ c.group }}</small>
            </li>
          } @empty {
            <li class="cp-empty">No matching commands</li>
          }
        </ul>
        <footer class="cp-foot">↑↓ to move · Enter to run · Esc to close</footer>
      </div>
    }
  `,
  styles: `
    .cp-backdrop { position: fixed; inset: 0; z-index: 60; background: rgb(5 7 12 / 60%); backdrop-filter: blur(3px); }
    .cp-panel {
      position: fixed; z-index: 61; top: 14vh; left: 50%; width: min(560px, calc(100vw - 24px));
      transform: translateX(-50%); overflow: hidden; border: 1px solid var(--p-line); border-radius: 14px;
      background: var(--p-bg); color: var(--p-ink); box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
    }
    .cp-input { width: 100%; padding: 16px 18px; border: 0; border-bottom: 1px solid var(--p-line);
      outline: 0; background: transparent; color: var(--p-ink); font: inherit; font-size: 15px; }
    .cp-input::placeholder { color: var(--p-muted); }
    .cp-list { max-height: 340px; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
    .cp-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 12px; border-radius: 9px; cursor: pointer; font-size: 14px; }
    .cp-list li.on { background: color-mix(in srgb, var(--p-accent) 18%, transparent); color: var(--p-accent); }
    .cp-list small { color: var(--p-muted); font-size: 11px; }
    .cp-empty { color: var(--p-muted); cursor: default !important; }
    .cp-foot { padding: 8px 14px; border-top: 1px solid var(--p-line); color: var(--p-muted); font-size: 11px; }
  `,
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly themes = inject(ThemeService);
  private readonly styles = inject(StyleCreatorService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly active = signal(0);

  protected readonly vars = computed(() => {
    const base = { ...PALETTES[this.themes.theme()] };
    const accent = this.styles.style().accent;
    if (accent) base['--p-accent'] = accent;
    return base;
  });

  private readonly commands = computed<Command[]>(() => {
    const go = (id: string, label: string, url: string): Command =>
      ({ id, label: `Go to ${label}`, group: 'Go to', run: () => void this.router.navigateByUrl(url) });
    const theme = (mode: ThemeMode, label: string): Command =>
      ({ id: `theme-${mode}`, label: `Switch to ${label} theme`, group: 'Theme', run: () => this.themes.setTheme(mode) });

    const list: Command[] = [
      go('overview', 'Overview', '/'),
      go('tasks', 'Tasks', '/tasks'),
      go('goals', 'Goals', '/goals'),
      go('notes', 'Notes', '/notes'),
      go('chat', 'Team chat', '/team-chat'),
      go('settings', 'Settings', '/settings'),
    ];
    if (this.auth.currentUser()?.isAdmin) list.push(go('admin', 'Team admin', '/admin'));
    list.push(
      theme('dark', 'Dark'), theme('light', 'Light'), theme('ocean', 'Ocean'), theme('forest', 'Forest'),
      { id: 'style-reset', label: 'Reset custom style', group: 'Style', run: () => this.styles.reset() },
      {
        id: 'signout', label: 'Sign out', group: 'Account',
        run: () => this.auth.logout().subscribe({ next: () => void this.router.navigateByUrl('/login') }),
      },
    );
    return list;
  });

  protected readonly results = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return q ? this.commands().filter((c) => c.label.toLocaleLowerCase().includes(q)) : this.commands();
  });

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.open() ? this.close() : this.show();
    } else if (e.key === 'Escape' && this.open()) {
      this.close();
    }
  }

  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.active.set(0);
  }

  protected onKey(e: KeyboardEvent): void {
    const count = this.results().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set(count ? (this.active() + 1) % count : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set(count ? (this.active() - 1 + count) % count : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = this.results()[this.active()]; if (c) this.exec(c); }
  }

  protected exec(command: Command): void {
    this.close();
    command.run();
  }

  protected close(): void {
    this.open.set(false);
  }

  private show(): void {
    if (!this.auth.currentUser()) return;   // only for signed-in users
    this.query.set('');
    this.active.set(0);
    this.open.set(true);
    setTimeout(() => this.field()?.nativeElement.focus());
  }
}