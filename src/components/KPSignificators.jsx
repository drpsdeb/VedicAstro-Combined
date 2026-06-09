import React from 'react';
import { getHouseSignificators } from '../utils/kpEngine.js';

// Simple badges for planets/lords to improve visual scanning
const PlanetBadge = ({ name, isStrong, isDecider }) => {
  const badgeColors = {
    Sun: 'bg-red-50 text-red-700 border-red-200',
    Moon: 'bg-slate-100 text-slate-700 border-slate-200',
    Mars: 'bg-rose-50 text-rose-700 border-rose-200',
    Mercury: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Jupiter: 'bg-amber-50 text-amber-700 border-amber-200',
    Venus: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    Saturn: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Rahu: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    Ketu: 'bg-stone-100 text-stone-700 border-stone-200'
  };

  const style = badgeColors[name] || 'bg-gray-50 text-gray-700 border-gray-200';
  let decoration = "";
  if (isStrong) {
    decoration = " ★";
  } else if (isDecider) {
    decoration = " 🎯";
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border shadow-sm ${style}`}
      title={isStrong ? "Strong Significator (Star-Level)" : (isDecider ? "Deciding Cusp Sub-Lord" : "Significator")}
    >
      {name}
      {decoration}
    </span>
  );
};

export default function KPSignificators({ cusps, planets }) {
  const significatorsMap = getHouseSignificators(cusps, planets);

  return (
    <div className="w-full space-y-6">
      
      {/* Legend Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 text-xs items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">KP Signification Rules Legend:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1"><PlanetBadge name="Sun" isDecider={true} /> <span>Cusp Sub-Lord (🎯 Cusp Decider)</span></span>
          <span className="flex items-center gap-1"><PlanetBadge name="Mars" isStrong={true} /> <span>Star-Level (★ Strong Planet in Star)</span></span>
          <span className="flex items-center gap-1"><PlanetBadge name="Moon" /> <span>Direct Level (Occupant / Lord)</span></span>
        </div>
      </div>

      {/* 12 House Significators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.values(significatorsMap).map((sig) => {
          const h = sig.house;
          return (
            <div key={`house-card-${h}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-black text-lg text-slate-800">House {h}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cusp: {sig.cuspLongitude.toFixed(2)}°</span>
                </div>
                <div className="flex justify-between text-[10.5px] text-slate-500 mt-1 font-semibold">
                  <span>Sign Lord: {sig.houseLord}</span>
                  <span>Cusp Sub-Lord: {sig.cuspSubLord}</span>
                </div>
              </div>

              {/* Levels breakdown */}
              <div className="space-y-2.5 text-xs flex-grow">
                
                {/* Level A */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">A. Cusp Sub-Lord:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {sig.levels.a.map(p => (
                      <PlanetBadge key={`h${h}-A-${p}`} name={p} isDecider={true} />
                    ))}
                  </div>
                </div>

                {/* Level B */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">B. In Cusp Sub-Lord Star:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {sig.levels.b.length > 0 ? (
                      sig.levels.b.map(p => (
                        <PlanetBadge key={`h${h}-B-${p}`} name={p} isStrong={true} />
                      ))
                    ) : (
                      <span className="text-slate-300 italic font-mono">-</span>
                    )}
                  </div>
                </div>

                {/* Level C */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">C. House Occupants:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {sig.levels.c.length > 0 ? (
                      sig.levels.c.map(p => (
                        <PlanetBadge key={`h${h}-C-${p}`} name={p} />
                      ))
                    ) : (
                      <span className="text-slate-300 italic font-mono">-</span>
                    )}
                  </div>
                </div>

                {/* Level D */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">D. In House Lord Star:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {sig.levels.d.length > 0 ? (
                      sig.levels.d.map(p => (
                        <PlanetBadge key={`h${h}-D-${p}`} name={p} isStrong={true} />
                      ))
                    ) : (
                      <span className="text-slate-300 italic font-mono">-</span>
                    )}
                  </div>
                </div>

              </div>

              {/* All Consolidated Significators */}
              <div className="border-t border-slate-100 pt-3 mt-4">
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">All Significator Planets</span>
                <div className="flex flex-wrap gap-1">
                  {sig.allSignificators.length > 0 ? (
                    sig.allSignificators.map(p => {
                      const isStrong = sig.levels.b.includes(p) || sig.levels.d.includes(p);
                      const isDecider = sig.levels.a.includes(p);
                      return (
                        <PlanetBadge key={`h${h}-all-${p}`} name={p} isStrong={isStrong} isDecider={isDecider} />
                      );
                    })
                  ) : (
                    <span className="text-slate-400 text-xs italic">No active significators</span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
