import { Injectable } from '@angular/core';

export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  platform: string;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  touchSupport: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
}

@Injectable({ providedIn: 'root' })
export class DeviceFingerprintService {
  getFingerprint(): DeviceFingerprint {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
    };
  }
}