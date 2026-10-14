import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-theme');
    TestBed.configureTestingModule({});
  });

  it('applies the saved global theme and remembers changes', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');

    service.setTheme('ocean');

    expect(service.theme()).toBe('ocean');
    expect(service.isDarkTheme()).toBe(true);
    expect(localStorage.getItem('ai-lifeos-theme')).toBe('ocean');
    expect(document.documentElement.dataset['theme']).toBe('ocean');
  });

  it('toggles dark palettes to light and light back to midnight', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('forest');

    service.toggleTheme();
    expect(service.theme()).toBe('light');

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
  });
});
