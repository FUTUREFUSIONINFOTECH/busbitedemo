
import { useState, type ReactNode } from 'react';
import {
  Menu,
  RefreshCw,
  X,
  Bus,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

import { useLanguage } from '../i18n/indianLanguages';

export interface WebAppNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
}

interface DesktopBrowserFrameProps {
  title: string;
  subtitle?: string;
  brandName?: string;
  logoSrc?: string;
  navItems?: WebAppNavItem[];
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
  topBarSlot?: ReactNode;
  sidebarFooter?: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: ReactNode;
}

export function DesktopBrowserFrame({
  title,
  subtitle,
  brandName = 'BusBite',
  logoSrc = `${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`,
  navItems = [],
  activeNavId = '',
  onSelectNav,
  topBarSlot,
  sidebarFooter,
  onRefresh,
  isRefreshing = false,
  children,
}: DesktopBrowserFrameProps) {
  const { tr } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Show sidebar only when navigation items are supplied.
  const hasNavigation = navItems.length > 0;

  const activeItem = navItems.find(
    (item) => item.id === activeNavId
  );

  const handleNavigation = (id: string) => {
    onSelectNav?.(id);
    setMobileMenuOpen(false);
  };

  const renderNavigation = () => (
    <nav
      aria-label="Admin navigation"
      className="flex-1 overflow-y-auto px-3 py-5"
    >
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">
        {tr('Workspace')}
      </p>

      <div className="space-y-1.5">
        {navItems.map((item) => {
          const active = item.id === activeNavId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigation(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`
                group flex w-full items-center justify-between gap-3
                rounded-xl px-3.5 py-3 text-left text-[13px]
                font-semibold transition-all duration-200
                ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-lg transition-colors
                    ${
                      active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-50 text-slate-400 group-hover:bg-white'
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span className="truncate">
                  {tr(item.label)}
                </span>
              </span>

              {typeof item.count === 'number' && (
                <span
                  className={`
                    rounded-full px-2 py-0.5 text-[10px] font-bold
                    ${
                      active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }
                  `}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* BRAND */}
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <div className="flex min-w-0 items-center gap-3">
          {!logoError ? (
            <img
              src={logoSrc}
              alt={brandName}
              onError={() => setLogoError(true)}
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 bg-white object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white">
              <Bus size={21} />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
              {brandName}
            </h2>

            <p className="text-[9px] font-bold uppercase tracking-[1.6px] text-emerald-700">
              Admin Console
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* NAVIGATION */}
      {renderNavigation()}

      {/* SIDEBAR FOOTER */}
      {sidebarFooter && (
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-4">
          {sidebarFooter}
        </div>
      )}

      {/* COPYRIGHT */}
      <div className="shrink-0 border-t border-slate-100 px-5 py-3">
        <p className="text-[10px] font-medium text-slate-400">
          © {new Date().getFullYear()} {brandName}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#EDF2EF] p-2 text-slate-900 sm:p-3 lg:p-4">
      <div
        className="
          flex min-h-[calc(100vh-16px)] w-full
          overflow-hidden rounded-xl border border-slate-200
          bg-white shadow-[0_8px_35px_rgba(15,23,42,0.08)]
          sm:min-h-[calc(100vh-24px)] sm:rounded-2xl
          lg:min-h-[calc(100vh-32px)]
        "
      >
        {/* DESKTOP SIDEBAR */}
        {hasNavigation && (
          <aside className="hidden h-auto w-[255px] shrink-0 flex-col border-r border-slate-200 lg:flex">
            {sidebarContent}
          </aside>
        )}

        {/* MOBILE SIDEBAR DRAWER */}
        {hasNavigation && mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            />

            <aside className="relative z-10 h-full w-[280px] max-w-[85vw] shadow-2xl">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* MAIN APPLICATION */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F8FAF9]">
          {/* TOP HEADER */}
          <header
            className="
              sticky top-0 z-30 flex h-[76px] shrink-0
              items-center justify-between gap-3
              border-b border-slate-200 bg-white/95
              px-4 backdrop-blur-xl sm:px-6 lg:px-8
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              {hasNavigation && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation"
                  className="
                    flex h-10 w-10 shrink-0 items-center justify-center
                    rounded-xl border border-slate-200 bg-white
                    text-slate-600 hover:bg-slate-50 lg:hidden
                  "
                >
                  <Menu size={19} />
                </button>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <LayoutDashboard size={13} />

                  <span className="truncate">
                    {brandName}
                  </span>

                  <ChevronRight size={12} />

                  <span className="truncate text-emerald-700">
                    {activeItem ? tr(activeItem.label) : tr(title)}
                  </span>
                </div>

                <h1 className="mt-1 truncate text-base font-bold text-slate-900 sm:text-lg">
                  {tr(title)}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {topBarSlot}

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  aria-label={tr('Reload workspace')}
                  title={tr('Reload workspace')}
                  className="
                    flex h-10 w-10 items-center justify-center
                    rounded-xl border border-slate-200 bg-white
                    text-slate-500 transition
                    hover:border-emerald-200 hover:bg-emerald-50
                    hover:text-emerald-700 disabled:opacity-50
                  "
                >
                  <RefreshCw
                    size={17}
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                </button>
              )}
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1550px]">
              {subtitle && (
                <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-500">
                  {tr(subtitle)}
                </p>
              )}

              <section className="min-w-0 w-full">
                {children}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
