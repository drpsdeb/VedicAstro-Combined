// ============================================================================
// 🧠 VEDIC ASTROLOGY EPHEMERIS ENGINE, LORE & DATABASE (UNIFIED)
// ============================================================================

import { calculateYogas } from './yoga';
export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", 
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", 
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

export const NAK_SHORTS = [
  "ASW", "BHA", "KRI", "ROH", "MRI", "ARD", 
  "PUN", "PUS", "ASL", "MAG", "PPH", "UPH", 
  "HAS", "CHI", "SWA", "VIS", "ANU", "JYE", 
  "MUL", "PAS", "UAS", "SHR", "DHA", "SHA", 
  "PBP", "UBP", "REV"
];

export const RASIS = [
  { name: "Aries", ruler: "Mars" }, { name: "Taurus", ruler: "Venus" },
  { name: "Gemini", ruler: "Mercury" }, { name: "Cancer", ruler: "Moon" },
  { name: "Leo", ruler: "Sun" }, { name: "Virgo", ruler: "Mercury" },
  { name: "Libra", ruler: "Venus" }, { name: "Scorpio", ruler: "Mars" },
  { name: "Sagittarius", ruler: "Jupiter" }, { name: "Capricorn", ruler: "Saturn" },
  { name: "Aquarius", ruler: "Saturn" }, { name: "Pisces", ruler: "Jupiter" }
];

export const RASHI_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
];

export const GRAHAS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'
];

// Vargas division calculations
export const getD9RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; return ([0, 9, 6, 3][Math.floor(s / 30) % 4] + Math.floor((s % 30) / (40 / 12))) % 12; };
export const getD10RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); return ((r % 2 === 0 ? r : r + 8) + Math.floor((s % 30) / 3)) % 12; };
export const getD6RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; return ((Math.floor(s / 30) % 2 === 0 ? 0 : 6) + Math.floor((s % 30) / 5)) % 12; };
export const getD20RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); return (([0, 8, 4][r % 3]) + Math.floor((s % 30) / 1.5)) % 12; };

