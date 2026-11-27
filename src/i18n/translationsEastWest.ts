import type { IndianLanguageCode } from '../types/platform';
import { CORE_TRANSLATIONS, type DictMap } from './translationsCore';

export const EXTRA_TRANSLATIONS: Record<
  Exclude<IndianLanguageCode, 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'mr'>,
  DictMap
> = {
  bn: {
    'Passenger App': 'যাত্রী অ্যাপ',
    'Driver App': 'ড্রাইভার অ্যাপ',
    'Restaurant Admin': 'রেস্তোরাঁ অ্যাডমিন',
    'Bus Travel Admin': 'বাস ট্রাভেল অ্যাডমিন',
    'Super Admin': 'সুপার অ্যাডমিন',
    'App': 'অ্যাপ',
    'Web': 'ওয়েব',
    'Sign In': 'লগইন',
    'Sign Out': 'লগআউট',
    'Register': 'নিবন্ধন করুন',
    'Reset Demo': 'ডেমো রিসেট',
    'Demo Video': 'ডেমো ভিডিও',
    'App Guide Tour': 'অ্যাপ গাইড ট্যুর',
    'Guide Tour': 'গাইড ট্যুর',
    'CONTACT INFORMATION': 'যোগাযোগের তথ্য',
    'Email': 'ইমেইল',
    'Phone': 'ফোন',
    'Save Changes': 'পরিবর্তন সংরক্ষণ করুন',
    'Food': 'খাবার',
    'Route': 'রুট',
    'Cart': 'কার্ট',
    'Orders': 'অর্ডার',
    'Tickets': 'টিকিট',
    'Profile': 'প্রোফাইল',
    'Highway Restaurants on Route': 'রুটের হাইওয়ে রেস্তোরাঁ',
    'Veg Only': 'শুধু নিরামিষ',
    'Veg': 'নিরামিষ',
    'Non-Veg': 'আমিষ',
    'Add': 'যোগ করুন',
    'Open Now': 'এখন খোলা',
    'Open 24 Hours': '২৪ ঘণ্টা খোলা',
    'Closed Today': 'আজ বন্ধ / ছুটি',
    'Closed Today / On Leave': 'আজ বন্ধ / ছুটিতে',
    'Kitchen Paused': 'কিচেন সাময়িক বন্ধ',
    'Takeaway': 'টেকঅ্যাওয়ে',
    'Dine-In': 'ডাইন-ইন',
    'Pay & Place Order': 'পেমেন্ট করে অর্ডার দিন',
    'Book Bus Tickets': 'বাস টিকিট বুক করুন',
    'My Tickets': 'আমার টিকিট',
    'A2B Highway Plaza': 'এ২বি হাইওয়ে প্লাজা',
    'Temple City Annapoorna': 'টেম্পল সিটি অন্নপূর্ণা',
    'Grand Chola Kitchen': 'গ্র্যান্ড চোল কিচেন',
    'Kaveri Spice Courtyard': 'কাবেরী স্পাইস কোর্টইয়ার্ড',
    'Saravana Highway Inn': 'শরবণা হাইওয়ে ইন',
    'KPN Travels & Logistics': 'কেপিএন ট্রাভেলস ও লজিস্টিক্স',
    'SRS Luxury Coaches': 'এসআরএস লাক্সারি কোচেস',
    'Parveen Express Lines': 'পারভীন এক্সপ্রেস লাইনস',
    'Chennai → Madurai (NH-45)': 'চেন্নাই → মাদুরাই (NH-45)',
    'Bengaluru → Salem (NH-44)': 'বেঙ্গালুরু → সালেম (NH-44)',
    'Chennai': 'চেন্নাই',
    'Villupuram': 'ভিল্লুপুরম',
    'Tiruchirappalli': 'তিরুচিরাপল্লি',
    'Madurai': 'মাদুরাই',
    'Bengaluru': 'বেঙ্গালুরু',
    'Hosur': 'হোসুর',
    'Krishnagiri': 'কৃষ্ণগিরি',
    'Salem': 'সালেম',
    'South Indian Classics': 'দক্ষিণ ভারতীয় খাবার',
    'Beverages & Quick Bites': 'পানীয় ও জলখাবার',
    'Executive Meals': 'এক্সিকিউটিভ থালি',
    'Rice & Biryani': 'ভাত ও বিরিয়ানি',
  },
  gu: {
    'Passenger App': 'મુસાફર એપ',
    'Driver App': 'ડ્રાઈવર એપ',
    'Restaurant Admin': 'રેસ્ટોરન્ટ એડમિન',
    'Bus Travel Admin': 'બસ ટ્રાવેલ એડમિન',
    'Super Admin': 'સુપર એડમિન',
    'App': 'એપ',
    'Web': 'વેબ',
    'Sign In': 'લોગિન',
    'Sign Out': 'લોગઆઉટ',
    'Register': 'નોંધણી કરો',
    'Reset Demo': 'ડેમો રીસેટ',
    'Demo Video': 'ડેમો વિડિઓ',
    'App Guide Tour': 'એપ ગાઇડ ટૂર',
    'Guide Tour': 'ગાઇડ ટૂર',
    'CONTACT INFORMATION': 'સંપર્ક માહિતી',
    'Email': 'ઇમેઇલ',
    'Phone': 'ફોન',
    'Save Changes': 'ફેરફારો સાચવો',
    'Food': 'ભોજન',
    'Route': 'રૂટ',
    'Cart': 'કાર્ટ',
    'Orders': 'ઓર્ડર',
    'Tickets': 'ટિકિટ',
    'Profile': 'પ્રોફાઇલ',
    'Highway Restaurants on Route': 'રૂટ પરની હાઇવે રેસ્ટોરન્ટ્સ',
    'Veg Only': 'માત્ર શાકાહારી',
    'Veg': 'શાકાહારી',
    'Non-Veg': 'માંસાહારી',
    'Add': 'ઉમેરો',
    'Open Now': 'હવે ખુલ્લું છે',
    'Closed Today': 'આજે બંધ / રજા',
    'Closed Today / On Leave': 'આજે બંધ / રજા પર',
    'A2B Highway Plaza': 'એ2બી હાઇવે પ્લાઝા',
    'Temple City Annapoorna': 'ટેમ્પલ સિટી અન્નપૂર્ણા',
    'Grand Chola Kitchen': 'ગ્રાન્ડ ચોલા કિચન',
    'Kaveri Spice Courtyard': 'કાવેરી સ્પાઇસ કોર્ટયાર્ડ',
    'Saravana Highway Inn': 'સરવણા હાઇવે ઇન',
    'Chennai → Madurai (NH-45)': 'ચેન્નાઈ → મદુરાઈ (NH-45)',
    'Bengaluru → Salem (NH-44)': 'બેંગલુરુ → સાલેમ (NH-44)',
    'Chennai': 'ચેન્નાઈ',
    'Madurai': 'મદુરાઈ',
    'Bengaluru': 'બેંગલુરુ',
    'Salem': 'સાલેમ',
  },
  pa: {
    'Passenger App': 'ਯਾਤਰੀ ਐਪ',
    'Driver App': 'ਡਰਾਈਵਰ ਐਪ',
    'Restaurant Admin': 'ਰੈਸਟੋਰੈਂਟ ਐਡਮਿਨ',
    'Bus Travel Admin': 'ਬੱਸ ਟਰੈਵਲ ਐਡਮਿਨ',
    'Super Admin': 'ਸੁਪਰ ਐਡਮਿਨ',
    'App': 'ਐਪ',
    'Web': 'ਵੈੱਬ',
    'Sign In': 'ਲਾਗਇਨ',
    'Sign Out': 'ਲਾਗਆਉਟ',
    'Register': 'ਰਜਿਸਟਰ ਕਰੋ',
    'Reset Demo': 'ਡੈਮੋ ਰੀਸੈਟ',
    'Demo Video': 'ਡੈਮੋ ਵੀਡੀਓ',
    'App Guide Tour': 'ਐਪ ਗਾਈਡ ਟੂਰ',
    'Guide Tour': 'ਗਾਈਡ ਟੂਰ',
    'CONTACT INFORMATION': 'ਸੰਪਰਕ ਜਾਣਕਾਰੀ',
    'Email': 'ਈਮੇਲ',
    'Phone': 'ਫ਼ੋਨ',
    'Save Changes': 'ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੋ',
    'Food': 'ਭੋਜਨ',
    'Route': 'ਰੂਟ',
    'Cart': 'ਕਾਰਟ',
    'Orders': 'ਆਰਡਰ',
    'Tickets': 'ਟਿਕਟ',
    'Profile': 'ਪ੍ਰੋਫਾਈਲ',
    'Highway Restaurants on Route': 'ਰੂਟ ਤੇ ਹਾਈਵੇ ਰੈਸਟੋਰੈਂਟ',
    'Veg Only': 'ਸਿਰਫ਼ ਸ਼ਾਕਾਹਾਰੀ',
    'Veg': 'ਸ਼ਾਕਾਹਾਰੀ',
    'Non-Veg': 'ਮਾਸਾਹਾਰੀ',
    'Add': 'ਸ਼ਾਮਲ ਕਰੋ',
    'Open Now': 'ਹੁਣ ਖੁੱਲ੍ਹਾ ਹੈ',
    'Closed Today': 'ਅੱਜ ਬੰਦ / ਛੁੱਟੀ',
    'Closed Today / On Leave': 'ਅੱਜ ਬੰਦ / ਛੁੱਟੀ ਤੇ',
    'A2B Highway Plaza': 'ਏ2ਬੀ ਹਾਈਵੇ ਪਲਾਜ਼ਾ',
    'Temple City Annapoorna': 'ਟੈਂਪਲ ਸਿਟੀ ਅੰਨਪੂਰਨਾ',
    'Grand Chola Kitchen': 'ਗ੍ਰੈਂਡ ਚੋਲਾ ਕਿਚਨ',
    'Kaveri Spice Courtyard': 'ਕਾਵੇਰੀ ਸਪਾਈਸ ਕੋਰਟਯਾਰਡ',
    'Saravana Highway Inn': 'ਸਰਵਣਾ ਹਾਈਵੇ ਇਨ',
    'Chennai → Madurai (NH-45)': 'ਚੇਨਈ → ਮਦੁਰਾਈ (NH-45)',
    'Bengaluru → Salem (NH-44)': 'ਬੈਂਗਲੁਰੂ → ਸਲੇਮ (NH-44)',
  },
  or: {
    'Passenger App': 'ଯାତ୍ରୀ ଆପ୍',
    'Driver App': 'ଡ୍ରାଇଭର ଆପ୍',
    'Restaurant Admin': 'ରେଷ୍ଟୁରାଣ୍ଟ ଆଡମିନ୍',
    'Bus Travel Admin': 'ବସ୍ ଟ୍ରାଭେଲ୍ ଆଡମିନ୍',
    'Super Admin': 'ସୁପର ଆଡମିନ୍',
    'App': 'ଆପ୍',
    'Web': 'ୱେବ୍',
    'Sign In': 'ଲଗଇନ୍',
    'Sign Out': 'ଲଗଆଉଟ୍',
    'Register': 'ପଞ୍ଜୀକରଣ',
    'Reset Demo': 'ଡେମୋ ରିସେଟ୍',
    'Demo Video': 'ଡେମୋ ଭିଡିଓ',
    'Guide Tour': 'ଗାଇଡ୍ ଟୁର୍',
    'Food': 'ଖାଦ୍ୟ',
    'Route': 'ରୁଟ୍',
    'Cart': 'କାର୍ଟ',
    'Orders': 'ଅର୍ଡର',
    'Tickets': 'ଟିକେଟ୍',
    'Profile': 'ପ୍ରୋଫାଇଲ୍',
    'Veg Only': 'କେବଳ ନିରାମିଷ',
    'Add': 'ଯୋଗ କରନ୍ତୁ',
    'Closed Today': 'ଆଜି ବନ୍ଦ / ଛୁଟି',
  },
  as: {
    'Passenger App': 'যাত্ৰী এপ',
    'Driver App': 'ড্ৰাইভাৰ এপ',
    'Restaurant Admin': 'ৰেষ্টুৰেণ্ট এডমিন',
    'Bus Travel Admin': 'বাছ ট্ৰেভেল এডমিন',
    'Super Admin': 'ছুপাৰ এডমিন',
    'App': 'এপ',
    'Web': 'ৱেব',
    'Sign In': 'লগইন',
    'Sign Out': 'লগআউট',
    'Register': 'পঞ্জীয়ন',
    'Food': 'খাদ্য',
    'Route': 'ৰুট',
    'Cart': 'কাৰ্ট',
    'Orders': 'অৰ্ডাৰ',
    'Tickets': 'টিকট',
    'Profile': 'প্ৰফাইল',
    'Closed Today': 'আজি বন্ধ / ছুটী',
  },
  ur: {
    'Passenger App': 'مسافر ایپ',
    'Driver App': 'ڈرائیور ایپ',
    'Restaurant Admin': 'ریسٹورنٹ ایڈمن',
    'Bus Travel Admin': 'بس ٹریول ایڈمن',
    'Super Admin': 'سپر ایڈمن',
    'App': 'ایپ',
    'Web': 'ویب',
    'Sign In': 'لاگ ان',
    'Sign Out': 'لاگ آؤٹ',
    'Register': 'رجسٹر کریں',
    'Reset Demo': 'ڈیمو ری سیٹ',
    'Demo Video': 'ڈیمو ویڈیو',
    'App Guide Tour': 'ایپ گائیڈ ٹور',
    'Guide Tour': 'گائیڈ ٹور',
    'CONTACT INFORMATION': 'رابطہ کی معلومات',
    'Email': 'ای میل',
    'Phone': 'فون',
    'Save Changes': 'تبدیلیاں محفوظ کریں',
    'Food': 'کھانا',
    'Route': 'روٹ',
    'Cart': 'کارٹ',
    'Orders': 'آرڈرز',
    'Tickets': 'ٹکٹ',
    'Profile': 'پروفائل',
    'Highway Restaurants on Route': 'روٹ پر ہائی وے ریسٹورنٹس',
    'Veg Only': 'صرف سبزی خور',
    'Veg': 'سبزی خور',
    'Non-Veg': 'گوشت',
    'Add': 'شامل کریں',
    'Open Now': 'ابھی کھلا ہے',
    'Closed Today': 'آج بند / چھٹی',
    'Closed Today / On Leave': 'آج بند / چھٹی پر',
    'A2B Highway Plaza': 'اے ٹو بی ہائی وے پلازہ',
    'Temple City Annapoorna': 'ٹیمپل سٹی اناپورنا',
    'Grand Chola Kitchen': 'گرینڈ چولا کچن',
    'Kaveri Spice Courtyard': 'کاویری اسپائس کورٹ یارڈ',
    'Saravana Highway Inn': 'سرونا ہائی وے ان',
    'Chennai → Madurai (NH-45)': 'چنئی → مدورائی (NH-45)',
    'Bengaluru → Salem (NH-44)': 'بنگلورو → سیلم (NH-44)',
  },
  sa: {
    'Passenger App': 'यात्री अनुप्रयोगः',
    'Driver App': 'चालक अनुप्रयोगः',
    'Restaurant Admin': 'भोजनालय प्रबन्धकः',
    'Bus Travel Admin': 'बसयान प्रबन्धकः',
    'Super Admin': 'मुख्य प्रबन्धकः',
    'Food': 'भोजनम्',
    'Route': 'मार्गः',
    'Cart': 'पिटकः',
    'Orders': 'आदेशाः',
    'Tickets': 'टिकटम्',
    'Profile': 'परिचयः',
  },
  kok: {
    'Passenger App': 'प्रवासी अ‍ॅप',
    'Driver App': 'चालक अ‍ॅप',
    'Restaurant Admin': 'हॉटेल अ‍ॅडमिन',
    'Bus Travel Admin': 'बस ट्रॅव्हल अ‍ॅडमिन',
    'Super Admin': 'सुपर अ‍ॅडमिन',
  },
  mni: {
    'Passenger App': 'প্যাসেঞ্জর এপ',
    'Driver App': 'ড্রাইভর এপ',
    'Restaurant Admin': 'রেষ্টোরেণ্ট এদমিন',
    'Bus Travel Admin': 'বস ত্রাভেল এদমিন',
    'Super Admin': 'সুপর এদমিন',
  },
  ne: {
    'Passenger App': 'यात्रु एप',
    'Driver App': 'चालक एप',
    'Restaurant Admin': 'रेस्टुरेन्ट एडमिन',
    'Bus Travel Admin': 'बस ट्राभल एडमिन',
    'Super Admin': 'सुपर एडमिन',
  },
  brx: {
    'Passenger App': 'हान्थाय एप',
    'Driver App': 'सालायगिरि एप',
    'Restaurant Admin': 'जाखाम नखर एडमिन',
    'Bus Travel Admin': 'बास ट्रेभेल एडमिन',
    'Super Admin': 'सुपार एडमिन',
  },
  doi: {
    'Passenger App': 'यात्री ऐप',
    'Driver App': 'ड्राइवर ऐप',
    'Restaurant Admin': 'रेस्तरां एडमिन',
    'Bus Travel Admin': 'बस ट्रैवल एडमिन',
    'Super Admin': 'सुपर एडमिन',
  },
  mai: {
    'Passenger App': 'यात्री ऐप',
    'Driver App': 'ड्राइवर ऐप',
    'Restaurant Admin': 'रेस्टोरेंट एडमिन',
    'Bus Travel Admin': 'बस ट्रैवल एडमिन',
    'Super Admin': 'सुपर एडमिन',
  },
  sat: {
    'Passenger App': 'ᱥᱟᱸᱜᱷᱟᱨᱤᱭᱟᱹ ᱮᱯ',
    'Driver App': 'ᱰᱨᱟᱭᱵᱷᱚᱨ ᱮᱯ',
    'Restaurant Admin': 'ᱨᱮᱥᱴᱚᱨᱮᱱᱴ ᱮᱰᱢᱤᱱ',
    'Bus Travel Admin': 'ᱵᱟᱥ ᱴᱨᱟᱵᱷᱮᱞ ᱮᱰᱢᱤᱱ',
    'Super Admin': 'ᱥᱩᱯᱟᱨ ᱮᱰᱢᱤᱱ',
    'Sign In': 'ᱞᱚᱜᱤᱱ',
    'Register': 'ᱨᱮᱡᱤᱥᱴᱟᱨ',
  },
  ks: {
    'Passenger App': 'مسافر ایپ',
    'Driver App': 'ڈرایور ایپ',
    'Restaurant Admin': 'ریسٹورنٹ ایڈمن',
    'Bus Travel Admin': 'بس ٹریول ایڈمن',
    'Super Admin': 'سپر ایڈمن',
  },
  sd: {
    'Passenger App': 'مسافر ايپ',
    'Driver App': 'ڊرائيور ايپ',
    'Restaurant Admin': 'ريسٽورينٽ ايڊمن',
    'Bus Travel Admin': 'بس ٽريول ايڊمن',
    'Super Admin': 'سپر ايڊمن',
  },
};

