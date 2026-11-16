import React from 'react';
import { Banknote, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { navigate, settings, user } = useStore();

  const link = (label: string, path: string) => (
    <li key={path + label}>
      <a
        href={path}
        onClick={(e) => {
          e.preventDefault();
          navigate(path);
        }}
        className="text-sm text-[#98A2B3] hover:text-white transition-colors"
      >
        {label}
      </a>
    </li>
  );

  return (
    <footer className="bg-[#050B18] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Summary */}
          <div className="lg:col-span-2 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
              className="font-display text-2xl font-bold tracking-tight text-white inline-block"
            >
              Gizmo<span className="text-[#2563EB]">Hub</span>
            </a>
            <p className="text-sm text-[#98A2B3] max-w-sm leading-relaxed">
              Modern technology gadgets, audio engineering, titanium wearables, and workspace accessories delivered directly to your door.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#D0D5DD]">
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-[#2563EB]" />
                Cash on Delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                Verified Local Zones
              </span>
            </div>
            <p className="text-xs text-[#98A2B3] pt-1">
              Support: {settings.support_email} · {settings.support_phone}
            </p>
          </div>

          {/* SHOP */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Shop
            </h3>
            <ul className="space-y-2.5">
              {link('All Products', '/shop')}
              {link('New Arrivals', '/new-arrivals')}
              {link('Top Deals', '/top-deals')}
              {link('Accessories', '/shop?category=power-solutions')}
            </ul>
          </div>

          {/* CUSTOMER SERVICE */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Customer Service
            </h3>
            <ul className="space-y-2.5">
              {link('Shipping Information', '/shipping')}
              {link('Returns & Refunds', '/returns')}
              {link('Track Your Order', '/track-order')}
              {link('FAQs', '/faq')}
              {link('Contact Us', '/contact')}
            </ul>
          </div>

          {/* COMPANY */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Company
            </h3>
            <ul className="space-y-2.5">
              {link('About Us', '/about')}
              {link('Our Blog', '/blog')}
              {link('Careers', '/careers')}
              {link('Privacy Policy', '/privacy')}
              {link('Terms of Service', '/terms')}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#98A2B3]">
          <p>© {new Date().getFullYear()} GizmoHub Electronics Retail. All rights reserved. Prices in USD.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              YouTube
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              X
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="text-[#667085] hover:text-white transition-colors"
            >
              {user?.role === 'admin' ? 'Admin Dashboard' : 'Admin Portal'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
