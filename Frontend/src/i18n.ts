import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import heTranslations from './locales/he.json';
import enTranslations from './locales/en.json';

const resources = {
  he: {
    translation: heTranslations
  },
  en: {
    translation: enTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he', // Hebrew as default language
    lng: 'he', // Set Hebrew as initial language
    debug: false,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Configure RTL support
    react: {
      useSuspense: false,
    },
  });

// Function to get current language direction
export const getLanguageDirection = (language: string): 'rtl' | 'ltr' => {
  return language === 'he' ? 'rtl' : 'ltr';
};

// Function to set language and update document direction
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
  const direction = getLanguageDirection(language);
  document.documentElement.dir = direction;
  document.documentElement.lang = language;
  
  // Store in localStorage
  localStorage.setItem('i18nextLng', language);
};

// Initialize document direction on load
const currentLanguage = i18n.language || 'he';
const direction = getLanguageDirection(currentLanguage);
document.documentElement.dir = direction;
document.documentElement.lang = currentLanguage;

export default i18n;
