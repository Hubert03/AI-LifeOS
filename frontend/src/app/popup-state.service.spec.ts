import { PopupStateService } from './popup-state.service';

describe('PopupStateService', () => {
  let popups: PopupStateService;

  beforeEach(() => {
    popups = new PopupStateService();
  });

  it('closes the current popup when another popup is opened', () => {
    popups.toggle('theme-picker');
    expect(popups.isOpen('theme-picker')).toBe(true);

    popups.toggle('style-studio');
    expect(popups.isOpen('theme-picker')).toBe(false);
    expect(popups.isOpen('style-studio')).toBe(true);

    popups.toggle('profile-menu');
    expect(popups.isOpen('style-studio')).toBe(false);
    expect(popups.isOpen('profile-menu')).toBe(true);
  });

  it('closes the active popup when toggled again', () => {
    popups.toggle('profile-menu');
    popups.toggle('profile-menu');

    expect(popups.isOpen('profile-menu')).toBe(false);
  });
});
