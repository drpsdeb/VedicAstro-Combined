import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Sparkles, Cpu, Loader2, Compass, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { calculateMuhurthaData, PRAHAR_NAMES } from '../utils/muhurthaEngine';
import { AstroEngine } from '../utils/ephemerisEngine';

// Sector path generator
const getSectorPath = (cx, cy, r, startAngle, endAngle) => {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  
  let diff = endAngle - startAngle;
  if (diff < 0) diff += 360;
  const largeArcFlag = diff > 180 ? 1 : 0;
  
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
};

export default function MuhurthaDialView({ profile, time, geminiKey, astroLevel, language }) {
  const [activeTab, setActiveTab] = useState('muhurtha'); // 'muhurtha', 'choghadiya', 'hora', 'lagna'
  const [selectedItem, setSelectedItem] = useState(null);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  
  const lat = Number(profile?.lat ?? 17.3850);
  const lon = Number(profile?.lon ?? 78.4867);
  const tzone = Number(profile?.tzone ?? profile?.tz ?? 5.5);
  
  // Calculate data based on ticking time and location
  const data = useMemo(() => {
    return calculateMuhurthaData(time, lat, lon, tzone);
  }, [time, lat, lon, tzone]);
  
  // Current hour of day
  const currentHour = useMemo(() => {
    return time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 3600;
  }, [time]);
  
  // Convert hour (0-24) to clock angle (0-360 starting at 6 AM)
  const timeToAngle = (h) => {
    let diff = h - 6;
    if (diff < 0) diff += 24;
    return (diff / 24) * 360;
  };
  
  const isCurrentActive = (start, end, current) => {
    if (start <= end) {
      return current >= start && current < end;
    } else {
      return current >= start || current < end;
    }
  };
  
  // SVG Center & Radius
  const cx = 200;
  const cy = 200;
  const rDial = 145;
  
  // Render ticks
  const ticks = useMemo(() => {
    const list = [];
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const isMajor = i % 5 === 0;
      const r1 = isMajor ? 138 : 142;
      const r2 = 146;
      const rad = ((angle - 90) * Math.PI) / 180;
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);
      
      list.push(
        <line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isMajor ? "#fbbf24" : "#a16207"}
          strokeWidth={isMajor ? 1.5 : 0.6}
        />
      );
      
      if (isMajor) {
        const textRadius = 158;
        const tx = cx + textRadius * Math.cos(rad);
        const ty = cy + textRadius * Math.sin(rad);
        const label = i.toString().padStart(2, '0');
        list.push(
          <text
            key={`tick-lbl-${i}`}
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#d97706"
            className="text-[9px] font-mono font-black"
          >
            {label}
          </text>
        );
      }
    }
    return list;
  }, []);
  
  // 8 Prahars labels
  const prahars = useMemo(() => {
    const labels = [
      { text: "पूर्वान्ह", ghati: 3.75 },
      { text: "मध्यान्ह", ghati: 11.25 },
      { text: "अपराह्न", ghati: 18.75 },
      { text: "सायंकाल", ghati: 26.25 },
      { text: "प्रदोष", ghati: 33.75 },
      { text: "निशीथ", ghati: 41.25 },
      { text: "त्रियामा", ghati: 48.75 },
      { text: "उषा", ghati: 56.25 }
    ];
    
    return labels.map((p, idx) => {
      const angle = p.ghati * 6;
      const rad = ((angle - 90) * Math.PI) / 180;
      const tx = cx + 180 * Math.cos(rad);
      const ty = cy + 180 * Math.sin(rad);
      
      // Keep text upright on the bottom half
      const displayAngle = (angle > 90 && angle < 270) ? angle + 180 : angle;
      
      return (
        <text
          key={`prahar-${idx}`}
          x={tx}
          y={ty}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fcd34d"
          transform={`rotate(${displayAngle}, ${tx}, ${ty})`}
          className="text-[10px] font-black tracking-wider font-sans select-none"
        >
          {p.text}
        </text>
      );
    });
  }, []);
  
  // 24 Hour ticks labels
  const hoursLabels = useMemo(() => {
    const list = [
      { text: "6AM", h: 6 },
      { text: "9AM", h: 9 },
      { text: "12PM", h: 12 },
      { text: "3PM", h: 15 },
      { text: "6PM", h: 18 },
      { text: "9PM", h: 21 },
      { text: "12AM", h: 0 },
      { text: "3AM", h: 3 }
    ];
    
    return list.map((lbl, idx) => {
      const angle = timeToAngle(lbl.h);
      const rad = ((angle - 90) * Math.PI) / 180;
      const tx = cx + 115 * Math.cos(rad);
      const ty = cy + 115 * Math.sin(rad);
      
      return (
        <text
          key={`hr-lbl-${idx}`}
          x={tx}
          y={ty}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fbbf24"
          opacity="0.8"
          className="text-[8px] font-sans font-extrabold select-none"
        >
          {lbl.text}
        </text>
      );
    });
  }, [data]);

  // Sector Definitions for Render
  const dialSectors = useMemo(() => {
    const list = [];
    
    // 1. Din Kaal (Daytime) Background - Light Gold/Beige
    const dayStartA = timeToAngle(data.sunriseHour);
    const dayEndA = timeToAngle(data.sunsetHour);
    list.push({
      id: 'day_bg',
      path: getSectorPath(cx, cy, rDial - 15, dayStartA, dayEndA),
      fill: 'rgba(251, 191, 36, 0.07)',
      stroke: 'rgba(251, 191, 36, 0.2)',
      label: 'दिन काल (Daytime)',
      tooltip: `Day Duration: ${data.sunriseStr} - ${data.sunsetStr}`
    });
    
    // 2. Ratri Kaal (Nighttime) Background - Dark Brown/Blackish
    const nightStartA = timeToAngle(data.sunsetHour);
    const nightEndA = timeToAngle(data.sunriseHour);
    list.push({
      id: 'night_bg',
      path: getSectorPath(cx, cy, rDial - 15, nightStartA, nightEndA),
      fill: 'rgba(2, 6, 23, 0.45)',
      stroke: 'rgba(217, 119, 6, 0.1)',
      label: 'रात्रि काल (Nighttime)',
      tooltip: `Night Duration: ${data.sunsetStr} - Sunrise next day`
    });
    
    // 3. Auspicious: Abhijit Muhurtha (Green)
    list.push({
      id: 'abhijit',
      path: getSectorPath(cx, cy, rDial - 20, timeToAngle(data.abhijit.start), timeToAngle(data.abhijit.end)),
      fill: 'rgba(16, 185, 129, 0.25)',
      stroke: '#10b981',
      label: 'अभिजित',
      tooltip: `Abhijit Muhurtha: ${data.abhijit.startStr} - ${data.abhijit.endStr} (Highly Auspicious)`
    });
    
    // 4. Auspicious: Pradosha Kaal (Teal/Green)
    list.push({
      id: 'pradosh',
      path: getSectorPath(cx, cy, rDial - 20, timeToAngle(data.pradosh.start), timeToAngle(data.pradosh.end)),
      fill: 'rgba(20, 184, 166, 0.2)',
      stroke: '#14b8a6',
      label: 'प्रदोष',
      tooltip: `Pradosha Kaal: ${data.pradosh.startStr} - ${data.pradosh.endStr}`
    });
    
    // 5. Inauspicious: Rahu Kaal (Red)
    list.push({
      id: 'rahu',
      path: getSectorPath(cx, cy, rDial - 25, timeToAngle(data.rahu.start), timeToAngle(data.rahu.end)),
      fill: 'rgba(239, 68, 68, 0.28)',
      stroke: '#ef4444',
      label: 'राहू काल',
      tooltip: `Rahu Kaal: ${data.rahu.startStr} - ${data.rahu.endStr} (Inauspicious)`
    });
    
    // 6. Inauspicious: Gulika Kaal (Red)
    list.push({
      id: 'gulika',
      path: getSectorPath(cx, cy, rDial - 25, timeToAngle(data.gulika.start), timeToAngle(data.gulika.end)),
      fill: 'rgba(220, 38, 38, 0.22)',
      stroke: '#dc2626',
      label: 'गुली काल',
      tooltip: `Gulika Kaal: ${data.gulika.startStr} - ${data.gulika.endStr} (Inauspicious)`
    });
    
    // 7. Inauspicious: Yamaganda Kaal (Red)
    list.push({
      id: 'yamaganda',
      path: getSectorPath(cx, cy, rDial - 25, timeToAngle(data.yamaganda.start), timeToAngle(data.yamaganda.end)),
      fill: 'rgba(185, 28, 28, 0.22)',
      stroke: '#b91c1c',
      label: 'यम घंटा',
      tooltip: `Yamaganda Kaal: ${data.yamaganda.startStr} - ${data.yamaganda.endStr} (Inauspicious)`
    });
    
    // 8. Inauspicious: Durmuhurthas (Red)
    data.durmuhurthas.forEach((dm, idx) => {
      list.push({
        id: `durmuhurtha_${idx}`,
        path: getSectorPath(cx, cy, rDial - 28, timeToAngle(dm.startHour), timeToAngle(dm.endHour)),
        fill: 'rgba(153, 27, 27, 0.25)',
        stroke: '#991b1b',
        label: `दूर मुहूर्त ${idx + 1}`,
        tooltip: `Durmuhurtha: ${dm.startTimeStr} - ${dm.endTimeStr} (Inauspicious)`
      });
    });
    
    return list;
  }, [data]);

  // Current active indices
  const currentActiveItems = useMemo(() => {
    const activeM = data.muhurthas.find(m => isCurrentActive(m.startHour, m.endHour, currentHour));
    const activeC = data.choghadias.find(c => isCurrentActive(c.startHour, c.endHour, currentHour));
    const activeH = data.horas.find(h => isCurrentActive(h.startHour, h.endHour, currentHour));
    const activeL = data.lagnas.find(l => isCurrentActive(l.startHour, l.endHour, currentHour));
    
    return {
      muhurtha: activeM,
      choghadiya: activeC,
      hora: activeH,
      lagna: activeL
    };
  }, [data, currentHour]);

  // Set default selected item
  useEffect(() => {
    if (!selectedItem) {
      const active = currentActiveItems[activeTab];
      if (active) {
        setSelectedItem({
          type: activeTab,
          ...active
        });
      }
    }
  }, [activeTab, currentActiveItems]);

  const handleItemSelect = (item, type) => {
    setSelectedItem({
      type,
      ...item
    });
    setAiText('');
    setAiError('');
  };

  // Ask Gemini AI interpretation
  const handleAskAI = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiError('');
    setAiText('');
    
    const typeLabel = selectedItem.type.toUpperCase();
    const nameLabel = selectedItem.name || selectedItem.rulerName || 'Unknown';
    const natureLabel = selectedItem.nature || selectedItem.quality || 'General';
    const descLabel = selectedItem.desc || selectedItem.quality || '';
    const timings = `${selectedItem.startTimeStr || selectedItem.startTimeStr} - ${selectedItem.endTimeStr || selectedItem.endTimeStr}`;
    
    const prompt = `Client Name: ${profile?.name || 'User'}. Birth Chart Details: Ascendant: ${AstroEngine.SIDEREAL_RASIS[profile?.rasiIndex || 0]}. 
Vedic Timing Factor under analysis:
- Category: ${typeLabel}
- Name: ${nameLabel}
- Quality/Auspiciousness: ${natureLabel}
- Calculated Timings: ${timings}
- Classical Description: ${descLabel}

Act as an expert, warm, and highly practical Vedic Astrologer. Write a 3-4 sentence personalized timing advice showing:
1. What this timing block indicates for them energetically (is it dynamic, slow, emotional, focus-driven?).
2. How they can best utilize or mitigate this hour for their daily activities, including positive Upayas (remedies/mindset) if inauspicious.
Strictly avoid fatalistic language and make it supportive and encouraging.`;

    try {
      const response = await AstroEngine.callGemini(prompt, geminiKey, astroLevel, language);
      if (response.error) {
        setAiError(response.error);
      } else {
        setAiText(response.text || 'No response from AI.');
      }
    } catch (err) {
      setAiError(err.message || 'Failed to call AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Needle calculations
  const needleAngle = timeToAngle(currentHour);
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const nx = cx + 132 * Math.cos(needleRad);
  const ny = cy + 132 * Math.sin(needleRad);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-[#231204] text-[#fdfde8] rounded-3xl border border-amber-900/50 shadow-2xl animate-in fade-in duration-300">
      
      {/* 1. Header Information */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-amber-900/30 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Compass size={22} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[#ffd066] leading-none mb-1 flex items-center gap-2">
              Muhurtha Dial & Timings
            </h1>
            <p className="text-xs text-amber-700 font-sans font-medium">
              Vedic day-night cycles calculated dynamically for {profile?.city || "Selected Location"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-[#331c07]/80 px-4 py-2.5 rounded-2xl border border-amber-900/30 text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold border-r border-amber-900/30 pr-3">
            <span>📅 {data.weekdayName}</span>
          </div>
          <div className="flex items-center gap-1 text-[#f59e0b] border-r border-amber-900/30 pr-3 pl-1">
            <span>☀️ Rise: {data.sunriseStr}</span>
          </div>
          <div className="flex items-center gap-1 text-sky-400 border-r border-amber-900/30 pr-3 pl-1">
            <span>🌙 Set: {data.sunsetStr}</span>
          </div>
          <div className="text-amber-100/70 font-mono">
            Noon: {data.noonStr}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 2. Left Column: Muhurtha Dial */}
        <div className="lg:col-span-5 bg-[#170b02] p-6 rounded-2xl border border-amber-950/40 shadow-inner flex flex-col items-center justify-center relative">
          
          <div className="absolute top-3 left-4 text-[9px] uppercase tracking-widest font-bold text-amber-700/60 font-mono">
            Ghati Dial (60 Divisions)
          </div>
          
          {/* Dial SVG */}
          <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 400 400" className="drop-shadow-2xl">
              
              {/* Outer Plate */}
              <circle cx={cx} cy={cy} r={192} fill="transparent" stroke="rgba(245, 158, 11, 0.05)" strokeWidth={3} />
              <circle cx={cx} cy={cy} r={170} fill="#110500" stroke="#3d1d03" strokeWidth={2} />
              <circle cx={cx} cy={cy} r={148} fill="#1d0d02" stroke="#5c2e0b" strokeWidth={1} />
              
              {/* Render Ticks and labels */}
              {ticks}
              {prahars}
              {hoursLabels}
              
              {/* Render Sectors */}
              {dialSectors.map(sec => (
                <path
                  key={sec.id}
                  d={sec.path}
                  fill={sec.fill}
                  stroke={sec.stroke}
                  strokeWidth={0.8}
                  className="cursor-pointer transition-all hover:brightness-125"
                  onClick={() => {
                    if (sec.id === 'abhijit') {
                      setActiveTab('muhurtha');
                      handleItemSelect(data.muhurthas[7], 'muhurtha');
                    } else if (sec.id === 'rahu') {
                      handleItemSelect({ name: 'Rahu Kaal', desc: 'Inauspicious period ruled by Rahu. Avoid starting travel, business, or agreements.', nature: 'Inauspicious', startTimeStr: data.rahu.startStr, endTimeStr: data.rahu.endStr }, 'special');
                    } else if (sec.id === 'gulika') {
                      handleItemSelect({ name: 'Gulika Kaal', desc: 'Inauspicious period. Things done during this time tend to repeat. Good for routine jobs, bad for new ventures.', nature: 'Inauspicious', startTimeStr: data.gulika.startStr, endTimeStr: data.gulika.endStr }, 'special');
                    } else if (sec.id === 'yamaganda') {
                      handleItemSelect({ name: 'Yamaganda Kaal', desc: 'Inauspicious period. Projects initiated during this block yield unfavorable results.', nature: 'Inauspicious', startTimeStr: data.yamaganda.startStr, endTimeStr: data.yamaganda.endStr }, 'special');
                    } else if (sec.id === 'pradosh') {
                      handleItemSelect({ name: 'Pradosha Kaal', desc: 'Auspicious sunset window dedicated to Lord Shiva. Favorable for worship, fasting, and spiritual beginnings.', nature: 'Auspicious', startTimeStr: data.pradosh.startStr, endTimeStr: data.pradosh.endStr }, 'special');
                    }
                  }}
                >
                  <title>{sec.tooltip}</title>
                </path>
              ))}
              
              {/* Center Ring & Dial Dial Pin */}
              <circle cx={cx} cy={cy} r={70} fill="none" stroke="rgba(217, 119, 6, 0.15)" strokeWidth={1} />
              <circle cx={cx} cy={cy} r={40} fill="none" stroke="rgba(217, 119, 6, 0.2)" strokeWidth={1} />
              
              {/* Ticking Needle */}
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fbbf24" strokeWidth={3} strokeLinecap="round" className="shadow-lg" />
              <circle cx={nx} cy={ny} r={4} fill="#f59e0b" stroke="#ffffff" strokeWidth={1} />
              
              {/* Center Hub */}
              <circle cx={cx} cy={cy} r={12} fill="#78350f" stroke="#fbbf24" strokeWidth={2} />
              <circle cx={cx} cy={cy} r={6} fill="#fbbf24" />
              
            </svg>
          </div>
          
          <div className="mt-4 flex items-center justify-between w-full bg-[#2a1403]/80 p-3 rounded-xl border border-amber-950/50 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="text-amber-400 animate-pulse" size={13} />
              <span>Current Ghati:</span>
              <span className="text-[#fbbf24] font-mono">
                {((currentHour - data.sunriseHour + 24) % 24 * 2.5).toFixed(2)} Ghati
              </span>
            </div>
            <div className="text-amber-300 font-extrabold uppercase text-[10px]">
              {time.toLocaleTimeString()}
            </div>
          </div>

          {/* Key Daily Timings Card */}
          <div className="mt-3 w-full bg-[#1e0e02] p-3.5 rounded-xl border border-amber-950/40 text-[11px] select-none">
            <div className="font-bold text-amber-200 font-serif border-b border-amber-900/30 pb-1.5 mb-2 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <span>⏳</span> Key Daily Periods (प्रमुख काल)
            </div>
            <div className="space-y-1.5">
              <div 
                onClick={() => handleItemSelect({ name: 'Rahu Kaal', desc: 'Inauspicious period ruled by Rahu. Avoid starting travel, business, or agreements.', nature: 'Inauspicious', startTimeStr: data.rahu.startStr, endTimeStr: data.rahu.endStr }, 'special')}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#341804]/50 cursor-pointer transition-colors"
              >
                <span className="text-rose-400 font-medium">⚫ Rahu Kaal (राहू काल):</span>
                <span className="font-mono font-bold text-rose-300">{data.rahu.startStr} - {data.rahu.endStr}</span>
              </div>
              <div 
                onClick={() => handleItemSelect({ name: 'Gulika Kaal', desc: 'Inauspicious period. Things done during this time tend to repeat. Good for routine jobs, bad for new ventures.', nature: 'Inauspicious', startTimeStr: data.gulika.startStr, endTimeStr: data.gulika.endStr }, 'special')}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#341804]/50 cursor-pointer transition-colors"
              >
                <span className="text-orange-400 font-medium">🟤 Gulika (गुली काल):</span>
                <span className="font-mono font-bold text-[#ffd066]">{data.gulika.startStr} - {data.gulika.endStr}</span>
              </div>
              <div 
                onClick={() => handleItemSelect({ name: 'Yamaganda Kaal', desc: 'Inauspicious period. Projects initiated during this block yield unfavorable results.', nature: 'Inauspicious', startTimeStr: data.yamaganda.startStr, endTimeStr: data.yamaganda.endStr }, 'special')}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#341804]/50 cursor-pointer transition-colors"
              >
                <span className="text-red-400 font-medium">🔴 Yamaganda (यम घंटा):</span>
                <span className="font-mono font-bold text-red-300">{data.yamaganda.startStr} - {data.yamaganda.endStr}</span>
              </div>
              <div 
                onClick={() => handleItemSelect({ name: 'Abhijit Muhurtha', desc: 'Highly auspicious mid-day block. Overcomes all timings flaws.', nature: 'Auspicious', startTimeStr: data.abhijit.startStr, endTimeStr: data.abhijit.endStr }, 'special')}
                className="flex items-center justify-between py-1 px-1.5 border-t border-amber-900/10 pt-2 mt-2 rounded hover:bg-[#341804]/50 cursor-pointer transition-colors"
              >
                <span className="text-emerald-400 font-medium">🟢 Abhijit (अभिजित):</span>
                <span className="font-mono font-bold text-emerald-300">{data.abhijit.startStr} - {data.abhijit.endStr}</span>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* 3. Right Column: Detailed Timings & Sheets */}
        <div className="lg:col-span-7 flex flex-col h-[520px]">
          
          {/* Tab Buttons */}
          <div className="flex bg-[#2c1706] rounded-t-2xl p-1 gap-1 border-t border-x border-amber-900/20">
            {[
              { id: 'muhurtha', label: 'मुहूर्त (Muhurtha)' },
              { id: 'choghadiya', label: 'चोघड़िया (Choghadiya)' },
              { id: 'hora', label: 'होरा (Hora)' },
              { id: 'lagna', label: 'लग्न (Lagna)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedItem(null);
                }}
                className={`flex-1 py-2 text-xs font-bold font-serif rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#fbbf24] text-[#1c0b00] shadow' 
                    : 'text-amber-300/80 hover:bg-[#3d2008]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab Content Container */}
          <div className="flex-1 bg-[#1a0a01] border-x border-b border-amber-900/20 p-4 flex flex-col min-h-0">
            
            {/* Scrollable list area */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent">
              
              {/* Tab 1: Muhurthas List */}
              {activeTab === 'muhurtha' && (
                <div className="space-y-1.5">
                  {data.muhurthas.map(m => {
                    const isActive = isCurrentActive(m.startHour, m.endHour, currentHour);
                    const isSelected = selectedItem?.type === 'muhurtha' && selectedItem.index === m.index;
                    return (
                      <div
                        key={m.index}
                        onClick={() => handleItemSelect(m, 'muhurtha')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[#fbbf24]/10 border-[#fbbf24]' 
                            : isActive 
                            ? 'bg-amber-900/20 border-amber-500/40 shadow' 
                            : 'bg-[#251203]/40 border-amber-950/30 hover:border-amber-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-950/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {m.index}
                          </span>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-100">
                              {m.name}
                              {isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest animate-pulse">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-amber-600/70">
                              Lord: {m.ruler} • {m.isNight ? 'Ratri' : 'Divas'} Muhurth
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-[#fcd34d]">
                            {m.startTimeStr}
                          </div>
                          <div className={`text-[8.5px] font-bold uppercase tracking-wider ${
                            m.nature.includes('Highly') ? 'text-emerald-400' : m.nature === 'Auspicious' ? 'text-green-400' : 'text-rose-400'
                          }`}>
                            {m.nature}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Tab 2: Choghadia List */}
              {activeTab === 'choghadiya' && (
                <div className="space-y-1.5">
                  {data.choghadias.map(c => {
                    const isActive = isCurrentActive(c.startHour, c.endHour, currentHour);
                    const isSelected = selectedItem?.type === 'choghadiya' && selectedItem.index === c.index;
                    return (
                      <div
                        key={c.index}
                        onClick={() => handleItemSelect(c, 'choghadiya')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[#fbbf24]/10 border-[#fbbf24]' 
                            : isActive 
                            ? 'bg-amber-900/20 border-amber-500/40 shadow' 
                            : 'bg-[#251203]/40 border-amber-950/30 hover:border-amber-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-950/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {c.index}
                          </span>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-100">
                              {c.name}
                              {isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest animate-pulse">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-amber-600/70">
                              Quality: {c.quality} • {c.isNight ? 'Ratri' : 'Divas'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-[#fcd34d]">
                            {c.startTimeStr}
                          </div>
                          <div className={`text-[8.5px] font-bold uppercase tracking-wider ${
                            c.nature === 'Auspicious' ? 'text-green-400' : c.nature === 'Neutral' ? 'text-sky-400' : 'text-rose-400'
                          }`}>
                            {c.nature}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Tab 3: Hora List */}
              {activeTab === 'hora' && (
                <div className="space-y-1.5">
                  {data.horas.map(h => {
                    const isActive = isCurrentActive(h.startHour, h.endHour, currentHour);
                    const isSelected = selectedItem?.type === 'hora' && selectedItem.hour === h.hour;
                    return (
                      <div
                        key={h.hour}
                        onClick={() => handleItemSelect(h, 'hora')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[#fbbf24]/10 border-[#fbbf24]' 
                            : isActive 
                            ? 'bg-amber-900/20 border-amber-500/40 shadow' 
                            : 'bg-[#251203]/40 border-amber-950/30 hover:border-amber-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-sans font-bold text-amber-500 bg-amber-950/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {h.symbol}
                          </span>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-100">
                              {h.rulerName} Hora
                              {isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest animate-pulse">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-amber-600/70">
                              Quality: {h.quality} • {h.isNight ? 'Ratri' : 'Divas'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right font-mono text-xs font-bold text-[#fcd34d]">
                          {h.startTimeStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Tab 4: Lagna List */}
              {activeTab === 'lagna' && (
                <div className="space-y-1.5">
                  {data.lagnas.map((l, idx) => {
                    const isActive = isCurrentActive(l.startHour, l.endHour, currentHour);
                    const isSelected = selectedItem?.type === 'lagna' && selectedItem.rasiIndex === l.rasiIndex && selectedItem.startTimeStr === l.startTimeStr;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleItemSelect(l, 'lagna')}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[#fbbf24]/10 border-[#fbbf24]' 
                            : isActive 
                            ? 'bg-amber-900/20 border-amber-500/40 shadow' 
                            : 'bg-[#251203]/40 border-amber-950/30 hover:border-amber-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-950/60 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5 text-amber-100">
                              {l.name} Rising
                              {isActive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest animate-pulse">
                                  Ascending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right font-mono text-xs font-bold text-[#fcd34d]">
                          {l.startTimeStr} - {l.endTimeStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
            </div>
            
            {/* Selected item card / AI section */}
            <div className="bg-[#231204] p-3 rounded-2xl border border-amber-900/30 mt-3 text-xs flex flex-col shrink-0">
              {selectedItem ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[13px] text-amber-200 uppercase font-serif">
                      {selectedItem.name || `${selectedItem.rulerName} Hora`}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      🕒 {selectedItem.startTimeStr || selectedItem.startTimeStr} - {selectedItem.endTimeStr || selectedItem.endTimeStr}
                    </span>
                  </div>
                  
                  {selectedItem.desc && (
                    <p className="text-[10.5px] leading-normal text-amber-100/70 italic mb-2">
                      {selectedItem.desc}
                    </p>
                  )}
                  
                  {/* AI Response Block */}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-amber-400 py-1 bg-amber-950/20 px-2.5 rounded-lg border border-amber-900/20 animate-pulse">
                      <Loader2 size={13} className="animate-spin text-amber-500" />
                      <span className="text-[10px] font-bold font-serif uppercase tracking-wider">Astro AI calculating timing block...</span>
                    </div>
                  )}
                  {aiError && (
                    <div className="flex items-center gap-1.5 text-red-400 font-bold bg-red-950/20 px-2.5 py-1 rounded-lg border border-red-900/20">
                      <AlertTriangle size={13} />
                      <span className="text-[10px]">Error: {aiError}</span>
                    </div>
                  )}
                  {aiText && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/30 text-amber-100 font-serif leading-relaxed text-[11px] max-h-36 overflow-y-auto mb-2 pr-2 scrollbar-thin">
                      <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-amber-500 tracking-wider mb-1">
                        <Cpu size={12} /> AI Timing Analysis:
                      </div>
                      "{aiText}"
                    </div>
                  )}
                  
                  {/* AI Ask Trigger */}
                  {!aiLoading && !aiText && (
                    <button
                      onClick={handleAskAI}
                      className="w-full mt-1.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all"
                    >
                      <Sparkles size={11} />
                      Analyze with Astro AI Guide
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-amber-700 italic">
                  Select a timing row or click a sector on the Dial to inspect details.
                </div>
              )}
            </div>
            
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