// ==========================================
// MODULE 1: HIGH-PRECISION OFFLINE EPHEMERIS ENGINE
// ==========================================
export const OfflineEphemeris = {
  norm: (deg) => ((deg % 360) + 360) % 360,
  rad: (deg) => deg * Math.PI / 180,
  deg: (rad) => rad * 180 / Math.PI,
  
  getDeltaT: function(year) { return 69.4 / 86400.0; },
  getAyanamsa: function(T) { return 23.853055 + (1.396971 * T); },
  
  calcPlanet: function(d, L0, n, e, p, a) {
     const M = this.norm(L0 + n * d - p);
     const C = (180/Math.PI) * ( (2*e - 0.25*e*e*e)*Math.sin(this.rad(M)) + 1.25*e*e*Math.sin(this.rad(2*M)) );
     const L_helio = this.norm(M + C + p);
     const R = a * (1 - e*e) / (1 + e*Math.cos(this.rad(M+C)));
     return { L: this.rad(L_helio), R: R };
  },

  getTrueLagna: function(dateObj, lat, lon, ayanamsa) {
     const jd = (dateObj.getTime() / 86400000) + 2440587.5;
     const t = (jd - 2451545.0) / 36525.0;
     let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
     const lst = this.norm(this.norm(gmst) + lon);
     const eps = 23.439291 - 0.0130042 * t;
     const y = Math.cos(this.rad(lst));
     const x = -(Math.sin(this.rad(lst)) * Math.cos(this.rad(eps)) + Math.tan(this.rad(lat)) * Math.sin(this.rad(eps)));
     return this.norm(this.norm(this.deg(Math.atan2(y, x))) - ayanamsa);
  },

  getSunTimes: function(dateObj, lat, lon, tzone) {
      const start = new Date(dateObj.getFullYear(), 0, 0);
      const diff = dateObj - start + (start.getTimezoneOffset() - dateObj.getTimezoneOffset()) * 60000;
      const dY = Math.floor(diff / 86400000);
      const gamma = (2 * Math.PI / 365) * (dY - 1 + 12 / 24);
      const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
      const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma);
      const rL = lat * Math.PI / 180;
      let cos_ha = (Math.cos(90.833 * Math.PI / 180) / (Math.cos(rL) * Math.cos(decl))) - Math.tan(rL) * Math.tan(decl);
      const ha_deg = Math.acos(Math.max(-1, Math.min(1, cos_ha))) * 180 / Math.PI;
      const n_utc = 720 - 4 * lon - eqTime;
      const formatTime = (mins) => {
          let lm = ((mins + (tzone * 60)) % 1440 + 1440) % 1440;
          const h = Math.floor(lm / 60), m = Math.floor(lm % 60);
          return { frac: lm / 60, timeStr: `${h === 0 ? 12 : (h > 12 ? h - 12 : h)}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}` };
      };
      return { sunrise: formatTime(n_utc - 4 * ha_deg), sunset: formatTime(n_utc + 4 * ha_deg), noon: formatTime(n_utc), sunriseFrac: (n_utc - 4 * ha_deg)/60, sunsetFrac: (n_utc + 4 * ha_deg)/60 };
  },

  getPositions: function(dateObj, lat, lon) {
     const jd_ut = (dateObj.getTime() / 86400000) + 2440587.5;
     const T = (jd_ut - 2451545.0) / 36525.0; 
     const d = jd_ut - 2451545.0; 
     const ayanamsa = this.getAyanamsa(T);

     const earth = this.calcPlanet(d, 100.46, 0.985647, 0.0167, 102.93, 1.000);
     const e_prev = this.calcPlanet(d - 0.01, 100.46, 0.985647, 0.0167, 102.93, 1.000); 
     const sun_geo = this.norm(this.deg(earth.L) + 180);

     const L_prime = this.norm(218.3164477 + 481267.88123421 * T);
     const D_elong = this.norm(297.8501921 + 445267.1114034 * T);
     const M_sun   = this.norm(357.5291092 + 35999.0502909 * T);
     const M_prime = this.norm(134.9633964 + 477198.8675055 * T);
     const F_node  = this.norm(93.2720950 + 483202.0175233 * T);

     const mT = [[6.288,0,1,0,0], [1.274,2,-1,0,0], [0.658,2,0,0,0], [0.213,0,2,0,0], [-0.185,0,0,1,0], [-0.114,0,0,0,2]];
     let moon_geo = L_prime;
     mT.forEach(t => moon_geo += t[0] * Math.sin(this.rad(t[1]*D_elong + t[2]*M_prime + t[3]*M_sun + t[4]*F_node)));
     moon_geo = this.norm(moon_geo);

     const omega = this.norm(125.04452 - 1934.136261 * T);
     
     const getGeo = (pD, dVal, eD) => {
        const p = this.calcPlanet(dVal, ...pD);
        const dx = p.R * Math.cos(p.L) - eD.R * Math.cos(eD.L);
        const dy = p.R * Math.sin(p.L) - eD.R * Math.sin(eD.L);
        return this.norm(this.deg(Math.atan2(dy, dx)));
     };

     const isR = (pD) => this.norm(getGeo(pD, d, earth) - getGeo(pD, d - 0.01, e_prev)) > 180;

     const positions = [
        { planet: 'Sun', l: sun_geo, isRetro: false }, { planet: 'Moon', l: moon_geo, isRetro: false },
        { planet: 'Mars', l: getGeo([355.45, 0.524, 0.093, 336.04, 1.523], d, earth), isRetro: isR([355.45, 0.524, 0.093, 336.04, 1.523]) },
        { planet: 'Mercury', l: getGeo([252.25, 4.092, 0.205, 77.45, 0.387], d, earth), isRetro: isR([252.25, 4.092, 0.205, 77.45, 0.387]) },
        { planet: 'Jupiter', l: getGeo([34.40, 0.083, 0.048, 14.75, 5.204], d, earth), isRetro: isR([34.40, 0.083, 0.048, 14.75, 5.204]) },
        { planet: 'Venus', l: getGeo([181.98, 1.602, 0.006, 131.56, 0.723], d, earth), isRetro: isR([181.98, 1.602, 0.006, 131.56, 0.723]) },
        { planet: 'Saturn', l: getGeo([50.08, 0.033, 0.054, 92.43, 9.582], d, earth), isRetro: isR([50.08, 0.033, 0.054, 92.43, 9.582]) },
        { planet: 'Rahu', l: omega, isRetro: true }, { planet: 'Ketu', l: this.norm(omega + 180), isRetro: true }
     ];

     const sidereal = positions.map(p => {
         const deg = this.norm(p.l - ayanamsa);
         const rasiIdx = Math.floor(deg / 30);
         const totalNakshatras = (deg * 27) / 360;
         const nakIndex = Math.floor(totalNakshatras) % 27;
         const pada = Math.floor((totalNakshatras % 1) * 4) + 1;
         
         return {
             ...p,
             name: p.planet,
             longitude: deg,
             fullDegree: deg,
             rasiIndex: rasiIdx,
             rasi: RASIS[rasiIdx].name,
             rasiDegrees: deg % 30,
             nakshatra: NAKSHATRAS[nakIndex],
             pada: pada,
             ruler: RASIS[rasiIdx].ruler
         };
     });

     const lagnaSidereal = this.getTrueLagna(dateObj, lat, lon, ayanamsa);
     const lagnaRasiIdx = Math.floor(lagnaSidereal / 30);
     return {
         planets: sidereal,
         lagnaIndex: lagnaRasiIdx,
         lagnaDegree: lagnaSidereal,
         lagna: {
             longitude: lagnaSidereal,
             rasi: RASIS[lagnaRasiIdx].name,
             rasiDegrees: lagnaSidereal % 30,
             ruler: RASIS[lagnaRasiIdx].ruler
         },
         moonDegree: this.norm(moon_geo - ayanamsa),
         ayanamsa: ayanamsa
     };
  }
};

