import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import type { IndianLanguageCode } from '../types/platform';
import { translateAnyText } from './translationsEastWest';

export interface IndianLanguageOption {
  code: IndianLanguageCode;
  englishName: string;
  nativeName: string;
  region: string;
  rtl?: boolean;
}

export const INDIAN_LANGUAGES: IndianLanguageOption[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', region: 'All India' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', region: 'North & Central' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', region: 'AP & Telangana' },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal' },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab' },
  { code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'as', englishName: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam' },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', region: 'Pan-India', rtl: true },
  { code: 'sa', englishName: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Classical' },
  { code: 'kok', englishName: 'Konkani', nativeName: 'कोंकणी', region: 'Goa & Konkan' },
  { code: 'mni', englishName: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'ne', englishName: 'Nepali', nativeName: 'नेपाली', region: 'Sikkim & Hills' },
  { code: 'brx', englishName: 'Bodo', nativeName: 'बड़ो', region: 'Assam (Bodoland)' },
  { code: 'doi', englishName: 'Dogri', nativeName: 'डोगरी', region: 'Jammu' },
  { code: 'mai', englishName: 'Maithili', nativeName: 'मैथिली', region: 'Bihar & Mithila' },
  { code: 'sat', englishName: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', region: 'Jharkhand & East' },
  { code: 'ks', englishName: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', region: 'Kashmir' },
  { code: 'sd', englishName: 'Sindhi', nativeName: 'सिन्धी / سنڌي', region: 'West India' },
];

export type TranslationKey =
  | 'nav.passenger'
  | 'nav.driver'
  | 'nav.restaurant'
  | 'nav.travels'
  | 'nav.admin'
  | 'common.language'
  | 'common.searchLanguage'
  | 'common.login'
  | 'common.register'
  | 'common.logout'
  | 'common.username'
  | 'common.password'
  | 'common.newPassword'
  | 'common.confirmPassword'
  | 'common.changePassword'
  | 'common.save'
  | 'common.profile'
  | 'common.welcome'
  | 'common.contactInfo'
  | 'passenger.tab.food'
  | 'passenger.tab.route'
  | 'passenger.tab.cart'
  | 'passenger.tab.orders'
  | 'passenger.tab.tickets'
  | 'passenger.tab.profile'
  | 'passenger.foodHeading'
  | 'passenger.profileTitle'
  | 'passenger.registerSubtitle'
  | 'passenger.loginSubtitle'
  | 'driver.title'
  | 'driver.loginHeading'
  | 'driver.registerHeading'
  | 'driver.tab.home'
  | 'driver.tab.trips'
  | 'driver.tab.food'
  | 'driver.tab.gps'
  | 'driver.tab.orders'
  | 'driver.tab.profile'
  | 'restaurant.loginHeading'
  | 'restaurant.registerHeading'
  | 'restaurant.firstLoginNotice'
  | 'travels.loginHeading'
  | 'travels.registerHeading'
  | 'travels.firstLoginNotice'
  | 'admin.overview'
  | 'admin.passengers'
  | 'admin.restaurants'
  | 'admin.transport'
  | 'admin.orders'
  | 'admin.payments'
  | 'admin.reports';

const EN_STRINGS: Record<TranslationKey, string> = {
  'nav.passenger': 'Passenger App',
  'nav.driver': 'Driver App',
  'nav.restaurant': 'Restaurant Admin',
  'nav.travels': 'Bus Travel Admin',
  'nav.admin': 'Super Admin',
  'common.language': 'India Language',
  'common.searchLanguage': 'Search 23 Indian languages...',
  'common.login': 'Sign In',
  'common.register': 'Register',
  'common.logout': 'Sign Out',
  'common.username': 'Username',
  'common.password': 'Password',
  'common.newPassword': 'New Password',
  'common.confirmPassword': 'Confirm New Password',
  'common.changePassword': 'Update Password',
  'common.save': 'Save Changes',
  'common.profile': 'Profile',
  'common.welcome': 'Welcome',
  'common.contactInfo': 'CONTACT INFORMATION',
  'passenger.tab.food': 'Food',
  'passenger.tab.route': 'Route',
  'passenger.tab.cart': 'Cart',
  'passenger.tab.orders': 'Orders',
  'passenger.tab.tickets': 'Tickets',
  'passenger.tab.profile': 'Profile',
  'passenger.foodHeading': 'Highway Restaurants on Route',
  'passenger.profileTitle': 'Passenger Profile',
  'passenger.registerSubtitle': 'Create your BusBite account for faster highway orders & trips',
  'passenger.loginSubtitle': 'Sign in to view saved trips, food orders & profile',
  'driver.title': 'Driver App',
  'driver.loginHeading': 'Company Driver Login',
  'driver.registerHeading': 'Register Under Bus Company',
  'driver.tab.home': 'Home',
  'driver.tab.trips': 'Stops',
  'driver.tab.food': 'Food',
  'driver.tab.gps': 'GPS',
  'driver.tab.orders': 'Orders',
  'driver.tab.profile': 'Profile',
  'restaurant.loginHeading': 'Restaurant Admin Login',
  'restaurant.registerHeading': 'Partner Account Registration',
  'restaurant.firstLoginNotice': 'First Login: Please update your temporary password to continue. Your username stays unchanged.',
  'travels.loginHeading': 'Bus Travel Admin Login',
  'travels.registerHeading': 'Operator Account Registration',
  'travels.firstLoginNotice': 'First Login: Please update your temporary password to continue. Your username stays unchanged.',
  'admin.overview': 'Dashboard',
  'admin.passengers': 'Passengers',
  'admin.restaurants': 'Restaurants',
  'admin.transport': 'Transport & Fleet',
  'admin.orders': 'Master Orders',
  'admin.payments': 'Commissions & Dues',
  'admin.reports': 'Reports & Export',
};

const TRANSLATIONS: Record<IndianLanguageCode, Partial<Record<TranslationKey, string>>> = {
  en: EN_STRINGS,
  hi: {
    'nav.passenger': 'यात्री ऐप',
    'nav.driver': 'ड्राइवर ऐप',
    'nav.restaurant': 'रेस्टोरेंट एडमिन',
    'nav.travels': 'बस ट्रैवल एडमिन',
    'nav.admin': 'सुपर एडमिन',
    'common.language': 'भाषा (भारत)',
    'common.searchLanguage': '23 भारतीय भाषाएँ खोजें...',
    'common.login': 'लॉगिन करें',
    'common.register': 'रजिस्टर करें',
    'common.logout': 'लॉगआउट',
    'common.username': 'यूज़रनेम',
    'common.password': 'पासवर्ड',
    'common.newPassword': 'नया पासवर्ड',
    'common.confirmPassword': 'नया पासवर्ड पुष्टि करें',
    'common.changePassword': 'पासवर्ड अपडेट करें',
    'common.save': 'बदलाव सहेजें',
    'common.profile': 'प्रोफ़ाइल',
    'common.welcome': 'स्वागत है',
    'common.contactInfo': 'संपर्क जानकारी',
    'passenger.tab.food': 'भोजन',
    'passenger.tab.route': 'रूट',
    'passenger.tab.cart': 'कार्ट',
    'passenger.tab.orders': 'ऑर्डर',
    'passenger.tab.tickets': 'टिकट',
    'passenger.tab.profile': 'प्रोफ़ाइल',
    'passenger.foodHeading': 'रूट पर उपलब्ध हाईवे रेस्टोरेंट',
    'passenger.profileTitle': 'यात्री प्रोफ़ाइल',
    'passenger.registerSubtitle': 'तेज़ यात्रा और भोजन ऑर्डर के लिए नया खाता पंजीकृत करें',
    'passenger.loginSubtitle': 'अपनी यात्राएं, भोजन ऑर्डर और प्रोफ़ाइल देखने के लिए लॉगिन करें',
    'driver.title': 'ड्राइवर ऐप',
    'driver.loginHeading': 'कंपनी ड्राइवर लॉगिन',
    'driver.registerHeading': 'बस कंपनी के तहत रजिस्टर करें',
    'driver.tab.home': 'होम',
    'driver.tab.trips': 'स्टॉप',
    'driver.tab.food': 'भोजन',
    'driver.tab.gps': 'जीपीएस',
    'driver.tab.orders': 'ऑर्डर',
    'driver.tab.profile': 'प्रोफ़ाइल',
    'restaurant.loginHeading': 'रेस्टोरेंट एडमिन लॉगिन',
    'restaurant.registerHeading': 'पार्टनर खाता पंजीकरण',
    'restaurant.firstLoginNotice': 'पहली बार लॉगिन: जारी रखने के लिए नया पासवर्ड अपडेट करें (यूज़रनेम वही रहेगा)।',
    'travels.loginHeading': 'बस ट्रैवल एडमिन लॉगिन',
    'travels.registerHeading': 'ऑपरेटर खाता पंजीकरण',
    'travels.firstLoginNotice': 'पहली बार लॉगिन: जारी रखने के लिए नया पासवर्ड अपडेट करें (यूज़रनेम वही रहेगा)।',
    'admin.overview': 'डैशबोर्ड',
    'admin.passengers': 'यात्री विवरण',
    'admin.restaurants': 'रेस्टोरेंट',
    'admin.transport': 'परिवहन और फ्लीट',
    'admin.orders': 'मास्टर ऑर्डर',
    'admin.payments': 'कमीशन व बकाया',
    'admin.reports': 'रिपोर्ट और निर्यात',
  },
  ta: {
    'nav.passenger': 'பயணி செயலி',
    'nav.driver': 'டிரைவர் செயலி',
    'nav.restaurant': 'உணவக அட்மின்',
    'nav.travels': 'பஸ் டிராவல் அட்மின்',
    'nav.admin': 'சூப்பர் அட்மின்',
    'common.language': 'மொழி (இந்தியா)',
    'common.searchLanguage': '23 இந்திய மொழிகளைத் தேடு...',
    'common.login': 'உள்நுழைக',
    'common.register': 'பதிவு செய்க',
    'common.logout': 'வெளியேறு',
    'common.username': 'பயனர்பெயர்',
    'common.password': 'கடவுச்சொல்',
    'common.newPassword': 'புதிய கடவுச்சொல்',
    'common.confirmPassword': 'புதிய கடவுச்சொல்லை உறுதி செய்க',
    'common.changePassword': 'கடவுச்சொல் புதுப்பிப்பு',
    'common.save': 'சேமி',
    'common.profile': 'சுயவிவரம்',
    'common.welcome': 'நல்வரவு',
    'common.contactInfo': 'தொடர்பு விவரங்கள்',
    'passenger.tab.food': 'உணவு',
    'passenger.tab.route': 'வழித்தடம்',
    'passenger.tab.cart': 'கார்ட்',
    'passenger.tab.orders': 'ஆர்டர்',
    'passenger.tab.tickets': 'டிக்கெட்',
    'passenger.tab.profile': 'சுயவிவரம்',
    'passenger.foodHeading': 'பாதையில் உள்ள நெடுஞ்சாலை உணவகங்கள்',
    'passenger.profileTitle': 'பயணி சுயவிவரம்',
    'passenger.registerSubtitle': 'பயணம் மற்றும் உணவு ஆர்டர்களுக்கு புதிய கணக்கு பதிவு செய்யுங்கள்',
    'passenger.loginSubtitle': 'உங்கள் டிக்கெட், உணவு ஆர்டர் & சுயவிவரத்தைக் காண உள்நுழையவும்',
    'driver.title': 'டிரைவர் செயலி',
    'driver.loginHeading': 'நிறுவன டிரைவர் உள்நுழைவு',
    'driver.registerHeading': 'பஸ் நிறுவனத்தின் கீழ் பதிவு செய்க',
    'driver.tab.home': 'முகப்பு',
    'driver.tab.trips': 'நிறுத்தம்',
    'driver.tab.food': 'உணவு',
    'driver.tab.gps': 'ஜிபிஎஸ்',
    'driver.tab.orders': 'ஆர்டர்',
    'driver.tab.profile': 'சுயவிவரம்',
    'restaurant.loginHeading': 'உணவக அட்மின் உள்நுழைவு',
    'restaurant.registerHeading': 'உணவக கணக்கு பதிவு',
    'restaurant.firstLoginNotice': 'முதல் உள்நுழைவு: தொடர உங்கள் தற்காலிக கடவுச்சொல்லை மாற்றவும் (பயனர்பெயர் மாறாது).',
    'travels.loginHeading': 'பஸ் டிராவல் அட்மின் உள்நுழைவு',
    'travels.registerHeading': 'பஸ் டிராவல் கணக்கு பதிவு',
    'travels.firstLoginNotice': 'முதல் உள்நுழைவு: தொடர உங்கள் தற்காலிக கடவுச்சொல்லை மாற்றவும் (பயனர்பெயர் மாறாது).',
    'admin.overview': 'டாஷ்போர்டு',
    'admin.passengers': 'பயணிகள்',
    'admin.restaurants': 'உணவகங்கள்',
    'admin.transport': 'பஸ் & நிறுவனம்',
    'admin.orders': 'அனைத்து ஆர்டர்கள்',
    'admin.payments': 'கமிஷன் & நிலுவை',
    'admin.reports': 'அறிக்கைகள்',
  },
  te: {
    'nav.passenger': 'ప్రయాణికుల యాప్',
    'nav.driver': 'డ్రైవర్ యాప్',
    'nav.restaurant': 'రెస్టారెంట్ అడ్మిన్',
    'nav.travels': 'బస్ ట్రావెల్ అడ్మిన్',
    'nav.admin': 'సూపర్ అడ్మిన్',
    'common.language': 'భాష (భారతదేశం)',
    'common.login': 'లాగిన్',
    'common.register': 'నమోదు చేయండి',
    'common.logout': 'లాగ్అవుట్',
    'common.username': 'యూజర్ నేమ్',
    'common.password': 'పాస్‌వర్డ్',
    'common.newPassword': 'కొత్త పాస్‌వర్డ్',
    'common.changePassword': 'పాస్‌వర్డ్ మార్చండి',
    'common.profile': 'ప్రొఫైల్',
    'passenger.tab.food': 'ఆహారం',
    'passenger.tab.route': 'రూట్',
    'passenger.tab.cart': 'కార్ట్',
    'passenger.tab.orders': 'ఆర్డర్లు',
    'passenger.tab.tickets': 'టికెట్లు',
    'passenger.tab.profile': 'ప్రొఫైల్',
    'passenger.foodHeading': 'మార్గంలో ఉన్న హైవే రెస్టారెంట్లు',
    'passenger.profileTitle': 'ప్రయాణికుల ప్రొఫైల్ & ఖాతా',
    'driver.loginHeading': 'కంపెనీ డ్రైవర్ లాగిన్',
    'restaurant.loginHeading': 'రెస్టారెంట్ అడ్మిన్ లాగిన్',
    'travels.loginHeading': 'బస్ ట్రావెల్ అడ్మిన్ లాగిన్',
    'admin.passengers': 'ప్రయాణికులు',
  },
  kn: {
    'nav.passenger': 'ಪ್ರಯಾಣಿಕರ ಆ್ಯಪ್',
    'nav.driver': 'ಚಾಲಕರ ಆ್ಯಪ್',
    'nav.restaurant': 'ರೆಸ್ಟೋರೆಂಟ್ ಅಡ್ಮಿನ್',
    'nav.travels': 'ಬಸ್ ಟ್ರಾವೆಲ್ ಅಡ್ಮಿನ್',
    'nav.admin': 'ಸೂಪರ್ ಅಡ್ಮಿನ್',
    'common.login': 'ಲಾಗಿನ್',
    'common.register': 'ನೋಂದಣಿ',
    'common.logout': 'ಲಾಗ್ ಔಟ್',
    'common.username': 'ಬಳಕೆದಾರ ಹೆಸರು',
    'common.password': 'ಪಾಸ್‌ವರ್ಡ್',
    'common.newPassword': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
    'common.profile': 'ಪ್ರೊಫೈಲ್',
    'passenger.tab.food': 'ಆಹಾರ',
    'passenger.tab.route': 'ಮಾರ್ಗ',
    'passenger.tab.cart': 'ಕಾರ್ಟ್',
    'passenger.tab.orders': 'ಆರ್ಡರ್',
    'passenger.tab.tickets': 'ಟಿಕೆಟ್',
    'passenger.tab.profile': 'ಪ್ರೊಫೈಲ್',
    'passenger.foodHeading': 'ಮಾರ್ಗದಲ್ಲಿರುವ ಹೆದ್ದಾರಿ ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು',
    'admin.passengers': 'ಪ್ರಯಾಣಿಕರು',
  },
  ml: {
    'nav.passenger': 'യാത്രക്കാരുടെ ആപ്പ്',
    'nav.driver': 'ഡ്രൈവർ ആപ്പ്',
    'nav.restaurant': 'റെസ്റ്റോറന്റ് അഡ്മിൻ',
    'nav.travels': 'ബസ് ട്രാവൽ അഡ്മിൻ',
    'nav.admin': 'സൂപ്പർ അഡ്മിൻ',
    'common.login': 'ലോഗിൻ',
    'common.register': 'രജിസ്റ്റർ',
    'common.logout': 'ലോഗൗട്ട്',
    'common.username': 'ഉപയോക്തൃനാമം',
    'common.password': 'പാസ്‌വേഡ്',
    'common.profile': 'പ്രൊഫൈൽ',
    'passenger.tab.food': 'ഭക്ഷണം',
    'passenger.tab.route': 'റൂട്ട്',
    'passenger.tab.cart': 'കാർട്ട്',
    'passenger.tab.orders': 'ഓർഡർ',
    'passenger.tab.tickets': 'ടിക്കറ്റ്',
    'passenger.tab.profile': 'പ്രൊഫൈൽ',
    'passenger.foodHeading': 'വഴിയിലുള്ള ഹൈവേ റെസ്റ്റോറന്റുകൾ',
    'admin.passengers': 'യാത്രക്കാർ',
  },
  mr: {
    'nav.passenger': 'प्रवासी अ‍ॅप',
    'nav.driver': 'ड्रायव्हर अ‍ॅप',
    'nav.restaurant': 'रेस्टॉरंट अ‍ॅडमिन',
    'nav.travels': 'बस ट्रॅव्हल अ‍ॅडमिन',
    'nav.admin': 'सुपर अ‍ॅडमिन',
    'common.login': 'लॉगिन',
    'common.register': 'नोंदणी करा',
    'common.logout': 'लॉगआउट',
    'common.username': 'युजरनेम',
    'common.password': 'पासवर्ड',
    'common.profile': 'प्रोफाइल',
    'passenger.tab.food': 'जेवण',
    'passenger.tab.route': 'मार्ग',
    'passenger.tab.cart': 'कार्ट',
    'passenger.tab.orders': 'ऑर्डर',
    'passenger.tab.tickets': 'तिकीट',
    'passenger.tab.profile': 'प्रोफाइल',
    'admin.passengers': 'प्रवासी',
  },
  bn: {
    'nav.passenger': 'যাত্রী অ্যাপ',
    'nav.driver': 'ড্রাইভার অ্যাপ',
    'nav.restaurant': 'রেস্তোরাঁ অ্যাডমিন',
    'nav.travels': 'বাস ট্রাভেল অ্যাডমিন',
    'nav.admin': 'সুপার অ্যাডমিন',
    'common.login': 'লগইন',
    'common.register': 'নিবন্ধন করুন',
    'common.logout': 'লগআউট',
    'common.username': 'ইউজারনেম',
    'common.password': 'পাসওয়ার্ড',
    'common.profile': 'প্রোফাইল',
    'passenger.tab.food': 'খাবার',
    'passenger.tab.route': 'রুট',
    'passenger.tab.cart': 'কার্ট',
    'passenger.tab.orders': 'অর্ডার',
    'passenger.tab.tickets': 'টিকিট',
    'passenger.tab.profile': 'প্রোফাইল',
    'admin.passengers': 'যাত্রী',
  },
  gu: {
    'nav.passenger': 'મુસાફર એપ',
    'nav.driver': 'ડ્રાઈવર એપ',
    'nav.restaurant': 'રેસ્ટોરન્ટ એડમિન',
    'nav.travels': 'બસ ટ્રાવેલ એડમિન',
    'nav.admin': 'સુપર એડમિન',
    'common.login': 'લોગિન',
    'common.register': 'નોંધણી કરો',
    'common.logout': 'લોગઆઉટ',
    'common.username': 'યુઝરનેમ',
    'common.password': 'પાસવર્ડ',
    'common.profile': 'પ્રોફાઇલ',
    'passenger.tab.food': 'ભોજન',
    'passenger.tab.route': 'રૂટ',
    'passenger.tab.cart': 'કાર્ટ',
    'passenger.tab.orders': 'ઓર્ડર',
    'passenger.tab.tickets': 'ટિકિટ',
    'passenger.tab.profile': 'પ્રોફાઇલ',
    'admin.passengers': 'મુસાફરો',
  },
  pa: {
    'nav.passenger': 'ਯਾਤਰੀ ਐਪ',
    'nav.driver': 'ਡਰਾਈਵਰ ਐਪ',
    'nav.restaurant': 'ਰੈਸਟੋਰੈਂਟ ਐਡਮਿਨ',
    'nav.travels': 'ਬੱਸ ਟਰੈਵਲ ਐਡਮਿਨ',
    'nav.admin': 'ਸੁਪਰ ਐਡਮਿਨ',
    'common.login': 'ਲਾਗਇਨ',
    'common.register': 'ਰਜਿਸਟਰ ਕਰੋ',
    'common.logout': 'ਲਾਗਆਉਟ',
    'common.username': 'ਯੂਜ਼ਰਨੇਮ',
    'common.password': 'ਪਾਸਵਰਡ',
    'common.profile': 'ਪ੍ਰੋਫਾਈਲ',
    'passenger.tab.food': 'ਭੋਜਨ',
    'passenger.tab.route': 'ਰੂਟ',
    'passenger.tab.cart': 'ਕਾਰਟ',
    'passenger.tab.orders': 'ਆਰਡਰ',
    'passenger.tab.tickets': 'ਟਿਕਟ',
    'passenger.tab.profile': 'ਪ੍ਰੋਫਾਈਲ',
    'admin.passengers': 'ਯਾਤਰੀ',
  },
  or: {
    'nav.passenger': 'ଯାତ୍ରୀ ଆପ୍',
    'nav.driver': 'ଡ୍ରାଇଭର ଆପ୍',
    'nav.restaurant': 'ରେଷ୍ଟୁରାଣ୍ଟ ଆଡମିନ୍',
    'nav.travels': 'ବସ୍ ଟ୍ରାଭେଲ୍ ଆଡମିନ୍',
    'nav.admin': 'ସୁପର ଆଡମିନ୍',
    'common.login': 'ଲଗଇନ୍',
    'common.register': 'ପଞ୍ଜୀକରଣ',
    'common.profile': 'ପ୍ରୋଫାଇଲ୍',
    'passenger.tab.food': 'ଖାଦ୍ୟ',
    'passenger.tab.tickets': 'ଟିକେଟ୍',
    'passenger.tab.profile': 'ପ୍ରୋଫାଇଲ୍',
  },
  as: {
    'nav.passenger': 'যাত্ৰী এপ',
    'nav.driver': 'ড্ৰাইভাৰ এপ',
    'nav.restaurant': 'ৰেষ্টুৰেণ্ট এডমিন',
    'nav.travels': 'বাছ ট্ৰেভেল এডমিন',
    'nav.admin': 'ছুপাৰ এডমিন',
    'common.login': 'লগইন',
    'common.register': 'পঞ্জীয়ন',
    'common.profile': 'প্ৰফাইল',
    'passenger.tab.food': 'খাদ্য',
    'passenger.tab.profile': 'প্ৰফাইল',
  },
  ur: {
    'nav.passenger': 'مسافر ایپ',
    'nav.driver': 'ڈرائیور ایپ',
    'nav.restaurant': 'ریسٹورنٹ ایڈمن',
    'nav.travels': 'بس ٹریول ایڈمن',
    'nav.admin': 'سپر ایڈمن',
    'common.login': 'لاگ ان',
    'common.register': 'رجسٹر کریں',
    'common.logout': 'لاگ آؤٹ',
    'common.username': 'صارف نام',
    'common.password': 'پاس ورڈ',
    'common.profile': 'پروفائل',
    'passenger.tab.food': 'کھانا',
    'passenger.tab.route': 'روٹ',
    'passenger.tab.cart': 'کارٹ',
    'passenger.tab.orders': 'آرڈرز',
    'passenger.tab.tickets': 'ٹکٹ',
    'passenger.tab.profile': 'پروفائل',
    'admin.passengers': 'مسافر',
  },
  sa: {
    'nav.passenger': 'यात्री अनुप्रयोगः',
    'nav.driver': 'चालक अनुप्रयोगः',
    'nav.restaurant': 'भोजनालय प्रबन्धकः',
    'nav.travels': 'बसयान प्रबन्धकः',
    'nav.admin': 'मुख्य प्रबन्धकः',
    'common.login': 'प्रवेशः',
    'common.register': 'पञ्जीकरणम्',
    'common.profile': 'परिचयः',
  },
  kok: {
    'nav.passenger': 'प्रवासी अ‍ॅप',
    'nav.driver': 'चालक अ‍ॅप',
    'nav.restaurant': 'हॉटेल अ‍ॅडमिन',
    'nav.travels': 'बस ट्रॅव्हल अ‍ॅडमिन',
    'nav.admin': 'सुपर अ‍ॅडमिन',
    'common.login': 'लॉगिन',
    'common.register': 'नोंदणी',
  },
  mni: {
    'nav.passenger': 'প্যাসেঞ্জর এপ',
    'nav.driver': 'ড্রাইভর এপ',
    'nav.restaurant': 'রেষ্টোরেণ্ট এদমিন',
    'nav.travels': 'বস ত্রাভেল এদমিন',
    'nav.admin': 'সুপর এদমিন',
    'common.login': 'লোগইন',
    'common.register': 'রেজিষ্টর',
  },
  ne: {
    'nav.passenger': 'यात्रु एप',
    'nav.driver': 'चालक एप',
    'nav.restaurant': 'रेस्टुरेन्ट एडमिन',
    'nav.travels': 'बस ट्राभल एडमिन',
    'nav.admin': 'सुपर एडमिन',
    'common.login': 'लग-इन',
    'common.register': 'दर्ता गर्नुहोस्',
    'common.profile': 'प्रोफाइल',
  },
  brx: {
    'nav.passenger': 'हान्थाय एप',
    'nav.driver': 'सालायगिरि एप',
    'nav.restaurant': 'जाखाम नखर एडमिन',
    'nav.travels': 'बास ट्रेभेल एडमिन',
    'nav.admin': 'सुपार एडमिन',
    'common.login': 'लगइन',
    'common.register': 'मुं थिसननाय',
  },
  doi: {
    'nav.passenger': 'यात्री ऐप',
    'nav.driver': 'ड्राइवर ऐप',
    'nav.restaurant': 'रेस्तरां एडमिन',
    'nav.travels': 'बस ट्रैवल एडमिन',
    'nav.admin': 'सुपर एडमिन',
    'common.login': 'लागिन',
    'common.register': 'रजिस्टर',
  },
  mai: {
    'nav.passenger': 'यात्री ऐप',
    'nav.driver': 'ड्राइवर ऐप',
    'nav.restaurant': 'रेस्टोरेंट एडमिन',
    'nav.travels': 'बस ट्रैवल एडमिन',
    'nav.admin': 'सुपर एडमिन',
    'common.login': 'लॉगिन',
    'common.register': 'पंजीकरण',
  },
  sat: {
    'nav.passenger': 'ᱥᱟᱸᱜᱷᱟᱨᱤᱭᱟᱹ ᱮᱯ',
    'nav.driver': 'ᱰᱨᱟᱭᱵᱷᱚᱨ ᱮᱯ',
    'nav.restaurant': 'ᱨᱮᱥᱴᱚᱨᱮᱱᱴ ᱮᱰᱢᱤᱱ',
    'nav.travels': 'ᱵᱟᱥ ᱴᱨᱟᱵᱷᱮᱞ ᱮᱰᱢᱤᱱ',
    'nav.admin': 'ᱥᱩᱯᱟᱨ ᱮᱰᱢᱤᱱ',
    'common.login': 'ᱞᱚᱜᱤᱱ',
    'common.register': 'ᱨᱮᱡᱤᱥᱴᱟᱨ',
  },
  ks: {
    'nav.passenger': 'مسافر ایپ',
    'nav.driver': 'ڈرایور ایپ',
    'nav.restaurant': 'ریسٹورنٹ ایڈمن',
    'nav.travels': 'بس ٹریول ایڈمن',
    'nav.admin': 'سپر ایڈمن',
    'common.login': 'لاگ ان',
    'common.register': 'رجسٹر',
  },
  sd: {
    'nav.passenger': 'مسافر ايپ',
    'nav.driver': 'ڊرائيور ايپ',
    'nav.restaurant': 'ريسٽورينٽ ايڊمن',
    'nav.travels': 'بس ٽريول ايڊمن',
    'nav.admin': 'سپر ايڊمن',
    'common.login': 'لاگ ان',
    'common.register': 'رجسٽر',
  },
};

interface LanguageContextValue {
  language: IndianLanguageCode;
  setLanguage: (code: IndianLanguageCode) => void;
  currentLanguageOption: IndianLanguageOption;
  t: (key: TranslationKey, fallback?: string) => string;
  tr: (text: string) => string;
  td: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  currentLanguageOption: INDIAN_LANGUAGES[0],
  t: (key, fallback) => fallback || EN_STRINGS[key],
  tr: (text) => text,
  td: (text) => text,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<IndianLanguageCode>('en');

  const currentLanguageOption = useMemo(
    () => INDIAN_LANGUAGES.find((l) => l.code === language) || INDIAN_LANGUAGES[0],
    [language]
  );

  const t = useMemo(() => {
    const map = TRANSLATIONS[language] || {};
    return (key: TranslationKey, fallback?: string) =>
      map[key] || EN_STRINGS[key] || translateAnyText(fallback || key, language);
  }, [language]);

  const tr = useMemo(() => {
    return (text: string) => translateAnyText(text, language);
  }, [language]);

  const td = tr;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguageOption, t, tr, td }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, currentLanguageOption, tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDIAN_LANGUAGES;
    return INDIAN_LANGUAGES.filter(
      (l) =>
        l.englishName.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Select Indian language"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 font-semibold transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="max-w-[76px] sm:max-w-[110px] truncate">
          {currentLanguageOption.nativeName}
        </span>
        <ChevronDown className="w-3 h-3 text-emerald-700 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-72 bg-white border border-emerald-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2.5 border-b border-slate-100 bg-emerald-50/40 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-950 flex items-center justify-between">
                <span>{tr('All 23 Languages of India')}</span>
                <span className="text-[10px] font-mono text-emerald-700">{tr('23 supported')}</span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr('Search Hindi, தமிழ், తెలుగు, বাংলা...')}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 p-1">
              {filtered.map((lang) => {
                const selected = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors ${
                      selected
                        ? 'bg-emerald-900 text-white'
                        : 'hover:bg-emerald-50/80 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        {lang.nativeName} · <span className="font-medium">{lang.englishName}</span>
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          selected ? 'text-emerald-200' : 'text-slate-500'
                        }`}
                      >
                        {lang.region} ({lang.code.toUpperCase()})
                      </div>
                    </div>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-300" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-5 text-center text-xs text-slate-400">{tr('No matching language')}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
