import { Wrench, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import LanguageToggle from './LanguageToggle';

interface HeaderProps {
  view: 'resident' | 'admin';
  onNavigate: (view: 'resident' | 'admin') => void;
}

export function Header({ view, onNavigate }: HeaderProps) {
  const { t, lang } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-400 text-white shadow-sm">
              <Wrench size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={`text-base font-bold leading-tight text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
                {t('appTitle')}
              </h1>
              <p className={`text-[11px] leading-tight text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="flex rounded-full border border-neutral-200 bg-neutral-50 p-0.5">
              <button
                onClick={() => onNavigate('resident')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  view === 'resident'
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {t('residentLink')}
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  view === 'admin'
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Shield size={12} />
                {t('adminLink')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
