import { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function AdminLogin() {
  const { loginAdmin, t, lang } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAdmin(password)) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="animate-scale-in rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-white">
              <Shield size={26} />
            </div>
            <h2 className={`mt-4 text-lg font-bold text-neutral-800 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('adminLogin')}
            </h2>
            <p className={`mt-1 text-xs text-neutral-400 ${lang === 'th' ? 'font-thai' : ''}`}>
              {t('enterPassword')} (1234)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder={t('adminPassword')}
                autoFocus
                className={`w-full rounded-xl border bg-neutral-50 py-3 pl-10 pr-3 text-sm text-neutral-800 outline-none transition-all focus:bg-white focus:ring-2 ${
                  error
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-neutral-200 focus:border-neutral-400 focus:ring-neutral-100'
                }`}
              />
            </div>

            {error && (
              <p className={`text-xs font-medium text-red-500 ${lang === 'th' ? 'font-thai' : ''}`}>
                {t('wrongPassword')}
              </p>
            )}

            <button
              type="submit"
              className={`w-full rounded-xl bg-neutral-800 py-3 text-sm font-bold text-white transition-all hover:bg-neutral-700 active:scale-95 ${lang === 'th' ? 'font-thai' : ''}`}
            >
              {t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
