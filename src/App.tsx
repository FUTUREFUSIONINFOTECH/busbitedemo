import { useEffect, useState } from 'react';
import { Mail, Phone, QrCode } from 'lucide-react';
import { AppGuideTour, type TourSignal } from './components/AppGuideTour';
import { DemoShareModal } from './components/DemoShareModal';
import { DemoVideoPlayer } from './components/DemoVideoPlayer';
import { DemoVideoStudioModal } from './components/DemoVideoStudioModal';
import { usePlatformSocket } from './hooks/usePlatformSocket';
import { LanguageProvider, LanguageSelector, useLanguage } from './i18n/indianLanguages';
import { BusTravelsPortal } from './portals/BusTravelsPortal';
import { DriverPortal } from './portals/DriverPortal';
import { PassengerPortal } from './portals/PassengerPortal';
import { RestaurantPortal } from './portals/RestaurantPortal';
import { SuperAdminPortal } from './portals/SuperAdminPortal';
import type { PortalView } from './types/platform';

function readInitialUrlParams(): { view: PortalView; qr: string } {
  const params = new URLSearchParams(window.location.search);
  const rawView = params.get('view');
  const view: PortalView =
    rawView === 'restaurant' ||
    rawView === 'driver' ||
    rawView === 'travels' ||
    rawView === 'admin' ||
    rawView === 'passenger'
      ? rawView
      : 'passenger';
  const qr = params.get('qr') || 'RS-TN45-CHM-01';
  return { view, qr };
}

export default function App() {
  return (
    <LanguageProvider>
      <BusBiteApp />
    </LanguageProvider>
  );
}

