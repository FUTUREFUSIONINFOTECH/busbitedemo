import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Bus,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coffee,
  Compass,
  CreditCard,
  Home,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  Minus,
  Navigation,
  Phone,
  Play,
  Plus,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  UserPlus,
  UserRound,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { LanguageSelector, useLanguage } from '../i18n/indianLanguages';
import type { Order, OrderType, PlatformState, Restaurant, StaffMember } from '../types/platform';

const DRIVER_AVATAR = '/src/assets/images/driver_profile_avatar_1795775492635.jpg';

interface DriverPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

export function DriverPortal({ state, post, patch, tourSignal }: DriverPortalProps) {
  const { t, tr, td } = useLanguage();
  const [selectedTripId, setSelectedTripId] = useState<string>(state.trips[0]?.id || 'trip-1');
  const [activeTab, setActiveTab] = useState<'home' | 'trips' | 'food' | 'gps' | 'orders' | 'profile'>('home');
  const [crewMode, setCrewMode] = useState<'DRIVER' | 'CONDUCTOR'>('DRIVER');

  // Driver / Crew Auth State (Bearer token held strictly in memory)
  const [driverSession, setDriverSession] = useState<{
    token: string;
    staffId: string;
    mustChangePassword: boolean;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState<string>('kpn.karthik');
  const [loginPass, setLoginPass] = useState<string>('');
  const [regCompanyId, setRegCompanyId] = useState<string>(state.companies[0]?.id || 'comp-kpn');
  const [regVehicleId, setRegVehicleId] = useState<string>(
    state.vehicles.find((v) => v.companyId === (state.companies[0]?.id || 'comp-kpn'))?.id ||
      state.vehicles[0]?.id ||
      ''
  );
  const [regRole, setRegRole] = useState<'DRIVER' | 'CONDUCTOR'>('DRIVER');
  const [regName, setRegName] = useState<string>('');
  const [regMobile, setRegMobile] = useState<string>('');
  const [regLicense, setRegLicense] = useState<string>('');
  const [regUser, setRegUser] = useState<string>('');
  const [regPass, setRegPass] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  // Driver Password Change State
  const [currPw, setCurrPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirmPw, setConfirmPw] = useState<string>('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState<boolean>(false);

  // Crew Food Ordering State
  const [crewRestId, setCrewRestId] = useState<string>('');
  const [crewCart, setCrewCart] = useState<Record<string, number>>({});
  const [crewOrderType, setCrewOrderType] = useState<OrderType>('DINE_IN');
  const [crewOrderBusy, setCrewOrderBusy] = useState<boolean>(false);
  const [crewOrderError, setCrewOrderError] = useState<string | null>(null);
  const [crewIdemKey, setCrewIdemKey] = useState<string>(() => `crew-idem-${Date.now()}`);

  useEffect(() => {
    if (!tourSignal?.driverTab) return;
    setActiveTab(tourSignal.driverTab);
    if (tourSignal.driverTab === 'gps' || tourSignal.driverTab === 'trips') setCrewMode('DRIVER');
    if (tourSignal.driverTab === 'orders') setCrewMode('CONDUCTOR');
  }, [tourSignal?.nonce]);
  const [speedKmh, setSpeedKmh] = useState<number>(68);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [queuedUpdates, setQueuedUpdates] = useState<{ progressPct: number; speedKmh: number; ts: string }[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const trip = useMemo(
    () => state.trips.find((t) => t.id === selectedTripId) || state.trips[0],
    [state.trips, selectedTripId]
  );

  const vehicle = useMemo(
    () => state.vehicles.find((v) => v.id === trip?.vehicleId),
    [state.vehicles, trip]
  );

  const route = useMemo(
    () => state.routes.find((r) => r.id === trip?.routeId),
    [state.routes, trip]
  );

  const driver = useMemo(
    () => state.staff.find((s) => s.id === trip?.driverId),
    [state.staff, trip]
  );

  const conductor = useMemo(
    () => state.staff.find((s) => s.id === trip?.conductorId),
    [state.staff, trip]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === vehicle?.companyId),
    [state.companies, vehicle]
  );

  const routeRestaurants = useMemo(() => {
    if (!route && !trip) return [];
    const part = state.partnerships.find(
      (p) => p.vehicleId === trip?.vehicleId && p.routeId === trip?.routeId && p.status === 'APPROVED'
    );
    const stopIds = (route?.stops || []).map((s) => s.restaurantId).filter(Boolean) as string[];
    const combinedIds = Array.from(new Set([...(part?.restaurantIds || []), ...stopIds]));
    return combinedIds
      .map((id) => state.restaurants.find((r) => r.id === id))
      .filter((r): r is Restaurant => Boolean(r && r.status === 'APPROVED'));
  }, [route, trip, state.partnerships, state.restaurants]);

  useEffect(() => {
    if ((!crewRestId || !routeRestaurants.some((r) => r.id === crewRestId)) && routeRestaurants.length > 0) {
      const openRest =
        routeRestaurants.find((r) => r.acceptingOrders && !r.isClosedToday) || routeRestaurants[0];
      setCrewRestId(openRest.id);
      setCrewCart({});
    }
  }, [routeRestaurants, crewRestId]);

  const selectedCrewRestaurant = useMemo(
    () => state.restaurants.find((r) => r.id === crewRestId) || routeRestaurants[0],
    [state.restaurants, crewRestId, routeRestaurants]
  );

  const crewMenuItems = useMemo(
    () => state.menuItems.filter((m) => m.restaurantId === selectedCrewRestaurant?.id),
    [state.menuItems, selectedCrewRestaurant]
  );

  const crewCartEntries = useMemo(() => {
    return Object.entries(crewCart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, qty]) => {
        const item = state.menuItems.find((m) => m.id === menuItemId);
        return item ? { item, qty } : null;
      })
      .filter((x): x is { item: (typeof state.menuItems)[number]; qty: number } => Boolean(x));
  }, [crewCart, state.menuItems]);

  const crewDiscountPct = selectedCrewRestaurant?.crewDiscountPct ?? 25;
  const crewRawSubtotal = useMemo(
    () => crewCartEntries.reduce((sum, { item, qty }) => sum + item.price * qty, 0),
    [crewCartEntries]
  );
  const crewDiscountAmount = Number(((crewRawSubtotal * crewDiscountPct) / 100).toFixed(2));
  const crewDiscountedSubtotal = Number(Math.max(0, crewRawSubtotal - crewDiscountAmount).toFixed(2));
  const crewGst = Number((crewDiscountedSubtotal * 0.05).toFixed(2));
  const crewTotal = Number((crewDiscountedSubtotal + crewGst).toFixed(2));

  const tripOrders = useMemo(
    () =>
      state.orders.filter(
        (o) =>
          o.tripId === trip?.id &&
          o.paymentStatus === 'VERIFIED' &&
          o.status !== 'REJECTED' &&
          o.status !== 'CANCELLED'
      ),
    [state.orders, trip]
  );

  const crewOrders = useMemo(
    () => tripOrders.filter((o) => o.orderRole === 'CREW'),
    [tripOrders]
  );

  const nextRestaurantStop = useMemo(() => {
    if (!trip) return null;
    return trip.stopEtas.find((s) => s.restaurantId && !s.passed) || null;
  }, [trip]);

  const nextRestaurant = useMemo(
    () =>
      nextRestaurantStop?.restaurantId
        ? state.restaurants.find((r) => r.id === nextRestaurantStop.restaurantId)
        : null,
    [nextRestaurantStop, state.restaurants]
  );

  const driverAlerts = useMemo(() => {
    const items = state.notifications.filter((n) => n.targetRole === 'DRIVER').slice(0, 5);
    return items;
  }, [state.notifications]);

  const loggedInStaff = useMemo(
    () => (driverSession ? state.staff.find((s) => s.id === driverSession.staffId) : undefined),
    [driverSession, state.staff]
  );

  const regCompanyVehicles = useMemo(
    () => state.vehicles.filter((v) => v.companyId === regCompanyId),
    [state.vehicles, regCompanyId]
  );

  const demoPasscode = ['BusBite', '@', '2026'].join('');

  const handleDriverLogin = async (e?: React.FormEvent, explicitUser?: string, explicitPass?: string) => {
    e?.preventDefault();
    const u = (explicitUser ?? loginUser).trim();
    const p = explicitPass ?? loginPass;
    if (!u || !p) {
      setAuthError('Enter your company-issued username and password.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        staff?: StaffMember;
        token?: string;
        mustChangePassword?: boolean;
        error?: string;
      };
      if (!res.ok || !json.staff || !json.token) {
        setAuthError(json.error || 'Driver sign-in failed.');
        return;
      }
      setDriverSession({
        token: json.token,
        staffId: json.staff.id,
        mustChangePassword: Boolean(json.mustChangePassword),
      });
      setCrewMode(json.staff.role);
      const matchedTrip = state.trips.find((t) => t.vehicleId === json.staff!.assignedVehicleId);
      if (matchedTrip) setSelectedTripId(matchedTrip.id);
      if (json.mustChangePassword) {
        setCurrPw(p);
        setActiveTab('profile');
      } else {
        setActiveTab('home');
      }
      setLoginPass('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/driver/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: regCompanyId,
          assignedVehicleId: regVehicleId || regCompanyVehicles[0]?.id,
          role: regRole,
          name: regName,
          mobile: regMobile,
          licenseNo: regLicense,
          username: regUser,
          password: regPass,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        staff?: StaffMember;
        token?: string;
        error?: string;
      };
      if (!res.ok || !json.staff || !json.token) {
        setAuthError(json.error || 'Could not register driver.');
        return;
      }
      setDriverSession({
        token: json.token,
        staffId: json.staff.id,
        mustChangePassword: false,
      });
      setCrewMode(json.staff.role);
      const matchedTrip = state.trips.find((t) => t.vehicleId === json.staff!.assignedVehicleId);
      if (matchedTrip) setSelectedTripId(matchedTrip.id);
      setActiveTab('home');
      setRegName('');
      setRegMobile('');
      setRegLicense('');
      setRegUser('');
      setRegPass('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDriverChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverSession) return;
    setPwErr(null);
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwErr('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwErr('New password and confirmation do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/auth/driver/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${driverSession.token}`,
        },
        body: JSON.stringify({ currentPassword: currPw, newPassword: newPw }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPwErr(json.error || 'Could not update password.');
        return;
      }
      setDriverSession((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      setCurrPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMsg('Password updated successfully.');
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPwBusy(false);
    }
  };

  if (!trip || !vehicle || !route) return null;

  if (!driverSession) {
    return (
      <MobilePhoneFrame
        appName="BusBite"
        subtitle={t('driver.title')}
        brandIcon={
          <img
            src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
            alt="BusBite"
            className="w-full h-full object-contain"
          />
        }
        topBarSlot={<LanguageSelector compact />}
        activeTab="profile"
        onTabChange={() => {}}
        tabs={[]}
      >
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-3.5 py-4 text-white flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center shrink-0">
              <UserRound className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold leading-tight truncate">
                {authMode === 'login' ? t('driver.loginHeading') : t('driver.registerHeading')}
              </h1>
              <p className="text-[10px] text-emerald-100/90 mt-0.5 leading-snug">
                {tr('Sign in with your Bus Travel company driver or conductor credentials.')}
              </p>
            </div>
          </div>

          <div className="p-3 space-y-2.5">

          <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 ${
                authMode === 'login' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              <LogIn className="w-3 h-3" /> {t('common.login')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 ${
                authMode === 'register' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              <UserPlus className="w-3 h-3" /> {t('common.register')}
            </button>
          </div>

          {authError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700 font-medium">
              {tr(authError)}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={(e) => handleDriverLogin(e)} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  {t('common.username')}
                </label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="kpn.karthik"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  {t('common.password')}
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder={tr('Password')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
              >
                {authBusy ? tr('Processing...') : t('common.login')}
              </button>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500">{tr('Quick Sign-In')}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUser('kpn.karthik');
                      setLoginPass(demoPasscode);
                      void handleDriverLogin(undefined, 'kpn.karthik', demoPasscode);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold text-left truncate"
                  >
                    kpn.karthik · {tr('Active')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUser('kpn.ravi');
                      setLoginPass(demoPasscode);
                      void handleDriverLogin(undefined, 'kpn.ravi', demoPasscode);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold text-left truncate"
                  >
                    kpn.ravi · {tr('Driver')}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleDriverRegister} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">{tr('Select Bus Company')}</label>
                <select
                  value={regCompanyId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setRegCompanyId(cid);
                    const firstVeh = state.vehicles.find((v) => v.companyId === cid);
                    setRegVehicleId(firstVeh?.id || '');
                  }}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs bg-white font-semibold"
                >
                  {state.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {td(c.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">{tr('Driver')} / {tr('Conductor')}</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as 'DRIVER' | 'CONDUCTOR')}
                    className="w-full border border-slate-200 rounded-xl px-2 py-2 text-xs bg-white"
                  >
                    <option value="DRIVER">{tr('Driver')}</option>
                    <option value="CONDUCTOR">{tr('Conductor')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">{tr('Assigned Bus')}</label>
                  <select
                    value={regVehicleId}
                    onChange={(e) => setRegVehicleId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2 py-2 text-xs bg-white font-mono"
                  >
                    {regCompanyVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder={tr('Full Name')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder={tr('Mobile Number')}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono"
                />
                <input
                  type="text"
                  value={regLicense}
                  onChange={(e) => setRegLicense(e.target.value)}
                  placeholder={tr('License Number')}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <input
                type="text"
                required
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                placeholder={t('common.username')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <input
                type="password"
                required
                minLength={6}
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                placeholder={t('common.password')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
              >
                {authBusy ? tr('Processing...') : t('common.register')}
              </button>
            </form>
          )}
          </div>
        </div>
      </MobilePhoneFrame>
    );
  }

  const updateCrewCart = (menuItemId: string, delta: number) => {
    setCrewCart((prev) => {
      const next = Math.max(0, (prev[menuItemId] || 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[menuItemId];
      else copy[menuItemId] = next;
      return copy;
    });
  };

  const handlePlaceCrewOrder = async () => {
    if (!selectedCrewRestaurant || crewCartEntries.length === 0) return;
    if (selectedCrewRestaurant.isClosedToday || !selectedCrewRestaurant.acceptingOrders) {
      setCrewOrderError(
        selectedCrewRestaurant.isClosedToday
          ? 'This restaurant is closed today.'
          : 'This restaurant is currently paused.'
      );
      return;
    }
    const activeCrew = crewMode === 'DRIVER' ? driver : conductor;
    setCrewOrderBusy(true);
    setCrewOrderError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: crewIdemKey,
          tripId: trip.id,
          restaurantId: selectedCrewRestaurant.id,
          items: crewCartEntries.map(({ item, qty }) => ({ menuItemId: item.id, qty })),
          orderType: crewOrderType,
          orderRole: 'CREW',
          passengerName: `${activeCrew?.name || 'Bus Staff'} (${crewMode === 'DRIVER' ? 'Driver' : 'Conductor'})`,
          passengerPhone: activeCrew?.mobile || '+91 98400 00000',
          seatNumber: crewMode === 'DRIVER' ? 'Driver Cabin' : 'Conductor Seat',
          specialInstructions: `${crewMode} Staff Meal Offer (${crewDiscountPct}% OFF)`,
          simulateOutcome: 'SUCCESS',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; order?: Order; error?: string };
      if (!res.ok || !json.order) {
        setCrewOrderError(json.error || 'Could not place staff meal order.');
        return;
      }
      setCrewCart({});
      setCrewIdemKey(`crew-idem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`);
      setStatusMessage(`Order Confirmed! Pickup PIN #${json.order.pickupCode} · ${td(selectedCrewRestaurant.name)}`);
    } catch (err) {
      setCrewOrderError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCrewOrderBusy(false);
    }
  };

  const pushGpsUpdate = async (nextPct: number) => {
    const clamped = Math.max(0, Math.min(100, nextPct));
    if (trip.status !== 'IN_PROGRESS') return;

    if (offlineMode) {
      setQueuedUpdates((prev) => [
        ...prev,
        { progressPct: clamped, speedKmh, ts: new Date().toLocaleTimeString() },
      ]);
      setStatusMessage(`Offline buffer: queued GPS point (${clamped}%).`);
      return;
    }

    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/gps`, { progressPct: clamped, speedKmh });
      setStatusMessage(`GPS updated (${clamped}% route progress).`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOffline = async () => {
    if (offlineMode) {
      setOfflineMode(false);
      if (queuedUpdates.length > 0 && trip.status === 'IN_PROGRESS') {
        const latest = queuedUpdates[queuedUpdates.length - 1];
        setBusy(true);
        try {
          await post(`/api/trips/${trip.id}/gps`, {
            progressPct: latest.progressPct,
            speedKmh: latest.speedKmh,
          });
          setStatusMessage(`Network restored: flushed ${queuedUpdates.length} queued GPS update(s).`);
          setQueuedUpdates([]);
        } finally {
          setBusy(false);
        }
      }
    } else {
      setOfflineMode(true);
      setStatusMessage('Offline mode active: GPS packets buffer locally.');
    }
  };

  const handleStartTrip = async () => {
    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/start`);
      setStatusMessage('Trip started. Live GPS broadcasting active.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndTrip = async () => {
    setBusy(true);
    try {
      await post(`/api/trips/${trip.id}/end`);
      setQueuedUpdates([]);
      setStatusMessage('Trip completed. GPS broadcasting stopped.');
    } finally {
      setBusy(false);
    }
  };

  const pendingOrdersCount = tripOrders.filter((o) => o.status !== 'COMPLETED').length;

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[28px] p-4 max-h-[75%] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{tr('Trip & Stop Notifications')}</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
          <div className="font-semibold text-emerald-950">
            {tr('Assigned Bus')} · {vehicle.regNumber}
          </div>
          <div className="text-slate-600 mt-0.5">
            {td(route.name)} · {pendingOrdersCount} {tr('Orders')}
          </div>
        </div>
        {nextRestaurant && nextRestaurantStop && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-900">
              {tr('Next Stop')}: {td(nextRestaurant.name)}
            </div>
            <div className="text-slate-600 mt-0.5">
              {tr(`${nextRestaurantStop.distanceRemainingKm} km`)} · {tr(`${nextRestaurantStop.etaMinutes} mins ETA`)}
            </div>
          </div>
        )}
        {driverAlerts.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-900">{tr(n.title)}</div>
            <div className="text-slate-600 mt-0.5">{tr(n.message)}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <MobilePhoneFrame
      appName="BusBite"
      subtitle={`${tr(crewMode === 'DRIVER' ? 'Driver' : 'Conductor')} · ${vehicle.regNumber}`}
      brandIcon={
        <img
          src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
          alt="BusBite"
          className="w-full h-full object-contain"
        />
      }
      topBarSlot={<LanguageSelector compact />}
      unreadNotifications={pendingOrdersCount || 1}
      onBellClick={() => setShowNotifications(true)}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'orders') setCrewMode('CONDUCTOR');
        if (tab === 'gps' || tab === 'trips') setCrewMode('DRIVER');
      }}
      overlay={notificationsSheet}
      tabs={[
        { id: 'home', label: t('driver.tab.home'), icon: <Home className="w-3.5 h-3.5" /> },
        { id: 'trips', label: t('driver.tab.trips'), icon: <Route className="w-3.5 h-3.5" /> },
        {
          id: 'food',
          label: t('driver.tab.food'),
          icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
          badgeCount: crewOrders.filter((o) => o.status !== 'COMPLETED').length || undefined,
        },
        { id: 'gps', label: t('driver.tab.gps'), icon: <MapPinned className="w-3.5 h-3.5" /> },
        {
          id: 'orders',
          label: t('driver.tab.orders'),
          icon: <ClipboardList className="w-3.5 h-3.5" />,
          badgeCount: pendingOrdersCount || undefined,
        },
        { id: 'profile', label: t('driver.tab.profile'), icon: <UserRound className="w-3.5 h-3.5" /> },
      ]}
    >
      {driverSession.mustChangePassword && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 text-[11px] text-amber-950 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold">{t('common.changePassword')}</div>
            <div className="text-[10px] text-amber-800">{tr('Update your password in Profile tab.')}</div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-2 py-1 rounded-lg bg-amber-700 text-white text-[10px] font-bold shrink-0"
          >
            {tr('Profile')}
          </button>
        </div>
      )}

      {/* Greeting & Trip State Header */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500">
            @{loggedInStaff?.username || (crewMode === 'DRIVER' ? driver?.username : conductor?.username) || 'driver'}
          </p>
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
            {loggedInStaff?.name || (crewMode === 'DRIVER' ? driver?.name : conductor?.name)}
          </h1>
        </div>
        <span
          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide shrink-0 ${
            trip.status === 'IN_PROGRESS'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {tr(trip.status === 'IN_PROGRESS' ? 'Ongoing' : trip.status === 'COMPLETED' ? 'Trip Completed' : 'Ready to Start')}
        </span>
      </div>

      {/* Assigned Trip Switcher + Start/End Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-[0_6px_18px_rgba(6,78,59,0.05)]">
        <div>
          <div className="text-[10px] font-bold text-slate-400">{td(company?.name || '')}</div>
          <select
            value={trip.id}
            onChange={(e) => {
              setSelectedTripId(e.target.value);
              setQueuedUpdates([]);
              setStatusMessage(null);
            }}
            aria-label="Select Assigned Trip"
            className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 mt-1"
          >
            {state.trips.map((tItem) => {
              const v = state.vehicles.find((veh) => veh.id === tItem.vehicleId);
              const r = state.routes.find((rt) => rt.id === tItem.routeId);
              return (
                <option key={tItem.id} value={tItem.id}>
                  {v?.regNumber} — {td(r?.name || '')}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setCrewMode('DRIVER')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors truncate px-1 ${
              crewMode === 'DRIVER' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500'
            }`}
          >
            {tr('Driver')} ({driver?.name.split(' ')[0]})
          </button>
          <button
            type="button"
            onClick={() => setCrewMode('CONDUCTOR')}
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors truncate px-1 ${
              crewMode === 'CONDUCTOR' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-500'
            }`}
          >
            {tr('Conductor')} ({conductor?.name.split(' ')[0]})
          </button>
        </div>

        {trip.status === 'ASSIGNED' || trip.status === 'READY_TO_START' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleStartTrip}
            className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 inline-flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" /> {tr('Start Trip & Enable GPS')}
          </button>
        ) : trip.status === 'IN_PROGRESS' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleEndTrip}
            className="w-full min-h-[44px] px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 inline-flex items-center justify-center gap-2"
          >
            <Square className="w-3.5 h-3.5" /> {tr('End Trip & Stop GPS')}
          </button>
        ) : (
          <div className="text-center py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
            {tr('Trip Completed')}
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="bg-emerald-950 text-white rounded-xl px-3 py-2 text-[11px] flex items-center justify-between gap-2">
          <span>{tr(statusMessage)}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-emerald-300 shrink-0">
            {tr('Close')}
          </button>
        </div>
      )}

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">{tr('Next Stop')}</div>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                {nextRestaurant ? td(nextRestaurant.name) : td(route.destination)}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium truncate">
                {nextRestaurantStop ? td(nextRestaurantStop.stopName) : td(route.destination)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">{tr('Distance')} & {tr('Live ETA')}</div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {nextRestaurantStop ? tr(`${nextRestaurantStop.distanceRemainingKm} km`) : tr('0 km')}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-emerald-700 font-semibold">
                {nextRestaurantStop ? tr(`${nextRestaurantStop.etaMinutes} mins ETA`) : tr('Arrived')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">{tr('Orders')}</div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {pendingOrdersCount} {tr('Active')}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {tripOrders.filter((o) => o.status === 'READY').length} {tr('Ready')}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-bold text-slate-400">{tr('Vehicle')}</div>
              <div className="text-xs font-bold font-mono text-slate-900 mt-1">{vehicle.regNumber}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {td(vehicle.type)} · {tr(`${vehicle.seatingCapacity} seats`)}
              </div>
            </div>
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={nextRestaurant?.id}
            mobileLayout
          />
        </div>
      )}

      {/* TAB 2: TRIPS & PARTNER STOPS */}
      {activeTab === 'trips' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-slate-900">
            {tr('Stops')} & {tr('Orders')}
          </div>
          <div className="divide-y divide-slate-100">
            {trip.stopEtas.map((stopEta) => {
              const rest = stopEta.restaurantId
                ? state.restaurants.find((r) => r.id === stopEta.restaurantId)
                : null;
              const stopOrders = stopEta.restaurantId
                ? tripOrders.filter((o) => o.restaurantId === stopEta.restaurantId)
                : [];
              const dineInCount = stopOrders.filter((o) => o.orderType === 'DINE_IN').length;
              const takeawayCount = stopOrders.filter((o) => o.orderType === 'TAKEAWAY').length;

              return (
                <div key={stopEta.stopId} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        stopEta.passed
                          ? 'text-slate-300'
                          : rest
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {rest ? td(rest.name) : td(stopEta.stopName)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {tr(`${stopEta.kmFromOrigin} km`)}
                        {rest ? ` · ${tr(`${stopOrders.length} orders`)} (${dineInCount}D / ${takeawayCount}T)` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono tabular-nums shrink-0">
                    {stopEta.passed ? (
                      <span className="text-slate-400">{tr('Arrived')}</span>
                    ) : stopEta.kmFromOrigin === 0 ? (
                      <span className="text-slate-500">{td(route.origin)}</span>
                    ) : (
                      <>
                        <div className="font-bold text-emerald-700">{tr(`${stopEta.etaMinutes}m`)}</div>
                        <div className="text-slate-500">{tr(`${stopEta.distanceRemainingKm} km`)}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DRIVER & CONDUCTOR FOOD ORDERING */}
      {activeTab === 'food' && (
        <div className="space-y-2.5">
          {/* Staff Benefit Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-800 text-white p-3 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 tracking-wide">
                <Sparkles className="w-3 h-3" /> {tr('Driver & Conductor Food Benefits')}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-mono font-bold text-emerald-200">
                {tr('Service Fee')} ₹0
              </span>
            </div>
            <div className="text-xs font-bold">
              {tr('Order Staff Meal')} ({tr(crewMode === 'DRIVER' ? 'Driver' : 'Conductor')})
            </div>
            <div className="text-[10px] text-emerald-200">
              {tr('Complimentary Tea / Filter Coffee for Drivers')}
            </div>
          </div>

          {/* Route Highway Restaurants */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-900">
              {tr('Highway Restaurants on Route')} ({routeRestaurants.length})
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {routeRestaurants.map((rest) => {
                const stopEta = trip.stopEtas.find((s) => s.restaurantId === rest.id);
                const selected = selectedCrewRestaurant?.id === rest.id;
                const disc = rest.crewDiscountPct ?? 25;
                const closedToday = Boolean(rest.isClosedToday);
                const paused = !rest.acceptingOrders && !closedToday;
                return (
                  <button
                    key={rest.id}
                    type="button"
                    onClick={() => {
                      if (crewRestId !== rest.id) {
                        setCrewRestId(rest.id);
                        setCrewCart({});
                      }
                    }}
                    className={`min-w-[168px] max-w-[168px] text-left rounded-xl border p-2 shrink-0 transition-colors ${
                      selected
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-[#F4F8F6] text-slate-900 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] gap-1">
                      <span className={`truncate ${selected ? 'text-emerald-200' : 'text-slate-500'}`}>{td(rest.city)}</span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          closedToday
                            ? selected ? 'text-red-200' : 'text-red-700'
                            : paused
                              ? selected ? 'text-amber-200' : 'text-amber-700'
                              : selected ? 'text-emerald-300' : 'text-emerald-700'
                        }`}
                      >
                        {closedToday
                          ? tr('Closed Today')
                          : paused
                            ? tr('Paused')
                            : tr(`${disc}% OFF`)}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold truncate mt-0.5">{td(rest.name)}</div>
                    <div className={`text-[9px] mt-0.5 truncate ${selected ? 'text-emerald-200' : 'text-slate-500'}`}>
                      {stopEta?.passed ? tr('Arrived') : tr(`${stopEta?.etaMinutes ?? '—'}m`)}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCrewRestaurant?.complimentaryPerk && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-900">
                <Coffee className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{td(selectedCrewRestaurant.complimentaryPerk)}</span>
              </div>
            )}

            {selectedCrewRestaurant && (selectedCrewRestaurant.isClosedToday || !selectedCrewRestaurant.acceptingOrders) && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-2.5 py-2 text-[10px] font-semibold text-red-800">
                {selectedCrewRestaurant.isClosedToday
                  ? `${tr('Closed Today / On Leave')}${selectedCrewRestaurant.closureReason ? ` · ${td(selectedCrewRestaurant.closureReason)}` : ''}`
                  : tr('Kitchen Paused')}
              </div>
            )}
          </div>

          {/* Staff Menu */}
          {selectedCrewRestaurant && (
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  {td(selectedCrewRestaurant.name)}
                </span>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[9px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setCrewOrderType('DINE_IN')}
                    className={`px-2 py-0.5 rounded ${
                      crewOrderType === 'DINE_IN' ? 'bg-emerald-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    {tr('Dine-In')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrewOrderType('TAKEAWAY')}
                    className={`px-2 py-0.5 rounded ${
                      crewOrderType === 'TAKEAWAY' ? 'bg-emerald-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    {tr('Takeaway')}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {crewMenuItems.map((item) => {
                  const qty = crewCart[item.id] || 0;
                  const crewUnit = Math.round(item.price * (1 - crewDiscountPct / 100));
                  const kitchenClosed = Boolean(selectedCrewRestaurant.isClosedToday || !selectedCrewRestaurant.acceptingOrders);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-900 truncate">{td(item.name)}</div>
                        <div className="text-[10px] font-mono flex items-center gap-1.5">
                          <span className="font-bold text-emerald-700">₹{crewUnit}</span>
                          <span className="line-through text-slate-400">₹{item.price}</span>
                        </div>
                      </div>

                      {!item.available ? (
                        <span className="text-[9px] font-semibold text-red-600">{tr('Sold Out')}</span>
                      ) : kitchenClosed ? (
                        <span className="text-[9px] font-semibold text-red-600">{tr('Closed')}</span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateCrewCart(item.id, 1)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-800 text-emerald-900 text-[10px] font-semibold hover:bg-emerald-800 hover:text-white shrink-0"
                        >
                          + {tr('Add')}
                        </button>
                      ) : (
                        <div className="inline-flex items-center border border-emerald-900 bg-white rounded-lg overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCrewCart(item.id, -1)}
                            className="h-6 w-6 flex items-center justify-center text-emerald-900"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1.5 text-[11px] font-mono font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCrewCart(item.id, 1)}
                            className="h-6 w-6 flex items-center justify-center text-emerald-900"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {crewCartEntries.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>{tr('Subtotal')}</span>
                    <span className="font-mono">₹{crewRawSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{tr('Staff Discount')} ({crewDiscountPct}%)</span>
                    <span className="font-mono">-₹{crewDiscountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{tr('GST (5%)')} · {tr('Service Fee')} ₹0</span>
                    <span className="font-mono">₹{crewGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 text-xs pt-1 border-t border-slate-100">
                    <span>{tr('Total Payable')}</span>
                    <span className="font-mono">₹{crewTotal.toFixed(2)}</span>
                  </div>

                  {crewOrderError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700">
                      {tr(crewOrderError)}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={
                      crewOrderBusy ||
                      Boolean(selectedCrewRestaurant.isClosedToday) ||
                      !selectedCrewRestaurant.acceptingOrders
                    }
                    onClick={handlePlaceCrewOrder}
                    className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {crewOrderBusy ? tr('Processing...') : `${tr('Pay & Place Order')} · ₹${crewTotal.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Staff Orders & Pickup PINs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                {tr('My Staff Orders')} ({crewOrders.length})
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">{tr('Pickup PIN')}</span>
            </div>

            {crewOrders.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-2 text-center">
                {tr('No orders')}
              </p>
            ) : (
              <div className="space-y-2">
                {crewOrders.map((ord) => {
                  const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
                  return (
                    <div
                      key={ord.id}
                      className="rounded-xl border border-emerald-200 bg-[#F4F8F6] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold text-slate-900">
                            {ord.id} · {tr(ord.orderType)}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">{td(rest?.name || '')}</div>
                          <div className="text-[10px] text-slate-600 truncate">
                            {ord.items.map((i) => `${i.qty}× ${td(i.name)}`).join(', ')}
                          </div>
                        </div>
                        <div className="bg-emerald-950 text-white rounded-lg px-2 py-1 text-center shrink-0">
                          <div className="text-[7px] text-emerald-300 uppercase">PIN</div>
                          <div className="text-xs font-mono font-extrabold tracking-wider">
                            {ord.pickupCode}
                          </div>
                        </div>
                      </div>
                      {ord.complimentaryPerk && (
                        <div className="text-[9px] font-semibold text-emerald-800">
                          {tr('Complimentary')}: {td(ord.complimentaryPerk)}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-emerald-200/70">
                        <span className="font-bold text-emerald-800">{tr(ord.status)}</span>
                        <span className="font-bold text-slate-900">
                          {tr('Paid')} ₹{ord.totalAmount.toFixed(2)}
                          {ord.crewDiscountAmount ? ` (-₹${ord.crewDiscountAmount.toFixed(0)})` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE GPS BROADCAST CONTROLS */}
      {activeTab === 'gps' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900">{tr('Live GPS Telemetry')}</h2>
                <p className="text-[11px] text-slate-500">{tr('Route')}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleOffline}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border ${
                  offlineMode
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {offlineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {offlineMode ? `${tr('Paused')} (${queuedUpdates.length})` : tr('Active')}
              </button>
            </div>

            {trip.status !== 'IN_PROGRESS' ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                {trip.status === 'COMPLETED'
                  ? tr('Trip Completed')
                  : tr('Start Trip & Enable GPS')}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">{tr('Route')}</span>
                    <span className="font-mono font-bold tabular-nums text-slate-900">
                      {trip.progressPct}% ({trip.currentKm}/{tr(`${route.totalKm} km`)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trip.progressPct}
                    onChange={(e) => pushGpsUpdate(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      {tr('68 km/h').replace('68 ', '')}
                    </label>
                    <input
                      type="number"
                      min={25}
                      max={105}
                      value={speedKmh}
                      onChange={(e) => setSpeedKmh(Number(e.target.value) || 65)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => pushGpsUpdate(Math.min(100, trip.progressPct + 6))}
                      className="w-full h-[34px] rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> {tr('Advance Bus')}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400 block text-[9px]">LAT</span>
                    <span>{trip.currentLat.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">LNG</span>
                    <span>{trip.currentLng.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">HDG</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Compass className="w-3 h-3" /> {trip.headingDeg}°
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={nextRestaurant?.id}
            mobileLayout
          />
        </div>
      )}

      {/* TAB 4: CONDUCTOR PASSENGER ORDER ASSIST */}
      {activeTab === 'orders' && (
        <div className="space-y-2.5">
          <div className="px-0.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {tr('Orders')} ({tripOrders.length})
            </h2>
            <span className="text-[11px] text-slate-500">{tr('Conductor')}</span>
          </div>

          {tripOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              {tr('No orders')}
            </div>
          ) : (
            tripOrders.map((ord) => {
              const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
              const isStaff = ord.orderRole === 'CREW';
              return (
                <div
                  key={ord.id}
                  className={`bg-white border rounded-2xl p-3.5 space-y-2 ${
                    isStaff ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{ord.id}</span>
                        <span className="text-emerald-700">PIN #{ord.pickupCode}</span>
                        {isStaff && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-white text-[9px] font-sans font-bold">
                            {tr('Staff Offer')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">
                        {ord.passengerName} · {ord.seatNumber ? tr(`Seat ${ord.seatNumber}`) : tr('Seat number optional')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {td(rest?.name || '')} ({tr(ord.orderType)})
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        ord.status === 'READY'
                          ? 'text-emerald-700'
                          : ord.status === 'COMPLETED'
                            ? 'text-slate-400'
                            : 'text-amber-700'
                      }`}
                    >
                      {tr(ord.status)}
                    </span>
                  </div>

                  {ord.complimentaryPerk && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-900">
                      {td(ord.complimentaryPerk)}
                    </div>
                  )}

                  {ord.status === 'READY' ? (
                    <button
                      type="button"
                      onClick={() =>
                        patch(`/api/orders/${ord.id}/status`, {
                          status: 'COMPLETED',
                          actorRole: 'CONDUCTOR',
                        })
                      }
                      className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {tr('Complete Handover')}
                    </button>
                  ) : ord.status === 'COMPLETED' ? (
                    <div className="text-center text-[11px] text-slate-400">{tr('Picked Up')}</div>
                  ) : (
                    <div className="text-center text-[11px] text-slate-400 inline-flex items-center justify-center gap-1 w-full">
                      <Clock className="w-3 h-3" /> {tr('Cooking')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 6: DRIVER PROFILE, PORTRAIT & PASSWORD */}
      {activeTab === 'profile' && (() => {
        const activeStaff = loggedInStaff || (crewMode === 'DRIVER' ? driver : conductor);
        const staffCompany = state.companies.find((c) => c.id === activeStaff?.companyId) || company;

        return (
          <div className="space-y-2.5">
            {/* Driver Mobile Profile Hero Card */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xs">
              <div className="h-16 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-700 px-3 pt-2.5 flex items-start justify-between">
                <span className="text-[10px] font-semibold text-emerald-200">
                  {tr(activeStaff?.role === 'CONDUCTOR' ? 'Conductor' : 'Driver')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDriverSession(null);
                    setPwMsg(null);
                    setPwErr(null);
                  }}
                  aria-label={t('common.logout')}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>

              <div className="px-3.5 pb-3.5 -mt-9 flex flex-col items-center text-center">
                <div className="relative">
                  <img
                    src={DRIVER_AVATAR}
                    alt={activeStaff?.name || 'Driver Profile'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="h-[68px] w-[68px] rounded-full object-cover object-top ring-4 ring-white shadow-md bg-emerald-100"
                  />
                  <span
                    title={tr('Verified Driver')}
                    className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-600 text-white ring-2 ring-white flex items-center justify-center"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                  </span>
                </div>

                <h2 className="text-sm font-extrabold text-slate-900 mt-2 leading-tight">
                  {activeStaff?.name}
                </h2>
                <div className="text-[10px] font-semibold text-emerald-800 mt-0.5">
                  {td(staffCompany?.name || '')}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  @{activeStaff?.username || 'driver'} · {activeStaff?.licenseNo}
                </div>

                <div className="w-full grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                  <div className="rounded-xl bg-[#F4F8F6] border border-slate-200/70 py-2 px-2 text-center">
                    <div className="text-[9px] text-slate-500">{tr('Mobile Number')}</div>
                    <div className="text-[10px] font-mono font-bold text-slate-900 truncate mt-0.5">
                      {activeStaff?.mobile}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F4F8F6] border border-slate-200/70 py-2 px-2 text-center">
                    <div className="text-[9px] text-slate-500">{tr('Driver Privilege Tier')}</div>
                    <div className="text-[10px] font-bold text-emerald-800 mt-0.5 inline-flex items-center gap-1">
                      <Award className="w-3 h-3 shrink-0" /> {tr('Verified Driver')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grouped Coach & Shift Details */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-emerald-700" /> {tr('Assigned Coach & Shift')}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700">{route.code}</span>
              </div>
              <div className="divide-y divide-slate-100 text-[10px]">
                <div className="px-3.5 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{tr('Vehicle')}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {vehicle.regNumber} · {td(vehicle.type)}
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{tr('Pickup Time')}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {trip.departureTime} → {trip.arrivalTime}
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{tr('Booked')}</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {trip.bookedSeats.length} / {tr(`${vehicle.seatingCapacity} seats`)}
                  </span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-emerald-50/50">
                  <div className="min-w-0">
                    <div className="text-[9px] text-emerald-800 font-semibold">{tr('Route')}</div>
                    <div className="text-[10px] font-bold text-slate-900 truncate">{td(route.name)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('food')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-900 text-white text-[10px] font-bold shrink-0 inline-flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> {tr('Staff Meals')}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Update */}
            <form
              onSubmit={handleDriverChangePassword}
              className={`bg-white border rounded-2xl p-3 space-y-2 ${
                driverSession.mustChangePassword ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  {t('common.changePassword')}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  @{activeStaff?.username}
                </span>
              </div>
              {pwMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[10px] text-emerald-800 font-semibold">
                  {tr(pwMsg)}
                </div>
              )}
              {pwErr && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-[10px] text-red-700 font-semibold">
                  {tr(pwErr)}
                </div>
              )}
              <input
                type="password"
                required
                value={currPw}
                onChange={(e) => setCurrPw(e.target.value)}
                placeholder={tr('Current Password')}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder={t('common.newPassword')}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder={t('common.confirmPassword')}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={pwBusy}
                className="w-full py-2 rounded-xl bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900 disabled:opacity-50 inline-flex items-center justify-center gap-1"
              >
                <Lock className="w-3 h-3" /> {pwBusy ? tr('Saving...') : t('common.changePassword')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setDriverSession(null);
                setPwMsg(null);
                setPwErr(null);
              }}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-white text-red-700 text-xs font-bold hover:bg-red-50 inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> {t('common.logout')}
            </button>
          </div>
        );
      })()}
    </MobilePhoneFrame>
  );
}
