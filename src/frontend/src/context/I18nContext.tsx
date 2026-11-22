import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, TranslationDictionary } from '../i18n/types';
import { enUS } from '../i18n/locales/en-US';
import { ptBR } from '../i18n/locales/pt-BR';
import { esES } from '../i18n/locales/es-ES';

export interface LanguageOption {
  code: Locale;
  label: string;
  flag: string; // Emoji flag or SVG
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'es-ES', label: 'Español (ES)', flag: '🇪🇸' }
];

const dictionaries: Record<Locale, TranslationDictionary> = {
  'en-US': enUS,
  'pt-BR': ptBR,
  'es-ES': esES
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
  currentLanguage: LanguageOption;
}

const I18nContext = createContext<I18nContextType>({} as I18nContextType);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('csb_language') as Locale | null;
    if (saved && (saved === 'en-US' || saved === 'pt-BR' || saved === 'es-ES')) {
      return saved;
    }
    return 'en-US'; // Default is en-US per user request
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('csb_language', newLocale);
  };

  const currentLanguage =
    LANGUAGE_OPTIONS.find(l => l.code === locale) || LANGUAGE_OPTIONS[0];

  const t = (path: string, params?: Record<string, string | number>): string => {
    const parts = path.split('.');
    const dict = dictionaries[locale] || dictionaries['en-US'];

    let current: any = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to en-US if missing
        let fallback: any = dictionaries['en-US'];
        for (const p of parts) {
          if (fallback && typeof fallback === 'object' && p in fallback) {
            fallback = fallback[p];
          } else {
            return path; // Not found
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    if (params) {
      let result = current;
      for (const [key, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }
      return result;
    }

    return current;
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        languages: LANGUAGE_OPTIONS,
        currentLanguage
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
