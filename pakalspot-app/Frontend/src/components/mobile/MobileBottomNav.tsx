import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Map, Heart, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

function getInitials(username: string) {
  return username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const linkBase =
  'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 text-muted-foreground transition-colors';
const activeClass = '!text-primary';

const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 lg:hidden shadow-[0_-4px_24px_-8px_hsl(var(--primary)/0.12)]"
      aria-label={t('mobile.explore')}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ''}`}
        >
          <Search className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            {t('mobile.explore')}
          </span>
        </NavLink>
        <NavLink
          to="/map"
          className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ''}`}
        >
          <Map className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            {t('mobile.map')}
          </span>
        </NavLink>
        <NavLink
          to="/favorites"
          className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ''}`}
        >
          <Heart className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            {t('mobile.tab_favorites')}
          </span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ''}`}
        >
          {isAuthenticated && user ? (
            <Avatar className="h-6 w-6 shrink-0 border border-border">
              <AvatarImage src={user.avatar} alt="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          )}
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            {t('mobile.tab_profile')}
          </span>
        </NavLink>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
