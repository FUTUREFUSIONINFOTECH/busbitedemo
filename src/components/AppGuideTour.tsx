import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Film,
  Play,
  QrCode,
  RotateCcw,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/indianLanguages';
import type { PortalView } from '../types/platform';

export interface TourSignal {
  nonce: number;
  passengerTab?: 'tickets' | 'landing' | 'menu' | 'checkout' | 'tracking' | 'profile';
  passengerDisplay?: 'app' | 'browser' | 'toggle';
  restaurantMode?: 'mobile' | 'desktop' | 'toggle';
  driverTab?: 'home' | 'trips' | 'food' | 'gps' | 'orders' | 'profile';
  travelsSection?: 'overview' | 'tickets' | 'schedules' | 'food' | 'profile';
  adminSection?: 'dashboard' | 'passengers' | 'restaurants' | 'transport' | 'routes' | 'partnerships' | 'orders' | 'payments' | 'reports';
}

interface TourStep {
  id: string;
  portal: PortalView;
  portalLabel: string;
  title: string;
  summary: string;
  checklist: string[];
  actionLabel: string;
  signal: Omit<TourSignal, 'nonce'>;
  opensShareModal?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'food-first',
    portal: 'passenger',
    portalLabel: 'Passenger App · Food First',
    title: 'Instant Highway Restaurant & Menu Ordering',
    summary:
      'Scanning the bus QR lands passengers directly on available highway restaurants along their corridor — seat number is optional for fast ordering.',
    checklist: [
      'Pick any available highway restaurant chip at the top and add items to Cart.',
      'Switch between Mobile App (320px) and Mobile Browser (Web) above the phone frame.',
    ],
    actionLabel: 'Toggle App / Mobile Browser',
    signal: { passengerTab: 'menu', passengerDisplay: 'toggle' },
  },
  {
    id: 'tickets-boarding',
    portal: 'passenger',
    portalLabel: 'Passenger App · Tickets',
    title: 'OTA Live Seat Lock & Boarding-Gated Pre-Order',
    summary:
      'RedBus/MakeMyTrip live seats are locked in real time to avoid double-booking. Food Pre-Order on a ticket unlocks strictly after bus boarding.',
    checklist: [
      'Book available green seats (RedBus/MMT locked seats are blocked automatically).',
      'In My Tickets, verify that Pre-Order Food stays locked until status becomes BOARDED.',
    ],
    actionLabel: 'Open Ticket & Boarding Flow',
    signal: { passengerTab: 'tickets', passengerDisplay: 'app' },
  },
  {
    id: 'driver',
    portal: 'driver',
    portalLabel: 'Driver App · GPS & Staff Food',
    title: 'Live GPS Broadcast & Driver/Conductor Staff Offers',
    summary:
      'Drivers broadcast live highway GPS and order discounted Staff Meals with complimentary perks from route hotels using the same 4-digit pickup PIN.',
    checklist: [
      'Open Food to view Driver/Conductor special discount deals on your active route.',
      'Use Live GPS to move the bus and update restaurant & passenger ETAs in real time.',
    ],
    actionLabel: 'Open Driver Staff Food',
    signal: { driverTab: 'food' },
  },
  {
    id: 'restaurant',
    portal: 'restaurant',
    portalLabel: 'Restaurant Admin',
    title: 'Kitchen Dispatch & Commission Due to BusBite',
    summary:
      'Highway restaurants manage Passenger & Staff Offer orders in Mobile or 1024px Desktop Kanban, and track platform commissions owed to BusBite.',
    checklist: [
      'Accept paid orders, mark Preparing / Ready, and verify 4-digit pickup codes.',
      'Switch to Desktop View to inspect the Kanban kitchen board and commission ledger.',
    ],
    actionLabel: 'Switch Mobile / Desktop POS',
    signal: { restaurantMode: 'toggle' },
  },
  {
    id: 'travels',
    portal: 'travels',
    portalLabel: 'Bus Travel Admin',
    title: 'OTA Seat Locks, Ticket Commissions & Hotel Tie-Ups',
    summary:
      'Operators manage RedBus/MakeMyTrip seat locks, monitor ticket commissions owed to BusBite, and add or leave highway restaurant tie-ups per bus.',
    checklist: [
      'Inspect RedBus/MMT seat locks and lock/release seats live in Tickets & Seat Map.',
      'Visit Bus Food QR & Tie-Ups to add or leave route restaurant partnerships.',
    ],
    actionLabel: 'Inspect Live Seat Map',
    signal: { travelsSection: 'tickets' },
  },
  {
    id: 'admin',
    portal: 'admin',
    portalLabel: 'Super Admin & Share',
    title: 'Compliance Onboarding, Receivables & Print Reports',
    summary:
      'Super Admin verifies full restaurant & transport documents, collects commissions from both partners, filters orders, and prints CSV/PDF reports.',
    checklist: [
      'Review Commission Receivables from both Restaurants and Bus Travels operators.',
      'Open QR & Demo Link to share deep links or scan seat QR codes on a mobile phone.',
    ],
    actionLabel: 'Open QR & Demo Link',
    signal: { adminSection: 'payments' },
    opensShareModal: true,
  },
];

