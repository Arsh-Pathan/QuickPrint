'use client';

/**
 * Best-effort browser/OS notification + soft chime. Silently no-ops on
 * platforms that don't support them or when permission is denied. Designed
 * so the student gets pinged when the print is ready even with the tab
 * backgrounded, without breaking the page if the API is unavailable.
 */

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function sendBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: tag ?? 'quickprint',
      icon: '/logo.svg',
      silent: false,
    });
  } catch {
    // older browsers throw on construct — ignore
  }
}

/**
 * Two-tone chime via Web Audio. ~250ms, no asset needed. Tone style
 * intentionally soft so it doesn't startle in a quiet shop.
 */
export function playChime(kind: 'success' | 'alert' = 'success') {
  if (typeof window === 'undefined') return;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AC) return;
  try {
    const ctx = new AC();
    const now = ctx.currentTime;
    const tones = kind === 'success' ? [880, 1320] : [660, 440];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.14 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 600);
  } catch {
    // ignore — autoplay policies etc.
  }
}
