import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { YellowBanner } from '@/components/YellowBanner';
import { Footer } from '@/components/Footer';
import { LineNotificationToast } from '@/components/LineNotification';
import { ToastHost } from '@/components/ToastHost';
import { ResidentView } from '@/components/ResidentView';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';

type View = 'resident' | 'admin';

/** Admin lives at /admin (the link used in LINE messages) and at /#admin (older links). */
const readView = (): View =>
  window.location.pathname.replace(/\/+$/, '') === '/admin' || window.location.hash.slice(1) === 'admin'
    ? 'admin'
    : 'resident';

function AppContent() {
  const { isAdmin } = useApp();
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const onChange = () => setView(readView());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  const navigate = (v: View) => {
    window.history.pushState(null, '', v === 'admin' ? '/#admin' : '/');
    setView(v);
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header view={view} onNavigate={navigate} />
      <YellowBanner />

      <main className="flex-1">
        {view === 'resident' ? (
          <ResidentView />
        ) : isAdmin ? (
          <AdminPanel />
        ) : (
          <AdminLogin />
        )}
      </main>

      <Footer />
      <LineNotificationToast />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
