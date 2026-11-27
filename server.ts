import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import type {
  PlatformState,
  RouteStop,
  Trip,
  TripStopEta,
  Order,
  OrderStatus,
  Restaurant,
  TransportCompany,
  StaffMember,
  Vehicle,
  HighwayRoute,
  Partnership,
  QRCodeRecord,
  PlatformNotification,
  AuditLog,
  Settlement,
  BusTicketBooking,
  TicketStatus,
  BookingChannel,
  OrderRole,
  PassengerAccount,
  IndianLanguageCode,
} from './src/types/platform.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMG_HERO = '/assets/images/highway_plaza_hero_1795667339325.jpg';
const IMG_DOSA = '/assets/images/masala_dosa_platter_1795667339414.jpg';
const IMG_BIRYANI = '/assets/images/hyderabadi_biryani_pot_1795667339711.jpg';
const IMG_COFFEE = '/assets/images/filter_coffee_snacks_1795667340074.jpg';
const IMG_THALI = '/assets/images/thali_meal_tray_1795667340245.jpg';

// Public production URL used when generating passenger QR links.
const PUBLIC_APP_URL =
  process.env.APP_URL || 'https://busbitedemo.onrender.com';

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

interface AuthSession {
  token: string;
  role: 'PASSENGER' | 'DRIVER' | 'RESTAURANT' | 'TRAVELS';
  entityId: string;
  username: string;
  createdAt: string;
}

const passwordVault = new Map<string, string>();
const authSessions = new Map<string, AuthSession>();

function getSeedDemoPasscode(): string {
  return process.env.BUSBITE_DEMO_PASSCODE || ['BusBite', '@', '2026'].join('');
}

function createAuthToken(
  role: AuthSession['role'],
  entityId: string,
  username: string
): string {
  const token = `bb_${role.toLowerCase()}_${crypto.randomBytes(24).toString('hex')}`;
  authSessions.set(token, {
    token,
    role,
    entityId,
    username,
    createdAt: nowIso(),
  });
  return token;
}

function getBearerSession(req: express.Request): AuthSession | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return authSessions.get(token) || null;
}

function interpolateRoutePosition(stops: RouteStop[], progressPct: number) {
  const clamped = Math.max(0, Math.min(100, progressPct));
  const totalKm = stops[stops.length - 1]?.kmFromOrigin || 1;
  const currentKm = Number(((clamped / 100) * totalKm).toFixed(1));

  let prev = stops[0];
  let next = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (currentKm >= stops[i].kmFromOrigin && currentKm <= stops[i + 1].kmFromOrigin) {
      prev = stops[i];
      next = stops[i + 1];
      break;
    }
  }

  const segSpan = Math.max(0.1, next.kmFromOrigin - prev.kmFromOrigin);
  const segRatio = Math.max(0, Math.min(1, (currentKm - prev.kmFromOrigin) / segSpan));
  const lat = Number((prev.lat + (next.lat - prev.lat) * segRatio).toFixed(5));
  const lng = Number((prev.lng + (next.lng - prev.lng) * segRatio).toFixed(5));

  const dLon = ((next.lng - prev.lng) * Math.PI) / 180;
  const lat1 = (prev.lat * Math.PI) / 180;
  const lat2 = (next.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const headingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

  return { currentKm, lat, lng, headingDeg };
}

function computeStopEtas(stops: RouteStop[], currentKm: number, speedKmh: number): TripStopEta[] {
  const effectiveSpeed = Math.max(35, speedKmh || 65);
  return stops.map((stop) => {
    const remaining = Math.max(0, Number((stop.kmFromOrigin - currentKm).toFixed(1)));
    const passed = currentKm > stop.kmFromOrigin + 1.2;
    const etaMinutes = passed ? 0 : Math.max(1, Math.round((remaining / effectiveSpeed) * 60));
    return {
      stopId: stop.id,
      stopName: stop.name,
      restaurantId: stop.restaurantId,
      kmFromOrigin: stop.kmFromOrigin,
      distanceRemainingKm: remaining,
      etaMinutes,
      passed,
    };
  });
}