const FALLBACK_CHAIN: Record<IndianLanguageCode, IndianLanguageCode[]> = {
  en: [],
  ta: ['ta'],
  hi: ['hi'],
  te: ['te', 'hi'],
  kn: ['kn', 'hi'],
  ml: ['ml', 'hi'],
  mr: ['mr', 'hi'],
  bn: ['bn', 'hi'],
  gu: ['gu', 'hi'],
  pa: ['pa', 'hi'],
  or: ['or', 'bn', 'hi'],
  as: ['as', 'bn', 'hi'],
  ur: ['ur', 'hi'],
  sa: ['sa', 'hi'],
  kok: ['kok', 'mr', 'hi'],
  mni: ['mni', 'bn', 'hi'],
  ne: ['ne', 'hi'],
  brx: ['brx', 'hi'],
  doi: ['doi', 'hi'],
  mai: ['mai', 'hi'],
  sat: ['sat', 'hi'],
  ks: ['ks', 'ur', 'hi'],
  sd: ['sd', 'ur', 'hi'],
};

function getDict(lang: IndianLanguageCode): DictMap[] {
  const chain = FALLBACK_CHAIN[lang] || ['hi'];
  return chain.map((code) => {
    if (code in CORE_TRANSLATIONS) {
      return CORE_TRANSLATIONS[code as keyof typeof CORE_TRANSLATIONS];
    }
    if (code in EXTRA_TRANSLATIONS) {
      return EXTRA_TRANSLATIONS[code as keyof typeof EXTRA_TRANSLATIONS];
    }
    return {};
  });
}

