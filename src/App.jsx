import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Star, Info, Settings, Loader2, Search, Cloud, Plus, Cpu, AlertTriangle, X, Home, MessageCircle, Moon, Sun, Sparkles, Key, CheckCircle2, Compass, HelpCircle, BarChart2, ShieldAlert, Zap, BookOpen } from 'lucide-react';

// ==========================================
// FIREBASE CLOUD SETUP
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

// PASTE YOUR REAL KEYS HERE:
const firebaseConfig = {
  apiKey: "AIzaSyCioK1ECb7E3hSuytE22Ykg4sDpWcnNmUw",
  authDomain: "vedicastro-2026.firebaseapp.com",
  projectId: "vedicastro-2026",
  storageBucket: "vedicastro-2026.firebasestorage.app",
  messagingSenderId: "261708630120",
  appId: "1:261708630120:web:c70b4159741593031853dd",
  measurementId: "G-GEVLSRCOK6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "vedic-astro-live";

// ==========================================
// BUILT-IN ASSETS & HELPERS
// ==========================================
const LogoSVG = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" className={`drop-shadow-md ${className}`}>
    <circle cx="50" cy="50" r="45" fill="#431407" />
    <path d="M50 15 L53 42 L80 45 L53 48 L50 75 L47 48 L20 45 L47 42 Z" fill="#fbbf24" />
    <circle cx="50" cy="50" r="20" fill="none" stroke="#fef3c7" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="50" cy="50" r="5" fill="#fef3c7" />
  </svg>
);

const safeStr = (str, delimiter) => {
    if (!str || typeof str !== 'string') return '';
    const parts = str.split(delimiter);
    return parts.length > 0 ? String(parts[0]) : '';
};

const HARDCODED_PROFILES = [];
let memoryStorage = {}; 
const safeStorage = {
  get: (k) => { 
    try { 
      const i = window.localStorage.getItem(k); 
      return i ? JSON.parse(i) : memoryStorage[k] || null; 
    } catch (e) { 
      console.error("Storage GET Error:", e);
      return memoryStorage[k] || null; 
    } 
  },
  set: (k, v) => { 
    memoryStorage[k] = v; 
    try { 
      window.localStorage.setItem(k, JSON.stringify(v)); 
      console.log(`✅ SUCCESS: Browser hard drive accepted ${v.length} profiles.`);
    } catch (e) {
      console.error("🚨 SILENT KILLER CAUGHT! Browser refused to save:", e);
    } 
  },
  remove: (k) => { 
    delete memoryStorage[k]; 
    try { 
      window.localStorage.removeItem(k); 
    } catch (e) {} 
  }
};

// Exponential Backoff Fetch
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

// ==========================================
// MODULE 1: OFFLINE EPHEMERIS ENGINE
// ==========================================
const OfflineEphemeris = {
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
         return { ...p, fullDegree: deg, rasiIndex: Math.floor(deg / 30) };
     });

     const lagnaSidereal = this.getTrueLagna(dateObj, lat, lon, ayanamsa);
     return { planets: sidereal, lagnaIndex: Math.floor(lagnaSidereal / 30), lagnaDegree: lagnaSidereal, moonDegree: this.norm(moon_geo - ayanamsa) };
  }
};

