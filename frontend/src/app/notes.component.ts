import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AiPlannerComponent } from './ai-planner.component';
import { AuthService } from './auth.service';
import { ConfirmationService } from './confirmation.service';
import { LifeNote, NotesService, SaveNote } from './notes.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';

import { StyleCreatorService } from './style-creator.service';
import { StyleStudioComponent } from './style-studio.component';

@Component({
  selector: 'app-notes',
  imports: [AiPlannerComponent, DatePipe, FormsModule, RouterLink, ThemePickerComponent,StyleStudioComponent],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css',
})
export class NotesComponent {
  private readonly notesService = inject(NotesService);
  private readonly authService = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly notes = signal<LifeNote[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly isLoading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly profileMenuOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly editingNote = signal<LifeNote | null>(null);
  protected readonly form = signal<SaveNote>(this.emptyForm());

protected readonly styleCreator = inject(StyleCreatorService);

  protected readonly visibleNotes = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return [...this.notes()]
      .filter((note) => !query || `${note.title} ${note.content}`.toLocaleLowerCase().includes(query))
      .sort((left, right) => Number(right.isPinned) - Number(left.isPinned) ||
        right.updatedAtUtc?.localeCompare(left.updatedAtUtc ?? '') ||
        right.createdAtUtc.localeCompare(left.createdAtUtc));
  });

  constructor() {
    this.loadNotes();
  }

  protected loadNotes(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.notesService.getNotes().subscribe({
      next: (notes) => this.notes.set(notes),
      error: () => {
        this.error.set('Could not load your notes. Check that the API is running and the notes database update has been applied.');
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  protected openCreate(): void {
    this.editingNote.set(null);
    this.form.set(this.emptyForm());
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(note: LifeNote): void {
    this.editingNote.set(note);
    this.form.set({
      title: note.title,
      content: note.content,
      isPinned: note.isPinned,
      color: note.color,
    });
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected updateForm<K extends keyof SaveNote>(field: K, value: SaveNote[K]): void {
    this.form.update((form) => ({ ...form, [field]: value }));
  }

  protected saveNote(): void {
    const form = this.form();
    if (this.saving() || !form.title.trim() || !form.content.trim()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const editing = this.editingNote();
    const request = editing
      ? this.notesService.updateNote(editing.noteId, { ...form, title: form.title.trim() })
      : this.notesService.createNote({ ...form, title: form.title.trim() });
    request.subscribe({
      next: (note) => {
        this.notes.update((notes) => editing
          ? notes.map((item) => item.noteId === note.noteId ? note : item)
          : [note, ...notes]);
        this.success.set(editing ? 'Note updated.' : 'Note saved.');
        this.dialogOpen.set(false);
      },
      error: (error: unknown) => {
        this.error.set(error instanceof HttpErrorResponse && error.status === 0
          ? 'Could not reach the API. Your note has not been saved.'
          : 'Could not save this note. Please try again.');
        this.saving.set(false);
      },
      complete: () => this.saving.set(false),
    });
  }

  protected togglePinned(note: LifeNote): void {
    const payload = {
      title: note.title,
      content: note.content,
      isPinned: !note.isPinned,
      color: note.color,
    };
    this.notesService.updateNote(note.noteId, payload).subscribe({
      next: (updated) => {
        this.notes.update((notes) => notes.map((item) => item.noteId === updated.noteId ? updated : item));
        this.success.set(updated.isPinned ? 'Note pinned to Overview.' : 'Note unpinned.');
      },
      error: () => this.error.set('Could not update the pin. Please try again.'),
    });
  }

  protected async deleteNote(note: LifeNote): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this note?',
      message: `“${note.title}” will be permanently removed from Notes.`,
      confirmLabel: 'Delete note',
    });
    if (!confirmed) {
      return;
    }
    this.notesService.deleteNote(note.noteId).subscribe({
      next: () => {
        this.notes.update((notes) => notes.filter((item) => item.noteId !== note.noteId));
        this.success.set('Note deleted.');
      },
      error: () => this.error.set('Could not delete this note. Please try again.'),
    });
  }

  protected setSearchTerm(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => this.error.set('Could not sign out. Please try again.'),
    });
  }

  private emptyForm(): SaveNote {
    return { title: '', content: '', isPinned: true, color: '#DCCB9A' };
  }
}
