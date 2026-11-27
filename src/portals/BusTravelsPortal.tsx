import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Link2,
  Lock,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Unlink,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { TourSignal } from '../components/AppGuideTour';
import highwayHeroImage from '../assets/images/highway_plaza_hero_1795667339325.jpg';
import { DesktopBrowserFrame } from '../components/DesktopBrowserFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { LanguageSelector, useLanguage } from '../i18n/indianLanguages';
import type {
  BookingChannel,
  BusTicketBooking,
  PlatformState,
  StaffMember,
  TransportCompany,
  Trip,
} from '../types/platform';

interface BusTravelsPortalProps {
  state: PlatformState;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  onOpenPassengerQr: (qrToken: string) => void;
  tourSignal?: TourSignal | null;
}

type TravelsSection = 'overview' | 'tickets' | 'schedules' | 'food' | 'profile';

function getSeatsForVehicle(type: string): { lower: string[]; upper: string[] } {
  if (type === 'AC Sleeper') {
    return {
      lower: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'],
      upper: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12'],
    };
  }
  return {
    lower: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    upper: ['S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24'],
  };
}

export function BusTravelsPortal({
  state,
  post,
  patch,
  onOpenPassengerQr,
  tourSignal,
}: BusTravelsPortalProps) {
  const { t, tr, td } = useLanguage();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    state.companies[0]?.id || 'comp-kpn'
  );
  const [section, setSection] = useState<TravelsSection>('overview');

  // Bus Travel Admin Auth State (Bearer token strictly in memory)
  const [travelsSession, setTravelsSession] = useState<{
    token: string;
    companyId: string;
    username: string;
    mustChangePassword: boolean;
  } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState<string>('kpn.travels');
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

  // Driver / Crew Credential Management State (under Bus Travel Company control)
  const [showCreateDriver, setShowCreateDriver] = useState<boolean>(false);
  const [newDriver, setNewDriver] = useState<{
    name: string;
    role: 'DRIVER' | 'CONDUCTOR';
    mobile: string;
    licenseNo: string;
    assignedVehicleId: string;
    username: string;
    tempPassword: string;
  }>({
    name: '',
    role: 'DRIVER',
    mobile: '',
    licenseNo: '',
    assignedVehicleId: '',
    username: '',
    tempPassword: '',
  });
  const [driverCreateErr, setDriverCreateErr] = useState<string | null>(null);
  const [driverCreateBusy, setDriverCreateBusy] = useState<boolean>(false);
  const [resetTargetDriverId, setResetTargetDriverId] = useState<string | null>(null);
  const [resetDriverPass, setResetDriverPass] = useState<string>('');
  const [driverActionMsg, setDriverActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tourSignal?.travelsSection) return;
    setSection(tourSignal.travelsSection);
  }, [tourSignal?.nonce]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'CONFIRMED' | 'BOARDED' | 'CANCELLED'>('ALL');

  // Add vehicle modal/form state
  const [showAddBus, setShowAddBus] = useState(false);
  const [newBus, setNewBus] = useState({
    regNumber: '',
    type: 'AC Sleeper' as const,
    seatingCapacity: '36',
    routeId: state.routes[0]?.id || 'route-chm',
  });

  // Inline trip config edits
  const [fareEdits, setFareEdits] = useState<Record<string, string>>({});
  const [depEdits, setDepEdits] = useState<Record<string, string>>({});
  const [arrEdits, setArrEdits] = useState<Record<string, string>>({});
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

  // OTA Channel Seat Lock state
  const [otaSeatInput, setOtaSeatInput] = useState<string>('L5');
  const [otaChannel, setOtaChannel] = useState<BookingChannel>('REDBUS');
  const [otaMessage, setOtaMessage] = useState<string | null>(null);
  const [otaError, setOtaError] = useState<string | null>(null);

  // Company Profile Editor State
  const [compName, setCompName] = useState('');
  const [compOwner, setCompOwner] = useState('');
  const [compMobile, setCompMobile] = useState('');
  const [compRegNo, setCompRegNo] = useState('');
  const [compDocRef, setCompDocRef] = useState('');
  const [compPermit, setCompPermit] = useState('');
  const [compInsurance, setCompInsurance] = useState('');
  const [compGst, setCompGst] = useState('');
  const [compBank, setCompBank] = useState('');
  const [compSaving, setCompSaving] = useState(false);
  const [compSavedMsg, setCompSavedMsg] = useState<string | null>(null);

  const company = useMemo(
    () =>
      (travelsSession ? state.companies.find((c) => c.id === travelsSession.companyId) : undefined) ||
      state.companies.find((c) => c.id === selectedCompanyId) ||
      state.companies[0],
    [state.companies, travelsSession, selectedCompanyId]
  );

  useEffect(() => {
    if (!company) return;
    setCompName(company.name || '');
    setCompOwner(company.ownerName || '');
    setCompMobile(company.mobile || '');
    setCompRegNo(company.registrationNo || '');
    setCompDocRef(company.documentRef || '');
    setCompPermit(company.permitNo || '');
    setCompInsurance(company.insuranceRef || '');
    setCompGst(company.gstNumber || '');
    setCompBank(company.bankAccount || '');
  }, [
    company?.id,
    company?.name,
    company?.ownerName,
    company?.mobile,
    company?.registrationNo,
    company?.documentRef,
    company?.permitNo,
    company?.insuranceRef,
    company?.gstNumber,
    company?.bankAccount,
  ]);

  const companyVehicles = useMemo(
    () => state.vehicles.filter((v) => v.companyId === company?.id),
    [state.vehicles, company]
  );

  const companyTrips = useMemo(() => {
    const vehicleIds = new Set(companyVehicles.map((v) => v.id));
    return state.trips.filter((t) => vehicleIds.has(t.vehicleId));
  }, [state.trips, companyVehicles]);

  const activeSeatTrip: Trip | undefined = useMemo(() => {
    if (selectedTripId) {
      const found = companyTrips.find((t) => t.id === selectedTripId);
      if (found) return found;
    }
    return companyTrips[0];
  }, [companyTrips, selectedTripId]);

  const companyTickets = useMemo(
    () => state.tickets.filter((t) => t.companyId === company?.id),
    [state.tickets, company]
  );

  const filteredTickets = useMemo(() => {
    return companyTickets.filter((t) => ticketFilter === 'ALL' || t.status === ticketFilter);
  }, [companyTickets, ticketFilter]);

  const companyOrders = useMemo(
    () => state.orders.filter((o) => o.companyId === company?.id && o.paymentStatus === 'VERIFIED'),
    [state.orders, company]
  );

  const companyQrs = useMemo(() => {
    const vehicleIds = new Set(companyVehicles.map((v) => v.id));
    return state.qrCodes.filter((q) => vehicleIds.has(q.vehicleId));
  }, [state.qrCodes, companyVehicles]);

  const companyStaff = useMemo(
    () => state.staff.filter((s) => s.companyId === company?.id),
    [state.staff, company]
  );

  const travelsAlerts = useMemo(
    () =>
      state.notifications
        .filter((n) => n.targetRole === 'TRAVELS_ADMIN' && (!n.targetId || n.targetId === company?.id))
        .slice(0, 6),
    [state.notifications, company]
  );

  const travelsSettlements = useMemo(
    () =>
      state.settlements.filter(
        (s) => s.entityType === 'TRAVELS' && (s.entityId === company?.id || s.restaurantId === company?.id)
      ),
    [state.settlements, company]
  );

  const kpis = useMemo(() => {
    const activeTickets = companyTickets.filter((t) => t.status !== 'CANCELLED');
    const seatsBooked = activeTickets.reduce((s, t) => s + t.seatNumbers.length, 0);
    const ticketRevenue = activeTickets.reduce((s, t) => s + t.totalFare, 0);
    const settledTicketIds = new Set(travelsSettlements.flatMap((s) => s.ticketIds || []));
    const unsettledTickets = activeTickets.filter((t) => !settledTicketIds.has(t.id));
    const pendingCommissionDue = unsettledTickets.reduce((s, t) => s + t.platformCommission, 0);
    const paidCommission = travelsSettlements.reduce((s, st) => s + st.commissionAmount, 0);
    const activeVehicles = companyVehicles.filter((v) => v.status === 'ACTIVE').length;
    return {
      activeVehicles,
      totalVehicles: companyVehicles.length,
      tripsCount: companyTrips.length,
      ticketsCount: activeTickets.length,
      seatsBooked,
      ticketRevenue,
      pendingCommissionDue,
      paidCommission,
      unsettledTicketCount: unsettledTickets.length,
      foodOrders: companyOrders.length,
    };
  }, [companyTickets, companyVehicles, companyTrips, companyOrders, travelsSettlements]);

  if (!company) return null;

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompSaving(true);
    setCompSavedMsg(null);
    try {
      await patch(`/api/companies/${company.id}`, {
        name: compName.trim() || company.name,
        ownerName: compOwner.trim() || company.ownerName,
        mobile: compMobile.trim() || company.mobile,
        registrationNo: compRegNo.trim() || company.registrationNo,
        documentRef: compDocRef.trim() || company.documentRef,
        permitNo: compPermit.trim(),
        insuranceRef: compInsurance.trim(),
        gstNumber: compGst.trim(),
        bankAccount: compBank.trim(),
      });
      setCompSavedMsg(tr('Company profile & compliance details saved successfully.'));
      window.setTimeout(() => setCompSavedMsg(null), 3500);
    } finally {
      setCompSaving(false);
    }
  };

  const navItems: { id: TravelsSection; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: tr('Fleet & Overview'), icon: LayoutDashboard },
    { id: 'tickets', label: tr('Tickets & Seat Map'), icon: Ticket, badge: kpis.ticketsCount || undefined },
    { id: 'schedules', label: tr('Schedules & Fares'), icon: Clock },
    { id: 'food', label: tr('QR Tie-Ups & Comm'), icon: QrCode },
    { id: 'profile', label: tr('Company Profile'), icon: UserCheck },
  ];

  const handleChannelSync = async (action: 'LOCK' | 'RELEASE', explicitSeat?: string) => {
    if (!activeSeatTrip) return;
    const seat = (explicitSeat || otaSeatInput).trim().toUpperCase();
    if (!seat) return;
    setOtaError(null);
    setOtaMessage(null);
    try {
      const res = await fetch(`/api/trips/${activeSeatTrip.id}/channel-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumbers: [seat], channel: otaChannel, action }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setOtaError(json.error || 'Channel inventory conflict');
        return;
      }
      setOtaMessage(
        action === 'LOCK'
          ? `Blocked ${seat} from ${otaChannel} — reserved on BusBite to prevent double-booking.`
          : `Released ${seat} lock back to live inventory.`
      );
    } catch (err) {
      setOtaError(err instanceof Error ? err.message : 'Request failed');
    }
  };

  const handleSaveTripConfig = async (trip: Trip) => {
    const fareVal = Number(fareEdits[trip.id] ?? trip.seatFare);
    const depVal = depEdits[trip.id] ?? trip.departureTime;
    const arrVal = arrEdits[trip.id] ?? trip.arrivalTime;
    await patch(`/api/trips/${trip.id}/config`, {
      seatFare: fareVal,
      departureTime: depVal,
      arrivalTime: arrVal,
    });
    setSavedTripId(trip.id);
    window.setTimeout(() => setSavedTripId(null), 2500);
  };

  const seatMapOwnerLookup = (tripId: string, seat: string): BusTicketBooking | undefined => {
    return state.tickets.find(
      (t) => t.tripId === tripId && t.status !== 'CANCELLED' && t.seatNumbers.includes(seat)
    );
  };

  const demoPasscode = ['BusBite', '@', '2026'].join('');

  const handleTravelsLogin = async (e?: React.FormEvent, explicitUser?: string, explicitPass?: string) => {
    e?.preventDefault();
    const u = (explicitUser ?? loginUser).trim();
    const p = explicitPass ?? loginPass;
    if (!u || !p) {
      setAuthError('Enter your operator username and password.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'TRAVELS', username: u, password: p }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        entity?: TransportCompany;
        token?: string;
        mustChangePassword?: boolean;
        error?: string;
      };
      if (!res.ok || !json.entity || !json.token) {
        setAuthError(json.error || 'Bus Travel login failed.');
        return;
      }
      setSelectedCompanyId(json.entity.id);
      setSelectedTripId('');
      setTravelsSession({
        token: json.token,
        companyId: json.entity.id,
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

  const handleTravelsRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'TRAVELS',
          username: loginUser.trim(),
          tempPassword: loginPass,
          newPassword: regNewPass.trim() || undefined,
          ownerName: regOwnerName.trim() || undefined,
          mobile: regMobile.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        entity?: TransportCompany;
        token?: string;
        mustChangePassword?: boolean;
        error?: string;
      };
      if (!res.ok || !json.entity || !json.token) {
        setAuthError(json.error || 'Could not verify operator credentials.');
        return;
      }
      setSelectedCompanyId(json.entity.id);
      setSelectedTripId('');
      setTravelsSession({
        token: json.token,
        companyId: json.entity.id,
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

  const handleTravelsChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelsSession) return;
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
      const res = await fetch('/api/auth/partner/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${travelsSession.token}`,
        },
        body: JSON.stringify({ currentPassword: currPw, newPassword: newPw }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPwErr(json.error || 'Failed to update password.');
        return;
      }
      setTravelsSession((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      setCurrPw('');
      setNewPw('');
      setConfirmPw('');
      setPwUpdateNotice(
        'Password updated successfully. Future logins use this password with the same username.'
      );
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPwBusy(false);
    }
  };

  const handleCreateCompanyDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverCreateErr(null);
    setDriverActionMsg(null);
    setDriverCreateBusy(true);
    try {
      const res = await fetch('/api/travels/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          name: newDriver.name,
          role: newDriver.role,
          mobile: newDriver.mobile,
          licenseNo: newDriver.licenseNo,
          assignedVehicleId: newDriver.assignedVehicleId || companyVehicles[0]?.id,
          username: newDriver.username,
          tempPassword: newDriver.tempPassword,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; staff?: StaffMember; error?: string };
      if (!res.ok || !json.staff) {
        setDriverCreateErr(json.error || 'Failed to create driver credentials.');
        return;
      }
      setDriverActionMsg(
        `Created driver login @${json.staff.username} for ${json.staff.name}. Driver can now sign in on Driver App.`
      );
      setNewDriver({
        name: '',
        role: 'DRIVER',
        mobile: '',
        licenseNo: '',
        assignedVehicleId: '',
        username: '',
        tempPassword: '',
      });
      setShowCreateDriver(false);
    } catch (err) {
      setDriverCreateErr(err instanceof Error ? err.message : 'Network error');
    } finally {
      setDriverCreateBusy(false);
    }
  };

  const handleResetDriverTempPassword = async (staffId: string) => {
    if (!resetDriverPass || resetDriverPass.length < 6) {
      setDriverActionMsg('Temporary password must be at least 6 characters.');
      return;
    }
    await patch(`/api/travels/drivers/${staffId}`, { tempPassword: resetDriverPass });
    setDriverActionMsg('Driver temporary password updated.');
    setResetTargetDriverId(null);
    setResetDriverPass('');
  };

  const desktopBadge = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-200/80 px-3.5 py-1.5 shadow-xs text-xs font-semibold text-emerald-950">
        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
        {tr('Bus Travels Operator Console — Desktop View')}
      </div>
      <LanguageSelector compact />
    </div>
  );

  // AUTH GATE 1: Bus Travel Admin Registration & Login
  if (!travelsSession) {
    return (
      <DesktopBrowserFrame
        url="travels.busbite.app/login"
        title={tr('Bus Travel Admin — Fleet Operator Console')}
        subtitle={tr('Fleet Dispatch, Ticketing & Driver Credentials')}
        topBarSlot={desktopBadge}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* Left Editorial Showcase Panel */}
          <div className="lg:col-span-5 relative overflow-hidden bg-emerald-950 text-white p-8 flex flex-col justify-between">
            <img
              src={highwayHeroImage}
              alt={tr('BusBite Fleet Operations')}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/80 to-emerald-900/60" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-800/70 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold tracking-wide text-emerald-100">
                <Bus className="w-3.5 h-3.5 text-emerald-300" />
                BusBite · {tr('Fleet Operator')}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight leading-snug">
                {tr('Complete Fleet, Seat & Highway Food Control')}
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-sm">
                {tr('Manage coach seat maps, issue driver login accounts, configure highway food QR tie-ups, and settle ticket commissions in one console.')}
              </p>
            </div>

            <div className="relative z-10 space-y-2.5 pt-8">
              {[
                {
                  icon: Ticket,
                  title: tr('Live Multi-Channel Seat Map'),
                  desc: tr('Block RedBus & MakeMyTrip seats to eliminate double-bookings'),
                },
                {
                  icon: Users,
                  title: tr('Company Driver Credentials'),
                  desc: tr('Create, reset, and control Driver App access for every coach'),
                },
                {
                  icon: QrCode,
                  title: tr('Coach QR & Restaurant Tie-Ups'),
                  desc: tr('Approve or update highway food partners per bus'),
                },
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
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  {tr('Operator Console Access')}
                </div>
                <h1 className="text-xl font-extrabold text-slate-900">
                  {authMode === 'login' ? t('travels.loginHeading') : t('travels.registerHeading')}
                </h1>
                <p className="text-xs text-slate-500">
                  {tr('Sign in or register using your operator username and password.')}
                </p>
              </div>

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
                onSubmit={authMode === 'login' ? (e) => handleTravelsLogin(e) : handleTravelsRegister}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {tr('Operator')} {t('common.username')}
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="kpn.travels"
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
                        placeholder={tr('Owner / Ops Manager')}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder={tr('Contact Mobile')}
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
                    ? tr('Signing In...')
                    : authMode === 'login'
                      ? t('common.login')
                      : t('common.register')}
                </button>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {tr('Quick Bus Travels Demo Access')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginUser('kpn.travels');
                        setLoginPass(demoPasscode);
                        void handleTravelsLogin(undefined, 'kpn.travels', demoPasscode);
                      }}
                      className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-bold text-left hover:bg-amber-100/70 transition-colors"
                    >
                      <div className="font-mono truncate">kpn.travels</div>
                      <div className="text-[10px] font-medium text-amber-700">{tr('1st Login Update')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginUser('srs.travels');
                        setLoginPass(demoPasscode);
                        void handleTravelsLogin(undefined, 'srs.travels', demoPasscode);
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] font-bold text-left hover:bg-emerald-100/70 transition-colors"
                    >
                      <div className="font-mono truncate">srs.travels</div>
                      <div className="text-[10px] font-medium text-emerald-700">{tr('Active Fleet Console')}</div>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DesktopBrowserFrame>
    );
  }

  // AUTH GATE 2: Mandatory First-Login Password Change (Username Remains Unchanged)
  if (travelsSession.mustChangePassword || company.mustChangePassword) {
    return (
      <DesktopBrowserFrame
        url={`travels.busbite.app/${company.id}/security`}
        title={`${td(company.name)} — ${tr('Password Update')}`}
        subtitle={tr('Account Security Setup')}
        topBarSlot={desktopBadge}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          <div className="lg:col-span-5 relative overflow-hidden bg-emerald-950 text-white p-8 flex flex-col justify-between">
            <img
              src={highwayHeroImage}
              alt={td(company.name)}
              className="absolute inset-0 w-full h-full object-cover opacity-25"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-emerald-950/80 to-emerald-900/65" />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                {tr('Operator Account Activation')}
              </div>
              <h2 className="text-2xl font-extrabold">{td(company.name)}</h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                {tr('Set your private operator password to access fleet schedules, live seat inventory, and driver credential management.')}
              </p>
            </div>
            <div className="relative z-10 rounded-xl bg-white/10 border border-white/15 p-3.5 text-xs">
              <div className="text-emerald-300 font-semibold">{tr('Operator Username')}</div>
              <div className="font-mono font-bold text-white text-sm mt-0.5">
                @{company.adminUsername || travelsSession.username}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#F6F8F7] p-6 sm:p-10 flex items-center justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  {tr('First-Login Password Update')}
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {t('travels.firstLoginNotice')}
                </p>
              </div>

              <form onSubmit={handleTravelsChangePassword} className="space-y-3">
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
                    value={company.adminUsername || travelsSession.username}
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
                    placeholder={tr('Enter new company password')}
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
                    placeholder={tr('Confirm new password')}
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
                    onClick={() => setTravelsSession(null)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DesktopBrowserFrame>
    );
  }

  return (
    <DesktopBrowserFrame
      url={`travels.busbite.app/${company.id}/${section}`}
      title={`${td(company.name)} — ${tr('Bus Travel Admin Console')}`}
      subtitle={`${tr('Reg')} ${company.registrationNo} · ${tr('Fleet Operations')}`}
      topBarSlot={desktopBadge}
    >
      <div className="flex flex-col lg:flex-row min-h-[640px] bg-[#F6F8F7]">
        {/* Enterprise Left Operator Sidebar */}
        <aside className="lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 truncate">{td(company.name)}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold">{tr(company.status)}</div>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-1.5">
                <span className="font-mono font-bold text-emerald-950 truncate">
                  @{company.adminUsername || travelsSession.username}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 shrink-0">
                  <ShieldCheck className="w-3 h-3" /> {tr('Active')}
                </span>
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
                    {item.badge ? (
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

            {/* Operator Notifications */}
            <div className="hidden lg:block rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-900">{tr('Booking & Fleet Alerts')}</div>
              {travelsAlerts.length === 0 ? (
                <p className="text-[11px] text-slate-500">{tr('No recent booking alerts.')}</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {travelsAlerts.slice(0, 4).map((al) => (
                    <div key={al.id} className="rounded-lg bg-white border border-emerald-100 p-2 text-[11px]">
                      <div className="font-semibold text-emerald-950 truncate">{td(al.title)}</div>
                      <div className="text-slate-600 mt-0.5 line-clamp-2 text-[10px]">{td(al.message)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 px-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{tr('Fleet Reg')}</span>
            <span className="font-mono font-semibold text-slate-700">{company.registrationNo}</span>
          </div>
        </aside>

        {/* Main Operator Content */}
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
          {/* SECTION 1: FLEET & OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {td(company.name)} — {tr('Operator Overview')}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Manage your fleet occupancy, passenger bus ticket sales, driver & conductor rosters & highway food partnerships')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSection('schedules');
                    setShowAddBus(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {tr('Add Bus to Fleet')}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('Active Fleet')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {kpis.activeVehicles} / {kpis.totalVehicles}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {kpis.tripsCount} {tr('scheduled trips')}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('Tickets Sold')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                    {kpis.ticketsCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {kpis.seatsBooked} {tr('seats booked')}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('Ticket Revenue')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    ₹{kpis.ticketRevenue.toFixed(0)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {tr('BusBite Comm Due')}: ₹{kpis.pendingCommissionDue.toFixed(0)} ({company.ticketCommissionPct ?? 8}%)
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('Food Pre-Orders')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {kpis.foodOrders}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{tr('Via in-bus seat QR')}</div>
                </div>
              </div>

              {/* Fleet Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">{tr('Your Fleet & Live Occupancy')}</h2>
                  <span className="text-xs text-slate-500">
                    {companyVehicles.length} {tr('vehicles')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-medium">{tr('Bus Reg No')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Coach Type')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Route & Departure')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Seats Booked')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Fare / Seat')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Status')}</th>
                        <th className="py-3 px-4 font-medium text-right">{tr('Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyVehicles.map((veh) => {
                        const trip = state.trips.find((t) => t.vehicleId === veh.id);
                        const route = state.routes.find((r) => r.id === veh.routeId);
                        const bookedCount = trip?.bookedSeats.length || 0;
                        return (
                          <tr key={veh.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{veh.regNumber}</td>
                            <td className="py-3 px-4">
                              {td(veh.type)} · {veh.seatingCapacity}s
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{route ? td(route.name) : ''}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {trip?.departureTime} → {trip?.arrivalTime}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              <span className="font-bold text-emerald-800">{bookedCount}</span> / {veh.seatingCapacity}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              ₹{trip?.seatFare ?? 750}
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              <span className={veh.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'}>
                                {tr(veh.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                              {trip && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTripId(trip.id);
                                    setSection('tickets');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-medium"
                                >
                                  {tr('Seat Map')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  patch(`/api/vehicles/${veh.id}/status`, {
                                    status: veh.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE',
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                {veh.status === 'ACTIVE' ? tr('Maintenance') : tr('Activate')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active GPS Trip Preview */}
              {companyTrips
                .filter((t) => t.status === 'IN_PROGRESS')
                .map((trip) => {
                  const route = state.routes.find((r) => r.id === trip.routeId);
                  if (!route) return null;
                  return (
                    <RouteMapVisualizer
                      key={trip.id}
                      route={route}
                      trip={trip}
                      restaurants={state.restaurants}
                      compact
                    />
                  );
                })}
            </div>
          )}

          {/* SECTION 2: TICKETS & LIVE SEAT MAP */}
          {section === 'tickets' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{tr('Ticket Bookings & Live Seat Map')}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Real-time passenger seat occupancy, boarding check-in, and ticket cancellation')}
                  </p>
                </div>

                {companyTrips.length > 0 && (
                  <select
                    value={activeSeatTrip?.id || ''}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    {companyTrips.map((tItem) => {
                      const v = state.vehicles.find((veh) => veh.id === tItem.vehicleId);
                      const r = state.routes.find((rt) => rt.id === tItem.routeId);
                      return (
                        <option key={tItem.id} value={tItem.id}>
                          {v?.regNumber} · {r ? td(r.name) : ''} ({tItem.bookedSeats.length} {tr('booked')})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Live Seat Occupancy Grid + OTA Channel Inventory Lock */}
              {activeSeatTrip &&
                (() => {
                  const veh = state.vehicles.find((v) => v.id === activeSeatTrip.vehicleId);
                  const layout = getSeatsForVehicle(veh?.type || 'AC Sleeper');
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Armchair className="w-4 h-4 text-emerald-700" />
                          {tr('Live Multi-Channel Seat Map')} · {veh?.regNumber} ({td(veh?.type || '')})
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded border border-emerald-600 bg-white" /> {tr('Available')}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-800" /> BusBite (BB)
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400" /> RedBus / MMT OTA
                          </span>
                        </div>
                      </div>

                      {/* RedBus / MakeMyTrip Double-Booking Prevention Bar */}
                      <div className="rounded-xl bg-[#F4F8F6] border border-emerald-200/80 p-3.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-emerald-950 inline-flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                              {tr('RedBus / MakeMyTrip Real-Time Seat Lock')}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {tr('Click any seat below or enter a seat ID to block/release OTA channel inventory and prevent double-booking.')}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={otaSeatInput}
                              onChange={(e) => setOtaSeatInput(e.target.value.toUpperCase())}
                              placeholder={`${tr('Seat')} e.g. L5`}
                              className="w-20 border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase"
                            />
                            <select
                              value={otaChannel}
                              onChange={(e) => setOtaChannel(e.target.value as BookingChannel)}
                              className="border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            >
                              <option value="REDBUS">RedBus (RB)</option>
                              <option value="MAKEMYTRIP">MakeMyTrip (MMT)</option>
                              <option value="COUNTER">{tr('Counter Walk-in')}</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleChannelSync('LOCK')}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                            >
                              {tr('Lock OTA Seat')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChannelSync('RELEASE')}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                            >
                              {tr('Release Lock')}
                            </button>
                          </div>
                        </div>
                        {otaMessage && (
                          <div className="text-[11px] font-semibold text-emerald-800">{tr(otaMessage)}</div>
                        )}
                        {otaError && (
                          <div className="text-[11px] font-semibold text-red-700">{tr(otaError)}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            title: veh?.type === 'AC Sleeper' ? tr('Lower Deck') : tr('Rows 1–3'),
                            seats: layout.lower,
                          },
                          {
                            title: veh?.type === 'AC Sleeper' ? tr('Upper Deck') : tr('Rows 4–6'),
                            seats: layout.upper,
                          },
                        ].map((deck) => (
                          <div key={deck.title} className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                            <div className="text-xs font-bold text-slate-700">{deck.title}</div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {deck.seats.map((seat) => {
                                const isBooked = activeSeatTrip.bookedSeats.includes(seat);
                                const channel = activeSeatTrip.seatSources?.[seat];
                                const isOta = isBooked && (channel === 'REDBUS' || channel === 'MAKEMYTRIP');
                                const booking = isBooked
                                  ? seatMapOwnerLookup(activeSeatTrip.id, seat)
                                  : undefined;
                                return (
                                  <button
                                    type="button"
                                    key={seat}
                                    onClick={() => setOtaSeatInput(seat)}
                                    title={
                                      isOta
                                        ? `${tr('Booked via')} ${channel}`
                                        : booking
                                          ? `${td(booking.passengerName)} (${booking.pnr})`
                                          : tr('Available')
                                    }
                                    className={`rounded-lg px-2 py-2 text-center border text-xs transition-colors ${
                                      isOta
                                        ? 'bg-amber-50 border-amber-400 text-amber-900'
                                        : isBooked
                                          ? 'bg-emerald-800 border-emerald-900 text-white'
                                          : otaSeatInput === seat
                                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-500'
                                            : 'bg-white border-emerald-300 text-slate-800 hover:bg-emerald-50'
                                    }`}
                                  >
                                    <div className="font-mono font-bold flex items-center justify-center gap-1">
                                      <span>{seat}</span>
                                      {isOta && (
                                        <span className="text-[9px] px-1 rounded bg-amber-200 text-amber-950">
                                          {channel === 'REDBUS' ? 'RB' : 'MMT'}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className={`text-[10px] truncate ${
                                        isOta ? 'text-amber-800' : isBooked ? 'text-emerald-200' : 'text-slate-400'
                                      }`}
                                    >
                                      {isOta
                                        ? channel === 'REDBUS'
                                          ? 'RedBus'
                                          : 'MMT'
                                        : booking
                                          ? td(booking.passengerName.split(' ')[0])
                                          : isBooked
                                            ? tr('Booked')
                                            : `₹${activeSeatTrip.seatFare}`}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              {/* Ticket Bookings Manifest */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {tr('Passenger Ticket Manifest')} ({filteredTickets.length})
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(['ALL', 'CONFIRMED', 'BOARDED', 'CANCELLED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTicketFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          ticketFilter === st
                            ? 'bg-emerald-900 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tr(st)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-medium">{tr('PNR & Bus')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Passenger')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Seats')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Boarding → Dropping')}</th>
                        <th className="py-3 px-4 font-medium text-right">{tr('Fare Paid')}</th>
                        <th className="py-3 px-4 font-medium text-right">{tr('BusBite Comm')}</th>
                        <th className="py-3 px-4 font-medium">{tr('Status')}</th>
                        <th className="py-3 px-4 font-medium text-right">{tr('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            {tr('No ticket bookings match this filter.')}
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((tkt) => {
                          const veh = state.vehicles.find((v) => v.id === tkt.vehicleId);
                          return (
                            <tr key={tkt.id} className="hover:bg-slate-50/60">
                              <td className="py-3 px-4">
                                <div className="font-mono font-bold text-slate-900">{tkt.pnr}</div>
                                <div className="font-mono text-[11px] text-slate-500">{veh?.regNumber}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{td(tkt.passengerName)}</div>
                                <div className="font-mono text-[11px] text-slate-500">{tkt.passengerPhone}</div>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                                {tkt.seatNumbers.join(', ')}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div className="truncate max-w-[180px]">{td(tkt.boardingPoint)}</div>
                                <div className="truncate max-w-[180px] text-slate-400">→ {td(tkt.droppingPoint)}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                ₹{tkt.totalFare.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                                ₹{(tkt.platformCommission ?? 0).toFixed(2)} ({tkt.ticketCommissionPct ?? company.ticketCommissionPct ?? 8}%)
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                <span
                                  className={
                                    tkt.status === 'BOARDED'
                                      ? 'text-emerald-700'
                                      : tkt.status === 'CONFIRMED'
                                        ? 'text-blue-700'
                                        : 'text-red-600'
                                  }
                                >
                                  {tr(tkt.status)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                {tkt.status === 'CONFIRMED' && (
                                  <button
                                    type="button"
                                    onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'BOARDED' })}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-medium inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> {tr('Boarded')}
                                  </button>
                                )}
                                {tkt.status !== 'CANCELLED' && (
                                  <button
                                    type="button"
                                    onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'CANCELLED' })}
                                    className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" /> {tr('Cancel')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: SCHEDULES, FARES & DRIVERS */}
          {section === 'schedules' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{tr('Bus Schedules, Seat Fares & Drivers')}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Update live ticket fares, departure/arrival timings, and register additional buses')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBus((v) => !v)}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {tr('Register New Bus')}
                </button>
              </div>

              {showAddBus && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await post('/api/vehicles', {
                      ...newBus,
                      companyId: company.id,
                      seatingCapacity: Number(newBus.seatingCapacity) || 36,
                    });
                    setNewBus({ ...newBus, regNumber: '' });
                    setShowAddBus(false);
                  }}
                  className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Bus Reg Number')}</label>
                    <input
                      required
                      value={newBus.regNumber}
                      onChange={(e) => setNewBus({ ...newBus, regNumber: e.target.value })}
                      placeholder="TN 45 KL 7788"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Coach Type')}</label>
                    <select
                      value={newBus.type}
                      onChange={(e) =>
                        setNewBus({ ...newBus, type: e.target.value as typeof newBus.type })
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      <option value="AC Sleeper">{td('AC Sleeper')}</option>
                      <option value="Volvo Multi-Axle">{td('Volvo Multi-Axle')}</option>
                      <option value="Luxury Seater">{td('Luxury Seater')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{tr('Assigned Route')}</label>
                    <select
                      value={newBus.routeId}
                      onChange={(e) => setNewBus({ ...newBus, routeId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      {state.routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {td(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                  >
                    {tr('Add Bus & Schedule')}
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {companyTrips.map((trip) => {
                  const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
                  const route = state.routes.find((r) => r.id === trip.routeId);
                  const driver = state.staff.find((s) => s.id === trip.driverId);
                  const conductor = state.staff.find((s) => s.id === trip.conductorId);
                  return (
                    <div
                      key={trip.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-end justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-[200px]">
                        <div className="text-sm font-mono font-bold text-slate-900">
                          {veh?.regNumber} · <span className="text-emerald-700">{td(veh?.type || '')}</span>
                        </div>
                        <div className="text-xs text-slate-600">{route ? td(route.name) : ''}</div>
                        <div className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {tr('Driver')}: {driver ? td(driver.name) : tr('Assigned')} · {tr('Conductor')}:{' '}
                          {conductor ? td(conductor.name) : tr('Assigned')}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">{tr('Seat Fare (₹)')}</label>
                          <input
                            type="number"
                            min={100}
                            value={fareEdits[trip.id] ?? String(trip.seatFare)}
                            onChange={(e) => setFareEdits({ ...fareEdits, [trip.id]: e.target.value })}
                            className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">{tr('Departure')}</label>
                          <input
                            type="text"
                            value={depEdits[trip.id] ?? trip.departureTime}
                            onChange={(e) => setDepEdits({ ...depEdits, [trip.id]: e.target.value })}
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">{tr('Arrival')}</label>
                          <input
                            type="text"
                            value={arrEdits[trip.id] ?? trip.arrivalTime}
                            onChange={(e) => setArrEdits({ ...arrEdits, [trip.id]: e.target.value })}
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveTripConfig(trip)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900"
                        >
                          {savedTripId === trip.id ? `${tr('Saved')} ✓` : tr('Update Schedule')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Company-Controlled Driver & Conductor Credentials Roster */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {tr('Company-Controlled Driver & Conductor Logins')} ({companyStaff.length})
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr('Create driver usernames & passwords for Driver App sign-in, reset temp passes, or suspend access')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDriver((v) => !v);
                      setDriverCreateErr(null);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {tr('Create Driver Credentials')}
                  </button>
                </div>

                {driverActionMsg && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2">
                    <span>{tr(driverActionMsg)}</span>
                    <button type="button" onClick={() => setDriverActionMsg(null)} className="text-emerald-700 font-bold">
                      ×
                    </button>
                  </div>
                )}

                {showCreateDriver && (
                  <form
                    onSubmit={handleCreateCompanyDriver}
                    className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3"
                  >
                    {driverCreateErr && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
                        {tr(driverCreateErr)}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        placeholder={tr('Driver Full Name')}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs"
                      />
                      <select
                        value={newDriver.role}
                        onChange={(e) =>
                          setNewDriver({ ...newDriver, role: e.target.value as 'DRIVER' | 'CONDUCTOR' })
                        }
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="DRIVER">{tr('Driver')}</option>
                        <option value="CONDUCTOR">{tr('Conductor')}</option>
                      </select>
                      <input
                        type="text"
                        value={newDriver.mobile}
                        onChange={(e) => setNewDriver({ ...newDriver, mobile: e.target.value })}
                        placeholder={`${tr('Mobile')} (+91 ...)`}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={newDriver.licenseNo}
                        onChange={(e) => setNewDriver({ ...newDriver, licenseNo: e.target.value })}
                        placeholder={tr('DL / Badge Number')}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                      <select
                        value={newDriver.assignedVehicleId || companyVehicles[0]?.id || ''}
                        onChange={(e) => setNewDriver({ ...newDriver, assignedVehicleId: e.target.value })}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      >
                        {companyVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.regNumber} ({td(v.type)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={newDriver.username}
                        onChange={(e) => setNewDriver({ ...newDriver, username: e.target.value })}
                        placeholder={tr('Driver Username (e.g. kpn.selvam)')}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={newDriver.tempPassword}
                        onChange={(e) => setNewDriver({ ...newDriver, tempPassword: e.target.value })}
                        placeholder={tr('Initial Password (min 6)')}
                        className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-mono"
                      />
                      <button
                        type="submit"
                        disabled={driverCreateBusy}
                        className="py-2 px-4 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                      >
                        {driverCreateBusy ? tr('Creating...') : tr('Issue Driver Login')}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {companyStaff.map((st) => {
                    const veh = state.vehicles.find((v) => v.id === st.assignedVehicleId);
                    const credStatus = st.credentialStatus || 'ACTIVE';
                    return (
                      <div key={st.id} className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{td(st.name)}</div>
                            <div className="text-emerald-700 font-semibold text-[11px]">
                              {tr(st.role)} · <span className="font-mono">@{st.username || 'unassigned'}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              credStatus === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : credStatus === 'SUSPENDED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tr(credStatus)}
                          </span>
                        </div>

                        <div className="font-mono text-[11px] text-slate-500">
                          {veh?.regNumber || tr('Unassigned')} · {st.mobile}
                        </div>

                        {st.tempPasswordPreview && credStatus === 'TEMP_ISSUED' && (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-mono text-amber-900">
                            {tr('Temp Pass')}: <span className="font-bold">{st.tempPasswordPreview}</span>
                          </div>
                        )}

                        {resetTargetDriverId === st.id ? (
                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={resetDriverPass}
                              onChange={(e) => setResetDriverPass(e.target.value)}
                              placeholder={tr('New temp pass')}
                              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleResetDriverTempPassword(st.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[10px] font-bold"
                            >
                              {t('common.save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetDriverId(null);
                                setResetDriverPass('');
                              }}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-[10px]"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetDriverId(st.id);
                                setResetDriverPass(demoPasscode);
                              }}
                              className="flex-1 py-1 px-2 rounded-lg border border-slate-200 text-slate-700 text-[10px] font-semibold hover:bg-slate-50"
                            >
                              {tr('Reset Pass')}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                patch(`/api/travels/drivers/${st.id}`, {
                                  credentialStatus: credStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                                })
                              }
                              className={`py-1 px-2 rounded-lg text-[10px] font-semibold border ${
                                credStatus === 'SUSPENDED'
                                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  : 'border-red-200 text-red-700 hover:bg-red-50'
                              }`}
                            >
                              {credStatus === 'SUSPENDED' ? tr('Activate') : tr('Suspend')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FOOD QR, RESTAURANT TIE-UPS & COMMISSION PAYABLE */}
          {section === 'food' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {tr('Restaurant Tie-Ups, Bus QR & BusBite Ticket Commission')}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr('Select or leave highway restaurant tie-ups per bus and settle ticket booking commissions due to BusBite')}
                  </p>
                </div>
                {kpis.unsettledTicketCount > 0 && (
                  <button
                    type="button"
                    onClick={() => post(`/api/settlements/${company.id}/settle`, { entityType: 'TRAVELS' })}
                    className="px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 inline-flex items-center gap-1.5"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    {tr('Pay Commission')} (₹{kpis.pendingCommissionDue.toFixed(2)})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> {tr('Bus Ticket Sales')}
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    ₹{kpis.ticketRevenue.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">
                    {tr('Ticket Comm Due')} ({company.ticketCommissionPct ?? 8}%)
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    ₹{kpis.pendingCommissionDue.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {kpis.unsettledTicketCount} {tr('unsettled ticket(s)')}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('Commission Paid to BusBite')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    ₹{kpis.paidCommission.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">{tr('In-Bus Food Orders')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {companyOrders.length} {tr('orders')}
                  </div>
                </div>
              </div>

              {/* Bus Restaurant Tie-Ups Management (Add or Leave Tie-Ups) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {companyQrs.map((qr) => {
                  const veh = state.vehicles.find((v) => v.id === qr.vehicleId);
                  const part = state.partnerships.find((p) => p.id === qr.partnershipId);
                  const tiedIds = part?.restaurantIds || [];
                  const approvedRests = state.restaurants.filter((r) => r.status === 'APPROVED');
                  const tiedRests = approvedRests.filter((r) => tiedIds.includes(r.id));
                  const availableToAdd = approvedRests.filter((r) => !tiedIds.includes(r.id));

                  return (
                    <div key={qr.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-mono font-bold text-sm text-slate-900">{veh?.regNumber}</div>
                          <div className="text-xs font-mono text-emerald-700">
                            QR: {qr.token} · {qr.scanCount} {tr('scans')} · {qr.orderCount} {tr('orders')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenPassengerQr(qr.token)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold shrink-0 hover:bg-emerald-900"
                        >
                          {tr('Test QR Flow')}
                        </button>
                      </div>

                      {part && (
                        <>
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-700">
                              {tr('Active Restaurant Tie-Ups')} ({tiedRests.length})
                            </div>
                            {tiedRests.length === 0 ? (
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-500">
                                {tr('No active tie-ups on this coach. Add a highway restaurant below.')}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {tiedRests.map((rest) => (
                                  <div
                                    key={rest.id}
                                    className="rounded-lg bg-[#F4F8F6] border border-emerald-200/80 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 truncate">{td(rest.name)}</div>
                                      <div className="text-[10px] text-slate-500">{td(rest.city)}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        patch(`/api/partnerships/${part.id}`, {
                                          restaurantIds: tiedIds.filter((id) => id !== rest.id),
                                          actorRole: 'TRAVELS_ADMIN',
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg border border-red-200 bg-white text-red-700 text-[11px] font-semibold hover:bg-red-50 inline-flex items-center gap-1 shrink-0"
                                    >
                                      <Unlink className="w-3 h-3" /> {tr('Leave Tie-Up')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {availableToAdd.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                              <div className="text-[11px] font-bold text-slate-500">
                                {tr('Available Approved Highway Restaurants (+ Add Tie-Up)')}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {availableToAdd.map((rest) => (
                                  <button
                                    key={rest.id}
                                    type="button"
                                    onClick={() =>
                                      patch(`/api/partnerships/${part.id}`, {
                                        restaurantIds: [...tiedIds, rest.id],
                                        actorRole: 'TRAVELS_ADMIN',
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-900 text-[11px] font-semibold hover:bg-emerald-100 inline-flex items-center gap-1"
                                  >
                                    <Link2 className="w-3 h-3" /> + {td(rest.name)} ({td(rest.city)})
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ticket Commission Paid Ledger */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                  {tr('BusBite Ticket Commission Paid Ledger')}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">{tr('Receipt ID')}</th>
                        <th className="py-2.5 px-4 font-medium">{tr('UTR Reference')}</th>
                        <th className="py-2.5 px-4 font-medium">{tr('Tickets Covered')}</th>
                        <th className="py-2.5 px-4 font-medium text-right">{tr('Commission Paid')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {travelsSettlements.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            {tr('No ticket commission payments recorded yet.')}
                          </td>
                        </tr>
                      ) : (
                        travelsSettlements.map((stl) => (
                          <tr key={stl.id}>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{stl.id}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{stl.utrRef}</td>
                            <td className="py-2.5 px-4 font-mono">{stl.ticketIds?.length || 0}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
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

          {/* SECTION 5: COMPANY PROFILE, PASSWORD UPDATE & SIGN OUT */}
          {section === 'profile' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{tr('Company Profile & Account')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr('Update transport operator details, compliance documents, bank account, or change your login password.')}
                </p>
              </div>

              <form
                onSubmit={handleSaveCompanyProfile}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-900">{tr('Transport Company & Compliance Details')}</div>
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    @{company.adminUsername || travelsSession.username}
                  </span>
                </div>

                {compSavedMsg && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900">
                    {compSavedMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Company Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
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
                      value={compOwner}
                      onChange={(e) => setCompOwner(e.target.value)}
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
                      value={compMobile}
                      onChange={(e) => setCompMobile(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Reg Number')}
                    </label>
                    <input
                      type="text"
                      value={compRegNo}
                      onChange={(e) => setCompRegNo(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Fleet RC Doc Ref')}
                    </label>
                    <input
                      type="text"
                      value={compDocRef}
                      onChange={(e) => setCompDocRef(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Permit No')}
                    </label>
                    <input
                      type="text"
                      value={compPermit}
                      onChange={(e) => setCompPermit(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Insurance Ref')}
                    </label>
                    <input
                      type="text"
                      value={compInsurance}
                      onChange={(e) => setCompInsurance(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={compGst}
                      onChange={(e) => setCompGst(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {tr('Partner Bank Account')}
                    </label>
                    <input
                      type="text"
                      value={compBank}
                      onChange={(e) => setCompBank(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={compSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                >
                  {compSaving ? tr('Saving...') : tr('Save Company Profile')}
                </button>
              </form>

              {/* Password Update & Sign Out */}
              <form
                onSubmit={handleTravelsChangePassword}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
                      setTravelsSession(null);
                      setPwUpdateNotice(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {t('common.logout')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </DesktopBrowserFrame>
  );
}
