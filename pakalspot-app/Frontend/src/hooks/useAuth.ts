import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '../types/spot';
import { authAPI } from '../api/api';
import { normalizeAuthUser } from '../utils/authUser';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  /** Restore token + refresh user from GET /auth/me when possible */
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (data: LoginRequest) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.login(data);
          const { user: rawUser, token } = response.data;
          const user = normalizeAuthUser(rawUser);
          
          // Store token in localStorage for API interceptor
          localStorage.setItem('auth_token', token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.register(data);
          const { user: rawUser, token } = response.data;
          const user = normalizeAuthUser(rawUser);
          
          // Store token in localStorage for API interceptor
          localStorage.setItem('auth_token', token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear token from localStorage
        localStorage.removeItem('auth_token');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      initialize: async () => {
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.token) {
              localStorage.setItem('auth_token', parsed.state.token);
            }
          }
        } catch (error) {
          console.error('Failed to restore auth token:', error);
        }

        const t =
          typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!t) return;

        try {
          const response = await authAPI.getProfile();
          const normalized = normalizeAuthUser(response.data);
          if (normalized) {
            set({ user: normalized, token: t, isAuthenticated: true });
          }
        } catch {
          try {
            const stored = localStorage.getItem('auth-storage');
            if (stored) {
              const u = JSON.parse(stored)?.state?.user;
              if (u) set({ user: normalizeAuthUser(u), isAuthenticated: true });
            }
          } catch {
            /* ignore */
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useAuth = () => {
  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    initialize,
  } = useAuthStore();

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    initialize,
  };
};