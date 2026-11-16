import React, { useMemo, useState } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { getEffectivePrice, useStore } from '../context/StoreContext';
import { StudioImage } from './StudioImage';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'New Arrivals', path: '/new-arrivals' },
  { label: 'Top Deals', path: '/top-deals' },
  { label: 'Brands', path: '/brands' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
];

export function Navbar() {
  const {
    route,
    navigate,
    cartCount,
    setCartOpen,
    user,
    setAuthModalOpen,
    products,
  } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPath = route.split('?')[0];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.category_name ?? '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, searchQuery]);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    navigate(path);
  };

  const handleAccountClick = () => {
    setMobileMenuOpen(false);
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/account');
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#EAECF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 -ml-2 text-[#101828] hover:bg-[#F5F7FB] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#155EEF]"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#050B18] whitespace-nowrap shrink-0"
          >
            Gizmo<span className="text-[#155EEF]">Hub</span>
          </a>
        </div>

        {/* Zone 2: Desktop Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#475467]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#155EEF] border-[#155EEF] font-semibold'
                    : 'border-transparent hover:text-[#101828] hover:border-[#D0D5DD]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Functional Utility Controls (Search, Account, Cart) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#344054] hover:text-[#101828] hover:bg-[#F5F7FB] transition-colors focus-visible:outline-2 focus-visible:outline-[#155EEF]"
            aria-label="Search products"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={handleAccountClick}
            className="h-10 px-2.5 flex items-center gap-2 rounded-lg text-[#344054] hover:text-[#101828] hover:bg-[#F5F7FB] transition-colors focus-visible:outline-2 focus-visible:outline-[#155EEF]"
            aria-label={user ? 'Customer account' : 'Sign in'}
          >
            <User className="w-5 h-5 shrink-0" />
            {user && (
              <span className="hidden sm:inline text-xs font-medium text-[#101828] max-w-[100px] truncate">
                {user.full_name.split(' ')[0] || 'Account'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative h-10 px-3 flex items-center gap-2 rounded-lg bg-[#050B18] text-white hover:bg-[#155EEF] transition-colors focus-visible:outline-2 focus-visible:outline-[#155EEF] whitespace-nowrap shrink-0"
            aria-label={`Open shopping cart with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold tabular-nums">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Expandable Live Product Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#EAECF0] bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  handleNav(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headphones, watches, drones, chargers, brands..."
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#D0D5DD] text-sm text-[#101828] placeholder:text-[#667085] focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/15"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 rounded-lg bg-[#155EEF] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
              >
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-3 divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-lg overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleNav(`/product/${p.slug}`)}
                    className="w-full flex items-center justify-between gap-4 px-3.5 py-2.5 text-left hover:bg-[#F5F7FB] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-9 rounded bg-[#F5F7FB] overflow-hidden shrink-0">
                        <StudioImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#101828] truncate">{p.name}</p>
                        <p className="text-xs text-[#667085] truncate">
                          {p.brand} · {p.category_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#101828] tabular-nums shrink-0">
                      ${getEffectivePrice(p).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EAECF0] bg-white px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.path);
                }}
                className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EFF4FF] text-[#155EEF] font-semibold'
                    : 'text-[#344054] hover:bg-[#F5F7FB]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
          <div className="pt-3 mt-3 border-t border-[#EAECF0] flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNav('/track-order')}
              className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#344054] hover:bg-[#F5F7FB]"
            >
              Track Your Order
            </button>
            <button
              type="button"
              onClick={handleAccountClick}
              className="w-full text-left px-3 py-3 rounded-lg text-sm font-medium text-[#344054] hover:bg-[#F5F7FB]"
            >
              {user ? `Account (${user.full_name})` : 'Sign In / Create Account'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
