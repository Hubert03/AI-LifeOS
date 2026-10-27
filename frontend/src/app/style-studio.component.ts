import { Component, inject, signal } from '@angular/core';
import { StyleCreatorService } from './style-creator.service';

@Component({
  selector: 'app-style-studio',
  template: `
    <button class="icon-button" type="button" aria-label="Customize style" (click)="open.set(!open())">🎨</button>

    @if (open()) {
      <aside class="style-studio" aria-label="Style studio">
        <header><strong>Style studio</strong><button class="text-button" type="button" (click)="open.set(false)">Close</button></header>

        <label>Accent color</label>
        <div class="swatch-row">
          @for (c of swatches; track c) {
            <button type="button" class="swatch" [style.background]="c" [class.on]="sc.style().accent === c"
                    (click)="sc.update({ accent: c })" [attr.aria-label]="'Accent ' + c"></button>
          }
          <input type="color" [value]="sc.style().accent ?? '#a68aff'" (input)="onAccent($event)" aria-label="Custom accent" />
          <button type="button" class="text-button" (click)="sc.update({ accent: null })">Theme default</button>
        </div>

        <label>Corner roundness <span>{{ sc.style().radius }}px</span></label>
        <input type="range" min="0" max="24" [value]="sc.style().radius" (input)="onRadius($event)" />

        <label>Text size <span>{{ (sc.style().fontScale * 100).toFixed(0) }}%</span></label>
        <input type="range" min="0.9" max="1.25" step="0.05" [value]="sc.style().fontScale" (input)="onScale($event)" />

        <label>Card style</label>
        <div class="seg">
          @for (o of cards; track o) {
            <button type="button" [class.on]="sc.style().card === o" (click)="sc.update({ card: o })">{{ o }}</button>
          }
        </div>

        <label>Background</label>
        <div class="seg">
          @for (o of backgrounds; track o) {
            <button type="button" [class.on]="sc.style().background === o" (click)="sc.update({ background: o })">{{ o }}</button>
          }
        </div>

        <label>Font</label>
        <div class="seg">
          @for (o of fonts; track o) {
            <button type="button" [class.on]="sc.style().font === o" (click)="sc.update({ font: o })">{{ o }}</button>
          }
        </div>

        <div class="studio-actions">
          <button class="admin-load-more" type="button" (click)="surprise()">🎲 Surprise me</button>
          <button class="admin-load-more" type="button" (click)="sc.reset()">Reset</button>
        </div>

        <label>My presets <span>{{ sc.presets().length }} / 12</span></label>
        <div class="preset-save">
          <input type="text" maxlength="30" placeholder="Name this look" aria-label="Preset name"
                 [value]="presetName()" (input)="onPresetName($event)" />
          <button type="button" class="text-button" [disabled]="!presetName().trim()" (click)="savePreset()">Save</button>
        </div>
        @for (p of sc.presets(); track p.name) {
          <div class="preset-row">
            <button type="button" class="preset-apply" (click)="sc.applyPreset(p)">
              <span class="preset-dot" [style.background]="p.style.accent ?? 'var(--accent)'"></span>{{ p.name }}
            </button>
            <button type="button" class="text-button" [attr.aria-label]="'Delete ' + p.name" (click)="sc.deletePreset(p.name)">✕</button>
          </div>
        }

        <label>Share</label>
        <button type="button" class="admin-load-more" (click)="copyCode()">Copy my style code</button>
        <div class="preset-save">
          <input type="text" placeholder="Paste a style code" aria-label="Style code"
                 [value]="importText()" (input)="onImport($event)" />
          <button type="button" class="text-button" [disabled]="!importText().trim()" (click)="applyCode()">Apply</button>
        </div>

        @if (message()) { <small class="studio-msg" role="status">{{ message() }}</small> }
      </aside>
    }
  `,
})
export class StyleStudioComponent {
  protected readonly sc = inject(StyleCreatorService);
  protected readonly open = signal(false);
  protected readonly presetName = signal('');
  protected readonly importText = signal('');
  protected readonly message = signal('');

  protected readonly swatches = ['#a68aff', '#54c6bb', '#6ea8ff', '#f08fb0', '#edce77', '#ff8a5b'];
  protected readonly cards = ['theme', 'flat', 'glass', 'outlined'] as const;
  protected readonly backgrounds = ['theme', 'solid', 'gradient', 'mesh'] as const;
  protected readonly fonts = ['system', 'rounded', 'serif', 'mono'] as const;

