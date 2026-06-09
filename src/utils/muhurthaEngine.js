import { OfflineEphemeris, RASIS } from './ephemerisEngine';

// Hindi names for the 8 Prahars of day and night
export const PRAHAR_NAMES = [
  "पूर्वान्ह (Purvanha)", 
  "मध्यान्ह (Madhyanha)", 
  "अपराह्न (Aparanha)", 
  "सायंकाल (Sayankal)", 
  "प्रदोष (Pradosh)", 
  "निशीथ (Nishith)", 
  "त्रियामा (Triyama)", 
  "उषा (Usha)"
];

// Weekday Hindi names
export const VEDIC_WEEKDAYS = [
  "रविवार (Ravivara)",
  "सोमवार (Somavara)",
  "मंगलवार (Mangalavara)",
  "बुधवार (Budhavara)",
  "गुरुवार (Guruvara)",
  "शुक्रवार (Shukravara)",
  "शनिवार (Shanivara)"
];

// Planetary symbols and names for Horas
export const PLANET_RULERS = {
  Sun: { name: "Sun", symbol: "☉", quality: "Aggressive/Focus" },
  Moon: { name: "Moon", symbol: "☽", quality: "Gentle/Social" },
  Mars: { name: "Mars", symbol: "♂", quality: "Action/Fierce" },
  Mercury: { name: "Mercury", symbol: "☿", quality: "Intellect/Trade" },
  Jupiter: { name: "Jupiter", symbol: "♃", quality: "Wisdom/Highly Auspicious" },
  Venus: { name: "Venus", symbol: "♀", quality: "Love/Comforts" },
  Saturn: { name: "Saturn", symbol: "♄", quality: "Slow/Discipline" }
};

// 30 Muhurtha names and properties
export const MUHURTHAS_INFO = [
  { name: "Rudra (रुद्र)", nature: "Inauspicious", ruler: "Shiva", desc: "Fierce energy. Good for demolition, competition, or surgery; bad for partnerships and travel." },
  { name: "Ahi (अहि)", nature: "Inauspicious", ruler: "Serpent", desc: "Venomous/binding. Good for strategic planning, bad for marriages, medical starts." },
  { name: "Mitra (मित्र)", nature: "Auspicious", ruler: "Friendship", desc: "Harmonious. Favorable for partnerships, agreement signings, and social gatherings." },
  { name: "Pitri (पितृ)", nature: "Inauspicious", ruler: "Ancestors", desc: "Ancestral connection. Ideal for offering rites and remembrance, bad for material starts." },
  { name: "Vasu (वसु)", nature: "Auspicious", ruler: "8 Vasus", desc: "Wealth & stability. Great for buying property, setting up offices, and construction." },
  { name: "Vara (वाराह)", nature: "Auspicious", ruler: "Vishnu (Varaha)", desc: "Strength. Good for overcoming challenges, initiating ventures, and journeys." },
  { name: "Vishvedeva (विश्वेदेवा)", nature: "Auspicious", ruler: "All Gods", desc: "Universal. Good for community efforts, social welfare projects, and agreements." },
  { name: "Abhijit (अभिजित)", nature: "Highly Auspicious", ruler: "Brahma", desc: "Mid-day power. Destroys all doshas. Best for initiating any new auspicious work." },
  { name: "Vidhi (विधि)", nature: "Auspicious", ruler: "Brahma/Creator", desc: "Creation. Good for starting studies, creative art, launching products, and design." },
  { name: "Satamukha (शतमुख)", nature: "Auspicious", ruler: "Vishvakarma", desc: "Versatile. Favorable for starting technical works, construction, or communication." },
  { name: "Puruhuta (पुरुहूत)", nature: "Inauspicious", ruler: "Indra", desc: "Assertive. Good for competitive pursuits, legal matters, but bad for wedding plans." },
  { name: "Vahni (वह्नि)", nature: "Inauspicious", ruler: "Fire", desc: "Fiery. Favorable for chemical experiments, machinery work, bad for peace missions." },
  { name: "Naktanchara (नक्तंचर)", nature: "Inauspicious", ruler: "Raksasa", desc: "Secretive. Good for occult research, defense work, bad for transparent activities." },
  { name: "Varuna (वरुण)", nature: "Auspicious", ruler: "Water God", desc: "Healing. Good for health treatments, signing long-term water/shipping contracts." },
  { name: "Aryaman (अर्यमन्)", nature: "Auspicious", ruler: "Sun/Ancestors", desc: "Supportive. Favorable for house-warming, marriage, and family events." },
  
  // Night Muhurthas
  { name: "Girish (गिरीश)", nature: "Auspicious", ruler: "Shiva", desc: "Quiet power. Ideal for meditation, spiritual retreats, and peaceful planning." },
  { name: "Ajapad (अजपाद)", nature: "Inauspicious", ruler: "Rudra", desc: "Sudden energy. Good for breaking old habits, bad for financial investments." },
  { name: "Ahirbudhnya (अहिर्बुध्न्य)", nature: "Auspicious", ruler: "Water Dragon", desc: "Foundational. Good for starting foundation works, study, and research." },
  { name: "Pusa (पूषा)", nature: "Auspicious", ruler: "Nourisher", desc: "Nourishment. Great for travel, farming, culinary arts, and wellness programs." },
  { name: "Ashwini (अश्विनी)", nature: "Auspicious", ruler: "Ashwin Kumars", desc: "Speedy healing. Excellent for medical treatments, starting sports, and travel." },
  { name: "Yama (यम)", nature: "Inauspicious", ruler: "Yama", desc: "Restricting. Good for audit, corrections, ending habits; bad for happy celebrations." },
  { name: "Agni (अग्नि)", nature: "Inauspicious", ruler: "Agni", desc: "Heating. Good for technical work, cooking, baking; bad for starting partnerships." },
  { name: "Vidhata (विधाता)", nature: "Auspicious", ruler: "Savitar", desc: "Creative. Excellent for arts, crafts, styling, and writing." },
  { name: "Kanda (कण्ड)", nature: "Auspicious", ruler: "Chandra", desc: "Sustaining. Good for agricultural starts, buying crops, home decorating." },
  { name: "Aditi (अदिती)", nature: "Auspicious", ruler: "Aditi", desc: "Expansive. Favorable for learning new subjects, starting therapies, and travel." },
  { name: "Jiva (जीव)", nature: "Highly Auspicious", ruler: "Jupiter", desc: "Nectar. Highly favorable for study, spiritual activities, and family bonding." },
  { name: "Vishnu (विष्णु)", nature: "Highly Auspicious", ruler: "Vishnu", desc: "Protective. Excellent for starting any constructive, long-term project or house entry." },
  { name: "Dyumadgadyuti (द्युमद्गद्युति)", nature: "Auspicious", ruler: "Sun", desc: "Radiant. Good for writing letters, starting public campaigns, or marketing ideas." },
  { name: "Brahma (ब्रह्म)", nature: "Highly Auspicious", ruler: "Brahma", desc: "Mental creation. Best for study, writing books, designing systems, and planning." },
  { name: "Samudra (समुद्र)", nature: "Auspicious", ruler: "Ocean God", desc: "Vastness. Good for long journeys, trade agreements, and reconciliation talks." }
];