function createInitialState(): PlatformState {
  passwordVault.clear();
  authSessions.clear();
  const demoPass = getSeedDemoPasscode();

  const routes: HighwayRoute[] = [
    {
      id: 'route-chm',
      name: 'Chennai → Madurai (NH-45)',
      code: 'NH45-CHM',
      origin: 'Chennai Koyambedu',
      destination: 'Madurai Mattuthavani',
      totalKm: 462,
      stops: [
        {
          id: 'stop-chm-0',
          name: 'Chennai Koyambedu Terminus',
          kmFromOrigin: 0,
          lat: 13.0694,
          lng: 80.1948,
          expectedArrivalWindow: '20:30 Dep',
        },
        {
          id: 'stop-chm-1',
          name: 'Villupuram Bypass Plaza',
          kmFromOrigin: 162,
          lat: 11.9401,
          lng: 79.4861,
          expectedArrivalWindow: '22:55 – 23:15',
          restaurantId: 'rest-a2b',
        },
        {
          id: 'stop-chm-2',
          name: 'Trichy Toll Food Court',
          kmFromOrigin: 322,
          lat: 10.7905,
          lng: 78.7047,
          expectedArrivalWindow: '01:20 – 01:40',
          restaurantId: 'rest-annapoorna',
        },
        {
          id: 'stop-chm-3',
          name: 'Madurai Ring Road Hub',
          kmFromOrigin: 448,
          lat: 9.9552,
          lng: 78.1498,
          expectedArrivalWindow: '03:25 – 03:40',
          restaurantId: 'rest-chola',
        },
        {
          id: 'stop-chm-4',
          name: 'Madurai Mattuthavani Terminus',
          kmFromOrigin: 462,
          lat: 9.9391,
          lng: 78.1578,
          expectedArrivalWindow: '03:55 Arr',
        },
      ],
    },
    {
      id: 'route-bls',
      name: 'Bengaluru → Salem (NH-44)',
      code: 'NH44-BLS',
      origin: 'Bengaluru Silk Board',
      destination: 'Salem New Terminus',
      totalKm: 205,
      stops: [
        {
          id: 'stop-bls-0',
          name: 'Bengaluru Silk Board Bay',
          kmFromOrigin: 0,
          lat: 12.9177,
          lng: 77.6238,
          expectedArrivalWindow: '21:15 Dep',
        },
        {
          id: 'stop-bls-1',
          name: 'Hosur Highway Courtyard',
          kmFromOrigin: 42,
          lat: 12.7409,
          lng: 77.8253,
          expectedArrivalWindow: '22:05 – 22:20',
          restaurantId: 'rest-kaveri',
        },
        {
          id: 'stop-bls-2',
          name: 'Krishnagiri Junction Inn',
          kmFromOrigin: 94,
          lat: 12.5186,
          lng: 78.2137,
          expectedArrivalWindow: '22:55 – 23:15',
          restaurantId: 'rest-saravana',
        },
        {
          id: 'stop-bls-3',
          name: 'Salem New Bus Terminus',
          kmFromOrigin: 205,
          lat: 11.6643,
          lng: 78.146,
          expectedArrivalWindow: '00:45 Arr',
        },
      ],
    },
  ];

  const passengers: PassengerAccount[] = [
    {
      id: 'pax-ananya',
      name: 'Ananya Krishnan',
      username: 'ananya.k',
      email: 'ananya.k@gmail.com',
      mobile: '+91 98405 11220',
      age: 28,
      gender: 'Female',
      city: 'Chennai',
      address: '24 Cathedral Road, Gopalapuram, Chennai 600086',
      emergencyContact: '+91 98405 11999 (Krishnan R)',
      idProofRef: 'AADHAAR-••••-4821',
      preferredLanguage: 'ta',
      registrationSource: 'PASSENGER_APP',
      status: 'ACTIVE',
      createdAt: '2026-10-12T09:15:00.000Z',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: 'pax-karthik',
      name: 'Karthik Subramanian',
      username: 'karthik.s',
      email: 'karthik.sub@outlook.com',
      mobile: '+91 98401 77412',
      age: 30,
      gender: 'Male',
      city: 'Madurai',
      address: '12 KK Nagar East Main Road, Madurai 625020',
      emergencyContact: '+91 98401 77001 (Meenakshi S)',
      idProofRef: 'PAN-••••-904K',
      preferredLanguage: 'en',
      registrationSource: 'PASSENGER_APP',
      status: 'ACTIVE',
      createdAt: '2026-10-20T11:40:00.000Z',
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'pax-vikram',
      name: 'Vikramaditya S',
      username: 'vikram.s',
      email: 'vikram.s@yahoo.in',
      mobile: '+91 99401 88721',
      age: 34,
      gender: 'Male',
      city: 'Bengaluru',
      address: '408 Indiranagar 100ft Road, Bengaluru 560038',
      emergencyContact: '+91 99401 88000',
      idProofRef: 'DL-KA01-••••-221',
      preferredLanguage: 'kn',
      registrationSource: 'QR_CHECKOUT',
      status: 'ACTIVE',
      createdAt: '2026-11-04T16:10:00.000Z',
    },
  ];
  passengers.forEach((p) => {
    passwordVault.set(`PASSENGER:${p.id}`, hashPassword(demoPass));
  });

  const restaurants: Restaurant[] = [
    {
      id: 'rest-a2b',
      name: 'A2B Highway Plaza',
      ownerName: 'Venkatesh Iyer',
      mobile: '+91 98401 22410',
      email: 'ops@a2bplaza.in',
      address: 'NH-45 Bypass, Janakipuram, Villupuram',
      city: 'Villupuram',
      lat: 11.9401,
      lng: 79.4861,
      operatingHours: '05:30 AM – 02:30 AM',
      openingTime: '05:30',
      closingTime: '02:30',
      isOpen24Hours: false,
      isClosedToday: false,
      closureReason: '',
      status: 'APPROVED',
      acceptingOrders: true,
      commissionPct: 5,
      gstNumber: '33AAACA4821M1Z5',
      fssaiNumber: '12422019000482',
      hygieneCertRef: 'HYG-TN-2026-A2B.pdf',
      bankAccount: 'HDFC •••• 8921 (IFSC: HDFC0001042)',
      branches: ['Villupuram NH-45 Plaza', 'Tindivanam Express Bay'],
      heroImage: IMG_HERO,
      rating: 4.8,
      avgPrepMinutes: 12,
      crewDiscountPct: 30,
      crewOfferLabel: 'Driver & Conductor Offer · 30% OFF',
      complimentaryPerk: 'Complimentary Filter Coffee + Staff Rest Lounge',
      adminUsername: 'a2b.kitchen',
      credentialStatus: 'ACTIVE_SYNCED',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-09-14T10:15:00.000Z',
      createdAt: '2026-09-12T08:00:00.000Z',
    },
    {
      id: 'rest-annapoorna',
      name: 'Temple City Annapoorna',
      ownerName: 'Meenakshi Sundaram',
      mobile: '+91 94431 77820',
      email: 'kitchen@templecityfoods.in',
      address: 'Samayapuram Toll Plaza, NH-45, Tiruchirappalli',
      city: 'Tiruchirappalli',
      lat: 10.7905,
      lng: 78.7047,
      operatingHours: '24 Hours Highway Service',
      openingTime: '00:00',
      closingTime: '23:59',
      isOpen24Hours: true,
      isClosedToday: false,
      closureReason: '',
      status: 'APPROVED',
      acceptingOrders: true,
      commissionPct: 6,
      gstNumber: '33AABCT9021K1Z8',
      fssaiNumber: '12421024001109',
      hygieneCertRef: 'HYG-TN-2026-ANN.pdf',
      bankAccount: 'ICICI •••• 4410 (IFSC: ICIC0000412)',
      branches: ['Trichy Toll Plaza', 'Dindigul Bypass'],
      heroImage: IMG_THALI,
      rating: 4.7,
      avgPrepMinutes: 15,
      crewDiscountPct: 25,
      crewOfferLabel: 'Driver Special Offer · 25% OFF',
      complimentaryPerk: 'Free Night Chai & Driver Tiffin Priority',
      adminUsername: 'annapoorna.kitchen',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-09-18T10:30:00.000Z',
    },
    {
      id: 'rest-chola',
      name: 'Grand Chola Kitchen',
      ownerName: 'Senthil Nathan',
      mobile: '+91 98940 55102',
      email: 'desk@grandcholakitchen.com',
      address: 'Ring Road Transit Hub, Othakadai, Madurai',
      city: 'Madurai',
      lat: 9.9552,
      lng: 78.1498,
      operatingHours: '06:00 AM – 04:00 AM',
      openingTime: '06:00',
      closingTime: '04:00',
      isOpen24Hours: false,
      isClosedToday: false,
      closureReason: '',
      status: 'APPROVED',
      acceptingOrders: true,
      commissionPct: 5,
      gstNumber: '33AADCG1904P1Z2',
      fssaiNumber: '12423011002941',
      hygieneCertRef: 'HYG-TN-2026-CHL.pdf',
      bankAccount: 'SBI •••• 7732 (IFSC: SBIN0004810)',
      branches: ['Madurai Ring Road'],
      heroImage: IMG_BIRYANI,
      rating: 4.9,
      avgPrepMinutes: 14,
      crewDiscountPct: 25,
      crewOfferLabel: 'Staff Meal Offer · 25% OFF',
      complimentaryPerk: 'Free Salna & Hot Tea for Bus Staff',
      adminUsername: 'chola.kitchen',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-10-02T09:15:00.000Z',
    },
    {
      id: 'rest-kaveri',
      name: 'Kaveri Spice Courtyard',
      ownerName: 'Prakash Rao',
      mobile: '+91 99001 31209',
      email: 'partner@kaverispice.in',
      address: 'SIPCO Highway Plaza, NH-44, Hosur',
      city: 'Hosur',
      lat: 12.7409,
      lng: 77.8253,
      operatingHours: '05:00 AM – 01:30 AM',
      openingTime: '05:00',
      closingTime: '01:30',
      isOpen24Hours: false,
      isClosedToday: false,
      closureReason: '',
      status: 'APPROVED',
      acceptingOrders: true,
      commissionPct: 5,
      gstNumber: '33AAACK6621N1Z4',
      fssaiNumber: '12422008005519',
      hygieneCertRef: 'HYG-KA-2026-KAV.pdf',
      bankAccount: 'AXIS •••• 3104 (IFSC: UTIB0000219)',
      branches: ['Hosur NH-44 Bay'],
      heroImage: IMG_DOSA,
      rating: 4.6,
      avgPrepMinutes: 10,
      crewDiscountPct: 30,
      crewOfferLabel: 'Driver Partner Offer · 30% OFF',
      complimentaryPerk: 'Free Brass Filter Coffee for Driver & Conductor',
      adminUsername: 'kaveri.kitchen',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-10-14T11:00:00.000Z',
    },
    {
      id: 'rest-saravana',
      name: 'Saravana Highway Inn',
      ownerName: 'Balaji Murugan',
      mobile: '+91 97890 11234',
      email: 'admin@saravanahighway.in',
      address: 'Toll Gate East, NH-44, Krishnagiri',
      city: 'Krishnagiri',
      lat: 12.5186,
      lng: 78.2137,
      operatingHours: '06:00 AM – 12:30 AM',
      openingTime: '06:00',
      closingTime: '00:30',
      isOpen24Hours: false,
      isClosedToday: false,
      closureReason: '',
      status: 'PENDING',
      acceptingOrders: false,
      commissionPct: 5,
      gstNumber: '33AAACS7120Q1Z9',
      fssaiNumber: '12424005008122',
      hygieneCertRef: 'HYG-TN-2026-SAR.pdf',
      bankAccount: 'KOTAK •••• 6019 (IFSC: KKBK0000481)',
      branches: ['Krishnagiri Junction'],
      heroImage: IMG_COFFEE,
      rating: 4.5,
      avgPrepMinutes: 12,
      crewDiscountPct: 20,
      crewOfferLabel: 'Driver & Staff Discount · 20% OFF',
      complimentaryPerk: 'Free Hot Tea for Bus Staff',
      adminUsername: 'saravana.kitchen',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-11-24T14:20:00.000Z',
    },
  ];
  restaurants.forEach((r) => {
    passwordVault.set(`RESTAURANT:${r.id}`, hashPassword(demoPass));
  });

  const menuItems = [
    {
      id: 'item-1',
      restaurantId: 'rest-a2b',
      category: 'South Indian Classics',
      name: 'Ghee Roast Masala Dosa',
      description: 'Crisp fermented crepe roasted in pure cow ghee with spiced potato masala, sambar & 3 chutneys.',
      price: 165,
      isVeg: true,
      available: true,
      image: IMG_DOSA,
      prepMinutes: 8,
    },
    {
      id: 'item-2',
      restaurantId: 'rest-a2b',
      category: 'Beverages & Quick Bites',
      name: 'Kumbakonam Filter Coffee & Medu Vada',
      description: 'Brass davara filter coffee paired with two crisp lentil vadas and coconut chutney.',
      price: 110,
      isVeg: true,
      available: true,
      image: IMG_COFFEE,
      prepMinutes: 5,
    },
    {
      id: 'item-3',
      restaurantId: 'rest-a2b',
      category: 'Executive Meals',
      name: 'Highway Executive Veg Thali',
      description: '2 Butter Naan, Paneer Butter Masala, Dal Tadka, Jeera Rice, fresh salad & warm Gulab Jamun.',
      price: 260,
      isVeg: true,
      available: true,
      image: IMG_THALI,
      prepMinutes: 12,
    },
    {
      id: 'item-4',
      restaurantId: 'rest-a2b',
      category: 'South Indian Classics',
      name: 'Mini Tiffin Express Pack',
      description: '2 Idli, 1 Mini Pongal, 1 Vada, Kesari bath & sambar packed spill-proof for seat dining.',
      price: 185,
      isVeg: true,
      available: true,
      image: IMG_DOSA,
      prepMinutes: 7,
    },
    {
      id: 'item-5',
      restaurantId: 'rest-annapoorna',
      category: 'Executive Meals',
      name: 'Temple City Grand Veg Meal',
      description: 'Full South Indian highway feast with phulkas, paneer gravy, dal, jeera pulao & sweet.',
      price: 240,
      isVeg: true,
      available: true,
      image: IMG_THALI,
      prepMinutes: 12,
    },
    {
      id: 'item-6',
      restaurantId: 'rest-annapoorna',
      category: 'Rice & Biryani',
      name: 'Saffron Subz Dum Biryani',
      description: 'Long-grain basmati rice slow-cooked with seasonal vegetables, mint & roasted cashews.',
      price: 220,
      isVeg: true,
      available: true,
      image: IMG_BIRYANI,
      prepMinutes: 10,
    },
    {
      id: 'item-7',
      restaurantId: 'rest-annapoorna',
      category: 'Beverages & Quick Bites',
      name: 'Madras Degree Coffee Flask (250ml)',
      description: 'Insulated travel flask of freshly brewed chicory-blend filter coffee.',
      price: 95,
      isVeg: true,
      available: true,
      image: IMG_COFFEE,
      prepMinutes: 4,
    },
    {
      id: 'item-8',
      restaurantId: 'rest-chola',
      category: 'Rice & Biryani',
      name: 'Madurai Royal Chicken Dum Biryani',
      description: 'Seeraga samba & saffron basmati layered with tender spiced chicken, egg & onion raita.',
      price: 310,
      isVeg: false,
      available: true,
      image: IMG_BIRYANI,
      prepMinutes: 14,
    },
    {
      id: 'item-9',
      restaurantId: 'rest-chola',
      category: 'South Indian Classics',
      name: 'Madurai Kari Dosa & Salna',
      description: 'Three-layered minced spiced mutton dosa served piping hot with Chettinad salna.',
      price: 275,
      isVeg: false,
      available: true,
      image: IMG_DOSA,
      prepMinutes: 12,
    },
    {
      id: 'item-10',
      restaurantId: 'rest-chola',
      category: 'Executive Meals',
      name: 'Chola North-South Combo Thali',
      description: 'Tandoori roti, paneer butter masala, dal fry, steamed rice & gulab jamun.',
      price: 250,
      isVeg: true,
      available: true,
      image: IMG_THALI,
      prepMinutes: 11,
    },
    {
      id: 'item-11',
      restaurantId: 'rest-kaveri',
      category: 'South Indian Classics',
      name: 'Mysore Ghee Masala Dosa',
      description: 'Crisp dosa coated with red garlic chutney and potato palya.',
      price: 155,
      isVeg: true,
      available: true,
      image: IMG_DOSA,
      prepMinutes: 8,
    },
    {
      id: 'item-12',
      restaurantId: 'rest-kaveri',
      category: 'Beverages & Quick Bites',
      name: 'Filter Coffee & Crispy Vada Duo',
      description: 'Freshly brewed brass tumbler coffee with two hot medu vadas.',
      price: 105,
      isVeg: true,
      available: true,
      image: IMG_COFFEE,
      prepMinutes: 5,
    },
    {
      id: 'item-13',
      restaurantId: 'rest-kaveri',
      category: 'Rice & Biryani',
      name: 'Donne Chicken Pepper Biryani',
      description: 'Traditional Karnataka green-herb biryani with roasted pepper chicken & raita.',
      price: 290,
      isVeg: false,
      available: true,
      image: IMG_BIRYANI,
      prepMinutes: 13,
    },
    {
      id: 'item-14',
      restaurantId: 'rest-saravana',
      category: 'Beverages & Quick Bites',
      name: 'Highway Special Filter Coffee',
      description: 'Classic South Indian brew served hot.',
      price: 60,
      isVeg: true,
      available: true,
      image: IMG_COFFEE,
      prepMinutes: 4,
    },
  ];

  const companies: TransportCompany[] = [
    {
      id: 'comp-kpn',
      name: 'KPN Travels & Logistics',
      ownerName: 'K.P. Natarajan',
      mobile: '+91 98422 90100',
      email: 'fleet@kpntravels.in',
      registrationNo: 'TN-45-TR-88210',
      status: 'APPROVED',
      documentRef: 'RC-FLEET-2026-KPN.pdf',
      permitNo: 'TN-STATE-PERMIT-8821',
      insuranceRef: 'INS-NIA-2026-99401',
      gstNumber: '33AAACK9012M1Z2',
      bankAccount: 'SBI •••• 4012 (IFSC: SBIN0001021)',
      ticketCommissionPct: 8,
      adminUsername: 'kpn.travels',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'comp-srs',
      name: 'SRS Luxury Coaches',
      ownerName: 'R. Shrinivas',
      mobile: '+91 98450 44120',
      email: 'dispatch@srstravels.in',
      registrationNo: 'KA-01-TR-44902',
      status: 'APPROVED',
      documentRef: 'RC-FLEET-2026-SRS.pdf',
      permitNo: 'KA-INTERSTATE-4490',
      insuranceRef: 'INS-ICICI-2026-77120',
      gstNumber: '29AABCS4412N1Z9',
      bankAccount: 'HDFC •••• 3318 (IFSC: HDFC0000812)',
      ticketCommissionPct: 7,
      adminUsername: 'srs.travels',
      credentialStatus: 'ACTIVE_SYNCED',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-09-11T12:00:00.000Z',
      createdAt: '2026-09-10T09:30:00.000Z',
    },
    {
      id: 'comp-parveen',
      name: 'Parveen Express Lines',
      ownerName: 'A. Sadiq Ali',
      mobile: '+91 98400 71200',
      email: 'admin@parveenexpress.in',
      registrationNo: 'TN-09-TR-10294',
      status: 'PENDING',
      documentRef: 'RC-FLEET-2026-PRV.pdf',
      permitNo: 'TN-STAGE-10294-P',
      insuranceRef: 'INS-BAJAJ-2026-55209',
      gstNumber: '33AAACP7120K1Z4',
      bankAccount: 'ICICI •••• 9914 (IFSC: ICIC0000104)',
      ticketCommissionPct: 8,
      adminUsername: 'parveen.travels',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
      createdAt: '2026-11-23T16:45:00.000Z',
    },
  ];
  companies.forEach((c) => {
    passwordVault.set(`TRAVELS:${c.id}`, hashPassword(demoPass));
  });

  const staff: StaffMember[] = [
    {
      id: 'drv-1',
      name: 'Karthik Raja',
      mobile: '+91 98402 33101',
      licenseNo: 'TN45-20160049102',
      companyId: 'comp-kpn',
      role: 'DRIVER' as const,
      assignedVehicleId: 'veh-tn45',
      username: 'kpn.karthik',
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'cnd-1',
      name: 'Suresh Babu',
      mobile: '+91 98402 33102',
      licenseNo: 'CND-TN45-8821',
      companyId: 'comp-kpn',
      role: 'CONDUCTOR' as const,
      assignedVehicleId: 'veh-tn45',
      username: 'kpn.suresh',
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-10-01T08:05:00.000Z',
    },
    {
      id: 'drv-2',
      name: 'Arjun Gowda',
      mobile: '+91 98451 66702',
      licenseNo: 'KA01-20180091234',
      companyId: 'comp-srs',
      role: 'DRIVER' as const,
      assignedVehicleId: 'veh-ka01',
      username: 'srs.arjun',
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-10-02T09:00:00.000Z',
    },
    {
      id: 'cnd-2',
      name: 'Mani V',
      mobile: '+91 98451 66703',
      licenseNo: 'CND-KA01-4102',
      companyId: 'comp-srs',
      role: 'CONDUCTOR' as const,
      assignedVehicleId: 'veh-ka01',
      username: 'srs.mani',
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
      passwordUpdatedAt: '2026-10-02T09:10:00.000Z',
    },
    {
      id: 'drv-3',
      name: 'Ravi Shankar',
      mobile: '+91 98409 12004',
      licenseNo: 'TN09-20190011220',
      companyId: 'comp-kpn',
      role: 'DRIVER' as const,
      assignedVehicleId: 'veh-tn09',
      username: 'kpn.ravi',
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: demoPass,
    },
    {
      id: 'cnd-3',
      name: 'Kumar P',
      mobile: '+91 98409 12005',
      licenseNo: 'CND-TN09-7710',
      companyId: 'comp-kpn',
      role: 'CONDUCTOR' as const,
      assignedVehicleId: 'veh-tn09',
      username: 'kpn.kumar',
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
    },
  ];
  staff.forEach((s) => {
    passwordVault.set(`DRIVER:${s.id}`, hashPassword(demoPass));
  });

  const vehicles: Vehicle[] = [
    {
      id: 'veh-tn45',
      companyId: 'comp-kpn',
      regNumber: 'TN 45 AB 1234',
      type: 'AC Sleeper',
      seatingCapacity: 36,
      routeId: 'route-chm',
      driverId: 'drv-1',
      conductorId: 'cnd-1',
      status: 'ACTIVE',
    },
    {
      id: 'veh-ka01',
      companyId: 'comp-srs',
      regNumber: 'KA 01 F 8821',
      type: 'Volvo Multi-Axle',
      seatingCapacity: 44,
      routeId: 'route-bls',
      driverId: 'drv-2',
      conductorId: 'cnd-2',
      status: 'ACTIVE',
    },
    {
      id: 'veh-tn09',
      companyId: 'comp-kpn',
      regNumber: 'TN 09 CK 4092',
      type: 'Luxury Seater',
      seatingCapacity: 40,
      routeId: 'route-chm',
      driverId: 'drv-3',
      conductorId: 'cnd-3',
      status: 'ACTIVE',
    },
  ];

  const partnerships: Partnership[] = [
    {
      id: 'part-1',
      companyId: 'comp-kpn',
      vehicleId: 'veh-tn45',
      routeId: 'route-chm',
      restaurantIds: ['rest-a2b', 'rest-annapoorna', 'rest-chola'],
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      status: 'APPROVED',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'part-2',
      companyId: 'comp-srs',
      vehicleId: 'veh-ka01',
      routeId: 'route-bls',
      restaurantIds: ['rest-kaveri'],
      startDate: '2026-10-15',
      endDate: '2027-10-14',
      status: 'APPROVED',
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    {
      id: 'part-3',
      companyId: 'comp-kpn',
      vehicleId: 'veh-tn09',
      routeId: 'route-chm',
      restaurantIds: ['rest-a2b', 'rest-annapoorna'],
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      status: 'APPROVED',
      createdAt: '2026-11-01T09:00:00.000Z',
    },
  ];

  const qrCodes: QRCodeRecord[] = [
    {
      id: 'qr-1',
      token: 'RS-TN45-CHM-01',
      partnershipId: 'part-1',
      vehicleId: 'veh-tn45',
      routeId: 'route-chm',
      active: true,
      scanCount: 48,
      orderCount: 4,
      createdAt: '2026-10-01T08:05:00.000Z',
    },
    {
      id: 'qr-2',
      token: 'RS-KA01-BLS-02',
      partnershipId: 'part-2',
      vehicleId: 'veh-ka01',
      routeId: 'route-bls',
      active: true,
      scanCount: 19,
      orderCount: 1,
      createdAt: '2026-10-15T10:10:00.000Z',
    },
    {
      id: 'qr-3',
      token: 'RS-TN09-CHM-03',
      partnershipId: 'part-3',
      vehicleId: 'veh-tn09',
      routeId: 'route-chm',
      active: true,
      scanCount: 12,
      orderCount: 0,
      createdAt: '2026-11-01T09:15:00.000Z',
    },
  ];

  const pos1 = interpolateRoutePosition(routes[0].stops, 31);
  const pos2 = interpolateRoutePosition(routes[1].stops, 0);
  const pos3 = interpolateRoutePosition(routes[0].stops, 0);

  const trips: Trip[] = [
    {
      id: 'trip-1',
      vehicleId: 'veh-tn45',
      routeId: 'route-chm',
      driverId: 'drv-1',
      conductorId: 'cnd-1',
      status: 'IN_PROGRESS',
      travelDate: '2026-11-26',
      departureTime: '20:30',
      arrivalTime: '03:55',
      seatFare: 890,
      bookedSeats: ['U4', 'L7', 'U11', 'L2', 'L1', 'U1'],
      seatSources: {
        U4: 'BUSBITE',
        L7: 'BUSBITE',
        U11: 'BUSBITE',
        L2: 'BUSBITE',
        L1: 'REDBUS',
        U1: 'MAKEMYTRIP',
      },
      progressPct: 31,
      currentKm: pos1.currentKm,
      currentLat: pos1.lat,
      currentLng: pos1.lng,
      speedKmh: 68,
      headingDeg: pos1.headingDeg,
      stopEtas: computeStopEtas(routes[0].stops, pos1.currentKm, 68),
      startedAt: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
      lastUpdatedAt: nowIso(),
    },
    {
      id: 'trip-2',
      vehicleId: 'veh-ka01',
      routeId: 'route-bls',
      driverId: 'drv-2',
      conductorId: 'cnd-2',
      status: 'READY_TO_START',
      travelDate: '2026-11-26',
      departureTime: '21:15',
      arrivalTime: '00:45',
      seatFare: 640,
      bookedSeats: ['L3', 'L4', 'U2'],
      seatSources: {
        L3: 'BUSBITE',
        L4: 'BUSBITE',
        U2: 'REDBUS',
      },
      progressPct: 0,
      currentKm: pos2.currentKm,
      currentLat: pos2.lat,
      currentLng: pos2.lng,
      speedKmh: 0,
      headingDeg: pos2.headingDeg,
      stopEtas: computeStopEtas(routes[1].stops, pos2.currentKm, 64),
      lastUpdatedAt: nowIso(),
    },
    {
      id: 'trip-3',
      vehicleId: 'veh-tn09',
      routeId: 'route-chm',
      driverId: 'drv-3',
      conductorId: 'cnd-3',
      status: 'ASSIGNED',
      travelDate: '2026-11-26',
      departureTime: '22:00',
      arrivalTime: '05:30',
      seatFare: 720,
      bookedSeats: ['S2', 'S5', 'S6'],
      seatSources: {
        S2: 'BUSBITE',
        S5: 'REDBUS',
        S6: 'MAKEMYTRIP',
      },
      progressPct: 0,
      currentKm: pos3.currentKm,
      currentLat: pos3.lat,
      currentLng: pos3.lng,
      speedKmh: 0,
      headingDeg: pos3.headingDeg,
      stopEtas: computeStopEtas(routes[0].stops, pos3.currentKm, 65),
      lastUpdatedAt: nowIso(),
    },
  ];

  const tickets: BusTicketBooking[] = [
    {
      id: 'TKT-9011',
      pnr: 'RS-PNR-48201',
      tripId: 'trip-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      seatNumbers: ['U4'],
      boardingPoint: 'Chennai Koyambedu Terminus',
      droppingPoint: 'Madurai Mattuthavani Terminus',
      travelDate: '2026-11-26',
      passengerName: 'Ananya Krishnan',
      passengerPhone: '+91 98405 11220',
      passengerAge: 28,
      passengerGender: 'Female',
      farePerSeat: 890,
      subtotal: 890,
      gstAmount: 44.5,
      convenienceFee: 25,
      totalFare: 959.5,
      ticketCommissionPct: 8,
      platformCommission: 71.2,
      operatorNet: 888.3,
      bookingChannel: 'BUSBITE',
      paymentRef: 'TKT-RZP-881201',
      status: 'BOARDED',
      qrToken: 'RS-TN45-CHM-01',
      bookedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
    {
      id: 'TKT-9012',
      pnr: 'RS-PNR-48209',
      tripId: 'trip-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      seatNumbers: ['L7'],
      boardingPoint: 'Chennai Koyambedu Terminus',
      droppingPoint: 'Madurai Mattuthavani Terminus',
      travelDate: '2026-11-26',
      passengerName: 'Vikramaditya S',
      passengerPhone: '+91 99401 88721',
      passengerAge: 34,
      passengerGender: 'Male',
      farePerSeat: 890,
      subtotal: 890,
      gstAmount: 44.5,
      convenienceFee: 25,
      totalFare: 959.5,
      ticketCommissionPct: 8,
      platformCommission: 71.2,
      operatorNet: 888.3,
      bookingChannel: 'BUSBITE',
      paymentRef: 'TKT-RZP-881290',
      status: 'BOARDED',
      qrToken: 'RS-TN45-CHM-01',
      bookedAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    },
    {
      id: 'TKT-9013',
      pnr: 'RS-PNR-51904',
      tripId: 'trip-2',
      vehicleId: 'veh-ka01',
      companyId: 'comp-srs',
      routeId: 'route-bls',
      seatNumbers: ['L3', 'L4'],
      boardingPoint: 'Bengaluru Silk Board Bay',
      droppingPoint: 'Salem New Bus Terminus',
      travelDate: '2026-11-26',
      passengerName: 'Meera & Sanjay R',
      passengerPhone: '+91 99002 33118',
      passengerAge: 31,
      passengerGender: 'Female',
      farePerSeat: 640,
      subtotal: 1280,
      gstAmount: 64,
      convenienceFee: 25,
      totalFare: 1369,
      ticketCommissionPct: 7,
      platformCommission: 89.6,
      operatorNet: 1279.4,
      bookingChannel: 'BUSBITE',
      paymentRef: 'TKT-RZP-881904',
      status: 'CONFIRMED',
      qrToken: 'RS-KA01-BLS-02',
      bookedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    },
  ];

  const orders: Order[] = [
    {
      id: 'ORD-8841',
      pickupCode: '4821',
      idempotencyKey: 'seed-8841',
      qrId: 'qr-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      tripId: 'trip-1',
      restaurantId: 'rest-a2b',
      items: [
        { menuItemId: 'item-1', name: 'Ghee Roast Masala Dosa', qty: 2, unitPrice: 165, isVeg: true },
        { menuItemId: 'item-2', name: 'Kumbakonam Filter Coffee & Medu Vada', qty: 1, unitPrice: 110, isVeg: true },
      ],
      subtotal: 440,
      gstAmount: 22,
      serviceFee: 10,
      totalAmount: 472,
      commissionPct: 5,
      platformCommission: 22,
      gatewayFee: 8.5,
      restaurantPayable: 409.5,
      orderType: 'DINE_IN',
      orderRole: 'PASSENGER',
      dineInGuests: 2,
      passengerName: 'Ananya Krishnan',
      passengerPhone: '+91 98405 11220',
      seatNumber: 'U4 / Sleeper',
      specialInstructions: 'Less spicy sambar please',
      paymentStatus: 'VERIFIED',
      paymentRef: 'PAY-RZP-992014',
      status: 'PREPARING',
      etaMinutesAtOrder: 24,
      distanceKmAtOrder: 27.2,
      createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    },
    {
      id: 'ORD-8842',
      pickupCode: '7194',
      idempotencyKey: 'seed-8842',
      qrId: 'qr-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      tripId: 'trip-1',
      restaurantId: 'rest-a2b',
      items: [
        { menuItemId: 'item-3', name: 'Highway Executive Veg Thali', qty: 1, unitPrice: 260, isVeg: true },
      ],
      subtotal: 260,
      gstAmount: 13,
      serviceFee: 10,
      totalAmount: 283,
      commissionPct: 5,
      platformCommission: 13,
      gatewayFee: 5.1,
      restaurantPayable: 241.9,
      orderType: 'TAKEAWAY',
      orderRole: 'PASSENGER',
      passengerName: 'Vikramaditya S',
      passengerPhone: '+91 99401 88721',
      seatNumber: 'L7',
      dietaryNotes: 'No onion in dal if possible',
      paymentStatus: 'VERIFIED',
      paymentRef: 'PAY-RZP-992089',
      status: 'NEW',
      etaMinutesAtOrder: 17,
      distanceKmAtOrder: 18.8,
      createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      id: 'ORD-8843',
      pickupCode: '3056',
      idempotencyKey: 'seed-8843',
      qrId: 'qr-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      tripId: 'trip-1',
      restaurantId: 'rest-annapoorna',
      items: [
        { menuItemId: 'item-6', name: 'Saffron Subz Dum Biryani', qty: 2, unitPrice: 220, isVeg: true },
        { menuItemId: 'item-7', name: 'Madras Degree Coffee Flask (250ml)', qty: 1, unitPrice: 95, isVeg: true },
      ],
      subtotal: 535,
      gstAmount: 26.75,
      serviceFee: 10,
      totalAmount: 571.75,
      commissionPct: 6,
      platformCommission: 32.1,
      gatewayFee: 10.29,
      restaurantPayable: 492.61,
      orderType: 'TAKEAWAY',
      orderRole: 'PASSENGER',
      passengerName: 'Deepak Narayanan',
      passengerPhone: '+91 97908 44123',
      seatNumber: 'U11',
      paymentStatus: 'VERIFIED',
      paymentRef: 'PAY-RZP-992102',
      status: 'ACCEPTED',
      etaMinutesAtOrder: 158,
      distanceKmAtOrder: 178.8,
      createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 19).toISOString(),
    },
    {
      id: 'ORD-8840',
      pickupCode: '6519',
      idempotencyKey: 'seed-8840',
      qrId: 'qr-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      tripId: 'trip-1',
      restaurantId: 'rest-a2b',
      items: [
        { menuItemId: 'item-3', name: 'Highway Executive Veg Thali', qty: 1, unitPrice: 260, isVeg: true },
      ],
      subtotal: 182,
      crewDiscountAmount: 78,
      gstAmount: 9.1,
      serviceFee: 0,
      totalAmount: 191.1,
      commissionPct: 5,
      platformCommission: 9.1,
      gatewayFee: 3.44,
      restaurantPayable: 169.46,
      orderType: 'DINE_IN',
      orderRole: 'CREW',
      complimentaryPerk: 'Complimentary Filter Coffee + Staff Rest Lounge',
      passengerName: 'Karthik Raja (Driver)',
      passengerPhone: '+91 98402 33101',
      seatNumber: 'Driver Cabin',
      specialInstructions: 'Driver Staff Meal Offer (30% OFF + Free Coffee)',
      paymentStatus: 'VERIFIED',
      paymentRef: 'PAY-UPI-CRW901',
      status: 'READY',
      etaMinutesAtOrder: 16,
      distanceKmAtOrder: 17.5,
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
      id: 'ORD-8839',
      pickupCode: '1182',
      idempotencyKey: 'seed-8839',
      qrId: 'qr-1',
      vehicleId: 'veh-tn45',
      companyId: 'comp-kpn',
      routeId: 'route-chm',
      tripId: 'trip-1',
      restaurantId: 'rest-a2b',
      items: [
        { menuItemId: 'item-4', name: 'Mini Tiffin Express Pack', qty: 2, unitPrice: 185, isVeg: true },
      ],
      subtotal: 370,
      gstAmount: 18.5,
      serviceFee: 10,
      totalAmount: 398.5,
      commissionPct: 5,
      platformCommission: 18.5,
      gatewayFee: 7.17,
      restaurantPayable: 344.33,
      orderType: 'TAKEAWAY',
      orderRole: 'PASSENGER',
      passengerName: 'Priya Dharshini',
      passengerPhone: '+91 98412 90876',
      seatNumber: 'L2',
      paymentStatus: 'VERIFIED',
      paymentRef: 'PAY-RZP-991940',
      status: 'COMPLETED',
      etaMinutesAtOrder: 12,
      distanceKmAtOrder: 14.0,
      createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    },
  ];

  const settlements: Settlement[] = [
    {
      id: 'STL-2026-101',
      entityType: 'RESTAURANT',
      entityId: 'rest-a2b',
      restaurantId: 'rest-a2b',
      orderIds: ['ORD-8839'],
      grossAmount: 370,
      commissionAmount: 18.5,
      gatewayFeeTotal: 7.17,
      gstOnFees: 3.33,
      netPayable: 18.5,
      status: 'SETTLED',
      settledAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      utrRef: 'HDFCR520261125984102',
    },
  ];

  const notifications: PlatformNotification[] = [
    {
      id: 'ntf-1',
      targetRole: 'RESTAURANT',
      targetId: 'rest-a2b',
      title: 'New Paid Order · ORD-8842',
      message: 'Passenger Vikramaditya S (TN 45 AB 1234 · Seat L7) ordered Highway Executive Veg Thali (Takeaway).',
      type: 'ORDER',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      id: 'ntf-2',
      targetRole: 'RESTAURANT',
      targetId: 'rest-a2b',
      title: 'Bus Approaching · TN 45 AB 1234',
      message: 'KPN Travels AC Sleeper is 18.8 km away (ETA 17 mins). 2 active pre-orders queued.',
      type: 'ETA',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
      id: 'ntf-3',
      targetRole: 'SUPER_ADMIN',
      title: 'Pending Partner Registration',
      message: 'Saravana Highway Inn (Krishnagiri) and Parveen Express Lines awaiting verification.',
      type: 'SYSTEM',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      actorRole: 'DRIVER',
      action: 'TRIP_STARTED',
      entityId: 'trip-1',
      details: 'Driver Karthik Raja started TN 45 AB 1234 on Chennai → Madurai (NH-45)',
      timestamp: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    },
    {
      id: 'aud-2',
      actorRole: 'SYSTEM',
      action: 'PAYMENT_VERIFIED',
      entityId: 'ORD-8842',
      details: 'Backend signature verified for PAY-RZP-992089 (₹283.00)',
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
  ];

  return {
    passengers,
    restaurants,
    menuItems,
    companies,
    staff,
    vehicles,
    routes,
    partnerships,
    qrCodes,
    trips,
    tickets,
    orders,
    settlements,
    notifications,
    auditLogs,
  };
}

let state: PlatformState = createInitialState();

function addAudit(actorRole: string, action: string, entityId: string, details: string) {
  state.auditLogs.unshift({
    id: makeId('AUD'),
    actorRole,
    action,
    entityId,
    details,
    timestamp: nowIso(),
  });
  if (state.auditLogs.length > 80) state.auditLogs.length = 80;
}

function addNotification(
  targetRole: PlatformNotification['targetRole'],
  title: string,
  message: string,
  type: PlatformNotification['type'],
  targetId?: string
) {
  state.notifications.unshift({
    id: makeId('NTF'),
    targetRole,
    targetId,
    title,
    message,
    type,
    read: false,
    createdAt: nowIso(),
  });
  if (state.notifications.length > 60) state.notifications.length = 60;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcastState = (eventType = 'state:update') => {
    const payload = JSON.stringify({ type: eventType, data: state });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state:init', data: state }));
  });

  // Health & State Snapshot
  app.get('/api/state', (_req, res) => {
    res.json(state);
  });

  // Reset Demo Data
  app.post('/api/reset-demo', (_req, res) => {
    state = createInitialState();
    broadcastState('state:reset');
    res.json({ ok: true, state });
  });

  // =========================================================================
  // AUTHENTICATION, CREDENTIAL PROVISIONING & PASSENGER PROFILE ROUTES
  // =========================================================================

  // 1. Passenger Registration (Syncs Full Profile to Super Admin)
  app.post('/api/auth/passenger/register', (req, res) => {
    const body = req.body as {
      name?: string;
      username?: string;
      email?: string;
      mobile?: string;
      password?: string;
      age?: number;
      gender?: 'Male' | 'Female' | 'Other';
      city?: string;
      address?: string;
      emergencyContact?: string;
      idProofRef?: string;
      preferredLanguage?: IndianLanguageCode;
    };
    if (!body.name?.trim() || !body.mobile?.trim() || !body.password || body.password.length < 6) {
      return res.status(400).json({
        error: 'Name, mobile number, and password (min 6 chars) are required.',
      });
    }
    const cleanUsername = (
      body.username?.trim() ||
      body.email?.split('@')[0] ||
      body.mobile.replace(/\D/g, '').slice(-8)
    ).toLowerCase();

    const duplicate = state.passengers.find(
      (p) =>
        p.username.toLowerCase() === cleanUsername ||
        (body.email && p.email.toLowerCase() === body.email.trim().toLowerCase()) ||
        p.mobile.replace(/\s+/g, '') === body.mobile!.replace(/\s+/g, '')
    );
    if (duplicate) {
      return res.status(409).json({
        error: 'A passenger with this username, email, or mobile already exists. Please sign in.',
      });
    }

    const passenger: PassengerAccount = {
      id: makeId('pax').toLowerCase(),
      name: body.name.trim(),
      username: cleanUsername,
      email: body.email?.trim().toLowerCase() || `${cleanUsername}@busbite.in`,
      mobile: body.mobile.trim(),
      age: body.age ? Number(body.age) : undefined,
      gender: body.gender || 'Male',
      city: body.city?.trim() || 'Chennai',
      address: body.address?.trim() || '',
      emergencyContact: body.emergencyContact?.trim() || '',
      idProofRef: body.idProofRef?.trim() || '',
      preferredLanguage: body.preferredLanguage || 'en',
      registrationSource: 'PASSENGER_APP',
      status: 'ACTIVE',
      createdAt: nowIso(),
      lastLoginAt: nowIso(),
    };

    passwordVault.set(`PASSENGER:${passenger.id}`, hashPassword(body.password));
    state.passengers.unshift(passenger);

    const token = createAuthToken('PASSENGER', passenger.id, passenger.username);
    addNotification(
      'SUPER_ADMIN',
      `New Passenger Registered · ${passenger.name}`,
      `${passenger.name} (${passenger.mobile}, ${passenger.city}) registered via Passenger App (${passenger.preferredLanguage.toUpperCase()}).`,
      'SYSTEM',
      passenger.id
    );
    addAudit(
      'PASSENGER',
      'PASSENGER_REGISTERED',
      passenger.id,
      `${passenger.name} (${passenger.username}) synced to Super Admin`
    );
    broadcastState();
    res.status(201).json({ ok: true, passenger, token });
  });

  // 2. Passenger Login
  app.post('/api/auth/passenger/login', (req, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier?.trim() || !password) {
      return res.status(400).json({ error: 'Username/Mobile/Email and password are required.' });
    }
    const q = identifier.trim().toLowerCase();
    const passenger = state.passengers.find(
      (p) =>
        p.username.toLowerCase() === q ||
        p.email.toLowerCase() === q ||
        p.mobile.replace(/\s+/g, '').toLowerCase() === q.replace(/\s+/g, '')
    );
    if (!passenger) {
      return res.status(401).json({ error: 'Passenger account not found.' });
    }
    if (passenger.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This passenger account is suspended.' });
    }
    const storedHash = passwordVault.get(`PASSENGER:${passenger.id}`);
    if (!storedHash || !verifyPassword(password, storedHash)) {
      return res.status(401).json({ error: 'Invalid password.' });
    }
    passenger.lastLoginAt = nowIso();
    const token = createAuthToken('PASSENGER', passenger.id, passenger.username);
    addAudit('PASSENGER', 'PASSENGER_LOGIN', passenger.id, `${passenger.name} signed in`);
    broadcastState();
    res.json({ ok: true, passenger, token });
  });

  // 3. Passenger Profile Update (Synced to Super Admin)
  app.patch('/api/auth/passenger/profile', (req, res) => {
    const session = getBearerSession(req);
    if (!session || session.role !== 'PASSENGER') {
      return res.status(401).json({ error: 'Sign in as a passenger to update profile.' });
    }
    const passenger = state.passengers.find((p) => p.id === session.entityId);
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found.' });

    const updates = req.body as Partial<PassengerAccount>;
    if (updates.name?.trim()) passenger.name = updates.name.trim();
    if (updates.mobile?.trim()) passenger.mobile = updates.mobile.trim();
    if (updates.email?.trim()) passenger.email = updates.email.trim().toLowerCase();
    if (updates.city?.trim()) passenger.city = updates.city.trim();
    if (updates.address !== undefined) passenger.address = updates.address.trim();
    if (updates.emergencyContact !== undefined) passenger.emergencyContact = updates.emergencyContact.trim();
    if (updates.idProofRef !== undefined) passenger.idProofRef = updates.idProofRef.trim();
    if (updates.age !== undefined) passenger.age = Number(updates.age) || passenger.age;
    if (updates.gender) passenger.gender = updates.gender;
    if (updates.preferredLanguage) passenger.preferredLanguage = updates.preferredLanguage;

    addAudit('PASSENGER', 'PASSENGER_PROFILE_UPDATED', passenger.id, `Updated profile for ${passenger.name}`);
    broadcastState();
    res.json({ ok: true, passenger });
  });

  // 3b. Super Admin Passenger Status Update (Activate / Suspend)
  app.patch('/api/admin/passengers/:id/status', (req, res) => {
    const passenger = state.passengers.find((p) => p.id === req.params.id);
    if (!passenger) return res.status(404).json({ error: 'Passenger not found.' });
    const { status } = req.body as { status?: 'ACTIVE' | 'SUSPENDED' };
    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      passenger.status = status;
    }
    addAudit('SUPER_ADMIN', 'PASSENGER_STATUS_UPDATED', passenger.id, `${passenger.name} → ${passenger.status}`);
    broadcastState();
    res.json({ ok: true, passenger });
  });

  // 4. Super Admin Issue / Reset Login Credentials for Bus Travel Admin or Restaurant Admin
  app.post('/api/admin/credentials/issue', (req, res) => {
    const { entityType, entityId, username, tempPassword } = req.body as {
      entityType?: 'TRAVELS' | 'RESTAURANT';
      entityId?: string;
      username?: string;
      tempPassword?: string;
    };
    if (!entityType || !entityId || !username?.trim() || !tempPassword || tempPassword.length < 6) {
      return res.status(400).json({
        error: 'Entity, username, and temporary password (min 6 chars) are required.',
      });
    }
    const cleanUser = username.trim().toLowerCase();

    if (entityType === 'TRAVELS') {
      const conflict = state.companies.find(
        (c) => c.id !== entityId && c.adminUsername?.toLowerCase() === cleanUser
      );
      if (conflict) {
        return res.status(409).json({ error: `Username "${cleanUser}" is already assigned to ${conflict.name}.` });
      }
      const comp = state.companies.find((c) => c.id === entityId);
      if (!comp) return res.status(404).json({ error: 'Transport company not found.' });
      comp.adminUsername = comp.adminUsername || cleanUser;
      comp.credentialStatus = 'TEMP_ISSUED';
      comp.mustChangePassword = true;
      comp.tempPasswordPreview = tempPassword;
      comp.passwordUpdatedAt = undefined;
      passwordVault.set(`TRAVELS:${comp.id}`, hashPassword(tempPassword));
      addNotification(
        'TRAVELS_ADMIN',
        `Login Credentials Issued · ${comp.name}`,
        `Super Admin issued username "${comp.adminUsername}". Register/Sign in and update your password on first login.`,
        'SYSTEM',
        comp.id
      );
      addAudit(
        'SUPER_ADMIN',
        'TRAVELS_CREDENTIALS_ISSUED',
        comp.id,
        `Issued temp login "${comp.adminUsername}" for ${comp.name}`
      );
      broadcastState();
      return res.json({ ok: true, company: comp });
    }

    const conflict = state.restaurants.find(
      (r) => r.id !== entityId && r.adminUsername?.toLowerCase() === cleanUser
    );
    if (conflict) {
      return res.status(409).json({ error: `Username "${cleanUser}" is already assigned to ${conflict.name}.` });
    }
    const rest = state.restaurants.find((r) => r.id === entityId);
    if (!rest) return res.status(404).json({ error: 'Restaurant not found.' });
    rest.adminUsername = rest.adminUsername || cleanUser;
    rest.credentialStatus = 'TEMP_ISSUED';
    rest.mustChangePassword = true;
    rest.tempPasswordPreview = tempPassword;
    rest.passwordUpdatedAt = undefined;
    passwordVault.set(`RESTAURANT:${rest.id}`, hashPassword(tempPassword));
    addNotification(
      'RESTAURANT',
      `Login Credentials Issued · ${rest.name}`,
      `Super Admin issued username "${rest.adminUsername}". Sign in and set a new password on first login.`,
      'SYSTEM',
      rest.id
    );
    addAudit(
      'SUPER_ADMIN',
      'RESTAURANT_CREDENTIALS_ISSUED',
      rest.id,
      `Issued temp login "${rest.adminUsername}" for ${rest.name}`
    );
    broadcastState();
    return res.json({ ok: true, restaurant: rest });
  });

  // 5. Partner Admin Registration / Credential Activation (Bus Travel Admin & Restaurant Admin)
  app.post('/api/auth/partner/register', (req, res) => {
    const { role, username, tempPassword, newPassword, ownerName, mobile } = req.body as {
      role?: 'TRAVELS' | 'RESTAURANT';
      username?: string;
      tempPassword?: string;
      newPassword?: string;
      ownerName?: string;
      mobile?: string;
    };
    if (!role || !username?.trim() || !tempPassword) {
      return res.status(400).json({ error: 'Role, username, and temporary password are required.' });
    }
    const cleanUser = username.trim().toLowerCase();

    if (role === 'TRAVELS') {
      const comp = state.companies.find((c) => c.adminUsername?.toLowerCase() === cleanUser);
      if (!comp) {
        return res.status(404).json({ error: 'No Bus Travel account found for this Super Admin username.' });
      }
      if (comp.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Transport company access is suspended by Super Admin.' });
      }
      const stored = passwordVault.get(`TRAVELS:${comp.id}`);
      if (!stored || !verifyPassword(tempPassword, stored)) {
        return res.status(401).json({ error: 'Incorrect temporary password provided by Super Admin.' });
      }
      if (ownerName?.trim()) comp.ownerName = ownerName.trim();
      if (mobile?.trim()) comp.mobile = mobile.trim();

      if (newPassword) {
        if (newPassword.length < 6 || newPassword === tempPassword) {
          return res.status(400).json({
            error: 'New password must be at least 6 characters and different from temporary password.',
          });
        }
        passwordVault.set(`TRAVELS:${comp.id}`, hashPassword(newPassword));
        comp.mustChangePassword = false;
        comp.credentialStatus = 'ACTIVE_SYNCED';
        comp.tempPasswordPreview = undefined;
        comp.passwordUpdatedAt = nowIso();
        addNotification(
          'SUPER_ADMIN',
          `Partner Registered & Password Synced · ${comp.name}`,
          `${comp.name} (${comp.adminUsername}) registered and updated their password.`,
          'SYSTEM',
          comp.id
        );
      }

      const token = createAuthToken('TRAVELS', comp.id, comp.adminUsername!);
      addAudit('TRAVELS_ADMIN', 'PARTNER_REGISTERED', comp.id, `${comp.name} activated login (${comp.adminUsername})`);
      broadcastState();
      return res.json({
        ok: true,
        role: 'TRAVELS',
        entity: comp,
        token,
        mustChangePassword: Boolean(comp.mustChangePassword),
      });
    }

    const rest = state.restaurants.find((r) => r.adminUsername?.toLowerCase() === cleanUser);
    if (!rest) {
      return res.status(404).json({ error: 'No Restaurant account found for this Super Admin username.' });
    }
    if (rest.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Restaurant partner access is suspended by Super Admin.' });
    }
    const stored = passwordVault.get(`RESTAURANT:${rest.id}`);
    if (!stored || !verifyPassword(tempPassword, stored)) {
      return res.status(401).json({ error: 'Incorrect temporary password provided by Super Admin.' });
    }
    if (ownerName?.trim()) rest.ownerName = ownerName.trim();
    if (mobile?.trim()) rest.mobile = mobile.trim();

    if (newPassword) {
      if (newPassword.length < 6 || newPassword === tempPassword) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters and different from temporary password.',
        });
      }
      passwordVault.set(`RESTAURANT:${rest.id}`, hashPassword(newPassword));
      rest.mustChangePassword = false;
      rest.credentialStatus = 'ACTIVE_SYNCED';
      rest.tempPasswordPreview = undefined;
      rest.passwordUpdatedAt = nowIso();
      addNotification(
        'SUPER_ADMIN',
        `Partner Registered & Password Synced · ${rest.name}`,
        `${rest.name} (${rest.adminUsername}) registered and updated their password.`,
        'SYSTEM',
        rest.id
      );
    }

    const token = createAuthToken('RESTAURANT', rest.id, rest.adminUsername!);
    addAudit('RESTAURANT', 'PARTNER_REGISTERED', rest.id, `${rest.name} activated login (${rest.adminUsername})`);
    broadcastState();
    return res.json({
      ok: true,
      role: 'RESTAURANT',
      entity: rest,
      token,
      mustChangePassword: Boolean(rest.mustChangePassword),
    });
  });

  // 6. Partner Admin Login (Bus Travel Admin & Restaurant Admin)
  app.post('/api/auth/partner/login', (req, res) => {
    const { role, username, password } = req.body as {
      role?: 'TRAVELS' | 'RESTAURANT';
      username?: string;
      password?: string;
    };
    if (!role || !username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const cleanUser = username.trim().toLowerCase();

    if (role === 'TRAVELS') {
      const comp = state.companies.find((c) => c.adminUsername?.toLowerCase() === cleanUser);
      if (!comp) return res.status(401).json({ error: 'Invalid Bus Travel Admin username.' });
      if (comp.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Company account is suspended.' });
      }
      const stored = passwordVault.get(`TRAVELS:${comp.id}`);
      if (!stored || !verifyPassword(password, stored)) {
        return res.status(401).json({ error: 'Invalid password. If you changed your initial password, use your updated password.' });
      }
      const token = createAuthToken('TRAVELS', comp.id, comp.adminUsername!);
      addAudit('TRAVELS_ADMIN', 'PARTNER_LOGIN', comp.id, `${comp.name} logged in (${comp.adminUsername})`);
      broadcastState();
      return res.json({
        ok: true,
        role: 'TRAVELS',
        entity: comp,
        token,
        mustChangePassword: Boolean(comp.mustChangePassword),
      });
    }

    const rest = state.restaurants.find((r) => r.adminUsername?.toLowerCase() === cleanUser);
    if (!rest) return res.status(401).json({ error: 'Invalid Restaurant Admin username.' });
    if (rest.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Restaurant account is suspended.' });
    }
    const stored = passwordVault.get(`RESTAURANT:${rest.id}`);
    if (!stored || !verifyPassword(password, stored)) {
      return res.status(401).json({ error: 'Invalid password. If you changed your initial password, use your updated password.' });
    }
    const token = createAuthToken('RESTAURANT', rest.id, rest.adminUsername!);
    addAudit('RESTAURANT', 'PARTNER_LOGIN', rest.id, `${rest.name} logged in (${rest.adminUsername})`);
    broadcastState();
    return res.json({
      ok: true,
      role: 'RESTAURANT',
      entity: rest,
      token,
      mustChangePassword: Boolean(rest.mustChangePassword),
    });
  });

  // 7. Mandatory First-Login Password Change (Username Immutable, Syncs Back to Super Admin)
  app.post('/api/auth/partner/change-password', (req, res) => {
    const session = getBearerSession(req);
    if (!session || (session.role !== 'TRAVELS' && session.role !== 'RESTAURANT')) {
      return res.status(401).json({ error: 'Authenticated partner session required.' });
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Current password and new password (min 6 chars) are required.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from temporary password.' });
    }

    const vaultKey = `${session.role}:${session.entityId}`;
    const stored = passwordVault.get(vaultKey);
    if (!stored || !verifyPassword(currentPassword, stored)) {
      return res.status(401).json({ error: 'Current password verification failed.' });
    }

    passwordVault.set(vaultKey, hashPassword(newPassword));
    const updatedAt = nowIso();

    if (session.role === 'TRAVELS') {
      const comp = state.companies.find((c) => c.id === session.entityId);
      if (!comp) return res.status(404).json({ error: 'Company not found.' });
      comp.mustChangePassword = false;
      comp.credentialStatus = 'ACTIVE_SYNCED';
      comp.tempPasswordPreview = undefined;
      comp.passwordUpdatedAt = updatedAt;

      addNotification(
        'SUPER_ADMIN',
        `Bus Travel Password Updated · ${comp.name}`,
        `${comp.name} (username: ${comp.adminUsername}) updated their first-login password. Future logins require the new password.`,
        'SYSTEM',
        comp.id
      );
      addAudit(
        'TRAVELS_ADMIN',
        'PASSWORD_UPDATED_SYNCED',
        comp.id,
        `${comp.name} updated password (username ${comp.adminUsername} unchanged) — synced with Super Admin`
      );
      broadcastState();
      return res.json({ ok: true, role: 'TRAVELS', entity: comp, passwordUpdatedAt: updatedAt });
    }

    const rest = state.restaurants.find((r) => r.id === session.entityId);
    if (!rest) return res.status(404).json({ error: 'Restaurant not found.' });
    rest.mustChangePassword = false;
    rest.credentialStatus = 'ACTIVE_SYNCED';
    rest.tempPasswordPreview = undefined;
    rest.passwordUpdatedAt = updatedAt;

    addNotification(
      'SUPER_ADMIN',
      `Restaurant Password Updated · ${rest.name}`,
      `${rest.name} (username: ${rest.adminUsername}) updated their first-login password. Future logins require the new password.`,
      'SYSTEM',
      rest.id
    );
    addAudit(
      'RESTAURANT',
      'PASSWORD_UPDATED_SYNCED',
      rest.id,
      `${rest.name} updated password (username ${rest.adminUsername} unchanged) — synced with Super Admin`
    );
    broadcastState();
    return res.json({ ok: true, role: 'RESTAURANT', entity: rest, passwordUpdatedAt: updatedAt });
  });

  // 8. Bus Travel Company Driver Credential Management & Driver Auth
  app.post('/api/travels/drivers', (req, res) => {
    const body = req.body as {
      companyId?: string;
      name?: string;
      role?: 'DRIVER' | 'CONDUCTOR';
      mobile?: string;
      licenseNo?: string;
      assignedVehicleId?: string;
      username?: string;
      tempPassword?: string;
    };
    if (
      !body.companyId ||
      !body.name?.trim() ||
      !body.username?.trim() ||
      !body.tempPassword ||
      body.tempPassword.length < 6
    ) {
      return res.status(400).json({
        error: 'Company, driver name, username, and password (min 6 chars) are required.',
      });
    }
    const cleanUser = body.username.trim().toLowerCase();
    const conflict = state.staff.find((s) => s.username?.toLowerCase() === cleanUser);
    if (conflict) {
      return res.status(409).json({ error: `Driver username "${cleanUser}" already exists.` });
    }
    const company = state.companies.find((c) => c.id === body.companyId);
    if (!company) return res.status(404).json({ error: 'Transport company not found.' });

    const created: StaffMember = {
      id: makeId(body.role === 'CONDUCTOR' ? 'cnd' : 'drv').toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile?.trim() || '+91 98400 00000',
      licenseNo: body.licenseNo?.trim() || `TN-DRV-${Math.floor(10000 + Math.random() * 89999)}`,
      companyId: body.companyId,
      role: body.role || 'DRIVER',
      assignedVehicleId: body.assignedVehicleId || state.vehicles.find((v) => v.companyId === body.companyId)?.id || 'veh-tn45',
      username: cleanUser,
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: body.tempPassword,
    };

    passwordVault.set(`DRIVER:${created.id}`, hashPassword(body.tempPassword));
    state.staff.push(created);

    addAudit(
      'TRAVELS_ADMIN',
      'DRIVER_CREDENTIALS_CREATED',
      created.id,
      `${company.name} created login "${cleanUser}" for ${created.name}`
    );
    broadcastState();
    res.status(201).json({ ok: true, staff: created });
  });

  app.patch('/api/travels/drivers/:id', (req, res) => {
    const member = state.staff.find((s) => s.id === req.params.id);
    if (!member) return res.status(404).json({ error: 'Driver or conductor not found.' });
    const { credentialStatus, assignedVehicleId, tempPassword } = req.body as {
      credentialStatus?: StaffMember['credentialStatus'];
      assignedVehicleId?: string;
      tempPassword?: string;
    };
    if (credentialStatus) member.credentialStatus = credentialStatus;
    if (assignedVehicleId) member.assignedVehicleId = assignedVehicleId;
    if (tempPassword && tempPassword.length >= 6) {
      passwordVault.set(`DRIVER:${member.id}`, hashPassword(tempPassword));
      member.tempPasswordPreview = tempPassword;
      member.mustChangePassword = true;
      member.credentialStatus = 'TEMP_ISSUED';
    }
    addAudit('TRAVELS_ADMIN', 'DRIVER_UPDATED', member.id, `Updated driver ${member.name} (${member.credentialStatus})`);
    broadcastState();
    res.json({ ok: true, staff: member });
  });

  app.post('/api/auth/driver/register', (req, res) => {
    const body = req.body as {
      companyId?: string;
      name?: string;
      role?: 'DRIVER' | 'CONDUCTOR';
      mobile?: string;
      licenseNo?: string;
      assignedVehicleId?: string;
      username?: string;
      password?: string;
    };
    if (
      !body.companyId ||
      !body.name?.trim() ||
      !body.username?.trim() ||
      !body.password ||
      body.password.length < 6
    ) {
      return res.status(400).json({
        error: 'Company, full name, username, and password (min 6 chars) are required.',
      });
    }
    const cleanUser = body.username.trim().toLowerCase();
    if (state.staff.some((s) => s.username?.toLowerCase() === cleanUser)) {
      return res.status(409).json({ error: `Username "${cleanUser}" is already taken.` });
    }
    const company = state.companies.find((c) => c.id === body.companyId);
    if (!company) return res.status(404).json({ error: 'Selected Bus Travel company not found.' });

    const created: StaffMember = {
      id: makeId(body.role === 'CONDUCTOR' ? 'cnd' : 'drv').toLowerCase(),
      name: body.name.trim(),
      mobile: body.mobile?.trim() || '+91 98400 00000',
      licenseNo: body.licenseNo?.trim() || `DL-${Math.floor(100000 + Math.random() * 899999)}`,
      companyId: company.id,
      role: body.role || 'DRIVER',
      assignedVehicleId:
        body.assignedVehicleId || state.vehicles.find((v) => v.companyId === company.id)?.id || 'veh-tn45',
      username: cleanUser,
      credentialStatus: 'ACTIVE',
      mustChangePassword: false,
      selfRegistered: true,
      passwordUpdatedAt: nowIso(),
      lastLoginAt: nowIso(),
    };
    passwordVault.set(`DRIVER:${created.id}`, hashPassword(body.password));
    state.staff.push(created);

    const token = createAuthToken('DRIVER', created.id, cleanUser);
    addNotification(
      'TRAVELS_ADMIN',
      `New Driver Registered · ${created.name}`,
      `${created.name} (${cleanUser}) registered under ${company.name}.`,
      'SYSTEM',
      company.id
    );
    addAudit('DRIVER', 'DRIVER_REGISTERED', created.id, `${created.name} registered under ${company.name}`);
    broadcastState();
    res.status(201).json({ ok: true, staff: created, company, token });
  });

  app.post('/api/auth/driver/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Company-issued username and password are required.' });
    }
    const cleanUser = username.trim().toLowerCase();
    const member = state.staff.find((s) => s.username?.toLowerCase() === cleanUser);
    if (!member) {
      return res.status(401).json({ error: 'Driver username not found.' });
    }
    if (member.credentialStatus === 'SUSPENDED') {
      return res.status(403).json({ error: 'Driver access suspended by your Bus Travel company.' });
    }
    const company = state.companies.find((c) => c.id === member.companyId);
    if (company?.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Parent transport company is suspended.' });
    }
    const stored = passwordVault.get(`DRIVER:${member.id}`);
    if (!stored || !verifyPassword(password, stored)) {
      return res.status(401).json({ error: 'Invalid driver password.' });
    }
    member.lastLoginAt = nowIso();
    const token = createAuthToken('DRIVER', member.id, cleanUser);
    addAudit('DRIVER', 'DRIVER_LOGIN', member.id, `${member.name} (${cleanUser}) logged in`);
    broadcastState();
    res.json({
      ok: true,
      staff: member,
      company,
      token,
      mustChangePassword: Boolean(member.mustChangePassword),
    });
  });

  app.post('/api/auth/driver/change-password', (req, res) => {
    const session = getBearerSession(req);
    if (!session || session.role !== 'DRIVER') {
      return res.status(401).json({ error: 'Authenticated driver session required.' });
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Current password and new password (min 6 chars) are required.' });
    }
    const stored = passwordVault.get(`DRIVER:${session.entityId}`);
    if (!stored || !verifyPassword(currentPassword, stored)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const member = state.staff.find((s) => s.id === session.entityId);
    if (!member) return res.status(404).json({ error: 'Driver not found.' });

    passwordVault.set(`DRIVER:${member.id}`, hashPassword(newPassword));
    member.mustChangePassword = false;
    member.credentialStatus = 'ACTIVE';
    member.tempPasswordPreview = undefined;
    member.passwordUpdatedAt = nowIso();
    addAudit('DRIVER', 'DRIVER_PASSWORD_UPDATED', member.id, `${member.name} updated driver password`);
    broadcastState();
    res.json({ ok: true, staff: member });
  });

  // Dynamic QR SVG & PNG Generator
  app.get('/api/qr/:token/svg', async (req, res) => {
    const { token } = req.params;
    const baseUrl =
      (req.query.origin as string) ||
      PUBLIC_APP_URL;
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/?view=passenger&qr=${encodeURIComponent(token)}`;
    try {
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 1,
        width: 240,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch {
      res.status(500).json({ error: 'Failed to generate QR SVG' });
    }
  });

  app.get('/api/qr/:token/png', async (req, res) => {
    const { token } = req.params;
    const baseUrl =
      (req.query.origin as string) ||
      PUBLIC_APP_URL;
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/?view=passenger&qr=${encodeURIComponent(token)}`;
    try {
      const buffer = await QRCode.toBuffer(targetUrl, {
        type: 'png',
        margin: 2,
        width: 512,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${token}.png"`);
      res.send(buffer);
    } catch {
      res.status(500).json({ error: 'Failed to generate QR PNG' });
    }
  });

  // QR Scan Tracking & Validation
  app.post('/api/qr/scan', (req, res) => {
    const { token } = req.body as { token?: string };
    const qr = state.qrCodes.find((q) => q.token === token);
    if (!qr || !qr.active) {
      return res.status(404).json({ error: 'QR code is invalid or deactivated.' });
    }
    const partnership = state.partnerships.find((p) => p.id === qr.partnershipId);
    if (!partnership || partnership.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Route partnership is currently inactive.' });
    }
    const company = state.companies.find((c) => c.id === partnership.companyId);
    if (!company || company.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Transport company access is suspended.' });
    }
    qr.scanCount += 1;
    broadcastState();
    res.json({ ok: true, qr, partnership });
  });

  // Passenger & Crew Food Order Creation (Idempotent + Backend Price & Availability Verification)
  app.post('/api/orders', (req, res) => {
    const {
      idempotencyKey,
      qrId,
      tripId: bodyTripId,
      restaurantId,
      items,
      orderType,
      orderRole = 'PASSENGER',
      dineInGuests,
      passengerName,
      passengerPhone,
      seatNumber,
      specialInstructions,
      dietaryNotes,
      simulateOutcome = 'SUCCESS',
    } = req.body as {
      idempotencyKey: string;
      qrId?: string;
      tripId?: string;
      restaurantId: string;
      items: { menuItemId: string; qty: number }[];
      orderType: 'DINE_IN' | 'TAKEAWAY';
      orderRole?: OrderRole;
      dineInGuests?: number;
      passengerName: string;
      passengerPhone: string;
      seatNumber?: string;
      specialInstructions?: string;
      dietaryNotes?: string;
      simulateOutcome?: 'SUCCESS' | 'FAIL';
    };

    if (!idempotencyKey || !restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    // Idempotency guard
    const existing = state.orders.find((o) => o.idempotencyKey === idempotencyKey);
    if (existing) {
      return res.json({ ok: true, order: existing, idempotentHit: true });
    }

    const isCrew = orderRole === 'CREW';
    const explicitTrip = bodyTripId ? state.trips.find((t) => t.id === bodyTripId) : undefined;
    const qr =
      (qrId ? state.qrCodes.find((q) => q.id === qrId && q.active) : undefined) ||
      (explicitTrip ? state.qrCodes.find((q) => q.vehicleId === explicitTrip.vehicleId && q.active) : undefined);

    if (!isCrew && !qr) {
      return res.status(403).json({ error: 'Active bus QR verification failed.' });
    }

    const partnership = qr
      ? state.partnerships.find((p) => p.id === qr.partnershipId && p.status === 'APPROVED')
      : state.partnerships.find((p) => p.vehicleId === explicitTrip?.vehicleId && p.status === 'APPROVED');

    const routeForCheck = state.routes.find((r) => r.id === (explicitTrip?.routeId || qr?.routeId));
    const onRouteStops = Boolean(routeForCheck?.stops.some((s) => s.restaurantId === restaurantId));

    if (!isCrew) {
      if (!partnership || !partnership.restaurantIds.includes(restaurantId)) {
        return res.status(403).json({ error: 'Restaurant is not an approved partner on this bus route.' });
      }
    } else if (!onRouteStops && !partnership?.restaurantIds.includes(restaurantId)) {
      return res.status(403).json({ error: 'Restaurant is not on your assigned highway route.' });
    }

    const vehicleId = qr?.vehicleId || explicitTrip?.vehicleId || 'veh-tn45';
    const routeId = qr?.routeId || explicitTrip?.routeId || 'route-chm';
    const vehObj = state.vehicles.find((v) => v.id === vehicleId);
    const companyId = partnership?.companyId || vehObj?.companyId || 'comp-kpn';

    const company = state.companies.find((c) => c.id === companyId && c.status === 'APPROVED');
    if (!company) return res.status(403).json({ error: 'Transport company is not approved.' });

    const restaurant = state.restaurants.find((r) => r.id === restaurantId);
    if (!restaurant || restaurant.status !== 'APPROVED' || restaurant.isClosedToday || !restaurant.acceptingOrders) {
      return res.status(409).json({
        error: restaurant?.isClosedToday
          ? `Restaurant is closed today${restaurant.closureReason ? ` (${restaurant.closureReason})` : ''}.`
          : 'Restaurant is currently not accepting orders.',
      });
    }

    // Re-verify menu item availability & authoritative server-side pricing
    const resolvedItems: Order['items'] = [];
    let rawSubtotal = 0;
    for (const reqItem of items) {
      const menu = state.menuItems.find((m) => m.id === reqItem.menuItemId && m.restaurantId === restaurantId);
      if (!menu || !menu.available) {
        return res.status(409).json({
          error: `Item "${menu?.name || reqItem.menuItemId}" just became unavailable. Please update your cart.`,
        });
      }
      const qty = Math.max(1, Math.min(20, Math.floor(reqItem.qty)));
      rawSubtotal += menu.price * qty;
      resolvedItems.push({
        menuItemId: menu.id,
        name: menu.name,
        qty,
        unitPrice: menu.price,
        isVeg: menu.isVeg,
      });
    }

    const crewDiscountPct = isCrew ? Math.max(0, Math.min(60, restaurant.crewDiscountPct ?? 25)) : 0;
    const crewDiscountAmount = isCrew ? Number(((rawSubtotal * crewDiscountPct) / 100).toFixed(2)) : 0;
    const subtotal = Number(Math.max(0, rawSubtotal - crewDiscountAmount).toFixed(2));
    const gstAmount = Number((subtotal * 0.05).toFixed(2));
    const serviceFee = isCrew ? 0 : 10;
    const totalAmount = Number((subtotal + gstAmount + serviceFee).toFixed(2));
    const commissionPct = restaurant.commissionPct;
    const platformCommission = Number(((subtotal * commissionPct) / 100).toFixed(2));
    const gatewayFee = Number((totalAmount * 0.018).toFixed(2));
    const restaurantPayable = Number((subtotal - platformCommission - gatewayFee).toFixed(2));

    const trip = explicitTrip || state.trips.find((t) => t.vehicleId === vehicleId && t.routeId === routeId);
    const stopEta = trip?.stopEtas.find((s) => s.restaurantId === restaurantId);
    const etaMinutesAtOrder = stopEta ? stopEta.etaMinutes : 45;
    const distanceKmAtOrder = stopEta ? stopEta.distanceRemainingKm : 40;

    const paymentSuccess = simulateOutcome !== 'FAIL';
    const order: Order = {
      id: `ORD-${Math.floor(8850 + Math.random() * 1100)}`,
      pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
      idempotencyKey,
      qrId: qr?.id || 'qr-crew',
      vehicleId,
      companyId,
      routeId,
      tripId: trip?.id || 'trip-unassigned',
      restaurantId,
      items: resolvedItems,
      subtotal,
      crewDiscountAmount: crewDiscountAmount > 0 ? crewDiscountAmount : undefined,
      gstAmount,
      serviceFee,
      totalAmount,
      commissionPct,
      platformCommission,
      gatewayFee,
      restaurantPayable,
      orderType: orderType === 'DINE_IN' ? 'DINE_IN' : 'TAKEAWAY',
      orderRole: isCrew ? 'CREW' : 'PASSENGER',
      complimentaryPerk: isCrew ? restaurant.complimentaryPerk : undefined,
      dineInGuests: orderType === 'DINE_IN' ? dineInGuests || 1 : undefined,
      passengerName: passengerName?.trim() || (isCrew ? 'Bus Driver' : 'Bus Passenger'),
      passengerPhone: passengerPhone?.trim() || '+91 90000 00000',
      seatNumber: seatNumber?.trim() || undefined,
      specialInstructions: specialInstructions?.trim() || undefined,
      dietaryNotes: dietaryNotes?.trim() || undefined,
      paymentStatus: paymentSuccess ? 'VERIFIED' : 'FAILED',
      paymentRef: paymentSuccess ? `PAY-RZP-${crypto.randomBytes(3).toString('hex').toUpperCase()}` : 'PAY-ERR-GATEWAY',
      status: paymentSuccess ? 'NEW' : 'CANCELLED',
      etaMinutesAtOrder,
      distanceKmAtOrder,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    state.orders.unshift(order);

    if (paymentSuccess) {
      if (qr) qr.orderCount += 1;
      addNotification(
        'RESTAURANT',
        `${isCrew ? 'New Staff Offer Order' : 'New Paid Order'} · ${order.id}`,
        `${order.passengerName} (${vehObj?.regNumber || 'Bus'}) ordered ${resolvedItems.map((i) => `${i.qty}× ${i.name}`).join(', ')} (${order.orderType}).`,
        'ORDER',
        restaurantId
      );
      addNotification(
        isCrew ? 'DRIVER' : 'PASSENGER',
        `Payment Confirmed · ${order.id}`,
        `Your order at ${restaurant.name} is confirmed. 4-Digit Pickup PIN: ${order.pickupCode}.`,
        'PAYMENT',
        order.id
      );
      addAudit(
        isCrew ? 'DRIVER' : 'PASSENGER',
        isCrew ? 'CREW_ORDER_PAID' : 'ORDER_CREATED_AND_PAID',
        order.id,
        `Verified ₹${totalAmount} for ${restaurant.name}`
      );
    } else {
      addNotification(
        'SUPER_ADMIN',
        `Payment Failure · ${order.id}`,
        `Gateway verification failed for ${order.passengerName} at ${restaurant.name} (₹${totalAmount}).`,
        'PAYMENT'
      );
      addAudit('SYSTEM', 'PAYMENT_FAILED', order.id, `Gateway returned failure for ₹${totalAmount}`);
    }

    broadcastState();
    res.status(paymentSuccess ? 201 : 402).json({ ok: paymentSuccess, order });
  });

  // Retry Payment on a Failed Order
  app.post('/api/orders/:id/retry-payment', (req, res) => {
    const order = state.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.paymentStatus === 'VERIFIED') {
      return res.json({ ok: true, order, idempotentHit: true });
    }
    const restaurant = state.restaurants.find((r) => r.id === order.restaurantId);
    if (!restaurant || !restaurant.acceptingOrders) {
      return res.status(409).json({ error: 'Restaurant is no longer accepting orders.' });
    }

    order.paymentStatus = 'VERIFIED';
    order.paymentRef = `PAY-RZP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    order.status = 'NEW';
    order.updatedAt = nowIso();

    const qr = state.qrCodes.find((q) => q.id === order.qrId);
    if (qr) qr.orderCount += 1;

    addNotification(
      'RESTAURANT',
      `New Paid Order · ${order.id}`,
      `Retry payment verified for ${order.passengerName} (${order.orderType}).`,
      'ORDER',
      order.restaurantId
    );
    addAudit('PASSENGER', 'PAYMENT_RETRY_VERIFIED', order.id, `Verified retry payment ${order.paymentRef}`);
    broadcastState();
    res.json({ ok: true, order });
  });

  // Update Order Status (Restaurant / Conductor / Admin)
  app.patch('/api/orders/:id/status', (req, res) => {
    const { status, reason, actorRole = 'RESTAURANT' } = req.body as {
      status: OrderStatus;
      reason?: string;
      actorRole?: string;
    };
    const order = state.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.paymentStatus === 'FAILED') {
      return res.status(400).json({ error: 'Cannot advance an unpaid failed order.' });
    }

    order.status = status;
    order.updatedAt = nowIso();

    const restaurant = state.restaurants.find((r) => r.id === order.restaurantId);
    if (status === 'REJECTED') {
      order.rejectionReason = reason || 'Kitchen at full capacity';
      order.paymentStatus = 'REFUNDED';
      addNotification(
        'PASSENGER',
        `Order Refunded · ${order.id}`,
        `${restaurant?.name || 'Restaurant'} could not fulfill ${order.id}. Full refund of ₹${order.totalAmount} initiated.`,
        'PAYMENT',
        order.id
      );
      addNotification(
        'SUPER_ADMIN',
        `Order Rejected & Refunded · ${order.id}`,
        `${restaurant?.name} rejected ${order.id}. Refund ₹${order.totalAmount} processed.`,
        'PAYMENT'
      );
    } else {
      const labelMap: Record<string, string> = {
        ACCEPTED: 'Restaurant accepted your order',
        PREPARING: 'Kitchen started preparing your meal',
        READY: `Food is READY! Show pickup code ${order.pickupCode}`,
        COMPLETED: 'Order collected & completed. Enjoy your journey!',
      };
      if (labelMap[status]) {
        addNotification('PASSENGER', `${order.id} · ${status}`, labelMap[status], 'ORDER', order.id);
      }
    }

    addAudit(actorRole, `ORDER_${status}`, order.id, `Order moved to ${status}`);
    broadcastState();
    res.json({ ok: true, order });
  });

  // Driver Trip Lifecycle & Real GPS Updates
  app.post('/api/trips/:id/start', (req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (trip.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Completed trips cannot be restarted.' });
    }
    trip.status = 'IN_PROGRESS';
    trip.speedKmh = 64;
    trip.startedAt = trip.startedAt || nowIso();
    trip.lastUpdatedAt = nowIso();

    const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
    const route = state.routes.find((r) => r.id === trip.routeId);
    addNotification(
      'SUPER_ADMIN',
      `Trip Started · ${veh?.regNumber}`,
      `Live GPS tracking enabled on ${route?.name}.`,
      'TRIP'
    );
    addAudit('DRIVER', 'TRIP_STARTED', trip.id, `GPS tracking started for ${veh?.regNumber}`);
    broadcastState();
    res.json({ ok: true, trip });
  });

  app.post('/api/trips/:id/gps', (req, res) => {
    const { progressPct, speedKmh } = req.body as { progressPct: number; speedKmh?: number };
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (trip.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'GPS updates are only permitted during an active IN_PROGRESS trip.' });
    }

    const route = state.routes.find((r) => r.id === trip.routeId);
    if (!route) return res.status(404).json({ error: 'Route not found.' });

    const clampedPct = Math.max(0, Math.min(100, Number(progressPct)));
    const speed = speedKmh !== undefined ? Math.max(20, Math.min(110, Number(speedKmh))) : trip.speedKmh || 66;
    const pos = interpolateRoutePosition(route.stops, clampedPct);

    trip.progressPct = clampedPct;
    trip.currentKm = pos.currentKm;
    trip.currentLat = pos.lat;
    trip.currentLng = pos.lng;
    trip.speedKmh = speed;
    trip.headingDeg = pos.headingDeg;
    trip.stopEtas = computeStopEtas(route.stops, pos.currentKm, speed);
    trip.lastUpdatedAt = nowIso();

    // Check approaching notifications for partner restaurants
    const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
    for (const stopEta of trip.stopEtas) {
      if (stopEta.restaurantId && !stopEta.passed && stopEta.etaMinutes <= 15 && stopEta.etaMinutes >= 1) {
        const activeOrdersForStop = state.orders.filter(
          (o) =>
            o.tripId === trip.id &&
            o.restaurantId === stopEta.restaurantId &&
            ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
        );
        if (activeOrdersForStop.length > 0) {
          const alreadyRecent = state.notifications.some(
            (n) =>
              n.targetRole === 'RESTAURANT' &&
              n.targetId === stopEta.restaurantId &&
              n.type === 'ETA' &&
              n.message.includes(`${stopEta.etaMinutes} min`)
          );
          if (!alreadyRecent) {
            addNotification(
              'RESTAURANT',
              `Bus Arriving Soon · ${veh?.regNumber}`,
              `${veh?.regNumber} is ${stopEta.distanceRemainingKm} km away (ETA ${stopEta.etaMinutes} mins) with ${activeOrdersForStop.length} active order(s).`,
              'ETA',
              stopEta.restaurantId
            );
          }
        }
      }
    }

    broadcastState('gps:update');
    res.json({ ok: true, trip });
  });

  app.post('/api/trips/:id/end', (req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    trip.status = 'COMPLETED';
    trip.speedKmh = 0;
    trip.completedAt = nowIso();
    trip.lastUpdatedAt = nowIso();

    const veh = state.vehicles.find((v) => v.id === trip.vehicleId);
    addAudit('DRIVER', 'TRIP_ENDED', trip.id, `GPS tracking stopped for ${veh?.regNumber}`);
    broadcastState();
    res.json({ ok: true, trip });
  });

  // Restaurant Admin & Partner Controls
  app.post('/api/restaurants', (req, res) => {
    const body = req.body as Partial<Restaurant> & { adminUsername?: string; tempPassword?: string };
    if (!body.name || !body.ownerName || !body.city) {
      return res.status(400).json({ error: 'Restaurant name, owner, and city are required.' });
    }
    const issuedUsername = (
      body.adminUsername?.trim() ||
      `${body.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}.kitchen`
    ).toLowerCase();
    const tempPass = body.tempPassword?.trim() || getSeedDemoPasscode();

    const created: Restaurant = {
      id: makeId('rest').toLowerCase(),
      name: body.name.trim(),
      ownerName: body.ownerName.trim(),
      mobile: body.mobile || '+91 98000 00000',
      email: body.email || 'partner@busbite.in',
      address: body.address || `${body.city} Highway Bypass`,
      city: body.city.trim(),
      lat: body.lat || 11.5,
      lng: body.lng || 78.5,
      operatingHours: body.operatingHours || '06:00 AM – 11:30 PM',
      openingTime: body.openingTime || '06:00',
      closingTime: body.closingTime || '23:30',
      isOpen24Hours: Boolean(body.isOpen24Hours),
      isClosedToday: Boolean(body.isClosedToday),
      closureReason: body.closureReason || '',
      status: 'APPROVED',
      acceptingOrders: !body.isClosedToday,
      commissionPct: Number(body.commissionPct ?? 5),
      gstNumber: body.gstNumber || '33AAACR9012M1Z1',
      fssaiNumber: body.fssaiNumber || '12425001009912',
      hygieneCertRef: body.hygieneCertRef || `HYG-${body.city.slice(0, 2).toUpperCase()}-2026.pdf`,
      bankAccount: body.bankAccount || 'HDFC •••• 1190',
      branches: [`${body.city} Main Highway Bay`],
      heroImage: IMG_HERO,
      rating: 4.7,
      avgPrepMinutes: 12,
      crewDiscountPct: Number(body.crewDiscountPct ?? 25),
      crewOfferLabel: body.crewOfferLabel || `Driver & Conductor Offer · ${Number(body.crewDiscountPct ?? 25)}% OFF`,
      complimentaryPerk: body.complimentaryPerk || 'Complimentary Tea / Filter Coffee for Drivers',
      adminUsername: issuedUsername,
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: tempPass,
      createdAt: nowIso(),
    };
    passwordVault.set(`RESTAURANT:${created.id}`, hashPassword(tempPass));
    state.restaurants.push(created);
    addAudit('SUPER_ADMIN', 'RESTAURANT_CREATED', created.id, `Registered ${created.name} (login: ${issuedUsername})`);
    broadcastState();
    res.status(201).json({ ok: true, restaurant: created });
  });

  app.patch('/api/restaurants/:id', (req, res) => {
    const rest = state.restaurants.find((r) => r.id === req.params.id);
    if (!rest) return res.status(404).json({ error: 'Restaurant not found.' });
    const updates = req.body as Partial<Restaurant>;
    if (updates.status) rest.status = updates.status;
    if (updates.name?.trim()) rest.name = updates.name.trim();
    if (updates.ownerName?.trim()) rest.ownerName = updates.ownerName.trim();
    if (updates.mobile?.trim()) rest.mobile = updates.mobile.trim();
    if (updates.email?.trim()) rest.email = updates.email.trim();
    if (updates.address?.trim()) rest.address = updates.address.trim();
    if (updates.city?.trim()) rest.city = updates.city.trim();
    if (updates.gstNumber?.trim()) rest.gstNumber = updates.gstNumber.trim();
    if (updates.fssaiNumber?.trim()) rest.fssaiNumber = updates.fssaiNumber.trim();
    if (typeof updates.isOpen24Hours === 'boolean') rest.isOpen24Hours = updates.isOpen24Hours;
    if (updates.openingTime !== undefined) rest.openingTime = updates.openingTime;
    if (updates.closingTime !== undefined) rest.closingTime = updates.closingTime;
    if (updates.closureReason !== undefined) rest.closureReason = updates.closureReason.trim();
    if (typeof updates.isClosedToday === 'boolean') {
      rest.isClosedToday = updates.isClosedToday;
      rest.acceptingOrders = updates.isClosedToday
        ? false
        : typeof updates.acceptingOrders === 'boolean'
          ? updates.acceptingOrders
          : true;
    } else if (typeof updates.acceptingOrders === 'boolean') {
      rest.acceptingOrders = rest.isClosedToday ? false : updates.acceptingOrders;
    }
    if (updates.isOpen24Hours || updates.openingTime !== undefined || updates.closingTime !== undefined) {
      if (rest.isOpen24Hours) {
        rest.operatingHours = '24 Hours Highway Service';
      } else if (rest.openingTime && rest.closingTime) {
        const fmt = (hhmm: string) => {
          const [hStr, mStr] = hhmm.split(':');
          const h = Number(hStr || 0);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 === 0 ? 12 : h % 12;
          return `${String(h12).padStart(2, '0')}:${(mStr || '00').padStart(2, '0')} ${ampm}`;
        };
        rest.operatingHours = `${fmt(rest.openingTime)} – ${fmt(rest.closingTime)}`;
      }
    }
    if (typeof updates.commissionPct === 'number') {
      rest.commissionPct = Math.max(0, Math.min(30, updates.commissionPct));
    }
    if (typeof updates.crewDiscountPct === 'number') {
      rest.crewDiscountPct = Math.max(0, Math.min(60, updates.crewDiscountPct));
      rest.crewOfferLabel = `Driver & Conductor Offer · ${rest.crewDiscountPct}% OFF`;
    }
    if (updates.complimentaryPerk !== undefined) rest.complimentaryPerk = updates.complimentaryPerk;
    if (updates.bankAccount) rest.bankAccount = updates.bankAccount;
    if (updates.hygieneCertRef) rest.hygieneCertRef = updates.hygieneCertRef;
    if (updates.operatingHours && !updates.isOpen24Hours && !updates.openingTime && !updates.closingTime) {
      rest.operatingHours = updates.operatingHours;
    }
    if (updates.branches) rest.branches = updates.branches;

    addAudit('RESTAURANT', 'RESTAURANT_UPDATED', rest.id, `Updated ${rest.name} (${rest.isClosedToday ? 'Closed Today' : rest.status})`);
    broadcastState();
    res.json({ ok: true, restaurant: rest });
  });

  app.post('/api/menu-items', (req, res) => {
    const body = req.body as {
      restaurantId: string;
      category: string;
      name: string;
      description: string;
      price: number;
      isVeg: boolean;
      prepMinutes?: number;
    };
    if (!body.restaurantId || !body.name || !body.price) {
      return res.status(400).json({ error: 'Missing required menu item fields.' });
    }
    const imageMap: Record<string, string> = {
      'South Indian Classics': IMG_DOSA,
      'Rice & Biryani': IMG_BIRYANI,
      'Beverages & Quick Bites': IMG_COFFEE,
      'Executive Meals': IMG_THALI,
    };
    const item = {
      id: makeId('item').toLowerCase(),
      restaurantId: body.restaurantId,
      category: body.category || 'Executive Meals',
      name: body.name.trim(),
      description: body.description?.trim() || 'Freshly prepared for highway transit travelers.',
      price: Number(body.price),
      isVeg: Boolean(body.isVeg),
      available: true,
      image: imageMap[body.category] || IMG_THALI,
      prepMinutes: Number(body.prepMinutes || 10),
    };
    state.menuItems.push(item);
    broadcastState();
    res.status(201).json({ ok: true, item });
  });

  app.patch('/api/menu-items/:id', (req, res) => {
    const item = state.menuItems.find((m) => m.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });
    const { available, price } = req.body as { available?: boolean; price?: number };
    if (typeof available === 'boolean') item.available = available;
    if (typeof price === 'number' && price > 0) item.price = price;
    broadcastState();
    res.json({ ok: true, item });
  });

  // Transport Company & Vehicle Management
  app.post('/api/companies', (req, res) => {
    const body = req.body as Partial<TransportCompany> & { adminUsername?: string; tempPassword?: string };
    if (!body.name || !body.ownerName) {
      return res.status(400).json({ error: 'Company name and owner are required.' });
    }
    const issuedUsername = (
      body.adminUsername?.trim() ||
      `${body.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}.travels`
    ).toLowerCase();
    const tempPass = body.tempPassword?.trim() || getSeedDemoPasscode();

    const created: TransportCompany = {
      id: makeId('comp').toLowerCase(),
      name: body.name.trim(),
      ownerName: body.ownerName.trim(),
      mobile: body.mobile || '+91 98400 00000',
      email: body.email || 'fleet@transport.in',
      registrationNo: body.registrationNo || `TN-01-TR-${Math.floor(10000 + Math.random() * 89999)}`,
      status: 'APPROVED',
      documentRef: body.documentRef || 'RC-FLEET-VERIFIED.pdf',
      permitNo: body.permitNo || `PERMIT-${Math.floor(1000 + Math.random() * 8999)}`,
      insuranceRef: body.insuranceRef || `INS-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      gstNumber: body.gstNumber || '33AAACT4810M1Z8',
      bankAccount: body.bankAccount || 'SBI •••• 5019',
      ticketCommissionPct: Math.max(0, Math.min(25, Number(body.ticketCommissionPct ?? 8))),
      adminUsername: issuedUsername,
      credentialStatus: 'TEMP_ISSUED',
      mustChangePassword: true,
      tempPasswordPreview: tempPass,
      createdAt: nowIso(),
    };
    passwordVault.set(`TRAVELS:${created.id}`, hashPassword(tempPass));
    state.companies.push(created);
    addAudit('SUPER_ADMIN', 'COMPANY_REGISTERED', created.id, `Registered ${created.name} (login: ${issuedUsername})`);
    broadcastState();
    res.status(201).json({ ok: true, company: created });
  });

  app.patch('/api/companies/:id', (req, res) => {
    const company = state.companies.find((c) => c.id === req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    const updates = req.body as Partial<TransportCompany>;
    if (updates.status) company.status = updates.status;
    if (typeof updates.ticketCommissionPct === 'number') {
      company.ticketCommissionPct = Math.max(0, Math.min(25, updates.ticketCommissionPct));
    }
    if (updates.name?.trim()) company.name = updates.name.trim();
    if (updates.ownerName?.trim()) company.ownerName = updates.ownerName.trim();
    if (updates.mobile?.trim()) company.mobile = updates.mobile.trim();
    if (updates.email?.trim()) company.email = updates.email.trim();
    if (updates.registrationNo?.trim()) company.registrationNo = updates.registrationNo.trim();
    if (updates.documentRef?.trim()) company.documentRef = updates.documentRef.trim();
    if (updates.permitNo !== undefined) company.permitNo = updates.permitNo.trim();
    if (updates.insuranceRef !== undefined) company.insuranceRef = updates.insuranceRef.trim();
    if (updates.gstNumber !== undefined) company.gstNumber = updates.gstNumber.trim();
    if (updates.bankAccount !== undefined) company.bankAccount = updates.bankAccount.trim();
    addAudit('TRAVELS_ADMIN', 'COMPANY_UPDATED', company.id, `${company.name} → ${company.status}`);
    broadcastState();
    res.json({ ok: true, company });
  });

  app.post('/api/vehicles', (req, res) => {
    const body = req.body as Partial<Vehicle>;
    if (!body.regNumber || !body.companyId || !body.routeId) {
      return res.status(400).json({ error: 'Registration number, company, and route are required.' });
    }
    const created: Vehicle = {
      id: makeId('veh').toLowerCase(),
      companyId: body.companyId,
      regNumber: body.regNumber.toUpperCase().trim(),
      type: body.type || 'AC Sleeper',
      seatingCapacity: Number(body.seatingCapacity || 36),
      routeId: body.routeId,
      driverId: body.driverId || 'drv-1',
      conductorId: body.conductorId || 'cnd-1',
      status: 'ACTIVE',
    };
    state.vehicles.push(created);
    const route = state.routes.find((r) => r.id === created.routeId);
    if (route) {
      const pos = interpolateRoutePosition(route.stops, 0);
      state.trips.push({
        id: makeId('trip').toLowerCase(),
        vehicleId: created.id,
        routeId: route.id,
        driverId: created.driverId,
        conductorId: created.conductorId,
        status: 'READY_TO_START',
        travelDate: '2026-11-26',
        departureTime: '22:30',
        arrivalTime: '05:45',
        seatFare: 780,
        bookedSeats: [],
        progressPct: 0,
        currentKm: pos.currentKm,
        currentLat: pos.lat,
        currentLng: pos.lng,
        speedKmh: 0,
        headingDeg: pos.headingDeg,
        stopEtas: computeStopEtas(route.stops, pos.currentKm, 65),
        lastUpdatedAt: nowIso(),
      });
    }
    addAudit('SUPER_ADMIN', 'VEHICLE_ADDED', created.id, `Added ${created.regNumber}`);
    broadcastState();
    res.status(201).json({ ok: true, vehicle: created });
  });

  app.patch('/api/vehicles/:id/status', (req, res) => {
    const vehicle = state.vehicles.find((v) => v.id === req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    const { status } = req.body as { status: Vehicle['status'] };
    if (status === 'ACTIVE' || status === 'MAINTENANCE') {
      vehicle.status = status;
    }
    addAudit('TRAVELS_ADMIN', 'VEHICLE_STATUS_UPDATED', vehicle.id, `${vehicle.regNumber} → ${vehicle.status}`);
    broadcastState();
    res.json({ ok: true, vehicle });
  });

  app.patch('/api/trips/:id/config', (req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    const body = req.body as {
      seatFare?: number;
      departureTime?: string;
      arrivalTime?: string;
      travelDate?: string;
      driverId?: string;
      conductorId?: string;
    };
    if (typeof body.seatFare === 'number' && body.seatFare >= 100) {
      trip.seatFare = Math.round(body.seatFare);
    }
    if (body.departureTime) trip.departureTime = body.departureTime;
    if (body.arrivalTime) trip.arrivalTime = body.arrivalTime;
    if (body.travelDate) trip.travelDate = body.travelDate;
    if (body.driverId) trip.driverId = body.driverId;
    if (body.conductorId) trip.conductorId = body.conductorId;
    trip.lastUpdatedAt = nowIso();
    addAudit('TRAVELS_ADMIN', 'TRIP_SCHEDULE_UPDATED', trip.id, `Updated fare ₹${trip.seatFare}, Dep ${trip.departureTime}`);
    broadcastState();
    res.json({ ok: true, trip });
  });

  // OTA Channel Seat Sync (RedBus / MakeMyTrip / Counter -> Shared Live Inventory)
  app.post('/api/trips/:id/channel-sync', (req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    const { seatNumbers, channel, action = 'LOCK' } = req.body as {
      seatNumbers: string[];
      channel: BookingChannel;
      action?: 'LOCK' | 'RELEASE';
    };
    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Provide at least one seat to sync.' });
    }
    const cleaned = Array.from(new Set(seatNumbers.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    trip.seatSources = trip.seatSources || {};

    if (action === 'LOCK') {
      const conflicts = cleaned.filter((s) => trip.bookedSeats.includes(s));
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: `Seat(s) ${conflicts.join(', ')} already locked on ${conflicts.map((s) => trip.seatSources?.[s] || 'BUSBITE').join(', ')}.`,
        });
      }
      trip.bookedSeats.push(...cleaned);
      cleaned.forEach((s) => {
        trip.seatSources![s] = channel || 'REDBUS';
      });
      trip.lastUpdatedAt = nowIso();
      addAudit('TRAVELS_ADMIN', 'OTA_CHANNEL_LOCK', trip.id, `Synced ${cleaned.join(', ')} from ${channel} (blocked on BusBite)`);
    } else {
      trip.bookedSeats = trip.bookedSeats.filter((s) => !cleaned.includes(s));
      cleaned.forEach((s) => {
        delete trip.seatSources![s];
      });
      trip.lastUpdatedAt = nowIso();
      addAudit('TRAVELS_ADMIN', 'OTA_CHANNEL_RELEASE', trip.id, `Released ${cleaned.join(', ')} from ${channel}`);
    }

    broadcastState();
    res.json({ ok: true, trip });
  });

  // Bus Ticket Booking (Passenger -> Bus Travels Admin)
  app.post('/api/tickets', (req, res) => {
    const {
      tripId,
      seatNumbers,
      boardingPoint,
      droppingPoint,
      passengerName,
      passengerPhone,
      passengerAge,
      passengerGender,
    } = req.body as {
      tripId: string;
      seatNumbers: string[];
      boardingPoint: string;
      droppingPoint: string;
      passengerName: string;
      passengerPhone: string;
      passengerAge?: number;
      passengerGender?: 'Male' | 'Female' | 'Other';
    };

    if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Select a bus trip and at least one seat.' });
    }

    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Scheduled bus trip not found.' });

    const vehicle = state.vehicles.find((v) => v.id === trip.vehicleId);
    if (!vehicle || vehicle.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'This bus is currently under maintenance.' });
    }

    const company = state.companies.find((c) => c.id === vehicle.companyId);
    if (!company || company.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Bus operator is not active for bookings.' });
    }

    const route = state.routes.find((r) => r.id === trip.routeId);
    const cleanedSeats = Array.from(new Set(seatNumbers.map((s) => s.trim().toUpperCase()).filter(Boolean)));
    const conflicts = cleanedSeats.filter((s) => trip.bookedSeats.includes(s));
    if (conflicts.length > 0) {
      const channelInfo = conflicts
        .map((s) => `${s} (${trip.seatSources?.[s] || 'BOOKED'})`)
        .join(', ');
      return res.status(409).json({
        error: `Seat(s) ${channelInfo} already booked across synced channels. Choose another seat.`,
      });
    }

    const farePerSeat = trip.seatFare;
    const subtotal = Number((farePerSeat * cleanedSeats.length).toFixed(2));
    const gstAmount = Number((subtotal * 0.05).toFixed(2));
    const convenienceFee = 25;
    const totalFare = Number((subtotal + gstAmount + convenienceFee).toFixed(2));
    const ticketCommissionPct = company.ticketCommissionPct ?? 8;
    const platformCommission = Number(((subtotal * ticketCommissionPct) / 100).toFixed(2));
    const operatorNet = Number((totalFare - platformCommission).toFixed(2));
    const linkedQr = state.qrCodes.find((q) => q.vehicleId === vehicle.id && q.active);

    const ticket: BusTicketBooking = {
      id: `TKT-${Math.floor(9020 + Math.random() * 970)}`,
      pnr: `RS-PNR-${Math.floor(10000 + Math.random() * 89999)}`,
      tripId: trip.id,
      vehicleId: vehicle.id,
      companyId: vehicle.companyId,
      routeId: trip.routeId,
      seatNumbers: cleanedSeats,
      boardingPoint: boardingPoint || route?.origin || 'Origin Terminus',
      droppingPoint: droppingPoint || route?.destination || 'Destination Terminus',
      travelDate: trip.travelDate,
      passengerName: passengerName?.trim() || 'Bus Passenger',
      passengerPhone: passengerPhone?.trim() || '+91 98400 00000',
      passengerAge: Number(passengerAge) || 26,
      passengerGender: passengerGender || 'Male',
      farePerSeat,
      subtotal,
      gstAmount,
      convenienceFee,
      totalFare,
      ticketCommissionPct,
      platformCommission,
      operatorNet,
      bookingChannel: 'BUSBITE',
      paymentRef: `TKT-RZP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'CONFIRMED',
      qrToken: linkedQr?.token,
      bookedAt: nowIso(),
    };

    trip.bookedSeats.push(...cleanedSeats);
    trip.seatSources = trip.seatSources || {};
    cleanedSeats.forEach((s) => {
      trip.seatSources![s] = 'BUSBITE';
    });
    state.tickets.unshift(ticket);

    addNotification(
      'PASSENGER',
      `Ticket Confirmed · ${ticket.pnr}`,
      `${vehicle.regNumber} (${route?.name}) · Seat(s) ${cleanedSeats.join(', ')}. Food pre-ordering unlocks after boarding.`,
      'TICKET',
      ticket.id
    );
    addNotification(
      'TRAVELS_ADMIN',
      `New Seat Booking · ${ticket.pnr}`,
      `${ticket.passengerName} booked ${cleanedSeats.join(', ')} on ${vehicle.regNumber} (₹${totalFare}, BusBite Comm ₹${platformCommission}).`,
      'TICKET',
      vehicle.companyId
    );
    addAudit('PASSENGER', 'BUS_TICKET_BOOKED', ticket.id, `PNR ${ticket.pnr} (${cleanedSeats.join(', ')}) on ${vehicle.regNumber}`);
    broadcastState();
    res.status(201).json({ ok: true, ticket });
  });

  app.patch('/api/tickets/:id/status', (req, res) => {
    const ticket = state.tickets.find((t) => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    const { status, actorRole = 'TRAVELS_ADMIN' } = req.body as { status: TicketStatus; actorRole?: string };
    if (!status || !['CONFIRMED', 'BOARDED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status.' });
    }

    const trip = state.trips.find((t) => t.id === ticket.tripId);
    if (status === 'CANCELLED' && ticket.status !== 'CANCELLED' && trip) {
      trip.bookedSeats = trip.bookedSeats.filter((s) => !ticket.seatNumbers.includes(s));
      if (trip.seatSources) {
        ticket.seatNumbers.forEach((s) => delete trip.seatSources![s]);
      }
      addNotification(
        'PASSENGER',
        `Ticket Cancelled · ${ticket.pnr}`,
        `Seats ${ticket.seatNumbers.join(', ')} released. Refund of ₹${ticket.totalFare.toFixed(2)} initiated.`,
        'TICKET',
        ticket.id
      );
    }

    if (status === 'BOARDED' && ticket.status !== 'BOARDED') {
      addNotification(
        'PASSENGER',
        `Boarded · Food Pre-Order Unlocked`,
        `Welcome aboard ${ticket.pnr}! You can now pre-order highway meals from your ticket.`,
        'TICKET',
        ticket.id
      );
    }

    ticket.status = status;
    addAudit(actorRole, `TICKET_${status}`, ticket.id, `PNR ${ticket.pnr} → ${status}`);
    broadcastState();
    res.json({ ok: true, ticket });
  });

  // Route Management
  app.post('/api/routes', (req, res) => {
    const { name, origin, destination, totalKm, restaurantIds } = req.body as {
      name: string;
      origin: string;
      destination: string;
      totalKm: number;
      restaurantIds?: string[];
    };
    if (!name || !origin || !destination) {
      return res.status(400).json({ error: 'Route name, origin, and destination are required.' });
    }
    const kmTotal = Math.max(50, Number(totalKm || 250));
    const stops: RouteStop[] = [
      {
        id: makeId('stop').toLowerCase(),
        name: `${origin} Terminus`,
        kmFromOrigin: 0,
        lat: 13.08,
        lng: 80.27,
        expectedArrivalWindow: '20:00 Dep',
      },
    ];
    const selectedRests = (restaurantIds || []).map((id) => state.restaurants.find((r) => r.id === id)).filter(Boolean) as Restaurant[];
    selectedRests.forEach((rest, idx) => {
      const km = Math.round(((idx + 1) / (selectedRests.length + 1)) * kmTotal);
      stops.push({
        id: makeId('stop').toLowerCase(),
        name: `${rest.city} Plaza`,
        kmFromOrigin: km,
        lat: rest.lat,
        lng: rest.lng,
        expectedArrivalWindow: 'Stop Window',
        restaurantId: rest.id,
      });
    });
    stops.push({
      id: makeId('stop').toLowerCase(),
      name: `${destination} Terminus`,
      kmFromOrigin: kmTotal,
      lat: 10.78,
      lng: 78.69,
      expectedArrivalWindow: '03:00 Arr',
    });

    const created: HighwayRoute = {
      id: makeId('route').toLowerCase(),
      name: name.trim(),
      code: `NH-${Math.floor(10 + Math.random() * 89)}`,
      origin: origin.trim(),
      destination: destination.trim(),
      totalKm: kmTotal,
      stops,
    };
    state.routes.push(created);
    addAudit('SUPER_ADMIN', 'ROUTE_CREATED', created.id, `Created corridor ${created.name}`);
    broadcastState();
    res.status(201).json({ ok: true, route: created });
  });

  // Bus–Restaurant Partnership & Dynamic QR Creation
  app.post('/api/partnerships', (req, res) => {
    const { companyId, vehicleId, routeId, restaurantIds, startDate, endDate } = req.body as {
      companyId: string;
      vehicleId: string;
      routeId: string;
      restaurantIds: string[];
      startDate?: string;
      endDate?: string;
    };
    if (!companyId || !vehicleId || !routeId || !restaurantIds?.length) {
      return res.status(400).json({ error: 'Company, vehicle, route, and at least one restaurant are required.' });
    }

    const partnership: Partnership = {
      id: makeId('part').toLowerCase(),
      companyId,
      vehicleId,
      routeId,
      restaurantIds,
      startDate: startDate || '2026-11-25',
      endDate: endDate || '2027-11-25',
      status: 'APPROVED',
      createdAt: nowIso(),
    };
    state.partnerships.unshift(partnership);

    const veh = state.vehicles.find((v) => v.id === vehicleId);
    const shortReg = (veh?.regNumber || 'BUS').replace(/\s+/g, '').slice(0, 4);
    const qr: QRCodeRecord = {
      id: makeId('qr').toLowerCase(),
      token: `RS-${shortReg}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      partnershipId: partnership.id,
      vehicleId,
      routeId,
      active: true,
      scanCount: 0,
      orderCount: 0,
      createdAt: nowIso(),
    };
    state.qrCodes.unshift(qr);

    addAudit('SUPER_ADMIN', 'PARTNERSHIP_CREATED', partnership.id, `Linked ${veh?.regNumber} with ${restaurantIds.length} restaurant(s) & generated QR ${qr.token}`);
    broadcastState();
    res.status(201).json({ ok: true, partnership, qr });
  });

  app.patch('/api/partnerships/:id', (req, res) => {
    const part = state.partnerships.find((p) => p.id === req.params.id);
    if (!part) return res.status(404).json({ error: 'Partnership not found.' });
    const { status, restaurantIds, actorRole = 'TRAVELS_ADMIN' } = req.body as {
      status?: 'APPROVED' | 'INACTIVE';
      restaurantIds?: string[];
      actorRole?: string;
    };
    if (status) part.status = status;
    if (Array.isArray(restaurantIds)) {
      part.restaurantIds = restaurantIds;
      addAudit(actorRole, 'PARTNERSHIP_RESTAURANTS_UPDATED', part.id, `Updated restaurant tie-ups (${restaurantIds.length} active)`);
    }
    broadcastState();
    res.json({ ok: true, partnership: part });
  });

  app.patch('/api/qr/:id/toggle', (req, res) => {
    const qr = state.qrCodes.find((q) => q.id === req.params.id);
    if (!qr) return res.status(404).json({ error: 'QR not found.' });
    qr.active = !qr.active;
    addAudit('SUPER_ADMIN', 'QR_TOGGLED', qr.id, `QR ${qr.token} is now ${qr.active ? 'Active' : 'Disabled'}`);
    broadcastState();
    res.json({ ok: true, qr });
  });

  app.post('/api/qr/:id/regenerate', (req, res) => {
    const qr = state.qrCodes.find((q) => q.id === req.params.id);
    if (!qr) return res.status(404).json({ error: 'QR not found.' });
    const veh = state.vehicles.find((v) => v.id === qr.vehicleId);
    const shortReg = (veh?.regNumber || 'BUS').replace(/\s+/g, '').slice(0, 4);
    qr.token = `RS-${shortReg}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    addAudit('SUPER_ADMIN', 'QR_REGENERATED', qr.id, `Regenerated opaque token ${qr.token}`);
    broadcastState();
    res.json({ ok: true, qr });
  });

  // Commission Receivables Settlement (Partners Pay Platform Commission TO BusBite Super Admin)
  app.post('/api/settlements/:entityId/settle', (req, res) => {
    const { entityId } = req.params;
    const { entityType = 'RESTAURANT' } = (req.body || {}) as { entityType?: 'RESTAURANT' | 'TRAVELS' };

    if (entityType === 'TRAVELS') {
      const company = state.companies.find((c) => c.id === entityId);
      if (!company) return res.status(404).json({ error: 'Transport company not found.' });

      const settledTicketIds = new Set(
        state.settlements.filter((s) => s.entityType === 'TRAVELS').flatMap((s) => s.ticketIds || [])
      );
      const eligibleTickets = state.tickets.filter(
        (t) => t.companyId === entityId && t.status !== 'CANCELLED' && !settledTicketIds.has(t.id)
      );
      if (eligibleTickets.length === 0) {
        return res.status(400).json({ error: 'No pending ticket commissions due from this operator.' });
      }

      const grossAmount = Number(eligibleTickets.reduce((s, t) => s + t.subtotal, 0).toFixed(2));
      const commissionAmount = Number(eligibleTickets.reduce((s, t) => s + t.platformCommission, 0).toFixed(2));

      const settlement: Settlement = {
        id: `RCV-TRV-${Math.floor(200 + Math.random() * 799)}`,
        entityType: 'TRAVELS',
        entityId,
        restaurantId: entityId,
        orderIds: [],
        ticketIds: eligibleTickets.map((t) => t.id),
        grossAmount,
        commissionAmount,
        gatewayFeeTotal: 0,
        gstOnFees: 0,
        netPayable: commissionAmount,
        status: 'SETTLED',
        settledAt: nowIso(),
        utrRef: `UTR${Date.now().toString().slice(-10)}`,
      };
      state.settlements.unshift(settlement);
      addNotification(
        'TRAVELS_ADMIN',
        `BusBite Commission Received · ₹${commissionAmount.toFixed(2)}`,
        `Recorded ₹${commissionAmount.toFixed(2)} ticket commission from ${company.name} (${eligibleTickets.length} tickets, ${settlement.utrRef}).`,
        'PAYMENT',
        entityId
      );
      addAudit('SUPER_ADMIN', 'TRAVELS_COMMISSION_RECEIVED', settlement.id, `Received ₹${commissionAmount} commission from ${company.name}`);
      broadcastState();
      return res.status(201).json({ ok: true, settlement });
    }

    const rest = state.restaurants.find((r) => r.id === entityId);
    if (!rest) return res.status(404).json({ error: 'Restaurant not found.' });

    const settledOrderIds = new Set(
      state.settlements.filter((s) => s.entityType !== 'TRAVELS').flatMap((s) => s.orderIds)
    );
    const eligible = state.orders.filter(
      (o) =>
        o.restaurantId === entityId &&
        o.paymentStatus === 'VERIFIED' &&
        o.status !== 'REJECTED' &&
        o.status !== 'CANCELLED' &&
        !settledOrderIds.has(o.id)
    );

    if (eligible.length === 0) {
      return res.status(400).json({ error: 'No pending commission orders for this restaurant.' });
    }

    const grossAmount = Number(eligible.reduce((s, o) => s + o.subtotal, 0).toFixed(2));
    const commissionAmount = Number(eligible.reduce((s, o) => s + o.platformCommission, 0).toFixed(2));
    const gatewayFeeTotal = Number(eligible.reduce((s, o) => s + o.gatewayFee, 0).toFixed(2));
    const gstOnFees = Number(((commissionAmount + gatewayFeeTotal) * 0.18).toFixed(2));

    const settlement: Settlement = {
      id: `RCV-RST-${Math.floor(200 + Math.random() * 799)}`,
      entityType: 'RESTAURANT',
      entityId,
      restaurantId: entityId,
      orderIds: eligible.map((o) => o.id),
      grossAmount,
      commissionAmount,
      gatewayFeeTotal,
      gstOnFees,
      netPayable: commissionAmount,
      status: 'SETTLED',
      settledAt: nowIso(),
      utrRef: `UTR${Date.now().toString().slice(-10)}`,
    };
    state.settlements.unshift(settlement);

    addNotification(
      'RESTAURANT',
      `Commission Paid to BusBite · ₹${commissionAmount.toFixed(2)}`,
      `Recorded ₹${commissionAmount.toFixed(2)} commission for ${eligible.length} order(s) via ${settlement.utrRef}.`,
      'PAYMENT',
      entityId
    );
    addAudit('SUPER_ADMIN', 'RESTAURANT_COMMISSION_RECEIVED', settlement.id, `Received ₹${commissionAmount} commission from ${rest.name}`);
    broadcastState();
    res.status(201).json({ ok: true, settlement });
  });

  // Vite / Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get(/.*/, (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BusBite server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BusBite server:', err);
  process.exit(1);
});
