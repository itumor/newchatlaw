import Cookies from 'js-cookie';
import { atomWithLocalStorage } from './utils';

const supportedLanguages = new Set(['en-US', 'ar-EG']);
const defaultLanguage = 'en-US';

const normalizeLanguage = (value?: string | null) => {
  if (!value) {
    return defaultLanguage;
  }

  return supportedLanguages.has(value) ? value : defaultLanguage;
};

const defaultLang = () => {
  const cookieLang = Cookies.get('lang');
  const localLang = localStorage.getItem('lang');

  return normalizeLanguage(cookieLang || localLang);
};

const lang = atomWithLocalStorage('lang', defaultLang());

export default { lang };