// Choghadiya qualities and colors
export const CHOGHADIYA_QUALITIES = {
  Amrit: { name: "Amrut (अमृत)", quality: "Best / Nectar", nature: "Auspicious", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
  Shubh: { name: "Shubh (शुभ)", quality: "Good / Auspicious", nature: "Auspicious", color: "bg-green-100 border-green-300 text-green-800" },
  Labh: { name: "Labh (लाभ)", quality: "Gain / Profit", nature: "Auspicious", color: "bg-cyan-100 border-cyan-300 text-cyan-800" },
  Chal: { name: "Chal (चल)", quality: "Neutral / Movable", nature: "Neutral", color: "bg-sky-50 border-sky-200 text-sky-700" },
  Udveg: { name: "Udveg (उद्वेग)", quality: "Bad / Anxiety", nature: "Inauspicious", color: "bg-orange-100 border-orange-300 text-orange-800" },
  Kaal: { name: "Kaal (काल)", quality: "Loss / Danger", nature: "Inauspicious", color: "bg-rose-100 border-rose-300 text-rose-800" },
  Rog: { name: "Rog (रोग)", quality: "Disease / Evil", nature: "Inauspicious", color: "bg-red-100 border-red-300 text-red-800" }
};

// Choghadiya sequences
const DAY_CHOGHADIAS = [
  ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"],  // Sunday
  ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"],  // Monday
  ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],    // Tuesday
  ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"],    // Wednesday
  ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh"],  // Thursday
  ["Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal"],    // Friday
  ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal"]     // Saturday
];