function BusBiteApp() {
  const initial = readInitialUrlParams();
  const { language, t, tr } = useLanguage();
  const [activeView, setActiveView] = useState<PortalView>(initial.view);
  const [activeQrToken, setActiveQrToken] = useState<string>(initial.qr);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [tourOpen, setTourOpen] = useState<boolean>(false);
  const [videoPlayerOpen, setVideoPlayerOpen] = useState<boolean>(false);
  const [videoStudioOpen, setVideoStudioOpen] = useState<boolean>(false);
  const [tourSignal, setTourSignal] = useState<TourSignal | null>(null);

  const emitTourSignal = (payload: Omit<TourSignal, 'nonce'>) => {
    setTourSignal({ ...payload, nonce: Date.now() + Math.random() });
  };

  const { state, loading, error, refresh, post, patch } = usePlatformSocket();

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeView);
    if (activeView === 'passenger' && activeQrToken) {
      url.searchParams.set('qr', activeQrToken);
    } else {
      url.searchParams.delete('qr');
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeView, activeQrToken]);

  const handleOpenPassengerQr = (token: string) => {
    setActiveQrToken(token);
    setActiveView('passenger');
    post('/api/qr/scan', { token }).catch(() => {});
  };

  const navLinks: { id: PortalView; label: string }[] = [
    { id: 'passenger', label: t('nav.passenger') },
    { id: 'driver', label: t('nav.driver') },
    { id: 'restaurant', label: t('nav.restaurant') },
    { id: 'travels', label: t('nav.travels') },
    { id: 'admin', label: t('nav.admin') },
  ];

  return (
    <div lang={language} className="min-h-screen bg-[#F7FAF8] text-slate-900 flex flex-col overflow-x-hidden">
      {/* Responsive Header: 3-Zone Single Row on Desktop, Clean 2-Tier Strip on Mobile */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100">
        <div className="max-w-[1140px] mx-auto px-3 sm:px-6 h-16 sm:h-[74px] flex items-center justify-between gap-2 sm:gap-3 lg:gap-5">
          {/* Zone 1: BusBite Logo & Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('passenger')}
            className="inline-flex items-center gap-2 sm:gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-emerald-900 whitespace-nowrap shrink-0 font-display"
          >
            <img
              src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
              alt="BusBite Logo"
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl object-contain bg-white border border-emerald-200/80 shadow-xs"
            />
            <span>BusBite</span>
          </button>

          {/* Zone 2 (Desktop lg+): Single-line portal navigation links */}
          <nav className="hidden lg:flex items-center gap-5" aria-label="Platform Portals">
            {navLinks.map((link) => {
              const active = activeView === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setActiveView(link.id)}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-emerald-600 text-emerald-950 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-emerald-900'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: India Language Selector + QR & Demo Link */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="sm:hidden">{tr('QR')}</span>
              <span className="hidden sm:inline">{tr('QR & Demo Link')}</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Portal Switcher Strip */}
        <nav
          className="lg:hidden border-t border-emerald-100/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]"
          aria-label="Mobile Platform Portals"
        >
          {navLinks.map((link) => {
            const active = activeView === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setActiveView(link.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-emerald-900 text-white'
                    : 'bg-emerald-50/70 text-slate-700 hover:bg-emerald-100/70'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Workspace */}
      <div className="flex-1">
        {loading ? (
          <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-3">
            <div className="h-8 w-48 bg-slate-200 rounded mx-auto animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded mx-auto animate-pulse" />
          </div>
        ) : error || !state ? (
          <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
            <p className="text-sm text-red-700">{error ? tr(error) : tr('Unable to load platform state.')}</p>
            <button
              type="button"
              onClick={refresh}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium"
            >
              {tr('Retry Connection')}
            </button>
          </div>
        ) : (
          <>
            {activeView === 'passenger' && (
              <PassengerPortal
                state={state}
                activeQrToken={activeQrToken}
                onSelectQrToken={setActiveQrToken}
                post={post}
                patch={patch}
                tourSignal={tourSignal}
              />
            )}
            {activeView === 'restaurant' && (
              <RestaurantPortal state={state} post={post} patch={patch} tourSignal={tourSignal} />
            )}
            {activeView === 'driver' && (
              <DriverPortal state={state} post={post} patch={patch} tourSignal={tourSignal} />
            )}
            {activeView === 'travels' && (
              <BusTravelsPortal
                state={state}
                post={post}
                patch={patch}
                onOpenPassengerQr={handleOpenPassengerQr}
                tourSignal={tourSignal}
              />
            )}
            {activeView === 'admin' && (
              <SuperAdminPortal
                state={state}
                post={post}
                patch={patch}
                onOpenPassengerQr={handleOpenPassengerQr}
                tourSignal={tourSignal}
              />
            )}
          </>
        )}
      </div>

      {/* Active Floating App Guide Tour Card */}
      {state && tourOpen && (
        <AppGuideTour
          open={true}
          hiddenDock={true}
          onOpenChange={(next) => {
            if (next) setVideoPlayerOpen(false);
            setTourOpen(next);
          }}
          onNavigatePortal={setActiveView}
          onEmitSignal={emitTourSignal}
          onOpenShareModal={() => setShareOpen(true)}
          onOpenDemoVideo={() => {
            setTourOpen(false);
            setVideoStudioOpen(true);
          }}
        />
      )}

      {/* Auto-Playing Cross-Portal Live Demo Video Player */}
      {state && (
        <DemoVideoPlayer
          active={videoPlayerOpen}
          onClose={() => setVideoPlayerOpen(false)}
          onNavigatePortal={setActiveView}
          onEmitSignal={emitTourSignal}
          onOpenDownloadStudio={() => setVideoStudioOpen(true)}
        />
      )}

      {/* HD Demo Video Studio & .webm Export Modal */}
      {state && (
        <DemoVideoStudioModal
          open={videoStudioOpen}
          onClose={() => setVideoStudioOpen(false)}
          state={state}
          onStartLiveAutoPlay={() => {
            setTourOpen(false);
            setVideoPlayerOpen(true);
          }}
        />
      )}

      {/* Share Demo Link & Scannable QR Modal */}
      {state && (
        <DemoShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          state={state}
          onSelectQrAndOpenPassenger={handleOpenPassengerQr}
          onSwitchView={setActiveView}
          onStartTour={() => {
            setShareOpen(false);
            setVideoPlayerOpen(false);
            setActiveView('passenger');
            emitTourSignal({ passengerTab: 'menu', passengerDisplay: 'app' });
            setTourOpen(true);
          }}
          onOpenDemoVideo={() => {
            setShareOpen(false);
            setVideoStudioOpen(true);
          }}
        />
      )}

      {/* Bottom Demo Video & App Guide Tour Strip (Placed above Contact Footer) */}
      {state && !tourOpen && !videoPlayerOpen && (
        <AppGuideTour
          open={false}
          hiddenDock={false}
          onOpenChange={(next) => {
            if (next) setVideoPlayerOpen(false);
            setTourOpen(next);
          }}
          onNavigatePortal={setActiveView}
          onEmitSignal={emitTourSignal}
          onOpenShareModal={() => setShareOpen(true)}
          onOpenDemoVideo={() => {
            setTourOpen(false);
            setVideoStudioOpen(true);
          }}
        />
      )}

      {/* Contact Information Footer */}
      <footer className="bg-[#0B2B20] text-white border-t border-emerald-900 px-4 sm:px-6 py-7 sm:py-8">
        <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <img
              src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
              alt="BusBite Logo"
              className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-contain bg-white border border-emerald-200/80 shadow-md shrink-0"
            />
            <div className="space-y-1">
              <div className="text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-300">
                {t('common.contactInfo')}
              </div>
              <div className="text-base sm:text-xl font-extrabold tracking-tight text-white sm:whitespace-nowrap font-display">
                FUTURE FUSION INFO TECH
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <a
              href="mailto:futurefusioninfotech@gmail.com"
              className="flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/15 border border-emerald-700/60 px-4 py-3 transition-colors shrink-0"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  {tr('Email')}
                </div>
                <div className="text-xs sm:text-sm font-medium text-white break-all sm:break-normal sm:whitespace-nowrap">
                  futurefusioninfotech@gmail.com
                </div>
              </div>
            </a>

            <a
              href="tel:+919500553499"
              className="flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/15 border border-emerald-700/60 px-4 py-3 transition-colors shrink-0"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  {tr('Phone')}
                </div>
                <div className="text-xs sm:text-sm font-mono font-semibold text-white whitespace-nowrap">
                  +91 95005 53499
                </div>
              </div>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
