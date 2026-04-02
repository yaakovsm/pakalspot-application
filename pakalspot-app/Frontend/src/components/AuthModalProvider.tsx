import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

type AuthMode = 'login' | 'register';

interface AuthModalContextValue {
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return null;
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  return typeof response?.data?.message === 'string' ? response.data.message : null;
};

export const useAuthModal = (): AuthModalContextValue => {
  const value = useContext(AuthModalContext);
  if (!value) {
    throw new Error('useAuthModal must be used inside AuthModalProvider');
  }
  return value;
};

const AuthModal: React.FC<{
  open: boolean;
  mode: AuthMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AuthMode) => void;
}> = ({ open, mode, onOpenChange, onModeChange }) => {
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const resetState = useCallback(() => {
    setShowPassword(false);
    setLoginForm({ email: '', password: '' });
    setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
  }, []);

  const close = useCallback(() => {
    onOpenChange(false);
    resetState();
    onModeChange('login');
  }, [onModeChange, onOpenChange, resetState]);

  const switchMode = useCallback(
    (nextMode: AuthMode) => {
      setShowPassword(false);
      onModeChange(nextMode);
    },
    [onModeChange]
  );

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      toast({
        title: t('auth.validation_error'),
        description: t('auth.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await login(loginForm);
      toast({
        title: t('auth.welcome_back'),
        description: t('auth.account_created_successfully'),
      });
      close();
    } catch (error: unknown) {
      toast({
        title: t('auth.login_failed'),
        description: getErrorMessage(error) || t('auth.invalid_credentials'),
        variant: 'destructive',
      });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !registerForm.username ||
      !registerForm.email ||
      !registerForm.password ||
      !registerForm.confirmPassword
    ) {
      toast({
        title: t('auth.validation_error'),
        description: t('auth.fill_all_fields'),
        variant: 'destructive',
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: t('auth.password_mismatch'),
        description: t('auth.passwords_dont_match'),
        variant: 'destructive',
      });
      return;
    }

    if (registerForm.password.length < 6) {
      toast({
        title: t('auth.weak_password'),
        description: t('auth.password_min_length'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await register({
        display_name: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
      });
      toast({
        title: t('auth.welcome_to_pakalspot'),
        description: t('auth.account_created_successfully'),
      });
      close();
    } catch (error: unknown) {
      toast({
        title: t('auth.registration_failed'),
        description: getErrorMessage(error) || t('auth.something_went_wrong'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? onOpenChange(true) : close())}>
      <DialogContent
        className="w-[95vw] max-w-md border-0 bg-background/95 p-6 shadow-strong backdrop-blur-sm sm:rounded-2xl"
        overlayClassName="bg-transparent backdrop-blur-[3px]"
      >
        <DialogHeader className="space-y-1 text-center">
          <div className="mx-auto mb-1 flex items-center gap-2">
            <img src="/PakalSpot_Transperent_logo.png" alt="PakalSpot Logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold text-foreground">{t('app.name')}</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {mode === 'login' ? t('auth.welcome_back') : t('auth.create_account_title')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' ? t('auth.sign_in_to_continue') : t('auth.sign_up_to_start')}
          </DialogDescription>
        </DialogHeader>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t('auth.enter_email')}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t('auth.enter_password')}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.signing_in') : t('auth.sign_in')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.dont_have_account')}{' '}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => switchMode('register')}
              >
                {t('auth.signup')}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder={t('auth.choose_username')}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t('auth.enter_email')}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t('auth.create_password')}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('auth.confirm_password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder={t('auth.confirm_your_password')}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.creating_account') : t('auth.create_account')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('auth.already_have_account')}{' '}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => switchMode('login')}
              >
                {t('auth.login')}
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const openAuthModal = useCallback((nextMode: AuthMode = 'login') => {
    setMode(nextMode);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    setMode('login');
  }, []);

  const value = useMemo(
    () => ({
      openAuthModal,
      closeAuthModal,
    }),
    [closeAuthModal, openAuthModal]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: AuthMode }>;
      openAuthModal(custom.detail?.mode ?? 'login');
    };

    window.addEventListener('pakalspot:auth-required', handler);
    return () => window.removeEventListener('pakalspot:auth-required', handler);
  }, [openAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal open={open} mode={mode} onOpenChange={setOpen} onModeChange={setMode} />
    </AuthModalContext.Provider>
  );
};