const NIGHT_CHOGHADIAS = [
  ["Shubh", "Chal", "Kaal", "Udveg", "Amrit", "Rog", "Labh", "Shubh"],  // Sunday
  ["Amrit", "Rog", "Labh", "Shubh", "Chal", "Kaal", "Udveg", "Amrit"],  // Monday
  ["Chal", "Kaal", "Udveg", "Amrit", "Rog", "Labh", "Shubh", "Chal"],    // Tuesday
  ["Rog", "Labh", "Shubh", "Chal", "Kaal", "Udveg", "Amrit", "Rog"],    // Wednesday
  ["Kaal", "Udveg", "Amrit", "Rog", "Labh", "Shubh", "Chal", "Kaal"],  // Thursday
  ["Labh", "Shubh", "Chal", "Kaal", "Udveg", "Amrit", "Rog", "Labh"],    // Friday
  ["Udveg", "Amrit", "Rog", "Labh", "Shubh", "Chal", "Kaal", "Udveg"]     // Saturday
];

// Durmuhurtha daytime indices (1-indexed converted to 0-indexed)
const DURMUHURTHA_INDICES = [
  [13],       // Sunday: 14th
  [8, 11],    // Monday: 9th, 12th
  [1, 6],     // Tuesday: 2nd, 7th
  [11],      // Wednesday: 12th
  [5],        // Thursday: 6th
  [3, 8],     // Friday: 4th, 9th
  [0]         // Saturday: 1st
];

// RAHU, GULIKA, YAMAGANDA daytime segment indices (0 to 7)
const RAHU_INDEX = [7, 1, 6, 4, 5, 3, 2];       // Sun, Mon, Tue, Wed, Thu, Fri, Sat
const GULIKA_INDEX = [6, 5, 4, 3, 2, 1, 0];
const YAMAGANDA_INDEX = [4, 3, 2, 1, 0, 6, 5];

const HORA_RULERS_SEQ = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const WEEKDAY_LORD_PLANET = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

/**
 * Calculates Vedic Sunrise, Sunset, Vedic Date, and Weekday.
 * A Vedic day starts at Sunrise. If the time is before Sunrise, the Vedic day is the previous calendar day.
 */
export function getVedicDayInfo(date, lat, lon, tzone) {
  const calSunTimes = OfflineEphemeris.getSunTimes(date, lat, lon, tzone);
  
  // Convert current time to hours
  const currentHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const sunriseHour = calSunTimes.sunriseFrac;
  
  let targetDate = new Date(date);
  let isBeforeSunrise = currentHour < sunriseHour;
  
  if (isBeforeSunrise) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  
  // Calculate sun times for the Vedic day
  const targetSunTimes = OfflineEphemeris.getSunTimes(targetDate, lat, lon, tzone);
  
  // Calculate next day's sun times to get the next Sunrise
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextSunTimes = OfflineEphemeris.getSunTimes(nextDate, lat, lon, tzone);
  
  const weekday = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  return {
    vedicDate: targetDate,
    weekday,
    sunriseFrac: targetSunTimes.sunriseFrac,
    sunsetFrac: targetSunTimes.sunsetFrac,
    noonFrac: targetSunTimes.noonFrac,
    nextSunriseFrac: nextSunTimes.sunriseFrac,
    sunriseStr: targetSunTimes.sunrise.timeStr,
    sunsetStr: targetSunTimes.sunset.timeStr,
    noonStr: targetSunTimes.noon.timeStr,
    isBeforeSunrise
  };
}

/**
 * Main function to calculate all Muhurtha, Choghadiya, Hora, and Lagna data for a given date/location.
 */
