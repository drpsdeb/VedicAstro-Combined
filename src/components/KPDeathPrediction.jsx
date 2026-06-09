import React, { useMemo } from 'react';
import { getHouseSignificators } from '../utils/kpEngine.js';
import { serializeKPData } from '../utils/kpSerializer.js';
import { evaluateDeathPrediction } from '../utils/kpRuleInterpreter.js';

// Weekday lords or standard planet badges
const PlanetBadge = ({ name, isMaraka, isBadhaka }) => {
  const badgeColors = {
    Sun: 'bg-red-50 text-red-705 border-red-200',
    Moon: 'bg-slate-100 text-slate-705 border-slate-200',
    Mars: 'bg-rose-50 text-rose-705 border-rose-200',
    Mercury: 'bg-emerald-50 text-emerald-705 border-emerald-200',
    Jupiter: 'bg-amber-50 text-amber-705 border-amber-200',
    Venus: 'bg-fuchsia-50 text-fuchsia-705 border-fuchsia-200',
    Saturn: 'bg-indigo-50 text-indigo-705 border-indigo-200',
    Rahu: 'bg-zinc-100 text-zinc-705 border-zinc-200',
    Ketu: 'bg-stone-100 text-stone-705 border-stone-200'
  };

  const style = badgeColors[name] || 'bg-gray-50 text-gray-750 border-gray-200';
  let label = '';
  if (isMaraka && isBadhaka) label = ' (Maraka+Badhaka)';
  else if (isMaraka) label = ' (Maraka)';
  else if (isBadhaka) label = ' (Badhaka)';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border shadow-xs ${style}`}>
      {name}
      {label}
    </span>
  );
};

export default function KPDeathPrediction({ cusps, planets, profile }) {
  // 1. Serialize data
  const serializedChartData = useMemo(() => {
    if (!cusps || !planets) return null;
    try {
      const significatorsMap = getHouseSignificators(cusps, planets);
      return serializeKPData(planets, cusps, significatorsMap);
    } catch (e) {
      console.error("Failed to serialize KP data inside KPDeathPrediction:", e);
      return null;
    }
  }, [cusps, planets]);

  // 2. Perform longevity evaluation
  const analysis = useMemo(() => {
    if (!serializedChartData) return null;
    try {
      return evaluateDeathPrediction(serializedChartData);
    } catch (e) {
      console.error("Longevity evaluation failed:", e);
      return null;
    }
  }, [serializedChartData]);

  if (!analysis) {
    return (
      <div className="p-6 text-center text-slate-500 font-serif text-sm">
        Calculating house cusps and longevity significators...
      </div>
    );
  }

  const {
    lagnaSign,
    lagnaNature,
    badhakaHouse,
    marakaHouses,
    cusp8SubLord,
    cusp8SubLordSigs,
    connectsTo,
    dangerHousesSignified,
    beneficHousesSignified,
    longevityClass,
    dangerLevel,
    analysisText,
    marakaPlanets,
    badhakaPlanets,
    criticalCusps
  } = analysis;

  const dangerColors = {
    Low: 'bg-emerald-50/15 border-emerald-500/20 text-emerald-800',
    Moderate: 'bg-amber-50/15 border-amber-500/20 text-amber-800',
    High: 'bg-rose-50/15 border-rose-500/20 text-rose-800'
  };

  const colors = dangerColors[dangerLevel] || dangerColors.Moderate;

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* 1. Verdict & Analysis Summary Card */}
      <div className={`border-2 rounded-2xl p-6 shadow-sm ${colors}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            <div>
              <h3 className="font-serif font-black text-lg text-slate-800 leading-tight">
                KP Longevity & Mortality Analysis
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
                Evaluation of Cusp 8 Sub-lord and Maraka/Badhaka houses
              </p>
            </div>
          </div>

          <div className={`px-5 py-2.5 rounded-2xl border shadow-sm flex flex-col items-center ${
            dangerLevel === 'Low' ? 'bg-emerald-600 border-emerald-700 text-white' :
            dangerLevel === 'High' ? 'bg-rose-600 border-rose-700 text-white' :
            'bg-amber-500 border-amber-600 text-slate-950'
          }`}>
            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-75">Longevity Class</span>
            <span className="text-base font-black tracking-wide leading-none mt-1 uppercase">
              {longevityClass}
            </span>
          </div>
        </div>

        {/* Cusp 8 Sub-lord assessment */}
        <div className="space-y-4 text-slate-700 font-serif leading-relaxed text-sm">
          <p>{analysisText}</p>
          
          <div className="bg-white/95 border border-slate-200/60 p-4 rounded-xl space-y-3 font-sans text-xs text-slate-700">
            <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-2 gap-2">
              <span className="font-bold">Lagna Sign & Nature:</span>
              <span className="font-semibold text-slate-600">{lagnaSign} ({lagnaNature} Sign)</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-2 gap-2">
              <span className="font-bold">8th House Cusp Sub-Lord:</span>
              <span className="font-semibold text-amber-800 font-black">{cusp8SubLord}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-2 gap-2">
              <span className="font-bold">Signified Houses of Cusp 8 Sub-Lord:</span>
              <span className="font-semibold text-slate-600 font-mono">[ {cusp8SubLordSigs.join(', ') || 'None'} ]</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <span className="font-bold">Death-Inflicting Connections (Maraka/Badhaka/12):</span>
              <span className={`font-semibold font-mono ${dangerLevel === 'High' ? 'text-rose-600 font-black' : 'text-slate-600'}`}>
                [ {dangerHousesSignified.join(', ') || 'None'} ]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Maraka & Badhaka Planets Mappings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Maraka Planets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="font-serif font-bold text-sm text-slate-800">Maraka Planets (Signify 2, 7)</h4>
            <p className="text-xs text-slate-500 mt-1">Planets acting as strong physical distress agents</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {marakaPlanets.length > 0 ? (
              marakaPlanets.map(p => (
                <PlanetBadge key={`maraka-${p}`} name={p} isMaraka={true} />
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No direct maraka planets active</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Maraka planets represent the primary agents of bodily physical transition. Under KP rules, their joint dasa periods represent sensitive times.
          </p>
        </div>

        {/* Badhaka Planets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="font-serif font-bold text-sm text-slate-800">
              Badhaka Planets (Signify House {badhakaHouse})
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Obstruction agents determined dynamically for {lagnaNature} Lagna
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {badhakaPlanets.length > 0 ? (
              badhakaPlanets.map(p => (
                <PlanetBadge key={`badhaka-${p}`} name={p} isBadhaka={true} />
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No direct badhaka planets active</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            For {lagnaNature} Lagna ({lagnaSign}), the Badhaka house is <strong>House {badhakaHouse}</strong>. Badhaka planets cause obstructions, unseen diseases, and critical diagnoses.
          </p>
        </div>

      </div>

      {/* 3. Dangerous Transiting Windows */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h4 className="font-serif font-bold text-sm text-slate-800">Critical Transit Mappings</h4>
          <p className="text-xs text-slate-500 mt-1">
            Astrological degrees representing sensitive areas during transit of malefic planets (Saturn, Mars, or Rahu)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5">Sensitive Point</th>
                <th className="py-2.5">House</th>
                <th className="py-2.5 text-right">Zodiac Degrees</th>
              </tr>
            </thead>
            <tbody>
              {criticalCusps.map((cusp, idx) => {
                const degrees = cusp.longitude % 30;
                const signIndex = Math.floor(cusp.longitude / 30);
                const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
                const sign = signNames[signIndex];

                return (
                  <tr key={`transit-cusp-${idx}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-850">{cusp.name}</td>
                    <td className="py-3 font-semibold text-slate-500">House {cusp.house}</td>
                    <td className="py-3 font-mono text-slate-700 text-right font-bold">
                      {degrees.toFixed(2)}&deg; {sign} ({cusp.longitude.toFixed(2)}&deg;)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50/20 border border-amber-250/40 rounded-xl p-4 text-[11px] text-slate-700 leading-normal font-serif">
          <strong>Timing Caution:</strong> Malefic transits (especially Saturn, Mars, or Rahu/Ketu) conjuncting or exactly opposite (&plusmn;1&deg; orb) these critical cusp degrees may trigger times of heightened health vulnerability or physical crises, especially when coinciding with a running Maraka or Badhaka Bhukti/Antara period.
        </div>
      </div>

    </div>
  );
}