// Helper to calculate high-precision positions directly from a normalized profile
export function getPositionsForProfile(profile) {
  if (!profile || !profile.dob) return null;
  const timeStr = profile.time || profile.tob || '12:00';
  const tz = Number(profile.tzone ?? profile.tz ?? 5.5);
  const lat = Number(profile.lat ?? 17.3850);
  const lon = Number(profile.lon ?? 78.4867);
  const [y, m, d] = String(profile.dob).split('-').map(Number);
  const [hr, min] = String(timeStr).split(':').map(Number);
  if (![y, m, d, hr, min, tz, lat, lon].every(Number.isFinite)) return null;
  const birthDate = new Date(Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000));
  return OfflineEphemeris.getPositions(birthDate, lat, lon);
}

// ==========================================
// MODULE 2: DATA HANDLER, LORE & INTERPRETATION ENGINE
// ==========================================
const safeStr = (str, delimiter) => {
    if (!str || typeof str !== 'string') return '';
    const parts = str.split(delimiter);
    return parts.length > 0 ? String(parts[0]) : '';
};

export const AstroEngine = {
  GRAHAS,
  SIDEREAL_RASIS: [
    'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 
    'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)', 
    'Dhanus (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
  ],
  RASHI_ROMAN: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
  RASHI_LORDS,
  NAKSHATRAS,
  NAK_SHORTS,
  PLANET_SYMBOLS: { Sun: '☉\uFE0E', Moon: '☽\uFE0E', Mars: '♂\uFE0E', Mercury: '☿\uFE0E', Jupiter: '♃\uFE0E', Venus: '♀\uFE0E', Saturn: '♄\uFE0E', Rahu: '☊\uFE0E', Ketu: '☋\uFE0E' },
  PLANET_SHORTS: { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' },
  PLANET_TEXT_COLORS: { Sun: 'text-red-600', Moon: 'text-slate-500', Mars: 'text-red-800', Mercury: 'text-green-600', Jupiter: 'text-orange-500', Venus: 'text-fuchsia-500', Saturn: 'text-blue-600', Rahu: 'text-gray-600', Ketu: 'text-amber-800' },

  FUNCTIONAL_ROLES: [
    { ben: ['Sun','Moon','Jupiter','Mars'], mal: ['Mercury','Venus','Saturn'], mar: ['Venus'], bad: ['Saturn'] },
    { ben: ['Saturn','Sun','Mercury','Venus'], mal: ['Jupiter','Moon','Mars'], mar: ['Mercury','Mars'], bad: ['Saturn'] },
    { ben: ['Venus','Saturn','Mercury'], mal: ['Mars','Jupiter','Sun'], mar: ['Jupiter'], bad: ['Jupiter'] },
    { ben: ['Mars','Jupiter','Moon'], mal: ['Venus','Mercury','Saturn'], mar: ['Saturn'], bad: ['Venus'] },
    { ben: ['Sun','Mars','Jupiter'], mal: ['Mercury','Venus','Saturn'], mar: ['Mercury','Saturn'], bad: ['Mars'] },
    { ben: ['Venus','Mercury'], mal: ['Mars','Jupiter','Moon'], mar: ['Venus','Jupiter'], bad: ['Jupiter'] },
    { ben: ['Saturn','Mercury','Venus'], mal: ['Jupiter','Sun','Mars'], mar: ['Mars'], bad: ['Sun'] },
    { ben: ['Jupiter','Moon','Sun','Mars'], mal: ['Mercury','Venus','Saturn'], mar: ['Jupiter','Venus'], bad: ['Moon'] },
    { ben: ['Sun','Mars','Jupiter'], mal: ['Venus','Mercury','Saturn'], mar: ['Saturn','Mercury'], bad: ['Mercury'] },
    { ben: ['Venus','Mercury','Saturn'], mal: ['Mars','Jupiter','Moon'], mar: ['Saturn'], bad: ['Mars'] },
    { ben: ['Venus','Sun','Mars','Saturn'], mal: ['Jupiter','Moon'], mar: ['Jupiter'], bad: ['Venus'] },
    { ben: ['Moon','Mars','Jupiter'], mal: ['Sun','Venus','Saturn','Mercury'], mar: ['Mars','Mercury'], bad: ['Mercury'] }
  ],

  getD9RasiIndex,
  getD6RasiIndex,
  getD10RasiIndex,
  getD20RasiIndex,
  getSunTimes: function(dateObj, lat, lon, tzone) {
    return OfflineEphemeris.getSunTimes(dateObj, lat, lon, tzone);
  },

  // ASHTAKAVARGA ENGINE
  calculateAshtakavarga: (planets, lagnaIndex) => {
      const placements = { Asc: lagnaIndex };
      planets.forEach(p => { 
          const name = p.planet || p.name;
          if (['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(name)) {
              placements[name] = p.rasiIndex; 
          }
      });
      
      const AV_RULES = {
        Sun: { Sun:[1,2,4,7,8,9,10,11], Moon:[3,6,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[3,5,6,9,10,11,12], Jupiter:[5,6,9,11], Venus:[6,7,12], Saturn:[1,2,4,7,8,9,10,11], Asc:[3,4,6,10,11,12] },
        Moon: { Sun:[3,6,7,8,10,11], Moon:[1,3,6,7,10,11], Mars:[2,3,5,6,9,10,11], Mercury:[1,3,4,5,7,8,10,11], Jupiter:[1,4,7,8,10,11,12], Venus:[3,4,5,7,9,10,11], Saturn:[3,5,6,11], Asc:[3,6,10,11] },
        Mars: { Sun:[3,5,6,10,11], Moon:[3,6,11], Mars:[1,2,4,7,8,10,11], Mercury:[3,5,6,11], Jupiter:[6,10,11,12], Venus:[6,8,11,12], Saturn:[1,4,7,8,9,10,11], Asc:[1,3,6,10,11] },
        Mercury: { Sun:[5,6,9,11,12], Moon:[2,4,6,8,10,11], Mars:[1,2,4,7,8,9,10,11], Mercury:[1,3,5,6,9,10,11,12], Jupiter:[6,8,11,12], Venus:[1,2,3,4,5,8,9,11], Saturn:[1,2,4,7,8,9,10,11], Asc:[1,2,4,6,8,10,11] },
        Jupiter: { Sun:[1,2,3,4,7,8,9,10,11], Moon:[2,5,7,9,11], Mars:[1,2,4,7,8,10,11], Mercury:[1,2,4,5,6,9,10,11], Jupiter:[1,2,3,4,7,8,10,11], Venus:[2,5,6,9,10,11], Saturn:[3,5,6,12], Asc:[1,2,4,5,6,9,10,11] },
        Venus: { Sun:[8,11,12], Moon:[1,2,3,4,5,8,9,11,12], Mars:[3,5,6,9,11,12], Mercury:[3,5,6,9,11], Jupiter:[5,8,9,10,11], Venus:[1,2,3,4,5,8,9,10,11], Saturn:[3,4,5,8,9,10,11], Asc:[1,2,3,4,5,8,9,11] },
        Saturn: { Sun:[1,2,4,7,8,10,11], Moon:[3,6,11], Mars:[3,5,6,10,11], Mercury:[6,8,9,10,11,12], Jupiter:[5,6,11,12], Venus:[6,11,12], Saturn:[3,5,6,11], Asc:[1,3,4,6,10,11] }
      };

      const SAV = Array(12).fill(0);
      const BAV = {};
      
      Object.keys(AV_RULES).forEach(targetPlanet => {
          BAV[targetPlanet] = Array(12).fill(0);
          Object.keys(AV_RULES[targetPlanet]).forEach(sourceEntity => {
              const sourceRasi = placements[sourceEntity];
              if (sourceRasi !== undefined) {
                  AV_RULES[targetPlanet][sourceEntity].forEach(houseOffset => {
                      const targetRasi = (sourceRasi + houseOffset - 1) % 12;
                      BAV[targetPlanet][targetRasi]++;
                      SAV[targetRasi]++;
                  });
              }
          });
      });
      return { SAV, BAV };
  },

  // SHADBALA ENGINE (High-precision with local time & paksha calculations)
  calculateShadbala,

  calculateYogas,

  VEDIC_LORE: {
    planets: { Sun: "Soul, Ego, Father, Authority.", Moon: "Mind, Emotions, Mother, Comfort.", Mars: "Energy, Action, Courage, Siblings.", Mercury: "Intellect, Speech, Communication.", Jupiter: "Wisdom, Wealth, Optimism, Children.", Venus: "Love, Luxury, Arts, Marriage.", Saturn: "Karma, Discipline, Hard Work.", Rahu: "Worldly Desires, Illusion.", Ketu: "Spirituality, Detachment." },
    rashis: ["Action, courage, initiation.", "Stability, wealth, family.", "Communication, duality, intellect.", "Emotions, home, nurturing.", "Leadership, creativity, royalty.", "Service, perfectionism, detail.", "Balance, relationships, harmony.", "Transformation, intensity, depth.", "Philosophy, travel, optimism.", "Ambition, structure, duty.", "Innovation, networks, society.", "Intuition, spirituality, endings."],
    houses: ["Self, physical body, life path.", "Wealth, speech, early education.", "Courage, efforts, short travels.", "Mother, home, inner peace.", "Children, creativity, intellect.", "Debt, diseases, enemies, service.", "Marriage, partnerships, public image.", "Longevity, transformations, secrets.", "Luck, religion, higher education.", "Career, reputation, karma.", "Gains, large networks, desires.", "Expenses, spirituality, isolation."],
    nakshatras: [
      "Speed, initiation, healing arts.", "Creation, transformation, restraint.", "Purifying fire, ambition, leadership.", "Growth, fertility, immense beauty.", "Seeking, wandering, gentleness.", "Emotional storms, deep cleansing.", "Renewal, returning home, safety.", "Spiritual devotion, nurturing.", "Mystical wisdom, intense focus.", "Royalty, ancestral connection.", "Rest, relaxation, creative joy.", "Patronage, societal duties.", "Skill, craftsmanship, detail.", "Brilliance, visual arts, order.", "Flexibility, continuous movement.", "Purpose, branching out, triumph.", "Devotion, friendship, universal love.", "Seniority, protection, occult.", "Deep investigation, getting to the root.", "Early victories, pride, conviction.", "Unchallenged victory, deep endurance.", "Listening, learning, oral traditions.", "Wealth, adaptability, musical rhythm.", "Concealment, boundaries, complex healing.", "Intense transformation, internal shifts.", "Foundation, discipline, deep wisdom.", "Safe travels, nourishment, final liberation."
    ]
  },

  getPanchang: (sunDeg, moonDeg, dateObj) => {
    const tNames = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"];
    const varaNames = ["Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"];
    const yogaNames = ["Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyana","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
    const lunarMonths = ["Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashvin","Kartika","Margashirsha","Pausha","Magha","Phalguna"];

    const elongation = (moonDeg - sunDeg + 360) % 360;
    const tNum = Math.floor(elongation / 12) + 1;
    
    const sRasi = Math.floor(sunDeg / 30);
    const lMonthIdx = (sRasi + 1) % 12; 
    const lMonth = lunarMonths[lMonthIdx] || 'Unknown';

    const gY = dateObj.getFullYear();
    const vSamvat = gY + 57;
    const sSamvat = gY - 78;

    return { 
      vara: String(varaNames[dateObj.getDay()] || 'Unknown'), 
      tithi: `${tNames[Math.max(0, (tNum || 1) - 1)] || 'Unknown'} - ${tNum <= 15 ? 'Shukla' : 'Krishna'}`, 
      nakshatra: String(safeStr(AstroEngine.NAKSHATRAS[Math.floor(moonDeg / (40/3))], ',')), 
      yoga: String(yogaNames[Math.floor(((moonDeg + sunDeg) % 360) / (40/3))] || 'Unknown'), 
      karana: Math.floor(elongation / 6) === 0 ? "Kintughna" : "Standard",
      month: lMonth,
      year: `VS ${vSamvat} / S. ${sSamvat}`
    };
  },

  getDasaData: (birthData, targetDate, moonDegree) => {
    const DASA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
    const DASA_SEQ = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    
    const nakExact = moonDegree / (40 / 3);
    const firstLordIdx = Math.floor(nakExact) % 9;
    
    const dobStr = birthData.dob || '2000-01-01';
    const timeStr = birthData.time || '12:00';
    let mdStart = new Date(new Date(`${dobStr}T${timeStr}:00`).getTime() - ((nakExact - Math.floor(nakExact)) * DASA_YEARS[DASA_SEQ[firstLordIdx]] * 365.2425 * 86400000));
    
    let activeMD = { lord: DASA_SEQ[firstLordIdx], years: DASA_YEARS[DASA_SEQ[firstLordIdx]] };
    let activeMDIdx = firstLordIdx;
    
    for (let i = 0; i < 9; i++) {
        const lIdx = (firstLordIdx + i) % 9;
        const mdEnd = new Date(mdStart.getTime() + DASA_YEARS[DASA_SEQ[lIdx]] * 365.2425 * 86400000);
        if (new Date(targetDate) >= mdStart && new Date(targetDate) < mdEnd) { activeMD = { lord: DASA_SEQ[lIdx], start: mdStart, years: DASA_YEARS[DASA_SEQ[lIdx]] }; activeMDIdx = lIdx; break; }
        mdStart = new Date(mdEnd);
    }
    
    let adStart = new Date(activeMD.start);
    let activeAD = { lord: activeMD.lord, years: (activeMD.years * DASA_YEARS[activeMD.lord]) / 120 };
    let activeADIdx = activeMDIdx;
    
    for (let i = 0; i < 9; i++) {
        const lIdx = (activeMDIdx + i) % 9;
        const adYrs = (activeMD.years * DASA_YEARS[DASA_SEQ[lIdx]]) / 120;
        const adEnd = new Date(adStart.getTime() + adYrs * 365.2425 * 86400000);
        if (new Date(targetDate) >= adStart && new Date(targetDate) < adEnd) { activeAD = { lord: DASA_SEQ[lIdx], start: adStart }; activeADIdx = lIdx; break; }
        adStart = new Date(adEnd);
    }

    let pdStart = new Date(activeAD.start);
    let activePD = { lord: activeAD.lord, start: pdStart };
    for (let i = 0; i < 9; i++) {
        const lIdx = (activeADIdx + i) % 9;
        const pdEnd = new Date(pdStart.getTime() + ((activeAD.years * DASA_YEARS[DASA_SEQ[lIdx]]) / 120) * 365.2425 * 86400000);
        if (new Date(targetDate) >= pdStart && new Date(targetDate) < pdEnd) { activePD = { lord: DASA_SEQ[lIdx], start: pdStart }; break; }
        pdStart = new Date(pdEnd);
    }

    let upcomingList = [];
    let adIterStart = new Date(activeMD.start);
    for (let i = 0; i < 9; i++) {
        const lIdx = (activeMDIdx + i) % 9;
        const adEnd = new Date(adIterStart.getTime() + ((activeMD.years * DASA_YEARS[DASA_SEQ[lIdx]]) / 120) * 365.2425 * 86400000);
        upcomingList.push({ planets: [activeMD.lord, DASA_SEQ[lIdx]], dateStr: adIterStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) });
        adIterStart = new Date(adEnd);
    }

    return { current: { mahadasha: activeMD.lord, antardasha: activeAD.lord, pratyantardasha: activePD.lord, pdStart: activePD.start }, upcoming: upcomingList };
  },

  callGemini: async (prompt, key, level = 'beginner', language = 'English') => {
    if (!key || key.length < 10) return { error: "Missing API Key." };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const sysPrompt = level === 'expert' ? `Expert Parashari Astrologer. 3-4 sentence insights using Vedic terms. Must write in ${language}.` : `Warm intuitive astrologer. Plain language only. No jargon. Must write in ${language}.`;
    
    try {
      const data = await fetchWithRetry(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
              contents: [{ parts: [{ text: prompt }] }], 
              systemInstruction: { parts: [{ text: sysPrompt }] } 
          }) 
      });
      if (data.error) return { error: String(data.error.message || 'API Error') };
      return { text: String(data.candidates?.[0]?.content?.parts?.[0]?.text || '') };
    } catch (e) { 
      return { error: e.message || "Connection error. Check API key." }; 
    }
  }
};

