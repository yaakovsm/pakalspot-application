import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { List, User, Heart, ListChecks, Mail, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_EMAIL } from '../../utils/authUser';

function getInitials(username: string) {
  return username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const MobileNavMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isAdmin = Boolean(
    user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full shadow-soft"
          aria-label={t('mobile.more')}
        >
          <List className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {isAuthenticated && user && (
          <>
            <div className="px-3 py-2">
              <p className="font-medium text-foreground truncate">
                {user.username}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
          {t('navbar.home')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer gap-2">
          <Heart className="h-4 w-4" />
          {t('navbar.favorites')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/about')} className="cursor-pointer">
          {t('navbar.about')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/contact')} className="cursor-pointer">
          {t('navbar.contact')}
        </DropdownMenuItem>

        {isAuthenticated && (
          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer gap-2">
            <User className="h-4 w-4" />
            {t('navbar.profile')}
          </DropdownMenuItem>
        )}

        {isAuthenticated && isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin/pending-spots')} className="cursor-pointer gap-2">
            <ListChecks className="h-4 w-4" />
            {t('navbar.moderation')}
          </DropdownMenuItem>
        )}
        {isAuthenticated && isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin/contact')} className="cursor-pointer gap-2">
            <Mail className="h-4 w-4" />
            {t('contact.admin_title')}
          </DropdownMenuItem>
        )}

        {isAuthenticated && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="cursor-pointer gap-2 text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MobileNavMenu;
