import { useApp } from '@/context/AppContext';

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="mt-8 border-t border-neutral-200 bg-neutral-50 px-4 py-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs leading-relaxed text-neutral-400">
          {t('footerText')}
        </p>
        <p className="mt-1 text-xs text-neutral-300">
          {t('builtWith')}
        </p>
      </div>
    </footer>
  );
}
