import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '../types/spot';
import { authAPI } from '../api/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  initialize: () => void;
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
          const { user, token } = response.data;
          
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
          const { user, token } = response.data;
          
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
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      initialize: () => {
        const token = localStorage.getItem('auth_token');
        const { user, isAuthenticated } = get();
        
        // If we have a token but no user data, try to restore from localStorage
        if (token && !user) {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.state && parsed.state.user && parsed.state.token) {
                set({
                  user: parsed.state.user,
                  token: parsed.state.token,
                  isAuthenticated: true,
                });
              }
            } catch (error) {
              console.error('Failed to restore auth state:', error);
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth-storage');
            }
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