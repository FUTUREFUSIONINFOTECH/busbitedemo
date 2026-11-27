import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Bus,
  Check,
  Download,
  FileSpreadsheet,
  GitBranch,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Link2,
  Lock,
  MapPin,
  Monitor,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import { DesktopBrowserFrame } from '../components/DesktopBrowserFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { INDIAN_LANGUAGES, LanguageSelector, useLanguage } from '../i18n/indianLanguages';
import type { PlatformState } from '../types/platform';

interface SuperAdminPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  onOpenPassengerQr: (qrToken: string) => void;
  tourSignal?: TourSignal | null;
}

type AdminSection =
  | 'dashboard'
  | 'passengers'
  | 'restaurants'
  | 'transport'
  | 'routes'
  | 'partnerships'
  | 'orders'
  | 'payments'
  | 'reports';

export function SuperAdminPortal({
  state,
  post,
  patch,
  onOpenPassengerQr,
  tourSignal,
}: SuperAdminPortalProps) {
  const { t, tr, td } = useLanguage();
  const [section, setSection] = useState<AdminSection>('dashboard');

  useEffect(() => {
    if (!tourSignal?.adminSection) return;
    setSection(tourSignal.adminSection);
  }, [tourSignal?.nonce]);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7d' | 'month'>('today');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderRestFilter, setOrderRestFilter] = useState<string>('ALL');
  const [orderCompanyFilter, setOrderCompanyFilter] = useState<string>('ALL');
  const [orderRoleFilter, setOrderRoleFilter] = useState<'ALL' | 'PASSENGER' | 'CREW'>('ALL');

  // Passenger Directory & Full Detail State
  const [passengerSearch, setPassengerSearch] = useState('');
  const [passengerLangFilter, setPassengerLangFilter] = useState<string>('ALL');
  const [selectedPassengerId, setSelectedPassengerId] = useState<string>(
    state.passengers[0]?.id || ''
  );

  // Credential Issuance / Reset Modal State for Restaurants & Bus Travels
  const [credTarget, setCredTarget] = useState<{
    entityType: 'RESTAURANT' | 'TRAVELS';
    entityId: string;
    name: string;
    currentUsername?: string;
  } | null>(null);
  const [credUsername, setCredUsername] = useState('');
  const [credTempPass, setCredTempPass] = useState('');
  const [credFeedback, setCredFeedback] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);
  const [credBusy, setCredBusy] = useState(false);

  // Forms state
  const [showNewRest, setShowNewRest] = useState(false);
  const [newRest, setNewRest] = useState({
    name: '',
    ownerName: '',
    city: '',
    mobile: '',
    gstNumber: '',
    fssaiNumber: '',
    hygieneCertRef: '',
    bankAccount: '',
    commissionPct: '5',
    crewDiscountPct: '25',
    complimentaryPerk: 'Free Filter Coffee / Masala Tea',
    adminUsername: '',
    tempPassword: '',
  });

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newComp, setNewComp] = useState({
    name: '',
    ownerName: '',
    mobile: '',
    registrationNo: '',
    documentRef: '',
    permitNo: '',
    insuranceRef: '',
    gstNumber: '',
    bankAccount: '',
    ticketCommissionPct: '8',
    adminUsername: '',
    tempPassword: '',
  });

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVeh, setNewVeh] = useState({
    regNumber: '',
    type: 'AC Sleeper' as const,
    seatingCapacity: '36',
    companyId: state.companies[0]?.id || 'comp-kpn',
    routeId: state.routes[0]?.id || 'route-chm',
  });

  const [showNewRoute, setShowNewRoute] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '',
    origin: '',
    destination: '',
    totalKm: '280',
    restaurantIds: [] as string[],
  });

  const [showNewPart, setShowNewPart] = useState(false);
  const [newPart, setNewPart] = useState({
    companyId: state.companies[0]?.id || 'comp-kpn',
    vehicleId: state.vehicles[0]?.id || 'veh-tn45',
    routeId: state.routes[0]?.id || 'route-chm',
    restaurantIds: ['rest-a2b'] as string[],
    startDate: '2026-11-25',
    endDate: '2027-11-25',
  });

  const origin = window.location.origin;

  const settledOrderIds = useMemo(
    () =>
      new Set(
        state.settlements
          .filter((s) => s.entityType !== 'TRAVELS')
          .flatMap((s) => s.orderIds || [])
      ),
    [state.settlements]
  );

  const settledTicketIds = useMemo(
    () =>
      new Set(
        state.settlements
          .filter((s) => s.entityType === 'TRAVELS')
          .flatMap((s) => s.ticketIds || [])
      ),
    [state.settlements]
  );

  // Computed KPI Metrics
  const kpis = useMemo(() => {
    const validOrders = state.orders.filter(
      (o) => o.paymentStatus === 'VERIFIED' && o.status !== 'REJECTED' && o.status !== 'CANCELLED'
    );
    const validTickets = state.tickets.filter((t) => t.status !== 'CANCELLED');
    const completedOrders = state.orders.filter((o) => o.status === 'COMPLETED');
    const cancelledOrders = state.orders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'REJECTED'
    );
    const paymentFailures = state.orders.filter((o) => o.paymentStatus === 'FAILED');
    const grossOrderValue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const foodCommission = validOrders.reduce((s, o) => s + o.platformCommission, 0);
    const ticketCommission = validTickets.reduce((s, t) => s + t.platformCommission, 0);
    const platformCommission = foodCommission + ticketCommission;

    const pendingFoodCommission = validOrders
      .filter((o) => !settledOrderIds.has(o.id))
      .reduce((s, o) => s + o.platformCommission, 0);
    const pendingTicketCommission = validTickets
      .filter((t) => !settledTicketIds.has(t.id))
      .reduce((s, t) => s + t.platformCommission, 0);

    return {
      totalRestaurants: state.restaurants.length,
      activeRestaurants: state.restaurants.filter((r) => r.status === 'APPROVED').length,
      pendingRestaurants: state.restaurants.filter((r) => r.status === 'PENDING').length,
      totalCompanies: state.companies.length,
      totalVehicles: state.vehicles.length,
      registeredDrivers: state.staff.filter((s) => s.role === 'DRIVER').length,
      activeTrips: state.trips.filter((t) => t.status === 'IN_PROGRESS').length,
      totalOrders: state.orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      grossOrderValue,
      platformCommission,
      pendingSettlements: pendingFoodCommission + pendingTicketCommission,
      paymentFailures: paymentFailures.length,
    };
  }, [state, settledOrderIds, settledTicketIds]);

  const filteredOrders = useMemo(() => {
    return state.orders.filter((ord) => {
      if (orderStatusFilter !== 'ALL' && ord.status !== orderStatusFilter) return false;
      if (orderRestFilter !== 'ALL' && ord.restaurantId !== orderRestFilter) return false;
      if (orderCompanyFilter !== 'ALL' && ord.companyId !== orderCompanyFilter) return false;
      const role = ord.orderRole || 'PASSENGER';
      if (orderRoleFilter !== 'ALL' && role !== orderRoleFilter) return false;
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
      const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
      const comp = state.companies.find((c) => c.id === ord.companyId);
      return (
        ord.id.toLowerCase().includes(q) ||
        ord.passengerName.toLowerCase().includes(q) ||
        (ord.seatNumber?.toLowerCase().includes(q) ?? false) ||
        (rest?.name.toLowerCase().includes(q) ?? false) ||
        (veh?.regNumber.toLowerCase().includes(q) ?? false) ||
        (comp?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    state.orders,
    state.restaurants,
    state.vehicles,
    state.companies,
    orderSearch,
    orderStatusFilter,
    orderRestFilter,
    orderCompanyFilter,
    orderRoleFilter,
  ]);

  const restaurantReceivableRows = useMemo(() => {
    return state.restaurants
      .filter((r) => r.status === 'APPROVED')
      .map((rest) => {
        const restOrders = state.orders.filter(
          (o) =>
            o.restaurantId === rest.id &&
            o.paymentStatus === 'VERIFIED' &&
            o.status !== 'REJECTED' &&
            o.status !== 'CANCELLED'
        );
        const gross = restOrders.reduce((s, o) => s + o.subtotal, 0);
        const commission = restOrders.reduce((s, o) => s + o.platformCommission, 0);
        const paidCommission = restOrders
          .filter((o) => settledOrderIds.has(o.id))
          .reduce((s, o) => s + o.platformCommission, 0);
        const unsettled = restOrders.filter((o) => !settledOrderIds.has(o.id));
        const pendingDue = unsettled.reduce((s, o) => s + o.platformCommission, 0);
        return {
          restaurant: rest,
          orderCount: restOrders.length,
          gross,
          commission,
          paidCommission,
          unsettledCount: unsettled.length,
          pendingDue,
        };
      });
  }, [state.restaurants, state.orders, settledOrderIds]);

  const travelsReceivableRows = useMemo(() => {
    return state.companies
      .filter((c) => c.status === 'APPROVED')
      .map((comp) => {
        const compTickets = state.tickets.filter(
          (t) => t.companyId === comp.id && t.status !== 'CANCELLED'
        );
        const grossFare = compTickets.reduce((s, t) => s + t.totalFare, 0);
        const commission = compTickets.reduce((s, t) => s + t.platformCommission, 0);
        const paidCommission = compTickets
          .filter((t) => settledTicketIds.has(t.id))
          .reduce((s, t) => s + t.platformCommission, 0);
        const unsettled = compTickets.filter((t) => !settledTicketIds.has(t.id));
        const pendingDue = unsettled.reduce((s, t) => s + t.platformCommission, 0);
        return {
          company: comp,
          ticketCount: compTickets.length,
          grossFare,
          commission,
          paidCommission,
          unsettledCount: unsettled.length,
          pendingDue,
        };
      });
  }, [state.companies, state.tickets, settledTicketIds]);

  const exportCsv = () => {
    const header = [
      'Order ID',
      'Role',
      'Vehicle',
      'Transport Company',
      'Route',
      'Restaurant',
      'Passenger / Staff',
      'Seat',
      'Mode',
      'Subtotal',
      'Total Paid',
      'BusBite Commission',
      'Payment Status',
      'Order Status',
      'Created At',
    ];
    const rows = state.orders.map((o) => {
      const v = state.vehicles.find((veh) => veh.id === o.vehicleId)?.regNumber || '';
      const comp = state.companies.find((c) => c.id === o.companyId)?.name || '';
      const r = state.routes.find((rt) => rt.id === o.routeId)?.name || '';
      const rest = state.restaurants.find((rs) => rs.id === o.restaurantId)?.name || '';
      return [
        o.id,
        o.orderRole || 'PASSENGER',
        v,
        comp,
        r,
        rest,
        o.passengerName,
        o.seatNumber || 'No Seat',
        o.orderType,
        o.subtotal.toFixed(2),
        o.totalAmount.toFixed(2),
        o.platformCommission.toFixed(2),
        o.paymentStatus,
        o.status,
        o.createdAt,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `busbite-orders-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const demoPasscode = ['BusBite', '@', '2026'].join('');

  const filteredPassengers = useMemo(() => {
    const q = passengerSearch.trim().toLowerCase();
    return state.passengers.filter((p) => {
      if (passengerLangFilter !== 'ALL' && p.preferredLanguage !== passengerLangFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.mobile.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });
  }, [state.passengers, passengerSearch, passengerLangFilter]);

  const selectedPassenger = useMemo(
    () =>
      state.passengers.find((p) => p.id === selectedPassengerId) ||
      filteredPassengers[0] ||
      state.passengers[0],
    [state.passengers, filteredPassengers, selectedPassengerId]
  );

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credTarget) return;
    setCredError(null);
    setCredFeedback(null);
    setCredBusy(true);
    try {
      const res = await fetch('/api/admin/credentials/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: credTarget.entityType,
          entityId: credTarget.entityId,
          username: credUsername.trim(),
          tempPassword: credTempPass,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setCredError(json.error || 'Could not issue credentials.');
        return;
      }
      setCredFeedback(
        `Issued login @${credTarget.currentUsername || credUsername.trim().toLowerCase()} for ${credTarget.name}. Partner must change password on first login.`
      );
      setCredTarget(null);
      setCredTempPass('');
    } catch (err) {
      setCredError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setCredBusy(false);
    }
  };

  const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'dashboard', label: t('admin.overview'), icon: LayoutDashboard },
    { id: 'passengers', label: t('admin.passengers'), icon: Users, badge: state.passengers.length || undefined },
    { id: 'restaurants', label: t('admin.restaurants'), icon: Store, badge: kpis.pendingRestaurants || undefined },
    { id: 'transport', label: t('admin.transport'), icon: Bus },
    { id: 'routes', label: tr('Routes & Stops'), icon: GitBranch },
    { id: 'partnerships', label: tr('Partnerships & QR'), icon: QrCode },
    { id: 'orders', label: t('admin.orders'), icon: ShoppingBag },
    { id: 'payments', label: t('admin.payments'), icon: IndianRupee },
    { id: 'reports', label: t('admin.reports'), icon: FileSpreadsheet },
  ];

  const desktopLabel = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-200/80 px-3.5 py-1.5 shadow-xs text-xs font-semibold text-emerald-950">
        <Monitor className="w-3.5 h-3.5 text-emerald-700" />
        {tr('Super Admin')} — {tr('Desktop Web Console')}
      </div>
      <LanguageSelector compact />
    </div>
  );

  return (
    <DesktopBrowserFrame
      url={`admin.busbite.app/${section}`}
      title={`BusBite ${tr('Super Admin')}`}
      subtitle={tr('Platform Operations & Commission Receivables')}
      topBarSlot={desktopLabel}
    >
      <div className="flex flex-col lg:flex-row min-h-[640px] bg-[#F6F8F7]">
        {/* Enterprise Left Sidebar Navigation */}
        <aside className="lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col justify-between gap-4 print:hidden">
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-emerald-950">BusBite {tr('Governance')}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              </div>
              <div className="text-[11px] text-emerald-800 font-medium">
                {kpis.activeRestaurants} {tr('kitchens')} · {kpis.totalCompanies} {tr('fleets live')}
              </div>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-emerald-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge ? (
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums ${
                          active ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-100 text-amber-800'
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

          <div className="hidden lg:block pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => post('/api/reset-demo')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {tr('Reset Demo Data')}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-5 sm:p-6 space-y-6">
        {/* SECTION 4.1: DASHBOARD */}
        {section === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Super Admin Operations Overview')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Real-time corridor telemetry, partner kitchens, fleet trips, and financial reconciliation')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                {(
                  [
                    { id: 'today', label: tr('Today') },
                    { id: 'yesterday', label: tr('Yesterday') },
                    { id: '7d', label: tr('Last 7 Days') },
                    { id: 'month', label: tr('This Month') },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDateFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      dateFilter === f.id
                        ? 'bg-emerald-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {[
                { label: tr('Active Restaurants'), value: `${kpis.activeRestaurants} / ${kpis.totalRestaurants}`, sub: `${kpis.pendingRestaurants} ${tr('pending approval')}` },
                { label: tr('Transport & Fleet'), value: `${kpis.totalCompanies} ${tr('Cos')} · ${kpis.totalVehicles} ${tr('Bus')}`, sub: `${kpis.registeredDrivers} ${tr('registered drivers')}` },
                { label: tr('Active Live Trips'), value: String(kpis.activeTrips), sub: `${state.trips.length} ${tr('total scheduled')}` },
                { label: tr('Orders (Done / Fail)'), value: `${kpis.totalOrders} (${kpis.completedOrders} / ${kpis.cancelledOrders})`, sub: `${kpis.paymentFailures} ${tr('payment failure(s)')}` },
                { label: tr('Gross Order Value'), value: `₹${kpis.grossOrderValue.toFixed(0)}`, sub: `${tr('Comm')} ₹${kpis.platformCommission.toFixed(2)} · ${tr('Pend')} ₹${kpis.pendingSettlements.toFixed(0)}` },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{kpi.label}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {kpi.value}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums truncate">
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Active Trips Live Map */}
            {state.trips.filter((t) => t.status === 'IN_PROGRESS').map((trip) => {
              const route = state.routes.find((r) => r.id === trip.routeId);
              const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
              if (!route) return null;
              return (
                <div key={trip.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {tr('Live Active Trip')} · {veh?.regNumber}
                    </span>
                    <span className="font-mono tabular-nums">{tr('Progress')} {trip.progressPct}%</span>
                  </div>
                  <RouteMapVisualizer
                    route={route}
                    trip={trip}
                    restaurants={state.restaurants}
                    compact
                  />
                </div>
              );
            })}

            {/* Recent Audit Logs */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">{tr('Platform Security & Financial Audit Log')}</h2>
                <span className="text-xs text-slate-500">{tr('Latest')} {Math.min(6, state.auditLogs.length)} {tr('events')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {state.auditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-slate-900">{log.action}</span>
                      <span className="text-slate-600">{td(log.details)}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {tr(log.actorRole)} · {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4.1B: REGISTERED PASSENGERS & FULL DETAILS */}
        {section === 'passengers' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {tr('Registered Passengers & Full Profile Directory')}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('All Passenger App registrations & profile updates sync in real time to Super Admin with full details, tickets & food orders')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={passengerSearch}
                    onChange={(e) => setPassengerSearch(e.target.value)}
                    placeholder={tr('Search name, @user, mobile, city...')}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-52"
                  />
                </div>
                <select
                  value={passengerLangFilter}
                  onChange={(e) => setPassengerLangFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ALL">{tr('All 23 Languages')}</option>
                  {INDIAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.englishName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-500">{tr('Registered Passengers')}</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{state.passengers.length}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-500">{tr('Active Profiles')}</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                  {state.passengers.filter((p) => p.status === 'ACTIVE').length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-500">{tr('Ticket Bookings')}</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{state.tickets.length}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] text-slate-500">{tr('Food Pre-Orders')}</div>
                <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{state.orders.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Passenger Table */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-medium">{tr('Passenger & @user')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Mobile & Email')}</th>
                        <th className="py-3 px-4 font-medium">{tr('City & Lang')}</th>
                        <th className="py-3 px-4 font-medium text-right">{tr('Activity')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPassengers.map((pax) => {
                        const phoneKey = pax.mobile.replace(/\D/g, '').slice(-8);
                        const paxTickets = state.tickets.filter(
                          (t) =>
                            t.passengerPhone.replace(/\D/g, '').slice(-8) === phoneKey ||
                            t.passengerName.toLowerCase() === pax.name.toLowerCase()
                        );
                        const paxOrders = state.orders.filter(
                          (o) =>
                            o.passengerPhone.replace(/\D/g, '').slice(-8) === phoneKey ||
                            o.passengerName.toLowerCase() === pax.name.toLowerCase()
                        );
                        const lang = INDIAN_LANGUAGES.find((l) => l.code === pax.preferredLanguage);
                        const isSelected = selectedPassenger?.id === pax.id;

                        return (
                          <tr
                            key={pax.id}
                            onClick={() => setSelectedPassengerId(pax.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-50/80' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{pax.name}</div>
                              <div className="font-mono text-[11px] text-emerald-700">@{pax.username}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-slate-800">{pax.mobile}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{pax.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800">{td(pax.city)}</div>
                              <div className="text-[11px] text-slate-500">
                                {lang?.nativeName || pax.preferredLanguage.toUpperCase()}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              <div>{paxTickets.length} {tr('tkt')}</div>
                              <div className="text-emerald-700">{paxOrders.length} {tr('food')}</div>
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span className={pax.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-600'}>
                                {tr(pax.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Passenger Full Details Inspector */}
              {selectedPassenger &&
                (() => {
                  const phoneKey = selectedPassenger.mobile.replace(/\D/g, '').slice(-8);
                  const paxTickets = state.tickets.filter(
                    (t) =>
                      t.passengerPhone.replace(/\D/g, '').slice(-8) === phoneKey ||
                      t.passengerName.toLowerCase() === selectedPassenger.name.toLowerCase()
                  );
                  const paxOrders = state.orders.filter(
                    (o) =>
                      o.passengerPhone.replace(/\D/g, '').slice(-8) === phoneKey ||
                      o.passengerName.toLowerCase() === selectedPassenger.name.toLowerCase()
                  );
                  const lang = INDIAN_LANGUAGES.find((l) => l.code === selectedPassenger.preferredLanguage);

                  return (
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            {tr('Full Passenger Dossier')}
                          </div>
                          <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                            {selectedPassenger.name}
                          </h2>
                          <div className="text-xs font-mono text-slate-500">
                            @{selectedPassenger.username} · ID {selectedPassenger.id}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            patch(`/api/admin/passengers/${selectedPassenger.id}/status`, {
                              status: selectedPassenger.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            selectedPassenger.status === 'ACTIVE'
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {selectedPassenger.status === 'ACTIVE' ? tr('Suspend') : tr('Activate')}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Mobile Number')}</div>
                          <div className="font-mono font-bold text-slate-900 mt-0.5">
                            {selectedPassenger.mobile}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Email')}</div>
                          <div className="font-medium text-slate-900 mt-0.5 truncate">
                            {selectedPassenger.email}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Age & Gender')}</div>
                          <div className="font-semibold text-slate-900 mt-0.5">
                            {selectedPassenger.age || '—'} {tr('yrs')} · {selectedPassenger.gender ? tr(selectedPassenger.gender) : '—'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Preferred Language')}</div>
                          <div className="font-semibold text-emerald-800 mt-0.5">
                            {lang ? `${lang.nativeName} (${lang.englishName})` : selectedPassenger.preferredLanguage}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 col-span-2">
                          <div className="text-[10px] text-slate-400">{tr('Full Residential Address & City')}</div>
                          <div className="font-medium text-slate-900 mt-0.5">
                            {selectedPassenger.address ? td(selectedPassenger.address) : tr('Not provided')} · {td(selectedPassenger.city)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Emergency Contact')}</div>
                          <div className="font-mono font-semibold text-slate-900 mt-0.5">
                            {selectedPassenger.emergencyContact || tr('Not set')}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Govt ID Proof Ref')}</div>
                          <div className="font-mono font-semibold text-slate-900 mt-0.5">
                            {selectedPassenger.idProofRef || tr('Not provided')}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Registration Source')}</div>
                          <div className="font-mono text-slate-700 mt-0.5">
                            {selectedPassenger.registrationSource}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                          <div className="text-[10px] text-slate-400">{tr('Registered / Last Login')}</div>
                          <div className="text-[11px] font-mono text-slate-700 mt-0.5">
                            {new Date(selectedPassenger.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-900">
                          {tr('Linked Bus Tickets')} ({paxTickets.length})
                        </div>
                        {paxTickets.length === 0 ? (
                          <div className="text-[11px] text-slate-400">{tr('No bus tickets linked yet.')}</div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {paxTickets.map((tkt) => (
                              <div
                                key={tkt.id}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-mono font-bold text-slate-900">
                                    {tkt.pnr} · {tr('Seats')} {tkt.seatNumbers.join(', ')}
                                  </div>
                                  <div className="text-slate-500">
                                    {td(tkt.boardingPoint)} → {td(tkt.droppingPoint)}
                                  </div>
                                </div>
                                <div className="text-right font-mono">
                                  <div className="font-bold text-emerald-700">₹{tkt.totalFare}</div>
                                  <div className="text-[10px] text-slate-500">{tr(tkt.status)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-900">
                          {tr('Linked Food Pre-Orders')} ({paxOrders.length})
                        </div>
                        {paxOrders.length === 0 ? (
                          <div className="text-[11px] text-slate-400">{tr('No food pre-orders linked yet.')}</div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {paxOrders.map((ord) => {
                              const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
                              return (
                                <div
                                  key={ord.id}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="font-mono font-bold text-slate-900">
                                      {ord.id} · {rest ? td(rest.name) : ''}
                                    </div>
                                    <div className="text-slate-500 truncate">
                                      {ord.items.map((i) => `${i.qty}× ${td(i.name)}`).join(', ')}
                                    </div>
                                  </div>
                                  <div className="text-right font-mono shrink-0">
                                    <div className="font-bold text-emerald-700">₹{ord.totalAmount.toFixed(2)}</div>
                                    <div className="text-[10px] text-slate-500">{tr(ord.status)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}

        {/* SECTION 4.2: RESTAURANT MANAGEMENT */}
        {section === 'restaurants' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Restaurant Partner Management')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Approve registrations, configure commission rates, FSSAI/GST records, and order acceptance')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRest((v) => !v)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> {tr('Register Restaurant')}
              </button>
            </div>

            {showNewRest && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post('/api/restaurants', {
                    ...newRest,
                    commissionPct: Number(newRest.commissionPct),
                    crewDiscountPct: Number(newRest.crewDiscountPct),
                  });
                  setNewRest({
                    name: '',
                    ownerName: '',
                    city: '',
                    mobile: '',
                    gstNumber: '',
                    fssaiNumber: '',
                    hygieneCertRef: '',
                    bankAccount: '',
                    commissionPct: '5',
                    crewDiscountPct: '25',
                    complimentaryPerk: 'Free Filter Coffee / Masala Tea',
                    adminUsername: '',
                    tempPassword: '',
                  });
                  setShowNewRest(false);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Restaurant Name')}</label>
                  <input
                    required
                    value={newRest.name}
                    onChange={(e) => setNewRest({ ...newRest, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Owner Name')}</label>
                  <input
                    required
                    value={newRest.ownerName}
                    onChange={(e) => setNewRest({ ...newRest, ownerName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Highway City')}</label>
                  <input
                    required
                    value={newRest.city}
                    onChange={(e) => setNewRest({ ...newRest, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Mobile')}</label>
                  <input
                    value={newRest.mobile}
                    onChange={(e) => setNewRest({ ...newRest, mobile: e.target.value })}
                    placeholder="98400 12345"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('GSTIN')}</label>
                  <input
                    value={newRest.gstNumber}
                    onChange={(e) => setNewRest({ ...newRest, gstNumber: e.target.value })}
                    placeholder="33AAACA1234A1Z5"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('FSSAI License')}</label>
                  <input
                    value={newRest.fssaiNumber}
                    onChange={(e) => setNewRest({ ...newRest, fssaiNumber: e.target.value })}
                    placeholder="12422003000112"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Hygiene Cert Ref')}</label>
                  <input
                    value={newRest.hygieneCertRef}
                    onChange={(e) => setNewRest({ ...newRest, hygieneCertRef: e.target.value })}
                    placeholder="FSSAI-HYG-2026-01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Bank Account / IFSC')}</label>
                  <input
                    value={newRest.bankAccount}
                    onChange={(e) => setNewRest({ ...newRest, bankAccount: e.target.value })}
                    placeholder="HDFC ·••• 4412"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Staff Complimentary Perk')}</label>
                  <input
                    value={newRest.complimentaryPerk}
                    onChange={(e) => setNewRest({ ...newRest, complimentaryPerk: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('BusBite Comm %')}</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={newRest.commissionPct}
                    onChange={(e) => setNewRest({ ...newRest, commissionPct: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Staff Discount %')}</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={newRest.crewDiscountPct}
                    onChange={(e) => setNewRest({ ...newRest, crewDiscountPct: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Issued Admin Username')}</label>
                  <input
                    value={newRest.adminUsername}
                    onChange={(e) => setNewRest({ ...newRest, adminUsername: e.target.value })}
                    placeholder="e.g. saravana.kitchen"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Issued Temp Password')}</label>
                  <input
                    value={newRest.tempPassword}
                    onChange={(e) => setNewRest({ ...newRest, tempPassword: e.target.value })}
                    placeholder="Initial password (min 6)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 sm:col-span-2"
                >
                  {tr('Register & Issue Admin Login')}
                </button>
              </form>
            )}

            {credFeedback && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2">
                <span>{credFeedback}</span>
                <button type="button" onClick={() => setCredFeedback(null)} className="text-emerald-700 font-bold">
                  ×
                </button>
              </div>
            )}

            {credTarget?.entityType === 'RESTAURANT' && (
              <form
                onSubmit={handleIssueCredential}
                className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-950 inline-flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    {tr('Issue / Reset Admin Credentials')} · {td(credTarget.name)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCredTarget(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    {tr('Cancel')}
                  </button>
                </div>
                {credError && <div className="text-xs text-red-700 font-semibold">{credError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr('Username')} {credTarget.currentUsername ? `(${tr('Locked')})` : ''}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={Boolean(credTarget.currentUsername)}
                      value={credUsername}
                      onChange={(e) => setCredUsername(e.target.value)}
                      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono ${
                        credTarget.currentUsername ? 'bg-slate-100 text-slate-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {tr('Temporary Password (Partner changes on 1st login)')}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={credTempPass}
                      onChange={(e) => setCredTempPass(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={credBusy}
                    className="py-2 px-4 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"
                  >
                    {credBusy ? tr('Issuing...') : tr('Save & Send to Restaurant')}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Restaurant & City')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Owner & Contact')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Docs & Bank')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Admin Login & Sync')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Comm %')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Commission Earned')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Status')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.restaurants.map((rest) => {
                      const rec = restaurantReceivableRows.find((r) => r.restaurant.id === rest.id);
                      const earned = rec?.commission ?? 0;
                      const hoursLabel = rest.isOpen24Hours
                        ? tr('Open 24 Hours')
                        : rest.openingTime && rest.closingTime
                          ? `${rest.openingTime}–${rest.closingTime}`
                          : td(rest.operatingHours);

                      return (
                        <tr key={rest.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{td(rest.name)}</span>
                              {rest.isClosedToday && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                                  {tr('Closed Today')}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500">
                              {td(rest.city)} · {hoursLabel}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-900">{rest.ownerName}</div>
                            <div className="text-slate-500 font-mono">{rest.mobile}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 space-y-0.5">
                            <div>GST: {rest.gstNumber}</div>
                            <div>FSSAI: {rest.fssaiNumber}</div>
                            <div>Hygiene: {rest.hygieneCertRef || tr('Pending')}</div>
                            <div className="text-emerald-800">{tr('Bank')}: {rest.bankAccount}</div>
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="font-mono font-bold text-slate-900">
                              @{rest.adminUsername || 'unassigned'}
                            </div>
                            {rest.credentialStatus === 'ACTIVE_SYNCED' ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" /> {tr('Password Synced')} ✓
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                  {rest.credentialStatus || 'TEMP_ISSUED'}
                                </span>
                                {rest.tempPasswordPreview && (
                                  <div className="text-[10px] font-mono text-slate-500">
                                    Temp: {rest.tempPasswordPreview}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCredTarget({
                                    entityType: 'RESTAURANT',
                                    entityId: rest.id,
                                    name: rest.name,
                                    currentUsername: rest.adminUsername,
                                  });
                                  setCredUsername(
                                    rest.adminUsername ||
                                      `${rest.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}.kitchen`
                                  );
                                  setCredTempPass(demoPasscode);
                                  setCredError(null);
                                }}
                                className="text-[10px] font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" /> {tr('Issue / Reset Login')}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={rest.commissionPct}
                              onChange={(e) =>
                                patch(`/api/restaurants/${rest.id}`, {
                                  commissionPct: Number(e.target.value) || 5,
                                })
                              }
                              aria-label={`Commission for ${rest.name}`}
                              className="w-14 text-right border border-slate-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <div className="font-bold text-slate-900">₹{earned.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500">
                              <span className="text-emerald-700">{tr('Paid')} ₹{(rec?.paidCommission ?? 0).toFixed(0)}</span>
                              {' · '}
                              <span className="text-amber-700">{tr('Due')} ₹{(rec?.pendingDue ?? 0).toFixed(0)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            <span
                              className={
                                rest.status === 'APPROVED'
                                  ? 'text-emerald-700'
                                  : rest.status === 'PENDING'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                              }
                            >
                              {tr(rest.status)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            {rest.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() =>
                                  patch(`/api/restaurants/${rest.id}`, {
                                    status: 'APPROVED',
                                    acceptingOrders: true,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                              >
                                {tr('Approve')}
                              </button>
                            )}
                            {rest.status === 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  patch(`/api/restaurants/${rest.id}`, {
                                    status: 'SUSPENDED',
                                    acceptingOrders: false,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                              >
                                {tr('Suspend')}
                              </button>
                            ) : rest.status === 'SUSPENDED' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  patch(`/api/restaurants/${rest.id}`, {
                                    status: 'APPROVED',
                                    acceptingOrders: true,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                {tr('Reactivate')}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4.3: TRANSPORT & FLEET */}
        {section === 'transport' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Transport Companies & Vehicles')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Approve operators, manage fleet registrations, and assign drivers & conductors')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCompany((v) => !v)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" /> {tr('Add Company')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewVehicle((v) => !v)}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {tr('Add Vehicle')}
                </button>
              </div>
            </div>

            {showNewCompany && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post('/api/companies', {
                    ...newComp,
                    ticketCommissionPct: Number(newComp.ticketCommissionPct) || 8,
                  });
                  setNewComp({
                    name: '',
                    ownerName: '',
                    mobile: '',
                    registrationNo: '',
                    documentRef: '',
                    permitNo: '',
                    insuranceRef: '',
                    gstNumber: '',
                    bankAccount: '',
                    ticketCommissionPct: '8',
                    adminUsername: '',
                    tempPassword: '',
                  });
                  setShowNewCompany(false);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    required
                    value={newComp.name}
                    onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Owner Name</label>
                  <input
                    required
                    value={newComp.ownerName}
                    onChange={(e) => setNewComp({ ...newComp, ownerName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile</label>
                  <input
                    value={newComp.mobile}
                    onChange={(e) => setNewComp({ ...newComp, mobile: e.target.value })}
                    placeholder="98400 77889"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reg Number</label>
                  <input
                    value={newComp.registrationNo}
                    onChange={(e) => setNewComp({ ...newComp, registrationNo: e.target.value })}
                    placeholder="TN-01-TR-2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fleet RC Doc Ref</label>
                  <input
                    value={newComp.documentRef}
                    onChange={(e) => setNewComp({ ...newComp, documentRef: e.target.value })}
                    placeholder="RC-TN-FLEET-2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Permit No</label>
                  <input
                    value={newComp.permitNo}
                    onChange={(e) => setNewComp({ ...newComp, permitNo: e.target.value })}
                    placeholder="STA-TN-9844"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Insurance Ref</label>
                  <input
                    value={newComp.insuranceRef}
                    onChange={(e) => setNewComp({ ...newComp, insuranceRef: e.target.value })}
                    placeholder="INS-2026-991"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN</label>
                  <input
                    value={newComp.gstNumber}
                    onChange={(e) => setNewComp({ ...newComp, gstNumber: e.target.value })}
                    placeholder="33AAACB1234K1Z2"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bank Account / IFSC</label>
                  <input
                    value={newComp.bankAccount}
                    onChange={(e) => setNewComp({ ...newComp, bankAccount: e.target.value })}
                    placeholder="ICICI ·••• 8821"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Issued Admin Username</label>
                  <input
                    value={newComp.adminUsername}
                    onChange={(e) => setNewComp({ ...newComp, adminUsername: e.target.value })}
                    placeholder="e.g. parveen.travels"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Issued Temp Password</label>
                  <input
                    value={newComp.tempPassword}
                    onChange={(e) => setNewComp({ ...newComp, tempPassword: e.target.value })}
                    placeholder="Initial password (min 6)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2 items-end sm:col-span-2">
                  <div className="w-24">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ticket Comm %</label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={newComp.ticketCommissionPct}
                      onChange={(e) => setNewComp({ ...newComp, ticketCommissionPct: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                  >
                    Register & Issue Login
                  </button>
                </div>
              </form>
            )}

            {credFeedback && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2">
                <span>{credFeedback}</span>
                <button type="button" onClick={() => setCredFeedback(null)} className="text-emerald-700 font-bold">
                  ×
                </button>
              </div>
            )}

            {credTarget?.entityType === 'TRAVELS' && (
              <form
                onSubmit={handleIssueCredential}
                className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-950 inline-flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    Issue / Reset Admin Credentials · {credTarget.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCredTarget(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
                {credError && <div className="text-xs text-red-700 font-semibold">{credError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Username {credTarget.currentUsername ? '(Locked)' : ''}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={Boolean(credTarget.currentUsername)}
                      value={credUsername}
                      onChange={(e) => setCredUsername(e.target.value)}
                      className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono ${
                        credTarget.currentUsername ? 'bg-slate-100 text-slate-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Temporary Password (Company updates on 1st login)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={credTempPass}
                      onChange={(e) => setCredTempPass(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={credBusy}
                    className="py-2 px-4 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"
                  >
                    {credBusy ? 'Issuing...' : 'Save & Send to Bus Travels'}
                  </button>
                </div>
              </form>
            )}

            {showNewVehicle && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post('/api/vehicles', {
                    ...newVeh,
                    seatingCapacity: Number(newVeh.seatingCapacity),
                  });
                  setNewVeh({ ...newVeh, regNumber: '' });
                  setShowNewVehicle(false);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Reg No</label>
                  <input
                    required
                    value={newVeh.regNumber}
                    onChange={(e) => setNewVeh({ ...newVeh, regNumber: e.target.value })}
                    placeholder="TN 38 XY 9012"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transport Company</label>
                  <select
                    value={newVeh.companyId}
                    onChange={(e) => setNewVeh({ ...newVeh, companyId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    {state.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Route</label>
                  <select
                    value={newVeh.routeId}
                    onChange={(e) => setNewVeh({ ...newVeh, routeId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    {state.routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Save Vehicle
                </button>
              </form>
            )}

            {/* Companies Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">
                {tr('Registered Transport Companies')} ({state.companies.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Company')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Owner & Mobile')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Compliance Docs & Bank')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Admin Login & Sync')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Ticket Comm %')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Ticket Comm Earned')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Status')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.companies.map((c) => {
                      const rec = travelsReceivableRows.find((r) => r.company.id === c.id);
                      const earned = rec?.commission ?? 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-semibold text-slate-900">{td(c.name)}</td>
                          <td className="py-3 px-4">
                            <div>{c.ownerName}</div>
                            <div className="font-mono text-slate-500">{c.mobile}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 space-y-0.5">
                            <div>Reg: {c.registrationNo} · RC: {c.documentRef}</div>
                            <div>Permit: {c.permitNo || tr('Pending')} · Ins: {c.insuranceRef || tr('Pending')}</div>
                            <div>GST: {c.gstNumber || 'N/A'} · Bank: {c.bankAccount || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <div className="font-mono font-bold text-slate-900">
                              @{c.adminUsername || 'unassigned'}
                            </div>
                            {c.credentialStatus === 'ACTIVE_SYNCED' ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" /> {tr('Password Synced')} ✓
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                  {c.credentialStatus || 'TEMP_ISSUED'}
                                </span>
                                {c.tempPasswordPreview && (
                                  <div className="text-[10px] font-mono text-slate-500">
                                    Temp: {c.tempPasswordPreview}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCredTarget({
                                    entityType: 'TRAVELS',
                                    entityId: c.id,
                                    name: c.name,
                                    currentUsername: c.adminUsername,
                                  });
                                  setCredUsername(
                                    c.adminUsername ||
                                      `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}.travels`
                                  );
                                  setCredTempPass(demoPasscode);
                                  setCredError(null);
                                }}
                                className="text-[10px] font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" /> {tr('Issue / Reset Login')}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={c.ticketCommissionPct ?? 8}
                              onChange={(e) =>
                                patch(`/api/companies/${c.id}`, {
                                  ticketCommissionPct: Number(e.target.value) || 8,
                                })
                              }
                              aria-label={`Ticket commission for ${c.name}`}
                              className="w-14 text-right border border-slate-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            <div className="font-bold text-slate-900">₹{earned.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500">
                              <span className="text-emerald-700">{tr('Paid')} ₹{(rec?.paidCommission ?? 0).toFixed(0)}</span>
                              {' · '}
                              <span className="text-amber-700">{tr('Due')} ₹{(rec?.pendingDue ?? 0).toFixed(0)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <span
                              className={
                                c.status === 'APPROVED'
                                  ? 'text-emerald-700'
                                  : c.status === 'PENDING'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                              }
                            >
                              {tr(c.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => patch(`/api/companies/${c.id}`, { status: 'APPROVED' })}
                                className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                              >
                                {tr('Approve')}
                              </button>
                            ) : c.status === 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() => patch(`/api/companies/${c.id}`, { status: 'SUSPENDED' })}
                                className="px-3 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                              >
                                {tr('Suspend')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => patch(`/api/companies/${c.id}`, { status: 'APPROVED' })}
                                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                {tr('Reactivate')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicles Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">
                {tr('Active Fleet & Driver Assignments')} ({state.vehicles.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Vehicle Reg')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Type & Capacity')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Operator')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Assigned Route')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Driver / Conductor')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.vehicles.map((v) => {
                      const comp = state.companies.find((c) => c.id === v.companyId);
                      const rt = state.routes.find((r) => r.id === v.routeId);
                      const drv = state.staff.find((s) => s.id === v.driverId);
                      const cnd = state.staff.find((s) => s.id === v.conductorId);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.regNumber}</td>
                          <td className="py-3 px-4">
                            {tr(v.type)} · {v.seatingCapacity} {tr('seats')}
                          </td>
                          <td className="py-3 px-4">{comp ? td(comp.name) : ''}</td>
                          <td className="py-3 px-4">{rt ? td(rt.name) : ''}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {drv?.name} / {cnd?.name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4.4: ROUTES */}
        {section === 'routes' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Highway Routes & Restaurant Stops')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Configure origin-to-destination corridors, stop order, and expected arrival windows')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRoute((v) => !v)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> {tr('Create Route')}
              </button>
            </div>

            {showNewRoute && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post('/api/routes', {
                    ...newRoute,
                    totalKm: Number(newRoute.totalKm),
                  });
                  setNewRoute({ name: '', origin: '', destination: '', totalKm: '280', restaurantIds: [] });
                  setShowNewRoute(false);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Route Name')}</label>
                    <input
                      required
                      value={newRoute.name}
                      onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                      placeholder="Chennai → Coimbatore"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Origin')}</label>
                    <input
                      required
                      value={newRoute.origin}
                      onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Destination')}</label>
                    <input
                      required
                      value={newRoute.destination}
                      onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Distance (km)')}</label>
                    <input
                      type="number"
                      value={newRoute.totalKm}
                      onChange={(e) => setNewRoute({ ...newRoute, totalKm: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-600 font-medium">{tr('Partner Stops')}:</span>
                    {state.restaurants
                      .filter((r) => r.status === 'APPROVED')
                      .map((r) => (
                        <label key={r.id} className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={newRoute.restaurantIds.includes(r.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...newRoute.restaurantIds, r.id]
                                : newRoute.restaurantIds.filter((id) => id !== r.id);
                              setNewRoute({ ...newRoute, restaurantIds: next });
                            }}
                          />
                          {td(r.name)}
                        </label>
                      ))}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                  >
                    {tr('Save Highway Route')}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-5">
              {state.routes.map((rt) => (
                <div key={rt.id} className="space-y-3">
                  <RouteMapVisualizer route={rt} restaurants={state.restaurants} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4.5 & 4.6: PARTNERSHIPS & QR MANAGEMENT (CORE MODULE) */}
        {section === 'partnerships' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {tr('Bus–Restaurant Partnerships & Dynamic QR Management')}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Core linking engine associating Transport Company + Vehicle + Route + Partner Kitchens with signed QR tokens')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPart((v) => !v)}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" /> {tr('New Partnership & Generate QR')}
              </button>
            </div>

            {showNewPart && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post('/api/partnerships', newPart);
                  setShowNewPart(false);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Transport Company')}</label>
                    <select
                      value={newPart.companyId}
                      onChange={(e) => setNewPart({ ...newPart, companyId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      {state.companies
                        .filter((c) => c.status === 'APPROVED')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {td(c.name)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Bus / Vehicle')}</label>
                    <select
                      value={newPart.vehicleId}
                      onChange={(e) => setNewPart({ ...newPart, vehicleId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      {state.vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.regNumber} ({tr(v.type)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Route')}</label>
                    <select
                      value={newPart.routeId}
                      onChange={(e) => setNewPart({ ...newPart, routeId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      {state.routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {td(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    {tr('Select Multiple Partner Restaurants Along Route')}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {state.restaurants
                      .filter((r) => r.status === 'APPROVED')
                      .map((r) => (
                        <label
                          key={r.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newPart.restaurantIds.includes(r.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...newPart.restaurantIds, r.id]
                                : newPart.restaurantIds.filter((id) => id !== r.id);
                              setNewPart({ ...newPart, restaurantIds: next });
                            }}
                          />
                          {td(r.name)} ({td(r.city)})
                        </label>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    {tr('Approve Partnership & Issue QR')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {state.qrCodes.map((qr) => {
                const part = state.partnerships.find((p) => p.id === qr.partnershipId);
                const veh = state.vehicles.find((v) => v.id === qr.vehicleId);
                const comp = state.companies.find((c) => c.id === part?.companyId);
                const route = state.routes.find((r) => r.id === qr.routeId);
                const rests = (part?.restaurantIds || [])
                  .map((id) => {
                    const n = state.restaurants.find((r) => r.id === id)?.name;
                    return n ? td(n) : undefined;
                  })
                  .filter(Boolean);

                return (
                  <div key={qr.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500">{comp ? td(comp.name) : ''}</div>
                        <div className="text-base font-bold font-mono text-slate-900">{veh?.regNumber}</div>
                        <div className="text-xs text-slate-600">{route ? td(route.name) : ''}</div>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          qr.active && part?.status === 'APPROVED' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {qr.active && part?.status === 'APPROVED' ? tr('Active QR') : tr('Paused')}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                      <img
                        src={`/api/qr/${encodeURIComponent(qr.token)}/svg?origin=${encodeURIComponent(origin)}`}
                        alt={`QR ${qr.token}`}
                        className="w-24 h-24 bg-white p-1.5 rounded-lg border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 text-xs space-y-1.5">
                        <div className="font-mono font-semibold text-slate-900 truncate">{qr.token}</div>
                        <div className="text-slate-600 font-mono tabular-nums">
                          {qr.scanCount} {tr('scans')} · {qr.orderCount} {tr('orders')}
                        </div>
                        <div className="text-slate-500 line-clamp-2">
                          {tr('Partners')}: {rests.join(' → ')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onOpenPassengerQr(qr.token)}
                        className="py-2 px-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800"
                      >
                        {tr('Open Passenger Flow')}
                      </button>
                      <a
                        href={`/api/qr/${encodeURIComponent(qr.token)}/png?origin=${encodeURIComponent(origin)}`}
                        download={`${qr.token}.png`}
                        className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> PNG
                      </a>
                      <button
                        type="button"
                        onClick={() => post(`/api/qr/${qr.id}/regenerate`)}
                        className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> {tr('Regenerate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(`/api/qr/${qr.id}/toggle`)}
                        className="py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        {qr.active ? tr('Deactivate QR') : tr('Activate QR')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4.7: MASTER ORDER MANAGEMENT */}
        {section === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Master Order Ledger')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Filter by restaurant, bus travels company, passenger/staff role, and kitchen prep status')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder={tr('Search ID, bus, seat, name...')}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <select
                  value={orderRestFilter}
                  onChange={(e) => setOrderRestFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ALL">{tr('All Restaurants')}</option>
                  {state.restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {td(r.name)}
                    </option>
                  ))}
                </select>
                <select
                  value={orderCompanyFilter}
                  onChange={(e) => setOrderCompanyFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ALL">{tr('All Bus Travels')}</option>
                  {state.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {td(c.name)}
                    </option>
                  ))}
                </select>
                <select
                  value={orderRoleFilter}
                  onChange={(e) =>
                    setOrderRoleFilter(e.target.value as 'ALL' | 'PASSENGER' | 'CREW')
                  }
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ALL">{tr('Passenger + Staff')}</option>
                  <option value="PASSENGER">{tr('Passengers Only')}</option>
                  <option value="CREW">{tr('Driver & Conductor Only')}</option>
                </select>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="ALL">{tr('All Statuses')}</option>
                  <option value="NEW">{tr('NEW')}</option>
                  <option value="ACCEPTED">{tr('ACCEPTED')}</option>
                  <option value="PREPARING">{tr('PREPARING')}</option>
                  <option value="READY">{tr('READY')}</option>
                  <option value="COMPLETED">{tr('COMPLETED')}</option>
                  <option value="REJECTED">{tr('REJECTED')}</option>
                  <option value="CANCELLED">{tr('CANCELLED')}</option>
                </select>
              </div>
            </div>

            {/* Filtered Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-[11px] text-slate-500">{tr('Matched Orders')}</div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {filteredOrders.length}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-[11px] text-slate-500">{tr('Filtered Food Value')}</div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  ₹{filteredOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(0)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-[11px] text-slate-500">{tr('BusBite Commission')}</div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  ₹{filteredOrders.reduce((s, o) => s + o.platformCommission, 0).toFixed(2)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="text-[11px] text-slate-500">{tr('Driver / Staff Orders')}</div>
                <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
                  {filteredOrders.filter((o) => o.orderRole === 'CREW').length}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Order / Customer')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Bus & Travels')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Restaurant & Items')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Mode / ETA')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Amount')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Payment')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Prep Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const veh = state.vehicles.find((v) => v.id === ord.vehicleId);
                      const rt = state.routes.find((r) => r.id === ord.routeId);
                      const rest = state.restaurants.find((r) => r.id === ord.restaurantId);
                      const comp = state.companies.find((c) => c.id === ord.companyId);
                      const isCrew = ord.orderRole === 'CREW';
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                              {isCrew && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  {tr('STAFF')}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600">
                              {ord.passengerName}
                              {ord.seatNumber ? ` · ${tr('Seat')} ${ord.seatNumber}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-semibold text-slate-900">{veh?.regNumber}</div>
                            <div className="text-slate-500">
                              {comp ? td(comp.name) : ''} · {rt?.code}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{rest ? td(rest.name) : ''}</div>
                            <div className="text-slate-500 truncate max-w-[200px]">
                              {ord.items.map((i) => `${i.qty}× ${td(i.name)}`).join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            <div>{tr(ord.orderType)}</div>
                            <div className="text-slate-500">{ord.etaMinutesAtOrder}m ETA</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            <div>₹{ord.totalAmount.toFixed(2)}</div>
                            <div className="text-[10px] text-emerald-700 font-normal">
                              {tr('Comm')} ₹{ord.platformCommission.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <span
                              className={
                                ord.paymentStatus === 'VERIFIED'
                                  ? 'text-emerald-700'
                                  : ord.paymentStatus === 'FAILED'
                                    ? 'text-red-600'
                                    : 'text-amber-700'
                              }
                            >
                              {tr(ord.paymentStatus)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{tr(ord.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4.8: COMMISSION RECEIVABLES & COLLECTIONS */}
        {section === 'payments' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {tr('Commission Receivables & Partner Collections (Incoming TO BusBite)')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr('Restaurants and Bus Travels settle their agreed BusBite commission dues directly to BusBite')}
              </p>
            </div>

            {/* Table 1: Restaurant Commission Receivables */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  1. {tr('Restaurant Commission Receivables (Food Orders)')}
                </span>
                <span className="text-xs font-mono text-emerald-800 font-semibold">
                  {tr('Pending Due')}: ₹
                  {restaurantReceivableRows.reduce((s, r) => s + r.pendingDue, 0).toFixed(2)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Restaurant & Bank')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Orders')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Food Gross')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Comm %')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Paid to BusBite')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Pending Due')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Collection')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {restaurantReceivableRows.map((row) => (
                      <tr key={row.restaurant.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{td(row.restaurant.name)}</div>
                          <div className="text-slate-500 font-mono">{row.restaurant.bankAccount}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">{row.orderCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          ₹{row.gross.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.restaurant.commissionPct}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                          ₹{row.paidCommission.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-amber-700">
                          ₹{row.pendingDue.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {row.unsettledCount > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                post(`/api/settlements/${row.restaurant.id}/settle`, {
                                  entityType: 'RESTAURANT',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 whitespace-nowrap"
                            >
                              {tr('Record Received')} ({row.unsettledCount})
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> {tr('Cleared')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Bus Travels Ticket Commission Receivables */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  2. {tr('Bus Travels Ticket Commission Receivables')}
                </span>
                <span className="text-xs font-mono text-emerald-800 font-semibold">
                  {tr('Pending Due')}: ₹
                  {travelsReceivableRows.reduce((s, r) => s + r.pendingDue, 0).toFixed(2)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Transport Company & Bank')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Tickets')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Ticket Gross')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Comm %')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Paid to BusBite')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Pending Due')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Collection')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {travelsReceivableRows.map((row) => (
                      <tr key={row.company.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{td(row.company.name)}</div>
                          <div className="text-slate-500 font-mono">
                            {row.company.bankAccount || row.company.registrationNo}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">{row.ticketCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                          ₹{row.grossFare.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.company.ticketCommissionPct}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                          ₹{row.paidCommission.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-amber-700">
                          ₹{row.pendingDue.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {row.unsettledCount > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                post(`/api/settlements/${row.company.id}/settle`, {
                                  entityType: 'TRAVELS',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 whitespace-nowrap"
                            >
                              {tr('Record Received')} ({row.unsettledCount})
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> {tr('Cleared')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Verified Commission Receipts Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">
                3. {tr('Verified Commission Receipts Ledger')} ({state.settlements.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-medium">{tr('Receipt ID')}</th>
                      <th className="py-3 px-4 font-medium">{tr('Partner & Type')}</th>
                      <th className="py-3 px-4 font-medium">{tr('UTR Reference')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Txns Settled')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Gross Volume')}</th>
                      <th className="py-3 px-4 font-medium text-right">{tr('Commission Received')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.settlements.map((stl) => {
                      const isTravels = stl.entityType === 'TRAVELS';
                      const partnerName = isTravels
                        ? state.companies.find((c) => c.id === (stl.entityId || stl.restaurantId))?.name
                        : state.restaurants.find((r) => r.id === (stl.entityId || stl.restaurantId))?.name;
                      const txnCount = isTravels ? stl.ticketIds?.length || 0 : stl.orderIds.length;
                      return (
                        <tr key={stl.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">{stl.id}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900">{partnerName ? td(partnerName) : stl.restaurantId}</span>
                            <span
                              className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isTravels ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {tr(isTravels ? 'TRAVELS' : 'RESTAURANT')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{stl.utrRef}</td>
                          <td className="py-3 px-4 text-right font-mono">
                            {txnCount} {tr(isTravels ? 'tickets' : 'orders')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">₹{stl.grossAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            ₹{stl.commissionAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4.9: REPORTS & EXPORT (PRINT READY) */}
        {section === 'reports' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Financial & Operational Reports')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Combined route & vehicle performance plus Paid vs Pending BusBite commission reports')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> {tr('Export CSV / Excel')}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> {tr('Print / PDF')}
                </button>
              </div>
            </div>

            <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
              <div className="text-lg font-bold text-slate-900">BusBite — {tr('Platform Financial & Commission Report')}</div>
              <div className="text-xs text-slate-600">{tr('Generated on')} {new Date().toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Route-wise Combined Sales */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  {tr('Route-Wise Sales (Food + Tickets)')}
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {state.routes.map((rt) => {
                    const rtOrders = state.orders.filter(
                      (o) => o.routeId === rt.id && o.paymentStatus === 'VERIFIED'
                    );
                    const rtTickets = state.tickets.filter(
                      (t) => t.routeId === rt.id && t.status !== 'CANCELLED'
                    );
                    const foodTotal = rtOrders.reduce((s, o) => s + o.totalAmount, 0);
                    const ticketTotal = rtTickets.reduce((s, t) => s + t.totalFare, 0);
                    return (
                      <div key={rt.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-slate-800 font-medium">{td(rt.name)}</div>
                          <div className="text-[11px] text-slate-500">
                            {rtOrders.length} {tr('food')} · {rtTickets.length} {tr('tickets')}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          ₹{(foodTotal + ticketTotal).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Vehicle-wise Performance */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  {tr('Vehicle-Wise Sales (Food + Tickets)')}
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {state.vehicles.map((veh) => {
                    const vOrders = state.orders.filter(
                      (o) => o.vehicleId === veh.id && o.paymentStatus === 'VERIFIED'
                    );
                    const vTickets = state.tickets.filter(
                      (t) => t.vehicleId === veh.id && t.status !== 'CANCELLED'
                    );
                    const foodTotal = vOrders.reduce((s, o) => s + o.totalAmount, 0);
                    const ticketTotal = vTickets.reduce((s, t) => s + t.totalFare, 0);
                    return (
                      <div key={veh.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-mono font-semibold text-slate-900">{veh.regNumber}</div>
                          <div className="text-[11px] text-slate-500">
                            {vOrders.length} {tr('food')} · {vTickets.length} {tr('tickets')}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          ₹{(foodTotal + ticketTotal).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Restaurant Commission Summary (Paid vs Pending) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  {tr('Restaurant Commission (Paid vs Pending Due)')}
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {restaurantReceivableRows.map((row) => (
                    <div key={row.restaurant.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-900">{td(row.restaurant.name)}</div>
                        <div className="text-[11px] text-slate-500">
                          {row.orderCount} {tr('orders')} · {row.restaurant.commissionPct}% {tr('rate')}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-emerald-700 font-semibold">
                          {tr('Paid')}: ₹{row.paidCommission.toFixed(2)}
                        </div>
                        <div className="text-amber-700 font-semibold">
                          {tr('Due')}: ₹{row.pendingDue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Bus Travels Ticket Commission Summary (Paid vs Pending) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  {tr('Bus Travels Commission (Paid vs Pending Due)')}
                </h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {travelsReceivableRows.map((row) => (
                    <div key={row.company.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-900">{td(row.company.name)}</div>
                        <div className="text-[11px] text-slate-500">
                          {row.ticketCount} {tr('tickets')} · {row.company.ticketCommissionPct}% {tr('rate')}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-emerald-700 font-semibold">
                          {tr('Paid')}: ₹{row.paidCommission.toFixed(2)}
                        </div>
                        <div className="text-amber-700 font-semibold">
                          {tr('Due')}: ₹{row.pendingDue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </DesktopBrowserFrame>
  );
}
