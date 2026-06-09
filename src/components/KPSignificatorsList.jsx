import React from 'react';

// Color map for planet badges to match the rest of the application
const PlanetBadge = ({ name, isSubLord }) => {
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
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border shadow-xs ${style}`}>
      {name}
      {isSubLord && ' 🎯'}
    </span>
  );
};

export default function KPSignificatorsList({ result, computedChartData }) {
  if (!result) return null;

  const {
    primaryHouses = [],
    supportingHouses = [],
    negatingHouses = [],
    primaryHits = [],
    supportingHits = [],
    negatingHits = [],
    subLord
  } = result;

  // Helper to fetch significator planets for a house from computedChartData
  const getHousePlanets = (houseNum) => {
    if (!computedChartData) return [];
    
    // Check direct significators matrix
    if (computedChartData.significators && computedChartData.significators[houseNum]) {
      const sigData = computedChartData.significators[houseNum];
      return sigData.allSignificators || sigData.all || [];
    }

    // Check nested cusps
    if (computedChartData.cusps) {
      const cusp = computedChartData.cusps.find(c => c.house === houseNum);
      if (cusp && cusp.significators) {
        return cusp.significators.all || cusp.significators.allSignificators || [];
      }
    }

    // Check direct flat matrix
    if (computedChartData[houseNum]) {
      const sigData = computedChartData[houseNum];
      return sigData.allSignificators || sigData.all || [];
    }

    return [];
  };

  // Reusable sub-section to render house groups
  const renderHouseSection = ({ title, houses, hits, theme }) => {
    const themeColors = {
      emerald: {
        cardBg: 'bg-emerald-50/10 border-emerald-200/60',
        badgeActive: 'bg-emerald-100 text-emerald-850 border-emerald-250',
        badgeInactive: 'bg-slate-50 text-slate-405 border-slate-200',
        text: 'text-emerald-800',
        dot: 'bg-emerald-500'
      },
      blue: {
        cardBg: 'bg-blue-50/10 border-blue-200/60',
        badgeActive: 'bg-blue-100 text-blue-850 border-blue-250',
        badgeInactive: 'bg-slate-50 text-slate-405 border-slate-200',
        text: 'text-blue-800',
        dot: 'bg-blue-500'
      },
      rose: {
        cardBg: 'bg-rose-50/10 border-rose-200/60',
        badgeActive: 'bg-rose-100 text-rose-850 border-rose-250',
        badgeInactive: 'bg-slate-50 text-slate-405 border-slate-200',
        text: 'text-rose-800',
        dot: 'bg-rose-500'
      }
    };

    const colors = themeColors[theme] || themeColors.blue;

    if (houses.length === 0) {
      return (
        <div className={`border rounded-2xl p-5 ${colors.cardBg} text-slate-500 text-xs font-serif italic text-center`}>
          No {title.toLowerCase()} defined for this rule.
        </div>
      );
    }

    return (
      <div className={`border rounded-2xl p-5 shadow-xs bg-white ${colors.cardBg} flex flex-col justify-between h-full`}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
            <h4 className="font-serif font-bold text-sm text-slate-800">{title}</h4>
          </div>
          
          <div className="space-y-3">
            {houses.map(h => {
              const isHit = hits.includes(h);
              const housePlanets = getHousePlanets(h);
              
              return (
                <div 
                  key={`house-hit-${title}-${h}`} 
                  className={`flex flex-col p-2.5 rounded-xl border transition-colors ${
                    isHit ? 'bg-slate-50/60 border-slate-200/80 shadow-xs' : 'border-slate-100 bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black border ${
                        isHit ? colors.badgeActive : colors.badgeInactive
                      }`}>
                        {h}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">House {h}</span>
                    </div>

                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                      isHit 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isHit ? 'Signified' : 'Not Signified'}
                    </span>
                  </div>

                  {/* Planet significators for this house */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Significators:</span>
                    {housePlanets.length > 0 ? (
                      housePlanets.map(p => (
                        <PlanetBadge key={`p-${title}-${h}-${p}`} name={p} isSubLord={p === subLord} />
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-350 italic">None</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10.5px] text-slate-500 font-bold">
          <span>Hits:</span>
          <span className={colors.text}>{hits.length} of {houses.length} signified</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 text-left">
      <div>
        <h3 className="font-serif font-bold text-base text-slate-800">Astrological Significator Matrix</h3>
        <p className="text-xs text-slate-500 mt-1">
          Cross-references the primary, supporting, and negating houses signified by the governing cusp sub-lord <strong className="text-slate-800 font-black">{subLord}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        
        {/* Primary Houses */}
        {renderHouseSection({
          title: 'Primary promised houses',
          houses: primaryHouses,
          hits: primaryHits,
          theme: 'emerald'
        })}

        {/* Supporting Houses */}
        {renderHouseSection({
          title: 'Supporting houses',
          houses: supportingHouses,
          hits: supportingHits,
          theme: 'blue'
        })}

        {/* Negating / Obstacle Houses */}
        {renderHouseSection({
          title: 'Negating & obstacle houses',
          houses: negatingHouses,
          hits: negatingHits,
          theme: 'rose'
        })}

      </div>
    </div>
  );
}