function lookupExact(text: string, dicts: DictMap[]): string | undefined {
  for (const dict of dicts) {
    if (dict[text]) return dict[text];
  }
  return undefined;
}

// Keep BusBite logo wordmark, vehicle reg numbers (TN 45 AB 1234), IDs (ORD-..., RS-..., PNR...), emails, URLs, numbers untouched
const PROTECTED_TOKEN_RE = /^(BusBite|NH-?\d+|[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{3,4}|(RS|ORD|PAY|BB|PNR|HYG|RC|PERMIT|INS)-[A-Z0-9-]+|@[a-z0-9._-]+)$/i;

export function translateAnyText(input: string, lang: IndianLanguageCode): string {
  if (!input || lang === 'en') return input;
  const trimmed = input.trim();
  if (!trimmed || PROTECTED_TOKEN_RE.test(trimmed)) return input;

  const dicts = getDict(lang);
  const direct = lookupExact(trimmed, dicts);
  if (direct) return direct;

  // Preserve leading/trailing whitespace and test known patterns
  let out = trimmed;

  // Common unit & phrase replacements across composed strings
  const unitRules: [RegExp, Record<string, string>][] = [
    [
      /\b(\d+)\s*m\s+prep\b/gi,
      {
        ta: '$1 நிமி தயாரிப்பு',
        hi: '$1 मि. तैयारी',
        te: '$1 నిమి తయారీ',
        kn: '$1 ನಿಮಿ ತಯಾರಿ',
        ml: '$1 മി. തയ്യാറെടുപ്പ്',
        mr: '$1 मि. तयारी',
        bn: '$1 মি. প্রস্তুতি',
        gu: '$1 મિનિટ તૈયારી',
        pa: '$1 ਮਿੰਟ ਤਿਆਰੀ',
        ur: '$1 منٹ تیاری',
      },
    ],
    [
      /\b(\d+(?:\.\d+)?)\s*mins?\s+ETA\b/gi,
      {
        ta: '$1 நிமிடங்களில்',
        hi: '$1 मिनट ETA',
        te: '$1 నిమి ETA',
        kn: '$1 ನಿಮಿ ETA',
        ml: '$1 മി. ETA',
        mr: '$1 मि. ETA',
        bn: '$1 মি. ETA',
      },
    ],
    [
      /\b(\d+)%\s*OFF\b/gi,
      {
        ta: '$1% தள்ளுபடி',
        hi: '$1% छूट',
        te: '$1% తగ్గింపు',
        kn: '$1% ರಿಯಾಯಿತಿ',
        ml: '$1% കിഴിവ്',
        mr: '$1% सूट',
        bn: '$1% ছাড়',
        gu: '$1% છૂટ',
        pa: '$1% ਛੋਟ',
        ur: '$1% رعایت',
      },
    ],
    [
      /\b(\d+)\s+orders?\b/gi,
      {
        ta: '$1 ஆர்டர்கள்',
        hi: '$1 ऑर्डर',
        te: '$1 ఆర్డర్లు',
        kn: '$1 ಆರ್ಡರ್‌ಗಳು',
        ml: '$1 ഓർഡറുകൾ',
        mr: '$1 ऑर्डर',
        bn: '$1 অর্ডার',
      },
    ],
    [
      /\b(\d+)\s+tickets?\b/gi,
      {
        ta: '$1 டிக்கெட்கள்',
        hi: '$1 टिकट',
        te: '$1 టికెట్లు',
        kn: '$1 ಟಿಕೆಟ್‌ಗಳು',
        ml: '$1 ടിക്കറ്റുകൾ',
        mr: '$1 तिकिटे',
        bn: '$1 টিকিট',
      },
    ],
    [
      /\b(\d+)\s+food\b/gi,
      {
        ta: '$1 உணவு',
        hi: '$1 भोजन',
        te: '$1 ఆహారం',
        kn: '$1 ಆಹಾರ',
        ml: '$1 ഭക്ഷണം',
        mr: '$1 जेवण',
        bn: '$1 খাবার',
      },
    ],
    [
      /\b(\d+)\s+seats?\b/gi,
      {
        ta: '$1 இருக்கைகள்',
        hi: '$1 सीटें',
        te: '$1 సీట్లు',
        kn: '$1 ಸೀಟುಗಳು',
        ml: '$1 സീറ്റുകൾ',
        mr: '$1 सीट्स',
        bn: '$1 আসন',
      },
    ],
    [
      /\b(\d+)\s*km\/h\b/gi,
      {
        ta: '$1 கி.மீ/மணி',
        hi: '$1 किमी/घं',
        te: '$1 కి.మీ/గం',
        kn: '$1 ಕಿ.ಮೀ/ಗಂ',
        ml: '$1 കി.മീ/മ.',
        mr: '$1 किमी/ता',
        bn: '$1 কিমি/ঘণ্টা',
      },
    ],
    [
      /\b(\d+(?:\.\d+)?)\s*km\b/gi,
      {
        ta: '$1 கி.மீ',
        hi: '$1 किमी',
        te: '$1 కి.మీ',
        kn: '$1 ಕಿ.மீ',
        ml: '$1 കി.മീ',
        mr: '$1 किमी',
        bn: '$1 কিমি',
      },
    ],
    [
      /\bSeat\s+([A-Z0-9-]+)\b/gi,
      {
        ta: 'இருக்கை $1',
        hi: 'सीट $1',
        te: 'సీటు $1',
        kn: 'ಸೀಟು $1',
        ml: 'സീറ്റ് $1',
        mr: 'सीट $1',
        bn: 'সিট $1',
      },
    ],
    [
      /\b([0-9]+)m\b/g,
      {
        ta: '$1நி',
        hi: '$1मि',
        te: '$1ని',
        kn: '$1ನಿ',
        ml: '$1മി',
      },
    ],
  ];

  // Segment replacement on " · " or " — " joined labels like "A2B Highway Plaza · Villupuram"
  if (out.includes(' · ')) {
    const parts = out.split(' · ').map((part) => translateAnyText(part, lang));
    return parts.join(' · ');
  }

  // Known composite headers like "Highway Restaurants on Route (3)"
  const parenMatch = out.match(/^(.*?)\s*\((\d+)\)$/);
  if (parenMatch) {
    const base = lookupExact(parenMatch[1].trim(), dicts);
    if (base) return `${base} (${parenMatch[2]})`;
  }

  // Known suffix-value phrases: safe word-boundary replacement for multi-char domain phrases
  for (const dict of dicts) {
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (k.length < 4) continue;
      if (out === k) return dict[k];
      if (!/^BusBite/i.test(k) && out.includes(k)) {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'g');
        out = out.replace(re, dict[k]);
      }
    }
  }

  const primaryChain = FALLBACK_CHAIN[lang] || ['hi'];
  for (const [re, replMap] of unitRules) {
    let chosen: string | undefined;
    for (const code of primaryChain) {
      if (replMap[code]) {
        chosen = replMap[code];
        break;
      }
    }
    if (chosen) {
      out = out.replace(re, chosen);
    }
  }

  return out;
}
