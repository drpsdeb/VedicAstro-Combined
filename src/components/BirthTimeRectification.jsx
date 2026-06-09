import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, Clock, Star, AlertTriangle, BarChart2, Compass, ShieldAlert, Calendar, Plus, Trash2, TrendingUp, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { getRectifiedChartData, detectVargaChanges } from '../utils/BirthTimeRectification';
import { getD9RasiIndex, AstroEngine } from '../utils/ephemerisEngine';
import { calculateYogas } from '../utils/yoga';
import { validateRectification, EVENT_SIGNIFICATIONS } from '../utils/RectificationValidator';
import BTRChart from './BTRChart';
import PreciseCalculationToggle from './PreciseCalculationToggle';

// Rasi Names formatted nicely
const rasiNames = [
  "Aries (Mesha)", "Taurus (Vrishabha)", "Gemini (Mithuna)", "Cancer (Karka)",
  "Leo (Simha)", "Virgo (Kanya)", "Libra (Tula)", "Scorpio (Vrishchika)",
  "Sagittarius (Dhanu)", "Capricorn (Makara)", "Aquarius (Kumbha)", "Pisces (Meena)"
];

const renderFormattedText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const formatCategoryName = (cat) => {
  if (!cat) return '';
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const renderRamanLines = (ramanText) => {
  if (!ramanText) return null;
  const lines = ramanText.split('\n').filter(line => line.trim() !== '');
  return (
    <ul className="space-y-1 pl-1 list-none text-left">
      {lines.map((line, idx) => {
        let cleanLine = line.trim();
        let isBullet = false;
        if (cleanLine.startsWith('•')) {
          cleanLine = cleanLine.substring(1).trim();
          isBullet = true;
        }
        return (
          <li key={idx} className="text-[10.5px] leading-relaxed text-slate-700 flex items-start gap-1">
            {isBullet && <span className="text-amber-600 font-bold shrink-0">•</span>}
            <span>{renderFormattedText(cleanLine)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const classifyYogas = (yList) => {
  const categories = {
    Raja: { title: "Raja & Dhana Yogas (Wealth & Power)", bg: "bg-amber-50 border-amber-200", text: "text-amber-800", border: "border-amber-100", icon: "Star", yogas: [] },
    Adhi: { title: "Dharma & Karuna Yogas (Wisdom & Virtue)", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", border: "border-emerald-100", icon: "Compass", yogas: [] },
    Arishta: { title: "Arishta & Daridra Yogas (Obstacles & Challenges)", bg: "bg-red-50 border-red-200", text: "text-red-800", border: "border-red-100", icon: "ShieldAlert", yogas: [] },
    General: { title: "General Placements & Strengths", bg: "bg-slate-50 border-slate-200", text: "text-slate-800", border: "border-slate-100", icon: "BarChart2", yogas: [] }
  };

  yList.forEach(y => {
    const typeLower = String(y.type || '').toLowerCase();
    if (typeLower.includes('raja') || typeLower.includes('dhana') || typeLower.includes('strength')) {
      categories.Raja.yogas.push(y);
    } else if (typeLower.includes('dharma') || typeLower.includes('karuna') || typeLower.includes('benefic') || typeLower.includes('protection')) {
      categories.Adhi.yogas.push(y);
    } else if (typeLower.includes('arishta') || typeLower.includes('daridra') || typeLower.includes('challenge')) {
      categories.Arishta.yogas.push(y);
    } else {
      categories.General.yogas.push(y);
    }
  });

  return Object.values(categories).filter(cat => cat.yogas.length > 0);
};

export default function BirthTimeRectification({ birthProfile, onSymbolClick, onUpdateProfileEvents, onBack }) {
  const [timeDelta, setTimeDelta] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');

  // Track calculation engine toggle state dynamically
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

  // Form states for adding events
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('MARRIAGE');
  const [newEventLabel, setNewEventLabel] = useState('');
  const [newEventWeight, setNewEventWeight] = useState(10); // Default Marriage weight (10/10)

  const handleCategoryChange = (category) => {
    setNewEventCategory(category);
    const defaultWeights = {
      MARRIAGE: 10,
      CHILD_BIRTH: 8,
      FIRST_CHILD_BIRTH: 8,
      SECOND_CHILD_BIRTH: 8,
      THIRD_CHILD_BIRTH: 8,
      PARENTS_DEATH: 10,
      MOTHERS_DEATH: 10,
      FATHERS_DEATH: 10,
      MAJOR_DISEASE: 5,
      CAREER_CHANGE: 7,
      HIGHER_EDUCATION: 7,
      ACCIDENT: 5,
      WEALTH_GAIN: 7,
      FOREIGN_TRAVEL: 5,
      ELDER_SIBLING_BIRTH: 7,
      YOUNGER_SIBLING_BIRTH: 7,
      ELDER_SIBLING_DEATH: 8,
      YOUNGER_SIBLING_DEATH: 8,
      SPOUSE_DEATH: 10,
      SELF_DEATH: 10
    };
    if (defaultWeights[category] !== undefined) {
      setNewEventWeight(defaultWeights[category]);
    }
  };

  const handleManualSave = async () => {
    if (!onUpdateProfileEvents) {
      setSaveStatus('Error: sync unavailable');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    setSaveStatus('Saving to Profile...');
    try {
      await onUpdateProfileEvents(lifeEvents);
      setSaveStatus('Saved & Synced!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  // Dynamic default events based on the profile's birth date
  const defaultEvents = useMemo(() => {
    if (!birthProfile || !birthProfile.dob) return [];
    const [yStr, mStr, dStr] = String(birthProfile.dob).split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    if (!Number.isFinite(y)) return [];

    const formatDobOffset = (yearsOffset) => {
      const targetY = y + yearsOffset;
      const pad = (n) => String(n).padStart(2, '0');
      return `${targetY}-${pad(m || 1)}-${pad(d || 1)}`;
    };

    return [
      { id: '1', date: formatDobOffset(28), type: 'MARRIAGE', description: 'Marriage', relevantHouses: [2, 7, 11], weight: 10 },
      { id: '2', date: formatDobOffset(31), type: 'FIRST_CHILD_BIRTH', description: 'Birth of First Child', relevantHouses: [5, 9, 11], weight: 8 },
      { id: '3', date: formatDobOffset(23), type: 'CAREER_CHANGE', description: 'First Major Job', relevantHouses: [6, 10], weight: 7 },
      { id: '4', date: formatDobOffset(35), type: 'MAJOR_DISEASE', description: 'Severe Illness', relevantHouses: [6, 8], weight: 5 }
    ];
  }, [birthProfile]);

  const [lifeEvents, setLifeEvents] = useState(() => {
    if (birthProfile && Array.isArray(birthProfile.lifeEvents)) {
      return birthProfile.lifeEvents;
    }
    return defaultEvents;
  });

  // Reset life events when the profile changes
  useEffect(() => {
    if (birthProfile && Array.isArray(birthProfile.lifeEvents)) {
      setLifeEvents(birthProfile.lifeEvents);
    } else {
      setLifeEvents(defaultEvents);
    }
  }, [birthProfile, defaultEvents]);

  // Original birth chart (0 delta)
  const originalChart = useMemo(() => {
    return getRectifiedChartData(birthProfile, 0);
  }, [birthProfile, preciseToggle, calcTrigger]);

  // Rectified birth chart
  const rectifiedChart = useMemo(() => {
    return getRectifiedChartData(birthProfile, timeDelta);
  }, [birthProfile, timeDelta, preciseToggle, calcTrigger]);

  // Detect Lagna and Navamsa changes
  const vargaChanges = useMemo(() => {
    return detectVargaChanges(originalChart, rectifiedChart);
  }, [originalChart, rectifiedChart]);

  // Score current rectified chart
  const validationResult = useMemo(() => {
    if (!rectifiedChart || lifeEvents.length === 0) {
      return { confidenceScore: 0, eventScores: [] };
    }
    return validateRectification(rectifiedChart, lifeEvents);
  }, [rectifiedChart, lifeEvents]);

  const [history, setHistory] = useState([]);

  // Precompute rectification scores for curve visualization (-60 to +60, 5 min steps)
  const scoreCurvePoints = useMemo(() => {
    if (!birthProfile || lifeEvents.length === 0) return [];
    
    const points = [];
    for (let delta = -60; delta <= 60; delta += 5) {
      const chartAtDelta = getRectifiedChartData(birthProfile, delta);
      if (chartAtDelta) {
        const valAtDelta = validateRectification(chartAtDelta, lifeEvents);
        points.push({
          delta,
          score: valAtDelta.confidenceScore
        });
      }
    }
    return points;
  }, [birthProfile, lifeEvents, preciseToggle, calcTrigger]);

  // Sync precomputed points with history
  useEffect(() => {
    setHistory(scoreCurvePoints);
  }, [scoreCurvePoints]);

  const peakDetails = useMemo(() => {
    if (history.length === 0 || !birthProfile) return null;
    
    let peak = history[0];
    history.forEach(p => {
      if (p.score > peak.score) {
        peak = p;
      }
    });
    
    const currentScore = validationResult.confidenceScore;
    const isAtPeak = currentScore >= peak.score;
    
    const tz = Number(birthProfile.tzone ?? birthProfile.tz ?? 5.5);
    const [y, m, d] = String(birthProfile.dob).split('-').map(Number);
    const [hr, min] = String(birthProfile.time || '12:00').split(':').map(Number);
    const originalUTC = Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000);
    const peakUTC = originalUTC + peak.delta * 60000;
    const localPeak = new Date(peakUTC + (tz * 3600000));
    
    const rHr = String(localPeak.getUTCHours()).padStart(2, '0');
    const rMin = String(localPeak.getUTCMinutes()).padStart(2, '0');
    const peakTimeDisplay = `${rHr}:${rMin}`;
    
    return {
      delta: peak.delta,
      score: peak.score,
      time: peakTimeDisplay,
      isAtPeak
    };
  }, [history, birthProfile, validationResult.confidenceScore]);

  const handleSliderChange = (newDelta) => {
    setTimeDelta(newDelta);
    
    const chartAtDelta = getRectifiedChartData(birthProfile, newDelta);
    if (chartAtDelta) {
      const valAtDelta = validateRectification(chartAtDelta, lifeEvents);
      const score = valAtDelta.confidenceScore;
      
      setHistory(prev => {
        const filtered = prev.filter(p => p.delta !== newDelta);
        return [...filtered, { delta: newDelta, score }].sort((a, b) => a.delta - b.delta);
      });
    }
  };

  const handleFindPeak = () => {
    if (!birthProfile || lifeEvents.length === 0) return;
    
    let bestDelta = 0;
    let maxScore = -1;
    const allPoints = [];
    
    for (let delta = -60; delta <= 60; delta++) {
      const chartAtDelta = getRectifiedChartData(birthProfile, delta);
      if (chartAtDelta) {
        const valAtDelta = validateRectification(chartAtDelta, lifeEvents);
        const score = valAtDelta.confidenceScore;
        allPoints.push({ delta, score });
        
        if (score > maxScore) {
          maxScore = score;
          bestDelta = delta;
        }
      }
    }
    
    setTimeDelta(bestDelta);
    setHistory(allPoints.sort((a, b) => a.delta - b.delta));
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEventDate) return;

    const standardHouses = EVENT_SIGNIFICATIONS[newEventCategory] || [1];

    const newEvent = {
      id: Date.now().toString(),
      date: newEventDate,
      type: newEventCategory,
      description: newEventLabel.trim() || newEventCategory.replace('_', ' ').toLowerCase(),
      relevantHouses: standardHouses,
      weight: Number(newEventWeight)
    };

    const updated = [...lifeEvents, newEvent];
    setLifeEvents(updated);
    if (onUpdateProfileEvents) {
      onUpdateProfileEvents(updated);
    }
    setNewEventDate('');
    setNewEventLabel('');
  };

  const handleDeleteEvent = (id) => {
    const updated = lifeEvents.filter(ev => ev.id !== id);
    setLifeEvents(updated);
    if (onUpdateProfileEvents) {
      onUpdateProfileEvents(updated);
    }
  };

  // Recalculate Yogas for rectified chart
  const rectifiedYogas = useMemo(() => {
    if (!rectifiedChart) return [];

    const d9Planets = rectifiedChart.planets.map(p => ({
      ...p,
      rasiIndex: getD9RasiIndex(p.fullDegree)
    }));

    const navamsaLagnaIndex = getD9RasiIndex(rectifiedChart.lagnaDegree);
    const navamsaPlacements = {};
    d9Planets.forEach(p => {
      if (p) navamsaPlacements[p.planet] = p.rasiIndex;
    });

    let isDay = true;
    const tz = Number(birthProfile?.tzone ?? birthProfile?.tz ?? 5.5);
    const lat = Number(birthProfile?.lat ?? 17.3850);
    const lon = Number(birthProfile?.lon ?? 78.4867);
    const [y, m, d] = String(birthProfile?.dob).split('-').map(Number);
    const timeStr = birthProfile?.time || birthProfile?.tob || '12:00';
    const [hr, min] = String(timeStr).split(':').map(Number);

    if ([y, m, d, hr, min, tz, lat, lon].every(Number.isFinite)) {
      const originalUTC = Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000);
      const rectifiedUTC = originalUTC + timeDelta * 60000;
      const localAdjusted = new Date(rectifiedUTC + (tz * 3600000));

      const sTimes = AstroEngine.getSunTimes(localAdjusted, lat, lon, tz);
      if (sTimes) {
        const currentMins = localAdjusted.getUTCHours() * 60 + localAdjusted.getUTCMinutes();
        isDay = currentMins >= (sTimes.sunriseFrac * 60) && currentMins <= (sTimes.sunsetFrac * 60);
      }
    }

    return calculateYogas(rectifiedChart.planets, rectifiedChart.lagnaIndex, rectifiedChart.lagnaDegree, {
      gender: birthProfile?.gender || 'Male',
      isDay,
      navamsaLagnaIndex,
      navamsaPlacements
    });
  }, [rectifiedChart, birthProfile, timeDelta]);

  const classifiedYogas = useMemo(() => {
    return classifyYogas(rectifiedYogas);
  }, [rectifiedYogas]);

  const originalTimeStr = birthProfile ? `${birthProfile.dob} @ ${birthProfile.time || '12:00'}` : 'N/A';

  const rectifiedTimeDisplay = useMemo(() => {
    if (!birthProfile) return 'N/A';
    const tz = Number(birthProfile.tzone ?? birthProfile.tz ?? 5.5);
    const [y, m, d] = String(birthProfile.dob).split('-').map(Number);
    const [hr, min] = String(birthProfile.time || '12:00').split(':').map(Number);
    const originalUTC = Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000);
    const rectifiedUTC = originalUTC + timeDelta * 60000;
    const localAdjusted = new Date(rectifiedUTC + (tz * 3600000));

    const rYear = localAdjusted.getUTCFullYear();
    const rMonth = String(localAdjusted.getUTCMonth() + 1).padStart(2, '0');
    const rDay = String(localAdjusted.getUTCDate()).padStart(2, '0');
    const rHr = String(localAdjusted.getUTCHours()).padStart(2, '0');
    const rMin = String(localAdjusted.getUTCMinutes()).padStart(2, '0');

    return `${rYear}-${rMonth}-${rDay} @ ${rHr}:${rMin}`;
  }, [birthProfile, timeDelta]);

  if (!birthProfile) {
    return (
      <div className="p-8 text-center text-slate-500 font-serif">
        Please select or load a birth profile first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-gradient-to-br from-[#fdfde8] to-[#fbfbf0] border border-amber-200 rounded-2xl shadow-xl w-full max-w-4xl mx-auto my-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-800/10 pb-4 gap-4">
        <div className="flex items-center gap-3 text-left">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-amber-100/50 rounded-lg text-amber-900 transition-colors border border-amber-200/50" title="Back to Dashboard">
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold font-serif text-amber-950 flex flex-wrap items-center gap-2">
              <Clock className="text-amber-600 animate-pulse animate-duration-1000" size={22} />
              <span>Birth Time Rectification (BTR)</span>
              {birthProfile?.name && (
                <span className="text-sm font-sans font-semibold text-amber-700 bg-amber-100/65 px-2.5 py-0.5 rounded-lg border border-amber-200 ml-1 animate-in fade-in zoom-in duration-200">
                  for {birthProfile.name}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Adjust birth time dynamically (+/- 60 mins) to identify changes in planetary structures, Lagna, and Navamsa.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <PreciseCalculationToggle />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Live Rectifier
          </span>
        </div>
      </div>

      {/* Unified Control Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        {/* Slider & Curve Graph */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span className="text-sm">Time Adjustment:</span>
            <span className={`px-3 py-1.5 rounded-lg font-mono text-base font-black ${timeDelta === 0 ? 'bg-slate-100 text-slate-600' : timeDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {timeDelta > 0 ? `+${timeDelta}` : timeDelta} Minutes
            </span>
          </div>
          
          <input
            type="range"
            min="-60"
            max="60"
            value={timeDelta}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600 outline-none"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 select-none leading-none -mt-1.5">
            <span>-60 Minutes</span>
            <span>Original Birth Time</span>
            <span>+60 Minutes</span>
          </div>

          {/* Recharts BTRChart */}
          {history.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5"><TrendingUp size={12}/> Rectification Fit Curve (Confidence vs Time Shift)</span>
                <button 
                  type="button" 
                  onClick={handleFindPeak}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-bold px-2 py-0.5 rounded transition-colors flex items-center gap-1 shadow-sm uppercase tracking-wider"
                >
                  <Sparkles size={9}/> Find Peak Fit
                </button>
              </div>
              <BTRChart data={history} currentDelta={timeDelta} />
            </div>
          )}
        </div>

        {/* Confidence score gauge circle */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-4 bg-amber-50/30 rounded-2xl border border-amber-200/50 shadow-sm w-full h-full text-center">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500"/> Fit Confidence
            </span>
            <div className="relative flex items-center justify-center mt-1">
              {/* SVG Ring */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="40" 
                  stroke={validationResult.confidenceScore >= 70 ? '#10b981' : validationResult.confidenceScore >= 45 ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - validationResult.confidenceScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute text-2xl font-black font-mono text-slate-800">{validationResult.confidenceScore}%</span>
            </div>
            
            <div className={`text-[9px] font-bold mt-2 px-3 py-1 rounded-full uppercase tracking-wider ${validationResult.confidenceScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : validationResult.confidenceScore >= 45 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {validationResult.confidenceScore >= 70 ? 'Strong Match' : validationResult.confidenceScore >= 45 ? 'Moderate Match' : 'Poor Match'}
            </div>

            {peakDetails && (
              <div className={`mt-2.5 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-center flex items-center gap-1 leading-none border ${peakDetails.isAtPeak ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                {peakDetails.isAtPeak ? (
                  <span>🏆 Peak Time: {peakDetails.time}</span>
                ) : (
                  <button type="button" onClick={handleFindPeak} className="hover:underline flex items-center gap-1">
                    💡 Fit Peak at {peakDetails.time} ({peakDetails.score}%)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparative Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Profile Info */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Original Placements</h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-serif text-slate-800">
            <div className="bg-slate-50 p-2.5 rounded-lg col-span-2">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Birth Timestamp</div>
              <div className="font-bold truncate">{originalTimeStr}</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Lagna (D1)</div>
              <div className="font-bold text-amber-900">{originalChart ? rasiNames[originalChart.lagnaIndex] : 'N/A'}</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Navamsa (D9)</div>
              <div className="font-bold text-purple-900">
                {originalChart ? rasiNames[getD9RasiIndex(originalChart.lagnaDegree)] : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Rectified Placements */}
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 transition-all duration-300 ${timeDelta === 0 ? 'bg-white border-slate-200/60' : 'bg-amber-50/20 border-amber-200/80 shadow-md'}`}>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rectified Placements</h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-serif text-slate-800">
            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm col-span-2">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Adjusted Timestamp</div>
              <div className="font-bold text-amber-950 truncate">{rectifiedTimeDisplay}</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Lagna (D1)</div>
              <div className={`font-bold transition-all ${vargaChanges.lagnaChanged ? 'text-red-650 scale-105 font-extrabold' : 'text-amber-900'}`}>
                {rectifiedChart ? rasiNames[rectifiedChart.lagnaIndex] : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
              <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Navamsa (D9)</div>
              <div className={`font-bold transition-all ${vargaChanges.navamsaChanged ? 'text-red-650 scale-105 font-extrabold' : 'text-purple-900'}`}>
                {rectifiedChart ? rasiNames[getD9RasiIndex(rectifiedChart.lagnaDegree)] : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Varga Shift Alerts */}
      {(vargaChanges.lagnaChanged || vargaChanges.navamsaChanged) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-xs text-red-900 leading-normal animate-in fade-in duration-300">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5 animate-bounce" size={18} />
          <div className="flex-grow">
            <div className="font-bold text-sm mb-1 text-red-950">Varga Boundary Crossed!</div>
            <ul className="list-disc pl-4 space-y-1">
              {vargaChanges.lagnaChanged && (
                <li>
                  Lagna (D1) shifted from <strong className="text-slate-950 font-bold">{rasiNames[vargaChanges.oldLagna]}</strong> to <strong className="text-slate-950 font-bold">{rasiNames[vargaChanges.newLagna]}</strong>.
                </li>
              )}
              {vargaChanges.navamsaChanged && (
                <li>
                  Navamsa (D9) shifted from <strong className="text-slate-950 font-bold">{rasiNames[vargaChanges.oldNavamsa]}</strong> to <strong className="text-slate-950 font-bold">{rasiNames[vargaChanges.newNavamsa]}</strong>.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Historical Life Events Validator */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="text-amber-600" size={18} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Historical Life Events Calibration</h3>
          </div>
          <div className="flex items-center gap-2.5">
            {saveStatus && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all duration-300 ${saveStatus.includes('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {saveStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
              title="Save events permanently to profile (LocalStorage & Firebase)"
            >
              <Sparkles size={11} className="animate-pulse" />
              Save & Sync Events
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600">Event Date</label>
            <input 
              type="date" 
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              required
              className="p-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none bg-white text-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600">Category</label>
            <select
              value={newEventCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none bg-white text-slate-800"
            >
              {Object.keys(EVENT_SIGNIFICATIONS).map(cat => (
                <option key={cat} value={cat}>{formatCategoryName(cat)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600">Description (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Marriage ceremony"
              value={newEventLabel}
              onChange={(e) => setNewEventLabel(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none bg-white text-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-600">Event Weight (Impact)</label>
            <div className="flex gap-2">
              <select
                value={newEventWeight}
                onChange={(e) => setNewEventWeight(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:outline-none bg-white text-slate-800 flex-grow"
              >
                <option value={10}>Critical Event (10) e.g., Marriage, Parents Death</option>
                <option value={8}>Major Event (8) e.g., Child Birth, Sibling Death</option>
                <option value={7}>Significant Change (7) e.g., Job/Career, Sibling Birth, Education</option>
                <option value={5}>Medium Impact (5) e.g., Illness, Accident, Travel</option>
                <option value={3}>Minor Incident (3)</option>
                <option value={1}>Minimal Impact (1)</option>
              </select>
              <button 
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white p-2 px-3 rounded-lg font-bold flex items-center justify-center transition-colors shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </form>

        {/* Life Events Table */}
        <div className="overflow-x-auto">
          {lifeEvents.length === 0 ? (
            <div className="text-center p-4 text-xs text-slate-400 font-serif">
              No historical events entered. Add events above to begin validation.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2">Event Date</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2">Active Periods (MD/BD/PD)</th>
                  <th className="py-2 text-center">Alignment</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {validationResult.eventScores.map((evScore, index) => {
                  const alignment = evScore.alignment;
                  const isAligned = alignment.aligned;
                  
                  return (
                    <tr key={evScore.id || index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-mono text-slate-700 font-bold">{evScore.date}</td>
                      <td className="py-2.5">
                        <span className="bg-slate-100 border border-slate-250 text-slate-650 px-2 py-0.5 rounded text-[10px] font-bold">
                          {formatCategoryName(evScore.type || evScore.category)}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">{evScore.description || evScore.label}</td>
                      <td className="py-2.5 font-mono font-bold text-slate-600">
                        {evScore.weight}/10
                      </td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {alignment.md} ➜ {alignment.ad} ➜ {alignment.pd}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className={`flex flex-col items-center justify-center p-1 px-2.5 rounded-lg border text-center leading-normal max-w-[200px] mx-auto text-[10.5px] ${isAligned ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <div className="flex items-center gap-1 font-bold">
                            {isAligned ? <CheckCircle size={12} className="text-emerald-600"/> : <XCircle size={12} className="text-red-500"/>}
                            {isAligned ? 'Aligned' : 'Contradicts'} ({alignment.score}%)
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5 font-medium leading-tight">{alignment.details}</div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteEvent(evScore.id)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dynamic Yogas List */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="bg-amber-800 text-white px-4 py-3 text-xs font-bold uppercase flex items-center justify-between rounded-xl shadow-md">
          <span className="flex items-center gap-2"><Sparkles size={14}/> Active Yogas for Rectified Placements</span>
          <span className="bg-amber-700/80 text-white px-3 py-0.5 rounded-full text-[10px]">{rectifiedYogas.length} Found</span>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 p-1 custom-scrollbar">
          {classifiedYogas.map((group, gIdx) => {
            let IconComponent = Star;
            if (group.icon === 'Star') IconComponent = Star;
            if (group.icon === 'BarChart2') IconComponent = BarChart2;
            if (group.icon === 'ShieldAlert') IconComponent = ShieldAlert;
            if (group.icon === 'Compass') IconComponent = Compass;

            return (
              <details key={gIdx} className={`border ${group.border} rounded-xl overflow-hidden shadow-sm group`} open={true}>
                <summary className={`list-none cursor-pointer p-3 text-xs font-bold flex items-center justify-between ${group.bg} ${group.text} hover:opacity-90 transition-opacity outline-none`}>
                  <span className="flex items-center gap-2">
                    <IconComponent size={14} />
                    {group.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="bg-white/60 px-2 py-0.5 rounded-full text-[10px]">{group.yogas.length}</span>
                    <span className="text-[10px] transition-transform duration-200 group-open:rotate-90">▶</span>
                  </span>
                </summary>
                <div className="p-3 bg-white space-y-2.5 border-t border-slate-105">
                  {group.yogas.map((yoga, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => onSymbolClick?.({ 
                        title: yoga.name, 
                        subtitle: `Yoga Found`, 
                        text: yoga.desc, 
                        promptData: { type: 'yoga', yogaType: yoga.type, involvedPlanets: yoga.involved } 
                      })} 
                      className={`p-3 rounded-xl border ${yoga.bg} ${yoga.border} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <h4 className={`font-bold font-serif text-sm ${yoga.color}`}>{yoga.name}</h4>
                        <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-white border ${yoga.border} ${yoga.color}`}>{yoga.type}</span>
                      </div>
                      {(() => {
                        const descParts = yoga.desc.split('\n\n⚖️ **Raman Strength Calibration**:');
                        const mainDesc = descParts[0];
                        const ramanCal = descParts[1];
                        return (
                          <>
                            <p className="text-xs text-slate-650 leading-relaxed">{mainDesc}</p>
                            {ramanCal && (
                              <details 
                                className="mt-2.5 border border-amber-200 rounded-lg bg-amber-50/30 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                              >
                                <summary className="cursor-pointer p-2 px-2.5 bg-amber-100/40 hover:bg-amber-100/70 font-bold text-amber-900 flex items-center justify-between outline-none select-none text-[11px]">
                                  <span className="flex items-center gap-1.5">⚖️ Raman Strength Calibration</span>
                                  <span className="text-[9px] text-amber-700/80 font-normal">Click to expand</span>
                                </summary>
                                <div className="p-3 bg-white border-t border-amber-100">
                                  {renderRamanLines(ramanCal)}
                                </div>
                              </details>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
