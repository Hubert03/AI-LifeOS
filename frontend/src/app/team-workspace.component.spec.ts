import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfirmationService } from './confirmation.service';
import { TeamWorkspaceComponent } from './team-workspace.component';
import { TeamWorkspaceService } from './team-workspace.service';

describe('TeamWorkspaceComponent', () => {
  it('lets a regular member edit their own shared records, but not another member’s', async () => {
    const workspaceService = {
      getWorkspace: () => of({
        teamId: 'team-1',
        teamName: 'Product',
        accessRole: 'User' as const,
        canManageAll: false,
        currentUserId: 'user-1',
        members: [],
      }),
      getTasks: () => of([
        {
          taskId: 'task-own',
          createdByUserId: 'user-1',
          createdByDisplayName: 'Alex',
          assignedToUserId: 'user-1',
          assignedToDisplayName: 'Alex',
          title: 'My shared task',
          description: null,
          status: 'Pending' as const,
          priority: 2,
          dueAtUtc: null,
          createdAtUtc: '2026-01-01T00:00:00Z',
          updatedAtUtc: null,
        },
        {
          taskId: 'task-other',
          createdByUserId: 'user-2',
          createdByDisplayName: 'Sam',
          assignedToUserId: null,
          assignedToDisplayName: null,
          title: 'Another member task',
          description: null,
          status: 'Pending' as const,
          priority: 2,
          dueAtUtc: null,
          createdAtUtc: '2026-01-01T00:00:00Z',
          updatedAtUtc: null,
        },
      ]),
      getGoals: () => of([]),
      getNotes: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [TeamWorkspaceComponent],
      providers: [
        provideRouter([]),
        { provide: TeamWorkspaceService, useValue: workspaceService },
        { provide: AuthService, useValue: { getErrorMessage: () => 'error' } },
        { provide: ConfirmationService, useValue: { confirm: () => Promise.resolve(false) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TeamWorkspaceComponent);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.record-card');
    expect(cards.length).toBe(2);
    const ownTask = [...cards].find((card) => card.textContent?.includes('My shared task'));
    const otherTask = [...cards].find((card) => card.textContent?.includes('Another member task'));
    expect(ownTask?.querySelectorAll('.record-actions button').length).toBe(2);
    expect(otherTask?.querySelectorAll('.record-actions button').length).toBe(0);
  });
});
