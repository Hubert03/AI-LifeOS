import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  accessRole: 'SuperAdmin' | 'Admin' | 'Manager' | 'TeamLead' | 'User';
  teamId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAtUtc: string;
}

export interface AdminWorkspaceSummary extends AdminUser {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalNotes: number;
  lastActivityAtUtc: string | null;
}

export interface AdminTaskStatusCount {
  status: string;
  total: number;
}

export interface AdminActivityDay {
  dateUtc: string;
  total: number;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  activeAdmins: number;
  usersNeedingPasswordChange: number;
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeGoals: number;
  completedGoals: number;
  totalNotes: number;
  taskStatuses: AdminTaskStatusCount[];
  activityByDay: AdminActivityDay[];
  users: AdminWorkspaceSummary[];
}

export interface AdminPage<T> {
  items: T[];
  skip: number;
  take: number;
  totalCount: number;
}

export interface AdminTask {
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  isDeleted: boolean;
}

export interface AdminGoalMilestone {
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface AdminGoal {
  goalId: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  targetDate: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  isDeleted: boolean;
  milestones: AdminGoalMilestone[];
}

export interface AdminNote {
  noteId: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreatedUser {
  userId: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export interface AdminChatGroup {
  groupId: string;
  name: string;
  createdAtUtc: string;
  isArchived: boolean;
  memberIds: string[];
}

export interface TeamMember {
  userId: string;
  displayName: string;
  email: string;
  accessRole: AdminUser['accessRole'];
  isActive: boolean;
  teamId: string | null;
}

export interface Team {
  teamId: string;
  name: string;
  managerUserId: string | null;
  managerName: string | null;
  members: TeamMember[];
}

export interface ChatGroup {
  groupId: string;
  name: string;
}

export interface ChatMessage {
  messageId: string;
  groupId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAtUtc: string;
  isDeleted: boolean;
  replyToMessageId: string | null;
  replyToDisplayName: string | null;
  replyToContent: string | null;
  authorTeamId: string | null;
  mentions: ChatMessageMention[];
}

export interface ChatMessageMention {
  userId: string;
  displayName: string;
}

export interface ChatGroupMember {
  userId: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>('/api/admin/dashboard');
  }

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>('/api/teams');
  }

  createTeam(name: string, managerUserId: string): Observable<Team> {
    return this.postWithCsrf('/api/teams', { name, managerUserId });
  }

  addTeamMember(
    teamId: string,
    userId: string,
    accessRole: AdminUser['accessRole'],
  ): Observable<void> {
    return this.postWithCsrf(`/api/teams/${teamId}/members`, { userId, accessRole });
  }

  removeTeamMember(teamId: string, userId: string): Observable<void> {
    return this.deleteWithCsrf(`/api/teams/${teamId}/members/${userId}`);
  }

  getUserTasks(userId: string, skip: number, take: number): Observable<AdminPage<AdminTask>> {
    return this.http.get<AdminPage<AdminTask>>(
      `/api/admin/users/${encodeURIComponent(userId)}/workspace/tasks`,
      { params: { skip, take } },
    );
  }

  getUserGoals(userId: string, skip: number, take: number): Observable<AdminPage<AdminGoal>> {
    return this.http.get<AdminPage<AdminGoal>>(
      `/api/admin/users/${encodeURIComponent(userId)}/workspace/goals`,
      { params: { skip, take } },
    );
  }

  getUserNotes(userId: string, skip: number, take: number): Observable<AdminPage<AdminNote>> {
    return this.http.get<AdminPage<AdminNote>>(
      `/api/admin/users/${encodeURIComponent(userId)}/workspace/notes`,
      { params: { skip, take } },
    );
  }

  createUser(displayName: string, email: string, accessRole = 'User'): Observable<CreatedUser> {
    return this.postWithCsrf('/api/admin/users', { displayName, email, accessRole });
  }

  sendInvitation(
    displayName: string,
    email: string,
    accessRole = 'User',
  ): Observable<{ email: string; expiresAtUtc: string }> {
    return this.postWithCsrf('/api/admin/invitations', { displayName, email, accessRole });
  }

  setUserAccess(
    userId: string,
    accessRole: AdminUser['accessRole'],
    isActive: boolean,
    teamId: string | null,
  ): Observable<void> {
    return this.patchWithCsrf(`/api/admin/users/${userId}/access`, {
      isAdmin: accessRole === 'SuperAdmin' || accessRole === 'Admin',
      isActive,
      accessRole,
      teamId,
    });
  }

  getAdminGroups(): Observable<AdminChatGroup[]> {
    return this.http.get<AdminChatGroup[]>('/api/admin/chat-groups');
  }

  createGroup(name: string, memberIds: string[]): Observable<unknown> {
    return this.postWithCsrf('/api/admin/chat-groups', { name, memberIds });
  }

  addGroupMember(groupId: string, userId: string): Observable<void> {
    return this.postWithCsrf(`/api/admin/chat-groups/${groupId}/members`, { userId });
  }

  removeGroupMember(groupId: string, userId: string): Observable<void> {
    return this.deleteWithCsrf(`/api/admin/chat-groups/${groupId}/members/${userId}`);
  }

  archiveGroup(groupId: string): Observable<void> {
    return this.postWithCsrf(`/api/admin/chat-groups/${groupId}/archive`, {});
  }

  getGroups(): Observable<ChatGroup[]> {
    return this.http.get<ChatGroup[]>('/api/chat/groups');
  }

  getMessages(groupId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`/api/chat/groups/${groupId}/messages`);
  }

  getGroupMembers(groupId: string): Observable<ChatGroupMember[]> {
    return this.http.get<ChatGroupMember[]>(`/api/chat/groups/${groupId}/members`);
  }

  sendMessage(
    groupId: string,
    content: string,
    replyToMessageId: string | null,
    mentionedUserIds: string[],
  ): Observable<ChatMessage> {
    return this.postWithCsrf(`/api/chat/groups/${groupId}/messages`, {
      content,
      replyToMessageId,
      mentionedUserIds,
    });
  }

  deleteMessage(groupId: string, messageId: string): Observable<void> {
    return this.deleteWithCsrf(`/api/chat/groups/${groupId}/messages/${messageId}`);
  }

  private postWithCsrf<T>(url: string, body: unknown): Observable<T> {
    return this.auth.loadCsrfToken().pipe(
      switchMap(() => this.http.post<T>(url, body, { headers: this.auth.csrfHeaders(),
      withCredentials: true })),
    );
  }

  private patchWithCsrf<T>(url: string, body: unknown): Observable<T> {
    return this.auth.loadCsrfToken().pipe(
      switchMap(() => this.http.patch<T>(url, body, { headers: this.auth.csrfHeaders() })),
    );
  }

  private deleteWithCsrf<T>(url: string): Observable<T> {
    return this.auth.loadCsrfToken().pipe(
      switchMap(() => this.http.delete<T>(url, { headers: this.auth.csrfHeaders() })),
    );
  }
}