// ==========================================
// MODULE 2: DATA HANDLER & VEDIC LORE
// ==========================================
const AstroEngine = {
  GRAHAS: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'],
  SIDEREAL_RASIS: ['Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)', 'Dhanus (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'],
  RASHI_ROMAN: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
  RASHI_LORDS: ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'],
  NAKSHATRAS: ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'],
  NAK_SHORTS: ['ASW', 'BHA', 'KRI', 'ROH', 'MRI', 'ARD', 'PUN', 'PUS', 'ASL', 'MAG', 'PPH', 'UPH', 'HAS', 'CHI', 'SWA', 'VIS', 'ANU', 'JYE', 'MUL', 'PAS', 'UAS', 'SHR', 'DHA', 'SHA', 'PBP', 'UBP', 'REV'],
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

  getD9RasiIndex: (deg) => { const s = ((deg % 360) + 360) % 360; return ([0, 9, 6, 3][Math.floor(s / 30) % 4] + Math.floor((s % 30) / (40 / 12))) % 12; },
  getD6RasiIndex: (deg) => { const s = ((deg % 360) + 360) % 360; return ((Math.floor(s / 30) % 2 === 0 ? 0 : 6) + Math.floor((s % 30) / 5)) % 12; },
  getD10RasiIndex: (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); return ((r % 2 === 0 ? r : r + 8) + Math.floor((s % 30) / 3)) % 12; },
  getD20RasiIndex: (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); return (([0, 8, 4][r % 3]) + Math.floor((s % 30) / 1.5)) % 12; },

  // ASHTAKAVARGA ENGINE
  calculateAshtakavarga: (planets, lagnaIndex) => {
      const placements = { Asc: lagnaIndex };
      planets.forEach(p => { if (['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.planet)) placements[p.planet] = p.rasiIndex; });
      
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

  calculateShadbala: (planets, lagnaDegree, timeObj, sunTimes) => {
      const scores = {};
      if (!Array.isArray(planets)) return scores;
      const EXALTATION_DEG = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
      const DIK_DEG = { Sun: (lagnaDegree + 270) % 360, Mars: (lagnaDegree + 270) % 360, Jupiter: lagnaDegree, Mercury: lagnaDegree, Saturn: (lagnaDegree + 180) % 360, Moon: (lagnaDegree + 90) % 360, Venus: (lagnaDegree + 90) % 360 };
      const NAISARGIKA = { Sun: 60, Moon: 51.4, Venus: 42.8, Jupiter: 34.2, Mercury: 25.7, Mars: 17.1, Saturn: 8.5 };
      const getAngle = (d1, d2) => { let diff = Math.abs(d1 - d2) % 360; return diff > 180 ? 360 - diff : diff; };

      const sunPlanet = planets.find(p => p && p.planet === 'Sun');
      const moonPlanet = planets.find(p => p && p.planet === 'Moon');
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
          if (!p || !EXALTATION_DEG[p.planet]) return; 
          const sthana = (getAngle(p.fullDegree, (EXALTATION_DEG[p.planet] + 180) % 360) / 180) * 60;
          const dik = ((180 - getAngle(p.fullDegree, DIK_DEG[p.planet])) / 180) * 60;
          let kaala = ['Moon', 'Jupiter', 'Venus', 'Mercury'].includes(p.planet) ? pakshaValue : (60 - pakshaValue);
          if (p.planet === 'Mercury') kaala += 60;
          else if (isDay && ['Sun', 'Jupiter', 'Venus'].includes(p.planet)) kaala += 60;
          else if (!isDay && ['Moon', 'Mars', 'Saturn'].includes(p.planet)) kaala += 60;
          let chesta = p.isRetro ? 60 : 0;
          if (p.planet === 'Sun') chesta = 30; if (p.planet === 'Moon') chesta = pakshaValue;

          const total = Math.round(sthana + dik + kaala + chesta + (NAISARGIKA[p.planet] || 0));
          scores[p.planet] = { total, percentage: Math.round((total / 300) * 100), sthana: Math.round(sthana), dik: Math.round(dik), kaala: Math.round(kaala), chesta: Math.round(chesta), nais: Math.round(NAISARGIKA[p.planet] || 0) };
      });
      return scores;
  },

  calculateYogas: (planets, lagnaIndex) => {
      if (isNaN(lagnaIndex) || !planets || planets.length === 0) return [];
      const yogas = [];
      const placements = {}; 
      const rasiPlacements = {}; 
      const houseLords = {}; 
      const lordships = {}; 

      planets.forEach(p => {
          if(p && p.planet !== 'Rahu' && p.planet !== 'Ketu') {
              placements[p.planet] = ((p.rasiIndex - lagnaIndex + 12) % 12) + 1;
              rasiPlacements[p.planet] = p.rasiIndex;
          }
      });

      for (let i = 1; i <= 12; i++) {
          const rasi = (lagnaIndex + i - 1) % 12;
          const lord = AstroEngine.RASHI_LORDS[rasi];
          houseLords[i] = lord;
          if (!lordships[lord]) lordships[lord] = [];
          lordships[lord].push(i);
      }

      const getConjuncts = (pName) => Object.keys(placements).filter(p => placements[p] === placements[pName] && p !== pName);

      const checkedExchanges = new Set();
      Object.keys(placements).forEach(p1 => {
          const h1 = placements[p1];
          const disp1 = houseLords[h1];
          if (disp1 && disp1 !== p1 && placements[disp1]) {
              const h2 = placements[disp1];
              const disp2 = houseLords[h2];
              if (disp2 === p1 && !checkedExchanges.has(p1) && !checkedExchanges.has(disp1)) {
                  const involved = [p1, disp1];
                  yogas.push({ name: 'Parivartana Yoga', type: 'Exchange', involved: involved, icon: 'Zap', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', desc: `Mutual exchange between ${p1} (Lord of ${lordships[p1].join(',')}) and ${disp1} (Lord of ${lordships[disp1].join(',')}). Highly powerful connection.` });
                  checkedExchanges.add(p1);
                  checkedExchanges.add(disp1);
              }
          }
      });

      const kendras = [1, 4, 7, 10];
      const trikonas = [1, 5, 9];
      Object.keys(placements).forEach(p1 => {
          const p1H = lordships[p1] || [];
          if (p1H.some(h => kendras.includes(h))) {
              getConjuncts(p1).forEach(p2 => {
                  if (p1 < p2 && (lordships[p2] || []).some(h => trikonas.includes(h))) {
                      const involved = [p1, p2];
                      yogas.push({ name: 'Raja Yoga', type: 'Power/Status', involved: involved, icon: 'Star', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: `${p1} and ${p2} combine Kendra and Trikona energies in House ${placements[p1]}.` });
                  }
              });
          }
      });

      const wealthH = [1, 2, 5, 9, 11];
      Object.keys(placements).forEach(p1 => {
          const p1H = lordships[p1] || [];
          if (p1H.some(h => wealthH.includes(h))) {
              getConjuncts(p1).forEach(p2 => {
                  const p2H = lordships[p2] || [];
                  if (p1 < p2 && p2H.some(h => wealthH.includes(h)) && !p1H.some(h => [6,8,12].includes(h)) && !p2H.some(h => [6,8,12].includes(h))) {
                      const involved = [p1, p2];
                      yogas.push({ name: 'Dhana Yoga', type: 'Wealth', involved: involved, icon: 'BarChart2', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: `${p1} and ${p2} combine wealth-giving houses in House ${placements[p1]}.` });
                  }
              });
          }
      });

      const lagnaLord = houseLords[1];
      if (lagnaLord && placements[lagnaLord] && [6, 8, 12].includes(placements[lagnaLord])) {
          const involved = [lagnaLord];
          const house = placements[lagnaLord];
          yogas.push({ name: 'Arishta Yoga', type: 'Challenge', involved: involved, icon: 'ShieldAlert', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', desc: `Lagna Lord ${lagnaLord} is placed in a Dusthana (House ${house}). Indicates physical or mental strain.` });
      }

      if (placements['Moon'] && placements['Jupiter']) {
          const jupFromMoon = ((rasiPlacements['Jupiter'] - rasiPlacements['Moon'] + 12) % 12) + 1;
          if (kendras.includes(jupFromMoon)) {
              const involved = ['Moon', 'Jupiter'];
              yogas.push({ name: 'Gaja Kesari Yoga', type: 'Fame/Wisdom', involved: involved, icon: 'Sun', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', desc: `Jupiter is in a Kendra (House ${jupFromMoon}) from the Moon. Grants intelligence, eloquence, and lasting reputation.` });
          }
      }

      const pmpRules = {
          Mars: { name: 'Ruchaka Yoga', signs: [0, 7, 9], desc: 'Courage, leadership, and physical prowess.' },
          Mercury: { name: 'Bhadra Yoga', signs: [2, 5], desc: 'Intellect, communication, and sharp business acumen.' },
          Jupiter: { name: 'Hamsa Yoga', signs: [3, 8, 11], desc: 'Wisdom, purity, and spiritual elevation.' },
          Venus: { name: 'Malavya Yoga', signs: [1, 6, 11], desc: 'Beauty, luxury, charisma, and artistic brilliance.' },
          Saturn: { name: 'Sasha Yoga', signs: [6, 9, 10], desc: 'Discipline, authority, endurance, and mass influence.' }
      };
      Object.keys(pmpRules).forEach(planet => {
          if (placements[planet] && kendras.includes(placements[planet]) && pmpRules[planet].signs.includes(rasiPlacements[planet])) {
              const involved = [planet];
              yogas.push({ name: pmpRules[planet].name, type: 'Mahapurusha', involved: involved, icon: 'Star', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: `${planet} is in Kendra (House ${placements[planet]}) in its own/exalted sign. Grants: ${pmpRules[planet].desc}` });
          }
      });

      if (placements['Moon']) {
          const mRasi = rasiPlacements['Moon'];
          const pIn2 = Object.keys(rasiPlacements).filter(p => p !== 'Sun' && p !== 'Moon' && rasiPlacements[p] === (mRasi + 1) % 12);
          const pIn12 = Object.keys(rasiPlacements).filter(p => p !== 'Sun' && p !== 'Moon' && rasiPlacements[p] === (mRasi + 11) % 12);
          const conjunct = getConjuncts('Moon').filter(p => p !== 'Sun');
          if (pIn2.length === 0 && pIn12.length === 0 && conjunct.length === 0) {
              const involved = ['Moon'];
              yogas.push({ name: 'Kemadruma Yoga', type: 'Challenge', involved: involved, icon: 'Moon', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300', desc: `Moon is isolated with no planets adjacent or conjunct. Can indicate deep mental isolation or emotional struggle.` });
          }
      }

      const uniqueYogas = [];
      const seen = new Set();
      yogas.forEach(y => { if(!seen.has(y.desc)) { seen.add(y.desc); uniqueYogas.push(y); } });
      return uniqueYogas;
  },

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

// ==========================================
// UI COMPONENTS
// ==========================================
const BirthForm = ({ onStartApp, savedProfiles, onSaveProfile, onDeleteProfile, onGoogleLogin , isLoggedIn }) => {
  const emptyClient = { name: '', dob: '',dod: '', time: '', city: '', state: '', lat: 17.3850, lon: 78.4867, tzone: 5.5, sameAsBirth: true, currentCity: '', currentLat: 17.3850, currentLon: 78.4867, currentTzone: 5.5, astroLevel: 'beginner', language: 'English', chartStyle: 'North Indian', maritalStatus: 'Unknown', careerStatus: 'Unknown', parentsStatus: 'Unknown', children: 'Unknown', lifeContext: '' };
   
  const [formData, setFormData] = useState(() => {
    const savedData = safeStorage.get('astroFormData');
    return (savedData && typeof savedData === 'object' && savedData.name) ? { ...emptyClient, ...savedData } : (savedProfiles[0] || emptyClient);
  });
  
  const [geminiKey, setGeminiKey] = useState(() => safeStorage.get('geminiApiKey') || '');
  const [showHelp, setShowHelp] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');
  const [showAdvancedCtx, setShowAdvancedCtx] = useState(false);
  const [isLocating, setIsLocating] = useState({ birth: false, current: false });
  const [suggestions, setSuggestions] = useState({ birth: [], current: [] });

  const searchLocation = async (query, type) => {
    if (!query) return;
    setIsLocating({ ...isLocating, [type]: true });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
      const data = await res.json();
      if (Array.isArray(data)) setSuggestions({ ...suggestions, [type]: data });
    } catch (e) {}
    setIsLocating({ ...isLocating, [type]: false });
  };

  const selectLocation = async (loc, type) => {
    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);
    let tzone = formData[type === 'birth' ? 'tzone' : 'currentTzone'];

    setIsLocating({ ...isLocating, [type]: true });
    try {
      const tzRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`);
      const tzData = await tzRes.json();
      if (tzData && tzData.utc_offset_seconds !== undefined) tzone = tzData.utc_offset_seconds / 3600;
    } catch (e) {}

    const cityStr = loc.name || loc.address?.city || loc.address?.town || loc.address?.county || '';
    const stateStr = [loc.address?.state, loc.address?.country].filter(Boolean).join(', ');

    if (type === 'birth') setFormData({ ...formData, city: cityStr, state: stateStr, lat, lon, tzone });
    else setFormData({ ...formData, currentCity: cityStr, currentLat: lat, currentLon: lon, currentTzone: tzone });

    setSuggestions({ ...suggestions, [type]: [] });
    setIsLocating({ ...isLocating, [type]: false });
  };

  const handleNewClient = () => setFormData(emptyClient);
  const handleClientSelect = (e) => { const idx = parseInt(e.target.value); if (idx >= 0 && savedProfiles[idx]) setFormData({ ...emptyClient, ...savedProfiles[idx] }); };
  const handleDeleteClient = () => { onDeleteProfile(formData); const remaining = savedProfiles.filter(p => p && p.name && !(p.name === formData.name && p.dob === formData.dob)); setFormData(remaining.length > 0 ? { ...emptyClient, ...remaining[0] } : emptyClient); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData && formData.name && formData.dob) {
        onSaveProfile(formData);
        safeStorage.set('astroFormData', formData);
        safeStorage.set('geminiApiKey', geminiKey);
        onStartApp({ formData, geminiKey });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-[#fdfde8] text-slate-800 rounded-xl shadow-2xl max-w-md mx-auto my-10 border border-slate-300 relative z-50">
      <div className="flex justify-between items-center w-full mb-4">
        <div className="flex gap-3 items-center">
          <LogoSVG />
          <h2 className="text-2xl font-bold font-serif text-green-800">Initialize AstroWatch</h2>
        </div>
        <button type="button" onClick={() => setShowHelp(true)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-full transition-colors shadow-sm bg-white border border-blue-200" title="Quick Start Guide">
          <HelpCircle size={20} />
        </button>
      </div>
      
      {showHelp ? (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><HelpCircle size={20}/> AstroWatch Quick Start Guide</h3>
              <button type="button" onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-red-500 transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-slate-700 space-y-4 font-sans leading-relaxed text-left">
              <p>Welcome to AstroWatch! This is a powerful, locally-run Vedic Astrology application that combines a high-precision mathematical engine with Google's Gemini AI.</p>
              <button type="button" onClick={() => setShowHelp(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 mt-4 rounded shadow transition-colors">Got it, let's start!</button>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 uppercase"><Key size={12}/> Gemini API Key</label>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline bg-blue-100 px-1.5 py-0.5 rounded transition-colors">Get Free Key Here ↗</a>
          </div>
          <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Paste AIzaSy..." className="w-full p-2 border border-blue-200 rounded text-sm bg-white outline-none focus:border-blue-500 shadow-inner" />
        </div>

        {savedProfiles.length > 0 ? (
          <div className="bg-slate-100 p-3 rounded border border-slate-300">
            <label className="text-xs text-slate-600 mb-2 font-bold flex items-center justify-between w-full">
              <span className="flex items-center gap-1"><Cloud size={14} className="text-blue-500"/> SAVED CLOUD PROFILES</span>
              <button type="button" onClick={handleNewClient} className="text-blue-600 hover:text-blue-800 bg-blue-100 px-2 py-0.5 rounded shadow-sm transition-colors">
                + New
              </button>
            </label>

            {/* NEW SEARCH BOX */}
            <input 
              type="text" 
              placeholder="🔍 Search names..." 
              value={profileSearch}
              onChange={(e) => setProfileSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              className="w-full mb-2 p-1.5 text-xs bg-white border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />

            <div className="flex gap-2 items-center">
            <select className="flex-1 p-2 bg-white rounded border border-slate-300 focus:border-green-500 outline-none text-sm shadow-sm font-bold text-green-900" onChange={handleClientSelect} value="-1">
              <option value="-1" disabled>-- Select a Profile --</option>
              {savedProfiles.map((client, index) => {
                if (!client || !client.name) return null;
                // Filter out names that don't match the search query
                if (profileSearch && !client.name.toLowerCase().includes(profileSearch.toLowerCase())) return null;
                return <option key={index} value={String(index)}>{String(client.name)}</option>;
              })}
            </select>
            <button type="button" onClick={handleDeleteClient} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 border border-red-200 rounded shadow-sm transition-colors" title="Delete Profile">
              🗑️
            </button>
            
  <button
  type="button"
  onClick={onGoogleLogin}
  disabled={isLoggedIn}
  className={`px-3 py-1.5 rounded shadow-sm text-sm font-bold ml-2 transition-all ${
    isLoggedIn
      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
      : "bg-blue-500 text-white hover:bg-blue-600"
  }`}
>
  {isLoggedIn ? "✅ Signed In" : "Sign in with Google 🚀"}
</button>
            </div>
          </div>
        ) : null}

        <div><label className="block text-xs text-slate-600 mb-1 font-bold">FULL NAME</label><input type="text" value={formData.name || ''} className="w-full p-2 bg-white rounded border border-slate-300 focus:border-green-500 outline-none text-sm shadow-inner" required onChange={e => setFormData({...formData, name: e.target.value})} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="block text-xs text-slate-600 mb-1 font-bold">DATE OF BIRTH</label><input type="date" value={formData.dob || ''} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full p-2 bg-white rounded border border-slate-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all" /></div>
          <div><label className="block text-xs text-slate-600 mb-1 font-bold">TIME OF BIRTH</label><input type="time" value={formData.time || ''} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-2 bg-white rounded border border-slate-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all" /></div>
          <div><label className="block text-xs text-slate-400 mb-1 font-bold">DATE OF DEATH <span className="font-normal normal-case">(Opt)</span></label><input type="date" value={formData.dod || ''} onChange={(e) => setFormData({...formData, dod: e.target.value})} className="w-full p-2 bg-white rounded border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all text-slate-600" /></div>
        </div>

        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Birth Location</label>
          <div className="relative mb-2">
            <div className="flex">
              <input type="text" placeholder="Search City..." value={formData.city || ''} className="w-full p-2 bg-white rounded-l border border-slate-300 focus:border-green-500 outline-none text-sm shadow-inner" required onChange={e => setFormData({...formData, city: e.target.value})} />
              <button type="button" onClick={() => searchLocation(formData.city, 'birth')} className="bg-green-100 hover:bg-green-200 border border-slate-300 border-l-0 rounded-r px-3 text-green-800 transition-colors">
                {isLocating.birth ? <Loader2 size={16} className="animate-spin text-green-600"/> : <Search size={16} />}
              </button>
            </div>
            {suggestions.birth.length > 0 ? (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-50 max-h-48 overflow-y-auto">
                 {suggestions.birth.map((s, i) => (
                    <div key={i} className="p-2 text-xs text-slate-700 hover:bg-green-50 cursor-pointer border-b border-slate-100 last:border-0" onClick={() => selectLocation(s, 'birth')}>{String(s.display_name || '')}</div>
                 ))}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase">Lat</label><input type="number" step="any" value={formData.lat !== undefined ? formData.lat : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 focus:border-green-500 outline-none text-sm shadow-inner" required onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})} /></div>
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase">Lon</label><input type="number" step="any" value={formData.lon !== undefined ? formData.lon : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 focus:border-green-500 outline-none text-sm shadow-inner" required onChange={e => setFormData({...formData, lon: parseFloat(e.target.value)})} /></div>
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase">T.Zone</label><input type="number" step="any" value={formData.tzone !== undefined ? formData.tzone : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 focus:border-green-500 outline-none text-sm shadow-inner" required onChange={e => setFormData({...formData, tzone: parseFloat(e.target.value)})} /></div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="sameLoc" checked={formData.sameAsBirth !== false} onChange={e => setFormData({...formData, sameAsBirth: e.target.checked})} className="w-4 h-4 accent-green-700 cursor-pointer" />
          <label htmlFor="sameLoc" className="text-xs font-bold text-slate-700 cursor-pointer">Current Location same as Birth Location</label>
        </div>

        {formData.sameAsBirth === false ? (
          <div className="bg-green-50 p-3 rounded border border-green-200 shadow-inner">
            <label className="block text-[10px] text-green-800 mb-2 font-bold tracking-wider">CURRENT LOCATION (FOR GOCHARA/TRANSITS)</label>
            <div className="relative mb-2">
              <div className="flex">
                <input type="text" placeholder="Current City" value={formData.currentCity || ''} className="w-full p-2 bg-white rounded-l border border-slate-300 focus:border-green-500 outline-none text-sm" onChange={e => setFormData({...formData, currentCity: e.target.value})} />
                <button type="button" onClick={() => searchLocation(formData.currentCity, 'current')} className="bg-green-200 hover:bg-green-300 border border-slate-300 border-l-0 rounded-r px-3 text-green-900 transition-colors">
                  {isLocating.current ? <Loader2 size={16} className="animate-spin"/> : <Search size={16} />}
                </button>
              </div>
              {suggestions.current.length > 0 ? (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-300 rounded shadow-xl z-50 max-h-48 overflow-y-auto">
                   {suggestions.current.map((s, i) => (
                      <div key={i} className="p-2 text-xs text-slate-700 hover:bg-green-50 cursor-pointer border-b border-slate-100 last:border-0" onClick={() => selectLocation(s, 'current')}>{String(s.display_name || '')}</div>
                   ))}
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1"><label className="block text-[9px] text-slate-500 mb-1 uppercase">Lat</label><input type="number" step="any" value={formData.currentLat !== undefined ? formData.currentLat : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 outline-none text-sm" onChange={e => setFormData({...formData, currentLat: parseFloat(e.target.value)})} /></div>
              <div className="col-span-1"><label className="block text-[9px] text-slate-500 mb-1 uppercase">Lon</label><input type="number" step="any" value={formData.currentLon !== undefined ? formData.currentLon : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 outline-none text-sm" onChange={e => setFormData({...formData, currentLon: parseFloat(e.target.value)})} /></div>
              <div className="col-span-1"><label className="block text-[9px] text-slate-500 mb-1 uppercase">TZone</label><input type="number" step="any" value={formData.currentTzone !== undefined ? formData.currentTzone : ''} className="w-full p-1.5 bg-white rounded border border-slate-300 outline-none text-sm" onChange={e => setFormData({...formData, currentTzone: parseFloat(e.target.value)})} /></div>
            </div>
          </div>
        ) : null}

        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <label className="block text-[10px] font-bold text-purple-800 uppercase mb-2">Preferred Language</label>
          <select value={formData.language || 'English'} onChange={e => setFormData({...formData, language: e.target.value})} className="w-full p-2 bg-white rounded border border-purple-200 focus:border-purple-500 outline-none text-sm shadow-inner font-bold text-purple-900 cursor-pointer">
            <option value="English">English</option><option value="Hindi">हिंदी (Hindi)</option><option value="Bengali">বাংলা (Bengali)</option><option value="Tamil">தமிழ் (Tamil)</option><option value="Telugu">తెలుగు (Telugu)</option><option value="Malayalam">മലയാളം (Malayalam)</option><option value="Assamese">অসমীয়া (Assamese)</option>
          </select>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <label className="block text-[10px] font-bold text-amber-800 uppercase mb-2">Astrology Knowledge Level</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-900 font-bold"><input type="radio" checked={formData.astroLevel !== 'expert'} onChange={() => setFormData({...formData, astroLevel: 'beginner'})} className="w-4 h-4 accent-amber-600 cursor-pointer" /> Beginner</label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-900 font-bold"><input type="radio" checked={formData.astroLevel === 'expert'} onChange={() => setFormData({...formData, astroLevel: 'expert'})} className="w-4 h-4 accent-amber-600 cursor-pointer" /> Expert</label>
          </div>
        </div>

        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <label className="block text-[10px] font-bold text-teal-800 uppercase mb-2">Preferred Chart Style</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-teal-900 font-bold"><input type="radio" checked={formData.chartStyle !== 'South Indian'} onChange={() => setFormData({...formData, chartStyle: 'North Indian'})} className="w-4 h-4 accent-teal-600 cursor-pointer" /> North Indian</label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-teal-900 font-bold"><input type="radio" checked={formData.chartStyle === 'South Indian'} onChange={() => setFormData({...formData, chartStyle: 'South Indian'})} className="w-4 h-4 accent-teal-600 cursor-pointer" /> South Indian</label>
          </div>
        </div>

        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 shadow-inner">
          <button type="button" onClick={() => setShowAdvancedCtx(!showAdvancedCtx)} className="w-full flex justify-between items-center text-[10px] font-bold text-indigo-800 uppercase hover:text-indigo-600 transition-colors">
            <span className="flex items-center gap-1.5"><Cpu size={14}/> Optional Life Context (For Smarter AI)</span><span className="text-lg leading-none">{showAdvancedCtx ? '−' : '+'}</span>
          </button>
          {showAdvancedCtx ? (
            <div className="mt-3 space-y-3 border-t border-indigo-200 pt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><label className="block text-[9px] text-indigo-800 font-bold mb-1 uppercase">Marital Status</label><select value={formData.maritalStatus || 'Unknown'} onChange={e => setFormData({...formData, maritalStatus: e.target.value})} className="w-full p-1.5 bg-white rounded border border-indigo-200 outline-none text-xs text-slate-700"><option value="Unknown">-- Select --</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></div>
                  <div><label className="block text-[9px] text-indigo-800 font-bold mb-1 uppercase">Career Phase</label><select value={formData.careerStatus || 'Unknown'} onChange={e => setFormData({...formData, careerStatus: e.target.value})} className="w-full p-1.5 bg-white rounded border border-indigo-200 outline-none text-xs text-slate-700"><option value="Unknown">-- Select --</option><option value="Student">Student</option><option value="Employed">Employed</option><option value="Business Owner">Business Owner</option><option value="Unemployed">Unemployed</option><option value="Retired">Retired</option></select></div>
                  <div><label className="block text-[9px] text-indigo-800 font-bold mb-1 uppercase">Parents Living?</label><select value={formData.parentsStatus || 'Unknown'} onChange={e => setFormData({...formData, parentsStatus: e.target.value})} className="w-full p-1.5 bg-white rounded border border-indigo-200 outline-none text-xs text-slate-700"><option value="Unknown">-- Select --</option><option value="Both Living">Both Living</option><option value="Father Only">Father Only</option><option value="Mother Only">Mother Only</option><option value="Both Deceased">Both Deceased</option></select></div>
                  <div><label className="block text-[9px] text-indigo-800 font-bold mb-1 uppercase">Children</label><select value={formData.children || 'Unknown'} onChange={e => setFormData({...formData, children: e.target.value})} className="w-full p-1.5 bg-white rounded border border-indigo-200 outline-none text-xs text-slate-700"><option value="Unknown">-- Select --</option><option value="None">None</option><option value="1 Child">1 Child</option><option value="2 Children">2 Children</option><option value="3+ Children">3+ Children</option></select></div>
              </div>
              <div><label className="block text-[9px] text-indigo-800 font-bold mb-1 uppercase">Specific Concerns / Life Notes</label><textarea placeholder="E.g., Dealing with heavy debt, recovering from a recent accident..." value={formData.lifeContext || ''} onChange={e => setFormData({...formData, lifeContext: e.target.value})} className="w-full p-2 bg-white rounded border border-indigo-200 outline-none text-xs text-slate-700 resize-none h-16 shadow-inner" /></div>
            </div>
          ) : null}
        </div>

        <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded shadow-md transition-colors mt-6 text-sm uppercase tracking-wider font-serif">
          {savedProfiles?.some(profile => profile.name === formData?.name) 
  ? "GO TO VEDICASTRO 🚀" 
  : "SAVE TO CLOUD & GO TO VEDICASTRO 🚀"}
        </button>
      </form>
    </div>
  );
};

// ==========================================
// TRADITIONAL CHARTS & SAV CHARTS
// ==========================================
const handleChartPlanetClick = (p, lagnaIndex, onSymbolClick, chartType, allPlanetsInChart, avData) => {
    const rasiIndex = p.rasiIndex;
    const houseNum = ((rasiIndex - (isNaN(lagnaIndex) ? 0 : lagnaIndex) + 12) % 12) + 1;
    const rashiName = String(safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' ('));
    
    const chartLabels = { 'd9': 'Navamsha (D9)', 'd10': 'Dashamsha (D10)', 'd6': 'Shashthamsha (D6)', 'd20': 'Vimshamsha (D20)', 'natal': 'Natal (D1)', 'transit': 'Current Transit' };
    const titleLabel = chartLabels[chartType] || 'Natal';
    let subtitleText = `House ${houseNum}`;
    
    if (chartType === 'natal' || chartType === 'transit') {
        const safeDeg = (p.fullDegree % 360 + 360) % 360; 
        const nakExact = safeDeg / (40 / 3);
        const nakIndex = Math.floor(nakExact);
        const nakName = String(safeStr(AstroEngine.NAKSHATRAS[nakIndex], ','));
        const pada = Math.floor((nakExact - nakIndex) * 4) + 1;
        subtitleText += ` • ${nakName} P${pada}`;
    }
    
    const isRetroUI = p.isRetro && p.planet !== 'Rahu' && p.planet !== 'Ketu';
    if (isRetroUI) subtitleText += ' • Retrograde';

    onSymbolClick({
        title: `${p.planet} ${isRetroUI ? '(℞)' : ''} in ${rashiName}`,
        subtitle: `${titleLabel} • ${subtitleText}`,
        text: AstroEngine.VEDIC_LORE.planets[p.planet] || 'Vedic Significance',
        promptData: { type: chartType, planet: p.planet, rashi: rashiName, house: houseNum, isRetro: p.isRetro, rasiIndex: p.rasiIndex, chartPlanets: allPlanetsInChart, avData: avData }
    });
};

const handleAVClick = (rasiIndex, lagnaIndex, onSymbolClick) => {
    const houseNum = ((rasiIndex - (isNaN(lagnaIndex) ? 0 : lagnaIndex) + 12) % 12) + 1;
    const rashiName = String(safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' ('));
    onSymbolClick({
        title: `House ${houseNum} Strength`,
        subtitle: `Sarvashtakavarga (SAV) • ${rashiName}`,
        text: `Ashtakavarga translates to "8-fold division". It calculates a house's strength out of a maximum possible score of 56. Scores below 25 indicate challenges or delays. Scores between 25-28 are average. Scores above 30 indicate immense strength, ease of results, and success in the matters of that house when activated by transits.`,
        promptData: { type: 'sav_house', rasiIndex, house: houseNum, rashi: rashiName }
    });
};

const SouthIndianChart = ({ planets, lagnaIndex, onSymbolClick, chartType, viewMode, avData }) => {
    const grid = [
      { rasi: 11, col: 1, row: 1 }, { rasi: 0, col: 2, row: 1 }, { rasi: 1, col: 3, row: 1 }, { rasi: 2, col: 4, row: 1 },
      { rasi: 10, col: 1, row: 2 }, { rasi: 3, col: 4, row: 2 },
      { rasi: 9, col: 1, row: 3 },  { rasi: 4, col: 4, row: 3 },
      { rasi: 8, col: 1, row: 4 },  { rasi: 7, col: 2, row: 4 }, { rasi: 6, col: 3, row: 4 }, { rasi: 5, col: 4, row: 4 }
    ];
    const chartTitles = { 'd9': 'Navamsha', 'd10': 'Dashamsha', 'd6': 'Shashthamsha', 'd20': 'Vimshamsha', 'natal': 'Rasi Chart', 'sav': 'Ashtakavarga' };

    return (
      <div className="w-[300px] h-[300px] xl:w-[400px] xl:h-[400px] grid grid-cols-4 grid-rows-4 border-2 border-amber-800 bg-[#fdfde8] shadow-lg shrink-0">
         <div className="col-start-2 col-end-4 row-start-2 row-end-4 flex flex-col items-center justify-center text-center p-4 border border-amber-800/20 bg-[#fbfbf0]">
            <h3 className="font-serif font-bold text-amber-900 text-lg md:text-xl">{viewMode === 'sav' ? chartTitles['sav'] : String(chartTitles[chartType] || chartTitles['natal'])}</h3>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-1">South Indian</p>
         </div>
         {grid.map(cell => {
            const isLagna = lagnaIndex === cell.rasi;
            return (
               <div key={`si-${cell.rasi}`} style={{ gridColumnStart: cell.col, gridRowStart: cell.row }} className="border border-amber-800/30 p-1 flex flex-col relative overflow-hidden bg-white">
                  <div className="text-[9px] md:text-[10px] text-amber-800/40 font-bold absolute top-1 left-1 uppercase">{String(safeStr(AstroEngine.SIDEREAL_RASIS[cell.rasi], ' ').substring(0,3))}</div>
                  {isLagna ? <div className="text-[10px] md:text-xs font-bold text-red-600 absolute top-1 right-1">Asc</div> : null}
                  
                  {viewMode === 'sav' && avData ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center z-10 cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => handleAVClick(cell.rasi, lagnaIndex, onSymbolClick)}>
                         <span className={`text-2xl font-black ${avData.SAV[cell.rasi] >= 28 ? 'text-green-600' : 'text-red-600'}`}>{avData.SAV[cell.rasi]}</span>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-wrap content-center justify-center gap-1.5 md:gap-2 mt-3 z-10">
                         {Array.isArray(planets) && planets.filter(p => p && p.rasiIndex === cell.rasi).map(p => (
                             <span key={`si-p-${p.planet}`} onClick={() => handleChartPlanetClick(p, lagnaIndex, onSymbolClick, chartType, planets, avData)} className={`cursor-pointer hover:scale-125 transition-transform font-bold text-xs md:text-sm relative ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`} title={p.planet}>
                                {String(AstroEngine.PLANET_SHORTS[p.planet])}
                                {p.isRetro && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? <sub className="absolute -top-1 -right-1.5 text-[7px] text-red-500 font-sans">R</sub> : null}
                             </span>
                         ))}
                     </div>
                  )}
               </div>
            )
         })}
      </div>
    )
};

const NorthIndianChart = ({ planets, lagnaIndex, onSymbolClick, chartType, viewMode, avData }) => {
    const houses = [
      { h: 1, x: 50, y: 25 }, { h: 2, x: 25, y: 12.5 }, { h: 3, x: 12.5, y: 25 }, { h: 4, x: 25, y: 50 },
      { h: 5, x: 12.5, y: 75 }, { h: 6, x: 25, y: 87.5 }, { h: 7, x: 50, y: 75 }, { h: 8, x: 75, y: 87.5 },
      { h: 9, x: 87.5, y: 75 }, { h: 10, x: 75, y: 50 }, { h: 11, x: 87.5, y: 25 }, { h: 12, x: 75, y: 12.5 }
    ];
    const chartTitles = { 'd9': 'D9', 'd10': 'D10', 'd6': 'D6', 'd20': 'D20', 'natal': 'D1', 'sav': 'SAV' };

    return (
      <div className="w-[300px] h-[300px] xl:w-[400px] xl:h-[400px] border-2 border-amber-800 bg-white shadow-lg relative shrink-0 overflow-hidden">
         <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none stroke-amber-800/50" style={{ strokeWidth: 1.5 }}>
            <line x1="0" y1="0" x2="100%" y2="100%" /><line x1="100%" y1="0" x2="0" y2="100%" />
            <line x1="50%" y1="0" x2="100%" y2="50%" /><line x1="100%" y1="50%" x2="50%" y2="100%" />
            <line x1="50%" y1="100%" x2="0" y2="50%" /><line x1="0" y1="50%" x2="50%" y2="0" />
         </svg>
         <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center text-amber-800/30 text-[10px] uppercase font-bold tracking-widest pointer-events-none">{viewMode === 'sav' ? chartTitles['sav'] : String(chartTitles[chartType] || chartTitles['natal'])} (North Indian)</div>
         {houses.map(house => {
            const rasiIndex = ((lagnaIndex || 0) + house.h - 1) % 12;
            return (
               <div key={`ni-h-${house.h}`} className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%]" style={{ left: `${house.x}%`, top: `${house.y}%` }}>
                  <div className={`absolute top-0 text-[9px] md:text-[10px] font-bold ${house.h === 1 ? 'text-red-600' : 'text-amber-800/40'}`}>{String(rasiIndex + 1)}</div>
                  {house.h === 1 ? <div className="absolute -top-3 text-[8px] text-red-600 font-bold uppercase tracking-widest">Asc</div> : null}
                  
                  {viewMode === 'sav' && avData ? (
                     <div className="flex flex-col items-center justify-center z-10 pt-1 cursor-pointer hover:scale-110 transition-transform" onClick={() => handleAVClick(rasiIndex, lagnaIndex, onSymbolClick)}>
                         <span className={`text-xl md:text-2xl font-black ${avData.SAV[rasiIndex] >= 28 ? 'text-green-600' : 'text-red-600'}`}>{avData.SAV[rasiIndex]}</span>
                     </div>
                  ) : (
                     <div className="flex flex-wrap content-center justify-center gap-1 md:gap-1.5 z-10 pt-2">
                         {Array.isArray(planets) && planets.filter(p => p && p.rasiIndex === rasiIndex).map(p => (
                             <span key={`ni-p-${p.planet}`} onClick={() => handleChartPlanetClick(p, lagnaIndex, onSymbolClick, chartType, planets, avData)} className={`cursor-pointer hover:scale-125 transition-transform font-bold text-[10px] md:text-xs relative ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`} title={p.planet}>
                                {String(AstroEngine.PLANET_SHORTS[p.planet])}
                                {p.isRetro && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? <sub className="absolute -top-1 -right-1 text-[6px] text-red-500 font-sans">R</sub> : null}
                             </span>
                         ))}
                     </div>
                  )}
               </div>
            )
         })}
      </div>
    );
};

const UniversalGateway = ({ onSelectPath }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-3">VedicAstro Hub</h2>
        <p className="text-slate-600 text-lg italic">"Wisdom for everyone, regardless of birth details."</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 w-full">
        
        {/* PATH 1: VEDICASTRO ORIGINAL APP */}
        <button 
          onClick={() => onSelectPath('natal', false)}
          className="group bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border-2 border-slate-100 hover:border-emerald-500 text-left"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🕉️</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">VedicAstro</h3>
          <p className="text-slate-500 mb-6 text-sm">Original natal analysis app. Requires birth details and saves to your secure profile.</p>
          <div className="text-emerald-600 font-bold flex items-center gap-1">
            Launch VedicAstro <span>→</span>
          </div>
        </button>

        {/* PATH 2: PRASHNA (GUEST) */}
        <button 
          onClick={() => onSelectPath('prashna', true)}
          className="group bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border-2 border-slate-100 hover:border-purple-500 text-left"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔮</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Instant Prashna</h3>
          <p className="text-slate-500 mb-6 text-sm">Ask any question now. No birth data needed. (Guest Mode - No Storage)</p>
          <div className="text-purple-600 font-bold flex items-center gap-1">
            Enter Guest Mode <span>→</span>
          </div>
        </button>
        
        {/* PATH 3: ASTROWATCH (EXTERNAL APP) */}
        <button
          onClick={() => window.open('https://drpsdeb.github.io/AstroWatch-drpsdeb/', '_blank')}
          className="group bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-sky-100 flex flex-col text-left"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔭</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">AstroWatch</h3>
          <p className="text-slate-500 mb-6 text-sm flex-grow">Track real-time planetary transits, dynamic muhurtas, and celestial events.</p>
          <div className="text-sky-600 font-bold flex items-center gap-1 mt-auto">
            Launch App <span>→</span>
          </div>
        </button>
      
        {/* PATH 4: ASTROMATCH (DVADASHA KOOT MILAN) */}
        <button
          onClick={() => onSelectPath('match', false)}
          className="group bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border-2 border-amber-100 hover:border-amber-400 text-left flex flex-col min-h-[320px]"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">💕</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">AstroMatch</h3>
          <p className="text-slate-500 mb-6 text-sm flex-grow">
            Dvadasha Koot Milan engine. Comprehensive 50-point compatibility analysis with automated Rajju & Nadi Dosha detection.
          </p>
          <div className="text-amber-600 font-bold flex items-center gap-1 mt-auto">
            Match Profiles <span>→</span>
          </div>
        </button>
        </div>
      <div className="border-t pt-10 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Future Modules</p>
        <div className="flex flex-wrap justify-center gap-3 opacity-50">
          {['KP System', 'Nadi', 'Jaimini'].map(item => (
            <span key={item} className="px-4 py-2 bg-slate-200 rounded-full text-[10px] font-bold">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState(null); // Controls Landing Page vs App
  const [isGuestMode, setIsGuestMode] = useState(false);  // Bypasses Firebase
  const [selectedBoy, setSelectedBoy] = useState("");
  const [selectedGirl, setSelectedGirl] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const handleSaveToDatabase = async (data) => {
    // --- 🛡️ GUEST MODE CHECK ---
    if (isGuestMode) {
        console.log("Guest Mode Active: Skipping Firebase Save.");
        return; // Exit the function before it touches Firebase
    }

    try {
        // Your existing Firebase code (e.g., await addDoc(collection...))
        console.log("Data saved to Firebase successfully.");
    } catch (error) {
        console.error("Firebase Error:", error);
    }
};
const onSelectPath = (path, guest) => {
        setIsGuestMode(guest);
        setActiveModule(path);
        // This ensures the correct view is set immediately
        if (path === 'prashna') {
            setViewMode('prashna');
        } else {
            setViewMode('natal');
        }
    };
  const [popupInfo, setPopupInfo] = useState(null); 
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [mantraLoading, setMantraLoading] = useState(false);
  const [mantraResult, setMantraResult] = useState(null);
  const [dreamInput, setDreamInput] = useState('');
  const [dreamLoading, setDreamLoading] = useState(false);
  const [dreamResult, setDreamResult] = useState(null);
  const [luckyLoading, setLuckyLoading] = useState(false);
  const [luckyResult, setLuckyResult] = useState(null);
  const prevUserRef = useRef('');

  const [savedProfiles, setSavedProfiles] = useState(() => {
    const local = safeStorage.get('astroClients');
    if (Array.isArray(local)) {
      const valid = local.filter(p => p && typeof p === 'object' && p.name && p.dob);
      if (valid.length > 0) return valid;
    }
    return [{ name: "Master Key", dob: "1954-10-29", tob: "10:50", lat: 22.5, lon: 88.3, tz: 5.5 }];
  });

  const getMatchMoonData = useCallback((profile) => {
    if (!profile?.dob) return null;

    const timeStr = profile.time || profile.tob || '12:00';
    const tz = Number(profile.tzone ?? profile.tz ?? 5.5);
    const lat = Number(profile.lat ?? 17.3850);
    const lon = Number(profile.lon ?? 78.4867);
    const [y, m, d] = String(profile.dob).split('-').map(Number);
    const [hr, min] = String(timeStr).split(':').map(Number);

    if (![y, m, d, hr, min, tz, lat, lon].every(Number.isFinite)) return null;

    const birthDate = new Date(Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000));
    const positions = OfflineEphemeris.getPositions(birthDate, lat, lon);
    const moon = positions.planets.find(p => p.planet === 'Moon');
    if (!moon) return null;

    const nakSize = 40 / 3;
    const nakExact = moon.fullDegree / nakSize;
    const nakIndex = Math.floor(nakExact) % 27;

    return {
      degree: moon.fullDegree,
      rasiIndex: moon.rasiIndex,
      rasi: safeStr(AstroEngine.SIDEREAL_RASIS[moon.rasiIndex], ' ') || AstroEngine.SIDEREAL_RASIS[moon.rasiIndex],
      nakIndex,
      nakshatra: AstroEngine.NAKSHATRAS[nakIndex],
      pada: Math.floor((nakExact - Math.floor(nakExact)) * 4) + 1
    };
  }, []);

  const handleCalculateMatch = useCallback(() => {
    const boy = savedProfiles.find(p => p?.name === selectedBoy);
    const girl = savedProfiles.find(p => p?.name === selectedGirl);

    if (!boy || !girl) {
      alert("Please select both profiles for AstroMatch.");
      return;
    }

    const boyMoon = getMatchMoonData(boy);
    const girlMoon = getMatchMoonData(girl);

    if (!boyMoon || !girlMoon) {
      alert("Unable to calculate one of the Moon positions. Please check date, time, latitude, longitude, and timezone in both profiles.");
      return;
    }

    const nakDistance = (from, to) => ((to - from + 27) % 27) + 1;
    const rasiDistance = (from, to) => ((to - from + 12) % 12) + 1;
    const boyFromGirlNak = nakDistance(girlMoon.nakIndex, boyMoon.nakIndex);
    const boyFromGirlRasi = rasiDistance(girlMoon.rasiIndex, boyMoon.rasiIndex);
    const girlFromBoyRasi = rasiDistance(boyMoon.rasiIndex, girlMoon.rasiIndex);

    const gana = ['Deva','Manushya','Rakshasa','Manushya','Manushya','Manushya','Deva','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
    const rajju = ['Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada'];
    const nadi = (idx) => idx % 3;
    const varnaRank = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
    const vedhaPairs = [[0,18],[1,17],[2,16],[3,15],[4,23],[5,22],[6,21],[7,20],[8,19],[9,26],[10,25],[11,24]];
    const vedhaBad = vedhaPairs.some(([a, b]) => (
      (boyMoon.nakIndex === a && girlMoon.nakIndex === b) ||
      (boyMoon.nakIndex === b && girlMoon.nakIndex === a)
    ));

    const lords = AstroEngine.RASHI_LORDS;
    const friendships = {
      Sun: ['Moon', 'Mars', 'Jupiter'],
      Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'],
      Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'],
      Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus']
    };
    const boyLord = lords[boyMoon.rasiIndex];
    const girlLord = lords[girlMoon.rasiIndex];
    const areFriends = boyLord === girlLord || friendships[boyLord]?.includes(girlLord) || friendships[girlLord]?.includes(boyLord);

    const badBhakoot = (
      (boyFromGirlRasi === 2 && girlFromBoyRasi === 12) ||
      (boyFromGirlRasi === 12 && girlFromBoyRasi === 2) ||
      (boyFromGirlRasi === 6 && girlFromBoyRasi === 8) ||
      (boyFromGirlRasi === 8 && girlFromBoyRasi === 6) ||
      (boyFromGirlRasi === 5 && girlFromBoyRasi === 9) ||
      (boyFromGirlRasi === 9 && girlFromBoyRasi === 5)
    );

    const scores = {
      dina: [2, 4, 6, 8, 9].includes(boyFromGirlNak % 9 || 9) ? 3 : 0,
      gana: gana[boyMoon.nakIndex] === gana[girlMoon.nakIndex] ? 6 : (gana[boyMoon.nakIndex] === 'Rakshasa' || gana[girlMoon.nakIndex] === 'Rakshasa' ? 1 : 5),
      yoni: boyMoon.nakIndex === girlMoon.nakIndex ? 4 : (Math.abs(boyMoon.nakIndex - girlMoon.nakIndex) % 3 === 0 ? 3 : 2),
      bhakoot: badBhakoot ? 0 : 7,
      maitri: areFriends ? 2 : 1,
      rajju: rajju[boyMoon.nakIndex] === rajju[girlMoon.nakIndex] ? 0 : 7,
      vedha: vedhaBad ? 0 : 3,
      vashya: boyMoon.rasiIndex === girlMoon.rasiIndex || Math.abs(boyMoon.rasiIndex - girlMoon.rasiIndex) === 1 ? 2 : 1,
      mahendra: [4, 7, 10, 13, 16, 19, 22, 25].includes(boyFromGirlNak) ? 4 : 0,
      striDirgha: boyFromGirlNak >= 14 ? 3 : 0,
      nadi: nadi(boyMoon.nakIndex) === nadi(girlMoon.nakIndex) ? 0 : 8,
      varna: varnaRank[boyMoon.rasiIndex] >= varnaRank[girlMoon.rasiIndex] ? 1 : 0
    };

    setMatchResult({
      boy,
      girl,
      boyMoon,
      girlMoon,
      scores,
      totalScore: Object.values(scores).reduce((sum, score) => sum + score, 0)
    });
  }, [getMatchMoonData, savedProfiles, selectedBoy, selectedGirl]);

  // 🔐 GOOGLE SIGN-IN FUNCTION
  const handleGoogleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => console.log(`✅ Welcome, ${result.user.displayName}!`))
      .catch((error) => console.error("❌ Google Login Failed", error));
  };

  // ☁️ CLOUD SYNC: Automatically pulls profiles from Firebase on startup
  useEffect(() => {
    if (db && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          console.log("☁️ Firebase: Syncing with Cloud...");
          const profilesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'profiles');
          
          onSnapshot(profilesRef, (snapshot) => {
            const cloudProfiles = snapshot.docs.map(doc => doc.data());
            if (cloudProfiles.length > 0) {
              console.log(`✅ Cloud synced ${cloudProfiles.length} profiles!`);
              setSavedProfiles(cloudProfiles);
              // Keeps browser hard drive updated too
              window.localStorage.setItem('astroClients', JSON.stringify(cloudProfiles));
            }
          });
        } else {
          // Log in if not already connected
          console.log("🔒 Waiting for Google Sign-In...");
        }
      });
      return () => unsubscribe();
    }
  }, [db, auth]);

  // Always keep LocalStorage perfectly in sync with React State
  useEffect(() => {
     safeStorage.set('astroClients', savedProfiles);
  }, [savedProfiles]);

  const [userData, setUserData] = useState(() => {
    const sf = safeStorage.get('astroFormData');
    return (sf && typeof sf === 'object' && sf.name) ? { formData: sf, geminiKey: safeStorage.get('geminiApiKey') || '' } : null;
  });

  const [time, setTime] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  const [viewMode, setViewMode] = useState('natal'); 
  
  const [prashnaDetails, setPrashnaDetails] = useState({
  question: '',
  date: '', 
  time: '',
  city: '',
  lat: '',
  lon: '',
  tzone: ''
});
const [showPrashnaChart, setShowPrashnaChart] = useState(false);
const [prashnaChartData, setPrashnaChartData] = useState(null);

// PASTE THE FUNCTION RIGHT HERE:
const searchPrashnaLocation = async () => {
    if (!prashnaDetails.city) return;
    
    console.log("Searching for:", prashnaDetails.city);
    
    try {
        // Step 1: Get Lat & Lon from OpenStreetMap (Grabbing the top 1 result)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(prashnaDetails.city)}&format=json&limit=1`);
        const data = await res.json();

        if (data && data.length > 0) {
            const loc = data[0];
            const lat = parseFloat(loc.lat);
            const lon = parseFloat(loc.lon);
            let tzone = "5.5"; // Default fallback to IST

            // Step 2: Get Timezone from Open-Meteo using the new Lat/Lon
            try {
                const tzRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
                const tzData = await tzRes.json();
                if (tzData && tzData.utc_offset_seconds !== undefined) {
                    tzone = (tzData.utc_offset_seconds / 3600).toString();
                }
            } catch (e) {
                console.error("Timezone fetch failed", e);
            }

            // Step 3: Automatically fill the Prashna form fields
            setPrashnaDetails({
                ...prashnaDetails,
                city: loc.name || loc.display_name.split(',')[0], // Updates to the clean city name
                lat: lat.toFixed(4),
                lon: lon.toFixed(4),
                tzone: tzone
            });
            
        } else {
            alert("Location not found. Please try adding the state or country (e.g., 'London, UK').");
        }
    } catch (error) {
        console.error("Search failed", error);
        alert("Network error while searching for location.");
    }
};
const getOverallPrashnaReading = async () => {
        if (!prashnaDetails?.question) return;

        // 1. Open the popup in a loading state
        setPopupInfo({ 
            title: "Overall Prashna Analysis", 
            subtitle: prashnaDetails.question, 
            text: "Analyzing the complete Horary chart dynamics...", 
            isLoadingAI: true, 
            aiText: null,
            aspectData: [],
            conjunctionData: null,
            exchangedData: null
        });

        // 2. Translate the chart math into text for Gemini
        const lIndex = prashnaChartData.lagnaIndex;
        const lagnaName = AstroEngine.SIDEREAL_RASIS[isNaN(lIndex) ? 0 : lIndex];

        const planetPositions = prashnaChartData.planets.map(p => {
             const rasiName = AstroEngine.SIDEREAL_RASIS[p.rasiIndex];
             const houseNum = ((p.rasiIndex - lIndex + 12) % 12) + 1;
             return `${p.planet} in ${rasiName} (House ${houseNum})`;
        }).join(', ');

        // 3. Write the Master Prashna Prompt
        const prompt = `CRITICAL INSTRUCTION: You are acting as a Master Vedic Astrologer analyzing a complete PRASHNA (Horary) chart.
THE CLIENT'S EXACT QUESTION IS: "${prashnaDetails.question}"

Here are the mathematical details of the Prashna chart cast for this exact moment:
- Ascendant (Lagna): ${lagnaName}
- Planetary Positions: ${planetPositions}

RULES FOR THIS READING:
1. Do NOT give a general life prediction.
2. Identify the 'Karya Bhava' (the house governing the query) based on the question.
3. Analyze the condition of the Lagna Lord (representing the querent) and the Karyaesh (Lord of the question).
4. Analyze the Moon's position and application.
5. Provide a direct, definitive answer to the question based on these classical Prashna Shastra principles.`;

        // 4. Send to Gemini
        const aiResponse = await AstroEngine.callGemini(
            prompt, 
            userData?.geminiKey, 
            userData?.formData?.astroLevel || 'expert', 
            userData?.formData?.language || 'English'
        );
        
        // 5. Update the popup with the final AI text
        setPopupInfo(prev => prev ? { 
            ...prev, 
            aiText: aiResponse?.text || aiResponse?.error || "Error generating reading.", 
            isLoadingAI: false 
        } : null);
    };
const generatePrashnaChart = () => {
    if (!prashnaDetails.date || !prashnaDetails.time) {
        alert("Please ensure Date and Time are filled out.");
        return;
    }

    console.log("Generating Prashna Chart...");

    // 1. Format the date and time
    const [y, m, d] = prashnaDetails.date.split('-').map(Number);
    const [hr, min] = prashnaDetails.time.split(':').map(Number);
    
    // 2. Auto-sync from the Client's CURRENT LOCATION (Gochara/Transits)
    // It prioritizes current location, but falls back to birth location if missing
    const form = userData?.formData || {};
    const tz = Number(form.currentTzone || form.tzone || 5.5);
    const finalLat = parseFloat(form.currentLat || form.lat || 17.3850); 
    const finalLon = parseFloat(form.currentLon || form.lon || 78.4867);
    const finalCity = form.currentCity || form.city || "Hyderabad";

    const pDate = new Date(Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000));

    // 3. Run the Ephemeris calculations
    const prashnaPositions = OfflineEphemeris.getPositions(pDate, finalLat, finalLon);

    // 4. Save to Prashna state
    setPrashnaChartData({
        planets: prashnaPositions.planets,
        lagnaIndex: prashnaPositions.lagnaIndex,
        city: finalCity 
    });

    // 5. Show the chart!
    setShowPrashnaChart(true);
};
  const [subChart, setSubChart] = useState('d9'); 
  const [panchangView, setPanchangView] = useState('transit');
  const [functionalTab, setFunctionalTab] = useState('roles');

  const [currentDasa, setCurrentDasa] = useState({});
  const [upcomingDasas, setUpcomingDasas] = useState([]);
  const [transits, setTransits] = useState([]);
  const [natalPlanets, setNatalPlanets] = useState([]);
  const [lagnaIndex, setLagnaIndex] = useState(0);
  const [lagnaDegree, setLagnaDegree] = useState(0); 
  const [natalMoonDegree, setNatalMoonDegree] = useState(0);
  const [sunTimes, setSunTimes] = useState(null);
  const [shadbalaScores, setShadbalaScores] = useState(null);
  const [natalPanchang, setNatalPanchang] = useState(null);

  // Initialize Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
           await signInWithCustomToken(auth, __initial_auth_token);
        } else {
         //  await signInAnonymously(auth);
        }
      } catch (e) {
          console.error("Auth Init Error:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sync Profiles from Firebase (Strict Firebase rules followed)
  useEffect(() => {
    if (!user || !db) return;
    const profilesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'profiles');
    const unsubscribe = onSnapshot(profilesRef, (snapshot) => {
      const loaded = [];
      snapshot.forEach(d => loaded.push(d.data()));
      if (loaded.length > 0) {
        setSavedProfiles(loaded);
        safeStorage.set('astroClients', loaded);
      }
    }, (error) => {
       console.error("Firestore Listen Error:", error);
    });
    return () => unsubscribe();
  }, [user]); 

  // Compute Natal Positions
  useEffect(() => {
     if (!userData || !userData.formData) return;
     const dobStr = userData.formData.dob || '2000-01-01';
     const timeStr = userData.formData.time || '12:00';
     const tz = Number(userData.formData.tzone) || 5.5;
     
     const [y, m, d] = dobStr.split('-').map(Number);
     const [hr, min] = timeStr.split(':').map(Number);
     const bDate = new Date(Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000));
     
     const natalPositions = OfflineEphemeris.getPositions(bDate, userData.formData.lat, userData.formData.lon);
     setNatalPlanets(natalPositions.planets);
     setLagnaIndex(natalPositions.lagnaIndex);
     setLagnaDegree(natalPositions.lagnaDegree);
     setNatalMoonDegree(natalPositions.moonDegree);

     const sTimesNatal = OfflineEphemeris.getSunTimes(bDate, userData.formData.lat, userData.formData.lon, userData.formData.tzone);
     setShadbalaScores(AstroEngine.calculateShadbala(natalPositions.planets, natalPositions.lagnaDegree, bDate, sTimesNatal));

     const sunNatal = natalPositions.planets.find(p => p && p.planet === 'Sun');
     const moonNatal = natalPositions.planets.find(p => p && p.planet === 'Moon');
     if (sunNatal && moonNatal) {
         setNatalPanchang(AstroEngine.getPanchang(sunNatal.fullDegree, moonNatal.fullDegree, new Date(`${dobStr}T12:00:00`)));
     }
  }, [userData?.formData]);

  // Compute Transit & Dasha Positions
  useEffect(() => {
     if (!userData || !userData.formData) return;
     const tLat = userData.formData.currentLat || userData.formData.lat;
     const tLon = userData.formData.currentLon || userData.formData.lon;
     const tZone = userData.formData.currentTzone || userData.formData.tzone;
     
     const tp = OfflineEphemeris.getPositions(time, tLat, tLon);
     setTransits(tp.planets);

     const dasaResult = AstroEngine.getDasaData(userData.formData, time, natalMoonDegree);
     setCurrentDasa(dasaResult.current);
     setUpcomingDasas(dasaResult.upcoming);
     setSunTimes(OfflineEphemeris.getSunTimes(time, tLat, tLon, tZone));
  }, [userData?.formData, time, natalMoonDegree]);

  // Reset UI specific state when User profile swaps
  useEffect(() => {
    if (userData && userData.formData) { 
      const currentUserKey = `${userData.formData.name}-${userData.formData.dob}`;
      const isNewUser = currentUserKey !== prevUserRef.current;
      if (isNewUser) {
         setQaResult(null); setMantraResult(null); setDreamResult(null); setLuckyResult(null); setPanchangView('transit'); setFunctionalTab('roles');
         prevUserRef.current = currentUserKey;
      }
    }
  }, [userData]);

// Fetch real-time IP location for Prashna when entering Guest Mode
  useEffect(() => {
    if (isGuestMode) {
      fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
          console.log("Guest Location synced:", data.city);
          
          // Update the Prashna Chart Data state with real-time location
          // Update the main UserData state so the UI and Prashna math see it
          setUserData(prev => ({
            ...prev,
            formData: {
              ...prev?.formData,
              currentCity: data.city,
              city: data.city,
              currentLat: data.latitude,
              currentLon: data.longitude,
              currentTzone: parseFloat(data.utc_offset) || 5.5
            }
          }));
          }) // <--- Make sure this line closes the .then block cleanly before the .catch
        .catch(error => {
          console.error("Could not fetch IP location:", error);
        });
    }
  }, [isGuestMode]);

  const handleSaveProfile = async (formData) => {
    if (!formData || !formData.name) return;
    
    console.log("🛠️ Step 1: Starting save for:", formData.name);
    
    // 1. LOCAL SAVE
    let currentList = [];
    try {
        const stored = window.localStorage.getItem('astroClients');
        if (stored) currentList = JSON.parse(stored);
    } catch(e) {}
    
    const idx = currentList.findIndex(p => p.name === formData.name);
    if (idx >= 0) currentList[idx] = formData;
    else currentList.push(formData);
    
    window.localStorage.setItem('astroClients', JSON.stringify(currentList));
    setSavedProfiles([...currentList]);
    console.log("🛠️ Step 2: Local storage updated.");

    // 2. CLOUD SAVE
    if (typeof db !== 'undefined') {
        console.log("🛠️ Step 3: Firebase found! Attempting cloud save...");
        try {
            if (!auth.currentUser) {
                console.log("🛠️ Step 4: Signing in anonymously...");
                await signInAnonymously(auth);
            }
            const uid = auth.currentUser.uid;
            const profileId = encodeURIComponent(`${formData.name}_${formData.dob}`);
            const docRef = doc(db, 'artifacts', appId, 'users', uid, 'profiles', profileId);
            
            await setDoc(docRef, formData);
            console.log("🔥 STEP 5: CLOUD SAVE SUCCESSFUL!");
        } catch (error) {
            console.error("❌ Firebase Error:", error);
        }
    } else {
        console.error("❌ Error: 'db' variable not found!");
    }
  };
    
    
  
  const handleDeleteProfile = async (formData) => {
    if (!formData || !formData.name) return;
    const updated = savedProfiles.filter(p => p && p.name && !(p.name === formData.name && p.dob === formData.dob));
    setSavedProfiles(updated.length > 0 ? updated : HARDCODED_PROFILES);
    safeStorage.set('astroClients', updated.length > 0 ? updated : HARDCODED_PROFILES);
    
    if (user && db) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', encodeURIComponent(`${formData.name}_${formData.dob}`)));
        } catch (e) {
            console.error("Error deleting profile from cloud:", e);
        }
    }
  };

  const handleTopBarProfileSwitch = (e) => {
    const idx = parseInt(e.target.value);
    if(idx >= 0 && savedProfiles[idx]) { setUserData({ ...userData, formData: savedProfiles[idx] }); safeStorage.set('astroFormData', savedProfiles[idx]); }
  };

  const getShadbalaCtxStr = (planetNamesArray) => {
      if (!shadbalaScores) return '';
      let strengths = [];
      planetNamesArray.forEach(p => {
          if (shadbalaScores[p]) {
             let qual = shadbalaScores[p].percentage > 120 ? 'high' : (shadbalaScores[p].percentage < 80 ? 'weak' : 'moderate');
             strengths.push(`${p} has ${qual} Shadbala (${shadbalaScores[p].percentage}%)`);
          }
      });
      return strengths.length > 0 ? ` Planetary Strengths: ${strengths.join(', ')}.` : '';
  };

  const getFunctionalCtxStr = () => {
      if (isNaN(lagnaIndex)) return '';
      const fn = AstroEngine.FUNCTIONAL_ROLES[lagnaIndex];
      const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[lagnaIndex], ' ');
      return `\n\nFUNCTIONAL NATURE (For ${lagnaName} Ascendant): Benefics are ${fn.ben.join(', ')}. Malefics are ${fn.mal.join(', ')}. MARAKA is ${fn.mar.join(' and ')}. BADHAKA is ${fn.bad.join(', ')}. Factor this heavily into the prediction.`;
  };

  const buildContextString = (fd) => {
      let parts = [];
      if (fd.maritalStatus && fd.maritalStatus !== 'Unknown') parts.push(`Marital Status: ${fd.maritalStatus}`);
      if (fd.careerStatus && fd.careerStatus !== 'Unknown') parts.push(`Career Phase: ${fd.careerStatus}`);
      if (fd.lifeContext) parts.push(`User Notes: ${fd.lifeContext}`);
      let baseCtx = parts.length > 0 ? `\n\nCRITICAL CONTEXT: The user's actual life situation is: [${parts.join(' | ')}]. You MUST tailor your prediction to fit this reality perfectly.` : '';
      
      // AI YOGA AWARENESS ENGINE
      let yogaCtx = '';
      if (fd.astroLevel === 'expert' && !isNaN(lagnaIndex) && natalPlanets.length > 0) {
          const aiYogas = AstroEngine.calculateYogas(natalPlanets, lagnaIndex);
          if (aiYogas.length > 0) {
              const yNames = aiYogas.map(y => `${y.name} (${y.desc})`).join(' | ');
              yogaCtx = `\n\nDETECTED YOGAS: The user has the following powerful classical Yogas in their birth chart: [${yNames}]. You MUST seamlessly weave the implications of these Yogas into your reading where relevant.`;
          }
      }

      return baseCtx + getFunctionalCtxStr() + yogaCtx;
  };

  const handleSymbolClick = async (clickData) => {
    const { title, subtitle, text, promptData } = clickData;
    let aspectData = [], exchangeData = null, conjunctionData = null;
    const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');

    if (promptData && promptData.chartPlanets) {
       const targetArray = promptData.chartPlanets; 
       const conjuncts = targetArray.filter(p => safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], ' ') === promptData.rashi).map(p => p.planet);
       if (conjuncts.length > 1) {
           conjunctionData = { planets: conjuncts, type: promptData.type, rashi: promptData.rashi, house: promptData.house };
       }

       const targetLord = AstroEngine.RASHI_LORDS[promptData.rasiIndex];
       targetArray.forEach(p => {
           if (p.planet === promptData.planet) return;
           const relHouse = ((promptData.rasiIndex - p.rasiIndex + 12) % 12) + 1;
           if (relHouse === 7) aspectData.push(p.planet);
           else if (p.planet === 'Mars' && (relHouse === 4 || relHouse === 8)) aspectData.push(p.planet);
           else if (p.planet === 'Jupiter' && (relHouse === 5 || relHouse === 9)) aspectData.push(p.planet);
           else if (p.planet === 'Saturn' && (relHouse === 3 || relHouse === 10)) aspectData.push(p.planet);
           
           if (p.planet === targetLord && AstroEngine.RASHI_LORDS[p.rasiIndex] === promptData.planet) {
               exchangeData = p.planet;
           }
       });
    }

    setPopupInfo({ title, subtitle, text, isLoadingAI: true, aiText: null, conjunctionData, aspectData, exchangeData });

    if (promptData) {
      const { type, planet, rashi, house, entity } = promptData;
      let prompt = '';
      const userName = userData.formData.name || 'This person';
      const dasaContext = currentDasa.mahadasha ? `They are currently in a ${currentDasa.mahadasha} Mahadasha and ${currentDasa.antardasha} Antardasha.` : '';
      const retroStr = promptData.isRetro ? ' (Retrograde / Vakri)' : '';
      const personalCtx = buildContextString(userData.formData);
      const sbStr = (type !== 'transit' && type !== 'panchang' && type !== 'yoga' && type !== 'shadbala' && type !== 'sav_house') ? getShadbalaCtxStr([planet]) : '';
      
      let pacContext = '';
      if (aspectData.length > 0) pacContext += ` Receives Drishti (Aspect) from ${aspectData.join(' and ')}.`;
      if (exchangeData) pacContext += ` Forms a Maha Parivartana Yoga (Mutual Exchange of Signs) with ${exchangeData}.`;
      if (pacContext) pacContext += ` Explicitly mention and analyze how this aspect or exchange modifies the results.`;

      let avContext = '';
      if (promptData.avData && planet && ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].includes(planet)) {
          const sav = promptData.avData.SAV[promptData.rasiIndex];
          const bav = promptData.avData.BAV[planet][promptData.rasiIndex];
          avContext = `\nASHTAKAVARGA INSIGHT: The sign of ${rashi} has a Sarvashtakavarga (SAV) score of ${sav} (28 is average). ${planet}'s specific Bhinnashtakavarga (BAV) score here is ${bav} out of 8. You MUST use these exact mathematical scores to predict if this specific placement or transit will yield highly positive, average, or negative results.`;
      }

      if (type === 'natal') {
         prompt = `Analyze the birth chart placement for ${userName}. ${planet}${retroStr} is in ${rashi} in the ${house} House.${sbStr}${pacContext}${avContext} ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining what this placement means for their personality and life path. Keep it highly insightful.${personalCtx}`;
      } else if (type === 'transit') {
         prompt = `Analyze the current planetary transit for ${userName}. Transit ${planet}${retroStr} is currently moving through ${rashi} in their ${house} House.${pacContext}${avContext} ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining what this current transit brings for them right now.${personalCtx}`;
      } else if (['d9','d10','d6','d20'].includes(type)) {
         prompt = `Analyze the ${type.toUpperCase()} chart placement for ${userName}. ${planet}${retroStr} is in ${rashi} in the ${house} House of the ${type.toUpperCase()} chart.${sbStr}${pacContext} ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining what this specific placement reveals.${personalCtx}`;
      } else if (type === 'house') {
         const housePlanets = transits.filter(p => (((p.rasiIndex - (isNaN(lagnaIndex) ? 0 : lagnaIndex) + 12) % 12) + 1) === house).map(p => p.planet);
         const pStr = housePlanets.length > 0 ? `Current transiting planets conjunct here: ${housePlanets.join(', ')}.` : 'No major transiting planets are currently in this house.';
         prompt = `Analyze the astrological house for ${userName}. Their ${house} House falls in the sign of ${rashi}. ${pStr} ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining the significance of this specific house/sign/transit combination for their life.${personalCtx}`;
      } else if (type === 'rashi') {
         prompt = `Analyze the zodiac sign placement for ${userName}. The sign of ${rashi} occupies their ${house} House. ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining how this sign's energy manifests in that specific area of their life.${personalCtx}`;
      } else if (type === 'nakshatra') {
         prompt = `Analyze the Nakshatra (Lunar Mansion) influence for ${userName}. Focus on the ${entity} Nakshatra. ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining the deeper spiritual and psychological meaning of this Nakshatra for them.${personalCtx}`;
      } else if (type === 'panchang') {
         const pType = promptData.panchangType === 'natal' ? 'birth' : 'current transit';
         prompt = `Analyze the ${pType} Panchang for ${userName}. Vara (Day): ${promptData.data.vara}, Tithi (Phase): ${promptData.data.tithi}, Nakshatra: ${promptData.data.nakshatra}, Yoga: ${promptData.data.yoga}, Karana: ${promptData.data.karana}. ${dasaContext} Write a 3-sentence personalized Vedic astrology prediction explaining how these 5 temporal elements shape their ${pType === 'birth' ? 'core karma and life path' : 'current experience and immediate future'}.${personalCtx}`;
      } else if (type === 'yoga') {
          const involvedStr = Array.isArray(promptData.involvedPlanets) ? promptData.involvedPlanets.join(', ') : 'unknown planets';
          const pmpSbStr = promptData.yogaType === 'Mahapurusha' ? getShadbalaCtxStr(promptData.involvedPlanets) : '';
          const pacDetails = promptData.involvedPlanets.map(pName => {
              const pDetails = natalPlanets.find(p => p.planet === pName);
              if (!pDetails) return '';
              const aspectors = AstroEngine.GRAHAS.filter(a => {
                  if (a === pName || a === 'Rahu' || a === 'Ketu') return false;
                  const aDetails = natalPlanets.find(pd => pd.planet === a);
                  if (!aDetails) return false;
                  const relHouse = ((pDetails.rasiIndex - aDetails.rasiIndex + 12) % 12) + 1;
                  return relHouse === 7 || (a === 'Mars' && [4,8].includes(relHouse)) || (a === 'Jupiter' && [5,9].includes(relHouse)) || (a === 'Saturn' && [3,10].includes(relHouse));
              });
              return aspectors.length > 0 ? `${pName} receives Drishti from ${aspectors.join(', ')}.` : '';
          }).join(' ');
          prompt = `Analyze the Classical Vedic Yoga called ${title} for ${userName}. Description: "${text}". Chart Specifics: Formed by ${involvedStr}. ${pacDetails} ${pmpSbStr} ${dasaContext} Act as an expert Parashari Astrologer. Don't give a generic definition. Instead, write a highly personalized 3-4 sentence explanation on what this means specifically for them. ${personalCtx}`;
      } else if (type === 'functional') {
          const { role } = promptData;
          prompt = `Analyze the functional dignity for ${userName} (${lagnaName} Ascendant). ${planet} acts as a Functional ${role}. ${getShadbalaCtxStr([planet])} ${dasaContext} Act as an expert Parashari Astrologer. Write a highly personalized 3-4 sentence prediction explaining how ${planet}'s specific functional role (${role}) shapes their life path and current experiences. ${personalCtx}`;
      } else if (type === 'shadbala') {
          const { score } = promptData;
          const strLevel = score > 120 ? 'high' : (score < 80 ? 'low' : 'moderate');
          prompt = `Analyze the Shadbala (planetary strength) for ${userName} (${lagnaName} Ascendant). ${planet} has a ${strLevel} strength of ${score}%. ${dasaContext} Act as an expert Parashari Astrologer. Write a highly personalized 3-4 sentence prediction explaining how this specific strength level of ${planet} physically and psychologically manifests in their life right now. ${personalCtx}`;
      } else if (type === 'sav_house') {
          prompt = `Analyze the Ashtakavarga strength for ${userName}. Their ${house} House (${rashi}) has a Sarvashtakavarga (SAV) score of ${promptData.savScore} (28 is the average baseline). ${dasaContext} Act as an expert Parashari Astrologer. Write a highly personalized 3-4 sentence prediction explaining how this specific mathematical point total impacts their overall success, ease of results, and struggles in the matters of the ${house} house. ${personalCtx}`;
      }
