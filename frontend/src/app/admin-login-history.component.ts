// import { DatePipe } from '@angular/common';
// import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { Component, inject, signal } from '@angular/core';

// interface LoginHistoryEntry {
//   loginHistoryId: string;
//   userId: string;
//   displayName: string;
//   email: string;
//   succeeded: boolean;
//   attemptedAtUtc: string;
// }

// @Component({
//   selector: 'app-admin-login-history',
//   imports: [DatePipe],
//   template: `
//     <section class="login-history-card" aria-labelledby="login-history-heading">
//       <header>
//         <div>
//           <p class="history-kicker">ACCOUNT SECURITY</p>
//           <h2 id="login-history-heading">Login history</h2>
//           <p>Recent successful and unsuccessful attempts for known accounts.</p>
//         </div>
//         <button type="button" [disabled]="loading()" (click)="load()">Refresh</button>
//       </header>

//       @if (error()) {
//         <p class="history-error" role="alert">{{ error() }}</p>
//       } @else if (loading() && !entries().length) {
//         <p class="history-empty" role="status">Loading login history…</p>
//       } @else if (!entries().length) {
//         <p class="history-empty">No login attempts have been recorded yet.</p>
//       } @else {
//         <div class="history-table-wrap">
//           <table>
//             <thead>
//               <tr><th scope="col">Account</th><th scope="col">Result</th><th scope="col">Time (UTC)</th></tr>
//             </thead>
//             <tbody>
//               @for (entry of entries(); track entry.loginHistoryId) {
//                 <tr>
//                   <td><strong>{{ entry.displayName }}</strong><small>{{ entry.email }}</small></td>
//                   <td><span class="history-result" [class.login-success]="entry.succeeded" [class.login-failure]="!entry.succeeded">{{ entry.succeeded ? 'Successful' : 'Failed' }}</span></td>
//                   <td><time>{{ entry.attemptedAtUtc | date: 'MMM d, y · h:mm:ss a' : 'UTC' }}</time></td>
//                 </tr>
//               }
//             </tbody>
//           </table>
//         </div>
//       }
//     </section>
//   `,
//   styles: [`
//     .login-history-card { margin-top: 24px; border: 1px solid var(--line, #35424e); border-radius: 14px; background: var(--surface, #17232e); padding: 22px; color: var(--ink, #edf2f7); }
//     header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
//     h2 { margin: 0; font-size: 19px; }
//     header p { margin: 7px 0 0; color: var(--muted, #99a9b5); font-size: 13px; }
//     .history-kicker { color: var(--muted, #99a9b5); font-size: 10px; font-weight: 750; letter-spacing: .12em; }
//     button { border: 1px solid var(--line, #35424e); border-radius: 8px; background: transparent; color: inherit; padding: 8px 12px; cursor: pointer; }
//     .history-table-wrap { overflow-x: auto; margin-top: 18px; }
//     table { width: 100%; border-collapse: collapse; text-align: left; }
//     th, td { border-bottom: 1px solid var(--line, #35424e); padding: 11px 8px; font-size: 13px; white-space: nowrap; }
//     th { color: var(--muted, #99a9b5); font-size: 11px; }
//     td small { display: block; margin-top: 4px; color: var(--muted, #99a9b5); }
//     .history-result { border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; }
//     .login-success { background: rgb(72 187 120 / 15%); color: #79dfa4; }
//     .login-failure { background: rgb(245 101 101 / 15%); color: #ff9a9a; }
//     .history-empty, .history-error { margin: 20px 0 0; color: var(--muted, #99a9b5); }
//     .history-error { color: #ff9a9a; }
//     @media (max-width: 560px) { .login-history-card { padding: 16px; } }
//   `],
// })
// export class AdminLoginHistoryComponent {
//   private readonly http = inject(HttpClient);
//   protected readonly entries = signal<LoginHistoryEntry[]>([]);
//   protected readonly loading = signal(false);
//   protected readonly error = signal<string | null>(null);

//   constructor() {
//     this.load();
//   }

//   protected load(): void {
//     this.loading.set(true);
//     this.error.set(null);
//     this.http.get<LoginHistoryEntry[]>('/api/admin/login-history?take=50').subscribe({
//       next: (entries) => {
//         this.entries.set(entries);
//         this.loading.set(false);
//       },
//       error: (error: unknown) => {
//         this.error.set(
//           error instanceof HttpErrorResponse && error.status === 403
//             ? 'Administrator access is required to view login history.'
//             : 'Login history could not be loaded.',
//         );
//         this.loading.set(false);
//       },
//     });
//   }
// }



