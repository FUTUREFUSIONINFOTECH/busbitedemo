import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bus,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Home,
  IndianRupee,
  Boxes,
  AlertTriangle,
  PackagePlus,
  Truck,
  History,
  Trash2,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { DesktopBrowserFrame } from '../components/DesktopBrowserFrame';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { LanguageSelector, useLanguage } from '../i18n/indianLanguages';
import type { OrderStatus, PlatformState, Restaurant } from '../types/platform';
import { getApiUrl } from '../config/api';


import highwayHeroImage from '../assets/images/highway_plaza_hero_1795667339325.jpg';
import masalaDosaImage from '../assets/images/masala_dosa_platter_1795667339414.jpg';

interface RestaurantPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

const KITCHEN_HERO_IMG = highwayHeroImage;
const KITCHEN_AVATAR_IMG = masalaDosaImage;

export function RestaurantPortal({ state, post, patch, tourSignal }: RestaurantPortalProps) {
  const { t, tr, td } = useLanguage();
  const approvedRestaurants = useMemo(
    () => state.restaurants.filter((r) => r.status === 'APPROVED'),
    [state.restaurants]
  );

  // Default to Desktop Web Console for Restaurant Admin; user can still switch to 320px Mobile view
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');

  // Restaurant Admin Session (Bearer token strictly in memory)
  const [restSession, setRestSession] = useState<{
    token: string;
    restaurantId: string;
    username: string;
    mustChangePassword: boolean;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState<string>('annapoorna.kitchen');
  const [loginPass, setLoginPass] = useState<string>('');
  const [regOwnerName, setRegOwnerName] = useState<string>('');
  const [regMobile, setRegMobile] = useState<string>('');
  const [regNewPass, setRegNewPass] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  // Mandatory First-Login Password Change State
  const [currPw, setCurrPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirmPw, setConfirmPw] = useState<string>('');
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState<boolean>(false);
  const [pwUpdateNotice, setPwUpdateNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!tourSignal) return;
    if (tourSignal.restaurantMode === 'toggle') {
      setViewMode((prev) => (prev === 'mobile' ? 'desktop' : 'mobile'));
    } else if (tourSignal.restaurantMode) {
      setViewMode(tourSignal.restaurantMode);
    }
  }, [tourSignal?.nonce]);

  const [selectedRestId, setSelectedRestId] = useState<string>(approvedRestaurants[0]?.id || 'rest-a2b');
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'buses' | 'inventory' | 'menu' | 'payouts' | 'profile'>('home');
  const [desktopSection, setDesktopSection] = useState<'dispatch' | 'buses' | 'inventory' | 'menu' | 'payouts' | 'profile'>('dispatch');
  const [orderStageFilter, setOrderStageFilter] = useState<'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED'>('NEW');
  const [pickupVerifyCode, setPickupVerifyCode] = useState<string>('');
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Inventory demo data: isolated per restaurant and persisted in this browser only.
  type InventoryItem = { id: string; name: string; category: string; unit: string; quantity: number; minStock: number; cost: number; supplier: string; updatedAt: string };
  type StockMovement = { id: string; itemName: string; type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; note: string; date: string };
  const inventoryStorageKey = `busbite-inventory-v1:${selectedRestId}`;
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [inventoryModal, setInventoryModal] = useState<'item' | 'stock' | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState({ name: '', category: 'Ingredients', unit: 'kg', quantity: '0', minStock: '5', cost: '0', supplier: '' });
  const [stockForm, setStockForm] = useState({ itemId: '', type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT', quantity: '1', note: '' });

  useEffect(() => {
    setInventoryLoaded(false);
    try {
      const raw = window.localStorage.getItem(inventoryStorageKey);
      const saved = raw ? JSON.parse(raw) as { items?: InventoryItem[]; movements?: StockMovement[] } : null;
      if (saved) {
        setInventoryItems(Array.isArray(saved.items) ? saved.items : []);
        setStockMovements(Array.isArray(saved.movements) ? saved.movements : []);
      } else {
        setInventoryItems([
          { id: 'rice', name: 'Raw Rice', category: 'Grains', unit: 'kg', quantity: 45, minStock: 15, cost: 62, supplier: 'Sri Murugan Traders', updatedAt: new Date().toISOString() },
          { id: 'oil', name: 'Cooking Oil', category: 'Oil & Masala', unit: 'L', quantity: 8, minStock: 10, cost: 145, supplier: 'Lakshmi Agencies', updatedAt: new Date().toISOString() },
          { id: 'tomato', name: 'Tomato', category: 'Vegetables', unit: 'kg', quantity: 0, minStock: 5, cost: 32, supplier: 'Fresh Market', updatedAt: new Date().toISOString() },
          { id: 'coffee', name: 'Coffee Powder', category: 'Beverages', unit: 'kg', quantity: 6, minStock: 2, cost: 380, supplier: 'Coffee Depot', updatedAt: new Date().toISOString() },
        ]);
        setStockMovements([]);
      }
    } catch {
      setInventoryItems([]);
      setStockMovements([]);
    }
    setInventoryLoaded(true);
  }, [inventoryStorageKey]);

  useEffect(() => {
    if (!inventoryLoaded) return;
    window.localStorage.setItem(inventoryStorageKey, JSON.stringify({ items: inventoryItems, movements: stockMovements }));
  }, [inventoryItems, stockMovements, inventoryLoaded, inventoryStorageKey]);

  const saveInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = inventoryForm.name.trim();
    if (!name) return;
    const existing = inventoryItems.find((x) => x.id === editingInventoryId);
    const item: InventoryItem = {
      id: editingInventoryId || `inv-${Date.now()}`, name, category: inventoryForm.category,
      unit: inventoryForm.unit, quantity: Math.max(0, Number(inventoryForm.quantity) || 0),
      minStock: Math.max(0, Number(inventoryForm.minStock) || 0), cost: Math.max(0, Number(inventoryForm.cost) || 0),
      supplier: inventoryForm.supplier.trim(), updatedAt: new Date().toISOString(),
    };
    setInventoryItems((prev) => existing ? prev.map((x) => x.id === item.id ? item : x) : [item, ...prev]);
    setInventoryModal(null); setEditingInventoryId(null);
    setInventoryForm({ name: '', category: 'Ingredients', unit: 'kg', quantity: '0', minStock: '5', cost: '0', supplier: '' });
  };

  const recordStockMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(stockForm.quantity);
    if (!stockForm.itemId || !Number.isFinite(qty) || qty <= 0) return;
    const selected = inventoryItems.find((x) => x.id === stockForm.itemId);
    if (!selected) return;
    if (stockForm.type === 'OUT' && qty > selected.quantity) { window.alert('Stock out quantity cannot exceed available stock.'); return; }
    setInventoryItems((prev) => prev.map((x) => x.id !== selected.id ? x : {
      ...x, quantity: Math.max(0, x.quantity + (stockForm.type === 'IN' ? qty : -qty)), updatedAt: new Date().toISOString(),
    }));
    setStockMovements((prev) => [{ id: `mov-${Date.now()}`, itemName: selected.name, type: stockForm.type, quantity: qty, note: stockForm.note.trim(), date: new Date().toISOString() }, ...prev]);
    setInventoryModal(null); setStockForm({ itemId: '', type: 'IN', quantity: '1', note: '' });
  };

  // Profile & Timings Editor State
  const [profName, setProfName] = useState('');
  const [profOwner, setProfOwner] = useState('');
  const [profMobile, setProfMobile] = useState('');
  const [profCity, setProfCity] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profGst, setProfGst] = useState('');
  const [profFssai, setProfFssai] = useState('');
  const [profHygiene, setProfHygiene] = useState('');
  const [profBank, setProfBank] = useState('');
  const [profPerk, setProfPerk] = useState('');
  const [profStaffDiscount, setProfStaffDiscount] = useState('25');
  const [profOpenTime, setProfOpenTime] = useState('06:00');
  const [profCloseTime, setProfCloseTime] = useState('23:00');
  const [prof24Hours, setProf24Hours] = useState(false);
  const [profClosedToday, setProfClosedToday] = useState(false);
  const [profClosureReason, setProfClosureReason] = useState('');
  const [profSaving, setProfSaving] = useState(false);
  const [profSavedMsg, setProfSavedMsg] = useState<string | null>(null);

  // Add Menu Item State
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCat, setDishCat] = useState('South Indian Classics');
  const [dishPrice, setDishPrice] = useState('180');
  const [dishDesc, setDishDesc] = useState('');
  const [dishVeg, setDishVeg] = useState(true);

  const restaurant = useMemo(
    () =>
      (restSession ? state.restaurants.find((r) => r.id === restSession.restaurantId) : undefined) ||
      state.restaurants.find((r) => r.id === selectedRestId) ||
      approvedRestaurants[0],
    [state.restaurants, restSession, selectedRestId, approvedRestaurants]
  );

  const restaurantOrders = useMemo(
    () =>
      state.orders.filter(
        (o) => o.restaurantId === restaurant?.id && o.paymentStatus !== 'FAILED'
      ),
    [state.orders, restaurant]
  );

  const incomingBuses = useMemo(() => {
    if (!restaurant) return [];
    return state.trips
      .map((trip) => {
        const stopEta = trip.stopEtas.find((s) => s.restaurantId === restaurant.id);
        if (!stopEta) return null;
        const vehicle = state.vehicles.find((v) => v.id === trip.vehicleId);
        const route = state.routes.find((r) => r.id === trip.routeId);
        const queuedOrders = restaurantOrders.filter(
          (o) =>
            o.tripId === trip.id &&
            ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
        );
        return { trip, stopEta, vehicle, route, queuedOrders };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [state.trips, state.vehicles, state.routes, restaurant, restaurantOrders]);

  const restaurantMenu = useMemo(
    () => state.menuItems.filter((m) => m.restaurantId === restaurant?.id),
    [state.menuItems, restaurant]
  );

  const restaurantAlerts = useMemo(
    () =>
      state.notifications
        .filter((n) => n.targetRole === 'RESTAURANT' && (!n.targetId || n.targetId === restaurant?.id))
        .slice(0, 8),
    [state.notifications, restaurant]
  );

  const restaurantSettlements = useMemo(
    () =>
      state.settlements.filter(
        (s) => s.entityType !== 'TRAVELS' && (s.entityId === restaurant?.id || s.restaurantId === restaurant?.id)
      ),
    [state.settlements, restaurant]
  );

  const financialSummary = useMemo(() => {
    const valid = restaurantOrders.filter((o) => o.status !== 'REJECTED' && o.status !== 'CANCELLED');
    const gross = valid.reduce((s, o) => s + o.subtotal, 0);
    const commission = valid.reduce((s, o) => s + o.platformCommission, 0);
    const settledIds = new Set(restaurantSettlements.flatMap((s) => s.orderIds));
    const unsettled = valid.filter((o) => !settledIds.has(o.id));
    const pendingCommissionDue = unsettled.reduce((s, o) => s + o.platformCommission, 0);
    const commissionPaid = restaurantSettlements.reduce((s, st) => s + st.commissionAmount, 0);
    const netRetained = gross - commission;
    return {
      gross,
      commission,
      netRetained,
      pendingCommissionDue,
      commissionPaid,
      unsettledCount: unsettled.length,
      count: valid.length,
    };
  }, [restaurantOrders, restaurantSettlements]);

  useEffect(() => {
    if (!restaurant) return;
    setProfName(restaurant.name || '');
    setProfOwner(restaurant.ownerName || '');
    setProfMobile(restaurant.mobile || '');
    setProfCity(restaurant.city || '');
    setProfAddress(restaurant.address || '');
    setProfGst(restaurant.gstNumber || '');
    setProfFssai(restaurant.fssaiNumber || '');
    setProfHygiene(restaurant.hygieneCertRef || '');
    setProfBank(restaurant.bankAccount || '');
    setProfPerk(restaurant.complimentaryPerk || '');
    setProfStaffDiscount(String(restaurant.crewDiscountPct ?? 25));
    setProfOpenTime(restaurant.openingTime || '06:00');
    setProfCloseTime(restaurant.closingTime || '23:00');
    setProf24Hours(Boolean(restaurant.isOpen24Hours));
    setProfClosedToday(Boolean(restaurant.isClosedToday));
    setProfClosureReason(restaurant.closureReason || '');
  }, [
    restaurant?.id,
    restaurant?.name,
    restaurant?.ownerName,
    restaurant?.mobile,
    restaurant?.city,
    restaurant?.address,
    restaurant?.gstNumber,
    restaurant?.fssaiNumber,
    restaurant?.hygieneCertRef,
    restaurant?.bankAccount,
    restaurant?.complimentaryPerk,
    restaurant?.crewDiscountPct,
    restaurant?.openingTime,
    restaurant?.closingTime,
    restaurant?.isOpen24Hours,
    restaurant?.isClosedToday,
    restaurant?.closureReason,
  ]);

  if (!restaurant) return null;

  const handleSaveProfileAndTimings = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSaving(true);
    setProfSavedMsg(null);
    try {
      await patch(`/api/restaurants/${restaurant.id}`, {
        name: profName.trim() || restaurant.name,
        ownerName: profOwner.trim() || restaurant.ownerName,
        mobile: profMobile.trim() || restaurant.mobile,
        city: profCity.trim() || restaurant.city,
        address: profAddress.trim() || restaurant.address,
        gstNumber: profGst.trim() || restaurant.gstNumber,
        fssaiNumber: profFssai.trim() || restaurant.fssaiNumber,
        hygieneCertRef: profHygiene.trim(),
        bankAccount: profBank.trim() || restaurant.bankAccount,
        complimentaryPerk: profPerk.trim(),
        crewDiscountPct: Math.max(0, Math.min(60, Number(profStaffDiscount) || 0)),
        openingTime: profOpenTime,
        closingTime: profCloseTime,
        isOpen24Hours: prof24Hours,
        isClosedToday: profClosedToday,
        closureReason: profClosedToday ? profClosureReason.trim() : '',
      });
      setProfSavedMsg(tr('Kitchen profile & timings saved successfully.'));
      window.setTimeout(() => setProfSavedMsg(null), 3500);
    } finally {
      setProfSaving(false);
    }
  };

  const advanceOrder = async (orderId: string, status: OrderStatus, reason?: string) => {
    await patch(`/api/orders/${orderId}/status`, {
      status,
      reason,
      actorRole: 'RESTAURANT',
    });
  };

  const handleVerifyPickup = async () => {
    const code = pickupVerifyCode.trim();
    if (!code) return;
    const match = restaurantOrders.find(
      (o) => (o.pickupCode === code || o.id.toLowerCase() === code.toLowerCase()) && o.status === 'READY'
    );
    if (!match) {
      setVerifyFeedback('No READY order matches that pickup PIN.');
      return;
    }
    await advanceOrder(match.id, 'COMPLETED');
    setPickupVerifyCode('');
    setVerifyFeedback(`Completed ${match.id} (${match.passengerName}).`);
    window.setTimeout(() => setVerifyFeedback(null), 3500);
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    await post('/api/menu-items', {
      restaurantId: restaurant.id,
      category: dishCat,
      name: dishName,
      description: dishDesc,
      price: Number(dishPrice) || 150,
      isVeg: dishVeg,
    });
    setDishName('');
    setDishDesc('');
    setShowAddDish(false);
  };

  const activeOrderCount = restaurantOrders.filter((o) =>
    ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
  ).length;

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[28px] p-4 max-h-[75%] overflow-y-auto space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{tr('Kitchen & Bus ETA Alerts')}</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {restaurantAlerts.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            {tr('No new alerts for')} {td(restaurant.name)}.
          </p>
        ) : (
          restaurantAlerts.map((n) => (
            <div key={n.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs">
              <div className="font-semibold text-emerald-950">{td(n.title)}</div>
              <div className="text-slate-600 mt-0.5">{td(n.message)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  const demoPasscode = ['BusBite', '@', '2026'].join('');

  const handlePartnerLogin = async (e?: React.FormEvent, explicitUser?: string, explicitPass?: string) => {
    e?.preventDefault();
    const u = (explicitUser ?? loginUser).trim();
    const p = explicitPass ?? loginPass;
    if (!u || !p) {
      setAuthError('Enter your issued partner username and password.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/partner/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'RESTAURANT', username: u, password: p }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        entity?: Restaurant;
        token?: string;
        mustChangePassword?: boolean;
        error?: string;
      };
      if (!res.ok || !json.entity || !json.token) {
        setAuthError(json.error || 'Restaurant login failed.');
        return;
      }
      setSelectedRestId(json.entity.id);
      setRestSession({
        token: json.token,
        restaurantId: json.entity.id,
        username: json.entity.adminUsername || u.toLowerCase(),
        mustChangePassword: Boolean(json.mustChangePassword),
      });
      if (json.mustChangePassword) {
        setCurrPw(p);
      }
      setLoginPass('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePartnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/partner/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'RESTAURANT',
          username: loginUser.trim(),
          tempPassword: loginPass,
          newPassword: regNewPass.trim() || undefined,
          ownerName: regOwnerName.trim() || undefined,
          mobile: regMobile.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        entity?: Restaurant;
        token?: string;
        mustChangePassword?: boolean;
        error?: string;
      };
      if (!res.ok || !json.entity || !json.token) {
        setAuthError(json.error || 'Could not verify partner credentials.');
        return;
      }
      setSelectedRestId(json.entity.id);
      setRestSession({
        token: json.token,
        restaurantId: json.entity.id,
        username: json.entity.adminUsername || loginUser.trim().toLowerCase(),
        mustChangePassword: Boolean(json.mustChangePassword),
      });
      if (json.mustChangePassword) {
        setCurrPw(loginPass);
      }
      setLoginPass('');
      setRegNewPass('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePartnerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restSession) return;
    setPwErr(null);
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
      const res = await fetch(getApiUrl('/api/auth/partner/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${restSession.token}`,
        },
        body: JSON.stringify({ currentPassword: currPw, newPassword: newPw }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPwErr(json.error || 'Failed to update password.');
        return;
      }
      setRestSession((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      setCurrPw('');
      setNewPw('');
      setConfirmPw('');
      setPwUpdateNotice('Password updated successfully. Use this new password for future logins.');
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPwBusy(false);
    }
  };

  const modeSwitcher = (
    <div className="flex flex-wrap justify-center items-center gap-1.5 max-w-full">
      <div className="inline-flex flex-wrap justify-center items-center gap-1 rounded-xl bg-white border border-emerald-200/80 p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setViewMode('desktop')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
            viewMode === 'desktop'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:text-emerald-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          {tr('Desktop View')}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('mobile')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
            viewMode === 'mobile'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:text-emerald-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          {tr('Mobile App (320px)')}
        </button>
      </div>
      <LanguageSelector compact />
    </div>
  );

  // AUTH GATE 1: Login / Register with Issued Partner Credentials
  if (!restSession) {
    const authFormContent = (
      <div className="space-y-3.5 w-full">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setAuthError(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
              authMode === 'login' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> {t('common.login')}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setAuthError(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
              authMode === 'register' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> {t('common.register')}
          </button>
        </div>

        {authError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            {tr(authError)}
          </div>
        )}

        <form
          onSubmit={authMode === 'login' ? (e) => handlePartnerLogin(e) : handlePartnerRegister}
          className="space-y-3"
        >
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {tr('Partner')} {t('common.username')}
            </label>
            <input
              type="text"
              required
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder="annapoorna.kitchen"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {authMode === 'register' ? tr('Temporary Password') : t('common.password')}
            </label>
            <input
              type="password"
              required
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder={tr('Enter password')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          {authMode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={regOwnerName}
                  onChange={(e) => setRegOwnerName(e.target.value)}
                  placeholder={tr('Owner Name')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                />
                <input
                  type="text"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder={tr('Mobile Number')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {tr('Set New Password')}
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={regNewPass}
                  onChange={(e) => setRegNewPass(e.target.value)}
                  placeholder={tr('New password (min 6 chars)')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 transition-colors"
          >
            {authBusy
              ? tr('Processing...')
              : authMode === 'login'
                ? t('common.login')
                : tr('Register & Activate')}
          </button>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {tr('Quick Kitchen Demo Access')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginUser('annapoorna.kitchen');
                  setLoginPass(demoPasscode);
                  void handlePartnerLogin(undefined, 'annapoorna.kitchen', demoPasscode);
                }}
                className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-bold text-left hover:bg-amber-100/70 transition-colors"
              >
                <div className="font-mono truncate">annapoorna.kitchen</div>
                <div className="text-[10px] font-medium text-amber-700">{tr('1st Login Update')}</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginUser('a2b.kitchen');
                  setLoginPass(demoPasscode);
                  void handlePartnerLogin(undefined, 'a2b.kitchen', demoPasscode);
                }}
                className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] font-bold text-left hover:bg-emerald-100/70 transition-colors"
              >
                <div className="font-mono truncate">a2b.kitchen</div>
                <div className="text-[10px] font-medium text-emerald-700">{tr('Active Kitchen POS')}</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    );

    if (viewMode === 'desktop') {
      return (
        <DesktopBrowserFrame
          url="kitchen.busbite.app/login"
          title={tr('Restaurant Admin — Kitchen Dispatch POS')}
          subtitle={tr('Highway Partner Operations Console')}
          topBarSlot={modeSwitcher}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
            {/* Left Editorial Showcase Panel */}
            <div className="lg:col-span-5 relative overflow-hidden bg-emerald-950 text-white p-8 flex flex-col justify-between">
             <img
  src={KITCHEN_HERO_IMG}
  alt="Highway restaurant"
  className="w-full h-full object-cover"
/>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/80 to-emerald-900/60" />
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-800/70 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold tracking-wide text-emerald-100">
                  <Store className="w-3.5 h-3.5 text-emerald-300" />
                  BusBite {tr('Partner POS')}
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight leading-snug">
                  {tr('Highway Kitchen Command Center')}
                </h2>
                <p className="text-xs text-emerald-100/90 leading-relaxed max-w-sm">
                  {tr('Prepare pre-paid passenger & coach staff orders timed directly to live highway GPS arrivals—zero stopover delays, instant PIN handovers.')}
                </p>
              </div>

              <div className="relative z-10 space-y-2.5 pt-8">
                {[
                  { icon: ClipboardList, title: tr('4-Stage Live Kitchen Board'), desc: tr('Track New Paid, Accepted, Cooking & Ready orders side by side') },
                  { icon: Bus, title: tr('Live Coach ETA Telemetry'), desc: tr('See exact kilometers & arrival countdowns for approaching buses') },
                  { icon: CheckCircle2, title: tr('4-Digit Express PIN Handover'), desc: tr('Instant counter verification at coach halt points') },
                ].map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="flex items-start gap-3 rounded-xl bg-white/10 border border-white/10 p-3 backdrop-blur-xs">
                      <Icon className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-white">{feat.title}</div>
                        <div className="text-[11px] text-emerald-100/80">{feat.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Clean SaaS Auth Form */}
            <div className="lg:col-span-7 bg-[#F6F8F7] p-6 sm:p-10 flex items-center justify-center">
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    {tr('Restaurant Partner Access')}
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {authMode === 'login' ? t('restaurant.loginHeading') : t('restaurant.registerHeading')}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {tr('Sign in with your issued restaurant username and password.')}
                  </p>
                </div>
                {authFormContent}
              </div>
            </div>
          </div>
        </DesktopBrowserFrame>
      );
    }

    return (
      <MobilePhoneFrame
        appName={`BusBite`}
        subtitle={t('nav.restaurant')}
        brandIcon={<Store className="w-5 h-5 text-emerald-900" />}
        topBarSlot={modeSwitcher}
        activeTab="home"
        onTabChange={() => {}}
        tabs={[]}
      >
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-800 text-white p-3.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {tr('Restaurant Partner POS')}
            </div>
            <h1 className="text-sm font-extrabold">
              {authMode === 'login' ? t('restaurant.loginHeading') : t('restaurant.registerHeading')}
            </h1>
            <p className="text-[11px] text-emerald-100">
              {tr('Sign in with your issued restaurant username and password.')}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5">{authFormContent}</div>
        </div>
      </MobilePhoneFrame>
    );
  }

  // AUTH GATE 2: Mandatory First-Login Password Change (Username Remains Unchanged)
  if (restSession.mustChangePassword || restaurant.mustChangePassword) {
    const changeForm = (
      <div className="space-y-4 w-full">
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
            <KeyRound className="w-4 h-4 text-amber-700" />
            {tr('First-Login Password Update')}
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            {t('restaurant.firstLoginNotice')}
          </p>
        </div>

        <form onSubmit={handlePartnerChangePassword} className="space-y-3">
          {pwErr && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
              {tr(pwErr)}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t('common.username')} ({tr('Permanent')})
            </label>
            <input
              type="text"
              readOnly
              value={restaurant.adminUsername || restSession.username}
              className="w-full border border-slate-200 bg-slate-100 text-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Current Temporary Password')}
            </label>
            <input
              type="password"
              required
              value={currPw}
              onChange={(e) => setCurrPw(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t('common.newPassword')} ({tr('min 6 chars')})
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder={tr('Enter new kitchen password')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t('common.confirmPassword')}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder={tr('Re-enter new password')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pwBusy}
              className="flex-1 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              {pwBusy ? tr('Updating...') : t('common.changePassword')}
            </button>
            <button
              type="button"
              onClick={() => setRestSession(null)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              {t('common.logout')}
            </button>
          </div>
        </form>
      </div>
    );

    if (viewMode === 'desktop') {
      return (
        <DesktopBrowserFrame
          url={`kitchen.busbite.app/${restaurant.id}/security`}
          title={`${td(restaurant.name)} — ${tr('Password Update')}`}
          subtitle={tr('Account Activation')}
          topBarSlot={modeSwitcher}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            <div className="lg:col-span-5 relative overflow-hidden bg-emerald-950 text-white p-8 flex flex-col justify-between">
              <img
  src={KITCHEN_AVATAR_IMG}
  alt="Food"
  className="w-full h-full object-cover"
/>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/80 to-emerald-900/65" />
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {tr('Kitchen Account Activation')}
                </div>
                <h2 className="text-2xl font-extrabold">{td(restaurant.name)}</h2>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {tr('Set your private kitchen password to unlock the live order dispatch board, coach ETA radar, and commission ledger.')}
                </p>
              </div>
              <div className="relative z-10 rounded-xl bg-white/10 border border-white/15 p-3.5 text-xs">
                <div className="text-emerald-300 font-semibold">{tr('Partner Username')}</div>
                <div className="font-mono font-bold text-white text-sm mt-0.5">
                  @{restaurant.adminUsername || restSession.username}
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 bg-[#F6F8F7] p-6 sm:p-10 flex items-center justify-center">
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                {changeForm}
              </div>
            </div>
          </div>
        </DesktopBrowserFrame>
      );
    }

    return (
      <MobilePhoneFrame
        appName={td(restaurant.name)}
        subtitle={tr('Account Security')}
        brandIcon={<Store className="w-5 h-5 text-emerald-900" />}
        topBarSlot={modeSwitcher}
        activeTab="home"
        onTabChange={() => {}}
        tabs={[]}
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5">{changeForm}</div>
      </MobilePhoneFrame>
    );
  }

  const profileAndTimingsPanel = (
    <div className="space-y-4">
      <form
        onSubmit={handleSaveProfileAndTimings}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{tr('Kitchen Profile & Timings')}</h3>
            <p className="text-[11px] text-slate-500">
              {tr('Update hotel details, opening & closing hours, 24-hour service, or leave status.')}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
              profClosedToday
                ? 'bg-red-50 text-red-700 border-red-200'
                : prof24Hours
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {profClosedToday
              ? tr('Closed Today')
              : prof24Hours
                ? tr('Open 24 Hours')
                : `${profOpenTime} – ${profCloseTime}`}
          </span>
        </div>

        {profSavedMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900">
            {profSavedMsg}
          </div>
        )}

        {/* Operating Hours & Leave Controls */}
        <div className="rounded-xl bg-[#F4F8F6] border border-emerald-200/80 p-3.5 space-y-3">
          <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            {tr('Opening & Closing Timings')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2.5 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-900">{tr('24 Hours Open')}</div>
                <div className="text-[10px] text-slate-500">{tr('Kitchen operates day & night')}</div>
              </div>
              <input
                type="checkbox"
                checked={prof24Hours}
                onChange={(e) => setProf24Hours(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
            </label>

            <label className="flex items-center justify-between gap-2 rounded-xl bg-white border border-red-200 px-3 py-2.5 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-red-900">{tr('Closed Today / Holiday')}</div>
                <div className="text-[10px] text-red-600">{tr('Mark kitchen temporarily on leave')}</div>
              </div>
              <input
                type="checkbox"
                checked={profClosedToday}
                onChange={(e) => setProfClosedToday(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
            </label>
          </div>

          {!prof24Hours && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Opening Time')}
                </label>
                <input
                  type="time"
                  value={profOpenTime}
                  onChange={(e) => setProfOpenTime(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Closing Time')}
                </label>
                <input
                  type="time"
                  value={profCloseTime}
                  onChange={(e) => setProfCloseTime(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {profClosedToday && (
            <div>
              <label className="block text-[11px] font-semibold text-red-800 mb-1">
                {tr('Leave / Holiday Reason (Optional)')}
              </label>
              <input
                type="text"
                value={profClosureReason}
                onChange={(e) => setProfClosureReason(e.target.value)}
                placeholder={tr('e.g. Festival holiday or maintenance')}
                className="w-full border border-red-200 bg-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
          )}
        </div>

        {/* Editable Kitchen Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Restaurant Name')}
            </label>
            <input
              type="text"
              required
              value={profName}
              onChange={(e) => setProfName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Owner Name')}
            </label>
            <input
              type="text"
              required
              value={profOwner}
              onChange={(e) => setProfOwner(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Mobile Number')}
            </label>
            <input
              type="text"
              required
              value={profMobile}
              onChange={(e) => setProfMobile(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('City')}
            </label>
            <input
              type="text"
              required
              value={profCity}
              onChange={(e) => setProfCity(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Highway Address')}
            </label>
            <input
              type="text"
              value={profAddress}
              onChange={(e) => setProfAddress(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('FSSAI License')}
            </label>
            <input
              type="text"
              value={profFssai}
              onChange={(e) => setProfFssai(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              value={profGst}
              onChange={(e) => setProfGst(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Hygiene Cert')}
            </label>
            <input
              type="text"
              value={profHygiene}
              onChange={(e) => setProfHygiene(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Partner Bank Account')}
            </label>
            <input
              type="text"
              value={profBank}
              onChange={(e) => setProfBank(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Complimentary Offer for Drivers & Conductors')}
            </label>
            <input
              type="text"
              value={profPerk}
              onChange={(e) => setProfPerk(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {tr('Staff Discount %')}
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={profStaffDiscount}
              onChange={(e) => setProfStaffDiscount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={profSaving}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
        >
          {profSaving ? tr('Saving...') : tr('Save Profile & Timings')}
        </button>
      </form>

      {/* Update Password Card */}
      <form
        onSubmit={handlePartnerChangePassword}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <KeyRound className="w-4 h-4 text-emerald-700" />
          {tr('Password Update')}
        </div>
        {pwErr && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            {tr(pwErr)}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="password"
            required
            value={currPw}
            onChange={(e) => setCurrPw(e.target.value)}
            placeholder={tr('Current Password')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder={tr('New Password (min 6 chars)')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder={t('common.confirmPassword')}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="submit"
            disabled={pwBusy}
            className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            {pwBusy ? tr('Updating...') : tr('Update Password')}
          </button>

          <button
            type="button"
            onClick={() => {
              setRestSession(null);
              setPwUpdateNotice(null);
            }}
            className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> {t('common.logout')}
          </button>
        </div>
      </form>
    </div>
  );


  // DESKTOP SAAS CONSOLE VIEW
  if (viewMode === 'desktop') {
    const kanbanColumns: {
      stage: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY';
      title: string;
      dotClass: string;
      headerClass: string;
    }[] = [
      {
        stage: 'NEW',
        title: tr('New Paid'),
        dotClass: 'bg-emerald-500',
        headerClass: 'bg-emerald-50/80 border-b border-emerald-200 text-emerald-950',
      },
      {
        stage: 'ACCEPTED',
        title: tr('Accepted'),
        dotClass: 'bg-sky-500',
        headerClass: 'bg-slate-50 border-b border-slate-200 text-slate-900',
      },
      {
        stage: 'PREPARING',
        title: tr('Cooking'),
        dotClass: 'bg-amber-500',
        headerClass: 'bg-amber-50/80 border-b border-amber-200 text-amber-950',
      },
      {
        stage: 'READY',
        title: tr('Ready for Pickup'),
        dotClass: 'bg-emerald-300',
        headerClass: 'bg-emerald-900 border-b border-emerald-800 text-white',
      },
    ];

    const desktopHistoryOrders = restaurantOrders.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'REJECTED' || o.status === 'CANCELLED'
    );

    const navItems = [
      { id: 'dispatch', label: tr('Kitchen Dispatch'), icon: ClipboardList, badge: activeOrderCount || undefined },
      { id: 'buses', label: tr('Incoming Buses & Map'), icon: Bus, badge: incomingBuses.length || undefined },
      { id: 'inventory', label: tr('Inventory'), icon: Boxes },
      { id: 'menu', label: tr('Menu & Staff Offer'), icon: UtensilsCrossed },
      { id: 'payouts', label: tr('Commission & Dues'), icon: IndianRupee },
      { id: 'profile', label: tr('Profile & Timings'), icon: UserCheck },
    ] as const;

    const hoursLabel = restaurant.isClosedToday
      ? tr('Closed Today')
      : restaurant.isOpen24Hours
        ? tr('24 Hours')
        : `${restaurant.openingTime || '06:00'}–${restaurant.closingTime || '23:00'}`;

    return (
      <DesktopBrowserFrame
        url={`kitchen.busbite.app/${restaurant.id}/${desktopSection}`}
        title={`${td(restaurant.name)} — ${tr('Restaurant Admin Console')}`}
        subtitle={`${td(restaurant.city)} · ${tr('Partner Kitchen POS')}`}
        topBarSlot={modeSwitcher}
      >
        <div className="flex flex-col lg:flex-row min-h-[640px] bg-[#F6F8F7]">
          {/* Dedicated Enterprise Left Sidebar */}
          <aside className="lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Restaurant Kitchen Identity Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <img
                    src={restaurantMenu[0]?.image || KITCHEN_AVATAR_IMG}
                    alt={td(restaurant.name)}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 truncate">{td(restaurant.name)}</div>
                    <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span className="truncate">{td(restaurant.city)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-1.5">
                  <span className="font-mono font-bold text-emerald-950 truncate">
                    @{restaurant.adminUsername || restSession.username}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 shrink-0">
                    <ShieldCheck className="w-3 h-3" /> {tr('Active')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    patch(`/api/restaurants/${restaurant.id}`, {
                      acceptingOrders: !restaurant.acceptingOrders,
                    })
                  }
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    restaurant.acceptingOrders && !restaurant.isClosedToday
                      ? 'bg-emerald-900 text-white hover:bg-emerald-950'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  {restaurant.isClosedToday ? (
                    <>
                      <ToggleLeft className="w-4 h-4" /> {tr('Closed Today')}
                    </>
                  ) : restaurant.acceptingOrders ? (
                    <>
                      <ToggleRight className="w-4 h-4" /> {tr('Accepting Pre-Orders')}
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" /> {tr('Kitchen Paused')}
                    </>
                  )}
                </button>
              </div>

              {/* Navigation Rail */}
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = desktopSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDesktopSection(item.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-emerald-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {'badge' in item && item.badge ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums ${
                            active ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Hours Summary (Sign Out is inside Profile & Timings tab) */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-[11px] text-slate-500 px-1 flex items-center justify-between gap-2">
                <span>{tr('Operating Hours')}</span>
                <span
                  className={`font-mono font-semibold ${
                    restaurant.isClosedToday ? 'text-red-700' : 'text-emerald-800'
                  }`}
                >
                  {hoursLabel}
                </span>
              </div>
            </div>
          </aside>

          {/* Main Workspace Canvas */}
          <main className="flex-1 min-w-0 p-5 sm:p-6 space-y-6">
            {pwUpdateNotice && (
              <div className="bg-emerald-900 text-white rounded-xl px-4 py-2.5 text-xs flex items-center justify-between gap-3">
                <span>{tr(pwUpdateNotice)}</span>
                <button
                  type="button"
                  onClick={() => setPwUpdateNotice(null)}
                  className="text-emerald-300 font-bold shrink-0"
                >
                  {tr('Dismiss')}
                </button>
              </div>
            )}

            {/* Top Workspace Header + Express Pickup PIN Verifier */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  {td(restaurant.name)} · {tr('Kitchen Console')}
                </div>
                <h1 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {desktopSection === 'dispatch' && tr('Live Kitchen Order Dispatch')}
                  {desktopSection === 'buses' && tr('Approaching Buses & Corridor Radar')}
                  {desktopSection === 'inventory' && tr('Inventory & Stock Management')}
                  {desktopSection === 'menu' && tr('Menu Catalog & Staff Offer')}
                  {desktopSection === 'payouts' && tr('Sales Revenue & Commission Ledger')}
                  {desktopSection === 'profile' && tr('Kitchen Profile, Timings & Account')}
                </h1>
              </div>

              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickupVerifyCode}
                    onChange={(e) => setPickupVerifyCode(e.target.value)}
                    placeholder={tr('Verify pickup PIN (e.g. 4821)')}
                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono w-full sm:w-56 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyPickup}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 whitespace-nowrap"
                >
                  {tr('Complete Handover')}
                </button>
                {verifyFeedback && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {tr(verifyFeedback)}
                  </span>
                )}
              </div>
            </div>

            {desktopSection === 'dispatch' && (
              <div className="space-y-6">
                {/* 4-Column KPI Strip */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-500">{tr('New Paid Orders')}</div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-800 mt-1">
                      {restaurantOrders.filter((o) => o.status === 'NEW').length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{tr('Awaiting kitchen accept')}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-500">{tr('Cooking & Ready')}</div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                      {restaurantOrders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{tr('Active prep pipeline')}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-500">{tr('Incoming Buses')}</div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                      {incomingBuses.length}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium mt-0.5">{tr('Live GPS route ETA')}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-500">
                      {tr('Commission Due')} ({restaurant.commissionPct}%)
                    </div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
                      ₹{financialSummary.pendingCommissionDue.toFixed(0)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {tr('Gross')} ₹{financialSummary.gross.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* True 4-Column Desktop Kanban Kitchen Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {kanbanColumns.map((col) => {
                    const colOrders = restaurantOrders.filter((o) => o.status === col.stage);
                    return (
                      <div key={col.stage} className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
                        <div className={`px-3.5 py-2.5 flex items-center justify-between ${col.headerClass}`}>
                          <span className="text-xs font-bold inline-flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                            {col.title}
                          </span>
                          <span className="text-xs font-mono font-bold tabular-nums">{colOrders.length}</span>
                        </div>

                        <div className="p-2.5 space-y-2.5 flex-1 bg-slate-50/60 min-h-[280px]">
                          {colOrders.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400">
                              {tr('No orders in this stage')}
                            </div>
                          ) : (
                            colOrders.map((ord) => {
                              const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
                              const trip = state.trips.find((t) => t.id === ord.tripId);
                              const stopEta = trip?.stopEtas.find((s) => s.restaurantId === restaurant.id);
                              const isStaff = ord.orderRole === 'CREW';
                              return (
                                <div
                                  key={ord.id}
                                  className={`bg-white border rounded-xl p-3 space-y-2 ${
                                    isStaff ? 'border-emerald-400 ring-1 ring-emerald-500/20' : 'border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-mono font-bold text-slate-900 truncate">{ord.id}</span>
                                      {isStaff && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-white text-[9px] font-bold shrink-0">
                                          {tr('STAFF')}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono font-extrabold text-emerald-700 shrink-0">
                                      #{ord.pickupCode}
                                    </span>
                                  </div>

                                  <div className="text-xs text-slate-700 truncate">
                                    <span className="font-semibold text-slate-900">{td(ord.passengerName)}</span> ·{' '}
                                    {ord.seatNumber ? `${tr('Seat')} ${ord.seatNumber}` : tr('No seat')}
                                  </div>

                                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 flex justify-between text-[11px] font-mono">
                                    <span className="font-semibold text-slate-700">{veh?.regNumber}</span>
                                    <span className="text-emerald-700 font-bold tabular-nums">
                                      {stopEta?.passed ? tr('At Stop') : `${stopEta?.etaMinutes ?? ord.etaMinutesAtOrder}m`}
                                    </span>
                                  </div>

                                  <ul className="text-xs text-slate-800 space-y-0.5 border-t border-slate-100 pt-1.5">
                                    {ord.items.map((it) => (
                                      <li key={it.menuItemId} className="flex justify-between gap-2">
                                        <span className="truncate">{it.qty}× {td(it.name)}</span>
                                      </li>
                                    ))}
                                  </ul>

                                  {isStaff && (ord.crewDiscountAmount || ord.complimentaryPerk) && (
                                    <div className="text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 font-medium">
                                      {tr('Staff Offer')}: -₹{(ord.crewDiscountAmount ?? 0).toFixed(0)}
                                      {ord.complimentaryPerk ? ` · ${tr(ord.complimentaryPerk)}` : ''}
                                    </div>
                                  )}

                                  {(ord.specialInstructions || ord.dietaryNotes) && (
                                    <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                      {td(ord.specialInstructions || ord.dietaryNotes || '')}
                                    </div>
                                  )}

                                  <div className="flex gap-1.5 pt-1">
                                    {ord.status === 'NEW' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => advanceOrder(ord.id, 'ACCEPTED')}
                                          className="flex-1 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900"
                                        >
                                          {tr('Accept')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => advanceOrder(ord.id, 'REJECTED', 'Kitchen busy')}
                                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50"
                                        >
                                          {tr('Reject')}
                                        </button>
                                      </>
                                    )}
                                    {ord.status === 'ACCEPTED' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'PREPARING')}
                                        className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                                      >
                                        {tr('Start Cooking')}
                                      </button>
                                    )}
                                    {ord.status === 'PREPARING' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'READY')}
                                        className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                                      >
                                        {tr('Mark Ready')}
                                      </button>
                                    )}
                                    {ord.status === 'READY' && (
                                      <button
                                        type="button"
                                        onClick={() => advanceOrder(ord.id, 'COMPLETED')}
                                        className="w-full py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                                      >
                                        {tr('Confirm Handover')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Below-Board Split: Completed Handovers Table + Live Kitchen Alerts */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {tr('Completed & Closed Orders')} ({desktopHistoryOrders.length})
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {tr('Net Retained')}: ₹{financialSummary.netRetained.toFixed(0)}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">{tr('Order ID')}</th>
                            <th className="py-2.5 px-4 font-semibold">{tr('Passenger & Bus')}</th>
                            <th className="py-2.5 px-4 font-semibold">{tr('Items')}</th>
                            <th className="py-2.5 px-4 font-semibold text-right">{tr('Net Payable')}</th>
                            <th className="py-2.5 px-4 font-semibold">{tr('Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {desktopHistoryOrders.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                {tr('No completed or closed orders yet.')}
                              </td>
                            </tr>
                          ) : (
                            desktopHistoryOrders.map((ord) => {
                              const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
                              return (
                                <tr key={ord.id} className="hover:bg-slate-50/70">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{ord.id}</td>
                                  <td className="py-2.5 px-4">
                                    <span className="font-medium text-slate-800">{td(ord.passengerName)}</span> ·{' '}
                                    <span className="font-mono text-slate-500">{veh?.regNumber}</span>
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600">
                                    {ord.items.map((i) => `${i.qty}× ${td(i.name)}`).join(', ')}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                                    ₹{ord.restaurantPayable.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-4 font-semibold text-emerald-800">{tr(ord.status)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-emerald-700" /> {tr('Live Kitchen & ETA Alerts')}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        {restaurantAlerts.length}
                      </span>
                    </div>
                    {restaurantAlerts.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">{tr('No recent kitchen alerts.')}</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {restaurantAlerts.slice(0, 6).map((n) => (
                          <div key={n.id} className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2.5 text-xs">
                            <div className="font-semibold text-emerald-950">{td(n.title)}</div>
                            <div className="text-slate-600 mt-0.5 text-[11px]">{td(n.message)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {desktopSection === 'buses' && (
              <div className="space-y-5">
                {incomingBuses.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    {tr('No active buses approaching')} {td(restaurant.name)}.
                  </div>
                ) : (
                  incomingBuses.map(({ trip, stopEta, vehicle, route, queuedOrders }) => (
                    <div key={trip.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-mono font-bold text-slate-900">{vehicle?.regNumber}</div>
                          <div className="text-xs text-slate-500">{route ? td(route.name) : ''}</div>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div>
                            <div className="text-slate-400">{tr('Distance')}</div>
                            <div className="font-mono font-bold tabular-nums text-slate-900">
                              {stopEta.distanceRemainingKm} {tr('km')}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">{tr('Live ETA')}</div>
                            <div className="font-mono font-bold tabular-nums text-emerald-700 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {stopEta.passed ? tr('Passed Stop') : `${stopEta.etaMinutes} ${tr('mins')}`}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">{tr('Queued Orders')}</div>
                            <div className="font-mono font-bold tabular-nums text-slate-900">
                              {queuedOrders.length}
                            </div>
                          </div>
                        </div>
                      </div>
                      {route && (
                        <RouteMapVisualizer
                          route={route}
                          trip={trip}
                          restaurants={state.restaurants}
                          highlightedRestaurantId={restaurant.id}
                          compact
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {desktopSection === 'inventory' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Items', value: inventoryItems.length, icon: Boxes, tone: 'text-slate-900' },
                    { label: 'Low Stock', value: inventoryItems.filter((x) => x.quantity > 0 && x.quantity <= x.minStock).length, icon: AlertTriangle, tone: 'text-amber-700' },
                    { label: 'Out of Stock', value: inventoryItems.filter((x) => x.quantity <= 0).length, icon: PackagePlus, tone: 'text-red-700' },
                    { label: 'Stock Value', value: `₹${inventoryItems.reduce((sum, x) => sum + x.quantity * x.cost, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: IndianRupee, tone: 'text-emerald-800' },
                  ].map((kpi) => { const Icon = kpi.icon; return <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4"><div className="flex items-center justify-between text-xs text-slate-500"><span>{kpi.label}</span><Icon className="w-4 h-4" /></div><div className={`text-2xl font-extrabold mt-2 ${kpi.tone}`}>{kpi.value}</div></div>; })}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Ingredient & Raw Material Stock</h2><p className="text-[11px] text-slate-500">Demo inventory saved in this browser for this restaurant</p></div><div className="flex gap-2"><button type="button" onClick={() => { setStockForm({ itemId: inventoryItems[0]?.id || '', type: 'IN', quantity: '1', note: '' }); setInventoryModal('stock'); }} className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-50">Stock In / Out</button><button type="button" onClick={() => { setEditingInventoryId(null); setInventoryForm({ name: '', category: 'Ingredients', unit: 'kg', quantity: '0', minStock: '5', cost: '0', supplier: '' }); setInventoryModal('item'); }} className="px-3 py-2 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"><Plus className="w-3.5 h-3.5 inline mr-1"/>Add Item</button></div></div>
                  <div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} placeholder="Search item or supplier..." className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs"/></div><select value={inventoryFilter} onChange={(e) => setInventoryFilter(e.target.value as typeof inventoryFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"><option value="ALL">All stock</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option></select></div>
                  <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Item','Category','Available','Min. Stock','Unit Cost','Supplier','Status','Actions'].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{inventoryItems.filter((x) => (x.name.toLowerCase().includes(inventorySearch.toLowerCase()) || x.supplier.toLowerCase().includes(inventorySearch.toLowerCase())) && (inventoryFilter === 'ALL' || (inventoryFilter === 'LOW' && x.quantity > 0 && x.quantity <= x.minStock) || (inventoryFilter === 'OUT' && x.quantity <= 0))).map((item) => { const status = item.quantity <= 0 ? 'Out of stock' : item.quantity <= item.minStock ? 'Low stock' : 'In stock'; return <tr key={item.id}><td className="px-3 py-3 font-bold text-slate-900">{item.name}</td><td className="px-3 py-3 text-slate-600">{item.category}</td><td className="px-3 py-3 font-mono font-bold">{item.quantity} {item.unit}</td><td className="px-3 py-3 font-mono">{item.minStock} {item.unit}</td><td className="px-3 py-3 font-mono">₹{item.cost.toFixed(2)}</td><td className="px-3 py-3 text-slate-600">{item.supplier || '—'}</td><td className="px-3 py-3"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.quantity <= 0 ? 'bg-red-50 text-red-700' : item.quantity <= item.minStock ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{status}</span></td><td className="px-3 py-3"><div className="flex gap-2"><button type="button" title="Edit" onClick={() => { setEditingInventoryId(item.id); setInventoryForm({ name: item.name, category: item.category, unit: item.unit, quantity: String(item.quantity), minStock: String(item.minStock), cost: String(item.cost), supplier: item.supplier }); setInventoryModal('item'); }} className="text-emerald-800 font-bold">Edit</button><button type="button" title="Delete" onClick={() => { if (window.confirm(`Delete ${item.name}?`)) setInventoryItems((prev) => prev.filter((x) => x.id !== item.id)); }} className="text-red-600"><Trash2 className="w-3.5 h-3.5"/></button></div></td></tr>; })}{inventoryItems.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400">No inventory items. Add your first ingredient.</td></tr>}</tbody></table></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3"><History className="w-4 h-4 text-emerald-700"/>Stock Movement History</div>{stockMovements.length === 0 ? <p className="text-xs text-slate-400 py-3">No stock movements recorded yet.</p> : <div className="space-y-2 max-h-64 overflow-y-auto">{stockMovements.map((m) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs"><div><div className="font-semibold text-slate-900">{m.itemName} · {m.type}</div><div className="text-[11px] text-slate-500">{m.note || 'No note'} · {new Date(m.date).toLocaleString()}</div></div><div className={`font-mono font-bold ${m.type === 'IN' ? 'text-emerald-700' : 'text-red-700'}`}>{m.type === 'IN' ? '+' : '−'}{m.quantity}</div></div>)}</div>}</div>
                {inventoryModal && <div className="fixed inset-0 z-[100] bg-slate-950/50 flex items-center justify-center p-4"><div className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl space-y-4"><div className="flex items-center justify-between"><h3 className="text-base font-extrabold text-slate-900">{inventoryModal === 'item' ? (editingInventoryId ? 'Edit Inventory Item' : 'Add Inventory Item') : 'Record Stock Movement'}</h3><button type="button" onClick={() => setInventoryModal(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button></div>{inventoryModal === 'item' ? <form onSubmit={saveInventoryItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[{label:'Item name',key:'name',type:'text'},{label:'Category',key:'category',type:'text'},{label:'Unit (kg, L, pcs)',key:'unit',type:'text'},{label:'Current quantity',key:'quantity',type:'number'},{label:'Minimum stock',key:'minStock',type:'number'},{label:'Cost per unit (₹)',key:'cost',type:'number'},{label:'Supplier',key:'supplier',type:'text'}].map((f) => <label key={f.key} className="text-[11px] font-semibold text-slate-600">{f.label}<input required={f.key === 'name'} min={f.type === 'number' ? 0 : undefined} step={f.key === 'cost' ? '0.01' : 'any'} type={f.type} value={inventoryForm[f.key as keyof typeof inventoryForm]} onChange={(e) => setInventoryForm((v) => ({ ...v, [f.key]: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></label>)}<div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setInventoryModal(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs">Cancel</button><button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold">Save Item</button></div></form> : <form onSubmit={recordStockMovement} className="space-y-3"><label className="block text-[11px] font-semibold text-slate-600">Inventory item<select required value={stockForm.itemId} onChange={(e) => setStockForm((v) => ({ ...v, itemId: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"><option value="">Select item</option>{inventoryItems.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.quantity} {x.unit})</option>)}</select></label><label className="block text-[11px] font-semibold text-slate-600">Movement type<select value={stockForm.type} onChange={(e) => setStockForm((v) => ({ ...v, type: e.target.value as typeof v.type }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"><option value="IN">Stock In / Purchase</option><option value="OUT">Stock Out / Usage</option><option value="ADJUSTMENT">Adjustment / Waste</option></select></label><label className="block text-[11px] font-semibold text-slate-600">Quantity<input required min="0.01" step="0.01" type="number" value={stockForm.quantity} onChange={(e) => setStockForm((v) => ({ ...v, quantity: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></label><label className="block text-[11px] font-semibold text-slate-600">Note / Reason<input value={stockForm.note} onChange={(e) => setStockForm((v) => ({ ...v, note: e.target.value }))} placeholder="Purchase, kitchen usage, damaged, expired..." className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setInventoryModal(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs">Cancel</button><button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold">Save Movement</button></div></form>}</div></div>}
              </div>
            )}

            {desktopSection === 'menu' && (
              <div className="space-y-5">
                {/* Active Driver & Conductor Staff Offer Card */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-950">
                      {tr('Driver & Conductor Staff Offer')} ({restaurant.crewDiscountPct ?? 25}% {tr('OFF')})
                    </div>
                    <div className="text-xs text-emerald-800">
                      {tr('Perk')}: {tr(restaurant.complimentaryPerk || 'Complimentary Filter Coffee / Tea for Drivers & Conductors')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-medium">{tr('Staff Discount %')}</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={restaurant.crewDiscountPct ?? 25}
                      onChange={(e) =>
                        patch(`/api/restaurants/${restaurant.id}`, {
                          crewDiscountPct: Number(e.target.value) || 0,
                        })
                      }
                      className="w-16 border border-emerald-300 bg-white rounded-lg px-2 py-1 font-mono font-bold text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900">
                    {tr('Active Dishes')} ({restaurantMenu.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDish((v) => !v)}
                    className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> {tr('Add New Dish')}
                  </button>
                </div>

                {showAddDish && (
                  <form
                    onSubmit={handleCreateDish}
                    className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                  >
                    <input
                      type="text"
                      required
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      placeholder={tr('Dish name')}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs md:col-span-2"
                    />
                    <select
                      value={dishCat}
                      onChange={(e) => setDishCat(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white"
                    >
                      <option value="South Indian Classics">{td('South Indian Classics')}</option>
                      <option value="Rice & Biryani">{td('Rice & Biryani')}</option>
                      <option value="Executive Meals">{td('Executive Meals')}</option>
                      <option value="Beverages & Quick Bites">{td('Beverages & Quick Bites')}</option>
                    </select>
                    <input
                      type="number"
                      min={20}
                      value={dishPrice}
                      onChange={(e) => setDishPrice(e.target.value)}
                      placeholder={`${tr('Price')} ₹`}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <input type="checkbox" checked={dishVeg} onChange={(e) => setDishVeg(e.target.checked)} />
                        {tr('Veg')}
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {restaurantMenu.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={td(item.name)}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{td(item.name)}</div>
                          <div className="text-[11px] text-slate-500 truncate">{td(item.category)}</div>
                          <div className="text-xs font-mono font-semibold text-slate-800 mt-0.5">
                            ₹{item.price} · {item.isVeg ? tr('Veg') : tr('Non-Veg')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => patch(`/api/menu-items/${item.id}`, { available: !item.available })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                          item.available
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.available ? tr('In Stock') : tr('Sold Out')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {desktopSection === 'payouts' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">
                      {tr('Gross Food Sales')} ({financialSummary.count} {tr('orders')})
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      ₹{financialSummary.gross.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="text-xs text-slate-500">{tr('Commission Paid to BusBite')}</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1">
                      ₹{financialSummary.commissionPaid.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {tr('Commission Payable')} ({restaurant.commissionPct}%)
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                        ₹{financialSummary.pendingCommissionDue.toFixed(2)}
                      </div>
                    </div>
                    {financialSummary.unsettledCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          post(`/api/settlements/${restaurant.id}/settle`, { entityType: 'RESTAURANT' })
                        }
                        className="px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 shrink-0"
                      >
                        {tr('Pay Commission')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400">{tr('FSSAI License')}</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.fssaiNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">GSTIN</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.gstNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">{tr('Hygiene Cert')}</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {restaurant.hygieneCertRef || 'HYG-VERIFIED.pdf'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{tr('Partner Bank Account')}</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">{restaurant.bankAccount}</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                    {tr('Commission Paid to BusBite — Receipt Ledger')}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">{tr('Receipt ID')}</th>
                          <th className="py-2.5 px-4 font-medium">{tr('UTR Reference')}</th>
                          <th className="py-2.5 px-4 font-medium">{tr('Orders Covered')}</th>
                          <th className="py-2.5 px-4 font-medium text-right">{tr('Commission Paid')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {restaurantSettlements.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              {tr('No commission payments recorded yet.')}
                            </td>
                          </tr>
                        ) : (
                          restaurantSettlements.map((stl) => (
                            <tr key={stl.id}>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{stl.id}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{stl.utrRef}</td>
                              <td className="py-2.5 px-4 font-mono">{stl.orderIds.length}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-emerald-700">
                                ₹{stl.commissionAmount.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {desktopSection === 'profile' && profileAndTimingsPanel}
          </main>
        </div>
      </DesktopBrowserFrame>
    );
  }

  // MOBILE KITCHEN APP VIEW
  return (
    <MobilePhoneFrame
      appName={td(restaurant.name)}
      subtitle={`${td(restaurant.city)} · BusBite ${tr('Partner')}`}
      brandIcon={<Store className="w-5 h-5 text-emerald-900" />}
      unreadNotifications={restaurantAlerts.length}
      onBellClick={() => setShowNotifications(true)}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      topBarSlot={modeSwitcher}
      overlay={notificationsSheet}
      tabs={[
        { id: 'home', label: tr('Home'), icon: <Home className="w-4 h-4" /> },
        {
          id: 'orders',
          label: tr('Orders'),
          icon: <ClipboardList className="w-4 h-4" />,
          badgeCount: activeOrderCount || undefined,
        },
        {
          id: 'inventory',
          label: tr('Stock'),
          icon: <Boxes className="w-4 h-4" />,
        },
        {
          id: 'buses',
          label: tr('Buses'),
          icon: <Bus className="w-4 h-4" />,
          badgeCount: incomingBuses.length || undefined,
        },
        { id: 'menu', label: tr('Menu'), icon: <UtensilsCrossed className="w-4 h-4" /> },
        { id: 'payouts', label: tr('Comm'), icon: <IndianRupee className="w-4 h-4" /> },
        { id: 'profile', label: t('common.profile'), icon: <UserCheck className="w-4 h-4" /> },
      ]}
    >
      {pwUpdateNotice && (
        <div className="bg-emerald-900 text-white rounded-xl px-3 py-2 text-[11px] flex items-center justify-between gap-2">
          <span>{tr(pwUpdateNotice)}</span>
          <button
            type="button"
            onClick={() => setPwUpdateNotice(null)}
            className="text-emerald-300 font-bold shrink-0"
          >
            {tr('OK')}
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{td(restaurant.name)}</div>
            <div className="text-[10px] font-mono text-emerald-700 truncate">
              @{restaurant.adminUsername || restSession.username} · {tr('Active')} ✓
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              patch(`/api/restaurants/${restaurant.id}`, {
                acceptingOrders: !restaurant.acceptingOrders,
              })
            }
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
              restaurant.acceptingOrders && !restaurant.isClosedToday
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {restaurant.isClosedToday ? (
              <>
                <ToggleLeft className="w-3.5 h-3.5" /> {tr('Closed Today')}
              </>
            ) : restaurant.acceptingOrders ? (
              <>
                <ToggleRight className="w-3.5 h-3.5" /> {tr('Open')}
              </>
            ) : (
              <>
                <ToggleLeft className="w-3.5 h-3.5" /> {tr('Paused')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderStageFilter('NEW');
                setActiveTab('orders');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-3 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">{tr('NEW PAID')}</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-800 mt-0.5">
                {restaurantOrders.filter((o) => o.status === 'NEW').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{tr('Tap to accept')}</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderStageFilter('PREPARING');
                setActiveTab('orders');
              }}
              className="bg-white border border-slate-200 rounded-2xl p-3 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">{tr('COOKING / READY')}</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {restaurantOrders.filter((o) => o.status === 'PREPARING' || o.status === 'READY').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{tr('Active kitchen')}</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('buses')}
              className="bg-white border border-slate-200 rounded-2xl p-3 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">{tr('BUSES NEAR')}</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {incomingBuses.length}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">{tr('Live GPS ETA')}</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payouts')}
              className="bg-white border border-slate-200 rounded-2xl p-3 text-left hover:border-emerald-300"
            >
              <div className="text-[10px] font-bold text-slate-400">{tr('COMM DUE')}</div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5">
                ₹{financialSummary.pendingCommissionDue.toFixed(0)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{restaurant.commissionPct}% BusBite</div>
            </button>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-[11px] space-y-0.5">
            <div className="font-bold text-emerald-950">
              {tr('Staff Offer Active')} · {restaurant.crewDiscountPct ?? 25}% {tr('OFF')}
            </div>
            <div className="text-emerald-800 truncate">
              {tr(restaurant.complimentaryPerk || 'Complimentary Tea / Filter Coffee for Drivers & Conductors')}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-900">{tr('Verify Passenger Pickup PIN')}</div>
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickupVerifyCode}
                  onChange={(e) => setPickupVerifyCode(e.target.value)}
                  placeholder={tr('PIN e.g. 4821')}
                  className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyPickup}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-800 text-white text-[11px] font-semibold shrink-0"
              >
                {tr('Verify')}
              </button>
            </div>
            {verifyFeedback && <div className="text-[11px] font-medium text-emerald-800">{tr(verifyFeedback)}</div>}
          </div>

          {restaurantAlerts[0] && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs">
              <div className="font-bold text-emerald-950">{td(restaurantAlerts[0].title)}</div>
              <div className="text-emerald-900 mt-0.5 text-[11px]">{td(restaurantAlerts[0].message)}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS PIPELINE */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] as const).map((st) => {
              const count = restaurantOrders.filter((o) => o.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStageFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                    orderStageFilter === st
                      ? 'bg-emerald-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {tr(st)} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const list = restaurantOrders.filter((o) => o.status === orderStageFilter);
            if (list.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                  {tr('No orders in this stage')}
                </div>
              );
            }
            return list.map((ord) => {
              const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
              const trip = state.trips.find((t) => t.id === ord.tripId);
              const stopEta = trip?.stopEtas.find((s) => s.restaurantId === restaurant.id);
              const isStaff = ord.orderRole === 'CREW';

              return (
                <div
                  key={ord.id}
                  className={`bg-white border rounded-2xl p-3 space-y-2 ${
                    isStaff ? 'border-emerald-400 ring-1 ring-emerald-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                      {isStaff && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-white text-[9px] font-bold">
                          {tr('STAFF')}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-emerald-700 shrink-0">#{ord.pickupCode}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{td(ord.passengerName)}</span> ·{' '}
                    {ord.seatNumber ? `${tr('Seat')} ${ord.seatNumber}` : tr('No seat')} · {tr(ord.orderType)}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between text-[11px] font-mono">
                    <span>{veh?.regNumber}</span>
                    <span className="text-emerald-700 font-semibold">
                      {stopEta?.passed ? tr('At Stop') : `ETA ${stopEta?.etaMinutes ?? ord.etaMinutesAtOrder}m`}
                    </span>
                  </div>
                  <ul className="text-xs text-slate-800 space-y-0.5">
                    {ord.items.map((it) => (
                      <li key={it.menuItemId}>
                        {it.qty}× {td(it.name)}
                      </li>
                    ))}
                  </ul>
                  {isStaff && (ord.crewDiscountAmount || ord.complimentaryPerk) && (
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 font-medium">
                      {tr('Staff Discount')}: -₹{(ord.crewDiscountAmount ?? 0).toFixed(0)}
                      {ord.complimentaryPerk ? ` · ${tr(ord.complimentaryPerk)}` : ''}
                    </div>
                  )}
                  {(ord.specialInstructions || ord.dietaryNotes) && (
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 rounded-lg px-2.5 py-1">
                      {tr('Note')}: {td(ord.specialInstructions || ord.dietaryNotes || '')}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {ord.status === 'NEW' && (
                      <>
                        <button
                          type="button"
                          onClick={() => advanceOrder(ord.id, 'ACCEPTED')}
                          className="flex-1 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> {tr('Accept')}
                        </button>
                        <button
                          type="button"
                          onClick={() => advanceOrder(ord.id, 'REJECTED', 'Kitchen busy')}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> {tr('Reject')}
                        </button>
                      </>
                    )}
                    {ord.status === 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'PREPARING')}
                        className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                      >
                        {tr('Start Preparing')}
                      </button>
                    )}
                    {ord.status === 'PREPARING' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'READY')}
                        className="w-full py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                      >
                        {tr('Mark Food Ready')}
                      </button>
                    )}
                    {ord.status === 'READY' && (
                      <button
                        type="button"
                        onClick={() => advanceOrder(ord.id, 'COMPLETED')}
                        className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        {tr('Confirm Handover')}
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* TAB 3: INCOMING BUSES & LIVE MAP */}
      {activeTab === 'inventory' && (
        <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div className="bg-white border rounded-xl p-3"><div className="text-[10px] text-slate-500">Total Items</div><div className="text-xl font-bold">{inventoryItems.length}</div></div><div className="bg-white border rounded-xl p-3"><div className="text-[10px] text-slate-500">Low / Out of Stock</div><div className="text-xl font-bold text-amber-700">{inventoryItems.filter((x) => x.quantity <= x.minStock).length}</div></div></div><button type="button" onClick={() => { setStockForm({ itemId: inventoryItems[0]?.id || '', type: 'IN', quantity: '1', note: '' }); setInventoryModal('stock'); }} className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold">Stock In / Out</button><button type="button" onClick={() => { setEditingInventoryId(null); setInventoryForm({ name: '', category: 'Ingredients', unit: 'kg', quantity: '0', minStock: '5', cost: '0', supplier: '' }); setInventoryModal('item'); }} className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold">Add Inventory Item</button>{inventoryItems.map((x) => <div key={x.id} className="bg-white border rounded-xl p-3 flex justify-between gap-2 text-xs"><div><div className="font-bold text-slate-900">{x.name}</div><div className="text-slate-500">{x.category} · Min {x.minStock} {x.unit}</div></div><div className="font-mono font-bold">{x.quantity} {x.unit}</div></div>)}{inventoryModal && <div className="bg-white border rounded-xl p-3 space-y-3"><div className="font-bold text-sm">{inventoryModal === 'item' ? 'Add Inventory Item' : 'Stock Movement'}</div>{inventoryModal === 'item' ? <form onSubmit={saveInventoryItem} className="space-y-2"><input required placeholder="Item name" value={inventoryForm.name} onChange={(e) => setInventoryForm((v) => ({ ...v, name: e.target.value }))} className="w-full border rounded-lg p-2 text-xs"/><input placeholder="Category" value={inventoryForm.category} onChange={(e) => setInventoryForm((v) => ({ ...v, category: e.target.value }))} className="w-full border rounded-lg p-2 text-xs"/><div className="grid grid-cols-2 gap-2"><input placeholder="Unit" value={inventoryForm.unit} onChange={(e) => setInventoryForm((v) => ({ ...v, unit: e.target.value }))} className="border rounded-lg p-2 text-xs"/><input type="number" min="0" placeholder="Quantity" value={inventoryForm.quantity} onChange={(e) => setInventoryForm((v) => ({ ...v, quantity: e.target.value }))} className="border rounded-lg p-2 text-xs"/></div><button className="w-full bg-emerald-800 text-white rounded-lg p-2 text-xs font-bold">Save</button></form> : <form onSubmit={recordStockMovement} className="space-y-2"><select required value={stockForm.itemId} onChange={(e) => setStockForm((v) => ({ ...v, itemId: e.target.value }))} className="w-full border rounded-lg p-2 text-xs"><option value="">Select item</option>{inventoryItems.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={stockForm.type} onChange={(e) => setStockForm((v) => ({ ...v, type: e.target.value as typeof v.type }))} className="w-full border rounded-lg p-2 text-xs"><option value="IN">Stock In</option><option value="OUT">Stock Out</option><option value="ADJUSTMENT">Adjustment / Waste</option></select><input type="number" min="0.01" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm((v) => ({ ...v, quantity: e.target.value }))} className="w-full border rounded-lg p-2 text-xs"/><input placeholder="Reason" value={stockForm.note} onChange={(e) => setStockForm((v) => ({ ...v, note: e.target.value }))} className="w-full border rounded-lg p-2 text-xs"/><button className="w-full bg-emerald-800 text-white rounded-lg p-2 text-xs font-bold">Save Movement</button></form>}<button type="button" onClick={() => setInventoryModal(null)} className="text-xs text-slate-500">Close</button></div>}</div>
      )}

      {activeTab === 'buses' && (
        <div className="space-y-3">
          {incomingBuses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              {tr('No active buses approaching')} {td(restaurant.name)}.
            </div>
          ) : (
            incomingBuses.map(({ trip, stopEta, vehicle, route, queuedOrders }) => (
              <div key={trip.id} className="space-y-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-mono font-bold text-slate-900">{vehicle?.regNumber}</div>
                      <div className="text-[11px] text-slate-500">{route ? td(route.name) : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-emerald-700">
                        {stopEta.passed ? tr('Passed') : `${stopEta.etaMinutes} ${tr('mins')}`}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {stopEta.distanceRemainingKm} {tr('km')} · {queuedOrders.length} {tr('orders')}
                      </div>
                    </div>
                  </div>
                </div>
                {route && (
                  <RouteMapVisualizer
                    route={route}
                    trip={trip}
                    restaurants={state.restaurants}
                    highlightedRestaurantId={restaurant.id}
                    mobileLayout
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: MENU & AVAILABILITY */}
      {activeTab === 'menu' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {tr('Menu Stock')} ({restaurantMenu.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowAddDish((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> {tr('Add Dish')}
            </button>
          </div>

          {showAddDish && (
            <form
              onSubmit={handleCreateDish}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5"
            >
              <input
                type="text"
                required
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder={tr('Dish name')}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dishCat}
                  onChange={(e) => setDishCat(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white"
                >
                  <option value="South Indian Classics">{td('South Indian Classics')}</option>
                  <option value="Rice & Biryani">{td('Rice & Biryani')}</option>
                  <option value="Executive Meals">{td('Executive Meals')}</option>
                  <option value="Beverages & Quick Bites">{td('Beverages & Quick Bites')}</option>
                </select>
                <input
                  type="number"
                  min={20}
                  value={dishPrice}
                  onChange={(e) => setDishPrice(e.target.value)}
                  placeholder={`${tr('Price')} ₹`}
                  className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" checked={dishVeg} onChange={(e) => setDishVeg(e.target.checked)} />
                  {tr('Vegetarian')}
                </label>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                >
                  {tr('Save Dish')}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {restaurantMenu.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={item.image}
                    alt={td(item.name)}
                    className="w-11 h-11 rounded-xl object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{td(item.name)}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      ₹{item.price} · {item.isVeg ? tr('Veg') : tr('Non-Veg')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => patch(`/api/menu-items/${item.id}`, { available: !item.available })}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 ${
                    item.available
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {item.available ? tr('In Stock') : tr('Sold Out')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SALES & COMMISSION PAYABLE TO BUSBITE */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] text-slate-500">{tr('Gross Food Sales')}</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                ₹{financialSummary.gross.toFixed(0)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] text-slate-500">{tr('Comm Due to BusBite')}</div>
              <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                ₹{financialSummary.pendingCommissionDue.toFixed(0)}
              </div>
            </div>
          </div>

          {financialSummary.unsettledCount > 0 && (
            <button
              type="button"
              onClick={() =>
                post(`/api/settlements/${restaurant.id}/settle`, { entityType: 'RESTAURANT' })
              }
              className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"
            >
              {tr('Pay Commission')} (₹{financialSummary.pendingCommissionDue.toFixed(2)})
            </button>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
            <div className="font-bold text-slate-900">{tr('Partner Compliance & Bank')}</div>
            <div className="text-slate-600 text-[11px]">FSSAI: {restaurant.fssaiNumber}</div>
            <div className="text-slate-600 text-[11px]">GST: {restaurant.gstNumber}</div>
            <div className="text-slate-600 text-[11px]">{tr('Hygiene')}: {restaurant.hygieneCertRef || 'HYG-VERIFIED.pdf'}</div>
            <div className="text-slate-600 text-[11px] font-mono">{restaurant.bankAccount}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="text-xs font-bold text-slate-900">{tr('Commission Paid to BusBite')}</div>
            {restaurantSettlements.length === 0 ? (
              <p className="text-xs text-slate-500">{tr('No commission payments recorded yet.')}</p>
            ) : (
              restaurantSettlements.map((stl) => (
                <div key={stl.id} className="border border-slate-100 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex justify-between font-mono font-bold">
                    <span>{stl.id}</span>
                    <span className="text-emerald-700">₹{stl.commissionAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">UTR: {stl.utrRef}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PROFILE & TIMINGS */}
      {activeTab === 'profile' && profileAndTimingsPanel}
    </MobilePhoneFrame>
  );
}
