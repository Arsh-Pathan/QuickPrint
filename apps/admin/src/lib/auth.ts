import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  hydrated: boolean;
  setSession: (s: { token: string; userId: string }) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      hydrated: false,
      setSession: ({ token, userId }) => set({ token, userId }),
      logout: () => set({ token: null, userId: null }),
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
