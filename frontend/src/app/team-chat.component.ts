import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from './theme.service';
import { ChatGroup, ChatGroupMember, ChatMessage, TeamService } from './team.service';
import { ConfirmationService } from './confirmation.service';

import { StyleCreatorService } from './style-creator.service';
import { StyleStudioComponent } from './style-studio.component';
import { environment } from '../environments/environment';
@Component({
  selector: 'app-team-chat',
  imports: [DatePipe, FormsModule, RouterLink, ThemePickerComponent, StyleStudioComponent],
  templateUrl: './team-chat.component.html',
  styleUrls: ['./team-chat.component.css', './team-chat-interactions.css'],
})
export class TeamChatComponent {
  private readonly teamService = inject(TeamService);
  private readonly authService = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeService = inject(ThemeService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mobileNavOpen = signal(false);
  protected readonly groups = signal<ChatGroup[]>([]);
  protected readonly selectedGroupId = signal<string | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly groupMembers = signal<ChatGroupMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly mentionPickerOpen = signal(false);
  protected readonly replyToMessage = signal<ChatMessage | null>(null);
  protected readonly mentionedUserIds = signal<string[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected messageDraft = '';
  private readonly connection: HubConnection;
  protected readonly isDarkTheme = this.themeService.isDarkTheme;
  protected readonly styleCreator = inject(StyleCreatorService);

  constructor() {
const apiBaseUrl = environment.apiUrl.replace(/\/+$/, '');
this.connection = new HubConnectionBuilder()
  .withUrl(`${apiBaseUrl}/hubs/chat`, {
    withCredentials: true
  })
  .withAutomaticReconnect()
  .build();
    this.connection.on('MessageReceived', (message: ChatMessage) => {
      if (message.groupId === this.selectedGroupId()) this.appendMessage(message);
    });
    this.connection.on('MessageDeleted', (message: ChatMessage) => {
      if (message.groupId === this.selectedGroupId()) this.replaceMessage(message);
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
          if (nextGroup) {
            this.loadMessages(nextGroup.groupId);
            this.loadGroupMembers(nextGroup.groupId);
          } else {
            this.messages.set([]);
            this.groupMembers.set([]);
          }
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected selectGroup(group: ChatGroup): void {
    this.selectedGroupId.set(group.groupId);
    this.replyToMessage.set(null);
    this.mentionedUserIds.set([]);
    this.mentionPickerOpen.set(false);
    this.loadMessages(group.groupId);
    this.loadGroupMembers(group.groupId);
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
    const mentionedUserIds = this.mentionedUserIds().filter((userId) => {
      const member = this.groupMembers().find((item) => item.userId === userId);
      return !!member && content.includes(`@${member.displayName}`);
    });
    this.teamService.sendMessage(
      groupId,
      content,
      this.replyToMessage()?.messageId ?? null,
      mentionedUserIds,
    ).subscribe({
      next: (message) => {
        this.appendMessage(message);
        this.messageDraft = '';
        this.replyToMessage.set(null);
        this.mentionedUserIds.set([]);
        this.mentionPickerOpen.set(false);
        this.sending.set(false);
      },
      error: (error: unknown) => {
        this.fail(error);
        if (error instanceof HttpErrorResponse && error.status === 404) this.loadGroups();
      },
    });
  }

  protected addMention(member: ChatGroupMember): void {
    const prefix = this.messageDraft && !/\s$/.test(this.messageDraft) ? ' ' : '';
    this.messageDraft = `${this.messageDraft}${prefix}@${member.displayName} `;
    this.mentionedUserIds.update((ids) =>
      ids.includes(member.userId) ? ids : [...ids, member.userId],
    );
    this.mentionPickerOpen.set(false);
  }

  protected pruneMentions(): void {
    const content = this.messageDraft;
    this.mentionedUserIds.update((ids) =>
      ids.filter((userId) => {
        const member = this.groupMembers().find((item) => item.userId === userId);
        return !!member && content.includes(`@${member.displayName}`);
      }),
    );
  }

  protected canDeleteMessage(message: ChatMessage): boolean {
    const user = this.currentUser();
    return !!user && !message.isDeleted && (
      user.userId === message.userId ||
      user.isAdmin ||
      user.accessRole === 'Manager' && user.teamId === message.authorTeamId
    );
  }

  protected replyTo(message: ChatMessage): void {
    this.replyToMessage.set(message);
    this.messageDraft = '';
    this.mentionedUserIds.set([]);
  }

  protected async deleteMessage(message: ChatMessage): Promise<void> {
    const groupId = this.selectedGroupId();
    if (!groupId || !this.canDeleteMessage(message)) return;
    const confirmed = await this.confirmation.confirm({
      title: 'Delete this message?',
      message: 'The message text will be replaced with a deleted-message placeholder.',
      confirmLabel: 'Delete message',
    });
    if (!confirmed) return;
    this.teamService.deleteMessage(groupId, message.messageId).subscribe({
      next: () => undefined,
      error: (error: unknown) => this.fail(error),
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

  private loadGroupMembers(groupId: string): void {
    this.teamService.getGroupMembers(groupId).subscribe({
      next: (members) => {
        if (this.selectedGroupId() === groupId) this.groupMembers.set(members);
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.update((messages) =>
      messages.some((item) => item.messageId === message.messageId)
        ? messages
        : [...messages, message].slice(-100),
    );
  }

  private replaceMessage(message: ChatMessage): void {
    this.messages.update((messages) =>
      messages.map((item) => item.messageId === message.messageId ? message : item),
    );
    const reply = this.replyToMessage();
    if (reply?.messageId === message.messageId) this.replyToMessage.set(message);
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
