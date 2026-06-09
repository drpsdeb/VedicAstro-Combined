import React, { useState, useMemo, useEffect } from 'react';
import kpRules from '../utils/kpRules.json';
import { calculateKPDasas } from '../utils/kpDasaEngine.js';
import { getHouseSignificators } from '../utils/kpEngine.js';
import { serializeKPData } from '../utils/kpSerializer.js';
import { findEventTiming } from '../utils/kpRuleInterpreter.js';

export default function KPTimingScreen({ cusps, planets, profile }) {
  // 1. Setup selectors
  const categoriesList = useMemo(() => {
    return Object.keys(kpRules).map(catKey => {
      let name = catKey.replace(/_/g, ' ');
      name = name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (catKey === 'INCOME') name = 'Income & Career';
      if (catKey === 'LOSSES') name = 'Losses & Debt';
      if (catKey === 'CHILD_BIRTH') name = 'Child Birth';
      if (catKey === 'DIFFICULTY') name = 'Health & Difficulties';
      if (catKey === 'MARRIAGE') name = 'Marriage & Relationships';
      if (catKey === 'TRAVEL') name = 'Travel & Journeys';
      if (catKey === 'PROPERTY') name = 'Property & Vehicles';
      return { key: catKey, label: name };
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(categoriesList[0]?.key || '');
  
  const subcategoriesList = useMemo(() => {
    if (!selectedCategory || !kpRules[selectedCategory]) return [];
    return Object.keys(kpRules[selectedCategory]).map(subKey => {
      const ruleObj = kpRules[selectedCategory][subKey];
      return { key: subKey, label: ruleObj.matter };
    });
  }, [selectedCategory]);

  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  useEffect(() => {
    if (subcategoriesList.length > 0) {
      setSelectedSubcategory(subcategoriesList[0].key);
    } else {
      setSelectedSubcategory('');
    }
  }, [subcategoriesList]);

  // Filters for the timeline results
  const [futureOnly, setFutureOnly] = useState(true);
  const [favorableOnly, setFavorableOnly] = useState(true);

  // 2. Base calculations
  const moonLongitude = useMemo(() => {
    const moon = planets.find(p => p.name === 'Moon' || p.planet === 'Moon');
    return moon ? (moon.longitude ?? moon.fullDegree ?? moon.l) : 0;
  }, [planets]);

  const dasaTree = useMemo(() => {
    if (!profile || !profile.dob) return [];
    return calculateKPDasas(moonLongitude, profile.dob);
  }, [moonLongitude, profile]);

  const serializedChartData = useMemo(() => {
    if (!cusps || !planets) return null;
    try {
      const significatorsMap = getHouseSignificators(cusps, planets);
      return serializeKPData(planets, cusps, significatorsMap);
    } catch (e) {
      console.error("Failed to serialize KP data inside KPTimingScreen:", e);
      return null;
    }
  }, [cusps, planets]);

  const [timingWindows, setTimingWindows] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFindTiming = () => {
    if (!selectedCategory || !selectedSubcategory || !dasaTree.length || !serializedChartData) return;
    
    const results = findEventTiming(selectedCategory, selectedSubcategory, dasaTree, serializedChartData);
    setTimingWindows(results);
    setHasSearched(true);
  };

  // Filter the timing windows based on state
  const filteredWindows = useMemo(() => {
    const now = Date.now();
    return timingWindows.filter(win => {
      if (futureOnly && new Date(win.antaraEnd).getTime() < now) {
        return false;
      }
      if (favorableOnly && win.viabilityScore < 50) {
        return false;
      }
      return true;
    });
  }, [timingWindows, futureOnly, favorableOnly]);

  const formatDate = (dateObj) => {
    if (!dateObj) return '';
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 70) return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-250', bar: 'bg-emerald-500' };
    if (score >= 50) return { bg: 'bg-blue-100 text-blue-800 border-blue-250', bar: 'bg-blue-500' };
    return { bg: 'bg-amber-100 text-amber-800 border-amber-250', bar: 'bg-amber-500' };
  };

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* Search and Filters card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-serif font-bold text-base text-slate-800">Event Timing Analyzer</h3>
          <p className="text-xs text-slate-500 mt-1">
            Calculates Dasa-Bhukti-Antara timing windows when joint period lords signify the event's promised houses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
          {/* Category Dropdown */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Event Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setHasSearched(false);
              }}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold text-slate-700"
            >
              {categoriesList.map(cat => (
                <option key={`timing-cat-${cat.key}`} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Dropdown */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Specific Query / Matter
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => {
                setSelectedSubcategory(e.target.value);
                setHasSearched(false);
              }}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold text-slate-700"
              disabled={subcategoriesList.length === 0}
            >
              {subcategoriesList.map(sub => (
                <option key={`timing-sub-${sub.key}`} value={sub.key}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Button */}
          <div className="lg:col-span-1">
            <button
              onClick={handleFindTiming}
              className="w-full p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs uppercase shadow-sm transition-all tracking-wider"
              disabled={!selectedCategory || !selectedSubcategory || !serializedChartData}
            >
              Find Favorable Windows
            </button>
          </div>
        </div>

        {/* Filter controls */}
        {hasSearched && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={futureOnly}
                onChange={(e) => setFutureOnly(e.target.checked)}
                className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              Future Windows Only
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={favorableOnly}
                onChange={(e) => setFavorableOnly(e.target.checked)}
                className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              Favorable Windows Only (Viability &ge; 50%)
            </label>
          </div>
        )}
      </div>

      {/* Results View */}
      {hasSearched ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Timing Windows Timeline</span>
            <span>Found {filteredWindows.length} matching periods</span>
          </div>

          {filteredWindows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWindows.map((win, index) => {
                const colors = getScoreColor(win.viabilityScore);
                const isCurrent = Date.now() >= new Date(win.antaraStart).getTime() && Date.now() < new Date(win.antaraEnd).getTime();

                return (
                  <div 
                    key={`win-${index}-${win.dasa}-${win.bhukti}`}
                    className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                      isCurrent ? 'border-amber-400 ring-2 ring-amber-400/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Period Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Lords (D-B-A)</span>
                          <h4 className="font-serif font-black text-sm text-slate-800 mt-0.5">
                            {win.dasa} &rarr; {win.bhukti} &rarr; {win.antara}
                          </h4>
                        </div>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-400 text-slate-950 uppercase border border-amber-500/10">
                            Active Now
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 font-mono">
                        <span>{formatDate(win.antaraStart)}</span>
                        <span className="text-slate-350">&mdash;</span>
                        <span>{formatDate(win.antaraEnd)}</span>
                      </div>

                      {/* Score Indicator */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Viability Score</span>
                          <span className={`px-1.5 py-0.2 rounded border ${colors.bg}`}>
                            {win.viabilityScore}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors.bar}`} 
                            style={{ width: `${win.viabilityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Trigger State */}
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-450 font-bold uppercase tracking-wider">Joint Lord Trigger</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        win.isTriggerActive 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-150 text-slate-450'
                      }`}>
                        {win.isTriggerActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px] space-y-1.5">
              <span className="text-xl">📅</span>
              <h5 className="font-serif font-bold text-sm text-slate-700">No timing windows found</h5>
              <p className="text-xs text-slate-450 max-w-sm">
                Try disabling "Favorable Windows Only" or checking another category/subcategory combination.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center bg-slate-50/50 flex flex-col items-center justify-center min-h-[220px] space-y-2">
          <span className="text-3xl">📅</span>
          <h4 className="font-serif font-bold text-base text-slate-750">Timing Analysis Ready</h4>
          <p className="text-xs text-slate-450 max-w-sm leading-relaxed">
            Click <strong>"Find Favorable Windows"</strong> to map the native's Vimshottari cycles against event significators.
          </p>
        </div>
      )}

    </div>
  );
}
