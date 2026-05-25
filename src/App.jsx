import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Star, Info, Settings, Loader2, Search, Cloud, Plus, Cpu, AlertTriangle, X, Home, MessageCircle, Moon, Sun, Sparkles, Key, CheckCircle2, Compass, HelpCircle, BarChart2, ShieldAlert, Zap, BookOpen } from 'lucide-react';

// 🚀 CUSTOM SANDBOX COMPONENT IMPORTS
import AstroWatchView from './components/AstroWatchView';
import AstroMatchView from './components/AstroMatchView'; // If you use it here as well
import ProfileManager from './components/ProfileManager';
import SearchableDropdown from './components/SearchableDropdown';

// ==========================================
// FIREBASE CLOUD SETUP
// ==========================================
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

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

const generateProfileId = (profile = {}) => {
  const name = String(profile.name || '').trim().toLowerCase().replace(/\s+/g, '_');
  const dob = String(profile.dob || '').trim();
  return encodeURIComponent(`${name}_${dob}`);
};

const normalizeProfile = (profile = {}) => {
  const firstName = String(profile.firstName || profile.firstname || '').trim();
  const lastName = String(profile.lastName || profile.lastname || '').trim();
  const explicitName = String(profile.name || profile.fullName || profile.fullname || profile.displayName || '').trim();
  const constructedName = `${firstName} ${lastName}`.trim();
  const name = explicitName || constructedName || String(profile.city || profile.location || '').trim() || 'Unknown Profile';
  const dob = String(profile.dob || profile.birthDate || profile.dateOfBirth || '').trim();
  const time = String(profile.time || profile.tob || profile.birthTime || '12:00').trim();
  const lat = Number(profile.lat ?? profile.latitude ?? profile.currentLat ?? profile.currentLatitude ?? 0);
  const lon = Number(profile.lon ?? profile.longitude ?? profile.currentLon ?? profile.currentLongitude ?? 0);
  const tzone = Number(profile.tzone ?? profile.tz ?? profile.timezone ?? profile.currentTzone ?? profile.currentTimezone ?? 5.5);
  const category = String(profile.category || 'Family').trim();
  const familyHeadId = String(profile.familyHeadId || '').trim();
  const relationship = String(profile.relationship || '').trim();

  return {
    ...profile,
    name,
    dob,
    time,
    lat: Number.isFinite(lat) ? lat : 0,
    lon: Number.isFinite(lon) ? lon : 0,
    tzone: Number.isFinite(tzone) ? tzone : 5.5,
    category,
    familyHeadId,
    relationship,
    id: profile.id || generateProfileId({ name, dob })
  };
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

import { OfflineEphemeris, AstroEngine, getPositionsForProfile } from './utils/ephemerisEngine';

// ==========================================
// UI COMPONENTS
// ==========================================
const BirthForm = ({ onStartApp, savedProfiles, onSaveProfile, onDeleteProfile, onGoogleLogin , isLoggedIn }) => {
  const emptyClient = { name: '', dob: '',dod: '', time: '', city: '', state: '', lat: 17.3850, lon: 78.4867, tzone: 5.5, sameAsBirth: true, currentCity: '', currentLat: 17.3850, currentLon: 78.4867, currentTzone: 5.5, astroLevel: 'beginner', language: 'English', chartStyle: 'North Indian', maritalStatus: 'Unknown', careerStatus: 'Unknown', parentsStatus: 'Unknown', children: 'Unknown', lifeContext: '', category: 'Family', familyHeadId: '', relationship: '' };
   
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
  const handleClientSelect = (e) => {
    const selectedId = e.target.value;
    const selected = savedProfiles.find(profile => profile.id === selectedId);
    if (selected) setFormData({ ...emptyClient, ...selected });
  };
  const handleDeleteClient = () => {
    onDeleteProfile(formData);
    const remaining = savedProfiles.filter(p => p && p.id !== generateProfileId(formData));
    setFormData(remaining.length > 0 ? { ...emptyClient, ...remaining[0] } : emptyClient);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Keep for backward compatibility: Save + enter app
    if (formData && formData.name && formData.dob) {
        onSaveProfile(formData);
        safeStorage.set('astroFormData', formData);
        safeStorage.set('geminiApiKey', geminiKey);
        if (typeof onStartApp === 'function') onStartApp({ formData, geminiKey });
    }
  };

  const handleSaveOnly = () => {
    if (formData && formData.name && formData.dob) {
      onSaveProfile(formData);
      safeStorage.set('astroFormData', formData);
      safeStorage.set('geminiApiKey', geminiKey);
    }
  };

  const handleSaveAndBack = () => {
    if (formData && formData.name && formData.dob) {
      onSaveProfile(formData);
      safeStorage.set('astroFormData', formData);
      safeStorage.set('geminiApiKey', geminiKey);
      if (typeof onStartApp === 'function') {
        // Call parent navigation handler. Parent may expect the saved data (setUserData) or just navigate (setActiveModule)
        try { onStartApp({ formData, geminiKey }); } catch (e) { try { onStartApp(); } catch (ee) {} }
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-[#fdfde8] text-slate-800 rounded-xl shadow-2xl max-w-md mx-auto my-10 border border-slate-300 relative z-50">
      <div className="flex justify-between items-center w-full mb-4">
        <div className="flex gap-3 items-center">
            <LogoSVG />
            <h2 className="text-2xl font-bold font-serif text-green-800">Profile</h2>
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

      <form onSubmit={(e) => e.preventDefault()} className="w-full space-y-4">
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
              {savedProfiles.map((client) => {
                if (!client || !client.name) return null;
                if (profileSearch && !client.name.toLowerCase().includes(profileSearch.toLowerCase())) return null;
                return <option key={client.id} value={client.id}>{String(client.name)}</option>;
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

        <div className="bg-[#f0f9ff] p-3 rounded-lg border border-blue-200 space-y-3">
          <div>
            <label className="block text-xs font-bold text-blue-900 uppercase mb-1">Category / Group Tag</label>
            <select 
              value={formData.category || 'Family'} 
              onChange={e => {
                const cat = e.target.value;
                setFormData({
                  ...formData,
                  category: cat,
                  familyHeadId: cat === 'Family' ? formData.familyHeadId : '',
                  relationship: cat === 'Family' ? formData.relationship : ''
                });
              }}
              className="w-full p-2 bg-white rounded border border-blue-200 outline-none text-sm font-semibold text-blue-955 cursor-pointer"
            >
              <option value="Family">👨‍👩‍👧‍👦 Family</option>
              <option value="Friend">🤝 Friend</option>
              <option value="Patient">🩺 Patient</option>
              <option value="Facebook">🌐 Facebook / Social</option>
              <option value="Client">💼 Client</option>
              <option value="Other">❓ Other</option>
            </select>
          </div>

          {formData.category === 'Family' && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100">
              <div>
                <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Family Group / Head</label>
                <select
                  value={formData.familyHeadId || ''}
                  onChange={e => setFormData({ ...formData, familyHeadId: e.target.value })}
                  className="w-full p-1.5 bg-white rounded border border-blue-200 outline-none text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">-- None (Is Family Head) --</option>
                  {savedProfiles
                    .filter(p => p && p.name && (!p.familyHeadId || p.familyHeadId === p.id) && p.id !== formData.id)
                    .map(head => (
                      <option key={head.id} value={head.id}>{head.name}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Relationship to Head</label>
                <select
                  value={formData.relationship || ''}
                  onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                  disabled={!formData.familyHeadId}
                  className="w-full p-1.5 bg-white rounded border border-blue-200 outline-none text-xs text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="">-- Select Role --</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Daughter-in-law">Daughter-in-law</option>
                  <option value="Son-in-law">Son-in-law</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Relative">Relative</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

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

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={handleSaveOnly} className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded shadow-md transition-colors text-sm uppercase tracking-wider font-serif">
            {savedProfiles?.some(profile => profile.id === generateProfileId(formData)) ? "Save / Update" : "Save to Cloud"}
          </button>

          <button type="button" onClick={handleSaveAndBack} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded shadow-sm transition-colors text-sm uppercase tracking-wider">
            Back to Hub
          </button>
        </div>
      </form>
    </div>
  );
};

const ProfileLibrary = ({ savedProfiles, onSaveProfile, onDeleteProfile, onLoadProfile, onBack }) => {
  const emptyClient = { name: '', dob: '', time: '', city: '', state: '', lat: 17.385, lon: 78.4867, tzone: 5.5, currentCity: '', currentLat: 17.385, currentLon: 78.4867, currentTzone: 5.5, astroLevel: 'beginner', language: 'English', chartStyle: 'North Indian', maritalStatus: 'Unknown', careerStatus: 'Unknown', parentsStatus: 'Unknown', children: 'Unknown', lifeContext: '' };
  const [editProfile, setEditProfile] = useState(() => (savedProfiles?.[0] ? { ...savedProfiles[0] } : emptyClient));

  useEffect(() => {
    if (savedProfiles?.length > 0) setEditProfile(prev => {
      if (!prev?.id) return { ...savedProfiles[0] };
      const selected = savedProfiles.find(p => p.id === prev.id);
      return selected ? { ...selected } : { ...savedProfiles[0] };
    });
  }, [savedProfiles]);

  const handleSelect = (e) => {
    const targetId = e.target.value;
    const selected = savedProfiles.find(profile => profile.id === targetId);
    if (selected) setEditProfile({ ...selected });
  };

  const handleChange = (key, value) => setEditProfile(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!editProfile?.name || !editProfile?.dob) return;
    onSaveProfile(editProfile);
  };

  const handleDelete = () => {
    if (!editProfile?.name || !editProfile?.dob) return;
    onDeleteProfile(editProfile);
    const remaining = savedProfiles.filter(p => p.id !== editProfile.id);
    setEditProfile(remaining.length > 0 ? { ...remaining[0] } : emptyClient);
  };

  return (
    <div className="min-h-screen bg-[#f2f2e9] text-slate-900 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 p-6 bg-slate-50 border-b border-slate-200">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Profile Library</h2>
            <p className="text-sm text-slate-600 mt-2">Manage your saved natal profiles and sync them between local storage and Firebase.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-3 items-center">
            <button onClick={onBack} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 font-semibold">← Back</button>
            <button onClick={() => setEditProfile(emptyClient)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">New Profile</button>
            <button onClick={() => onLoadProfile(editProfile)} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold">Load to AstroWatch</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Saved Profiles</h3>
              <span className="text-xs uppercase tracking-widest text-slate-500">{savedProfiles?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {savedProfiles && savedProfiles.length > 0 ? savedProfiles.map(profile => (
                <button key={profile.id} type="button" onClick={() => setEditProfile({ ...profile })} className={`w-full text-left p-3 rounded-2xl border ${profile.id === editProfile?.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'} hover:border-emerald-400 transition-all`}>
                  <div className="font-semibold text-slate-800">{profile.name}</div>
                  <div className="text-xs text-slate-500">{profile.dob} • {profile.time || 'No time'}</div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No saved profiles found yet.</div>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Profile</label>
                <select value={editProfile?.id || ''} onChange={handleSelect} className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50 focus:border-emerald-500 outline-none">
                  <option value="">-- Choose existing profile --</option>
                  {savedProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.name} • {profile.dob}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <button type="button" onClick={handleSave} className="w-full px-4 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700">Save / Update</button>
                <button type="button" onClick={handleDelete} className="w-full px-4 py-3 bg-rose-100 text-rose-700 rounded-2xl font-semibold hover:bg-rose-200">Delete</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Full Name</label>
                <input value={editProfile.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Date of Birth</label>
                <input type="date" value={editProfile.dob || ''} onChange={(e) => handleChange('dob', e.target.value)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Time of Birth</label>
                <input type="time" value={editProfile.time || ''} onChange={(e) => handleChange('time', e.target.value)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Time Zone</label>
                <input type="number" step="0.25" value={editProfile.tzone || ''} onChange={(e) => handleChange('tzone', parseFloat(e.target.value) || 0)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Latitude</label>
                <input type="number" step="0.0001" value={editProfile.lat || ''} onChange={(e) => handleChange('lat', parseFloat(e.target.value) || 0)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Longitude</label>
                <input type="number" step="0.0001" value={editProfile.lon || ''} onChange={(e) => handleChange('lon', parseFloat(e.target.value) || 0)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-slate-600 uppercase font-bold mb-1">Current City / Notes</label>
              <input value={editProfile.currentCity || ''} onChange={(e) => handleChange('currentCity', e.target.value)} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" placeholder="Current City" />
            </div>
          </div>
        </div>
      </div>
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
        
        {/* PATH 3: ASTROWATCH (LOCAL MODULAR VIEWPORT ROUTE FIXED) */}
        <button
          onClick={() => onSelectPath('watch', false)}
          className="group bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-sky-100 flex flex-col text-left cursor-pointer"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🔭</div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">AstroWatch</h3>
          <p className="text-slate-500 mb-6 text-sm flex-grow">Track real-time planetary transits, dynamic muhurtas, and celestial events.</p>
          <div className="text-sky-600 font-bold flex items-center gap-1 mt-auto">
            Launch App <span>→</span>
          </div>
        </button>

        {/* PATH 4: Profile hub button moved to bottom */}

        {/* PATH 5: ASTROMATCH (DVADASHA KOOT MILAN) */}
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
      {/* Profile hub button placed above Future Modules */}
      <div className="mt-8 flex justify-center px-4">
        <button
          onClick={() => onSelectPath('profiles', false)}
          className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-slate-100 hover:border-emerald-500 text-left max-w-3xl w-full"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">📁</div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Profile</h3>
              <p className="text-slate-500 text-sm">Open the full Profile form (Place of Birth, lat/lon, timezone).</p>
            </div>
            <div className="ml-auto text-emerald-600 font-bold">Open Profile Form →</div>
          </div>
        </button>
      </div>

      <div className="border-t pt-10 text-center mt-12">
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
  
  // Load a profile from the hub/profile library into the main app
  const handleLoadProfile = (profile) => {
    if (!profile) return;
    setUserData({ formData: profile, geminiKey: safeStorage.get('geminiApiKey') || '' });
    setActiveModule(null);
  };

  const goToHub = () => setActiveModule(null);
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
      const valid = local
        .filter(p => p && typeof p === 'object' && p.name && p.dob)
        .map(normalizeProfile);
      if (valid.length > 0) return valid;
    }
    return [{ name: "Master Key", dob: "1954-10-29", time: "10:50", lat: 22.5, lon: 88.3, tzone: 5.5, id: generateProfileId({ name: "Master Key", dob: "1954-10-29" }) }];
  });

  const sortedProfiles = useMemo(() => {
    if (!savedProfiles) return [];
    return [...savedProfiles]
      .filter(p => p && p.name)
      .sort((a, b) => {
        const nameA = String(a.name).trim().toLowerCase();
        const nameB = String(b.name).trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [savedProfiles]);

  const [cloudStatus, setCloudStatus] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  const loadCloudProfiles = useCallback(async () => {
    if (!db) {
      setCloudStatus('Firebase unavailable.');
      return;
    }

    setCloudLoading(true);
    setCloudStatus('Connecting to Firebase...');

    try {
      if (!auth.currentUser) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }

      const user = auth.currentUser;
      if (!user) {
        setCloudStatus('Firebase sign-in failed.');
        setCloudLoading(false);
        return;
      }

      const profilesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'profiles');
      const snapshot = await getDocs(profilesRef);
      const cloudProfiles = snapshot.docs.map(doc => normalizeProfile({ id: doc.id, ...doc.data() }));
      if (cloudProfiles.length > 0) {
        setSavedProfiles(cloudProfiles);
        safeStorage.set('astroClients', cloudProfiles);
        setCloudStatus(`Loaded ${cloudProfiles.length} cloud profiles.`);
      } else {
        setCloudStatus('No cloud profiles found.');
      }
    } catch (error) {
      console.error('Firebase load error:', error);
      setCloudStatus(error?.message || 'Failed to load cloud profiles.');
    } finally {
      setCloudLoading(false);
    }
  }, []);



  // 🔐 GOOGLE SIGN-IN FUNCTION
  const handleGoogleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => console.log(`✅ Welcome, ${result.user.displayName}!`))
      .catch((error) => console.error("❌ Google Login Failed", error));
  };

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
    if (!formData || !formData.name || !formData.dob) return;
    const profile = normalizeProfile(formData);
    console.log("🛠️ Saving profile:", profile.name, profile.dob);

    // 1. LOCAL SAVE
    let currentList = [];
    try {
      const stored = window.localStorage.getItem('astroClients');
      currentList = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) currentList = [];
    } catch (e) {
      currentList = [];
    }

    const idx = currentList.findIndex(p => p && generateProfileId(p) === profile.id);
    if (idx >= 0) currentList[idx] = profile;
    else currentList.push(profile);

    const normalizedList = currentList.map(normalizeProfile);
    window.localStorage.setItem('astroClients', JSON.stringify(normalizedList));
    setSavedProfiles(normalizedList);
    console.log("🛠️ Local storage updated.");

    // 2. CLOUD SAVE
    if (typeof db !== 'undefined') {
      console.log("🛠️ Firebase found! Attempting cloud save...");
      try {
        if (!auth.currentUser) {
          console.log("🛠️ Signing in anonymously...");
          await signInAnonymously(auth);
        }
        const uid = auth.currentUser.uid;
        const docRef = doc(db, 'artifacts', appId, 'users', uid, 'profiles', profile.id);
        await setDoc(docRef, profile);
        console.log("🔥 Cloud save successful!");
      } catch (error) {
        console.error("❌ Firebase Error:", error);
      }
    } else {
      console.error("❌ Error: 'db' variable not found!");
    }
  };
    
    
  
  const handleDeleteProfile = async (formData) => {
    if (!formData || !formData.name || !formData.dob) return;
    const targetId = generateProfileId(formData);
    const updated = savedProfiles.filter(p => p && p.id !== targetId);
    setSavedProfiles(updated.length > 0 ? updated : HARDCODED_PROFILES);
    safeStorage.set('astroClients', updated.length > 0 ? updated : HARDCODED_PROFILES);

    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', targetId));
      } catch (e) {
        console.error("Error deleting profile from cloud:", e);
      }
    }
  };

  const handleTopBarProfileSwitch = (valOrEvent) => {
    const targetId = valOrEvent && valOrEvent.target ? valOrEvent.target.value : valOrEvent;
    const selected = savedProfiles.find(p => p.id === targetId);
    if (selected) {
      setUserData({ ...userData, formData: selected });
      safeStorage.set('astroFormData', selected);
    }
  };

  const profileManagerComponent = (
    <ProfileManager
      appId={appId}
      auth={auth}
      db={db}
      onUserChanged={setUser}
      onProfilesSynced={setSavedProfiles}
    />
  );

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

  // Only render the standalone BirthForm when user lacks data AND user explicitly opened Profiles
  if ((!userData || !userData.formData) && activeModule === 'profiles') {
    return (
      <div className="min-h-screen bg-slate-200 font-sans p-4 flex items-center justify-center">
        {profileManagerComponent}
        <BirthForm onDeleteProfile={handleDeleteProfile} onGoogleLogin={handleGoogleLogin} onSaveProfile={handleSaveProfile} onStartApp={() => setActiveModule(null)} savedProfiles={sortedProfiles} isLoggedIn={!!auth?.currentUser} />
      </div>
    );
  }
  
  // Safe variable assignment after auth
  const sunTransit = transits?.find(p => p.planet === 'Sun');
  const moonTransit = transits?.find(p => p.planet === 'Moon');
  const panchang = (sunTransit && moonTransit && isExpert) ? AstroEngine.getPanchang(sunTransit.fullDegree, moonTransit.fullDegree, time) : null;
  const functionalNature = !isNaN(lagnaIndex) ? AstroEngine.FUNCTIONAL_ROLES[lagnaIndex] : null;

  if (activeModule === 'watch') {
    return (
      <AstroWatchView
        savedProfiles={sortedProfiles}
        currentProfileName={userData?.formData?.name}
        onBack={() => setActiveModule(null)}
        onSelectProfile={(profileData) => {
          setUserData({ ...userData, formData: profileData });
          safeStorage.set('astroFormData', profileData);
        }}
      />
    );
  }

  if (activeModule === 'profiles') {
    // Map the legacy 'profiles' route to the original Initialize AstroWatch form
    return (
      <div className="min-h-screen bg-slate-200 font-sans p-4 flex items-center justify-center">
        {profileManagerComponent}
        <BirthForm onDeleteProfile={handleDeleteProfile} onGoogleLogin={handleGoogleLogin} onSaveProfile={handleSaveProfile} onStartApp={() => setActiveModule(null)} savedProfiles={sortedProfiles} isLoggedIn={!!auth?.currentUser} />
      </div>
    );
  }

  // If user opened the Match module, render the focused AstroMatch view only
  if (activeModule === 'match') {
    return (
      <div className="min-h-screen bg-slate-200 font-sans p-4 flex items-center justify-center">
        {profileManagerComponent}
        <AstroMatchView
          savedProfiles={sortedProfiles}
          onBack={() => setActiveModule(null)}
          onLoadCloudProfiles={loadCloudProfiles}
          cloudStatus={cloudStatus}
          cloudLoading={cloudLoading}
          isCloudSignedIn={!!auth.currentUser}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ececd6] text-slate-800 font-sans flex flex-col">
      {profileManagerComponent}
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
        <span>VedicAstroAll 1.0.0 (AI Live)</span>
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
                            <SearchableDropdown
                              options={sortedProfiles}
                              value={userData?.formData?.id || generateProfileId(userData?.formData)}
                              onChange={handleTopBarProfileSwitch}
                              placeholder="Select Profile"
                              buttonClassName="max-w-[120px] md:max-w-none"
                              groupByCategory={true}
                            />
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
