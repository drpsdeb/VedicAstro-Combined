import React, { useState, useMemo } from 'react';
import { calculateKPDasas, getActiveDasaLords } from '../utils/kpDasaEngine.js';
import { checkTransitTriggers } from '../utils/kpTransit.js';
import { getHouseSignificators } from '../utils/kpEngine.js';
import { evaluateEventPromise, KP_EVENT_HOUSES } from '../utils/kpRules.js';
import { OfflineEphemeris } from '../utils/ephemerisEngine.js';

export default function KPPredictions({ cusps, planets, profile }) {
  const [selectedEvent, setSelectedEvent] = useState('MARRIAGE');
  
  // Transit evaluator state
  const [transitDate, setTransitDate] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - tzOffset);
    return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  });
  const [evaluatedTransit, setEvaluatedTransit] = useState(null);

  // Timeline filtering states
  const [filterType, setFilterType] = useState('all'); // 'all' | 'future' | 'favorable'
  const [searchYear, setSearchYear] = useState('');
  
  // Accordion state: store keys of expanded items
  // Format: { 'dasa-Sun': true, 'dasa-Sun-bhukti-Moon': true }
  const [expandedItems, setExpandedItems] = useState({});

  // 1. Extract Moon Longitude
  const moonLongitude = useMemo(() => {
    const moon = planets.find(p => p.name === 'Moon' || p.planet === 'Moon');
    return moon ? (moon.longitude ?? moon.fullDegree ?? moon.l) : 0;
  }, [planets]);

  // 2. Compute 120-year Dasa Tree
  const dasaTree = useMemo(() => {
    if (!profile || !profile.dob) return [];
    return calculateKPDasas(moonLongitude, profile.dob);
  }, [moonLongitude, profile]);

  // 3. Compute House Significators Map
  const significatorsMap = useMemo(() => {
    return getHouseSignificators(cusps, planets);
  }, [cusps, planets]);

  // 4. Evaluate Event Promise
  const promiseResult = useMemo(() => {
    return evaluateEventPromise(selectedEvent, cusps, significatorsMap);
  }, [selectedEvent, cusps, significatorsMap]);

  const eventInfo = KP_EVENT_HOUSES[selectedEvent];
  const primaryHouse = eventInfo?.primary ?? 7;
  const supportingHouses = eventInfo?.supporting ?? [];

  // Helper: check if a planet is highly favorable or supporting favorable
  const getPlanetFavorability = (planetName) => {
    const isPrimarySignificator = promiseResult.primarySignificators?.includes(planetName);
    const isSupportingSignificator = promiseResult.supportingSignificators?.includes(planetName);
    const isCuspSubLord = promiseResult.primarySubLord === planetName;

    if (isCuspSubLord || isPrimarySignificator) {
      return { level: 'highly', text: 'Highly Favorable', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    } else if (isSupportingSignificator) {
      return { level: 'favorable', text: 'Favorable', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else {
      return { level: 'neutral', text: 'Neutral', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  // Run transit evaluator for selected date
  const handleEvaluateTransit = (customDate = null) => {
    const target = customDate || transitDate;
    if (customDate) {
      // Set the input field to match the timeline selection
      const localDate = new Date(customDate);
      const tzOffset = localDate.getTimezoneOffset() * 60000;
      const formatted = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
      setTransitDate(formatted);
    }
    
    try {
      const res = checkTransitTriggers(
        target,
        primaryHouse,
        cusps,
        OfflineEphemeris,
        Number(profile.lat ?? 17.3850),
        Number(profile.lon ?? 78.4867),
        Number(profile.tzone ?? 5.5)
      );
      setEvaluatedTransit(res);
    } catch (e) {
      alert(`Transit evaluation failed: ${e.message}`);
    }
  };

  // Toggle Accordion Item
  const toggleExpand = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Format Date for UI
  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Process Timeline with Search & Filters
  const filteredTimeline = useMemo(() => {
    if (!dasaTree) return [];
    const nowMs = Date.now();

    return dasaTree.filter(dasa => {
      // 1. Year Search Filter
      if (searchYear) {
        const startYear = new Date(dasa.start).getFullYear();
        const endYear = new Date(dasa.end).getFullYear();
        const searchVal = parseInt(searchYear, 10);
        if (isNaN(searchVal) || searchVal < startYear || searchVal > endYear) {
          return false;
        }
      }

      // 2. Future / Favorable filter
      const dasaFav = getPlanetFavorability(dasa.lord).level;
      if (filterType === 'future' && new Date(dasa.end).getTime() < nowMs) {
        return false;
      }
      if (filterType === 'favorable' && dasaFav === 'neutral') {
        return false;
      }

      return true;
    });
  }, [dasaTree, filterType, searchYear, promiseResult]);

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. Header Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Select Event & Summary */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-serif font-bold text-base text-slate-800">Event Promise & Significators</h3>
              <p className="text-xs text-slate-500 mt-1">Check event promises and view favorable planets governing timings</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="w-full sm:w-64">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Event</label>
                <select 
                  value={selectedEvent} 
                  onChange={(e) => {
                    setSelectedEvent(e.target.value);
                    setEvaluatedTransit(null); // Clear old transit evaluation
                  }} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold"
                >
                  {Object.keys(KP_EVENT_HOUSES).map(ev => (
                    <option key={`opt-${ev}`} value={ev}>{ev.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center gap-3">
                <div className={`text-2xl p-2 rounded-xl bg-white shadow-sm border ${promiseResult.isPromised ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
                  {promiseResult.isPromised ? '✅' : '⚠️'}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    {promiseResult.isPromised ? 'Event Promised in Natal Chart' : 'Event Promise is Weak/Not Promised'}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Cusp {primaryHouse} Sub-lord <strong className="text-amber-600 font-bold">{promiseResult.primarySubLord}</strong> signifies event houses.
                  </p>
                </div>
              </div>
            </div>

            {/* Favorable Dasa/Bhukti combination logic */}
            <div className="bg-[#fcfcf9] border border-amber-200/40 rounded-xl p-4 space-y-3">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Timing Strategy</span>
              <p className="text-xs text-slate-700 leading-relaxed font-serif">
                Marriage or other promised events manifest during the joint periods (Dasa-Bhukti-Antara) of planets that act as significators of the primary house (<strong className="text-green-800 font-bold">House {primaryHouse}</strong>) and supporting houses (<strong className="text-slate-800 font-bold">Houses {supportingHouses.join(', ')}</strong>).
              </p>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-500">Event is Favorable during:</span>
                {planets.map(p => {
                  const pName = p.name || p.planet;
                  const fav = getPlanetFavorability(pName);
                  if (fav.level === 'neutral') return null;
                  return (
                    <span key={`badge-${pName}`} className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${fav.color}`}>
                      {pName} ({fav.text})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
            <span>Primary House: <strong className="text-slate-700 font-semibold">{primaryHouse}</strong></span>
            <span>Supporting Houses: <strong className="text-slate-700 font-semibold">{supportingHouses.join(', ')}</strong></span>
          </div>
        </div>

        {/* Right Side: Transit Trigger Evaluator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-serif font-bold text-base text-slate-800">Transit Alignment Evaluator</h3>
            <p className="text-xs text-slate-500 mt-1">Cross-references transiting degrees against Cusp {primaryHouse} lords</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transit Target Date</label>
              <div className="flex gap-2">
                <input 
                  type="datetime-local" 
                  value={transitDate} 
                  onChange={(e) => setTransitDate(e.target.value)} 
                  className="flex-1 p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:border-green-500 outline-none" 
                />
                <button 
                  onClick={() => handleEvaluateTransit()} 
                  className="px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs uppercase transition-colors"
                >
                  Check
                </button>
              </div>
            </div>

            {/* Transit Results */}
            {evaluatedTransit ? (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Alignment Score</span>
                    <span className="text-base font-black text-slate-800">{evaluatedTransit.overallScore}% Match</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Trigger State</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                      evaluatedTransit.isTriggerActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {evaluatedTransit.isTriggerActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {Object.values(evaluatedTransit.planetScores).map(score => {
                    const diffStr = `${score.degreeDifference}°`;
                    return (
                      <div key={`trans-${score.planet}`} className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <div>
                          <strong className="text-slate-800">{score.planet}</strong>
                          <span className="text-[10px] text-slate-400 ml-1">({score.starLord}/{score.subLord})</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-slate-600 text-[11px]">
                          <span>Orb: {diffStr}</span>
                          <span className="font-semibold text-slate-800">{score.totalScore}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[10px] text-slate-500 text-center italic">{evaluatedTransit.description}</p>
              </div>
            ) : (
              <div className="h-[210px] border border-dashed border-slate-250 rounded-xl flex items-center justify-center text-center p-4 bg-slate-50 text-slate-400 text-xs font-serif">
                Select a target date and click "Check" or evaluate directly from the Dasa timeline below.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. Timeline Drilldown Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Timeline Header Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-slate-150">
          <div>
            <h3 className="font-serif font-bold text-base text-slate-800">KP Vimshottari Dasa Timeline</h3>
            <p className="text-xs text-slate-500 mt-1">Explore nested timing cycles (Mahadasa &gt; Bhukti &gt; Antara) for this birth profile</p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
            <input 
              type="number" 
              placeholder="Search Year (e.g. 2026)" 
              value={searchYear} 
              onChange={(e) => setSearchYear(e.target.value)} 
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none w-full md:w-44 focus:border-green-500" 
            />

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none cursor-pointer font-bold text-slate-700"
            >
              <option value="all">Show All Periods</option>
              <option value="future">Show Future Only</option>
              <option value="favorable">Show Favorable Only</option>
            </select>
          </div>
        </div>

        {/* 3-Level Nested Accordion Timeline */}
        <div className="space-y-3">
          {filteredTimeline.length > 0 ? (
            filteredTimeline.map(dasa => {
              const dasaKey = `dasa-${dasa.lord}`;
              const isDasaExpanded = !!expandedItems[dasaKey];
              const dasaFav = getPlanetFavorability(dasa.lord);
              const nowMs = Date.now();
              const isCurrentDasa = nowMs >= new Date(dasa.start).getTime() && nowMs < new Date(dasa.end).getTime();

              return (
                <div key={dasaKey} className={`border rounded-2xl overflow-hidden transition-all ${
                  isCurrentDasa ? 'border-amber-500/80 shadow-sm bg-amber-500/[0.01]' : 'border-slate-200'
                }`}>
                  
                  {/* Mahadasa Header */}
                  <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isCurrentDasa ? 'bg-amber-500/[0.03]' : 'bg-slate-50/40'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-black text-sm text-slate-800">
                          {dasa.lord} Mahadasa
                        </h4>
                        {isCurrentDasa && (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-500 text-slate-950 uppercase border border-amber-500/40">
                            Current
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${dasaFav.color}`}>
                          {dasaFav.text}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatDate(dasa.start)} — {formatDate(dasa.end)}
                      </p>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                      <button 
                        onClick={() => handleEvaluateTransit(dasa.start)}
                        className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        Check Transit at Start
                      </button>
                      <button 
                        onClick={() => toggleExpand(dasaKey)}
                        className="px-3 py-1 text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors"
                      >
                        {isDasaExpanded ? 'Collapse' : 'Expand Bhuktis'}
                      </button>
                    </div>
                  </div>

                  {/* Level 2: Bhuktis */}
                  {isDasaExpanded && (
                    <div className="border-t border-slate-100 bg-white p-4 space-y-2">
                      <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">Bhuktis under {dasa.lord}</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {dasa.bhuktis.map(bhukti => {
                          const bhuktiKey = `${dasaKey}-bhukti-${bhukti.lord}`;
                          const isBhuktiExpanded = !!expandedItems[bhuktiKey];
                          const bhuktiFav = getPlanetFavorability(bhukti.lord);
                          const isCurrentBhukti = nowMs >= new Date(bhukti.start).getTime() && nowMs < new Date(bhukti.end).getTime();

                          return (
                            <div key={bhuktiKey} className={`border rounded-xl p-3 space-y-2 transition-all ${
                              isCurrentBhukti ? 'border-amber-400 bg-amber-500/[0.01]' : 'border-slate-100 bg-slate-50/20'
                            }`}>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <strong className="text-xs text-slate-800">{bhukti.lord} Bhukti</strong>
                                    {isCurrentBhukti && (
                                      <span className="px-1 py-0.2 rounded text-[7.5px] font-black bg-amber-400 text-slate-950 uppercase">Active</span>
                                    )}
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${bhuktiFav.color}`}>
                                      {bhuktiFav.text}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {formatDate(bhukti.start)} — {formatDate(bhukti.end)}
                                  </p>
                                </div>

                                <div className="flex gap-1.5">
                                  <button 
                                    onClick={() => handleEvaluateTransit(bhukti.start)}
                                    className="px-2 py-0.5 text-[9px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-md shadow-xs hover:bg-slate-50 transition-colors"
                                  >
                                    Check Transit
                                  </button>
                                  <button 
                                    onClick={() => toggleExpand(bhuktiKey)}
                                    className="px-2 py-0.5 text-[9px] font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
                                  >
                                    {isBhuktiExpanded ? 'Hide' : 'Show Antaras'}
                                  </button>
                                </div>
                              </div>

                              {/* Level 3: Antaras */}
                              {isBhuktiExpanded && (
                                <div className="border-t border-slate-100 pt-2.5 mt-2.5 space-y-1.5 pl-3 border-l border-slate-200">
                                  <h6 className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Antaras under {bhukti.lord}</h6>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {bhukti.antaras.map(antara => {
                                      const antaraFav = getPlanetFavorability(antara.lord);
                                      const isCurrentAntara = nowMs >= new Date(antara.start).getTime() && nowMs < new Date(antara.end).getTime();

                                      return (
                                        <div key={`ant-${antara.lord}-${antara.start}`} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                                          isCurrentAntara ? 'border-amber-400 bg-amber-500/[0.02]' : 'border-slate-200/50 bg-white'
                                        }`}>
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <strong className="text-slate-800 font-semibold">{antara.lord} Antara</strong>
                                              <span className={`w-1.5 h-1.5 rounded-full ${
                                                antaraFav.level === 'highly' ? 'bg-emerald-500' : antaraFav.level === 'favorable' ? 'bg-blue-500' : 'bg-slate-300'
                                              }`} title={antaraFav.text}></span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-mono">
                                              {formatDate(antara.start)} - {formatDate(antara.end)}
                                            </p>
                                          </div>
                                          <button 
                                            onClick={() => handleEvaluateTransit(antara.start)}
                                            className="p-1 text-[8px] font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded border border-slate-100"
                                            title="Evaluate transit triggers at this Antara's start date"
                                          >
                                            🚀
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-serif text-sm">
              No Dasa periods matched your search/filter criteria. Try clearing the search or switching filters.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
