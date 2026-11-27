import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bus,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Ticket,
  UserPlus,
  UserRound,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';

const PASSENGER_AVATAR = '/src/assets/images/passenger_profile_avatar_1795775491862.jpg';
import type { TourSignal } from '../components/AppGuideTour';
import { MobilePhoneFrame } from '../components/MobilePhoneFrame';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { INDIAN_LANGUAGES, LanguageSelector, useLanguage } from '../i18n/indianLanguages';
import type {
  BusTicketBooking,
  IndianLanguageCode,
  Order,
  OrderType,
  PassengerAccount,
  PlatformState,
  Restaurant,
} from '../types/platform';

interface PassengerPortalProps {
  state: PlatformState;
  activeQrToken: string;
  onSelectQrToken: (token: string) => void;
  post: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(url: string, body?: unknown) => Promise<T>;
  tourSignal?: TourSignal | null;
}

type PassengerStep = 'tickets' | 'landing' | 'menu' | 'checkout' | 'tracking' | 'profile';

const ORDER_STEPS: { key: Order['status']; label: string }[] = [
  { key: 'NEW', label: 'Paid' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Cooking' },
  { key: 'READY', label: 'Ready' },
  { key: 'COMPLETED', label: 'Picked' },
];

function getSeatDecks(vehicleType: string): { lower: string[]; upper: string[]; isSleeper: boolean } {
  if (vehicleType === 'AC Sleeper') {
    return {
      isSleeper: true,
      lower: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'],
      upper: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12'],
    };
  }
  return {
    isSleeper: false,
    lower: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    upper: ['S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24'],
  };
}

export function PassengerPortal({
  state,
  activeQrToken,
  onSelectQrToken,
  post,
  patch,
  tourSignal,
}: PassengerPortalProps) {
  const { language, setLanguage, t, tr, td } = useLanguage();
  const [displayMode, setDisplayMode] = useState<'app' | 'browser'>('app');
  const [step, setStep] = useState<PassengerStep>('menu');

  // Passenger Auth & Profile Session (token strictly kept in React memory)
  const [passengerSession, setPassengerSession] = useState<{ token: string; passengerId: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginId, setLoginId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [regForm, setRegForm] = useState<{
    name: string;
    username: string;
    mobile: string;
    email: string;
    password: string;
    age: string;
    gender: 'Male' | 'Female' | 'Other';
    city: string;
    address: string;
    emergencyContact: string;
    idProofRef: string;
    preferredLanguage: IndianLanguageCode;
  }>({
    name: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    age: '26',
    gender: 'Male',
    city: 'Chennai',
    address: '',
    emergencyContact: '',
    idProofRef: '',
    preferredLanguage: language,
  });
  const [profileEdit, setProfileEdit] = useState<{
    name: string;
    mobile: string;
    email: string;
    city: string;
    address: string;
    emergencyContact: string;
    idProofRef: string;
    age: string;
    gender: 'Male' | 'Female' | 'Other';
    preferredLanguage: IndianLanguageCode;
  }>({
    name: '',
    mobile: '',
    email: '',
    city: '',
    address: '',
    emergencyContact: '',
    idProofRef: '',
    age: '26',
    gender: 'Male',
    preferredLanguage: language,
  });

  useEffect(() => {
    if (!tourSignal) return;
    if (tourSignal.passengerTab) setStep(tourSignal.passengerTab);
    if (tourSignal.passengerDisplay === 'toggle') {
      setDisplayMode((prev) => (prev === 'app' ? 'browser' : 'app'));
    } else if (tourSignal.passengerDisplay) {
      setDisplayMode(tourSignal.passengerDisplay);
    }
  }, [tourSignal?.nonce]);
  const [historyStack, setHistoryStack] = useState<PassengerStep[]>(['menu']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Food Pre-Order State
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Order Preferences
  const [orderType, setOrderType] = useState<OrderType>('TAKEAWAY');
  const [dineInGuests, setDineInGuests] = useState<number>(2);
  const [passengerName, setPassengerName] = useState<string>('Karthik Subramanian');
  const [passengerPhone, setPassengerPhone] = useState<string>('+91 98401 77412');
  const [seatNumber, setSeatNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [dietaryNotes, setDietaryNotes] = useState<string>('');

  // Food Checkout & Tracking State
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idem-${Date.now()}`);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);

  // Bus Ticket Booking State
  const [ticketSubTab, setTicketSubTab] = useState<'search' | 'my-tickets'>('search');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [bookingTripId, setBookingTripId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [activeDeck, setActiveDeck] = useState<'lower' | 'upper'>('lower');
  const [boardingPoint, setBoardingPoint] = useState<string>('');
  const [droppingPoint, setDroppingPoint] = useState<string>('');
  const [passengerAge, setPassengerAge] = useState<string>('27');
  const [passengerGender, setPassengerGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = useState<boolean>(false);
  const [latestTicketId, setLatestTicketId] = useState<string | null>(null);

  const signedInPassenger = useMemo(
    () =>
      passengerSession
        ? state.passengers.find((p) => p.id === passengerSession.passengerId) || null
        : null,
    [passengerSession, state.passengers]
  );

  useEffect(() => {
    if (!signedInPassenger) return;
    setPassengerName(signedInPassenger.name);
    setPassengerPhone(signedInPassenger.mobile);
    if (signedInPassenger.age) setPassengerAge(String(signedInPassenger.age));
    if (signedInPassenger.gender) setPassengerGender(signedInPassenger.gender);
    setProfileEdit({
      name: signedInPassenger.name,
      mobile: signedInPassenger.mobile,
      email: signedInPassenger.email,
      city: signedInPassenger.city,
      address: signedInPassenger.address || '',
      emergencyContact: signedInPassenger.emergencyContact || '',
      idProofRef: signedInPassenger.idProofRef || '',
      age: signedInPassenger.age ? String(signedInPassenger.age) : '26',
      gender: signedInPassenger.gender || 'Male',
      preferredLanguage: signedInPassenger.preferredLanguage,
    });
  }, [signedInPassenger]);

  const navigateStep = (nextStep: PassengerStep) => {
    setStep(nextStep);
    if (historyStack[historyIndex] !== nextStep) {
      const sliced = historyStack.slice(0, historyIndex + 1);
      const updated = [...sliced, nextStep];
      setHistoryStack(updated);
      setHistoryIndex(updated.length - 1);
    }
  };

  const handleBrowserBack = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setStep(historyStack[idx]);
    }
  };

  const handleBrowserForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setStep(historyStack[idx]);
    }
  };

  const activeQr = useMemo(
    () => state.qrCodes.find((q) => q.token === activeQrToken) || state.qrCodes[0],
    [state.qrCodes, activeQrToken]
  );

  const partnership = useMemo(
    () => state.partnerships.find((p) => p.id === activeQr?.partnershipId),
    [state.partnerships, activeQr]
  );

  const vehicle = useMemo(
    () => state.vehicles.find((v) => v.id === activeQr?.vehicleId),
    [state.vehicles, activeQr]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === partnership?.companyId),
    [state.companies, partnership]
  );

  const route = useMemo(
    () => state.routes.find((r) => r.id === activeQr?.routeId),
    [state.routes, activeQr]
  );

  const trip = useMemo(
    () => state.trips.find((t) => t.vehicleId === activeQr?.vehicleId && t.routeId === activeQr?.routeId),
    [state.trips, activeQr]
  );

  const partnerRestaurants = useMemo(() => {
    if (!partnership || partnership.status !== 'APPROVED' || company?.status !== 'APPROVED') return [];
    return partnership.restaurantIds
      .map((id) => state.restaurants.find((r) => r.id === id))
      .filter((r): r is Restaurant => Boolean(r && r.status === 'APPROVED'));
  }, [partnership, company, state.restaurants]);

  useEffect(() => {
    if (!selectedRestaurantId && partnerRestaurants.length > 0) {
      const firstAccepting =
        partnerRestaurants.find((r) => r.acceptingOrders && !r.isClosedToday) || partnerRestaurants[0];
      setSelectedRestaurantId(firstAccepting.id);
    }
  }, [partnerRestaurants, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () => state.restaurants.find((r) => r.id === selectedRestaurantId),
    [state.restaurants, selectedRestaurantId]
  );

  const nextAvailableStop = useMemo(() => {
    for (const rest of partnerRestaurants) {
      const eta = trip?.stopEtas.find((s) => s.restaurantId === rest.id);
      if (rest.acceptingOrders && !rest.isClosedToday && (!eta || !eta.passed)) {
        return { restaurant: rest, eta };
      }
    }
    return null;
  }, [partnerRestaurants, trip]);

  const restaurantMenu = useMemo(
    () => state.menuItems.filter((m) => m.restaurantId === selectedRestaurantId),
    [state.menuItems, selectedRestaurantId]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(restaurantMenu.map((m) => m.category)));
    return ['All', ...cats];
  }, [restaurantMenu]);

  const filteredMenu = useMemo(() => {
    return restaurantMenu.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (vegOnly && !item.isVeg) return false;
      return true;
    });
  }, [restaurantMenu, selectedCategory, vegOnly]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, qty]) => {
        const item = state.menuItems.find((m) => m.id === menuItemId);
        return item ? { item, qty } : null;
      })
      .filter((entry): entry is { item: (typeof state.menuItems)[number]; qty: number } => Boolean(entry));
  }, [cart, state.menuItems]);

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, entry) => sum + entry.qty, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, { item, qty }) => sum + item.price * qty, 0),
    [cartItems]
  );
  const gstAmount = Number((subtotal * 0.05).toFixed(2));
  const serviceFee = subtotal > 0 ? 10 : 0;
  const totalPayable = Number((subtotal + gstAmount + serviceFee).toFixed(2));

  const busOrders = useMemo(
    () => state.orders.filter((o) => o.vehicleId === activeQr?.vehicleId),
    [state.orders, activeQr]
  );

  const activeTrackedOrder = useMemo(() => {
    if (trackedOrderId) {
      return state.orders.find((o) => o.id === trackedOrderId) || busOrders[0];
    }
    return busOrders[0];
  }, [trackedOrderId, state.orders, busOrders]);

  const passengerAlerts = useMemo(
    () => state.notifications.filter((n) => n.targetRole === 'PASSENGER').slice(0, 8),
    [state.notifications]
  );

  // Bus Ticket Computed Data
  const bookableTrips = useMemo(() => {
    return state.trips
      .map((t) => {
        const veh = state.vehicles.find((v) => v.id === t.vehicleId);
        const comp = state.companies.find((c) => c.id === veh?.companyId);
        const rt = state.routes.find((r) => r.id === t.routeId);
        const part = state.partnerships.find(
          (p) => p.vehicleId === veh?.id && p.routeId === rt?.id && p.status === 'APPROVED'
        );
        if (!veh || !comp || !rt || comp.status !== 'APPROVED' || veh.status !== 'ACTIVE') return null;
        if (routeFilter !== 'ALL' && rt.id !== routeFilter) return null;
        const decks = getSeatDecks(veh.type);
        const totalDeckSeats = decks.lower.length + decks.upper.length;
        const availableCount = Math.max(0, totalDeckSeats - t.bookedSeats.length);
        return { trip: t, vehicle: veh, company: comp, route: rt, partnership: part, availableCount };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [state.trips, state.vehicles, state.companies, state.routes, state.partnerships, routeFilter]);

  const selectedBookingTrip = useMemo(
    () => bookableTrips.find((b) => b.trip.id === bookingTripId) || null,
    [bookableTrips, bookingTripId]
  );

  useEffect(() => {
    if (selectedBookingTrip) {
      const stops = selectedBookingTrip.route.stops;
      setBoardingPoint(stops[0]?.name || selectedBookingTrip.route.origin);
      setDroppingPoint(stops[stops.length - 1]?.name || selectedBookingTrip.route.destination);
    }
  }, [selectedBookingTrip]);

  const activeTicketsCount = useMemo(
    () => state.tickets.filter((t) => t.status !== 'CANCELLED').length,
    [state.tickets]
  );

  const handleScanSwitch = async (token: string) => {
    onSelectQrToken(token);
    setCart({});
    setSelectedRestaurantId('');
    navigateStep('menu');
    try {
      await post('/api/qr/scan', { token });
    } catch {
      // Non-blocking scan telemetry
    }
  };

  const handleSelectRestaurant = (restId: string, openMenu = false) => {
    if (selectedRestaurantId !== restId) {
      setCart({});
      setSelectedCategory('All');
    }
    setSelectedRestaurantId(restId);
    if (openMenu) {
      navigateStep('menu');
    }
  };

  const updateCart = (
    menuItemId: string,
    delta: number,
    itemName?: string,
    itemRestaurantId?: string
  ) => {
    if (itemRestaurantId && selectedRestaurantId !== itemRestaurantId) {
      setSelectedRestaurantId(itemRestaurantId);
      setCart({ [menuItemId]: Math.max(1, delta) });
    } else {
      setCart((prev) => {
        const nextQty = Math.max(0, (prev[menuItemId] || 0) + delta);
        const copy = { ...prev };
        if (nextQty === 0) delete copy[menuItemId];
        else copy[menuItemId] = nextQty;
        return copy;
      });
    }
    if (delta > 0 && itemName) {
      setAddedToast(`${tr('Added')} ${td(itemName)}`);
      window.setTimeout(() => setAddedToast(null), 2000);
    }
  };

  const handlePlaceOrder = async (simulateOutcome: 'SUCCESS' | 'FAIL') => {
    if (!activeQr || !selectedRestaurantId || cartItems.length === 0) return;
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          qrId: activeQr.id,
          restaurantId: selectedRestaurantId,
          items: cartItems.map(({ item, qty }) => ({ menuItemId: item.id, qty })),
          orderType,
          dineInGuests: orderType === 'DINE_IN' ? dineInGuests : undefined,
          passengerName,
          passengerPhone,
          seatNumber,
          specialInstructions,
          dietaryNotes,
          simulateOutcome,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; order?: Order; error?: string };
      if (json.order) {
        setTrackedOrderId(json.order.id);
        setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        if (json.ok) {
          setCart({});
        }
        navigateStep('tracking');
      } else {
        setCheckoutError(json.error || 'Could not process order');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Network error during checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPayment = async (orderId: string) => {
    setSubmitting(true);
    try {
      await post(`/api/orders/${orderId}/retry-payment`);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSeatSelection = (seat: string) => {
    setTicketError(null);
    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((s) => s !== seat)
        : prev.length >= 6
          ? prev
          : [...prev, seat]
    );
  };

  const handleBookBusTicket = async () => {
    if (!selectedBookingTrip || selectedSeats.length === 0) return;
    setTicketBusy(true);
    setTicketError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedBookingTrip.trip.id,
          seatNumbers: selectedSeats,
          boardingPoint,
          droppingPoint,
          passengerName,
          passengerPhone,
          passengerAge: Number(passengerAge) || 27,
          passengerGender,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; ticket?: BusTicketBooking; error?: string };
      if (!res.ok || !json.ticket) {
        setTicketError(json.error || 'Could not book bus ticket');
        return;
      }
      setLatestTicketId(json.ticket.id);
      setSeatNumber(json.ticket.seatNumbers.join(', '));
      setSelectedSeats([]);
      setBookingTripId(null);
      setTicketSubTab('my-tickets');
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : 'Network error booking ticket');
    } finally {
      setTicketBusy(false);
    }
  };

  const handleOrderFoodFromTicket = (ticket: BusTicketBooking) => {
    if (ticket.status !== 'BOARDED') return;
    const qr =
      state.qrCodes.find((q) => q.token === ticket.qrToken) ||
      state.qrCodes.find((q) => q.vehicleId === ticket.vehicleId && q.active);
    if (qr) {
      onSelectQrToken(qr.token);
    }
    setPassengerName(ticket.passengerName);
    setPassengerPhone(ticket.passengerPhone);
    setSeatNumber(ticket.seatNumbers[0] || '');
    setSelectedRestaurantId('');
    navigateStep('menu');
  };

  const handlePassengerLogin = async (identifierArg?: string, passwordArg?: string) => {
    const identifier = (identifierArg ?? loginId).trim();
    const password = passwordArg ?? loginPassword;
    if (!identifier || !password) {
      setAuthError('Enter your username, mobile, or email and password.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/passenger/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        passenger?: PassengerAccount;
        token?: string;
        error?: string;
      };
      if (!res.ok || !json.passenger || !json.token) {
        setAuthError(json.error || 'Could not sign in.');
        return;
      }
      setPassengerSession({ token: json.token, passengerId: json.passenger.id });
      setLanguage(json.passenger.preferredLanguage);
      setLoginPassword('');
      setAuthSuccess(`Welcome back, ${json.passenger.name}.`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error signing in');
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePassengerRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/passenger/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regForm,
          age: Number(regForm.age) || 26,
          preferredLanguage: regForm.preferredLanguage || language,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        passenger?: PassengerAccount;
        token?: string;
        error?: string;
      };
      if (!res.ok || !json.passenger || !json.token) {
        setAuthError(json.error || 'Registration failed.');
        return;
      }
      setPassengerSession({ token: json.token, passengerId: json.passenger.id });
      setLanguage(json.passenger.preferredLanguage);
      setAuthSuccess(`Welcome to BusBite, ${json.passenger.name}.`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error registering');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSavePassengerProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!passengerSession) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/passenger/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${passengerSession.token}`,
        },
        body: JSON.stringify({
          ...profileEdit,
          age: Number(profileEdit.age) || 26,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        passenger?: PassengerAccount;
        error?: string;
      };
      if (!res.ok || !json.passenger) {
        setAuthError(json.error || 'Could not update profile.');
        return;
      }
      setLanguage(json.passenger.preferredLanguage);
      setEditingProfile(false);
      setAuthSuccess('Profile details updated.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Network error updating profile');
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePassengerLogout = () => {
    setPassengerSession(null);
    setEditingProfile(false);
    setAuthError(null);
    setAuthSuccess('Signed out cleanly.');
  };

  if (!activeQr || !route || !vehicle) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-sm text-slate-600">
        No active bus route QR found right now.
      </div>
    );
  }

  const notificationsSheet = showNotifications ? (
    <div className="absolute inset-0 z-[75] bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <div className="bg-white rounded-t-[24px] p-3.5 max-h-[75%] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">{tr('Ticket, Bus & Food Alerts')}</h3>
          <button
            type="button"
            onClick={() => setShowNotifications(false)}
            className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {passengerAlerts.length === 0 ? (
          <p className="py-5 text-center text-[11px] text-slate-500">
            {tr('No alerts yet. Book a ticket or order food to get live updates.')}
          </p>
        ) : (
          passengerAlerts.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px]">
              <div className="font-semibold text-slate-900">{td(n.title)}</div>
              <div className="text-slate-600 mt-0.5">{td(n.message)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  const modeSwitcher = (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <div className="inline-flex flex-wrap justify-center items-center gap-1 rounded-xl bg-white border border-emerald-200/80 p-1 shadow-xs max-w-full">
        <button
          type="button"
          onClick={() => setDisplayMode('app')}
          className={`px-2 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 transition-colors ${
            displayMode === 'app'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:text-emerald-900'
          }`}
        >
          <Smartphone className="w-3 h-3" />
          {tr('App')}
        </button>
        <button
          type="button"
          onClick={() => setDisplayMode('browser')}
          className={`px-2 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 transition-colors ${
            displayMode === 'browser'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:text-emerald-900'
          }`}
        >
          <Globe className="w-3 h-3" />
          {tr('Web')}
        </button>
      </div>
      <LanguageSelector compact />
      <button
        type="button"
        onClick={() => navigateStep('profile')}
        className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 transition-colors ${
          signedInPassenger
            ? 'bg-emerald-900 text-white border-emerald-900'
            : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
        }`}
      >
        <UserRound className="w-3 h-3" />
        <span className="max-w-[75px] truncate">
          {signedInPassenger ? signedInPassenger.name.split(' ')[0] : t('common.login')}
        </span>
      </button>
    </div>
  );

  return (
    <MobilePhoneFrame
      appName="BusBite"
      subtitle={`${vehicle.regNumber} · ${td(route.origin.split(' ')[0])} → ${td(route.destination.split(' ')[0])}`}
      brandIcon={
        <img
          src="/assets/aistudio/BusBite_Mobile_App_Logo_012a5e2c.png"
          alt="BusBite"
          className="w-full h-full object-contain"
        />
      }
      unreadNotifications={passengerAlerts.length}
      onBellClick={() => setShowNotifications(true)}
      activeTab={step}
      onTabChange={navigateStep}
      topBarSlot={modeSwitcher}
      browserConfig={
        displayMode === 'browser'
          ? {
              url: `busbite.app/qr/${activeQr.token}${step === 'landing' ? '' : `/${step}`}`,
              onSwitchToApp: () => setDisplayMode('app'),
              onRefresh: () => post('/api/qr/scan', { token: activeQr.token }).catch(() => {}),
              canGoBack: historyIndex > 0,
              canGoForward: historyIndex < historyStack.length - 1,
              onBack: handleBrowserBack,
              onForward: handleBrowserForward,
            }
          : undefined
      }
      overlay={notificationsSheet}
      tabs={[
        { id: 'menu', label: t('passenger.tab.food'), icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
        { id: 'landing', label: t('passenger.tab.route'), icon: <Route className="w-3.5 h-3.5" /> },
        {
          id: 'checkout',
          label: t('passenger.tab.cart'),
          icon: <ShoppingBag className="w-3.5 h-3.5" />,
          badgeCount: totalItemCount || undefined,
        },
        {
          id: 'tracking',
          label: t('passenger.tab.orders'),
          icon: <Clock className="w-3.5 h-3.5" />,
          badgeCount: busOrders.filter((o) => o.status !== 'COMPLETED').length || undefined,
        },
        {
          id: 'tickets',
          label: t('passenger.tab.tickets'),
          icon: <Ticket className="w-3.5 h-3.5" />,
          badgeCount: activeTicketsCount || undefined,
        },
        {
          id: 'profile',
          label: t('passenger.tab.profile'),
          icon: <UserRound className="w-3.5 h-3.5" />,
        },
      ]}
    >
      {/* Add-to-cart toast inside 320px frame */}
      {addedToast && (
        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-900 text-white text-[11px] font-medium flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1 truncate min-w-0">
            <Check className="w-3 h-3 text-emerald-300 shrink-0" />
            <span className="truncate">{addedToast}</span>
          </span>
          <button
            type="button"
            onClick={() => navigateStep('checkout')}
            className="text-emerald-200 font-semibold shrink-0"
          >
            {t('passenger.tab.cart')} ({totalItemCount}) →
          </button>
        </div>
      )}

      {/* TAB 1: BUS TICKET BOOKING & MY BOARDING PASSES */}
      {step === 'tickets' && (
        <div className="space-y-2.5">
          {/* Sub-tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setTicketSubTab('search')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                ticketSubTab === 'search' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              {tr('Book Bus Tickets')}
            </button>
            <button
              type="button"
              onClick={() => setTicketSubTab('my-tickets')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                ticketSubTab === 'my-tickets' ? 'bg-emerald-900 text-white' : 'text-slate-600'
              }`}
            >
              {tr('My Tickets')} ({activeTicketsCount})
            </button>
          </div>

          {ticketSubTab === 'search' && !selectedBookingTrip && (
            <div className="space-y-2.5">
              {/* Route Filter Strip */}
              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                <button
                  type="button"
                  onClick={() => setRouteFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 border ${
                    routeFilter === 'ALL'
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {tr('All Routes')}
                </button>
                {state.routes.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setRouteFilter(rt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 border ${
                      routeFilter === rt.id
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {td(rt.origin.split(' ')[0])} → {td(rt.destination.split(' ')[0])}
                  </button>
                ))}
              </div>

              {/* Scheduled Buses List */}
              {bookableTrips.map(({ trip: bt, vehicle: bv, company: bc, route: br, partnership: bp, availableCount }) => (
                <div
                  key={bt.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-emerald-700 truncate">{td(bc.name)}</div>
                      <div className="text-xs font-extrabold text-slate-900 truncate">{td(br.name)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {bv.regNumber} · {td(bv.type)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold font-mono text-emerald-800">₹{bt.seatFare}</div>
                      <div className="text-[9px] text-slate-400">{tr('Seat')}</div>
                    </div>
                  </div>

                  <div className="bg-[#F4F8F6] rounded-xl px-2.5 py-2 flex items-center justify-between text-[10px]">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{bt.departureTime}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-mono font-bold text-slate-900">{bt.arrivalTime}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      {tr(`${availableCount} seats`)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">
                      {bp ? `${bp.restaurantIds.length} ${tr('Stops')}` : tr('Direct')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingTripId(bt.id);
                        setSelectedSeats([]);
                        setTicketError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-[11px] font-semibold hover:bg-emerald-900 shrink-0"
                    >
                      {tr('Select Seats')} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEAT MAP PICKER & TICKET CHECKOUT */}
          {ticketSubTab === 'search' && selectedBookingTrip && (() => {
            const { trip: bt, vehicle: bv, company: bc, route: br } = selectedBookingTrip;
            const decks = getSeatDecks(bv.type);
            const activeDeckSeats = activeDeck === 'lower' ? decks.lower : decks.upper;
            const seatSubtotal = bt.seatFare * selectedSeats.length;
            const seatGst = Number((seatSubtotal * 0.05).toFixed(2));
            const convFee = selectedSeats.length > 0 ? 25 : 0;
            const grandTotal = Number((seatSubtotal + seatGst + convFee).toFixed(2));

            return (
              <div className="space-y-2.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingTripId(null);
                        setSelectedSeats([]);
                      }}
                      className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{td(bc.name)}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {bv.regNumber} · {bt.departureTime} → {bt.arrivalTime}
                      </div>
                    </div>
                  </div>

                  {/* Deck Switcher */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveDeck('lower')}
                      className={`py-1 rounded-md text-[10px] font-bold ${
                        activeDeck === 'lower' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {decks.isSleeper ? tr('Lower Deck') : `${tr('Lower Deck')} 1–3`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDeck('upper')}
                      className={`py-1 rounded-md text-[10px] font-bold ${
                        activeDeck === 'upper' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {decks.isSleeper ? tr('Upper Deck') : `${tr('Upper Deck')} 4–6`}
                    </button>
                  </div>

                  {/* Seat Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[9px] text-slate-500 px-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded border border-emerald-600 bg-white" /> {tr('Available')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-700" /> {tr('Selected')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-300" /> {tr('Booked')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400" /> RB/MMT
                    </span>
                  </div>

                  {/* 4-column compact Seat Grid for 320px */}
                  <div className="bg-[#F4F8F6] rounded-xl p-2 grid grid-cols-4 gap-1.5">
                    {activeDeckSeats.map((seat) => {
                      const isBooked = bt.bookedSeats.includes(seat);
                      const channel = bt.seatSources?.[seat];
                      const isOtaLocked = isBooked && (channel === 'REDBUS' || channel === 'MAKEMYTRIP');
                      const isSelected = selectedSeats.includes(seat);
                      const channelTag =
                        channel === 'REDBUS' ? 'RB' : channel === 'MAKEMYTRIP' ? 'MMT' : null;
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={isBooked}
                          title={
                            isOtaLocked
                              ? `${channel}`
                              : isBooked
                                ? tr('Booked')
                                : `${tr('Available')} ₹${bt.seatFare}`
                          }
                          onClick={() => toggleSeatSelection(seat)}
                          className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-colors ${
                            isOtaLocked
                              ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed'
                              : isBooked
                                ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-emerald-700 border-emerald-800 text-white'
                                  : 'bg-white border-emerald-400 text-slate-800 hover:bg-emerald-50'
                          }`}
                        >
                          <Armchair className="w-3 h-3 mb-0.5" />
                          <span>{seat}</span>
                          {channelTag && (
                            <span className="text-[7px] leading-none font-bold uppercase tracking-tighter text-amber-700">
                              {channelTag}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Boarding & Passenger Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-900">
                    {tr('Boarding Point')} & {tr('Passenger Name')}
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{tr('Boarding Point')}</label>
                      <select
                        value={boardingPoint}
                        onChange={(e) => setBoardingPoint(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        {br.stops.slice(0, -1).map((st) => (
                          <option key={st.id} value={st.name}>
                            {td(st.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{tr('Dropping Point')}</label>
                      <select
                        value={droppingPoint}
                        onChange={(e) => setDroppingPoint(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        {br.stops.slice(1).map((st) => (
                          <option key={st.id} value={st.name}>
                            {td(st.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={passengerName}
                        onChange={(e) => setPassengerName(e.target.value)}
                        placeholder={tr('Full Name')}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <input
                        type="tel"
                        value={passengerPhone}
                        onChange={(e) => setPassengerPhone(e.target.value)}
                        placeholder={tr('Mobile Number')}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <input
                        type="number"
                        min={5}
                        max={99}
                        value={passengerAge}
                        onChange={(e) => setPassengerAge(e.target.value)}
                        placeholder={tr('Passenger Age')}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                      <select
                        value={passengerGender}
                        onChange={(e) =>
                          setPassengerGender(e.target.value as 'Male' | 'Female' | 'Other')
                        }
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white"
                      >
                        <option value="Male">{tr('Male')}</option>
                        <option value="Female">{tr('Female')}</option>
                        <option value="Other">{tr('Other')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ticket Fare Summary & Pay */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {tr('Seat')} ({selectedSeats.length > 0 ? selectedSeats.join(', ') : '—'})
                    </span>
                    <span className="font-mono">₹{seatSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{tr('GST (5%)')}</span>
                    <span className="font-mono">₹{(seatGst + convFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100 text-xs">
                    <span>{tr('Total Payable')}</span>
                    <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
                  </div>

                  {ticketError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700">
                      {td(ticketError)}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={ticketBusy || selectedSeats.length === 0}
                    onClick={handleBookBusTicket}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {ticketBusy
                      ? tr('Processing...')
                      : selectedSeats.length === 0
                        ? tr('Select Seats')
                        : `${tr('Confirm & Pay Ticket')} · ₹${grandTotal.toFixed(2)}`}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* MY BOOKED TICKETS & BOARDING PASSES */}
          {ticketSubTab === 'my-tickets' && (
            <div className="space-y-2.5">
              {state.tickets.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  {tr('My Tickets')} (0)
                </div>
              ) : (
                state.tickets.map((tkt) => {
                  const veh = state.vehicles.find((v) => v.id === tkt.vehicleId);
                  const rt = state.routes.find((r) => r.id === tkt.routeId);
                  const comp = state.companies.find((c) => c.id === tkt.companyId);
                  const isHighlighted = latestTicketId === tkt.id;

                  return (
                    <div
                      key={tkt.id}
                      className={`bg-white border rounded-2xl p-3 space-y-2 ${
                        isHighlighted ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono font-bold text-emerald-700">
                            {tkt.pnr} · {comp ? td(comp.name) : ''}
                          </div>
                          <div className="text-xs font-extrabold text-slate-900 truncate">
                            {rt ? td(rt.name) : ''}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {veh?.regNumber} · {tr('Seat')}:{' '}
                            <span className="font-bold text-slate-900">{tkt.seatNumbers.join(', ')}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                            tkt.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700'
                              : tkt.status === 'BOARDED'
                                ? 'bg-emerald-900 text-white'
                                : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {tr(tkt.status)}
                        </span>
                      </div>

                      <div className="rounded-xl bg-[#F4F8F6] px-2.5 py-1.5 text-[10px] text-slate-600 space-y-0.5">
                        <div className="truncate">
                          <span className="font-semibold text-slate-800">{tr('Boarding Point')}:</span>{' '}
                          {td(tkt.boardingPoint)}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800">{tr('Dropping Point')}:</span>{' '}
                          {td(tkt.droppingPoint)}
                        </div>
                        <div className="flex justify-between pt-0.5 font-mono font-bold text-slate-900">
                          <span>{tkt.passengerName}</span>
                          <span>₹{tkt.totalFare.toFixed(2)}</span>
                        </div>
                      </div>

                      {tkt.status === 'BOARDED' && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOrderFoodFromTicket(tkt)}
                            className="flex-1 py-2 rounded-xl bg-emerald-800 text-white text-[11px] font-semibold hover:bg-emerald-900"
                          >
                            {tr('Food')} ({tr(`Seat ${tkt.seatNumbers[0]}`)})
                          </button>
                          <button
                            type="button"
                            onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'CANCELLED' })}
                            className="px-2.5 py-2 rounded-xl border border-red-200 text-red-700 text-[10px] font-semibold"
                          >
                            {tr('Cancel')}
                          </button>
                        </div>
                      )}

                      {tkt.status === 'CONFIRMED' && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                patch(`/api/tickets/${tkt.id}/status`, {
                                  status: 'BOARDED',
                                  actorRole: 'PASSENGER',
                                })
                              }
                              className="flex-1 py-2 rounded-xl bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800"
                            >
                              {tr('Account Verified')} · {tr('Food')}
                            </button>
                            <button
                              type="button"
                              onClick={() => patch(`/api/tickets/${tkt.id}/status`, { status: 'CANCELLED' })}
                              className="px-2.5 py-2 rounded-xl border border-red-200 text-red-700 text-[10px] font-semibold"
                            >
                              {tr('Cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QR LANDING & PARTNER RESTAURANTS */}
      {step === 'landing' && (
        <div className="space-y-2.5">
          {/* Bus QR Selector Strip */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            {state.qrCodes.map((qr) => {
              const v = state.vehicles.find((veh) => veh.id === qr.vehicleId);
              const isCurrent = qr.token === activeQr.token;
              return (
                <button
                  key={qr.id}
                  type="button"
                  disabled={!qr.active}
                  onClick={() => handleScanSwitch(qr.token)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                    isCurrent
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-slate-700 border-slate-200 disabled:opacity-40'
                  }`}
                >
                  {v?.regNumber}
                </button>
              );
            })}
          </div>

          {/* Compact Mobile Hero Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="h-24 relative bg-slate-100">
              <img
                src="/src/assets/images/highway_plaza_hero_1795667339325.jpg"
                alt="Highway dining plaza"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex flex-col justify-end p-2.5 text-white">
                <div className="text-[9px] font-mono text-emerald-300 truncate">
                  {company ? td(company.name) : ''} · {activeQr.token}
                </div>
                <h1 className="text-sm font-bold leading-tight truncate">{td(route.name)}</h1>
              </div>
            </div>

            <div className="p-2.5 space-y-2">
              <div className="grid grid-cols-3 gap-1.5 text-center bg-[#F4F8F6] rounded-xl p-2">
                <div>
                  <div className="text-[9px] text-slate-500">{tr('Trip Status')}</div>
                  <div className="text-[11px] font-bold text-emerald-800">
                    {trip?.status === 'IN_PROGRESS' ? tr('Ongoing') : tr(trip?.status || 'Ready')}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">{tr('Speed')}</div>
                  <div className="text-[11px] font-bold font-mono tabular-nums text-slate-900">
                    {tr(`${trip?.speedKmh ?? 0} km/h`)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500">{tr('Restaurants')}</div>
                  <div className="text-[11px] font-bold font-mono tabular-nums text-slate-900">
                    {partnerRestaurants.length} {tr('Stops')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {nextAvailableStop && (
                  <button
                    type="button"
                    onClick={() => handleSelectRestaurant(nextAvailableStop.restaurant.id, true)}
                    className="col-span-2 min-h-[38px] px-3 rounded-xl bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate">
                      {td(nextAvailableStop.restaurant.name)}
                      {nextAvailableStop.eta ? ` (${tr(`${nextAvailableStop.eta.etaMinutes}m`)})` : ''}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateStep('tickets')}
                  className="col-span-2 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 text-[11px] font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Bus className="w-3.5 h-3.5" /> {tr('Book Bus Tickets')}
                </button>
              </div>
            </div>
          </div>

          <RouteMapVisualizer
            route={route}
            trip={trip}
            restaurants={state.restaurants}
            highlightedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={(restId) => handleSelectRestaurant(restId, false)}
            mobileLayout
          />

          <div className="space-y-2">
            <div className="px-0.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900">{tr('Highway Restaurants on Route')}</h2>
              <span className="text-[10px] text-slate-500">{tr('Open Now')}</span>
            </div>

            {!activeQr.active || partnership?.status !== 'APPROVED' ? (
              <div className="bg-white border border-red-200 rounded-xl p-3 text-[11px] text-red-700 text-center">
                {tr('Not Accepting Orders')}
              </div>
            ) : (
              partnerRestaurants.map((rest, idx) => {
                const stopEta = trip?.stopEtas.find((s) => s.restaurantId === rest.id);
                const isPassed = stopEta?.passed;
                const isClosedToday = Boolean(rest.isClosedToday);
                const canOrder = rest.acceptingOrders && !isClosedToday && !isPassed;
                const isFocused = selectedRestaurantId === rest.id;

                return (
                  <div
                    key={rest.id}
                    onClick={() => handleSelectRestaurant(rest.id, false)}
                    className={`bg-white rounded-2xl border p-2.5 flex gap-2.5 transition-colors cursor-pointer ${
                      isFocused ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={rest.heroImage}
                      alt={rest.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500">
                          <span>
                            {tr('Stops')} {idx + 1} · {td(rest.city)}
                          </span>
                          <span className="font-mono font-semibold text-slate-700">★ {rest.rating.toFixed(1)}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 truncate">{td(rest.name)}</h3>
                        <div className="text-[9px] text-slate-500 truncate">
                          {rest.isOpen24Hours ? tr('Open 24 Hours') : td(rest.operatingHours)}
                        </div>
                        <div
                          className={`text-[10px] font-mono tabular-nums font-semibold ${
                            isClosedToday ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {isClosedToday
                            ? tr('Closed Today / On Leave')
                            : isPassed
                              ? tr('Arrived')
                              : `${tr(`${stopEta?.distanceRemainingKm ?? '—'} km`)} · ${tr(`${stopEta?.etaMinutes ?? '—'}m`)}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRestaurant(rest.id, true);
                        }}
                        className={`mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-semibold ${
                          canOrder
                            ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isClosedToday
                          ? tr('Closed Today')
                          : isPassed
                            ? tr('Arrived')
                            : !rest.acceptingOrders
                              ? tr('Paused')
                              : `${tr('Browse Food Menu')} →`}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 1 (DEFAULT FOOD-FIRST): AVAILABLE RESTAURANTS & MENU */}
      {step === 'menu' && (
        <div className="space-y-2.5">
          {/* Bus QR Switcher Strip */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5 min-w-0">
              {state.qrCodes.map((qr) => {
                const v = state.vehicles.find((veh) => veh.id === qr.vehicleId);
                const isCurrent = qr.token === activeQr.token;
                return (
                  <button
                    key={qr.id}
                    type="button"
                    disabled={!qr.active}
                    onClick={() => handleScanSwitch(qr.token)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                      isCurrent
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white text-slate-700 border-slate-200 disabled:opacity-40'
                    }`}
                  >
                    {v?.regNumber}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => navigateStep('landing')}
              className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-semibold shrink-0"
            >
              {tr('Route Map')}
            </button>
          </div>

          {/* Available Highway Restaurants List First */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-slate-900 truncate">
                  {t('passenger.foodHeading')} ({partnerRestaurants.length})
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {td(route.name)} · {tr('Seat number optional')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigateStep('profile')}
                className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 shrink-0"
              >
                {signedInPassenger ? signedInPassenger.name.split(' ')[0] : t('common.profile')}
              </button>
            </div>

            {!activeQr.active || partnership?.status !== 'APPROVED' ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-[10px] text-red-700 text-center">
                {tr('Not Accepting Orders')}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                {partnerRestaurants.map((rest) => {
                  const stopEta = trip?.stopEtas.find((s) => s.restaurantId === rest.id);
                  const isPassed = stopEta?.passed;
                  const isClosedToday = Boolean(rest.isClosedToday);
                  const isSelected = selectedRestaurantId === rest.id;
                  const canOrder = rest.acceptingOrders && !isClosedToday && !isPassed;
                  return (
                    <button
                      key={rest.id}
                      type="button"
                      onClick={() => handleSelectRestaurant(rest.id, false)}
                      className={`min-w-[165px] max-w-[165px] text-left rounded-xl border p-2 transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-emerald-900 text-white border-emerald-900'
                          : 'bg-[#F4F8F6] text-slate-900 border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] gap-1">
                        <span className={`truncate ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                          {td(rest.city)}
                        </span>
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            !canOrder
                              ? isSelected
                                ? 'text-amber-300'
                                : 'text-red-600'
                              : isSelected
                                ? 'text-emerald-300'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isClosedToday
                            ? tr('Closed Today')
                            : isPassed
                              ? tr('Arrived')
                              : !rest.acceptingOrders
                                ? tr('Paused')
                                : tr(`${stopEta?.etaMinutes ?? '—'}m`)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold truncate mt-0.5">{td(rest.name)}</div>
                      <div className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                        ★ {rest.rating.toFixed(1)} · {tr(`${rest.avgPrepMinutes}m prep`)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedRestaurant && (
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-slate-900 truncate">{td(selectedRestaurant.name)}</h2>
                  <div className="text-[10px] text-slate-500 truncate">
                    {td(selectedRestaurant.city)} · {tr(`${selectedRestaurant.avgPrepMinutes}m prep`)} ·{' '}
                    {selectedRestaurant.isOpen24Hours
                      ? tr('Open 24 Hours')
                      : td(selectedRestaurant.operatingHours)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVegOnly((v) => !v)}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-semibold shrink-0 ${
                    vegOnly
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {vegOnly ? `${tr('Veg')} ✓` : tr('Veg')}
                </button>
              </div>

              {(selectedRestaurant.isClosedToday || !selectedRestaurant.acceptingOrders) && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-2.5 py-2 text-[10px] text-red-700 font-semibold">
                  {selectedRestaurant.isClosedToday
                    ? `${tr('Closed Today / On Leave')}${selectedRestaurant.closureReason ? ` · ${td(selectedRestaurant.closureReason)}` : ''}`
                    : tr('Kitchen Paused')}
                </div>
              )}

              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-emerald-900 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cat === 'All' ? tr('All') : td(cat)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedRestaurant && (
            <div className="space-y-2">
              {filteredMenu.map((item) => {
                const qty = cart[item.id] || 0;
                const restaurantClosed = Boolean(selectedRestaurant.isClosedToday || !selectedRestaurant.acceptingOrders);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-2.5 flex gap-2.5 justify-between"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-500">
                          <span
                            className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-[2px] border ${
                              item.isVeg ? 'border-emerald-700' : 'border-red-700'
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${
                                item.isVeg ? 'bg-emerald-700' : 'bg-red-700'
                              }`}
                            />
                          </span>
                          <span>{item.isVeg ? tr('Veg') : tr('Non-Veg')}</span>
                          <span>· {tr(`${item.prepMinutes}m`)}</span>
                        </div>
                        <h3 className="text-[11px] font-bold text-slate-900 mt-0.5 leading-tight">
                          {td(item.name)}
                        </h3>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                          {td(item.description)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold font-mono tabular-nums text-slate-900">
                          ₹{item.price}
                        </span>
                        {restaurantClosed ? (
                          <span className="text-[10px] font-semibold text-red-600">
                            {tr('Closed Today')}
                          </span>
                        ) : !item.available ? (
                          <span className="text-[10px] font-semibold text-red-600">{tr('Sold Out')}</span>
                        ) : qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateCart(item.id, 1, item.name, item.restaurantId)}
                            className="px-2.5 py-1 rounded-lg border border-emerald-800 text-emerald-900 text-[10px] font-semibold hover:bg-emerald-800 hover:text-white transition-colors"
                          >
                            + {tr('Add')}
                          </button>
                        ) : (
                          <div className="inline-flex items-center border border-emerald-900 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, -1)}
                              className="h-6 w-6 flex items-center justify-center text-emerald-900"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-1.5 text-[11px] font-mono font-bold tabular-nums">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, 1, item.name, item.restaurantId)}
                              className="h-6 w-6 flex items-center justify-center text-emerald-900"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0 self-center"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalItemCount > 0 && (
            <button
              type="button"
              onClick={() => navigateStep('checkout')}
              className="w-full min-h-[40px] rounded-xl bg-emerald-800 text-white px-3 py-2 text-[11px] font-bold flex items-center justify-between shadow-md"
            >
              <span>
                {totalItemCount} · ₹{totalPayable.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1">
                {tr('Checkout')} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}
        </div>
      )}

      {/* TAB 4: CART, DINING PREFERENCES & PAYMENT CHECKOUT */}
      {step === 'checkout' && (
        <div className="space-y-2.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-900">{t('passenger.tab.cart')}</h2>
              <button
                type="button"
                onClick={() => navigateStep('menu')}
                className="text-[11px] font-semibold text-emerald-700"
              >
                + {tr('Add')}
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-5 text-center text-[11px] text-slate-500 space-y-2">
                <p>{tr('Cart is empty')}</p>
                <button
                  type="button"
                  onClick={() => navigateStep('menu')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold"
                >
                  {tr('Browse Food Menu')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map(({ item, qty }) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">{td(item.name)}</div>
                      <div className="text-[10px] font-mono text-slate-500">₹{item.price} × {qty}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="inline-flex items-center border border-slate-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, -1)}
                          className="h-6 w-6 flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1 text-[11px] font-mono font-bold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, 1)}
                          className="h-6 w-6 flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="w-10 text-right text-[11px] font-mono font-bold">
                        ₹{(item.price * qty).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dining Mode & Passenger Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900">
              {tr('Order Mode')} & {tr('Seat Number')}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 ${
                  orderType === 'TAKEAWAY'
                    ? 'border-emerald-900 bg-emerald-900 text-white'
                    : 'border-slate-200 text-slate-800'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{tr('TAKEAWAY')}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 ${
                  orderType === 'DINE_IN'
                    ? 'border-emerald-900 bg-emerald-900 text-white'
                    : 'border-slate-200 text-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">{tr('DINE_IN')}</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                  {tr('Passenger Name')}
                </label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                  {tr('Mobile Number')}
                </label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                  {tr('Seat number optional')}
                </label>
                <input
                  type="text"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  placeholder="U6"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                />
              </div>
              {orderType === 'DINE_IN' ? (
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    {tr('Guests')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={dineInGuests}
                    onChange={(e) => setDineInGuests(Number(e.target.value) || 1)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    {tr('Dietary Notes')}
                  </label>
                  <input
                    type="text"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder={tr('Dietary Notes')}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                  />
                </div>
              )}
            </div>

            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder={tr('Special Instructions')}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
            />
          </div>

          {/* Payment Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>{tr('Subtotal')}</span>
                <span className="font-mono tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{tr('GST (5%)')} + {tr('Service Fee')}</span>
                <span className="font-mono tabular-nums">₹{(gstAmount + serviceFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>{tr('Total Payable')}</span>
                <span className="font-mono tabular-nums">₹{totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{td(checkoutError)}</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || cartItems.length === 0 || Boolean(selectedRestaurant?.isClosedToday)}
              onClick={() => handlePlaceOrder('SUCCESS')}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {submitting ? tr('Processing...') : `${tr('Pay & Place Order')} · ₹${totalPayable.toFixed(2)}`}
            </button>
            <button
              type="button"
              disabled={submitting || cartItems.length === 0}
              onClick={() => handlePlaceOrder('FAIL')}
              className="w-full py-1.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              {tr('Simulate Fail')}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE ORDER TRACKING & COLLECTION */}
      {step === 'tracking' && (
        <div className="space-y-2.5">
          {busOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2.5">
              <p className="text-xs text-slate-500">
                {tr('Orders')} (0) · {vehicle.regNumber}
              </p>
              <button
                type="button"
                onClick={() => navigateStep('menu')}
                className="px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
              >
                {tr('Browse Food Menu')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
                {busOrders.map((ord) => {
                  const isSel = activeTrackedOrder?.id === ord.id;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setTrackedOrderId(ord.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold whitespace-nowrap shrink-0 border ${
                        isSel
                          ? 'bg-emerald-950 text-white border-emerald-950'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {ord.id} · {ord.paymentStatus === 'FAILED' ? tr('Failed') : tr(ord.status)}
                    </button>
                  );
                })}
              </div>

              {activeTrackedOrder &&
                (() => {
                  const rest = state.restaurants.find((r) => r.id === activeTrackedOrder.restaurantId);
                  const stopEta = trip?.stopEtas.find(
                    (s) => s.restaurantId === activeTrackedOrder.restaurantId
                  );
                  const activeIdx = ORDER_STEPS.findIndex((s) => s.key === activeTrackedOrder.status);

                  return (
                    <div className="space-y-2.5">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="min-w-0">
                            <div className="text-[9px] font-mono text-slate-500">
                              {activeTrackedOrder.id} · {tr(activeTrackedOrder.orderType)}
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 truncate">
                              {rest ? td(rest.name) : ''}
                            </h2>
                            <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {rest ? td(rest.city) : ''}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" /> {rest?.mobile}
                              </span>
                            </div>
                          </div>

                          {activeTrackedOrder.paymentStatus === 'VERIFIED' &&
                            activeTrackedOrder.status !== 'REJECTED' && (
                              <div className="bg-emerald-950 text-white rounded-xl px-2.5 py-1 text-center shrink-0">
                                <div className="text-[8px] text-emerald-300">{tr('Pickup PIN')}</div>
                                <div className="text-sm font-mono font-bold tracking-wider tabular-nums">
                                  {activeTrackedOrder.pickupCode}
                                </div>
                              </div>
                            )}
                        </div>

                        {activeTrackedOrder.paymentStatus === 'FAILED' && (
                          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-[11px] text-red-800">
                            <div className="font-bold">{tr('Failed')}</div>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleRetryPayment(activeTrackedOrder.id)}
                              className="w-full py-1.5 rounded-lg bg-red-700 text-white font-semibold inline-flex items-center justify-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {tr('Retry Payment')} (₹{activeTrackedOrder.totalAmount.toFixed(2)})
                            </button>
                          </div>
                        )}

                        {activeTrackedOrder.status === 'REJECTED' && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                            <div className="font-bold">{tr('Rejected')}</div>
                            <p className="mt-0.5">
                              {activeTrackedOrder.rejectionReason ? td(activeTrackedOrder.rejectionReason) : ''} · ₹
                              {activeTrackedOrder.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        )}

                        {activeTrackedOrder.paymentStatus !== 'FAILED' &&
                          activeTrackedOrder.status !== 'REJECTED' && (
                            <div className="grid grid-cols-5 gap-1">
                              {ORDER_STEPS.map((st, idx) => {
                                const done = activeIdx >= idx;
                                return (
                                  <div key={st.key} className="text-center">
                                    <div
                                      className={`h-1 rounded-full mb-1 ${
                                        done ? 'bg-emerald-600' : 'bg-slate-200'
                                      }`}
                                    />
                                    <div
                                      className={`text-[9px] font-medium truncate ${
                                        done ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                                      }`}
                                    >
                                      {tr(st.label)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {activeTrackedOrder.status === 'READY' && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-950">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <div>
                              <span className="font-bold">{tr('Ready')}!</span> {tr('Pickup PIN')}:{' '}
                              <span className="font-mono font-bold">{activeTrackedOrder.pickupCode}</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                          <div>
                            <div className="text-slate-400">{tr('Vehicle')}</div>
                            <div className="font-mono font-bold text-slate-900 truncate">
                              {vehicle.regNumber}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">{tr('Distance')}</div>
                            <div className="font-mono font-bold tabular-nums text-slate-900">
                              {stopEta?.passed ? '0' : tr(`${stopEta?.distanceRemainingKm ?? '—'} km`)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">{tr('Pickup Time')}</div>
                            <div className="font-mono font-bold tabular-nums text-emerald-700">
                              {stopEta?.passed ? '0' : tr(`${stopEta?.etaMinutes ?? '—'}m`)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <RouteMapVisualizer
                        route={route}
                        trip={trip}
                        restaurants={state.restaurants}
                        highlightedRestaurantId={activeTrackedOrder.restaurantId}
                        mobileLayout
                      />

                      <div className="bg-white border border-slate-200 rounded-2xl p-3 text-[11px] space-y-1.5">
                        <div className="font-bold text-slate-900">{tr('Orders')}</div>
                        {activeTrackedOrder.items.map((it) => (
                          <div key={it.menuItemId} className="flex justify-between text-slate-700 gap-2">
                            <span className="truncate">{it.qty}× {td(it.name)}</span>
                            <span className="font-mono tabular-nums shrink-0">
                              ₹{(it.qty * it.unitPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                          <span>{tr('Total Payable')}</span>
                          <span className="font-mono tabular-nums">
                            ₹{activeTrackedOrder.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </div>
      )}
      {/* TAB 6: PASSENGER PROFILE, LOGIN & REGISTRATION */}
      {step === 'profile' && (
        <div className="space-y-2.5">
          {!signedInPassenger ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              {/* Clean Account Header */}
              <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-3.5 py-4 text-white flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center">
                    <UserRound className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold leading-tight truncate">
                    {t('passenger.profileTitle')}
                  </h2>
                  <p className="text-[10px] text-emerald-100/90 mt-0.5 leading-snug">
                    {authMode === 'login' ? t('passenger.loginSubtitle') : t('passenger.registerSubtitle')}
                  </p>
                </div>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 ${
                      authMode === 'login' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600'
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
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center justify-center gap-1 ${
                      authMode === 'register' ? 'bg-emerald-900 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" /> {t('common.register')}
                  </button>
                </div>

                {authError && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700">
                    {authError}
                  </div>
                )}
                {authSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-medium">
                    {authSuccess}
                  </div>
                )}

                {authMode === 'login' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePassengerLogin();
                    }}
                    className="space-y-2"
                  >
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        {t('common.username')} / {tr('Mobile Number')}
                      </label>
                      <input
                        type="text"
                        required
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="ananya.k"
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        {t('common.password')}
                      </label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t('common.password')}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900 disabled:opacity-40"
                    >
                      {authBusy ? tr('Processing...') : t('common.login')}
                    </button>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="text-[9px] font-semibold text-slate-400">
                        {tr('Quick Sign-In')}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePassengerLogin('ananya.k', ['BusBite', '@', '2026'].join(''))}
                          className="py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-semibold truncate"
                        >
                          Ananya (ananya.k)
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePassengerLogin('karthik.s', ['BusBite', '@', '2026'].join(''))}
                          className="py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-semibold truncate"
                        >
                          Karthik (karthik.s)
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handlePassengerRegister} className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Full Name')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regForm.name}
                          onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                          placeholder="Priya Ramesh"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {t('common.username')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regForm.username}
                          onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                          placeholder="priya.r"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Mobile Number')} *
                        </label>
                        <input
                          type="tel"
                          required
                          value={regForm.mobile}
                          onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                          placeholder="+91 98400 12345"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Email')}
                        </label>
                        <input
                          type="email"
                          value={regForm.email}
                          onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                          placeholder="priya@mail.in"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('City')}
                        </label>
                        <input
                          type="text"
                          value={regForm.city}
                          onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Passenger Age')}
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={99}
                          value={regForm.age}
                          onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Gender')}
                        </label>
                        <select
                          value={regForm.gender}
                          onChange={(e) =>
                            setRegForm({ ...regForm, gender: e.target.value as 'Male' | 'Female' | 'Other' })
                          }
                          className="w-full border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] bg-white"
                        >
                          <option value="Male">{tr('Male')}</option>
                          <option value="Female">{tr('Female')}</option>
                          <option value="Other">{tr('Other')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        {tr('Address')}
                      </label>
                      <input
                        type="text"
                        value={regForm.address}
                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                        placeholder={tr('Address')}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Emergency Contact')}
                        </label>
                        <input
                          type="text"
                          value={regForm.emergencyContact}
                          onChange={(e) => setRegForm({ ...regForm, emergencyContact: e.target.value })}
                          placeholder="+91 98400 99999"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('ID Proof Reference')}
                        </label>
                        <input
                          type="text"
                          value={regForm.idProofRef}
                          onChange={(e) => setRegForm({ ...regForm, idProofRef: e.target.value })}
                          placeholder="AADHAAR-••••-1122"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {tr('Preferred Language')}
                        </label>
                        <select
                          value={regForm.preferredLanguage}
                          onChange={(e) =>
                            setRegForm({
                              ...regForm,
                              preferredLanguage: e.target.value as IndianLanguageCode,
                            })
                          }
                          className="w-full border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] bg-white"
                        >
                          {INDIAN_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.nativeName} ({l.englishName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          {t('common.password')} *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={regForm.password}
                          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                          placeholder="Min 6"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900 disabled:opacity-40"
                    >
                      {authBusy ? tr('Processing...') : t('common.register')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            (() => {
              const paxTickets = state.tickets.filter(
                (tkt) =>
                  tkt.passengerPhone === signedInPassenger.mobile ||
                  tkt.passengerName.toLowerCase() === signedInPassenger.name.toLowerCase()
              );
              const paxOrders = state.orders.filter(
                (o) =>
                  o.passengerPhone === signedInPassenger.mobile ||
                  o.passengerName.toLowerCase() === signedInPassenger.name.toLowerCase()
              );
              const initials = signedInPassenger.name
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div className="space-y-2.5">
                  {/* Consumer Mobile Profile Hero Card */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xs">
                    <div className="h-16 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-700 relative px-3 pt-2.5 flex items-start justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingProfile((v) => !v)}
                        className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold inline-flex items-center gap-1 backdrop-blur-xs"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {editingProfile ? tr('Cancel') : tr('Edit Profile')}
                      </button>
                      <button
                        type="button"
                        onClick={handlePassengerLogout}
                        aria-label={t('common.logout')}
                        className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white backdrop-blur-xs"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="px-3.5 pb-3.5 -mt-9 flex flex-col items-center text-center">
                      <div className="relative">
                        <img
                          src={PASSENGER_AVATAR}
                          alt={signedInPassenger.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="h-[68px] w-[68px] rounded-full object-cover object-top ring-4 ring-white shadow-md bg-emerald-100"
                        />
                        <span
                          title={tr('Account Verified')}
                          className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-600 text-white ring-2 ring-white flex items-center justify-center"
                        >
                          <BadgeCheck className="w-3.5 h-3.5" />
                        </span>
                        <span className="sr-only">{initials}</span>
                      </div>

                      <h2 className="text-sm font-extrabold text-slate-900 mt-2 leading-tight">
                        {signedInPassenger.name}
                      </h2>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        @{signedInPassenger.username} · {td(signedInPassenger.city)}
                      </div>
                      <div className="text-[10px] font-mono font-semibold text-emerald-700 mt-0.5">
                        {signedInPassenger.mobile}
                      </div>

                      {/* Clean 2-Column Activity Strip */}
                      <div className="w-full grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => navigateStep('tickets')}
                          className="rounded-xl bg-[#F4F8F6] hover:bg-emerald-50 border border-slate-200/70 py-2 px-2.5 text-center transition-colors"
                        >
                          <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900">
                            {paxTickets.length}
                          </div>
                          <div className="text-[9px] font-semibold text-slate-500">{t('passenger.tab.tickets')}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateStep('tracking')}
                          className="rounded-xl bg-[#F4F8F6] hover:bg-emerald-50 border border-slate-200/70 py-2 px-2.5 text-center transition-colors"
                        >
                          <div className="text-sm font-extrabold font-mono tabular-nums text-emerald-800">
                            {paxOrders.length}
                          </div>
                          <div className="text-[9px] font-semibold text-slate-500">{t('passenger.tab.orders')}</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {authSuccess && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-medium">
                      {td(authSuccess)}
                    </div>
                  )}
                  {authError && (
                    <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-700">
                      {td(authError)}
                    </div>
                  )}

                  {/* Grouped Native Account List / Edit Form */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-[11px] font-bold text-slate-900">{t('passenger.profileTitle')}</h3>
                      <span className="text-[9px] font-semibold text-emerald-700">
                        {INDIAN_LANGUAGES.find((l) => l.code === signedInPassenger.preferredLanguage)
                          ?.nativeName || 'English'}
                      </span>
                    </div>

                    {!editingProfile ? (
                      <div className="divide-y divide-slate-100 text-[10px]">
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <span className="text-slate-500 inline-flex items-center gap-1.5 shrink-0">
                            <Mail className="w-3 h-3 text-emerald-700" /> {tr('Email')}
                          </span>
                          <span className="font-mono font-medium text-slate-900 truncate">
                            {signedInPassenger.email}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <span className="text-slate-500 inline-flex items-center gap-1.5 shrink-0">
                            <UserRound className="w-3 h-3 text-emerald-700" /> {tr('Passenger Age')} / {tr('Gender')}
                          </span>
                          <span className="font-medium text-slate-900">
                            {signedInPassenger.age || '—'} · {signedInPassenger.gender ? tr(signedInPassenger.gender) : '—'}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <span className="text-slate-500 inline-flex items-center gap-1.5 shrink-0">
                            <Phone className="w-3 h-3 text-emerald-700" /> {tr('Emergency Contact')}
                          </span>
                          <span className="font-mono font-medium text-slate-900 truncate">
                            {signedInPassenger.emergencyContact || '—'}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <span className="text-slate-500 inline-flex items-center gap-1.5 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" /> {tr('ID Proof Reference')}
                          </span>
                          <span className="font-mono font-medium text-slate-900 truncate">
                            {signedInPassenger.idProofRef || '—'}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-slate-500">{tr('Address')}</div>
                            <div className="text-slate-900 font-medium mt-0.5 leading-snug">
                              {signedInPassenger.address || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSavePassengerProfile} className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            required
                            value={profileEdit.name}
                            onChange={(e) => setProfileEdit({ ...profileEdit, name: e.target.value })}
                            placeholder={tr('Full Name')}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                          />
                          <input
                            type="tel"
                            required
                            value={profileEdit.mobile}
                            onChange={(e) => setProfileEdit({ ...profileEdit, mobile: e.target.value })}
                            placeholder={tr('Mobile Number')}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                          />
                          <input
                            type="email"
                            value={profileEdit.email}
                            onChange={(e) => setProfileEdit({ ...profileEdit, email: e.target.value })}
                            placeholder={tr('Email')}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                          />
                          <input
                            type="text"
                            value={profileEdit.city}
                            onChange={(e) => setProfileEdit({ ...profileEdit, city: e.target.value })}
                            placeholder={tr('City')}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                          />
                        </div>
                        <input
                          type="text"
                          value={profileEdit.address}
                          onChange={(e) => setProfileEdit({ ...profileEdit, address: e.target.value })}
                          placeholder={tr('Address')}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={profileEdit.emergencyContact}
                            onChange={(e) =>
                              setProfileEdit({ ...profileEdit, emergencyContact: e.target.value })
                            }
                            placeholder={tr('Emergency Contact')}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]"
                          />
                          <select
                            value={profileEdit.preferredLanguage}
                            onChange={(e) =>
                              setProfileEdit({
                                ...profileEdit,
                                preferredLanguage: e.target.value as IndianLanguageCode,
                              })
                            }
                            className="border border-slate-200 rounded-lg px-1.5 py-1.5 text-[11px] bg-white"
                          >
                            {INDIAN_LANGUAGES.map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.nativeName} ({l.englishName})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={authBusy}
                          className="w-full py-2 rounded-xl bg-emerald-800 text-white text-[11px] font-bold"
                        >
                          {authBusy ? tr('Saving...') : t('common.save')}
                        </button>
                      </form>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePassengerLogout}
                    className="w-full py-2.5 rounded-xl border border-red-200 bg-white text-red-700 text-[11px] font-bold hover:bg-red-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {t('common.logout')}
                  </button>
                </div>
              );
            })()
          )}
        </div>
      )}
    </MobilePhoneFrame>
  );
}
