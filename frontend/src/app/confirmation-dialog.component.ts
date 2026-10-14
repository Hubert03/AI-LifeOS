import { Component, HostListener, inject } from '@angular/core';
import { ConfirmationService } from './confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);

  @HostListener('document:keydown.escape')
  protected dismissOnEscape(): void {
    if (this.confirmation.request()) {
      this.confirmation.dismiss(false);
    }
  }
}
