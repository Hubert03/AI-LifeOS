import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { ChatGroup, ChatMessage, TeamService } from './team.service';

import { StyleCreatorService } from './style-creator.service';
import { StyleStudioComponent } from './style-studio.component';

@Component({
  selector: 'app-team-chat',
  imports: [DatePipe, FormsModule, RouterLink, ThemePickerComponent, StyleStudioComponent],
  templateUrl: './team-chat.component.html',
  styleUrl: './team-chat.component.css',
})
export class TeamChatComponent {
  private readonly teamService = inject(TeamService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeService = inject(ThemeService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mobileNavOpen = signal(false);
  protected readonly groups = signal<ChatGroup[]>([]);
  protected readonly selectedGroupId = signal<string | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected messageDraft = '';
  private readonly connection: HubConnection;
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly styleCreator = inject(StyleCreatorService);

  constructor() {
    this.connection = new HubConnectionBuilder()
      .withUrl('/hubs/chat')
      .withAutomaticReconnect()
      .build();
    this.connection.on('MessageReceived', (message: ChatMessage) => {
      if (message.groupId === this.selectedGroupId()) this.appendMessage(message);
    });
    this.connection.start().catch(() => {
      this.errorMessage.set('Live updates are unavailable. You can still refresh the conversation.');
    });
    this.loadGroups();
    this.destroyRef.onDestroy(() => void this.connection.stop());
  }

  protected loadGroups(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.teamService.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loading.set(false);
        if (!groups.some((group) => group.groupId === this.selectedGroupId())) {
          const nextGroup = groups[0];
          this.selectedGroupId.set(nextGroup?.groupId ?? null);
          if (nextGroup) this.loadMessages(nextGroup.groupId);
          else this.messages.set([]);
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected selectGroup(group: ChatGroup): void {
    this.selectedGroupId.set(group.groupId);
    this.loadMessages(group.groupId);
  }

  protected refreshMessages(): void {
    const groupId = this.selectedGroupId();
    if (groupId) this.loadMessages(groupId);
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: (error: unknown) => this.fail(error),
    });
  }

  protected sendMessage(): void {
    const groupId = this.selectedGroupId();
    const content = this.messageDraft.trim();
    if (!groupId || !content || this.sending()) return;
    this.sending.set(true);
    this.errorMessage.set(null);
    this.teamService.sendMessage(groupId, content).subscribe({
      next: (message) => {
        this.appendMessage(message);
        this.messageDraft = '';
        this.sending.set(false);
      },
      error: (error: unknown) => {
        this.fail(error);
        if (error instanceof HttpErrorResponse && error.status === 404) this.loadGroups();
      },
    });
  }

  private loadMessages(groupId: string): void {
    this.teamService.getMessages(groupId).subscribe({
      next: (messages) => {
        if (this.selectedGroupId() === groupId) this.messages.set(messages);
      },
      error: (error: unknown) => {
        this.fail(error);
        if (error instanceof HttpErrorResponse && error.status === 404) this.loadGroups();
      },
    });
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.update((messages) =>
      messages.some((item) => item.messageId === message.messageId)
        ? messages
        : [...messages, message].slice(-100),
    );
  }

  private fail(error: unknown): void {
    const httpError = error instanceof HttpErrorResponse ? error : null;
    this.errorMessage.set(
      httpError?.error?.message ??
        (httpError?.status === 0
          ? 'The API is unavailable. Check that the backend is running.'
          : 'The chat request failed. Please try again.'),
    );
    this.loading.set(false);
    this.sending.set(false);
  }
}