  protected onAccent(e: Event): void {
    this.sc.update({ accent: (e.target as HTMLInputElement).value });
  }
  protected onRadius(e: Event): void {
    this.sc.update({ radius: +(e.target as HTMLInputElement).value });
  }
  protected onScale(e: Event): void {
    this.sc.update({ fontScale: +(e.target as HTMLInputElement).value });
  }
  protected onPresetName(e: Event): void {
    this.presetName.set((e.target as HTMLInputElement).value);
  }
  protected onImport(e: Event): void {
    this.importText.set((e.target as HTMLInputElement).value);
  }

  protected savePreset(): void {
    this.sc.savePreset(this.presetName());
    this.presetName.set('');
    this.flash('Preset saved.');
  }

  protected async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.sc.exportCode());
      this.flash('Style code copied.');
    } catch {
      this.flash('Could not copy. Your browser blocked clipboard access.');
    }
  }

  protected applyCode(): void {
    const ok = this.sc.importCode(this.importText());
    if (ok) this.importText.set('');
    this.flash(ok ? 'Style applied.' : 'That code is not valid.');
  }

  protected surprise(): void {
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
    this.sc.update({
      accent: pick(this.swatches),
      radius: Math.floor(Math.random() * 25),
      card: pick(this.cards),
      background: pick(this.backgrounds),
      font: pick(this.fonts),
    });
  }

  private flash(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message.set(''), 2500);
  }
}

// import { Component, inject, signal } from '@angular/core';
// import { StyleCreatorService } from './style-creator.service';

// @Component({
//   selector: 'app-style-studio',
//   template: `
//     <button class="icon-button" type="button" aria-label="Customize style" (click)="open.set(!open())">🎨</button>

//     @if (open()) {
//       <aside class="style-studio" aria-label="Style studio">
//         <header><strong>Style studio</strong><button class="text-button" type="button" (click)="open.set(false)">Close</button></header>

//         <label>Accent color</label>
//         <div class="swatch-row">
//           @for (c of swatches; track c) {
//             <button type="button" class="swatch" [style.background]="c" [class.on]="sc.style().accent === c"
//                     (click)="sc.update({ accent: c })" [attr.aria-label]="'Accent ' + c"></button>
//           }
//           <input type="color" [value]="sc.style().accent ?? '#a68aff'" (input)="onAccent($event)" aria-label="Custom accent" />
//           <button type="button" class="text-button" (click)="sc.update({ accent: null })">Theme default</button>
//         </div>

//         <label>Corner roundness <span>{{ sc.style().radius }}px</span></label>
//         <input type="range" min="0" max="24" [value]="sc.style().radius" (input)="onRadius($event)" />

//         <label>Text size <span>{{ (sc.style().fontScale * 100).toFixed(0) }}%</span></label>
//         <input type="range" min="0.9" max="1.25" step="0.05" [value]="sc.style().fontScale" (input)="onScale($event)" />

//         <label>Card style</label>
//         <div class="seg">
//           @for (o of cards; track o) {
//             <button type="button" [class.on]="sc.style().card === o" (click)="sc.update({ card: o })">{{ o }}</button>
//           }
//         </div>

//         <label>Background</label>
//         <div class="seg">
//           @for (o of backgrounds; track o) {
//             <button type="button" [class.on]="sc.style().background === o" (click)="sc.update({ background: o })">{{ o }}</button>
//           }
//         </div>

//         <label>Font</label>
//         <div class="seg">
//           @for (o of fonts; track o) {
//             <button type="button" [class.on]="sc.style().font === o" (click)="sc.update({ font: o })">{{ o }}</button>
//           }
//         </div>

//         <button class="admin-load-more" type="button" (click)="sc.reset()">Reset to default</button>
//       </aside>
//     }
//   `,
// })
// export class StyleStudioComponent {
//   protected readonly sc = inject(StyleCreatorService);
//   protected readonly open = signal(false);

// protected readonly cards = ['theme', 'flat', 'glass', 'outlined'] as const;
// protected readonly backgrounds = ['theme', 'solid', 'gradient', 'mesh'] as const;

//   protected readonly swatches = ['#a68aff', '#54c6bb', '#6ea8ff', '#f08fb0', '#edce77', '#ff8a5b'];
// //   protected readonly cards = ['flat', 'glass', 'outlined'] as const;
// //   protected readonly backgrounds = ['solid', 'gradient', 'mesh'] as const;
//   protected readonly fonts = ['system', 'rounded', 'serif', 'mono'] as const;

//   protected onAccent(e: Event): void {
//     this.sc.update({ accent: (e.target as HTMLInputElement).value });
//   }
//   protected onRadius(e: Event): void {
//     this.sc.update({ radius: +(e.target as HTMLInputElement).value });
//   }
//   protected onScale(e: Event): void {
//     this.sc.update({ fontScale: +(e.target as HTMLInputElement).value });
//   }
// }