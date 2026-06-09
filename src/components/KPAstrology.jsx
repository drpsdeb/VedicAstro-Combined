import React, { useState, useMemo, useEffect } from 'react';
import { calculatePlacidusCusps, getKPDivisions } from '../utils/kpEngine.js';
import { evaluateEventPromise, calculateRulingPlacements, KP_EVENT_HOUSES } from '../utils/kpRules.js';
import { getPositionsForProfile, OfflineEphemeris } from '../utils/ephemerisEngine.js';
import KPGrid from './KPGrid.jsx';
import KPSignificators from './KPSignificators.jsx';
import FourStepAnalysis from './FourStepAnalysis.jsx';
import KPPredictions from './KPPredictions.jsx';
import PreciseCalculationToggle from './PreciseCalculationToggle.jsx';
import KPAiConsultant from './KPAiConsultant.jsx';
import KPInterpretation from './KPInterpretation.jsx';
import KPTimingScreen from './KPTimingScreen.jsx';
import KPDeathPrediction from './KPDeathPrediction.jsx';

export default function KPAstrology({ profile, savedProfiles, onSelectProfile, onBack, geminiKey, astroLevel, language }) {
  const [activeTab, setActiveTab] = useState('cusps_planets');

  // Precise calculation state listeners
  const [preciseToggle, setPreciseToggle] = useState(() => localStorage.getItem('use_precise_api') === 'true');
  const [calcTrigger, setCalcTrigger] = useState(0);

  useEffect(() => {
    const handleToggle = () => {
      setPreciseToggle(localStorage.getItem('use_precise_api') === 'true');
      setCalcTrigger(prev => prev + 1);
    };
    const handleUpdate = () => {
      setCalcTrigger(prev => prev + 1);
    };
    window.addEventListener('api_toggle_changed', handleToggle);
    window.addEventListener('planetary_positions_updated', handleUpdate);
    return () => {
      window.removeEventListener('api_toggle_changed', handleToggle);
      window.removeEventListener('planetary_positions_updated', handleUpdate);
    };
  }, []);

  // Prashna / Horary state
  const [prashnaTime, setPrashnaTime] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - tzOffset);
    return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  });

  const [prashnaLat, setPrashnaLat] = useState(() => String(profile?.lat ?? 17.3850));
  const [prashnaLon, setPrashnaLon] = useState(() => String(profile?.lon ?? 78.4867));
  const [prashnaTzone, setPrashnaTzone] = useState(() => String(profile?.tzone ?? 5.5));
  const [selectedEvent, setSelectedEvent] = useState('MARRIAGE');
  const [prashnaResult, setPrashnaResult] = useState(null);
  const [rulingPlanetsResult, setRulingPlanetsResult] = useState(null);

  // Calculate base profile calculations
  const kpData = useMemo(() => {
    if (!profile || !profile.dob) return null;

    try {
      const positions = getPositionsForProfile(profile);
      if (!positions) return null;

      const lagnaLon = positions.lagnaDegree ?? positions.lagna.longitude;

      // Obliquity calculation
      const jd = (new Date(profile.dob).getTime() / 86400000) + 2440587.5;
      const t = (jd - 2451545.0) / 36525.0;
      const obliquity = 23.439291 - 0.0130042 * t;

      const cusps = calculatePlacidusCusps(lagnaLon, Number(profile.lat), obliquity);

      return {
        positions,
        cusps,
        obliquity
      };
    } catch (e) {
      console.error("KP Engine Calculation Error:", e);
      return null;
    }
  }, [profile, preciseToggle, calcTrigger]);

  if (!profile || !profile.dob) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#fdfde8] text-slate-800 rounded-xl border border-slate-350 max-w-4xl mx-auto my-6 shadow-xl text-center">
        <span className="text-4xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold font-serif text-amber-850">No Birth Profile Loaded</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md">Please load a profile from the Profile Manager sidebar before accessing the Krishnamurti Paddhati (KP) Astrology dashboard.</p>
        <button onClick={onBack} className="mt-6 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold shadow-md transition-colors text-sm uppercase font-serif">
          Go to Vedic Astrology
        </button>
      </div>
    );
  }

  if (!kpData) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 bg-[#ececd6]">
        <div className="text-center text-slate-600 font-serif font-semibold">
          Calculating high-precision house cusps and divisions...
        </div>
      </div>
    );
  }

  // Handle Prashna ruling planets and event promise evaluation
  const handleCalculateRuling = () => {
    try {
      const dateObj = new Date(prashnaTime);
      const loc = {
        latitude: parseFloat(prashnaLat),
        longitude: parseFloat(prashnaLon),
        timezone: parseFloat(prashnaTzone)
      };

      const res = calculateRulingPlacements(dateObj, loc);
      setRulingPlanetsResult(res);
    } catch (e) {
      alert(`RP Calculation failed: ${e.message}`);
    }
  };

  const handleEvaluatePrashnaPromise = () => {
    try {
      const dateObj = new Date(prashnaTime);
      const lat = parseFloat(prashnaLat);
      const lon = parseFloat(prashnaLon);
      const timezone = parseFloat(prashnaTzone);

      // 1. Cast the Prashna chart at judgment time
      const positions = OfflineEphemeris.getPositions(dateObj, lat, lon);
      const lagnaLon = positions.lagnaDegree ?? positions.lagna.longitude;

      // 2. Compute obliquity
      const jd = (dateObj.getTime() / 86400000) + 2440587.5;
      const t = (jd - 2451545.0) / 36525.0;
      const obliquity = 23.439291 - 0.0130042 * t;

      // 3. Compute Placidus house cusps
      const prashnaCusps = calculatePlacidusCusps(lagnaLon, lat, obliquity);

      // 4. Calculate house significators map
      const significators = {};
      const getHouseForLongitude = (deg) => {
        for (let h = 1; h <= 12; h++) {
          const start = prashnaCusps[h];
          const end = prashnaCusps[h === 12 ? 1 : h + 1];
          if (start < end) {
            if (deg >= start - 1e-9 && deg < end) return h;
          } else {
            if (deg >= start - 1e-9 || deg < end) return h;
          }
        }
        return 1;
      };

      const planetsMapped = positions.planets.map((p) => {
        const lonVal = p.longitude ?? p.fullDegree;
        const div = getKPDivisions(lonVal);
        return {
          name: p.planet,
          longitude: lonVal,
          starLord: div.starLord,
          house: getHouseForLongitude(lonVal)
        };
      });

      for (let h = 1; h <= 12; h++) {
        const cuspLon = prashnaCusps[h];
        const cuspDiv = getKPDivisions(cuspLon);
        const cuspSubLord = cuspDiv.subLord;
        const houseLord = cuspDiv.signLord;

        const levelA = [cuspSubLord];
        const levelB = planetsMapped.filter(p => p.starLord === cuspSubLord).map(p => p.name);
        const levelC = planetsMapped.filter(p => p.house === h).map(p => p.name);
        const levelD = planetsMapped.filter(p => p.starLord === houseLord).map(p => p.name);

        significators[h] = {
          house: h,
          cuspLongitude: cuspLon,
          houseLord,
          cuspSubLord,
          allSignificators: Array.from(new Set([...levelA, ...levelB, ...levelC, ...levelD]))
        };
      }

      // 5. Evaluate the event promise
      const evalRes = evaluateEventPromise(selectedEvent, prashnaCusps, significators);
      setPrashnaResult({
        ...evalRes,
        timestamp: prashnaTime,
        locationName: `${prashnaLat}°, ${prashnaLon}°`
      });
    } catch (e) {
      alert(`Prashna Promise evaluation failed: ${e.message}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cusps_planets':
        return <KPGrid cusps={kpData.cusps} planets={kpData.positions.planets} />;
      case 'significators':
        return <KPSignificators cusps={kpData.cusps} planets={kpData.positions.planets} />;
      case 'four_step':
        return <FourStepAnalysis cusps={kpData.cusps} planets={kpData.positions.planets} />;
      case 'interpretation':
        return <KPInterpretation cusps={kpData.cusps} planets={kpData.positions.planets} />;
      case 'timing':
        return <KPTimingScreen cusps={kpData.cusps} planets={kpData.positions.planets} profile={profile} />;
      case 'death_prediction':
        return <KPDeathPrediction cusps={kpData.cusps} planets={kpData.positions.planets} profile={profile} />;
      case 'predictions_timeline':
        return <KPPredictions cusps={kpData.cusps} planets={kpData.positions.planets} profile={profile} />;
      case 'ai_consultant':
        return <KPAiConsultant cusps={kpData.cusps} planets={kpData.positions.planets} profile={profile} geminiKey={geminiKey} language={language} />;
      case 'ruling_planets':
        return (
          <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8 items-start">
            
            {/* Prashna Control Center */}
            <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
              <div>
                <h4 className="font-serif font-bold text-base text-slate-800">Horary & Ruling Planets Inputs</h4>
                <p className="text-xs text-slate-500 mt-1">Set parameters for the instant Prashna question</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Judgment Time</label>
                <input 
                  type="datetime-local" 
                  value={prashnaTime} 
                  onChange={(e) => setPrashnaTime(e.target.value)} 
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none" 
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Lat</label>
                  <input type="number" step="any" value={prashnaLat} onChange={(e) => setPrashnaLat(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Lon</label>
                  <input type="number" step="any" value={prashnaLon} onChange={(e) => setPrashnaLon(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">T.Zone</label>
                  <input type="number" step="any" value={prashnaTzone} onChange={(e) => setPrashnaTzone(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button onClick={handleCalculateRuling} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase transition-colors">
                  Calculate Ruling Planets
                </button>
              </div>

              <div className="pt-4 border-t border-slate-150 space-y-3">
                <div>
                  <h5 className="font-serif font-bold text-sm text-slate-800">Prashna Event Promise</h5>
                  <p className="text-[10px] text-slate-500">Determine whether an event is promised right now</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Event Type</label>
                  <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-semibold">
                    {Object.keys(KP_EVENT_HOUSES).map(ev => (
                      <option key={`ev-${ev}`} value={ev}>{ev.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleEvaluatePrashnaPromise} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-colors">
                  Evaluate Prashna Promise
                </button>
              </div>
            </div>

            {/* Results Display */}
            <div className="xl:col-span-2 space-y-6 text-left">
              
              {/* Ruling Planets Results */}
              {rulingPlanetsResult && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-serif font-bold text-base text-slate-800">Ruling Planets (RP) Factors</h4>
                    <p className="text-xs text-slate-500">Calculated dynamically at judgment time (Sunrise adjusted)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-semibold">
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Lagna Rasi Lord</span>
                      <span className="text-slate-800 text-sm font-black">{rulingPlanetsResult.ascendantRasiLord}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Lagna Star Lord</span>
                      <span className="text-slate-800 text-sm font-black">{rulingPlanetsResult.ascendantStarLord}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Moon Rasi Lord</span>
                      <span className="text-slate-800 text-sm font-black">{rulingPlanetsResult.moonRasiLord}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Moon Star Lord</span>
                      <span className="text-slate-800 text-sm font-black">{rulingPlanetsResult.moonStarLord}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Day Lord (True)</span>
                      <span className="text-slate-800 text-sm font-black">{rulingPlanetsResult.dayLord}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Ruling Planets Set:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rulingPlanetsResult.rulingPlanets.map(p => (
                        <span key={`rp-${p}`} className="px-2.5 py-1 text-xs font-black bg-slate-800 text-white border border-slate-900 rounded-lg shadow-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Prashna Promise Result */}
              {prashnaResult && (
                <div className={`border-2 rounded-2xl p-5 shadow-sm space-y-4 ${
                  prashnaResult.isPromised 
                    ? 'bg-emerald-50/20 border-emerald-500/30' 
                    : 'bg-rose-50/20 border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-3 border-b border-slate-150 pb-3">
                    <span className={`text-3xl ${prashnaResult.isPromised ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {prashnaResult.isPromised ? '✅' : '❌'}
                    </span>
                    <div>
                      <h4 className="font-serif font-black text-lg text-slate-800 leading-none">
                        {prashnaResult.isPromised ? 'Event is promised!' : 'Event is not promised.'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
                        Horary analysis for {prashnaResult.details.eventType} at {prashnaResult.timestamp}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm font-serif leading-relaxed text-slate-700 space-y-2.5">
                    <p>The primary house governing <strong>{prashnaResult.details.eventType}</strong> is <strong>House {prashnaResult.details.primaryHouse}</strong>, with supporting houses <strong>{prashnaResult.details.supportingHouses.join(', ')}</strong>.</p>
                    <p>The Sub-Lord of the House {prashnaResult.details.primaryHouse} cusp is <strong className="text-amber-700">{prashnaResult.primarySubLord}</strong>.</p>
                    <p>
                      {prashnaResult.isPromised 
                        ? `Because the cusp sub-lord ${prashnaResult.primarySubLord} is a significator for the event's houses (either primary House ${prashnaResult.details.primaryHouse} or supporting), the event is promised to manifest.`
                        : `Because the cusp sub-lord ${prashnaResult.primarySubLord} does NOT signify any of the relevant houses (neither primary House ${prashnaResult.details.primaryHouse} nor supporting ${prashnaResult.details.supportingHouses.join(', ')}), the event is NOT promised to manifest at this time.`
                      }
                    </p>
                  </div>

                  <div className="bg-white/80 border border-slate-200/60 p-4 rounded-xl space-y-2.5 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span>Primary House ({prashnaResult.details.primaryHouse}) Significators:</span>
                      <span className="font-mono text-slate-600">[ {prashnaResult.primarySignificators.join(', ') || 'None'} ]</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supporting Houses ({prashnaResult.details.supportingHouses.join(', ')}) Significators:</span>
                      <span className="font-mono text-slate-600">[ {prashnaResult.supportingSignificators.join(', ') || 'None'} ]</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Placeholder info */}
              {!rulingPlanetsResult && !prashnaResult && (
                <div className="bg-slate-50 border border-slate-250 border-dashed rounded-2xl p-8 text-center text-slate-500 font-serif min-h-[200px] flex items-center justify-center">
                  Use the control panel on the left to compute ruling planets or evaluate Prashna queries at the judgment moment.
                </div>
              )}

            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-left">
      
      {/* KP Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold font-serif text-green-800">Krishnamurti Paddhati (KP) Astrology</h2>
          <p className="text-xs text-slate-500 mt-1">High-precision Placidus house division, 249 sub-lord mappings, and event promise matrix</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <PreciseCalculationToggle />
          <select 
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none cursor-pointer"
            value={profile.id}
            onChange={(e) => {
              const selected = savedProfiles.find(p => p.id === e.target.value);
              if (selected && onSelectProfile) onSelectProfile(selected);
            }}
          >
            {savedProfiles.map(p => (
              <option key={`sel-profile-${p.id}`} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors uppercase font-serif"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Dashboard Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto max-w-full gap-2">
        <button 
          onClick={() => setActiveTab('cusps_planets')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'cusps_planets' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cusps & Planets
        </button>
        <button 
          onClick={() => setActiveTab('significators')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'significators' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Significators
        </button>
        <button 
          onClick={() => setActiveTab('four_step')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'four_step' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Four-Step Analysis
        </button>
        <button 
          onClick={() => setActiveTab('interpretation')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'interpretation' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          KP Interpretation
        </button>
        <button 
          onClick={() => setActiveTab('timing')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'timing' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Event Timing
        </button>
        <button 
          onClick={() => setActiveTab('death_prediction')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'death_prediction' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Longevity & Death
        </button>
        <button 
          onClick={() => setActiveTab('predictions_timeline')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'predictions_timeline' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Predictions Timeline
        </button>
        <button 
          onClick={() => setActiveTab('ai_consultant')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ai_consultant' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          AI Consultant
        </button>
        <button 
          onClick={() => setActiveTab('ruling_planets')}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'ruling_planets' 
              ? 'border-amber-500 text-slate-900' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ruling Planets / Prashna
        </button>
      </div>

      {/* Tab Panel viewport */}
      <div className="w-full">
        {renderTabContent()}
      </div>

    </div>
  );
}
