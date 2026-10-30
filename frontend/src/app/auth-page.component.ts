import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
})
export class AuthPageComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected email = '';
  protected password = '';

  constructor() {
    if (this.route.snapshot.queryParamMap.get('reason') === 'api-unavailable') {
      this.errorMessage.set('Cannot verify your sign-in. Make sure the .NET API is running.');
    }
  }
protected submit(): void {
  console.log('LOGIN SUBMIT TRIGGERED');

  console.log('Email entered:', !!this.email);
  console.log('Password entered:', !!this.password);

  if (this.isSubmitting()) {
    console.log('Already submitting');
    return;
  }

  this.errorMessage.set(null);
  this.isSubmitting.set(true);

  console.log('Calling AuthService.login');

  this.authService.login(this.email, this.password).subscribe({
    next: (user) =>
      void this.router.navigateByUrl(
        user.mustChangePassword ? '/change-password' : '/',
      ),
    error: (error: unknown) => {
      console.error('LOGIN API ERROR:', error);
      this.errorMessage.set(this.authService.getErrorMessage(error));
      this.isSubmitting.set(false);
    },
    complete: () => this.isSubmitting.set(false),
  });
}
  // protected submit(): void {
  //   if (this.isSubmitting()) {
  //     return;
  //   }

  //   this.errorMessage.set(null);
  //   this.isSubmitting.set(true);

  //   this.authService.login(this.email, this.password).subscribe({
  //     next: (user) =>
  //       void this.router.navigateByUrl(
  //         user.mustChangePassword ? '/change-password' : '/',
  //       ),
  //     error: (error: unknown) => {
  //       this.errorMessage.set(this.authService.getErrorMessage(error));
  //       this.isSubmitting.set(false);
  //     },
  //     complete: () => this.isSubmitting.set(false),
  //   });
  // }
}