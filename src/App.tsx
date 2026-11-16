import React from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { AccountPage } from './components/AccountPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutPage } from './components/CheckoutPage';
import { BlogPage, BrandsPage, ContactPage, InfoPolicyPage } from './components/ContentPages';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { OrderConfirmationPage } from './components/OrderConfirmationPage';
import { OrderTrackingPage } from './components/OrderTrackingPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ShopPage } from './components/ShopPage';
import { StoreProvider, useStore } from './context/StoreContext';

function ToastContainer() {
  const { toasts } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#050B18] text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-2.5 text-xs sm:text-sm font-medium"
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
          ) : t.type === 'error' ? (
            <XCircle className="w-4 h-4 text-[#F87171] shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#60A5FA] shrink-0" />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

function AppRouter() {
  const { route } = useStore();
  const path = route.split('?')[0];

  const renderPage = () => {
    if (path === '/' || path === '') return <HomePage />;
    if (path === '/shop') return <ShopPage presetMode="all" />;
    if (path === '/new-arrivals') return <ShopPage presetMode="new-arrivals" />;
    if (path === '/top-deals') return <ShopPage presetMode="top-deals" />;
    if (path.startsWith('/product/')) {
      const slug = decodeURIComponent(path.replace('/product/', ''));
      return <ProductDetailPage slugOrId={slug} />;
    }
    if (path === '/brands') return <BrandsPage />;
    if (path === '/blog') return <BlogPage />;
    if (path === '/contact') return <ContactPage />;
    if (path === '/checkout') return <CheckoutPage />;
    if (path === '/order-confirmation') return <OrderConfirmationPage />;
    if (path === '/track-order') return <OrderTrackingPage />;
    if (path === '/account') return <AccountPage />;
    if (path === '/admin') return <AdminDashboard />;
    if (
      ['/shipping', '/returns', '/faq', '/about', '/careers', '/privacy', '/terms'].includes(path)
    ) {
      return <InfoPolicyPage pageKey={path.slice(1)} />;
    }
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#101828]">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <CartDrawer />
      <AuthModal />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