import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
// ✅ Import the confirmation service
import { ConfirmationService } from './confirmation.service';

interface LoginHistoryEntry {
  loginHistoryId: string;
  userId: string;
  displayName: string;
  email: string;
  succeeded: boolean;
  attemptedAtUtc: string;
  ipAddress?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  deviceType?: string | null;
}

@Component({
  selector: 'app-admin-login-history',
  imports: [DatePipe],
  template: `
    <section class="login-history-card" aria-labelledby="login-history-heading">
      <header>
        <div>
          <p class="history-kicker">ACCOUNT SECURITY</p>
          <h2 id="login-history-heading">Login history</h2>
          <p>{{ showAll() ? 'Complete audit log (paginated)' : 'Today\'s sign-in attempts only' }}</p>
        </div>
        
        <div class="header-actions">
          @if (selectedIds().length > 0) {
            <button type="button" class="btn-danger" (click)="deleteSelected()" [disabled]="deleting()">
              {{ deleting() ? 'Deleting...' : 'Delete (' + selectedIds().length + ')' }}
            </button>
          }
          
          <button type="button" class="btn-secondary" (click)="toggleView()">
            {{ showAll() ? 'Show Today Only' : 'Show All History' }}
          </button>
          
          <button type="button" class="btn-secondary" [disabled]="loading()" (click)="load()">Refresh</button>
        </div>
      </header>

      <input class="history-search" type="search" placeholder="Search by name, email, IP or browser"
             aria-label="Search login history" [value]="query()" (input)="onQuery($event)" />

      @if (error()) {
        <p class="history-error" role="alert">{{ error() }}</p>
      } @else if (loading() && !entries().length) {
        <p class="history-empty" role="status">Loading login history…</p>
      } @else if (!visible().length) {
        <p class="history-empty">{{ entries().length ? 'No sign-ins match your search.' : 'No login attempts have been recorded yet.' }}</p>
      } @else {
        <div class="history-table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()" />
                </th>
                <th>Account</th>
                <th>Result</th>
                <th>Device</th>
                <th>IP address</th>
                <th>Time (UTC)</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of visible(); track entry.loginHistoryId) {
                <tr>
                  <td>
                    <input type="checkbox" 
                           [checked]="selectedIds().includes(entry.loginHistoryId)" 
                           (change)="toggleSelection(entry.loginHistoryId)" />
                  </td>
                  <td><strong>{{ entry.displayName }}</strong><small>{{ entry.email }}</small></td>
                  <td>
                    <span class="badge" [class.badge-success]="entry.succeeded" [class.badge-danger]="!entry.succeeded">
                      {{ entry.succeeded ? 'Success' : 'Failed' }}
                    </span>
                  </td>
                  <td>{{ entry.browser || 'N/A' }} @if(entry.deviceType){<small>{{entry.deviceType}}</small>}</td>
                  <td>{{ entry.ipAddress || 'N/A' }}</td>
                  <td>{{ entry.attemptedAtUtc | date:'short' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (showAll() && totalCount() > take()) {
          <div class="pagination-controls">
            <button [disabled]="skip() === 0" (click)="prevPage()">Previous</button>
            <span>Showing {{ skip() + 1 }}-{{ Math.min(skip() + take(), totalCount()) }} of {{ totalCount() }}</span>
            <button [disabled]="skip() + take() >= totalCount()" (click)="nextPage()">Next</button>
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .login-history-card { margin-top: 24px; border: 1px solid var(--line, #35424e); border-radius: 14px; background: var(--surface, #17232e); padding: 22px; color: var(--ink, #edf2f7); }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    
    button { border: 1px solid var(--line, #35424e); border-radius: 8px; background: transparent; color: inherit; padding: 8px 12px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
    button:hover:not(:disabled) { background: rgba(255,255,255,0.05); border-color: #99a9b5; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-danger { background: rgba(245, 101, 101, 0.15); border-color: #ff9a9a; color: #ff9a9a; }
    .btn-danger:hover:not(:disabled) { background: rgba(245, 101, 101, 0.25); }
    
    h2 { margin: 0; font-size: 19px; }
    header p { margin: 7px 0 0; color: var(--muted, #99a9b5); font-size: 13px; }
    .history-kicker { color: var(--muted, #99a9b5); font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
    
    .history-search { width: 100%; max-width: 360px; margin-top: 16px; padding: 8px 12px; border: 1px solid var(--line, #35424e); border-radius: 8px; background: var(--surface-subtle, #1f2d3a); color: inherit; font: inherit; font-size: 13px; }
    .history-table-wrap { overflow-x: auto; margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { border-bottom: 1px solid var(--line, #35424e); padding: 11px 8px; font-size: 13px; white-space: nowrap; }
    th { color: var(--muted, #99a9b5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td small { display: block; margin-top: 4px; color: var(--muted, #99a9b5); font-size: 11px; }
    
    .badge { border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; }
    .badge-success { background: rgb(72 187 120 / 15%); color: #79dfa4; }
    .badge-danger { background: rgb(245 101 101 / 15%); color: #ff9a9a; }
    
    .history-empty, .history-error { margin: 20px 0 0; color: var(--muted, #99a9b5); }
    .history-error { color: #ff9a9a; }
    
    .pagination-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; color: var(--muted, #99a9b5); font-size: 13px; }
    input[type="checkbox"] { accent-color: #3b82f6; width: 16px; height: 16px; cursor: pointer; }
    
    @media (max-width: 560px) { 
      .login-history-card { padding: 16px; } 
      header { flex-direction: column; } 
      .header-actions { width: 100%; justify-content: flex-start; }
    }
  `],
})
export class AdminLoginHistoryComponent {
  private readonly http = inject(HttpClient);
  // ✅ Inject the confirmation service
  private readonly confirmDialog = inject(ConfirmationService);
  
