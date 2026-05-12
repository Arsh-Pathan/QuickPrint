import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  hydrated: boolean;
  setSession: (s: { token: string; userId: string }) => void;
  logout: () => void;
  login: (password: string) => Promise<boolean>;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      hydrated: false,
      setSession: ({ token, userId }) => set({ token, userId }),
      logout: () => set({ token: null, userId: null }),
      login: async (password: string) => {
        try {
          const { api } = await import('./api');
          const res = await api.post<{ token: string; userId: string }>('/auth/admin/login', { password });
          get().setSession(res);
          return true;
        } catch (e) {
          console.error('Login failed:', e);
          return false;
        }
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'quickprint.admin.auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, userId: s.userId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
