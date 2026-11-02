import { TestBed } from '@angular/core/testing';
import { StyleStudioComponent } from './style-studio.component';
import { ThemePickerComponent } from './theme-picker.component';

describe('shared popup controls', () => {
  beforeEach(() => {
    localStorage.removeItem('ai-lifeos-theme');
    localStorage.removeItem('ai-lifeos-custom-style');
    TestBed.configureTestingModule({
      imports: [StyleStudioComponent, ThemePickerComponent],
    });
  });

  it('closes the theme picker when the style studio opens', () => {
    const themeFixture = TestBed.createComponent(ThemePickerComponent);
    const styleFixture = TestBed.createComponent(StyleStudioComponent);
    themeFixture.detectChanges();
    styleFixture.detectChanges();

    (themeFixture.nativeElement.querySelector('.theme-picker-trigger') as HTMLButtonElement).click();
    themeFixture.detectChanges();
    expect(themeFixture.nativeElement.querySelector('.theme-picker-panel')).toBeTruthy();

    (styleFixture.nativeElement.querySelector('.style-studio-trigger') as HTMLButtonElement).click();
    themeFixture.detectChanges();
    styleFixture.detectChanges();

    expect(themeFixture.nativeElement.querySelector('.theme-picker-panel')).toBeNull();
    expect(styleFixture.nativeElement.querySelector('.style-studio')).toBeTruthy();
    expect(styleFixture.nativeElement.textContent).toContain('🎲 Surprise me');
    expect(styleFixture.nativeElement.textContent).toContain('Copy my style code');

    themeFixture.destroy();
    styleFixture.destroy();
  });
});
