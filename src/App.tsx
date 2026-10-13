import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { YellowBanner } from '@/components/YellowBanner';
import { Footer } from '@/components/Footer';
import { LineNotificationToast } from '@/components/LineNotification';
import { ResidentView } from '@/components/ResidentView';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminPanel } from '@/components/AdminPanel';

type View = 'resident' | 'admin';

function AppContent() {
  const { isAdmin } = useApp();
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.slice(1);
    return hash === 'admin' ? 'admin' : 'resident';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      setView(hash === 'admin' ? 'admin' : 'resident');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (v: View) => {
    window.location.hash = v === 'admin' ? 'admin' : '';
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
