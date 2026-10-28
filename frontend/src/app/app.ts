// import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
// import { ConfirmationDialogComponent } from './confirmation-dialog.component';
// import { CommandPaletteComponent } from './command-palette.component';

// @Component({
//   imports: [RouterOutlet, ConfirmationDialogComponent],
//   selector: 'app-root',
//   styleUrl: './app.css',
//   templateUrl: './app.html',
// })
// export class App {
// }
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteComponent } from './command-palette.component';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommandPaletteComponent,
    ConfirmationDialogComponent
  ],
  template: `
    <router-outlet />
    <app-command-palette />
    <app-confirmation-dialog />
  `
})
export class App {}