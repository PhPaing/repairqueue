import { AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function YellowBanner() {
  const { t } = useApp();
  return (
    <div className="bg-primary-100 border-b border-primary-200 px-4 py-2.5">
      <div className="mx-auto flex max-w-2xl items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary-600" />
        <p className="text-xs leading-relaxed text-primary-800 font-thai">
          {t('bannerText')}
        </p>
      </div>
    </div>
  );
}
