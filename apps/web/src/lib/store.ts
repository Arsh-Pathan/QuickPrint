import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('qp_token', token);
        }
        set({ user, token });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('qp_token');
        }
        set({ user: null, token: null });
      },
    }),
    { name: 'qp_auth' },
  ),
);