// --- 🔮 PRASHNA AI OVERRIDE ---
    if (viewMode === 'prashna' && prashnaDetails?.question) {
        prompt = `CRITICAL INSTRUCTION: You are analyzing a PRASHNA (Horary) chart for the current transit moment, NOT a natal birth chart. 
THE CLIENT'S EXACT QUESTION IS: "${prashnaDetails.question}"

RULES FOR THIS READING:
1. Do NOT give a general life prediction or personality reading. 
2. Analyze this specific clicked element strictly in the context of the client's question. 
3. Based on Prashna Shastra rules, identify if this clicked house/planet relates to the 'Karya Bhava' (the house governing the query). Consider the Lagna Lord (the querent) and the Moon's application.
4. Conclude with a focused, direct perspective on their question: "${prashnaDetails.question}".\n\n` + prompt;
    }
    // ------------------------------
      if (prompt) {
         const aiResponse = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
         setPopupInfo(prev => prev ? ({ ...prev, aiText: aiResponse.text || aiResponse.error, isLoadingAI: false, error: aiResponse.error ? aiResponse.error : null }) : null);
      }
    } else {
      setPopupInfo(prev => prev ? ({ ...prev, isLoadingAI: false }) : null);
    }
  };

  const handleConjunctionAnalysis = async () => {
    if (!popupInfo || !popupInfo.conjunctionData) return;
    
    const { planets, type, rashi, house } = popupInfo.conjunctionData;
    const currentAspects = popupInfo.aspectData || [];
    const currentExchange = popupInfo.exchangeData;

    setPopupInfo(prev => prev ? ({ 
       ...prev, isLoadingAI: true, aiText: null, conjunctionData: null, 
       title: `${planets.join(' + ')}`, 
       subtitle: `Conjunction in ${rashi}` 
    }) : null);
    
    const userName = userData.formData.name || 'This person';
    const dasaContext = currentDasa.mahadasha ? `Current Dasha: ${currentDasa.mahadasha} MD, ${currentDasa.antardasha} AD.` : '';
    const personalCtx = buildContextString(userData.formData);
    const sbStr = (type !== 'transit') ? getShadbalaCtxStr(planets) : '';
    
    let pacContext = '';
    if (currentAspects.length > 0) pacContext += ` This conjunction receives Drishti (Aspect) from ${currentAspects.join(' and ')}.`;
    if (currentExchange) pacContext += ` It also forms a Parivartana Yoga (Exchange) with ${currentExchange}.`;
    if (pacContext) pacContext += ` Explicitly analyze how these external influences (aspects/exchanges) modify the conjunction.`;
    
    const chartLabels = { 'd9': 'Navamsha (D9)', 'd10': 'Dashamsha (D10)', 'd6': 'Shashthamsha (D6)', 'd20': 'Vimshamsha (D20)', 'transit': 'Transit', 'natal': 'Natal' };
    const chartTypeName = chartLabels[type] || 'Natal';
    
    const prompt = `Analyze the ${chartTypeName} conjunction (Stellium/Yuti) of ${planets.join(', ')} in ${rashi} (House ${house}) for ${userName}.${sbStr}${pacContext} ${dasaContext} Write a 3-4 sentence personalized Vedic astrology prediction explaining how these combined planetary energies interact and manifest in their life right now. Keep it deeply insightful.${personalCtx}`;

    const aiResponse = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
    setPopupInfo(prev => prev ? ({ ...prev, aiText: aiResponse.text || aiResponse.error, isLoadingAI: false, error: aiResponse.error ? aiResponse.error : null }) : null);
  };

  const handleAskAI = async (predefinedTopic = null) => {
    const question = typeof predefinedTopic === 'string' ? predefinedTopic : qaInput;
    if (!question) return;
    setQaLoading(true); setQaResult(null);
    const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');
    const natalStr = natalPlanets.map(p => `${p.planet}${p.isRetro ? '(R)' : ''} in ${safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], ' ')}`).join(', ');
    const transitStr = transits.map(p => `${p.planet}${p.isRetro ? '(R)' : ''} in ${safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], '')}`).join(', ');

    let savContext = "";
    if (ashtakavargaData && ashtakavargaData.sav) {
        savContext = ` SAV Scores (Houses 1-12 starting from Ascendant): ${ashtakavargaData.sav.join(', ')}.`;
    }

    const prompt = `Client Name: ${userData.formData.name || 'User'}. Ascendant: ${lagnaName}. Dasha: ${currentDasa.mahadasha} MD, ${currentDasa.antardasha} AD. Natal: ${natalStr}. Transit: ${transitStr}.${savContext} Question: ${question}`;
    const response = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
    setQaResult(response.error ? { type: 'error', text: response.error } : { type: 'success', text: response.text, topic: question });
    setQaLoading(false); if (typeof predefinedTopic !== 'string') setQaInput('');
  };

  const handleGenerateMantra = async () => {
    setMantraLoading(true); setMantraResult(null);
    const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');
    const prompt = `Client Name: ${userData.formData.name || 'User'}. Ascendant: ${lagnaName}. Current Dasha: ${currentDasa.mahadasha}. Generate a highly personalized daily prediction, a specific Vedic remedy (Upaya), and practical precautions for them today based on these energies. Format as a short, uplifting 3-4 sentence message.${buildContextString(userData.formData)}`;
    const response = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
    setMantraResult(response.error ? { type: 'error', text: response.error } : { type: 'success', text: response.text });
    setMantraLoading(false);
  };

  const handleDreamDecode = async () => {
    if (!dreamInput) return;
    setDreamLoading(true); setDreamResult(null);
    const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');
    const transitStr = transits.map(p => `${p.planet} in ${safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], ' ')}`).join(', ');
    const prompt = `Client Name: ${userData.formData.name || 'User'}. Ascendant: ${lagnaName}. Transits: ${transitStr}. Client had this dream: "${dreamInput}". Act as an expert Vedic astrologer. Decode this dream spiritually and astrologically. Keep it to 3 to 4 insightful sentences.${buildContextString(userData.formData)}`;
    const response = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
    setDreamResult(response.error ? { type: 'error', text: response.error } : { type: 'success', text: response.text });
    setDreamLoading(false); setDreamInput('');
  };

  const handleLuckyElements = async () => {
    setLuckyLoading(true); setLuckyResult(null);
    const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');
    const prompt = `Based strictly on Vedic Astrology principles, suggest 2 lucky colors, 1 lucky gemstone, and an auspicious direction for ${userData.formData.name || 'User'} right now based on their Lagna (${lagnaName}) and Dasa (${currentDasa.mahadasha}). Keep it brief and formatted as a bulleted list.${buildContextString(userData.formData)}`;
    const response = await AstroEngine.callGemini(prompt, userData.geminiKey, userData.formData.astroLevel, userData.formData.language);
    setLuckyResult(response.error ? { type: 'error', text: response.error } : { type: 'success', text: response.text });
    setLuckyLoading(false);
  };

  // Safe Hooks Execution
  const d9Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: AstroEngine.getD9RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d10Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: AstroEngine.getD10RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d6Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: AstroEngine.getD6RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d20Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: AstroEngine.getD20RasiIndex(p.fullDegree) })), [natalPlanets]);

  const d9LagnaIndex = useMemo(() => AstroEngine.getD9RasiIndex(lagnaDegree), [lagnaDegree]);
  const d10LagnaIndex = useMemo(() => AstroEngine.getD10RasiIndex(lagnaDegree), [lagnaDegree]);
  const d6LagnaIndex = useMemo(() => AstroEngine.getD6RasiIndex(lagnaDegree), [lagnaDegree]);
  const d20LagnaIndex = useMemo(() => AstroEngine.getD20RasiIndex(lagnaDegree), [lagnaDegree]);

  const isExpert = userData?.formData?.astroLevel === 'expert';
  const isSouthIndian = userData?.formData?.chartStyle === 'South Indian';

  const detectedYogas = useMemo(() => (!isNaN(lagnaIndex) && natalPlanets.length > 0) ? AstroEngine.calculateYogas(natalPlanets, lagnaIndex) : [], [natalPlanets, lagnaIndex]);
  const ashtakavargaData = useMemo(() => (!isNaN(lagnaIndex) && natalPlanets.length > 0) ? AstroEngine.calculateAshtakavarga(natalPlanets, lagnaIndex) : null, [natalPlanets, lagnaIndex]);

  // Early Return for Auth
  if (!userData || !userData.formData) {
    return <div className="min-h-screen bg-slate-200 font-sans p-4 flex items-center justify-center"><BirthForm onDeleteProfile={handleDeleteProfile} onGoogleLogin={handleGoogleLogin} onSaveProfile={handleSaveProfile} onStartApp={setUserData} savedProfiles={savedProfiles} isLoggedIn={!!auth?.currentUser} /></div>;
  }
  
  // Safe variable assignment after auth
  const sunTransit = transits?.find(p => p.planet === 'Sun');
  const moonTransit = transits?.find(p => p.planet === 'Moon');
  const panchang = (sunTransit && moonTransit && isExpert) ? AstroEngine.getPanchang(sunTransit.fullDegree, moonTransit.fullDegree, time) : null;
  const functionalNature = !isNaN(lagnaIndex) ? AstroEngine.FUNCTIONAL_ROLES[lagnaIndex] : null;

  return (
    <div className="min-h-screen bg-[#ececd6] text-slate-800 font-sans flex flex-col">
      {!activeModule ? (
        /* PATH A: SHOW LANDING PAGE */
        <UniversalGateway onSelectPath={onSelectPath} />
      ) : (
        /* PATH B: SHOW ACTUAL APP CONTENT */
        <>
          {/* NAVIGATION BAR */}
          <div className="p-3 flex items-center justify-between bg-white/60 backdrop-blur-md border-b border-slate-300 sticky top-0 z-50">
            <button 
              onClick={() => setActiveModule(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 transition-all flex items-center gap-1 uppercase tracking-tighter"
            >
              ← Back to Hub
            </button>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded">v1.4.0</span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                 {isGuestMode ? "Guest Mode" : "Natal Profile"}
               </span>
            </div>
          </div>

          {/* WRAP YOUR OLD CONTENT HERE */}
          <div className="flex-1">
            {/* 🏹 ASTROMATCH VIEW MODULE ROUTE */}
          {activeModule === 'match' && (
            <div className="max-w-4xl mx-auto p-6 bg-[#fdfde8] text-slate-800 rounded-3xl shadow-xl border border-amber-200/60 mt-4 mb-12">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-amber-900 tracking-tight">DVADASHA KOOT MILAN</h1>
                <p className="text-sm text-amber-700/80 italic mt-1">Advanced 50-Point Compatibility Analysis Engine</p>
              </div>

              {/* Profile Dropdown Selection Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Boy Selection Card */}
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">👦 Boy's Profile Selection</label>
                  <select
                    value={selectedBoy || ""}
                    onChange={(e) => setSelectedBoy(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Boy Profile --</option>
                    {savedProfiles.map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>

                {/* Girl Selection Card */}
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <label className="block text-xs font-bold text-pink-800 uppercase tracking-wider mb-2">👧 Girl's Profile Selection</label>
                  <select
                    value={selectedGirl || ""}
                    onChange={(e) => setSelectedGirl(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-pink-500"
                  >
                    <option value="">-- Choose Girl Profile --</option>
                    {savedProfiles.map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Engine Trigger */}
              <div className="text-center mb-8">
                <button
                  onClick={handleCalculateMatch}
                  disabled={!selectedBoy || !selectedGirl}
                  className="w-full max-w-sm px-8 py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-lg transition-all transform active:scale-[0.98] tracking-wide uppercase text-sm"
                >
                  Calculate Compatibility Score
                </button>
              </div>

              {/* 📊 DYNAMIC 12-KOOT SCOREBOARD DISPLAYER */}
              {matchResult && matchResult.scores && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  
                  {/* Sync Details Subheader Overview */}
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-amber-100 mb-6 shadow-sm text-sm">
                    <div className="border-r border-slate-100 pr-2">
                      <p className="font-bold text-blue-800">👦 {matchResult.boy.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">✨ Rasi: <span className="font-semibold">{matchResult.boyMoon.rasi}</span></p>
                      <p className="text-xs text-slate-600">⭐ Nakshatra: <span className="font-bold text-blue-700">{matchResult.boyMoon.nakshatra}</span> (P-{matchResult.boyMoon.pada})</p>
                    </div>
                    <div className="pl-2">
                      <p className="font-bold text-pink-800">👧 {matchResult.girl.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">✨ Rasi: <span className="font-semibold">{matchResult.girlMoon.rasi}</span></p>
                      <p className="text-xs text-slate-600">⭐ Nakshatra: <span className="font-bold text-pink-700">{matchResult.girlMoon.nakshatra}</span> (P-{matchResult.girlMoon.pada})</p>
                    </div>
                  </div>

                  {/* Comprehensive Total Performance Badge */}
                  <div className="text-center mb-6 bg-white p-4 rounded-2xl border border-amber-200 inline-block mx-auto w-full max-w-xs shadow-sm block">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Harmony Points</p>
                    <p className={`text-4xl font-extrabold mt-1 ${matchResult.totalScore >= 25 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {matchResult.totalScore} <span className="text-lg font-normal text-slate-300">/ 50</span>
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      {matchResult.totalScore >= 25 ? "✅ Safe Marital Accord" : "⚠️ Structural Evaluation Warning"}
                    </p>
                  </div>

                  {/* 12-Row Metrics Calculation Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white text-xs uppercase font-semibold tracking-wider">
                          <th className="p-3 pl-4">Koot Parameters</th>
                          <th className="p-3">Max</th>
                          <th className="p-3 text-right pr-4">Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 divide-y divide-slate-100 text-xs">
                        <tr>
                          <td className="p-3 pl-4 font-medium">1. Dina / Tara <span className="text-[10px] text-slate-400 font-normal ml-1">(Longevity Metric)</span></td>
                          <td className="p-3 font-semibold text-slate-400">3</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.dina === 0 ? 'text-rose-600' : 'text-slate-900'}`}>{matchResult.scores.dina}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">2. Gana <span className="text-[10px] text-slate-400 font-normal ml-1">(Temperament Match)</span></td>
                          <td className="p-3 font-semibold text-slate-400">6</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.gana === 0 ? 'text-rose-600' : 'text-slate-900'}`}>{matchResult.scores.gana}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">3. Yoni <span className="text-[10px] text-slate-400 font-normal ml-1">(Innate Subconscious Nature)</span></td>
                          <td className="p-3 font-semibold text-slate-400">4</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.yoni}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">4. Rasi / Bhakoot <span className="text-[10px] text-slate-400 font-normal ml-1">(Emotional Growth Matrix)</span></td>
                          <td className="p-3 font-semibold text-slate-400">7</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.bhakoot === 0 ? 'text-rose-600' : 'text-slate-900'}`}>{matchResult.scores.bhakoot}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">5. Graha Maitri <span className="text-[10px] text-slate-400 font-normal ml-1">(Psychological Synergy)</span></td>
                          <td className="p-3 font-semibold text-slate-400">2</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.maitri}</td>
                        </tr>
                        <tr className={matchResult.scores.rajju === 0 ? "bg-rose-50/40" : ""}>
                          <td className="p-3 pl-4 font-medium">6. Rajju <span className="text-[10px] text-rose-600 font-bold ml-1">(Absolute Vital Life-Tie Filter)</span></td>
                          <td className="p-3 font-semibold text-slate-400">7</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.rajju === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {matchResult.scores.rajju} {matchResult.scores.rajju === 0 && '❌ Dosha'}
                          </td>
                        </tr>
                        <tr className={matchResult.scores.vedha === 0 ? "bg-rose-50/40" : ""}>
                          <td className="p-3 pl-4 font-medium">7. Vedha <span className="text-[10px] text-rose-600 font-bold ml-1">(Inimical Piercing Afflictions)</span></td>
                          <td className="p-3 font-semibold text-slate-400">3</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.vedha === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {matchResult.scores.vedha} {matchResult.scores.vedha === 0 && '❌ Dosha'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">8. Vashya <span className="text-[10px] text-slate-400 font-normal ml-1">(Mutual Magnetic Attraction)</span></td>
                          <td className="p-3 font-semibold text-slate-400">2</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.vashya}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">9. Mahendra <span className="text-[10px] text-slate-400 font-normal ml-1">(Lineage & Long-term Wealth)</span></td>
                          <td className="p-3 font-semibold text-slate-400">4</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.mahendra}</td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">10. Stri-Dirgha <span className="text-[10px] text-slate-400 font-normal ml-1">(Auspicious Family Well-being)</span></td>
                          <td className="p-3 font-semibold text-slate-400">3</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.striDirgha}</td>
                        </tr>
                        <tr className={matchResult.scores.nadi === 0 ? "bg-rose-50/40" : ""}>
                          <td className="p-3 pl-4 font-medium">11. Nadi <span className="text-[10px] text-rose-600 font-bold ml-1">(Genetic / Physiological Constitution)</span></td>
                          <td className="p-3 font-semibold text-slate-400">8</td>
                          <td className={`p-3 text-right pr-4 font-bold ${matchResult.scores.nadi === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {matchResult.scores.nadi} {matchResult.scores.nadi === 0 && '❌ Dosha'}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-4 font-medium">12. Varna <span className="text-[10px] text-slate-400 font-normal ml-1">(Ego & Social Alignment)</span></td>
                          <td className="p-3 font-semibold text-slate-400">1</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">{matchResult.scores.varna}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          )}
             {/* 
                   <div className={`min-h-screen bg-[#ececd6] text-slate-800 font-sans flex flex-col items-center overflow-x-hidden pt-12 md:pt-10`}>
                      
                      {/* GLOBAL MODAL */}
                      {popupInfo ? (
                        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPopupInfo(null)}>
                          <div className="bg-[#fdfde8] border-2 border-amber-600 rounded-xl p-6 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setPopupInfo(null)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500"><X size={20} /></button>
                            <div className="flex items-center gap-3 mb-4 border-b border-amber-200 pb-3">
                              <Star className="text-amber-500 shrink-0" size={28} />
                              <div>
                                <h3 className="font-bold font-serif text-xl text-green-900 leading-none mb-1">{String(popupInfo.title)}</h3>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{String(popupInfo.subtitle)}</p>
                              </div>
                            </div>
                
                            <div className="mb-4 bg-white p-4 rounded-lg shadow-inner border border-amber-100 min-h-[80px]">
                              {((popupInfo.aspectData && popupInfo.aspectData.length > 0) || popupInfo.exchangeData) && !popupInfo.isLoadingAI ? (
                                 <div className="mb-3 flex flex-col gap-1.5 border-b border-amber-100 pb-3">
                                    {popupInfo.exchangeData ? <div className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold"><Zap size={12} className="inline mr-1"/> Parivartana Yoga with {String(popupInfo.exchangeData)}</div> : null}
                                    {popupInfo.aspectData?.length > 0 ? <div className="text-[10px] bg-blue-50 text-blue-800 px-2 py-1 rounded font-bold"><Search size={12} className="inline mr-1"/> Drishti from: {String(popupInfo.aspectData.join(', '))}</div> : null}
                                 </div>
                              ) : null}
                
                              {popupInfo.isLoadingAI ? (
                                <div className="flex flex-col items-center gap-2 text-amber-600 py-4"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-bold font-serif">Consulting AI...</span></div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase font-bold text-amber-600"><Cpu size={12} /> AI Prediction</div>
                                  <p className="text-sm text-slate-800 font-serif leading-relaxed italic border-l-2 border-amber-300 pl-3 max-h-96 overflow-y-auto pr-4">{String(popupInfo.aiText || popupInfo.text)}</p>
                                  
                                  {popupInfo.conjunctionData && popupInfo.conjunctionData.planets && popupInfo.conjunctionData.planets.length > 1 ? (
                                    <button onClick={handleConjunctionAnalysis} className="mt-4 w-full bg-amber-50 border border-amber-200 text-amber-800 py-2.5 px-4 rounded-lg hover:bg-amber-100 transition-colors shadow-sm font-bold text-xs">
                                        <Sparkles size={16} className="inline mr-1 text-amber-600" /> Analyze Conjunction
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            {/* CLASSICAL VEDIC LORE FALLBACK */}
                            <div>
                               <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Classical Significance</div>
                               <p className="text-sm text-slate-600 font-serif leading-relaxed whitespace-pre-wrap">{String(popupInfo.text)}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                
                      {/* TOP ORANGE BANNER WITH HOME BUTTON */}
    <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white py-1.5 px-4 text-[11px] font-bold z-50 shadow-md flex justify-between items-center">
      
      {/* LEFT: The New Home Button */}
      <button 
        onClick={() => setActiveModule(null)}
        className="flex items-center gap-1 bg-black/20 hover:bg-black/40 px-3 py-1 rounded transition-all cursor-pointer z-50"
      >
        ← Back to Hub
      </button>

      {/* CENTER: The App Title */}
      <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <LogoSVG className="w-4 h-4" /> 
        <span>VedicAstro 1.5.0 (AI Live)</span>
      </div>

      {/* RIGHT: Status Indicator */}
      <div className="uppercase tracking-widest text-[9px] opacity-80 bg-black/10 px-2 py-1 rounded">
        {isGuestMode ? "Guest Mode" : "Profile Mode"}
      </div>

    </div>
                
                      {/* WIDESCREEN MAIN CONTAINER */}
                      <div className="w-full max-w-[1500px] mx-auto px-4 pt-6 md:pt-10 flex flex-col items-center">
                        
                        {/* TOP BAR */}
                        {!isGuestMode && (
                        <div className="w-full bg-[#fdfde8] p-2 text-xs border border-slate-300 flex justify-between items-center shadow-sm z-10 font-serif font-bold text-green-900 rounded-lg mb-6 shrink-0">
                          <div className="flex items-center gap-2">
                            <Cloud size={16} className="text-blue-500" />
                            <select className="bg-transparent border border-green-700/30 rounded px-2 py-1 outline-none text-green-900 font-bold max-w-[120px] md:max-w-none" value={(() => { const idx = savedProfiles.findIndex(c => c && c.name === userData.formData.name && c.dob === userData.formData.dob); return idx >= 0 ? String(idx) : ''; })()} onChange={handleTopBarProfileSwitch}>
                              <option value="" disabled>Select Profile</option>
                              {savedProfiles.map((client, idx) => (client && client.name) ? <option key={idx} value={String(idx)}>{String(client.name)}</option> : null)}
                            </select>
                            <button onClick={() => setUserData(null)} className="p-1.5 hover:bg-green-100 rounded text-green-800 border border-transparent hover:border-green-300 shadow-sm"><Settings size={14} /></button>
                          </div>
                          <span className="hidden md:inline text-right opacity-80 truncate pl-4">{String(userData.formData.dob)} {String(userData.formData.time)} | Birth: {String(userData.formData.city)}</span>
                        </div>
                        )}
                        {/* ADVANCED 4-COLUMN RESPONSIVE GRID SYSTEM */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-4 gap-6 items-stretch">
                            
                            {/* 1A. MAIN CHART (Row 1 Left) */}
                            <div className={isExpert ? "col-span-1 md:col-span-2 lg:col-span-4 lg:col-start-1 lg:row-start-1 xl:col-span-2 xl:col-start-1 xl:row-start-1" : "col-span-1 md:col-span-2 lg:col-span-4 xl:col-span-3"}>
                                <div className="flex flex-col items-center justify-center gap-2 w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                                  {!isGuestMode && (
                                    <div className="flex bg-slate-200 rounded-full p-1 text-[10px] md:text-xs font-bold mb-2 overflow-x-auto max-w-full">
                                        <button onClick={()=>setViewMode('natal')} className={`px-4 md:px-6 py-2 rounded-full whitespace-nowrap transition-colors ${viewMode==='natal'?'bg-amber-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>Natal (D1)</button>
                                        <button onClick={()=>setViewMode('transit')} className={`px-4 md:px-6 py-2 rounded-full whitespace-nowrap transition-colors ${viewMode==='transit'?'bg-indigo-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>Transits</button>
                                        
                                        {/* THE NEW PRASHNA BUTTON */}
                                        <button onClick={()=>setViewMode('prashna')} className={`px-4 md:px-6 py-2 rounded-full whitespace-nowrap transition-colors ${viewMode==='prashna'?'bg-emerald-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>Prashna</button>
                                        
                                        {isExpert && <button onClick={()=>setViewMode('sav')} className={`px-4 md:px-6 py-2 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${viewMode==='sav'?'bg-purple-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}><Star size={12}/> SAV</button>}
                                    </div>
                                    )}
                                   {/* PRASHNA FORM OR ACTUAL CHARTS */}
                {viewMode === 'prashna' ? (
                  showPrashnaChart && prashnaChartData ? (
                            <div className="flex flex-col items-center w-full h-full min-h-[300px]">
                                 <div className="w-full flex justify-between items-center mb-4">
                              <h3 className="font-bold text-emerald-800 text-sm md:text-base border-b-2 border-emerald-500 pb-1">
                                  Prashna: {prashnaChartData.city}
                              </h3>
                              
                              <div className="flex gap-2">
                                  <button 
                                      onClick={getOverallPrashnaReading}
                                      className="text-[10px] md:text-xs bg-purple-100 hover:bg-purple-200 border border-purple-300 px-3 py-1 rounded-full text-purple-800 font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                      <span>✨</span> Get Overall AI Reading
                                  </button>
                
                                  <button 
                                      onClick={() => setShowPrashnaChart(false)}
                                      className="text-[10px] md:text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded-full text-slate-700 font-bold transition-colors"
                                  >
                                      ← Back
                                  </button>
                              </div>
                          </div>
                                 
                                 {isSouthIndian ? (
                                  <SouthIndianChart 
                                    planets={prashnaChartData.planets} 
                                    lagnaIndex={prashnaChartData.lagnaIndex} 
                                    onSymbolClick={handleSymbolClick} 
                                    chartType="prashna" 
                                    viewMode="prashna"
                                    avData={null}
                                  />
                                 ) : (
                                  <NorthIndianChart 
                                    planets={prashnaChartData.planets} 
                                    lagnaIndex={prashnaChartData.lagnaIndex} 
                                    onSymbolClick={handleSymbolClick} 
                                    chartType="prashna" 
                                    viewMode="prashna"
                                    avData={null}
                                  />
                                 )}
                                 
                            </div>
                        ) : (
                    <div className="w-full max-w-md mx-auto flex flex-col gap-5 mt-2 mb-4 text-left">
                            <h3 className="font-bold text-xl text-emerald-800 text-center border-b pb-2">Ask a Prashna</h3>
                
                            {/* 1. THE FAQ & QUESTION BOX */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">The Question</label>
                                
                                {/* FAQ Dropdown */}
                                <select 
                                    className="w-full p-2 mb-2 border border-emerald-300 rounded text-sm focus:border-emerald-500 outline-none bg-emerald-50 text-emerald-900 font-semibold cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.value) setPrashnaDetails({...prashnaDetails, question: e.target.value});
                                    }}
                                >
                                    <option value="">-- Select a Common FAQ --</option>
                                    
                                    <optgroup label="Career & Job">
                                        <option value="Will I receive a job offer from the company I interviewed with last week?">Will I receive a job offer from the interviewed company?</option>
                                        <option value="Should I accept the offer at Company A or wait for the offer at Company B?">Should I accept Offer A or wait for Offer B?</option>
                                        <option value="Will I be promoted in the next 3 months?">Will I be promoted in the next 3 months?</option>
                                        <option value="Should I start my own business at this time?">Should I start my own business at this time?</option>
                                    </optgroup>
                
                                    <optgroup label="Marriage & Relationships">
                                        <option value="Will my current relationship lead to marriage?">Will my current relationship lead to marriage?</option>
                                        <option value="Will I get married within the next 6-12 months?">Will I get married within the next 6-12 months?</option>
                                        <option value="Is this partner compatible for a long-term commitment?">Is this partner compatible for long-term commitment?</option>
                                    </optgroup>
                
                                    <optgroup label="Finance & Property">
                                        <option value="Will my pending business loan be approved within 30 days?">Will my pending business loan be approved soon?</option>
                                        <option value="Should I invest in the stock market this week?">Should I invest in the stock market this week?</option>
                                        <option value="Will the property purchase deal close in my favor?">Will the property purchase deal close in my favor?</option>
                                    </optgroup>
                
                                    <optgroup label="Health">
                                        <option value="Will I recover from this illness within a specific timeframe?">Will I recover from this illness soon?</option>
                                        <option value="Will my upcoming surgery be successful without complications?">Will my upcoming surgery be successful?</option>
                                    </optgroup>
                
                                    <optgroup label="Travel">
                                        <option value="Will my visa application be approved?">Will my visa application be approved?</option>
                                        <option value="Should I move abroad for work at this time?">Should I move abroad for work at this time?</option>
                                    </optgroup>
                
                                    <optgroup label="Lost Items">
                                        <option value="Will I find my lost item?">Will I find my lost item?</option>
                                        <option value="Where should I look for my misplaced wallet?">Where should I look for my misplaced wallet?</option>
                                    </optgroup>
                                </select>
                                
                                {/* Custom Text Input */}
                                <input type="text" placeholder="...or type a custom question here" 
                                    className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 outline-none text-sm"
                                    value={prashnaDetails.question}
                                    onChange={(e) => setPrashnaDetails({...prashnaDetails, question: e.target.value})}
                                />
                            </div>
                
                            {/* 2. DATE & TIME */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Date</label>
                                    <input type="date" className="w-full p-2 border border-slate-300 rounded text-sm focus:border-emerald-500 outline-none"
                                        value={prashnaDetails.date}
                                        onChange={(e) => setPrashnaDetails({...prashnaDetails, date: e.target.value})}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-wider uppercase">Time</label>
                                    <input type="time" className="w-full p-2 border border-slate-300 rounded text-sm focus:border-emerald-500 outline-none"
                                        value={prashnaDetails.time}
                                        onChange={(e) => setPrashnaDetails({...prashnaDetails, time: e.target.value})}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        const offset = now.getTimezoneOffset();
                                        now.setMinutes(now.getMinutes() - offset);
                                        const localISOTime = now.toISOString().slice(0,16);
                                        setPrashnaDetails({
                                            ...prashnaDetails,
                                            date: localISOTime.split('T')[0],
                                            time: localISOTime.split('T')[1]
                                        });
                                    }}
                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-2 px-3 rounded text-sm h-[38px] transition-colors"
                                >
                                    Set Now
                                </button>
                            </div>
                
                            {/* 3. AUTO LOCATION BADGE */}
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 text-sm text-slate-600">
                                <span>📍</span>
                                <span>Client location synced: <b>{userData?.formData?.currentCity || userData?.formData?.city || "Hyderabad"}</b></span>
                            </div>
                
                            {/* 4. GENERATE BUTTON */}
                            <button
                                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex justify-center items-center gap-2"
                                onClick={generatePrashnaChart}
                            >
                                <span>GENERATE PRASHNA CHART</span> <span>✨</span>
                            </button>
                        </div>
                )) : isSouthIndian ? (
                  <SouthIndianChart 
                    planets={viewMode === 'natal' ? natalPlanets : transits} 
                    lagnaIndex={lagnaIndex} 
                    onSymbolClick={handleSymbolClick}
                    chartType={viewMode === 'natal' ? 'natal' : (viewMode === 'transit' ? 'transit' : 'sav')}
                    chartType={viewMode === 'natal' ? 'natal' : (viewMode === 'transit' ? 'transit' : 'sav')} 
                    viewMode={viewMode}
                    avData={ashtakavargaData}
                  />
                ) : (
                  <NorthIndianChart 
                    planets={viewMode === 'natal' ? natalPlanets : transits} 
                    lagnaIndex={lagnaIndex} 
                    onSymbolClick={handleSymbolClick} 
                    chartType={viewMode === 'natal' ? 'natal' : (viewMode === 'transit' ? 'transit' : 'sav')} 
                    viewMode={viewMode}
                    avData={ashtakavargaData}
                  />
                )}
                                </div>
                            </div>
                              
                
                            {/* 1B. SUB CHARTS (Row 2 Left) */}
                            {isExpert && !isGuestMode && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 lg:col-start-1 lg:row-start-2 xl:col-span-2 xl:col-start-1 xl:row-start-2">
                                <div className="flex flex-col items-center justify-center gap-2 w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                                    <div className="flex bg-slate-200 rounded-full p-1 text-[10px] md:text-xs font-bold w-full max-w-md overflow-x-auto no-scrollbar mb-2">
                                        <button onClick={()=>setSubChart('d9')} className={`flex-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${subChart==='d9'?'bg-purple-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>D9 (Navamsha)</button>
                                        <button onClick={()=>setSubChart('d10')} className={`flex-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${subChart==='d10'?'bg-blue-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>D10 (Dashamsha)</button>
                                        <button onClick={()=>setSubChart('d6')} className={`flex-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${subChart==='d6'?'bg-red-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>D6 (Shashthamsha)</button>
                                        <button onClick={()=>setSubChart('d20')} className={`flex-1 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${subChart==='d20'?'bg-emerald-600 text-white shadow':'text-slate-600 hover:bg-slate-300'}`}>D20 (Vimshamsha)</button>
                                    </div>
                                    {subChart === 'd9' ? (isSouthIndian ? <SouthIndianChart planets={d9Planets} lagnaIndex={d9LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d9" /> : <NorthIndianChart planets={d9Planets} lagnaIndex={d9LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d9" />) : null}
                                    {subChart === 'd10' ? (isSouthIndian ? <SouthIndianChart planets={d10Planets} lagnaIndex={d10LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d10" /> : <NorthIndianChart planets={d10Planets} lagnaIndex={d10LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d10" />) : null}
                                    {subChart === 'd6' ? (isSouthIndian ? <SouthIndianChart planets={d6Planets} lagnaIndex={d6LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d6" /> : <NorthIndianChart planets={d6Planets} lagnaIndex={d6LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d6" />) : null}
                                    {subChart === 'd20' ? (isSouthIndian ? <SouthIndianChart planets={d20Planets} lagnaIndex={d20LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d20" /> : <NorthIndianChart planets={d20Planets} lagnaIndex={d20LagnaIndex} onSymbolClick={handleSymbolClick} chartType="d20" />) : null}
                                </div>
                            </div>
                            )}
                
                            {!isGuestMode && (
                <>
                            {/* 2. MID-TOP: Panchang & Functional Nature / Shadbala */}
                            {isExpert && (panchang || functionalNature) ? (
                            <div className="flex flex-col gap-6 col-span-1 md:col-span-2 lg:col-span-2 lg:col-start-5 lg:row-start-1 xl:col-span-1 xl:col-start-3 xl:row-start-1 h-full">
                                
                                {/* PANCHANG READOUT */}
                                {panchang || natalPanchang ? (
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm shrink-0">
                                    <div className="text-xs uppercase tracking-widest text-amber-800 font-bold mb-3 flex items-center justify-between border-b border-amber-200 pb-2">
                                    <span className="flex items-center gap-1.5"><Star size={14} className="text-amber-600"/> Panchang</span>
                                    <div className="flex bg-amber-200/50 rounded-full p-0.5">
                                        <button type="button" onClick={() => setPanchangView('natal')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${panchangView === 'natal' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-300'}`}>Natal</button>
                                        <button type="button" onClick={() => setPanchangView('transit')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${panchangView === 'transit' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-300'}`}>Transit</button>
                                    </div>
                                    </div>
                                    {(() => {
                                    const act = panchangView === 'transit' ? panchang : natalPanchang;
                                    if (!act) return null;
                                    return (
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] text-slate-800 font-serif cursor-pointer hover:bg-amber-100 p-2 -mx-2 rounded transition-colors" onClick={() => handleSymbolClick({ title: `${panchangView === 'natal' ? 'Natal' : 'Transit'} Panchang`, subtitle: `The 5 Limbs`, text: `Vara: ${act.vara}\nTithi: ${act.tithi}\nMonth: ${act.month}\nYear: ${act.year}\nNakshatra: ${act.nakshatra}\nYoga: ${act.yoga}\nKarana: ${act.karana}`, promptData: { type: 'panchang', panchangType: panchangView, data: act } })}>
                                        <div><span className="text-amber-600 font-sans font-bold block text-[9px] uppercase">Vara (Day)</span> {String(act.vara)}</div>
                                        <div><span className="text-amber-600 font-sans font-bold block text-[9px] uppercase">Tithi (Phase)</span> {String(act.tithi)}</div>
                                        <div><span className="text-amber-600 font-sans font-bold block text-[9px] uppercase">Lunar Month</span> {String(act.month)}</div>
                                        <div><span className="text-amber-600 font-sans font-bold block text-[9px] uppercase">Samvat Year</span> {String(act.year)}</div>
                                        <div className="col-span-2"><span className="text-amber-600 font-sans font-bold block text-[9px] uppercase">Nakshatra</span> {String(act.nakshatra)}</div>
                                        </div>
                                    );
                                    })()}
                                </div>
                                ) : null}
                
                                {/* FUNCTIONAL NATURE & SHADBALA TOGGLE */}
                                {functionalNature || shadbalaScores ? (
                                <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm w-full flex-1 flex flex-col min-h-0">
                                    <div className="bg-slate-100 text-slate-700 px-4 py-3 text-xs font-bold uppercase flex items-center justify-between border-b border-slate-200 shrink-0">
                                        <span className="flex items-center gap-2"><ShieldAlert size={14} className="text-slate-500"/> Dignity & Strength</span>
                                        <div className="flex bg-slate-200 rounded-full p-0.5">
                                            <button type="button" onClick={() => setFunctionalTab('roles')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${functionalTab === 'roles' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}>Roles</button>
                                            <button type="button" onClick={() => setFunctionalTab('shadbala')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${functionalTab === 'shadbala' ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}>Shadbala</button>
                                        </div>
                                    </div>
                                    
                                    {functionalTab === 'roles' && functionalNature ? (
                                    <div className="p-4 bg-white grid grid-cols-1 gap-4 flex-1 content-start overflow-y-auto">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Benefics</div>
                                            <div className="flex flex-wrap gap-2">{functionalNature.ben.length === 0 ? <span className="text-[11px] text-slate-400 italic">None</span> : functionalNature.ben.map(p => (<span key={`ben-${p}`} onClick={() => handleSymbolClick({ title: `${p} as Benefic`, subtitle: `Functional Role`, text: `${p} acts as a positive force for this Ascendant.`, promptData: { type: 'functional', planet: p, role: 'Benefic' }})} className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100 hover:shadow-sm transition-all">{String(p)}</span>))}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Malefics</div>
                                            <div className="flex flex-wrap gap-2">{functionalNature.mal.length === 0 ? <span className="text-[11px] text-slate-400 italic">None</span> : functionalNature.mal.map(p => (<span key={`mal-${p}`} onClick={() => handleSymbolClick({ title: `${p} as Malefic`, subtitle: `Functional Role`, text: `${p} acts as a challenging force for this Ascendant.`, promptData: { type: 'functional', planet: p, role: 'Malefic' }})} className="text-[11px] font-bold px-2 py-1 rounded bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 hover:shadow-sm transition-all">{String(p)}</span>))}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 mt-auto shrink-0">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Maraka</div>
                                                <div className="flex flex-wrap gap-1.5">{functionalNature.mar.length === 0 ? <span className="text-[11px] text-slate-400 italic">None</span> : functionalNature.mar.map(p => (<span key={`mar-${p}`} onClick={() => handleSymbolClick({ title: `${p} as Maraka`, subtitle: `Functional Role`, text: `${p} acts as a death-inflicting or transforming force.`, promptData: { type: 'functional', planet: p, role: 'Maraka' }})} className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 border border-purple-200 cursor-pointer hover:bg-purple-100 hover:shadow-sm transition-all">{String(p)}</span>))}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Badhaka</div>
                                                <div className="flex flex-wrap gap-1.5">{functionalNature.bad.length === 0 ? <span className="text-[11px] text-slate-400 italic">None</span> : functionalNature.bad.map(p => (<span key={`bad-${p}`} onClick={() => handleSymbolClick({ title: `${p} as Badhaka`, subtitle: `Functional Role`, text: `${p} acts as an obstructing or delaying force.`, promptData: { type: 'functional', planet: p, role: 'Badhaka' }})} className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100 hover:shadow-sm transition-all">{String(p)}</span>))}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[9px] text-slate-400 font-bold flex items-center gap-1 shrink-0"><Cpu size={11}/> AI analysis available on click</div>
                                    </div>
                                    ) : null}
                
                                    {functionalTab === 'shadbala' && shadbalaScores ? (
                                    <div className="p-4 bg-white flex flex-col gap-2.5 flex-1 overflow-y-auto min-h-0">
                                        {AstroEngine.GRAHAS.filter(g => g !== 'Rahu' && g !== 'Ketu').map(p => {
                                            const score = shadbalaScores?.[p];
                                            if (!score) return null;
                                            return (
                                                <div key={p} onClick={() => handleSymbolClick({ title: `${p} Shadbala`, subtitle: `Planetary Strength`, text: `${p} has a mathematical Shadbala strength of ${score.percentage}%.`, promptData: { type: 'shadbala', planet: p, score: score.percentage }})} className="cursor-pointer hover:bg-slate-50 p-1.5 -mx-1.5 rounded transition-colors group">
                                                    <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold">
                                                        <span className={AstroEngine.PLANET_TEXT_COLORS[p]}>{p}</span>
                                                        <span className="text-slate-500 group-hover:text-amber-600 transition-colors">{score.percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                                                        <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${Math.min(score.percentage, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="mt-auto pt-3 text-[9px] text-slate-400 font-bold flex items-center gap-1 shrink-0"><Cpu size={11}/> AI analysis available on click</div>
                                    </div>
                                    ) : null}
                
                                </div>
                                ) : null}
                            </div>
                            ) : null}
                
                            {/* 3. DASA TABLE & TIME CONTROL */}
                        {isExpert ? (
                          <div className="col-span-1 md:col-span-1 lg:col-span-3 lg:col-start-1 lg:row-start-3 xl:col-span-1 xl:col-start-4 xl:row-start-1 flex flex-col gap-4 h-full">
                            
                            {/* DASA BOX (Flex-1 allows it to shrink and align perfectly with adjacent windows) */}
                            <div className="bg-white border-2 border-green-800 rounded-2xl overflow-hidden shadow-sm w-full flex-1 flex flex-col min-h-[200px]">
                              <div className="bg-green-800 text-white px-4 py-3 text-xs font-bold uppercase flex items-center gap-2 shrink-0"><Sparkles size={14}/> Vimshottari Dasa</div>
                              
                              <div className="bg-slate-50 flex-1 overflow-y-auto p-3 custom-scrollbar">
                                {upcomingDasas.filter(dasa => {
                                  // If no Date of Death exists, show all. Otherwise, hide dasas that start after DOD.
                                  if (!userData?.formData?.dod) return true;
                                  return new Date(dasa.dateStr) <= new Date(userData.formData.dod);
                                }).map((dasa, i) => {
                                  const md = String(AstroEngine.PLANET_SHORTS[dasa.planets[0]]);
                                  const ad = String(AstroEngine.PLANET_SHORTS[dasa.planets[1]]);
                                  const isCurrent = currentDasa && currentDasa.mahadasha === dasa.planets[0] && currentDasa.antardasha === dasa.planets[1];
                
                                  return (
                                    <details key={i} className={`mb-2 border rounded-xl shadow-sm group transition-all ${isCurrent ? 'bg-green-50 border-green-400 ring-1 ring-green-400' : 'bg-white border-slate-200'}`}>
                                      <summary className="list-none cursor-pointer p-3 text-sm font-bold flex items-center hover:bg-slate-50 transition-colors rounded-xl outline-none">
                                        <span className={`text-[10px] mr-3 transition-transform duration-200 group-open:rotate-90 ${isCurrent ? 'text-green-600' : 'text-blue-500'}`}>▶</span>
                                        <span className={`w-7 text-center ${AstroEngine.PLANET_TEXT_COLORS[dasa.planets[0]] || 'text-slate-700'}`}>{md}</span>
                                        <span className="text-slate-300 mx-1">▶</span>
                                        <span className={`w-7 text-center ${AstroEngine.PLANET_TEXT_COLORS[dasa.planets[1]] || 'text-slate-700'}`}>{ad}</span>
                                        <span className={`ml-auto text-xs ${isCurrent ? 'text-green-700 font-extrabold' : 'text-slate-500 font-normal'}`}>
                                          {isCurrent ? 'CURRENT' : String(dasa.dateStr)}
                                        </span>
                                      </summary>
                                      
                                      <div className="px-2 pb-2 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-xl text-xs">
                                        {dasa.pd && dasa.pd.length > 0 ? (
                                          dasa.pd.map((pd, j) => {
                                            const pdName = String(AstroEngine.PLANET_SHORTS[pd.planet]);
                                            return (
                                              <div key={j} className="flex justify-between items-center py-1.5 px-6 text-slate-600 border-b border-slate-200/50 last:border-0 hover:bg-slate-100/50 rounded">
                                                <span className="flex gap-2">
                                                  <span className="text-slate-400">{md} - {ad} -</span> 
                                                  <span className={`font-bold ${AstroEngine.PLANET_TEXT_COLORS[pd.planet] || 'text-slate-700'}`}>{pdName}</span>
                                                </span>
                                                <span>{pd.dateStr}</span>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <div className="text-slate-400 italic px-4 py-2 text-center">PD calculations not available for this period.</div>
                                        )}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                
                            {/* TIME CONTROL BOX */}
                            <div className="bg-[#fdfbf6] border border-amber-200 rounded-2xl shadow-sm p-4 shrink-0 transition-all">
                              
                              {/* HEADER WITH NEW DIGITAL CLOCK DISPLAY */}
                              <div className="flex items-center justify-between mb-3 pb-3 border-b border-amber-200/50">
                                <div className="text-[11px] font-extrabold text-slate-700 uppercase flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> 
                                  TIME CONTROL
                                </div>
                                
                                {/* LIVE WATCH BADGE */}
                                <div className="bg-white border border-amber-200 px-2 py-1 rounded text-[10px] font-bold text-amber-700 shadow-inner tabular-nums tracking-wide">
                                  {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                
                              <div className="flex flex-col gap-3">
                                {/* CUSTOM RADIO */}
                                <label className="flex items-center gap-3 text-sm font-bold text-slate-800 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="timeMode" 
                                    checked={!isRealtime} 
                                    onChange={() => setIsRealtime(false)}
                                    className="w-4 h-4 cursor-pointer accent-slate-800" 
                                  />
                                  <span className={!isRealtime ? "text-slate-900" : "text-slate-600 font-medium"}>Custom</span>
                                </label>
                                
                                {/* REALTIME RADIO */}
                                <label className="flex items-center gap-3 text-sm font-bold text-slate-800 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="timeMode" 
                                    checked={isRealtime} 
                                    onChange={() => {
                                      setIsRealtime(true);
                                      setTime(new Date()); 
                                    }}
                                    className="w-4 h-4 cursor-pointer accent-green-600" 
                                  />
                                  <div className="flex items-center gap-2">
                                    {isRealtime && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>}
                                    <span className={isRealtime ? "text-slate-900" : "text-slate-600 font-medium"}>Realtime</span>
                                  </div>
                                </label>
                
                                {/* EXPANDING TIME BUTTONS & EXACT CALENDAR PICKER */}
                                {!isRealtime && (
                                  <div className="mt-2 pt-3 border-t border-slate-200/60 animate-in slide-in-from-top-2 fade-in duration-200">
                                    
                                    {/* NEW: EXACT DATE/TIME INPUT */}
                                    <div className="mb-2">
                                      <input 
                                        type="datetime-local" 
                                        value={new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                        onChange={(e) => {
                                          if (e.target.value) setTime(new Date(e.target.value));
                                        }}
                                        className="w-full text-xs p-2 border border-amber-200 rounded-lg text-slate-700 bg-white shadow-inner focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium cursor-pointer"
                                      />
                                    </div>
                
                                    {/* QUICK JUMP BUTTONS */}
                                    <div className="flex justify-between gap-1">
                                      <button onClick={() => { const d = new Date(time); d.setDate(d.getDate() - 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">-1D</button>
                                      <button onClick={() => { const d = new Date(time); d.setDate(d.getDate() + 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">+1D</button>
                                      <button onClick={() => { const d = new Date(time); d.setMonth(d.getMonth() - 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">-1M</button>
                                      <button onClick={() => { const d = new Date(time); d.setMonth(d.getMonth() + 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">+1M</button>
                                      <button onClick={() => { const d = new Date(time); d.setFullYear(d.getFullYear() - 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">-1Y</button>
                                      <button onClick={() => { const d = new Date(time); d.setFullYear(d.getFullYear() + 1); setTime(d); }} className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-xs font-bold rounded-lg transition-colors">+1Y</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                
                          </div>
                        ) : null}
                                
                            {/* 4. DETECTED YOGAS */}
                            {detectedYogas.length > 0 ? (
                            <div className="col-span-1 md:col-span-2 lg:col-span-2 lg:col-start-5 lg:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-2 h-full">
                                <div className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-sm w-full flex flex-col h-full min-h-0">
                                    <div className="bg-indigo-100 text-indigo-800 px-4 py-3 text-xs font-bold uppercase flex items-center justify-between border-b border-indigo-200 shrink-0">
                                        <span className="flex items-center gap-2"><Sparkles size={14}/> Classical Yogas</span>
                                        <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-[10px]">{detectedYogas.length} Found</span>
                                    </div>
                                    <div className="p-4 bg-white flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
                                        {detectedYogas.map((yoga, idx) => (
                                            <div key={idx} onClick={() => handleSymbolClick({ title: yoga.name, subtitle: `Yoga Found`, text: yoga.desc, promptData: { type: 'yoga', yogaType: yoga.type, involvedPlanets: yoga.involved } })} className={`p-3 rounded-xl border ${yoga.bg} ${yoga.border} cursor-pointer hover:shadow-lg transition-shadow`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className={`font-bold font-serif text-sm ${yoga.color}`}>{yoga.name}</h4>
                                                    <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-white border ${yoga.border} ${yoga.color}`}>{yoga.type}</span>
                                                </div>
                                                <p className="text-xs text-slate-700 leading-relaxed">{yoga.desc}</p>
                                                <div className="mt-2.5 text-[9px] text-indigo-400 font-bold flex items-center gap-1"><Cpu size={11}/> AI analysis available on click</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            ) : null}
                
                            {/* 5. AI PANEL & EXTRA TOOLS */}
                            <div className={isExpert ? "col-span-1 md:col-span-1 lg:col-span-3 lg:col-start-4 lg:row-start-3 xl:col-span-1 xl:col-start-4 xl:row-start-2 h-full" : "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-1 h-full"}>
                                <div className="bg-white border-2 border-amber-300 rounded-2xl shadow-sm p-5 w-full flex flex-col h-full min-h-0">
                                    <div className="text-sm font-bold mb-4 text-amber-800 font-serif uppercase flex items-center gap-2 shrink-0"><MessageCircle size={16} /> Ask Parashari AI</div>
                                    <div className="flex gap-2 items-start mb-4 shrink-0">
                                        <textarea 
                                            rows={3}
                                            placeholder="Ask a question about your chart..." 
                                            className="flex-1 p-3 border border-slate-300 rounded-xl text-sm outline-none shadow-inner resize-y"
                                           value={qaInput}
                                           onChange={(e) => setQaInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAskAI();
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => handleAskAI()} 
                                            disabled={qaLoading} 
                                            className="bg-amber-600 text-white p-3 rounded-xl shadow-sm hover:bg-amber-700 transition-colors mt-1"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </div>
                                    {qaLoading ? <div className="p-4 text-center text-amber-600 text-xs font-bold uppercase flex flex-col items-center gap-2 shrink-0"><Loader2 size={24} className="animate-spin"/> Consulting stars...</div> : null}
                                    {qaResult?.type === 'success' ? <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded shadow-inner overflow-y-auto"><p className="text-sm text-slate-800 font-serif italic whitespace-pre-wrap">{String(qaResult.text)}</p></div> : null}
                                    
                                    {/* The mt-auto dynamically pushes these tools to the absolute bottom if stretched */}
                                    <div className="mt-auto border-t border-slate-200 pt-5 space-y-3 shrink-0">
                                        <button onClick={handleGenerateMantra} disabled={mantraLoading} className="w-full bg-purple-50 text-purple-800 border border-purple-200 py-3 rounded-xl hover:bg-purple-100 font-bold shadow-sm flex items-center justify-center gap-2 text-xs transition-colors">
                                        {mantraLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Daily Prediction & Upaya
                                        </button>
                                        {mantraResult?.type === 'success' && <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded shadow-inner"><p className="text-sm text-slate-800 font-serif italic whitespace-pre-wrap">{String(mantraResult.text)}</p></div>}
                                        
                                        <div className="flex gap-2">
                                        <input type="text" placeholder="Describe a dream to decode..." className="flex-1 p-3 border border-slate-300 rounded-xl text-xs outline-none shadow-inner" value={dreamInput} onChange={e => setDreamInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDreamDecode()} />
                                        <button onClick={handleDreamDecode} disabled={dreamLoading} className="bg-purple-600 text-white p-3 rounded-xl shadow-sm hover:bg-purple-700 transition-colors shrink-0">{dreamLoading ? <Loader2 size={16} className="animate-spin"/> : <Moon size={16}/>}</button>
                                        </div>
                                        {dreamResult?.type === 'success' && <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded shadow-inner"><p className="text-sm text-slate-800 font-serif italic whitespace-pre-wrap">{String(dreamResult.text)}</p></div>}
                
                                        <button onClick={handleLuckyElements} disabled={luckyLoading} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl shadow-sm text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                        {luckyLoading ? <Loader2 size={16} className="animate-spin"/> : <Star size={16} className="text-amber-500"/>} Find Lucky Elements
                                        </button>
                                        {luckyResult?.type === 'success' && <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-3 rounded shadow-inner"><p className="text-sm text-slate-800 font-serif italic whitespace-pre-wrap">{String(luckyResult.text)}</p></div>}
                                    </div>
                                </div>
                            </div>
                </>
    )}
                        </div>
                      </div>
                    </div>
        </>
      )}
    </div>
  );
} 
