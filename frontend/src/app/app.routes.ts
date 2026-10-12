import { Routes } from '@angular/router';
import { AuthPageComponent } from './auth-page.component';
import { authGuard } from './auth.guard';
import { DashboardComponent } from './dashboard.component';
import { GoalsComponent } from './goals.component';
import { NotesComponent } from './notes.component';
import { SettingsComponent } from './settings.component';
import { TasksComponent } from './tasks.component';

export const routes: Routes = [
  { path: 'login', component: AuthPageComponent, data: { mode: 'login' } },
  { path: 'register', component: AuthPageComponent, data: { mode: 'register' } },
  { path: '', component: DashboardComponent, pathMatch: 'full', canActivate: [authGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'goals', component: GoalsComponent, canActivate: [authGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
