export type PortalView = 'passenger' | 'restaurant' | 'driver' | 'travels' | 'admin';

export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'SUSPENDED' | 'REJECTED';

export type IndianLanguageCode =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'ur'
  | 'sa'
  | 'kok'
  | 'mni'
  | 'ne'
  | 'brx'
  | 'doi'
  | 'mai'
  | 'sat'
  | 'ks'
  | 'sd';

export type CredentialSyncStatus = 'NOT_ISSUED' | 'TEMP_ISSUED' | 'ACTIVE_SYNCED';

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';

export type TripStatus = 'ASSIGNED' | 'READY_TO_START' | 'IN_PROGRESS' | 'COMPLETED';

export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export type TicketStatus = 'CONFIRMED' | 'BOARDED' | 'CANCELLED';

export type BookingChannel = 'BUSBITE' | 'REDBUS' | 'MAKEMYTRIP' | 'COUNTER';
export type OrderRole = 'PASSENGER' | 'CREW';

export interface PassengerAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  city: string;
  address?: string;
  emergencyContact?: string;
  idProofRef?: string;
  preferredLanguage: IndianLanguageCode;
  registrationSource: 'PASSENGER_APP' | 'QR_CHECKOUT';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  operatingHours: string;
  openingTime?: string;
  closingTime?: string;
  isOpen24Hours?: boolean;
  isClosedToday?: boolean;
  closureReason?: string;
  status: ApprovalStatus;
  acceptingOrders: boolean;
  commissionPct: number;
  gstNumber: string;
  fssaiNumber: string;
  hygieneCertRef?: string;
  bankAccount: string;
  branches: string[];
  heroImage: string;
  rating: number;
  avgPrepMinutes: number;
  crewDiscountPct?: number;
  crewOfferLabel?: string;
  complimentaryPerk?: string;
  adminUsername?: string;
  credentialStatus?: CredentialSyncStatus;
  mustChangePassword?: boolean;
  tempPasswordPreview?: string;
  passwordUpdatedAt?: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  available: boolean;
  image: string;
  prepMinutes: number;
}

export interface TransportCompany {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  registrationNo: string;
  status: ApprovalStatus;
  documentRef: string;
  permitNo?: string;
  insuranceRef?: string;
  gstNumber?: string;
  bankAccount?: string;
  ticketCommissionPct: number;
  adminUsername?: string;
  credentialStatus?: CredentialSyncStatus;
  mustChangePassword?: boolean;
  tempPasswordPreview?: string;
  passwordUpdatedAt?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  mobile: string;
  licenseNo: string;
  companyId: string;
  role: 'DRIVER' | 'CONDUCTOR';
  assignedVehicleId: string;
  username?: string;
  credentialStatus?: 'TEMP_ISSUED' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  mustChangePassword?: boolean;
  tempPasswordPreview?: string;
  passwordUpdatedAt?: string;
  lastLoginAt?: string;
  selfRegistered?: boolean;
}

export interface Vehicle {
  id: string;
  companyId: string;
  regNumber: string;
  type: 'AC Sleeper' | 'Volvo Multi-Axle' | 'Luxury Seater' | 'Tempo Traveller';
  seatingCapacity: number;
  routeId: string;
  driverId: string;
  conductorId: string;
  status: 'ACTIVE' | 'MAINTENANCE';
}

export interface RouteStop {
  id: string;
  name: string;
  kmFromOrigin: number;
  lat: number;
  lng: number;
  expectedArrivalWindow: string;
  restaurantId?: string;
}

export interface HighwayRoute {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  totalKm: number;
  stops: RouteStop[];
}

export interface Partnership {
  id: string;
  companyId: string;
  vehicleId: string;
  routeId: string;
  restaurantIds: string[];
  startDate: string;
  endDate: string;
  status: 'APPROVED' | 'INACTIVE';
  createdAt: string;
}

