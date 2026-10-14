import { TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationDialogComponent', () => {
  it('renders a styled accessible confirmation and resolves the user choice', async () => {
    localStorage.removeItem('ai-lifeos-theme');
    TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    });
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    const confirmation = TestBed.inject(ConfirmationService);
    const result = confirmation.confirm({
      title: 'Delete this note?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete note',
    });
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Delete this note?');
    expect(dialog.textContent).toContain('This action cannot be undone.');
    (dialog.querySelector('.confirmation-accept') as HTMLButtonElement).click();

    await expect(result).resolves.toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
