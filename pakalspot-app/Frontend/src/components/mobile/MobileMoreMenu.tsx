import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, MapPin, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { useSpots } from '../../hooks/useSpots';
import { useAuthModal } from '../AuthModalProvider';
import { changeLanguage } from '../../i18n';
import { ADMIN_EMAIL } from '../../utils/authUser';

const MobileMoreMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'he';
  const isHe = lang.startsWith('he');
  const isEn = lang.startsWith('en');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { setUserLocation } = useSpots();
  const [theme, setTheme] = React.useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const isAdmin = Boolean(
    user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL
  );

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setTheme(isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const handleLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => console.warn('Could not get user location:', err)
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full shadow-soft" aria-label={t('mobile.more')}>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => navigate('/contact')} className="cursor-pointer">
          {t('navbar.contact')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/about')} className="cursor-pointer">
          {t('mobile.about')}
        </DropdownMenuItem>
        {isAuthenticated && isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin/pending-spots')} className="cursor-pointer">
            {t('navbar.moderation')}
          </DropdownMenuItem>
        )}
        {isAuthenticated && isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin/contact')} className="cursor-pointer">
            {t('contact.admin_title')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer gap-2">
            <Languages className="h-4 w-4" />
            {t('app.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              className={`cursor-pointer ${isHe ? 'bg-accent' : ''}`}
              onSelect={() => void changeLanguage('he')}
            >
              {t('app.hebrew')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`cursor-pointer ${isEn ? 'bg-accent' : ''}`}
              onSelect={() => void changeLanguage('en')}
            >
              {t('app.english')}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={handleLocation} className="cursor-pointer gap-2">
          <MapPin className="h-4 w-4" />
          {t('mobile.location')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? t('mobile.light_mode') : t('mobile.dark_mode')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <DropdownMenuItem
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="cursor-pointer text-destructive"
          >
            {t('auth.logout')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => openAuthModal('login')} className="cursor-pointer">
            {t('auth.login')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MobileMoreMenu;