export function calculateMuhurthaData(date, lat, lon, tzone) {
  const info = getVedicDayInfo(date, lat, lon, tzone);
  
  const sunrise = info.sunriseFrac;
  const sunset = info.sunsetFrac;
  const nextSunrise = info.nextSunriseFrac;
  const weekday = info.weekday;
  
  const dayDuration = sunset - sunrise;
  const nightDuration = nextSunrise + 24 - sunset;
  
  // Helper to format fractional hours as hh:mm am/pm
  const formatHour = (h) => {
    let raw = h % 24;
    if (raw < 0) raw += 24;
    const hr = Math.floor(raw);
    const min = Math.floor((raw - hr) * 60);
    const displayHr = hr === 0 ? 12 : (hr > 12 ? hr - 12 : hr);
    const ampms = hr >= 12 ? "PM" : "AM";
    return `${displayHr}:${min.toString().padStart(2, '0')} ${ampms}`;
  };

  // ==========================================================================
  // 1. MUHURTHAS (30 total: 15 day, 15 night)
  // ==========================================================================
  const muhurthas = [];
  const mDayLen = dayDuration / 15;
  const mNightLen = nightDuration / 15;
  
  // Day Muhurthas
  for (let i = 0; i < 15; i++) {
    const start = sunrise + i * mDayLen;
    const end = start + mDayLen;
    muhurthas.push({
      index: i + 1,
      name: MUHURTHAS_INFO[i].name,
      nature: MUHURTHAS_INFO[i].nature,
      ruler: MUHURTHAS_INFO[i].ruler,
      desc: MUHURTHAS_INFO[i].desc,
      isNight: false,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }
  
  // Night Muhurthas
  for (let i = 0; i < 15; i++) {
    const start = sunset + i * mNightLen;
    const end = start + mNightLen;
    muhurthas.push({
      index: i + 16,
      name: MUHURTHAS_INFO[i + 15].name,
      nature: MUHURTHAS_INFO[i + 15].nature,
      ruler: MUHURTHAS_INFO[i + 15].ruler,
      desc: MUHURTHAS_INFO[i + 15].desc,
      isNight: true,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }

  // ==========================================================================
  // 2. CHOGHADIAS (8 day, 8 night)
  // ==========================================================================
  const choghadias = [];
  const cDayLen = dayDuration / 8;
  const cNightLen = nightDuration / 8;
  
  const daySequence = DAY_CHOGHADIAS[weekday];
  const nightSequence = NIGHT_CHOGHADIAS[weekday];
  
  // Day Choghadias
  for (let i = 0; i < 8; i++) {
    const start = sunrise + i * cDayLen;
    const end = start + cDayLen;
    const typeKey = daySequence[i];
    const q = CHOGHADIYA_QUALITIES[typeKey];
    choghadias.push({
      index: i + 1,
      name: q.name,
      quality: q.quality,
      nature: q.nature,
      color: q.color,
      isNight: false,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }
  
  // Night Choghadias
  for (let i = 0; i < 8; i++) {
    const start = sunset + i * cNightLen;
    const end = start + cNightLen;
    const typeKey = nightSequence[i];
    const q = CHOGHADIYA_QUALITIES[typeKey];
    choghadias.push({
      index: i + 9,
      name: q.name,
      quality: q.quality,
      nature: q.nature,
      color: q.color,
      isNight: true,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }

  // ==========================================================================
  // 3. HORAS (24 planetary hours)
  // ==========================================================================
  const horas = [];
  const hDayLen = dayDuration / 12;
  const hNightLen = nightDuration / 12;
  
  const weekdayLord = WEEKDAY_LORD_PLANET[weekday];
  const startIndex = HORA_RULERS_SEQ.indexOf(weekdayLord);
  
  // Day Horas
  for (let i = 0; i < 12; i++) {
    const start = sunrise + i * hDayLen;
    const end = start + hDayLen;
    const rulerName = HORA_RULERS_SEQ[(startIndex + i) % 7];
    const ruler = PLANET_RULERS[rulerName];
    horas.push({
      hour: i + 1,
      rulerName: ruler.name,
      symbol: ruler.symbol,
      quality: ruler.quality,
      isNight: false,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }
  
  // Night Horas
  for (let i = 0; i < 12; i++) {
    const start = sunset + i * hNightLen;
    const end = start + hNightLen;
    const rulerName = HORA_RULERS_SEQ[(startIndex + 12 + i) % 7];
    const ruler = PLANET_RULERS[rulerName];
    horas.push({
      hour: i + 13,
      rulerName: ruler.name,
      symbol: ruler.symbol,
      quality: ruler.quality,
      isNight: true,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    });
  }

  // ==========================================================================
  // 4. INAUSPICIOUS & AUSPICIOUS SPECIFIC SECTORS (For Dial representation)
  // ==========================================================================
  const octantLen = dayDuration / 8;
  
  // Rahu Kaal
  const rahuStart = sunrise + RAHU_INDEX[weekday] * octantLen;
  const rahuEnd = rahuStart + octantLen;
  
  // Gulika Kaal
  const gulikaStart = sunrise + GULIKA_INDEX[weekday] * octantLen;
  const gulikaEnd = gulikaStart + octantLen;
  
  // Yamaganda Kaal
  const yamaStart = sunrise + YAMAGANDA_INDEX[weekday] * octantLen;
  const yamaEnd = yamaStart + octantLen;
  
  // Abhijit Muhurtha (8th Muhurtha of daytime)
  const abhijitStart = sunrise + 7 * mDayLen;
  const abhijitEnd = abhijitStart + mDayLen;
  
  // Durmuhurthas (Weekday-specific)
  const durmuhurthas = DURMUHURTHA_INDICES[weekday].map(idx => {
    const start = sunrise + idx * mDayLen;
    const end = start + mDayLen;
    return {
      name: `Durmuhurtha ${DURMUHURTHA_INDICES[weekday].indexOf(idx) + 1}`,
      startHour: start % 24,
      endHour: end % 24,
      startTimeStr: formatHour(start),
      endTimeStr: formatHour(end)
    };
  });
  
  // Pradosh Kaal (First 2.4 hours after Sunset)
  const pradoshStart = sunset;
  const pradoshEnd = sunset + 2.4; // 6 Ghatis

  // ==========================================================================
  // 5. LAGNAS OF THE DAY (12 Rising Signs)
  // ==========================================================================
  const lagnas = [];
  const jd = (info.vedicDate.getTime() / 86400000) + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const ayan = 23.853055 + (1.396971 * T);
  
  // Convert sunrise of Vedic day to a absolute timestamp Date
  const baseSunriseDate = new Date(info.vedicDate);
  baseSunriseDate.setHours(0, 0, 0, 0);
  baseSunriseDate.setTime(baseSunriseDate.getTime() + sunrise * 3600000);
  
  let currentLagna = null;
  
  // Sample every 3 minutes for 24 hours to find rising signs (480 steps)
  for (let i = 0; i <= 480; i++) {
    const sampleTime = new Date(baseSunriseDate.getTime() + i * 3 * 60000);
    const lagnaDeg = OfflineEphemeris.getTrueLagna(sampleTime, lat, lon, ayan);
    const rasiIdx = Math.floor(lagnaDeg / 30) % 12;
    
    if (currentLagna === null) {
      currentLagna = {
        rasiIndex: rasiIdx,
        name: RASIS[rasiIdx].name,
        start: sampleTime,
        end: sampleTime
      };
    } else if (currentLagna.rasiIndex === rasiIdx) {
      currentLagna.end = sampleTime;
    } else {
      lagnas.push({
        rasiIndex: currentLagna.rasiIndex,
        name: currentLagna.name,
        startTimeStr: currentLagna.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTimeStr: currentLagna.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        startHour: (currentLagna.start.getHours() + currentLagna.start.getMinutes() / 60) % 24,
        endHour: (currentLagna.end.getHours() + currentLagna.end.getMinutes() / 60) % 24
      });
      currentLagna = {
        rasiIndex: rasiIdx,
        name: RASIS[rasiIdx].name,
        start: sampleTime,
        end: sampleTime
      };
    }
  }
  
  if (currentLagna) {
    lagnas.push({
      rasiIndex: currentLagna.rasiIndex,
      name: currentLagna.name,
      startTimeStr: currentLagna.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTimeStr: currentLagna.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startHour: (currentLagna.start.getHours() + currentLagna.start.getMinutes() / 60) % 24,
      endHour: (currentLagna.end.getHours() + currentLagna.end.getMinutes() / 60) % 24
    });
  }

  // Filter overlapping or duplicated lagna slices at boundary wrap-around
  const uniqueLagnas = [];
  lagnas.forEach(l => {
    if (uniqueLagnas.length === 0) {
      uniqueLagnas.push(l);
    } else {
      const prev = uniqueLagnas[uniqueLagnas.length - 1];
      if (prev.rasiIndex === l.rasiIndex) {
        prev.endTimeStr = l.endTimeStr;
        prev.endHour = l.endHour;
      } else {
        uniqueLagnas.push(l);
      }
    }
  });

  return {
    vedicDate: info.vedicDate,
    weekdayName: VEDIC_WEEKDAYS[weekday],
    weekdayIndex: weekday,
    sunriseStr: info.sunriseStr,
    sunsetStr: info.sunsetStr,
    noonStr: info.noonStr,
    sunriseHour: sunrise,
    sunsetHour: sunset,
    noonHour: info.noonFrac,
    dayDuration,
    nightDuration,
    
    // Main tables
    muhurthas,
    choghadias,
    horas,
    lagnas: uniqueLagnas,
    
    // Specific periods
    rahu: { start: rahuStart % 24, end: rahuEnd % 24, startStr: formatHour(rahuStart), endStr: formatHour(rahuEnd) },
    gulika: { start: gulikaStart % 24, end: gulikaEnd % 24, startStr: formatHour(gulikaStart), endStr: formatHour(gulikaEnd) },
    yamaganda: { start: yamaStart % 24, end: yamaEnd % 24, startStr: formatHour(yamaStart), endStr: formatHour(yamaEnd) },
    abhijit: { start: abhijitStart % 24, end: abhijitEnd % 24, startStr: formatHour(abhijitStart), endStr: formatHour(abhijitEnd) },
    durmuhurthas,
    pradosh: { start: pradoshStart % 24, end: pradoshEnd % 24, startStr: formatHour(pradoshStart), endStr: formatHour(pradoshEnd) }
  };
}