  protected readonly entries = signal<LoginHistoryEntry[]>([]);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly showAll = signal(false);
  protected readonly deleting = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly skip = signal(0);
  protected readonly take = signal(50);
  protected readonly totalCount = signal(0);
  protected readonly Math = Math; 

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.entries();
    return this.entries().filter((e) =>
      `${e.displayName} ${e.email} ${e.ipAddress ?? ''} ${e.browser ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  });

  protected readonly isAllSelected = computed(() => 
    this.visible().length > 0 && this.selectedIds().length === this.visible().length
  );

  constructor() { this.load(); }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggleView(): void {
    this.showAll.update(v => !v);
    this.skip.set(0);
    this.selectedIds.set([]);
    this.query.set('');
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    
    const url = this.showAll() 
      ? `/api/admin/login-history/all?skip=${this.skip()}&take=${this.take()}`
      : '/api/admin/login-history?take=100';
      
    this.http.get<any>(url).subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response.items || []);
        this.entries.set(data);
        this.totalCount.set(Array.isArray(response) ? data.length : (response.totalCount || data.length));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(error instanceof HttpErrorResponse && error.status === 403
            ? 'Administrator access required.' : 'Could not load history.');
        this.loading.set(false);
      },
    });
  }

  protected toggleSelection(id: string): void {
    const current = this.selectedIds();
    this.selectedIds.set(current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
  }

  protected toggleSelectAll(): void {
    this.selectedIds.set(this.isAllSelected() ? [] : this.visible().map(e => e.loginHistoryId));
  }

  // ✅ UPDATED: Uses custom confirmation dialog instead of native confirm()
  protected async deleteSelected(): Promise<void> {
    const count = this.selectedIds().length;
    if (count === 0) return;

    // Show custom confirmation dialog
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete login records?',
      message: `You are about to permanently remove ${count} login history record${count > 1 ? 's' : ''}. This action cannot be undone and will affect security auditing.`,
      confirmLabel: 'Delete Records'
    });

    if (!confirmed) return;

    // Execute deletion only if user confirmed
    this.deleting.set(true);
    this.http.post('/api/admin/login-history/delete', this.selectedIds()).subscribe({
      next: () => {
        this.selectedIds.set([]);
        this.load();
        this.deleting.set(false);
      },
      error: () => {
        this.error.set('Failed to delete records. Please try again.');
        this.deleting.set(false);
      }
    });
  }

  protected prevPage(): void { this.skip.update(s => Math.max(0, s - this.take())); this.load(); }
  protected nextPage(): void { this.skip.update(s => s + this.take()); this.load(); }
}