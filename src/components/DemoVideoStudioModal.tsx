import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Video,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/indianLanguages';
import type { PlatformState } from '../types/platform';

interface DemoVideoStudioModalProps {
  open: boolean;
  onClose: () => void;
  state: PlatformState;
  onStartLiveAutoPlay: () => void;
}

const TOTAL_DURATION_SEC = 28; // 7 scenes x 4 seconds each

const VIDEO_SCENES = [
  { label: '01. BusBite Overview', start: 0, end: 4 },
  { label: '02. Ticket & Seat Booking', start: 4, end: 8 },
  { label: '03. Passenger App Menu', start: 8, end: 12 },
  { label: '04. Restaurant Admin', start: 12, end: 16 },
  { label: '05. Driver App & Staff', start: 16, end: 20 },
  { label: '06. Bus Travel Admin', start: 20, end: 24 },
  { label: '07. Super Admin & Dues', start: 24, end: 28 },
];

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function DemoVideoStudioModal({
  open,
  onClose,
  state,
  onStartLiveAutoPlay,
}: DemoVideoStudioModalProps) {
  const { tr } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [playing, setPlaying] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const elapsedRef = useRef<number>(0);
  const playingRef = useRef<boolean>(true);
  const recordingRef = useRef<boolean>(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Preload BusBite logo for canvas drawing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png';
    img.onload = () => {
      logoImgRef.current = img;
    };
  }, []);

  // Revoke blob URL on unmount or replacement
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const drawFrame = (ctx: CanvasRenderingContext2D, t: number) => {
    const W = 1280;
    const H = 720;
    const sceneIdx = Math.min(6, Math.floor(t / 4));
    const localT = Math.max(0, Math.min(1, (t - sceneIdx * 4) / 4));
    const ease = 1 - Math.pow(1 - Math.min(1, localT * 2.2), 3);

    // Background clean emerald-tinted canvas
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#07241A');
    bgGrad.addColorStop(0.55, '#0B3526');
    bgGrad.addColorStop(1, '#061B14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 64) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += 64) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // Top persistent brand bar
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundRect(ctx, 48, 22, W - 96, 76, 16);
    ctx.fill();

    if (logoImgRef.current) {
      ctx.save();
      drawRoundRect(ctx, 60, 30, 60, 60, 12);
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(60, 30, 60, 60);
      ctx.drawImage(logoImgRef.current, 60, 30, 60, 60);
      ctx.restore();
    } else {
      ctx.fillStyle = '#10B981';
      drawRoundRect(ctx, 60, 30, 60, 60, 12);
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('BusBite', 134, 68);

    ctx.fillStyle = '#A7F3D0';
    ctx.font = '500 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('Highway Bus Ticketing · Food Pre-Order · Live GPS', 248, 66);

    // Scene pill indicator on right
    const sceneMeta = VIDEO_SCENES[sceneIdx];
    ctx.fillStyle = '#065F46';
    drawRoundRect(ctx, W - 320, 42, 256, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#ECFDF5';
    ctx.font = '600 14px monospace';
    ctx.fillText(sceneMeta.label, W - 302, 65);

    // Left Story Copy Column
    const copyX = 64;
    const copyY = 176 - (1 - ease) * 18;
    ctx.globalAlpha = ease;

    const sceneTexts = [
      {
        kicker: 'ALL-IN-ONE HIGHWAY PLATFORM',
        title: ['Travel Smarter.', 'Dine Fresh on Every Stop.'],
        desc: [
          'BusBite connects passengers, highway kitchens,',
          'bus drivers, fleet operators, and platform admins',
          'in one connected live platform.',
        ],
        bullets: [
          `${state.routes.length} Highway Corridors · ${state.vehicles.length} Active Coaches`,
          `${state.restaurants.filter((r) => r.status === 'APPROVED').length} Approved Partner Restaurants`,
          `${state.tickets.length} Live Ticket PNRs · ${state.orders.length} Pre-Orders`,
        ],
      },
      {
        kicker: '01 · PASSENGER BUS TICKETING',
        title: ['Pick Your Sleeper Seat.', 'Instant PNR Confirmation.'],
        desc: [
          'Browse bus timings along NH corridors, choose',
          'Lower or Upper deck seats with real-time lock,',
          'and jump straight to meal pre-ordering.',
        ],
        bullets: [
          'Live double-booking protection per seat',
          'Boarding & dropping stop selector + GST breakup',
          '1-click "Pre-Order Food" linked to seat number',
        ],
      },
      {
        kicker: '02 · PASSENGER APP — HIGHWAY FOOD FIRST',
        title: ['Scan Seat QR.', 'Browse Stops & Order.'],
        desc: [
          'Passengers land directly on route restaurants,',
          'browse fresh meals at upcoming stops, and',
          'unlock seat pre-orders once boarded.',
        ],
        bullets: [
          'Real-time ETA calculation per highway restaurant',
          'Takeaway Pickup or Bus Seat Delivery options',
          'UPI / Card checkout + 4-digit handover PIN',
        ],
      },
      {
        kicker: '03 · RESTAURANT ADMIN POS',
        title: ['Kitchen Dispatch on', 'Mobile & Desktop.'],
        desc: [
          'Partner kitchens see incoming buses with exact',
          'ETAs, accept passenger & staff offer orders, and',
          'track commissions payable to BusBite.',
        ],
        bullets: [
          '320px Kitchen App + 1024px Desktop Kanban Board',
          'Staff Offer highlights & menu stock toggles',
          'Commission payable & paid ledger to BusBite',
        ],
      },
      {
        kicker: '04 · DRIVER APP & STAFF',
        title: ['Live Highway GPS.', 'Staff Meal Orders.'],
        desc: [
          'Drivers stream route progress and speed from a',
          'mobile console, order staff meals with ₹0 fee,',
          'and access their Digital Staff ID Card.',
        ],
        bullets: [
          'Start/End trip controls + live route progress',
          'Driver & Conductor meal discounts + 4-digit PIN',
          'Digital Staff ID Card & live stop alerts',
        ],
      },
      {
        kicker: '05 · BUS TRAVEL ADMIN CONSOLE',
        title: ['Manage Fleet, OTA Locks', '& Restaurant Tie-Ups.'],
        desc: [
          'Operators inspect live deck occupancy, manage seats',
          'with RedBus & MakeMyTrip, handle restaurant',
          'tie-ups, and settle ticket commissions.',
        ],
        bullets: [
          'Real-time RedBus / MakeMyTrip seat lock engine',
          'Passenger check-in (CONFIRMED -> BOARDED)',
          'Add or leave highway restaurant tie-ups per bus',
        ],
      },
      {
        kicker: '06 · SUPER ADMIN & RECEIVABLES',
        title: ['Full Governance,', 'Commissions & Reports.'],
        desc: [
          'Super Admins verify compliance docs, collect',
          'food & ticket commissions from partners,',
          'and export print-ready CSV/PDF reports.',
        ],
        bullets: [
          'Partner onboarding with GST, FSSAI, Hygiene & RC',
          'Incoming restaurant & bus commission receivables',
          'Print-ready route, vehicle & commission reports',
        ],
      },
    ];

    const copy = sceneTexts[sceneIdx];
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(copy.kicker, copyX, copyY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    copy.title.forEach((line, i) => {
      ctx.fillText(line, copyX, copyY + 54 + i * 50);
    });

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 19px system-ui, -apple-system, sans-serif';
    copy.desc.forEach((line, i) => {
      ctx.fillText(line, copyX, copyY + 180 + i * 28);
    });

    // Checklist box
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundRect(ctx, copyX, copyY + 278, 520, 148, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    copy.bullets.forEach((b, i) => {
      const by = copyY + 318 + i * 42;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(copyX + 26, by - 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ECFDF5';
      ctx.font = '500 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(b, copyX + 46, by);
    });

    ctx.globalAlpha = 1;

    // Right Visual Device Stage
    const stageX = 640;
    const stageY = 128;
    const stageW = 576;
    const stageH = 510;

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    drawRoundRect(ctx, stageX, stageY, stageW, stageH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();

    const isMobileVisual = sceneIdx === 1 || sceneIdx === 2 || sceneIdx === 4;

    if (sceneIdx === 0) {
      // Overview: 2 Mini Cards (Phone + Desktop)
      // Left Mini Phone
      ctx.fillStyle = '#0F172A';
      drawRoundRect(ctx, stageX + 36, stageY + 46, 210, 418, 28);
      ctx.fill();
      ctx.fillStyle = '#F4F8F6';
      drawRoundRect(ctx, stageX + 46, stageY + 56, 190, 398, 22);
      ctx.fill();

      ctx.fillStyle = '#064E3B';
      drawRoundRect(ctx, stageX + 60, stageY + 80, 162, 74, 14);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('Passenger App', stageX + 74, stageY + 112);
      ctx.fillStyle = '#A7F3D0';
      ctx.font = '11px monospace';
      ctx.fillText('Tickets · Food · GPS', stageX + 74, stageY + 134);

      ['Book Sleeper Seat', 'Pre-Order Highway Meal', 'Track Bus Live ETA'].forEach((item, idx) => {
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, stageX + 60, stageY + 172 + idx * 72, 162, 58, 12);
        ctx.fill();
        ctx.fillStyle = '#064E3B';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(item, stageX + 72, stageY + 205 + idx * 72);
      });

      // Right Mini Desktop Card
      ctx.fillStyle = '#0F172A';
      drawRoundRect(ctx, stageX + 270, stageY + 90, 274, 290, 18);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      drawRoundRect(ctx, stageX + 280, stageY + 120, 254, 248, 12);
      ctx.fill();
      ctx.fillStyle = '#065F46';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('Admin & Partner Consoles', stageX + 296, stageY + 150);
      ['Restaurant Kanban POS', 'Bus Travels Seat Map', 'Super Admin Settlements'].forEach((tCard, idx) => {
        ctx.fillStyle = '#ECFDF5';
        drawRoundRect(ctx, stageX + 296, stageY + 172 + idx * 58, 222, 44, 10);
        ctx.fill();
        ctx.fillStyle = '#064E3B';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(tCard, stageX + 310, stageY + 199 + idx * 58);
      });
    } else if (isMobileVisual) {
      // Realistic 320px-proportioned Phone Frame in center of stage
      const px = stageX + 158;
      const py = stageY + 24;
      const pw = 260;
      const ph = 462;
      ctx.fillStyle = '#0B1B15';
      drawRoundRect(ctx, px, py, pw, ph, 32);
      ctx.fill();
      ctx.fillStyle = '#F4F8F6';
      drawRoundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 26);
      ctx.fill();

      // Phone Notch
      ctx.fillStyle = '#0B1B15';
      drawRoundRect(ctx, px + 88, py + 8, 84, 16, 8);
      ctx.fill();

      // Phone Header
      ctx.fillStyle = '#FFFFFF';
      drawRoundRect(ctx, px + 18, py + 34, pw - 36, 46, 12);
      ctx.fill();
      ctx.fillStyle = '#064E3B';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('BusBite', px + 32, py + 56);
      ctx.fillStyle = '#64748B';
      ctx.font = '11px monospace';
      ctx.fillText(
        sceneIdx === 1 ? 'TN45-N-4821 · Tickets' : sceneIdx === 2 ? 'A2B Highway · Menu' : 'Driver GPS Console',
        px + 32,
        py + 72
      );

      if (sceneIdx === 1) {
        // Animated Seat Map Picker
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, px + 18, py + 92, pw - 36, 260, 14);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('Select Sleeper Seats (Lower)', px + 30, py + 114);

        const seats = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'];
        seats.forEach((s, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const sx = px + 32 + col * 68;
          const sy = py + 130 + row * 48;
          const isBooked = idx === 0 || idx === 3 || idx === 7;
          const isSelected = (idx === 4 && localT > 0.2) || (idx === 5 && localT > 0.5);
          ctx.fillStyle = isBooked ? '#CBD5E1' : isSelected ? '#064E3B' : '#FFFFFF';
          drawRoundRect(ctx, sx, sy, 56, 36, 8);
          ctx.fill();
          ctx.strokeStyle = isBooked ? '#94A3B8' : '#059669';
          ctx.stroke();
          ctx.fillStyle = isSelected ? '#FFFFFF' : isBooked ? '#64748B' : '#064E3B';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(s, sx + 18, sy + 23);
        });

        // PNR Confirmed Bar
        ctx.fillStyle = '#064E3B';
        drawRoundRect(ctx, px + 18, py + 364, pw - 36, 56, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(localT > 0.55 ? 'PNR BB8492 Confirmed!' : 'Tap seats to calculate fare', px + 32, py + 388);
        ctx.fillStyle = '#A7F3D0';
        ctx.font = '11px monospace';
        ctx.fillText('2 Seats · ₹1,785 incl. GST', px + 32, py + 406);
      } else if (sceneIdx === 2) {
        // Food Menu & Order Card
        const dishes = [
          { name: 'Ghee Roast Dosa', price: '₹140' },
          { name: 'Mini Tiffin Combo', price: '₹185' },
          { name: 'Filter Coffee Flask', price: '₹95' },
        ];
        dishes.forEach((d, idx) => {
          const dy = py + 94 + idx * 78;
          ctx.fillStyle = '#FFFFFF';
          drawRoundRect(ctx, px + 18, dy, pw - 36, 68, 12);
          ctx.fill();
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillText(d.name, px + 30, dy + 28);
          ctx.fillStyle = '#047857';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(d.price, px + 30, dy + 48);

          const added = localT > (idx + 1) * 0.22;
          ctx.fillStyle = added ? '#064E3B' : '#ECFDF5';
          drawRoundRect(ctx, px + 168, dy + 18, 60, 30, 8);
          ctx.fill();
          ctx.fillStyle = added ? '#FFFFFF' : '#065F46';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillText(added ? 'Added ✓' : '+ Add', px + 178, dy + 37);
        });

        ctx.fillStyle = '#064E3B';
        drawRoundRect(ctx, px + 18, py + 340, pw - 36, 78, 12);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('Kitchen Cooking · Pickup #4821', px + 30, py + 368);
        ctx.fillStyle = '#A7F3D0';
        ctx.font = '11px monospace';
        ctx.fillText('Stop ETA: 18 mins (Tindivanam)', px + 30, py + 392);
      } else {
        // Scene 4 (index 4): Driver Live GPS
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, px + 18, py + 94, pw - 36, 178, 14);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('NH-45 Live Highway Corridor', px + 30, py + 118);

        // Highway track
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(px + 38, py + 180);
        ctx.lineTo(px + pw - 38, py + 180);
        ctx.stroke();

        const busProg = 0.25 + localT * 0.55;
        const busX = px + 38 + (pw - 76) * busProg;
        ctx.strokeStyle = '#059669';
        ctx.beginPath();
        ctx.moveTo(px + 38, py + 180);
        ctx.lineTo(busX, py + 180);
        ctx.stroke();

        // Moving Bus Marker
        ctx.fillStyle = '#064E3B';
        drawRoundRect(ctx, busX - 18, py + 168, 36, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('BUS', busX - 10, py + 184);

        ctx.fillStyle = '#047857';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Speed 72 km/h · Progress ${Math.round(busProg * 100)}%`, px + 30, py + 236);

        ctx.fillStyle = '#064E3B';
        drawRoundRect(ctx, px + 18, py + 290, pw - 36, 118, 14);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('Next Stop: A2B Tindivanam', px + 32, py + 324);
        ctx.fillStyle = '#A7F3D0';
        ctx.font = '12px monospace';
        ctx.fillText('4 Meal Orders Ready for Bus', px + 32, py + 354);
        ctx.fillText('ETA: 14 mins', px + 32, py + 380);
      }
    } else {
      // Desktop Monitor Preview (Restaurant Desktop, Travels Admin, Super Admin)
      const mx = stageX + 30;
      const my = stageY + 40;
      const mw = stageW - 60;
      const mh = 390;

      ctx.fillStyle = '#0B1B15';
      drawRoundRect(ctx, mx, my, mw, mh, 18);
      ctx.fill();
      ctx.fillStyle = '#F7FAF8';
      drawRoundRect(ctx, mx + 10, my + 34, mw - 20, mh - 44, 10);
      ctx.fill();

      // Browser dots + URL
      ['#FB7185', '#FBBF24', '#34D399'].forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(mx + 26 + idx * 14, my + 18, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      const urlLabel =
        sceneIdx === 3
          ? 'kitchen.busbite.app/dispatch'
          : sceneIdx === 5
            ? 'travels.busbite.app/seat-map'
            : 'admin.busbite.app/settlements';
      ctx.fillStyle = '#A7F3D0';
      ctx.font = '12px monospace';
      ctx.fillText(urlLabel, mx + 86, my + 22);

      // Stand base
      ctx.fillStyle = '#1D3B2F';
      ctx.fillRect(mx + mw / 2 - 22, my + mh, 44, 24);
      drawRoundRect(ctx, mx + mw / 2 - 70, my + mh + 22, 140, 10, 5);
      ctx.fill();

      if (sceneIdx === 3) {
        // Desktop Kanban 2x2
        const cols = ['New Paid Orders', 'Accepted Queue', 'Cooking in Kitchen', 'Ready for Pickup'];
        cols.forEach((col, idx) => {
          const cx = mx + 24 + (idx % 2) * 242;
          const cy = my + 52 + Math.floor(idx / 2) * 160;
          ctx.fillStyle = '#FFFFFF';
          drawRoundRect(ctx, cx, cy, 226, 144, 10);
          ctx.fill();
          ctx.strokeStyle = '#E2E8F0';
          ctx.stroke();

          ctx.fillStyle = idx === 3 ? '#064E3B' : '#ECFDF5';
          drawRoundRect(ctx, cx, cy, 226, 34, 10);
          ctx.fill();
          ctx.fillStyle = idx === 3 ? '#FFFFFF' : '#064E3B';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(col, cx + 12, cy + 21);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`#482${idx + 1} · Seat U${idx + 2}`, cx + 12, cy + 62);
          ctx.fillStyle = '#475569';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText('2× Veg Meals · Bus TN45', cx + 12, cy + 84);
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`ETA ${18 - idx * 3}m`, cx + 12, cy + 114);
        });
      } else if (sceneIdx === 5) {
        // Bus Travels Admin Seat Occupancy & Manifest
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, mx + 24, my + 52, mw - 48, 170, 10);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('Live Fleet Seat Occupancy — KPN Travels (TN45-N-4821)', mx + 38, my + 78);

        for (let i = 0; i < 12; i++) {
          const sx = mx + 38 + (i % 6) * 74;
          const sy = my + 96 + Math.floor(i / 6) * 52;
          const occ = i < 7 || (i === 7 && localT > 0.4);
          ctx.fillStyle = occ ? '#064E3B' : '#FFFFFF';
          drawRoundRect(ctx, sx, sy, 64, 40, 8);
          ctx.fill();
          ctx.strokeStyle = '#059669';
          ctx.stroke();
          ctx.fillStyle = occ ? '#FFFFFF' : '#064E3B';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`L${i + 1}`, sx + 22, sy + 24);
        }

        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, mx + 24, my + 236, mw - 48, 128, 10);
        ctx.fill();
        ctx.fillStyle = '#064E3B';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('Passenger PNR Manifest', mx + 38, my + 262);
        ctx.fillStyle = '#334155';
        ctx.font = '12px monospace';
        ctx.fillText('BB90421 · Karthik S. · Seats L4, L5 · BOARDED', mx + 38, my + 292);
        ctx.fillText('BB90428 · Priya V.   · Seat U2     · CONFIRMED', mx + 38, my + 320);
      } else {
        // Scene 6: Super Admin KPI & Settlements
        const kpis = [
          { k: 'Restaurants', v: `${state.restaurants.length} Partners` },
          { k: 'Live Trips', v: `${state.trips.length} Corridors` },
          { k: 'Ticket + Food', v: `${state.tickets.length + state.orders.length} Txns` },
        ];
        kpis.forEach((item, idx) => {
          const kx = mx + 24 + idx * 160;
          ctx.fillStyle = '#FFFFFF';
          drawRoundRect(ctx, kx, my + 54, 148, 86, 10);
          ctx.fill();
          ctx.fillStyle = '#64748B';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText(item.k, kx + 14, my + 80);
          ctx.fillStyle = '#064E3B';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(item.v, kx + 14, my + 114);
        });

        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(ctx, mx + 24, my + 158, mw - 48, 204, 10);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('Commission Receivables & QR Governance', mx + 38, my + 186);

        ['A2B Highway Veg · Paid Comm UTR982144', 'KPN Travels · Ticket Comm Receivable Ready', 'Bus Partnership QR Links Active'].forEach(
          (row, idx) => {
            ctx.fillStyle = '#ECFDF5';
            drawRoundRect(ctx, mx + 38, my + 206 + idx * 46, mw - 76, 36, 8);
            ctx.fill();
            ctx.fillStyle = '#064E3B';
            ctx.font = '600 12px monospace';
            ctx.fillText(row, mx + 52, my + 229 + idx * 46);
          }
        );
      }
    }

    // Bottom Video Timeline Progress Bar
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    drawRoundRect(ctx, 48, H - 36, W - 96, 8, 4);
    ctx.fill();

    const progW = Math.max(8, ((W - 96) * t) / TOTAL_DURATION_SEC);
    ctx.fillStyle = '#10B981';
    drawRoundRect(ctx, 48, H - 36, progW, 8, 4);
    ctx.fill();
  };

  // Animation loop while modal is open
  useEffect(() => {
    if (!open) return;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      if (playingRef.current) {
        let next = elapsedRef.current + dt;
        if (next >= TOTAL_DURATION_SEC) {
          if (recordingRef.current) {
            next = TOTAL_DURATION_SEC;
            elapsedRef.current = next;
            setElapsed(next);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) drawFrame(ctx, next);
            if (recorderRef.current && recorderRef.current.state === 'recording') {
              recorderRef.current.stop();
            }
            playingRef.current = false;
            setPlaying(false);
            return;
          }
          next = 0;
        }
        elapsedRef.current = next;
        setElapsed(next);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) drawFrame(ctx, elapsedRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, state]);

  if (!open) return null;

  const handleStartRecord = () => {
    setRecordError(null);
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setRecordError(
        'Video file recording is not supported on this browser. Use Live Auto-Play Demo instead.'
      );
      return;
    }

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }

    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    try {
      const stream = canvas.captureStream(30);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setRecording(false);
        recordingRef.current = false;
      };

      recorderRef.current = recorder;
      elapsedRef.current = 0;
      setElapsed(0);
      setRecording(true);
      recordingRef.current = true;
      setPlaying(true);
      playingRef.current = true;
      recorder.start(250);
    } catch {
      setRecording(false);
      recordingRef.current = false;
      setRecordError('Unable to initialize browser video recorder. Try Live Auto-Play Demo.');
    }
  };

  const activeSceneIndex = Math.min(6, Math.floor(elapsed / 4));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-video-studio-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center shrink-0">
              <Film className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 id="demo-video-studio-title" className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {tr('BusBite Full Platform Demo Video (Passenger → Super Admin)')}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {tr('Watch the automated showcase or download a 28-second HD .webm video file for clients')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (recorderRef.current && recorderRef.current.state === 'recording') {
                recorderRef.current.stop();
              }
              onClose();
            }}
            aria-label="Close video studio"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* HD 16:9 Video Canvas Stage */}
          <div className="rounded-xl overflow-hidden border border-emerald-900/20 bg-[#061B14] shadow-md">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-auto block aspect-video"
            />
          </div>

          {/* Scene Jump Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {VIDEO_SCENES.map((sc, idx) => (
              <button
                key={sc.label}
                type="button"
                disabled={recording}
                onClick={() => {
                  elapsedRef.current = sc.start;
                  setElapsed(sc.start);
                }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold text-left truncate transition-colors ${
                  activeSceneIndex === idx
                    ? 'bg-emerald-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                {tr(sc.label)}
              </button>
            ))}
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={recording}
                onClick={() => setPlaying((p) => !p)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? tr('Pause') : tr('Play')}
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={() => {
                  elapsedRef.current = 0;
                  setElapsed(0);
                  setPlaying(true);
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {tr('Restart')}
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-600 pl-1">
                {Math.floor(elapsed).toString().padStart(2, '0')}s / {TOTAL_DURATION_SEC}s
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartLiveAutoPlay();
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs font-semibold hover:bg-emerald-100 inline-flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-emerald-700" />
                {tr('Play on Live App')}
              </button>
              <button
                type="button"
                disabled={recording}
                onClick={handleStartRecord}
                className="min-h-[38px] px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {recording
                  ? `${tr('Recording')} (${Math.round((elapsed / TOTAL_DURATION_SEC) * 100)}%)...`
                  : tr('Record & Download Video (.webm)')}
              </button>
            </div>
          </div>

          {recordError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {tr(recordError)}
            </div>
          )}

          {recordedUrl && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  {tr('Demo Video Ready! Preview or Download to share on WhatsApp / Pitch Deck')}
                </div>
                <a
                  href={recordedUrl}
                  download="BusBite-Platform-Demo.webm"
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {tr('Download BusBite-Demo.webm')}
                </a>
              </div>
              <video
                src={recordedUrl}
                controls
                className="w-full rounded-lg border border-emerald-200 bg-black aspect-video"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
