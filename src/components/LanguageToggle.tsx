import { Languages } from 'lucide-react';
import type { Language } from '@/types';
import { useApp } from '@/context/AppContext';

export function LanguageToggle() {
  const { lang, setLang } = useApp();

  const toggle = () => setLang(lang === 'th' ? 'en' : 'th');

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-primary-400 hover:bg-primary-50 active:scale-95"
      aria-label="Toggle language"
    >
      <Languages size={16} className="text-neutral-500" />
      <span className={lang === 'th' ? 'text-primary-600' : 'text-neutral-400'}>TH</span>
      <span className="text-neutral-300">/</span>
      <span className={lang === 'en' ? 'text-primary-600' : 'text-neutral-400'}>EN</span>
    </button>
  );
}

export function LanguageToggleSmall() {
  const { lang, setLang } = useApp();

  const toggle = () => setLang(lang === 'th' ? 'en' : 'th');

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-bold text-neutral-600 transition-colors hover:bg-primary-100 active:scale-95"
    >
      <span className={lang === 'th' ? 'text-primary-600' : 'text-neutral-400'}>TH</span>
      <span className="text-neutral-300">/</span>
      <span className={lang === 'en' ? 'text-primary-600' : 'text-neutral-400'}>EN</span>
    </button>
  );
}

export default LanguageToggle;
