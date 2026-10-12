import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TasksComponent } from './tasks.component';

describe('TasksComponent', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-theme');
    TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('ai-lifeos-theme');
  });

  it('filters the real task list by status and search', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/tasks').flush([
      {
        taskId: 'e8bc34f7-33b9-48cd-989f-5e5dc0650bd2',
        title: 'Prepare presentation',
        description: 'Draft the slides',
        status: 'Pending',
        priority: 1,
        dueAtUtc: '2026-10-15T00:00:00Z',
        createdAtUtc: '2026-10-12T00:00:00Z',
        updatedAtUtc: null,
      },
      {
        taskId: '1d558383-359f-4c17-a511-af1f1bc30c3e',
        title: 'Read project notes',
        description: null,
        status: 'Completed',
        priority: 3,
        dueAtUtc: null,
        createdAtUtc: '2026-10-11T00:00:00Z',
        updatedAtUtc: null,
      },
    ]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.task-row')).toHaveLength(2);
    const completedTab = [...page.querySelectorAll<HTMLButtonElement>('.task-tab')].find(
      (tab) => tab.textContent?.includes('Completed'),
    );
    completedTab?.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.task-row')).toHaveLength(1);
    expect(page.textContent).toContain('Read project notes');

    const allTab = [...page.querySelectorAll<HTMLButtonElement>('.task-tab')].find(
      (tab) => tab.textContent?.includes('All tasks'),
    );
    allTab?.click();
    fixture.detectChanges();
    const search = page.querySelector('input[aria-label="Search tasks"]') as HTMLInputElement;
    search.value = 'presentation';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.task-row')).toHaveLength(1);
    expect(page.textContent).toContain('Prepare presentation');
  });

  it('opens the task form with accessible required fields and validation', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    httpTesting.expectOne('/api/tasks').flush([]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    (page.querySelector('.tasks-title-row .primary-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    const dialog = page.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Create a task');
    expect(dialog?.querySelector('input[name="title"]')?.hasAttribute('required')).toBe(true);
    expect(
      (dialog?.querySelector('.dialog-actions .primary-action') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
