import React from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAuth } from '../hooks/useAuth';
import { useSpots } from '../hooks/useSpots';
import { User, LogOut, Heart, MapPin, Moon, Sun, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { ADMIN_EMAIL } from '../utils/authUser';
import { useAuthModal } from './AuthModalProvider';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { setUserLocation, userLocation } = useSpots();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isAdmin = Boolean(
    user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getInitials = (username: string) => {
    return username.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleLocationRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // You could show a toast notification here
        }
      );
    }
  };

  const [theme, setTheme] = React.useState<string>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setTheme(isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
      setTheme(saved);
    }
  }, []);

  return (
    <header className={`bg-background/80 backdrop-blur-md border-b border-border shadow-soft ${className}`}>
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer px-2 py-1" 
            onClick={() => navigate('/')}
          >
            <img 
              src="/PakalSpot_Transperent_logo.png" 
              alt="PakalSpot Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-foreground">{t('app.name')}</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {(() => {
              const currentLanguage = i18n.language || 'he';
              const isHebrew = currentLanguage === 'he';
              
              if (isHebrew) {
                // Hebrew order: About, Favorites, Home (RTL)
                return (
                  <>
                    <Button variant="ghost" onClick={() => navigate('/about')} className="text-lg font-medium">
                      {t('navbar.about')}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-lg font-medium">
                      {t('navbar.favorites')}
                    </Button>
                    {isAuthenticated && isAdmin && (
                      <Button variant="ghost" onClick={() => navigate('/admin/pending-spots')} className="text-lg font-medium">
                        {t('navbar.moderation')}
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-lg font-medium">
                      {t('navbar.home')}
                    </Button>
                  </>
                );
              } else {
                // English order: Home, Favorites, About (LTR)
                return (
                  <>
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-lg font-medium">
                      {t('navbar.home')}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/favorites')} className="text-lg font-medium">
                      {t('navbar.favorites')}
                    </Button>
                    {isAuthenticated && isAdmin && (
                      <Button variant="ghost" onClick={() => navigate('/admin/pending-spots')} className="text-lg font-medium">
                        {t('navbar.moderation')}
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => navigate('/about')} className="text-lg font-medium">
                      {t('navbar.about')}
                    </Button>
                  </>
                );
              }
            })()}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-6">
            {(() => {
              const currentLanguage = i18n.language || 'he';
              const isHebrew = currentLanguage === 'he';
              
              if (isHebrew) {
                // Hebrew order: Login/Register first, then Actions
                return (
                  <>
                    {isAuthenticated && user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} alt={user.username} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(user.username)}
                              </AvatarFallback>
                            </Avatar>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-popover border border-border shadow-medium" align="end">
                          <div className="flex items-center justify-start gap-2 p-2">
                            <div className="flex flex-col space-y-1 leading-none">
                              <p className="font-medium text-foreground">{user.username}</p>
                              <p className="w-[200px] truncate text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
                            <Heart className="h-4 w-4" />
                            <span>{t('navbar.favorites')}</span>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => navigate('/admin/pending-spots')} className="cursor-pointer">
                              <ListChecks className="h-4 w-4" />
                              <span>{t('navbar.moderation')}</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                            <User className="h-4 w-4" />
                            <span>{t('navbar.profile')}</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                            <LogOut className="h-4 w-4" />
                            <span>{t('auth.logout')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="hero" onClick={() => openAuthModal('login')} className="text-lg font-medium px-6 py-2">
                        {t('auth.login')}
                      </Button>
                    )}
                    {/* Language switcher */}
                    <LanguageSwitcher />
                    {/* Location button */}
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleLocationRequest}
                      aria-label="Get current location"
                      title={userLocation ? "Update location" : "Get current location"}
                      className="w-10 h-10"
                    >
                      <MapPin className="w-5 h-5" />
                    </Button>
                    {/* Theme toggle */}
                    <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="w-10 h-10">
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                  </>
                );
              } else {
                // English order: Actions first, then Login/Register
                return (
                  <>
                    {/* Language switcher */}
                    <LanguageSwitcher />
                    {/* Location button */}
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleLocationRequest}
                      aria-label="Get current location"
                      title={userLocation ? "Update location" : "Get current location"}
                      className="w-10 h-10"
                    >
                      <MapPin className="w-5 h-5" />
                    </Button>
                    {/* Theme toggle */}
                    <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="w-10 h-10">
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                    {isAuthenticated && user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} alt={user.username} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(user.username)}
                              </AvatarFallback>
                            </Avatar>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-popover border border-border shadow-medium" align="end">
                          <div className="flex items-center justify-start gap-2 p-2">
                            <div className="flex flex-col space-y-1 leading-none">
                              <p className="font-medium text-foreground">{user.username}</p>
                              <p className="w-[200px] truncate text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
                            <Heart className="h-4 w-4" />
                            <span>{t('navbar.favorites')}</span>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => navigate('/admin/pending-spots')} className="cursor-pointer">
                              <ListChecks className="h-4 w-4" />
                              <span>{t('navbar.moderation')}</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                            <User className="h-4 w-4" />
                            <span>{t('navbar.profile')}</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                            <LogOut className="h-4 w-4" />
                            <span>{t('auth.logout')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="hero" onClick={() => openAuthModal('login')} className="text-lg font-medium px-6 py-2">
                        {t('auth.login')}
                      </Button>
                    )}
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;