import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language);
  };

  const currentLanguage = i18n.language || 'he';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage === 'he' ? t('app.hebrew') : t('app.english')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('he')}
          className={currentLanguage === 'he' ? 'bg-accent' : ''}
        >
          <span className="ml-2">עברית</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={currentLanguage === 'en' ? 'bg-accent' : ''}
        >
          <span className="ml-2">English</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
