import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaperSize, type PaperSize as PaperSizeValue } from '@quickprint/shared';

interface User {
  id: string;
  phone: string | null;
  name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  patchUser: (patch: Partial<User>) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('qp_token', token); } catch { /* private browsing */ }
        }
        set({ user, token });
      },
      patchUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => {
        if (typeof window !== 'undefined') {
          try { window.localStorage.removeItem('qp_token'); } catch { /* private browsing */ }
        }
        set({ user: null, token: null });
      },
    }),
    { name: 'qp_auth' },
  ),
);

/**
 * Remembered print preferences. Survives reloads so a returning student
 * lands on the print-settings step with their last choices preselected.
 */
interface PrefsState {
  copies: number;
  color: boolean;
  duplex: boolean;
  paperSize: PaperSizeValue;
  notificationsAsked: boolean;
  set: (patch: Partial<Omit<PrefsState, 'set'>>) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      copies: 1,
      color: false,
      duplex: false,
      paperSize: PaperSize.A4,
      notificationsAsked: false,
      set: (patch) => set(patch),
    }),
    { name: 'qp_prefs' },
  ),
);
