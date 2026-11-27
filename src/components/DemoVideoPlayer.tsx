import { useEffect, useState } from 'react';
import {
  Download,
  Film,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/indianLanguages';
import type { PortalView } from '../types/platform';
import type { TourSignal } from './AppGuideTour';

interface DemoVideoScene {
  id: string;
  title: string;
  portal: PortalView;
  signal: Omit<TourSignal, 'nonce'>;
  captionEn: string;
  captionTa: string;
}

const LIVE_VIDEO_SCENES: DemoVideoScene[] = [
  {
    id: 'scene-1',
    title: '01. Passenger App (Food First)',
    portal: 'passenger',
    signal: { passengerTab: 'menu', passengerDisplay: 'app' },
    captionEn:
      'Welcome to BusBite — Opening the Passenger App or scanning the seat QR immediately shows available highway restaurants along your route.',
    captionTa:
      'BusBite-க்கு வரவேற்கிறோம் — Passenger App அல்லது சீட் QR திறந்தவுடன் வழியில் உள்ள உணவகங்களும் மெனுவும் முதலில் தெரியும்.',
  },
  {
    id: 'scene-2',
    title: '02. Route & Optional Seat Order',
    portal: 'passenger',
    signal: { passengerTab: 'landing', passengerDisplay: 'app' },
    captionEn:
      'Passengers inspect live route stops, switch between kitchens, and can order highway meals even without entering a seat number.',
    captionTa:
      'பயணிகள் பஸ் ரூட் & ஸ்டாப்புகளைப் பார்த்து, சீட் நம்பர் இல்லாமலேயே எளிதாக உணவு ஆர்டர் செய்யலாம்.',
  },
  {
    id: 'scene-3',
    title: '03. Boarding-Gated Ticket Pre-Order',
    portal: 'passenger',
    signal: { passengerTab: 'tickets', passengerDisplay: 'app' },
    captionEn:
      'RedBus/MakeMyTrip live seat locks prevent double-booking. Food pre-ordering on booked tickets unlocks strictly after boarding the bus.',
    captionTa:
      'RedBus/MMT நேரடி இருக்கை பூட்டு மூலம் டபுள் புக்கிங் தடுக்கப்படும். பஸ் ஏறிய (Boarded) பிறகே டிக்கெட்டில் Pre-Order Food திறக்கும்.',
  },
  {
    id: 'scene-4',
    title: '04. Mobile Browser Web Mode',
    portal: 'passenger',
    signal: { passengerTab: 'tracking', passengerDisplay: 'browser' },
    captionEn:
      'No app install required: every seat QR works inside any mobile browser with live prep progress and 4-digit pickup PIN.',
    captionTa:
      'ஆப் டவுன்லோட் இல்லாமலேயே மொபைல் பிரவுசரிலும் லைவ் உணவு நிலை மற்றும் 4-இலக்க PIN விவரங்களைப் பார்க்க முடியும்.',
  },
  {
    id: 'scene-5',
    title: '05. Driver App · Staff Food & GPS',
    portal: 'driver',
    signal: { driverTab: 'food' },
    captionEn:
      'Drivers & Conductors order from the same route hotels with exclusive Staff Meal discounts + free tea/coffee using a 4-digit pickup PIN.',
    captionTa:
      'டிரைவர் & கண்டக்டர்களும் அதே உணவகங்களில் பணியாளர் சிறப்பு சலுகையுடன் உணவு ஆர்டர் செய்து 4-இலக்க PIN மூலம் பெற்றுக்கொள்ளலாம்.',
  },
  {
    id: 'scene-6',
    title: '06. Driver Live GPS & ID Profile',
    portal: 'driver',
    signal: { driverTab: 'gps' },
    captionEn:
      'Drivers broadcast live highway GPS progress and speed, updating ETAs for kitchens and passengers across the corridor.',
    captionTa:
      'டிரைவர் ஆப் மூலம் பஸ்ஸின் லைவ் GPS அப்டேட் ஆகும்போது பயணி மற்றும் உணவக ETA தானாக மாறும்.',
  },
  {
    id: 'scene-7',
    title: '07. Restaurant Admin POS',
    portal: 'restaurant',
    signal: { restaurantMode: 'desktop' },
    captionEn:
      'Restaurant Admin tracks incoming buses, Staff & Passenger orders on Mobile or Desktop Kanban, and settles platform commission to BusBite.',
    captionTa:
      'உணவக அட்மினில் பஸ் ETA, பணியாளர் & பயணி ஆர்டர்கள் மற்றும் BusBite கமிஷன் கணக்கை எளிதாக நிர்வகிக்கலாம்.',
  },
  {
    id: 'scene-8',
    title: '08. Bus Travel Admin',
    portal: 'travels',
    signal: { travelsSection: 'tickets' },
    captionEn:
      'Bus Travel Admin manages RedBus/MakeMyTrip live seat locks, views ticket commissions owed to BusBite, and adds or leaves restaurant tie-ups per bus.',
    captionTa:
      'பஸ் டிராவல் அட்மினில் RedBus/MMT இருக்கை பூட்டு, டிக்கெட் கமிஷன் மற்றும் உணவக tie-up-களை சேர்க்கவோ நீக்கவோ முடியும்.',
  },
  {
    id: 'scene-9',
    title: '09. Super Admin Receivables',
    portal: 'admin',
    signal: { adminSection: 'payments' },
    captionEn:
      'Super Admin verifies full partner documents, collects commissions from Restaurants & Travels, filters orders, and prints full reports.',
    captionTa:
      'சூப்பர் அட்மின் மூலம் அனைத்து ஆவண சரிபார்ப்பு, உணவகம் & டிராவல்ஸ் கமிஷன் வசூல் மற்றும் ரிப்போர்ட்டுகளை பிரிண்ட் செய்யலாம்.',
  },
];

interface DemoVideoPlayerProps {
  active: boolean;
  onClose: () => void;
  onNavigatePortal: (view: PortalView) => void;
  onEmitSignal: (signal: Omit<TourSignal, 'nonce'>) => void;
  onOpenDownloadStudio: () => void;
}

export function DemoVideoPlayer({
  active,
  onClose,
  onNavigatePortal,
  onEmitSignal,
  onOpenDownloadStudio,
}: DemoVideoPlayerProps) {
  const { tr } = useLanguage();
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<1 | 1.5>(1);
  const [lang, setLang] = useState<'ta' | 'en'>('ta');
  const [progressInScene, setProgressInScene] = useState<number>(0);

  const sceneDurationMs = speed === 1 ? 5500 : 3700;

  const jumpToScene = (idx: number) => {
    const bounded = ((idx % LIVE_VIDEO_SCENES.length) + LIVE_VIDEO_SCENES.length) % LIVE_VIDEO_SCENES.length;
    const target = LIVE_VIDEO_SCENES[bounded];
    setSceneIndex(bounded);
    setProgressInScene(0);
    onNavigatePortal(target.portal);
    onEmitSignal(target.signal);
  };

  // Trigger initial scene when opened
  useEffect(() => {
    if (!active) return;
    setSceneIndex(0);
    setPlaying(true);
    setProgressInScene(0);
    const first = LIVE_VIDEO_SCENES[0];
    onNavigatePortal(first.portal);
    onEmitSignal(first.signal);
  }, [active]);

  // Smooth auto-play timer loop
  useEffect(() => {
    if (!active || !playing) return;
    const tickMs = 100;
    const timer = window.setInterval(() => {
      setProgressInScene((prev) => {
        const next = prev + tickMs / sceneDurationMs;
        if (next >= 1) {
          setSceneIndex((currIdx) => {
            const nextIdx = currIdx + 1;
            if (nextIdx >= LIVE_VIDEO_SCENES.length) {
              setPlaying(false);
              return currIdx;
            }
            const nextScene = LIVE_VIDEO_SCENES[nextIdx];
            onNavigatePortal(nextScene.portal);
            onEmitSignal(nextScene.signal);
            return nextIdx;
          });
          return 0;
        }
        return next;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [active, playing, sceneDurationMs]);

  if (!active) return null;

  const scene = LIVE_VIDEO_SCENES[sceneIndex];
  const totalSec = Math.round((LIVE_VIDEO_SCENES.length * sceneDurationMs) / 1000);
  const currentSec = Math.min(
    totalSec,
    Math.round(((sceneIndex + progressInScene) * sceneDurationMs) / 1000)
  );

  return (
    <section
      aria-label="BusBite Live Demo Video Player"
      className="fixed bottom-2.5 left-2.5 right-2.5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[680px] max-w-[calc(100vw-20px)] z-50 rounded-2xl bg-[#0B2B20]/95 backdrop-blur-md text-white border border-emerald-600/70 shadow-[0_24px_60px_rgba(6,78,59,0.4)] overflow-hidden"
    >
      {/* Subtitle Narration Strip */}
      <div className="px-3.5 sm:px-4 pt-3 pb-2 border-b border-white/10 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider shrink-0">
              <Film className="w-3 h-3" />
              {tr('Demo Reel')}
            </span>
            <span className="text-xs font-bold text-white truncate">{tr(scene.title)}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'ta' ? 'en' : 'ta'))}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-emerald-100 transition-colors"
              title="Switch caption language"
            >
              {lang === 'ta' ? 'தமிழ் / EN' : 'EN / தமிழ்'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Exit demo video mode"
              className="h-7 w-7 rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-emerald-50/95 leading-snug">
          {lang === 'ta' ? scene.captionTa : scene.captionEn}
        </p>
      </div>

      {/* Chapter Scrubber Strip */}
      <div className="px-3.5 sm:px-4 pt-2 pb-1">
        <div className="grid grid-cols-9 gap-1">
          {LIVE_VIDEO_SCENES.map((sc, idx) => {
            const fillPct =
              idx < sceneIndex ? 100 : idx === sceneIndex ? Math.round(progressInScene * 100) : 0;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => jumpToScene(idx)}
                aria-label={`Play ${sc.title}`}
                title={sc.title}
                className="py-1 group"
              >
                <span className="block h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                  <span
                    className="block h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${fillPct}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Transport Controls */}
      <div className="px-3.5 sm:px-4 pb-2.5 pt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => jumpToScene(sceneIndex - 1)}
            aria-label="Previous scene"
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!playing && sceneIndex === LIVE_VIDEO_SCENES.length - 1 && progressInScene === 0) {
                jumpToScene(0);
              }
              setPlaying((p) => !p);
            }}
            className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? tr('Pause') : tr('Play')}</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToScene(sceneIndex + 1)}
            aria-label="Next scene"
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono tabular-nums text-emerald-200 pl-1">
            00:{currentSec.toString().padStart(2, '0')} / 00:{totalSec.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 1.5 : 1))}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono font-semibold text-emerald-100 transition-colors"
          >
            {speed}x
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              onClose();
              onOpenDownloadStudio();
            }}
            className="h-8 px-3 rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-800" />
            <span>{tr('Download Video (.webm)')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
