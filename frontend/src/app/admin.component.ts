import { DOCUMENT, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { AdminChatGroup, AdminUser, CreatedUser, TeamService } from './team.service';

@Component({
  selector: 'app-admin',
  imports: [DatePipe, FormsModule, RouterLink, ThemePickerComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  private readonly document = inject(DOCUMENT);
  private readonly teamService = inject(TeamService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly groups = signal<AdminChatGroup[]>([]);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mobileNavOpen = signal(false);
  protected readonly activeAdminCount = computed(
    () => this.users().filter((user) => user.isAdmin && user.isActive).length,
  );
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly createdUser = signal<CreatedUser | null>(null);
  protected displayName = '';
  protected email = '';
  protected invitationName = '';
  protected invitationEmail = '';
  protected groupName = '';
  protected selectedMemberIds: string[] = [];
  protected readonly additionalMemberByGroup = signal<Record<string, string>>({});

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.teamService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.teamService.getAdminGroups().subscribe({
          next: (groups) => {
            this.groups.set(groups);
            this.loading.set(false);
          },
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: (error: unknown) => this.fail(error),
    });
  }

  protected scrollToSection(sectionId: string): void {
    this.document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected createUser(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.createdUser.set(null);
    this.teamService.createUser(this.displayName, this.email).subscribe({
      next: (user) => {
        this.createdUser.set(user);
        this.displayName = '';
        this.email = '';
        this.busy.set(false);
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected inviteUser(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.teamService.sendInvitation(this.invitationName, this.invitationEmail).subscribe({
      next: (result) => {
        this.successMessage.set(`Invitation sent to ${result.email}.`);
        this.invitationName = '';
        this.invitationEmail = '';
        this.busy.set(false);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected toggleAccess(user: AdminUser, changes: Partial<Pick<AdminUser, 'isAdmin' | 'isActive'>>): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.teamService.setUserAccess(
      user.userId,
      changes.isAdmin ?? user.isAdmin,
      changes.isActive ?? user.isActive,
    ).subscribe({
      next: () => {
        this.busy.set(false);
        this.successMessage.set('Account access updated.');
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected toggleMember(userId: string, checked: boolean): void {
    this.selectedMemberIds = checked
      ? [...new Set([...this.selectedMemberIds, userId])]
      : this.selectedMemberIds.filter((selectedId) => selectedId !== userId);
  }

  protected createGroup(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.teamService.createGroup(this.groupName, this.selectedMemberIds).subscribe({
      next: () => {
        this.groupName = '';
        this.selectedMemberIds = [];
        this.busy.set(false);
        this.successMessage.set('Chat group created.');
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected setAdditionalMember(groupId: string, userId: string): void {
    this.additionalMemberByGroup.update((entries) => ({ ...entries, [groupId]: userId }));
  }

  protected addMember(group: AdminChatGroup): void {
    const userId = this.additionalMemberByGroup()[group.groupId];
    if (!userId) return;
    this.busy.set(true);
    this.teamService.addGroupMember(group.groupId, userId).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected removeMember(group: AdminChatGroup, userId: string): void {
    this.busy.set(true);
    this.teamService.removeGroupMember(group.groupId, userId).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected archiveGroup(group: AdminChatGroup): void {
    this.busy.set(true);
    this.teamService.archiveGroup(group.groupId).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected memberName(userId: string): string {
    const user = this.users().find((item) => item.userId === userId);
    return user?.displayName ?? user?.email ?? 'Unknown user';
  }

  protected eligibleMembers(group: AdminChatGroup): AdminUser[] {
    return this.users().filter(
      (user) => user.isActive && !group.memberIds.includes(user.userId),
    );
  }

  private fail(error: unknown): void {
    let message: string | null = null;
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        message = 'Cannot reach the API. Make sure the .NET API is running.';
      } else {
        const response =
          error.error && typeof error.error === 'object'
            ? (error.error as Record<string, unknown>)
            : null;
        const errors = response?.['errors'];
        const validationMessages = Array.isArray(errors)
          ? errors.filter((item): item is string => typeof item === 'string')
          : errors && typeof errors === 'object'
            ? Object.values(errors).flatMap((value) =>
                Array.isArray(value)
                  ? value.filter((item): item is string => typeof item === 'string')
                  : typeof value === 'string'
                    ? [value]
                    : [],
              )
            : [];
        const details = [response?.['detail'], response?.['message']].find(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        const title = response?.['title'];
        message =
          details ??
          (validationMessages.length ? validationMessages.join(' ') : null) ??
          (typeof title === 'string' && title.trim().length > 0 ? title : null) ??
          `The request failed (HTTP ${error.status}). Please try again.`;
      }
    }
    this.errorMessage.set(message ?? 'The request could not be completed. Please try again.');
    this.busy.set(false);
    this.loading.set(false);
  }
}
