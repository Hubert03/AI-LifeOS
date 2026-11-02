import { Injectable, signal } from '@angular/core';

export type PopupId = 'theme-picker' | 'style-studio' | 'notifications' | 'profile-menu';

@Injectable({ providedIn: 'root' })
export class PopupStateService {
  private readonly activePopup = signal<PopupId | null>(null);

  isOpen(popup: PopupId): boolean {
    return this.activePopup() === popup;
  }

  toggle(popup: PopupId): void {
    this.activePopup.update((active) => (active === popup ? null : popup));
  }

  close(popup: PopupId): void {
    if (this.activePopup() === popup) {
      this.activePopup.set(null);
    }
  }

  closeAll(): void {
    this.activePopup.set(null);
  }
}