interface AppGuideTourProps {
  open: boolean;
  hiddenDock?: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePortal: (view: PortalView) => void;
  onEmitSignal: (signal: Omit<TourSignal, 'nonce'>) => void;
  onOpenShareModal: () => void;
  onOpenDemoVideo: () => void;
}

export function AppGuideTour({
  open,
  hiddenDock = false,
  onOpenChange,
  onNavigatePortal,
  onEmitSignal,
  onOpenShareModal,
  onOpenDemoVideo,
}: AppGuideTourProps) {
  const { tr } = useLanguage();
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [minimized, setMinimized] = useState<boolean>(false);

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const goToStep = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(TOUR_STEPS.length - 1, nextIndex));
    const target = TOUR_STEPS[bounded];
    setStepIndex(bounded);
    setMinimized(false);
    onNavigatePortal(target.portal);
    // Avoid auto-toggling modes on navigation if signal asks to toggle
    const cleanSignal = { ...target.signal };
    if (cleanSignal.passengerDisplay === 'toggle') cleanSignal.passengerDisplay = 'app';
    if (cleanSignal.restaurantMode === 'toggle') delete cleanSignal.restaurantMode;
    onEmitSignal(cleanSignal);
  };

  const handleOpenTour = () => {
    setStepIndex(0);
    setMinimized(false);
    onOpenChange(true);
    onNavigatePortal(TOUR_STEPS[0].portal);
    onEmitSignal({ passengerTab: 'menu', passengerDisplay: 'app' });
  };

  const handleStepAction = () => {
    onNavigatePortal(currentStep.portal);
    onEmitSignal(currentStep.signal);
    if (currentStep.opensShareModal) {
      onOpenShareModal();
    }
  };

  if (!open) {
    if (hiddenDock) return null;
    return (
      <div className="w-full bg-[#E3ECE7] border-t border-emerald-200/80 px-3 py-2.5 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDemoVideo}
          aria-label="Watch or Download BusBite Demo Video"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-950 px-3.5 py-1.5 text-xs font-semibold shadow-xs border border-emerald-200 hover:bg-emerald-50 transition-colors"
        >
          <Film className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>{tr('Demo Video')}</span>
        </button>
        <button
          type="button"
          onClick={handleOpenTour}
          aria-label="Open BusBite App Guide Tour"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs border border-emerald-700/70 hover:bg-emerald-950 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>{tr('App Guide Tour')}</span>
        </button>
      </div>
    );
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <aside
      aria-label="BusBite App Walkthrough"
      className="fixed bottom-2.5 left-2.5 right-2.5 sm:left-auto sm:bottom-5 sm:right-5 sm:w-[372px] z-50 rounded-2xl bg-white border border-emerald-200 shadow-[0_22px_54px_rgba(6,78,59,0.25)] overflow-hidden"
    >
      {/* Top Guide Header */}
      <div className="bg-[#0B2B20] text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png`}
            alt="BusBite"
            className="w-8 h-8 rounded-lg object-contain bg-white shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-tight truncate">BusBite {tr('App Guide')}</div>
            <div className="text-[10px] text-emerald-200 font-mono tabular-nums truncate">
              {tr('Step')} {stepIndex + 1} / {TOUR_STEPS.length} · {tr(currentStep.portalLabel)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expand guide tour' : 'Minimize guide tour'}
            className="h-8 w-8 rounded-lg text-emerald-100 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close guide tour"
            className="h-8 w-8 rounded-lg text-emerald-100 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clickable Step Progress Bar */}
      <div className="px-3.5 pt-2.5 pb-1 bg-white">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${TOUR_STEPS.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="Walkthrough steps"
        >
          {TOUR_STEPS.map((st, idx) => {
            const active = idx === stepIndex;
            const visited = idx < stepIndex;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Jump to step ${idx + 1}: ${st.title}`}
                onClick={() => goToStep(idx)}
                className="py-1 group focus-visible:outline-none"
              >
                <span
                  className={`block h-1.5 w-full rounded-full transition-colors ${
                    active
                      ? 'bg-emerald-700'
                      : visited
                        ? 'bg-emerald-400 group-hover:bg-emerald-500'
                        : 'bg-slate-200 group-hover:bg-emerald-200'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Step Body */}
          <div className="px-3.5 pb-3 pt-1.5 space-y-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{tr(currentStep.title)}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tr(currentStep.summary)}</p>
            </div>

            <div className="rounded-xl bg-[#F4F8F6] border border-emerald-100 p-2.5 space-y-1.5">
              <div className="text-[11px] font-semibold text-emerald-950">{tr('Try on this screen')}</div>
              <ol className="space-y-1 text-[11px] text-slate-700 leading-snug">
                {currentStep.checklist.map((item, i) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="font-mono font-bold text-emerald-700 shrink-0">{i + 1}.</span>
                    <span>{tr(item)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={handleStepAction}
              className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {currentStep.opensShareModal ? (
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>{tr(currentStep.actionLabel)}</span>
            </button>
          </div>

          {/* Step Footer Controls */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => goToStep(stepIndex - 1)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {tr('Back')}
              </button>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(0)}
                  aria-label="Restart guide tour"
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {tr('Restart')}
                </button>
              )}
            </div>

            {isLast ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {tr('Finish Tour')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>{tr('Next Step')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