export interface QRCodeRecord {
  id: string;
  token: string;
  partnershipId: string;
  vehicleId: string;
  routeId: string;
  active: boolean;
  scanCount: number;
  orderCount: number;
  createdAt: string;
}

export interface TripStopEta {
  stopId: string;
  stopName: string;
  restaurantId?: string;
  kmFromOrigin: number;
  distanceRemainingKm: number;
  etaMinutes: number;
  passed: boolean;
}

export interface Trip {
  id: string;
  vehicleId: string;
  routeId: string;
  driverId: string;
  conductorId: string;
  status: TripStatus;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  seatFare: number;
  bookedSeats: string[];
  seatSources?: Record<string, BookingChannel>;
  progressPct: number;
  currentKm: number;
  currentLat: number;
  currentLng: number;
  speedKmh: number;
  headingDeg: number;
  stopEtas: TripStopEta[];
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt: string;
}

export interface BusTicketBooking {
  id: string;
  pnr: string;
  tripId: string;
  vehicleId: string;
  companyId: string;
  routeId: string;
  seatNumbers: string[];
  boardingPoint: string;
  droppingPoint: string;
  travelDate: string;
  passengerName: string;
  passengerPhone: string;
  passengerAge: number;
  passengerGender: 'Male' | 'Female' | 'Other';
  farePerSeat: number;
  subtotal: number;
  gstAmount: number;
  convenienceFee: number;
  totalFare: number;
  ticketCommissionPct: number;
  platformCommission: number;
  operatorNet: number;
  bookingChannel?: BookingChannel;
  paymentRef: string;
  status: TicketStatus;
  qrToken?: string;
  bookedAt: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  isVeg: boolean;
}

export interface Order {
  id: string;
  pickupCode: string;
  idempotencyKey: string;
  qrId: string;
  vehicleId: string;
  companyId: string;
  routeId: string;
  tripId: string;
  restaurantId: string;
  items: OrderItem[];
  subtotal: number;
  crewDiscountAmount?: number;
  gstAmount: number;
  serviceFee: number;
  totalAmount: number;
  commissionPct: number;
  platformCommission: number;
  gatewayFee: number;
  restaurantPayable: number;
  orderType: OrderType;
  orderRole?: OrderRole;
  complimentaryPerk?: string;
  dineInGuests?: number;
  passengerName: string;
  passengerPhone: string;
  seatNumber?: string;
  specialInstructions?: string;
  dietaryNotes?: string;
  paymentStatus: PaymentStatus;
  paymentRef: string;
  status: OrderStatus;
  etaMinutesAtOrder: number;
  distanceKmAtOrder: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  entityType?: 'RESTAURANT' | 'TRAVELS';
  entityId?: string;
  restaurantId: string;
  orderIds: string[];
  ticketIds?: string[];
  grossAmount: number;
  commissionAmount: number;
  gatewayFeeTotal: number;
  gstOnFees: number;
  netPayable: number;
  status: 'PENDING' | 'SETTLED';
  settledAt?: string;
  utrRef?: string;
}

export interface PlatformNotification {
  id: string;
  targetRole: 'SUPER_ADMIN' | 'TRAVELS_ADMIN' | 'RESTAURANT' | 'DRIVER' | 'PASSENGER';
  targetId?: string;
  title: string;
  message: string;
  type: 'ORDER' | 'ETA' | 'PAYMENT' | 'TRIP' | 'TICKET' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorRole: string;
  action: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface PlatformState {
  passengers: PassengerAccount[];
  restaurants: Restaurant[];
  menuItems: MenuItem[];
  companies: TransportCompany[];
  staff: StaffMember[];
  vehicles: Vehicle[];
  routes: HighwayRoute[];
  partnerships: Partnership[];
  qrCodes: QRCodeRecord[];
  trips: Trip[];
  tickets: BusTicketBooking[];
  orders: Order[];
  settlements: Settlement[];
  notifications: PlatformNotification[];
  auditLogs: AuditLog[];
}