// Exponential Backoff Fetch for callGemini helper
const fetchWithRetry = async (url, options, retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error?.message || `HTTP error! status: ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
};

// Keep old calculatePlanetaryPositions for compatibility (internally using high-precision calculations)
export function calculatePlanetaryPositions(dobStr, timeStr, tz = 5.5) {
  if (!dobStr) return null;
  return getPositionsForProfile({ dob: dobStr, time: timeStr, tzone: tz });
}

// SHADBALA ENGINE (High-precision with local time & paksha calculations)
export function calculateShadbala(planets, lagnaDegree, timeObj, sunTimes) {
      const scores = {};
      if (!Array.isArray(planets)) return scores;
      const EXALTATION_DEG = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
      const DIK_DEG = { Sun: (lagnaDegree + 270) % 360, Mars: (lagnaDegree + 270) % 360, Jupiter: lagnaDegree, Mercury: lagnaDegree, Saturn: (lagnaDegree + 180) % 360, Moon: (lagnaDegree + 90) % 360, Venus: (lagnaDegree + 90) % 360 };
      const NAISARGIKA = { Sun: 60, Moon: 51.4, Venus: 42.8, Jupiter: 34.2, Mercury: 25.7, Mars: 17.1, Saturn: 8.5 };
      const getAngle = (d1, d2) => { let diff = Math.abs(d1 - d2) % 360; return diff > 180 ? 360 - diff : diff; };

      const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
      const moonPlanet = planets.find(p => p && (p.planet === 'Moon' || p.name === 'Moon'));
      let pakshaValue = 30; 
      if (sunPlanet && moonPlanet) {
          const mPA = (moonPlanet.fullDegree - sunPlanet.fullDegree + 360) % 360;
          pakshaValue = mPA <= 180 ? mPA / 3 : (360 - mPA) / 3; 
      }

      let isDay = true;
      if (sunTimes && timeObj) {
          const currentMins = (timeObj.getUTCHours() + 5.5) * 60 + timeObj.getUTCMinutes(); 
          isDay = currentMins >= (sunTimes.sunriseFrac * 60) && currentMins <= (sunTimes.sunsetFrac * 60);
      }

      planets.forEach(p => {
          const pName = p.planet || p.name;
          if (!p || !EXALTATION_DEG[pName]) return; 
          const sthana = (getAngle(p.fullDegree, (EXALTATION_DEG[pName] + 180) % 360) / 180) * 60;
          const dik = ((180 - getAngle(p.fullDegree, DIK_DEG[pName])) / 180) * 60;
          let kaala = ['Moon', 'Jupiter', 'Venus', 'Mercury'].includes(pName) ? pakshaValue : (60 - pakshaValue);
          if (pName === 'Mercury') kaala += 60;
          else if (isDay && ['Sun', 'Jupiter', 'Venus'].includes(pName)) kaala += 60;
          else if (!isDay && ['Moon', 'Mars', 'Saturn'].includes(pName)) kaala += 60;
          let chesta = p.isRetro ? 60 : 0;
          if (pName === 'Sun') chesta = 30; if (pName === 'Moon') chesta = pakshaValue;

          const total = Math.round(sthana + dik + kaala + chesta + (NAISARGIKA[pName] || 0));
          scores[pName] = { total, percentage: Math.round((total / 300) * 100), sthana: Math.round(sthana), dik: Math.round(dik), kaala: Math.round(kaala), chesta: Math.round(chesta), nais: Math.round(NAISARGIKA[pName] || 0) };
      });
      return scores;
}