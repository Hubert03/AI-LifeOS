// import { Injectable, computed, effect, signal } from '@angular/core';

// export interface CustomStyle {
//   accent: string | null;
//   radius: number;
//   fontScale: number;
//   card: 'theme' | 'flat' | 'glass' | 'outlined';
//   background: 'theme' | 'solid' | 'gradient' | 'mesh';
//   font: 'system' | 'rounded' | 'serif' | 'mono';
// }

// const DEFAULTS: CustomStyle = {
//   accent: null, radius: 12, fontScale: 1,
//   card: 'theme', background: 'theme', font: 'system',
// };

// const KEY = 'ai-lifeos-custom-style';

// const FONTS: Record<CustomStyle['font'], string> = {
//   system: 'inherit',
//   rounded: '"Nunito", "Segoe UI", system-ui, sans-serif',
//   serif: 'Georgia, "Times New Roman", serif',
//   mono: '"JetBrains Mono", Consolas, monospace',
// };

// @Injectable({ providedIn: 'root' })
// export class StyleCreatorService {
//   readonly style = signal<CustomStyle>(this.load());

//   readonly cssVars = computed(() => {
//   const s = this.style();
//   const vars: Record<string, string> = {
//     '--radius': `${s.radius}px`,
//     '--font-scale': String(s.fontScale),
//   };
//   if (s.font !== 'system') vars['--app-font'] = FONTS[s.font];   // only set when chosen
//   if (s.accent) {
//     vars['--accent'] = s.accent;
//     vars['--accent-soft'] = `color-mix(in srgb, ${s.accent} 18%, transparent)`;
//   }
//   return vars;
// });

//   constructor() {
//     effect(() => {
//       try { localStorage.setItem(KEY, JSON.stringify(this.style())); } catch { /* ignore */ }
//     });
//   }

//   update(patch: Partial<CustomStyle>): void { this.style.update((s) => ({ ...s, ...patch })); }
//   reset(): void { this.style.set({ ...DEFAULTS }); }

//   private load(): CustomStyle {
//     try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; }
//     catch { return { ...DEFAULTS }; }
//   }
// }

import { Injectable, computed, effect, signal } from '@angular/core';

export interface CustomStyle {
  accent: string | null;
  radius: number;
  fontScale: number;
  card: 'theme' | 'flat' | 'glass' | 'outlined';
  background: 'theme' | 'solid' | 'gradient' | 'mesh';
  font: 'system' | 'rounded' | 'serif' | 'mono';
}

export interface StylePreset {
  name: string;
  style: CustomStyle;
}

const DEFAULTS: CustomStyle = {
  accent: null, radius: 12, fontScale: 1,
  card: 'theme', background: 'theme', font: 'system',
};

const KEY = 'ai-lifeos-custom-style';
const PRESETS_KEY = 'ai-lifeos-style-presets';
const MAX_PRESETS = 12;

const CARDS = ['theme', 'flat', 'glass', 'outlined'] as const;
const BACKGROUNDS = ['theme', 'solid', 'gradient', 'mesh'] as const;
const FONT_NAMES = ['system', 'rounded', 'serif', 'mono'] as const;

const FONTS: Record<CustomStyle['font'], string> = {
  system: 'inherit',
  rounded: '"Nunito", "Segoe UI", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", Consolas, monospace',
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Turns any unknown value into a safe CustomStyle. */
function sanitize(raw: unknown): CustomStyle {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    accent:
      typeof r['accent'] === 'string' && /^#[0-9a-f]{6}$/i.test(r['accent']) ? r['accent'] : null,
    radius: clamp(r['radius'], 0, 24, DEFAULTS.radius),
    fontScale: clamp(r['fontScale'], 0.9, 1.25, DEFAULTS.fontScale),
    card: CARDS.find((c) => c === r['card']) ?? DEFAULTS.card,
    background: BACKGROUNDS.find((b) => b === r['background']) ?? DEFAULTS.background,
    font: FONT_NAMES.find((f) => f === r['font']) ?? DEFAULTS.font,
  };
}

@Injectable({ providedIn: 'root' })
export class StyleCreatorService {
  readonly style = signal<CustomStyle>(this.loadStyle());
  readonly presets = signal<StylePreset[]>(this.loadPresets());

  readonly cssVars = computed(() => {
    const s = this.style();
    const vars: Record<string, string> = {
      '--radius': `${s.radius}px`,
      '--font-scale': String(s.fontScale),
    };
    if (s.font !== 'system') vars['--app-font'] = FONTS[s.font];
    if (s.accent) {
      vars['--accent'] = s.accent;
      vars['--accent-soft'] = `color-mix(in srgb, ${s.accent} 18%, transparent)`;
    }
    return vars;
  });

  constructor() {
    effect(() => this.save(KEY, this.style()));
    effect(() => this.save(PRESETS_KEY, this.presets()));
  }

  update(patch: Partial<CustomStyle>): void {
    this.style.update((s) => ({ ...s, ...patch }));
  }

  reset(): void {
    this.style.set({ ...DEFAULTS });
  }

  savePreset(name: string): void {
    const clean = name.trim().slice(0, 30);
    if (!clean) return;
    const preset: StylePreset = { name: clean, style: { ...this.style() } };
    this.presets.update((list) =>
      [preset, ...list.filter((p) => p.name.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        MAX_PRESETS,
      ),
    );
  }

  applyPreset(preset: StylePreset): void {
    this.style.set(sanitize(preset.style));
  }

  deletePreset(name: string): void {
    this.presets.update((list) => list.filter((p) => p.name !== name));
  }

  /** Short shareable code for the current style. */
  exportCode(): string {
    return btoa(JSON.stringify(this.style()));
  }

  /** Returns false when the code is not valid. */
  importCode(code: string): boolean {
    try {
      const parsed: unknown = JSON.parse(atob(code.trim()));
      if (typeof parsed !== 'object' || parsed === null) return false;
      this.style.set(sanitize(parsed));
      return true;
    } catch {
      return false;
    }
  }

  private loadStyle(): CustomStyle {
    try {
      return sanitize(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
    } catch {
      return { ...DEFAULTS };
    }
  }

  private loadPresets(): StylePreset[] {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((p) => p && typeof p.name === 'string')
        .slice(0, MAX_PRESETS)
        .map((p) => ({ name: String(p.name).slice(0, 30), style: sanitize(p.style) }));
    } catch {
      return [];
    }
  }

  private save(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }
}