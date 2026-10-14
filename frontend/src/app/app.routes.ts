import { Routes } from '@angular/router';
import { AuthPageComponent } from './auth-page.component';
import { adminGuard, authGuard, passwordChangeGuard } from './auth.guard';
import { AcceptInvitationComponent } from './accept-invitation.component';
import { AdminComponent } from './admin.component';
import { ChangePasswordComponent } from './change-password.component';
import { TeamChatComponent } from './team-chat.component';
import { DashboardComponent } from './dashboard.component';
import { GoalsComponent } from './goals.component';
import { NotesComponent } from './notes.component';
import { SettingsComponent } from './settings.component';
import { TasksComponent } from './tasks.component';

export const routes: Routes = [
  { path: 'login', component: AuthPageComponent, data: { mode: 'login' } },
  { path: 'accept-invitation', component: AcceptInvitationComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [passwordChangeGuard] },
  { path: 'team-chat', component: TeamChatComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
  { path: '', component: DashboardComponent, pathMatch: 'full', canActivate: [authGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'goals', component: GoalsComponent, canActivate: [authGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
