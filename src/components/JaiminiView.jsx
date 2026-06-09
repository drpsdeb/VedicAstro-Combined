// ============================================================================
// 🔮 JAIMINI ANALYTICAL STUDIO - CHARA KARAKAS & RASHI DRISHTI VISUALIZER
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, Clock, X, Settings, ArrowLeft, Layers } from 'lucide-react';
import { AstroEngine, getPositionsForProfile } from '../utils/ephemerisEngine';
import { calculateCharaKarakas, getRashiAspects, generateJaiminiInsights, calculateArudhaLagna, calculateUpapadaLagna } from '../utils/jaiminiEngine';
import SearchableDropdown from './SearchableDropdown';
import PreciseCalculationToggle from './PreciseCalculationToggle';

const RASHIS_META = [
  { index: 0, name: 'Aries', sanskrit: 'Mesha', type: 'Cardinal' },
  { index: 1, name: 'Taurus', sanskrit: 'Vrishabha', type: 'Fixed' },
  { index: 2, name: 'Gemini', sanskrit: 'Mithuna', type: 'Mutable' },
  { index: 3, name: 'Cancer', sanskrit: 'Karka', type: 'Cardinal' },
  { index: 4, name: 'Leo', sanskrit: 'Simha', type: 'Fixed' },
  { index: 5, name: 'Virgo', sanskrit: 'Kanya', type: 'Mutable' },
  { index: 6, name: 'Libra', sanskrit: 'Tula', type: 'Cardinal' },
  { index: 7, name: 'Scorpio', sanskrit: 'Vrishchika', type: 'Fixed' },
  { index: 8, name: 'Sagittarius', sanskrit: 'Dhanu', type: 'Mutable' },
  { index: 9, name: 'Capricorn', sanskrit: 'Makara', type: 'Cardinal' },
  { index: 10, name: 'Aquarius', sanskrit: 'Kumbha', type: 'Fixed' },
  { index: 11, name: 'Pisces', sanskrit: 'Meena', type: 'Mutable' }
];

const numOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const safeStr = (str, delimiter) => {
  if (typeof str !== 'string' || !str) return '';
  return str.split(delimiter)[0] || '';
};

export default function JaiminiView({ savedProfiles, onBack, currentProfileName, onSelectProfile }) {
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

  const [selectedProfile, setSelectedProfile] = useState(currentProfileName || sortedProfiles[0]?.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartStyle, setChartStyle] = useState('south'); // 'south' or 'north'
  const [selectedRasi, setSelectedRasi] = useState(0);

  const [preciseToggle, setPreciseToggle] = useState(() => localStorage.getItem('use_precise_api') === 'true');
  const [calcTrigger, setCalcTrigger] = useState(0);
  React.useEffect(() => {
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

  const [expandedFolders, setExpandedFolders] = useState({
    Family: true,
    Friend: true,
    Patient: true,
    Facebook: true,
    Client: true,
    Other: true
  });

  const toggleFolder = (key) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return sortedProfiles;
    return sortedProfiles.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedProfiles, searchQuery]);

  const groupedCategories = useMemo(() => {
    const matchedSet = new Set(filteredProfiles.map(o => o.id));
    const categoriesList = ["Family", "Friend", "Patient", "Facebook", "Client", "Other"];
    
    const catMap = {};
    categoriesList.forEach(c => { catMap[c] = []; });
    
    sortedProfiles.forEach(opt => {
      const cat = opt.category || "Family";
      if (!catMap[cat]) {
        catMap[cat] = [];
      }
      catMap[cat].push(opt);
    });
    
    const result = [];
    categoriesList.forEach(catName => {
      const items = catMap[catName];
      if (!items || items.length === 0) return;

      const headsInCat = items.filter(opt => !opt.familyHeadId || opt.familyHeadId === opt.id);
      const membersInCat = items.filter(opt => opt.familyHeadId && opt.familyHeadId !== opt.id);
      
      const referencedHeadIds = new Set(membersInCat.map(m => m.familyHeadId));
      const allHeadsMap = new Map();
      headsInCat.forEach(h => allHeadsMap.set(h.id, h));
      
      referencedHeadIds.forEach(headId => {
        if (!allHeadsMap.has(headId)) {
          const globalHead = sortedProfiles.find(o => o.id === headId);
          if (globalHead) {
            allHeadsMap.set(headId, globalHead);
          }
        }
      });
      
      const groups = [];
      const groupedItemIds = new Set();
      
      allHeadsMap.forEach((head, headId) => {
        const groupMembers = membersInCat.filter(m => m.familyHeadId === headId);
        if (groupMembers.length > 0) {
          const headMatches = items.some(opt => opt.id === headId) && matchedSet.has(headId);
          const matchedMembers = groupMembers.filter(m => matchedSet.has(m.id));
          
          if (headMatches || matchedMembers.length > 0) {
            groups.push({
              head,
              showHead: headMatches,
              members: matchedMembers
            });
            if (headMatches) groupedItemIds.add(headId);
            matchedMembers.forEach(m => groupedItemIds.add(m.id));
          }
        }
      });
      
      const standaloneItems = items.filter(opt => matchedSet.has(opt.id) && !groupedItemIds.has(opt.id));

      if (groups.length > 0 || standaloneItems.length > 0) {
        result.push({
          categoryName: catName,
          groups,
          standaloneItems
        });
      }
    });

    return result;
  }, [sortedProfiles, filteredProfiles]);

  const profile = useMemo(() => {
    return savedProfiles.find(p => p.name === selectedProfile) || savedProfiles[0];
  }, [selectedProfile, savedProfiles]);

  const coreAstro = useMemo(() => {
    return getPositionsForProfile(profile);
  }, [profile, preciseToggle, calcTrigger]);

  const natalPlanets = useMemo(() => {
    if (!coreAstro) return [];
    return coreAstro.planets.map(p => ({ 
      planet: p.planet, 
      fullDegree: p.fullDegree, 
      rasiIndex: p.rasiIndex, 
      isRetro: p.isRetro,
      rasiDegrees: (p.fullDegree % 30)
    }));
  }, [coreAstro]);

  const lagnaIndex = coreAstro ? coreAstro.lagnaIndex : 0;

  const charaKarakas = useMemo(() => {
    if (!natalPlanets || natalPlanets.length === 0) return null;
    return calculateCharaKarakas(natalPlanets);
  }, [natalPlanets]);

  // Map planets to their Jaimini labels for display in chart
  const planetKarakaMap = useMemo(() => {
    const map = {};
    if (charaKarakas && charaKarakas.sortedList) {
      charaKarakas.sortedList.forEach(item => {
        map[item.planet] = item.label;
      });
    }
    return map;
  }, [charaKarakas]);

  const aspectedIndices = useMemo(() => getRashiAspects(selectedRasi), [selectedRasi]);

  const calculatedKarakas = useMemo(() => charaKarakas?.byKaraka, [charaKarakas]);

  const rasiPlacements = useMemo(() => {
    const placements = {};
    natalPlanets.forEach(p => {
      placements[p.planet] = p.rasiIndex;
    });
    return placements;
  }, [natalPlanets]);

  const placements = useMemo(() => {
    if (lagnaIndex === undefined || !rasiPlacements) return {};
    const housePlacements = {};
    Object.keys(rasiPlacements).forEach(planet => {
      const rasiIndex = rasiPlacements[planet];
      let houseNum = (rasiIndex - lagnaIndex) + 1;
      if (houseNum <= 0) houseNum += 12;
      housePlacements[planet] = houseNum;
    });
    return housePlacements;
  }, [lagnaIndex, rasiPlacements]);

  const jaiminiInsights = useMemo(() => {
    if (lagnaIndex === undefined || !rasiPlacements || !placements || !calculatedKarakas) return [];
    
    const al = calculateArudhaLagna(lagnaIndex, rasiPlacements);
    const ul = calculateUpapadaLagna(lagnaIndex, rasiPlacements);
    
    // Pass the house and sign placements to generate highly specific text
    return generateJaiminiInsights(calculatedKarakas, al, ul, placements, rasiPlacements, lagnaIndex);
  }, [calculatedKarakas, lagnaIndex, rasiPlacements, placements]);

  const adjacentExcludedIndex = useMemo(() => {
    const rasiMeta = RASHIS_META[selectedRasi];
    if (rasiMeta.type === 'Cardinal') {
      return (selectedRasi + 1) % 12;
    } else if (rasiMeta.type === 'Fixed') {
      return (selectedRasi - 1 + 12) % 12;
    }
    return null;
  }, [selectedRasi]);

  const selectedRasiMeta = RASHIS_META[selectedRasi];

  const formatDms = (deg) => {
    const d = Math.floor(deg);
    const minFloat = (deg - d) * 60;
    const m = Math.floor(minFloat);
    const s = Math.round((minFloat - m) * 60);
    return `${d}° ${m.toString().padStart(2, '0')}' ${s.toString().padStart(2, '0')}"`;
  };

  const getRuleExplanation = (meta) => {
    if (meta.type === 'Cardinal') {
      const adjFixed = RASHIS_META[(meta.index + 1) % 12];
      return `${meta.name} (Cardinal) aspects all Fixed signs except the adjacent Fixed sign (${adjFixed.name}, index ${adjFixed.index}).`;
    } else if (meta.type === 'Fixed') {
      const adjCard = RASHIS_META[(meta.index - 1 + 12) % 12];
      return `${meta.name} (Fixed) aspects all Cardinal signs except the adjacent Cardinal sign (${adjCard.name}, index ${adjCard.index}).`;
    } else {
      return `${meta.name} (Mutable) aspects all other Mutable signs.`;
    }
  };

  // Render South Indian cell content helper
  const renderSouthCellContent = (rasiIdx) => {
    const isLagna = lagnaIndex === rasiIdx;
    const occupants = natalPlanets.filter(p => p.rasiIndex === rasiIdx);

    return (
      <div className="flex-1 flex flex-col justify-between p-1 md:p-1.5 h-full relative">
        <div className="flex justify-between items-start">
          <span className="text-[9px] font-bold opacity-40 uppercase tracking-tight">
            {RASHIS_META[rasiIdx].name.substring(0, 3)}
          </span>
          {isLagna && (
            <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-black">
              ASC
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-wrap content-center justify-center gap-1 my-1">
          {occupants.map(p => {
            const karaka = planetKarakaMap[p.planet];
            return (
              <div 
                key={p.planet} 
                className={`text-[9px] md:text-[10px] font-black leading-none flex flex-col items-center ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`}
              >
                <span>{AstroEngine.PLANET_SHORTS[p.planet]}</span>
                {karaka && (
                  <span className="text-[7px] text-amber-800 font-medium scale-90 -mt-0.5">
                    {karaka}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // South Indian Chart Grid
  const southGrid = [
    { rasi: 11, col: 1, row: 1 }, { rasi: 0, col: 2, row: 1 }, { rasi: 1, col: 3, row: 1 }, { rasi: 2, col: 4, row: 1 },
    { rasi: 10, col: 1, row: 2 }, { rasi: 3, col: 4, row: 2 },
    { rasi: 9, col: 1, row: 3 },  { rasi: 4, col: 4, row: 3 },
    { rasi: 8, col: 1, row: 4 },  { rasi: 7, col: 2, row: 4 }, { rasi: 6, col: 3, row: 4 }, { rasi: 5, col: 4, row: 4 }
  ];

  // North Indian Chart House coords (relative layout)
  // Houses 1-12 mapped to their geometrical coordinates
  const northHouses = [
    { h: 1, rasiOffset: 0, x: 50, y: 25, points: "50,0 100,50 50,50 0,50" },
    { h: 2, rasiOffset: 1, x: 25, y: 12.5, points: "50,0 25,25 0,0" },
    { h: 3, rasiOffset: 2, x: 12.5, y: 25, points: "0,0 25,25 0,50" },
    { h: 4, rasiOffset: 3, x: 25, y: 50, points: "25,25 50,50 25,75 0,50" },
    { h: 5, rasiOffset: 4, x: 12.5, y: 75, points: "0,50 25,75 0,100" },
    { h: 6, rasiOffset: 5, x: 25, y: 87.5, points: "25,75 50,100 0,100" },
    { h: 7, rasiOffset: 6, x: 50, y: 75, points: "50,50 100,50 50,100 0,50" }, // wait, standard diamond boundaries
    { h: 8, rasiOffset: 7, x: 75, y: 87.5, points: "50,100 75,75 100,100" },
    { h: 9, rasiOffset: 8, x: 87.5, y: 75, points: "100,50 75,75 100,100" },
    { h: 10, rasiOffset: 9, x: 75, y: 50, points: "75,25 100,50 75,75 50,50" },
    { h: 11, rasiOffset: 10, x: 87.5, y: 25, points: "100,0 75,25 100,50" },
    { h: 12, rasiOffset: 11, x: 75, y: 12.5, points: "50,0 75,25 100,0" }
  ];

  return (
    <div className="min-h-screen bg-[#ececd6] text-slate-800 font-sans antialiased flex flex-col">
      {/* HEADER BAR (AstroWatch-style) */}
      <div className="h-12 bg-white/80 border-b border-slate-200 shadow-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>
          <div className="font-serif text-sm font-bold text-amber-900 hidden sm:block">
            🕉️ Jaimini Analytical Studio
          </div>
        </div>
        <div>
          <PreciseCalculationToggle />
        </div>
        <div className="text-right text-[10px] sm:text-xs truncate max-w-[260px] text-emerald-950 font-bold font-serif">
          {profile ? `${profile.name} | ${profile.dob} | ${profile.time || '12:00'}` : 'No Active Profile'}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
        
        {/* SIDEBAR: Profile selection (AstroWatch-style) */}
        <aside className="w-full lg:w-[250px] shrink-0 bg-white/85 border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col gap-2 max-h-[220px] lg:max-h-[calc(100vh-80px)]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="🔍 Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-800"
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-blue-500 shrink-0" />
            <SearchableDropdown
              options={sortedProfiles}
              value={sortedProfiles.find(p => p.name === selectedProfile)?.id}
              onChange={id => {
                const found = sortedProfiles.find(p => p.id === id);
                if (found) {
                  setSelectedProfile(found.name);
                  if (onSelectProfile) onSelectProfile(found);
                }
              }}
              placeholder="Select Profile"
              className="flex-1 min-w-0"
              buttonClassName="w-full bg-emerald-50 border border-emerald-200 text-emerald-955 text-xs font-bold font-serif"
              groupByCategory={true}
            />
            <Compass size={14} className="text-emerald-700 shrink-0" />
          </div>
          <div className="text-[10px] text-slate-500 px-1 font-serif">Active profile synced</div>

          {/* Directory List */}
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-slate-100 pt-1 space-y-2">
            {filteredProfiles.length > 0 ? (
              groupedCategories.map((catGroup) => {
                const isCatExpanded = expandedFolders[catGroup.categoryName] !== false;
                return (
                  <div key={catGroup.categoryName} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleFolder(catGroup.categoryName)}
                      className="w-full px-2 py-1 text-[10px] uppercase font-extrabold tracking-wider bg-emerald-50 hover:bg-emerald-100 rounded flex items-center justify-between text-left font-serif text-emerald-950 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <span>{isCatExpanded ? '📂' : '📁'}</span>
                        {catGroup.categoryName}
                      </span>
                      <span className="text-[8px] opacity-60">{isCatExpanded ? '▼' : '▶'}</span>
                    </button>
                    
                    {isCatExpanded && (
                      <div className="pl-1.5 space-y-1.5 border-l border-emerald-800/10 ml-1">
                        {catGroup.groups.map((fam) => {
                          const famKey = `family_${fam.head.id}`;
                          const isFamExpanded = expandedFolders[famKey] !== false;
                          return (
                            <div key={fam.head.id} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => toggleFolder(famKey)}
                                className="w-full px-1.5 py-0.5 text-[9px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50/50 hover:bg-amber-50 rounded flex items-center justify-between text-left transition-colors"
                              >
                                <span className="flex items-center gap-1">
                                  <span>👨‍👩‍👧‍👦</span>
                                  {fam.head.name}'s Group
                                </span>
                                <span className="text-[7px] opacity-60">{isFamExpanded ? '▼' : '▶'}</span>
                              </button>
                              
                              {isFamExpanded && (
                                <div className="pl-2 border-l border-amber-800/10 ml-1 space-y-0.5">
                                  {fam.showHead && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedProfile(fam.head.name);
                                        if (onSelectProfile) onSelectProfile(fam.head);
                                      }}
                                      className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                        fam.head.name === selectedProfile ? 'bg-slate-600 text-white font-bold' : 'text-emerald-950 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {fam.head.name} (Self)
                                    </button>
                                  )}
                                  {fam.members.map((m) => {
                                    const isActive = m.name === selectedProfile;
                                    return (
                                      <button
                                        type="button"
                                        key={m.id}
                                        onClick={() => {
                                          setSelectedProfile(m.name);
                                          if (onSelectProfile) onSelectProfile(m);
                                        }}
                                        className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                          isActive ? 'bg-slate-600 text-white font-bold' : 'text-slate-600 hover:bg-emerald-50'
                                        }`}
                                      >
                                        ├─ {m.name} {m.relationship ? `(${m.relationship})` : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {catGroup.standaloneItems.map((p) => {
                          const isActive = p.name === selectedProfile;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProfile(p.name);
                                if (onSelectProfile) onSelectProfile(p);
                              }}
                              className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                isActive ? 'bg-slate-600 text-white font-bold' : 'text-emerald-950 hover:bg-emerald-50'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-[10px] text-slate-400 py-3 font-serif">No profiles found</div>
            )}
          </div>
        </aside>

        {/* CENTER MAIN STAGE */}
        <main className="flex-grow min-w-0 bg-[#fdfde8] border border-amber-200 rounded-2xl shadow-lg p-5 flex flex-col md:flex-row gap-6 overflow-y-auto h-[calc(100vh-80px)]">
          
          {/* COLUMN 1: CLICKABLE CHART */}
          <div className="flex-1 flex flex-col items-center">
            {/* Chart type switcher */}
            <div className="mb-4 flex bg-slate-800 rounded-full p-0.5 text-[10px] font-black shadow-md">
              <button 
                onClick={() => setChartStyle('south')} 
                className={`px-3 py-1 rounded-full text-white transition-all ${chartStyle === 'south' ? 'bg-amber-600 shadow' : 'opacity-60'}`}
              >
                South Indian
              </button>
              <button 
                onClick={() => setChartStyle('north')} 
                className={`px-3 py-1 rounded-full text-white transition-all ${chartStyle === 'north' ? 'bg-amber-600 shadow' : 'opacity-60'}`}
              >
                North Indian
              </button>
            </div>

            {/* Clickable chart area */}
            <div className="relative w-full max-w-[320px] xl:max-w-[400px] aspect-square flex items-center justify-center">
              {chartStyle === 'south' ? (
                /* SOUTH INDIAN GRID */
                <div className="w-full h-full grid grid-cols-4 grid-rows-4 border-2 border-amber-800 bg-white shadow-md rounded-lg overflow-hidden shrink-0">
                  <div className="col-start-2 col-end-4 row-start-2 row-end-4 flex flex-col items-center justify-center text-center p-3 border border-amber-800/10 bg-[#fbfbf0]">
                    <span className="text-xs font-black tracking-wide text-amber-900 font-serif">
                      {selectedRasiMeta.name}
                    </span>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5">
                      {selectedRasiMeta.type}
                    </span>
                    <span className="text-[7px] text-emerald-700 font-bold tracking-tight uppercase leading-none mt-1">
                      ACTIVE DRISHTI
                    </span>
                  </div>

                  {southGrid.map(cell => {
                    const isSelected = selectedRasi === cell.rasi;
                    const isAspected = aspectedIndices.includes(cell.rasi);
                    const isExcluded = adjacentExcludedIndex === cell.rasi;

                    let cellColorClass = "bg-white hover:bg-slate-50 border border-amber-800/20 transition-all cursor-pointer";
                    if (isSelected) {
                      cellColorClass = "bg-amber-100 hover:bg-amber-200 border-2 border-amber-600 ring-1 ring-amber-300 z-20 shadow-inner";
                    } else if (isAspected) {
                      cellColorClass = "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-sm";
                    } else if (isExcluded) {
                      cellColorClass = "bg-rose-50 hover:bg-rose-100 border border-rose-200";
                    }

                    return (
                      <div 
                        key={`south-cell-${cell.rasi}`}
                        style={{ gridColumnStart: cell.col, gridRowStart: cell.row }}
                        className={cellColorClass}
                        onClick={() => setSelectedRasi(cell.rasi)}
                      >
                        {renderSouthCellContent(cell.rasi)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* NORTH INDIAN SVG */
                <div className="w-full h-full border-2 border-amber-800 bg-white shadow-md rounded-lg relative overflow-hidden">
                  {/* Single SVG layer containing background lines and all interactive house polygons */}
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                    {/* Background lines (non-interactive) */}
                    <g className="stroke-amber-800/20 pointer-events-none" style={{ strokeWidth: 1 }}>
                      <line x1="0" y1="0" x2="100" y2="100" />
                      <line x1="100" y1="0" x2="0" y2="100" />
                      <line x1="50" y1="0" x2="100" y2="50" />
                      <line x1="100" y1="50" x2="50" y2="100" />
                      <line x1="50" y1="100" x2="0" y2="50" />
                      <line x1="0" y1="50" x2="50" y2="0" />
                    </g>
                    
                    {/* Interactive house polygons */}
                    {northHouses.map(house => {
                      const rasiIdx = (lagnaIndex + house.h - 1) % 12;
                      const isSelected = selectedRasi === rasiIdx;
                      const isAspected = aspectedIndices.includes(rasiIdx);
                      const isExcluded = adjacentExcludedIndex === rasiIdx;

                      let houseFill = "fill-transparent hover:fill-slate-50/40 cursor-pointer transition-colors";
                      let boundaryStroke = "stroke-transparent";
                      if (isSelected) {
                        houseFill = "fill-amber-100/60 hover:fill-amber-100/80 cursor-pointer";
                        boundaryStroke = "stroke-amber-600";
                      } else if (isAspected) {
                        houseFill = "fill-emerald-50/50 hover:fill-emerald-50/70 cursor-pointer";
                        boundaryStroke = "stroke-emerald-300";
                      } else if (isExcluded) {
                        houseFill = "fill-rose-50/40 hover:fill-rose-50/60 cursor-pointer";
                        boundaryStroke = "stroke-rose-200";
                      }

                      return (
                        <polygon 
                          key={`north-poly-${house.h}`}
                          points={house.points} 
                          className={`${houseFill} ${boundaryStroke}`}
                          style={{ strokeWidth: isSelected || isAspected || isExcluded ? 1.5 : 0 }}
                          onClick={() => setSelectedRasi(rasiIdx)}
                        />
                      );
                    })}
                  </svg>
                  
                  {/* Overlay text content rendered as sibling HTML elements */}
                  {northHouses.map(house => {
                    const rasiIdx = (lagnaIndex + house.h - 1) % 12;
                    const isLagna = rasiIdx === lagnaIndex;
                    const occupants = natalPlanets.filter(p => p.rasiIndex === rasiIdx);

                    return (
                      <div 
                        key={`north-overlay-${house.h}`}
                        className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] pointer-events-none"
                        style={{ left: `${house.x}%`, top: `${house.y}%` }}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${isLagna ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>
                            {rasiIdx + 1}
                          </span>
                          {isLagna && <span className="text-[7px] text-red-600 font-black uppercase">Asc</span>}
                        </div>
                        
                        <div className="flex flex-wrap content-center justify-center gap-1 mt-1">
                          {occupants.map(p => {
                            const karaka = planetKarakaMap[p.planet];
                            return (
                              <span 
                                key={p.planet} 
                                className={`text-[9px] font-black leading-none ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`}
                              >
                                {AstroEngine.PLANET_SHORTS[p.planet]}
                                {karaka && <sub className="text-[6px] font-normal opacity-75">{karaka}</sub>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Aspect explanations */}
            <div className="w-full mt-5 bg-white border border-amber-200/50 rounded-2xl p-4 shadow-sm text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-1.5 font-serif">
                <span>☸️</span> {selectedRasiMeta.name} ({selectedRasiMeta.sanskrit}) — {selectedRasiMeta.type} Aspect Details
              </h4>
              <p className="text-slate-600 leading-relaxed mb-3">
                {getRuleExplanation(selectedRasiMeta)} Aspected signs receive aspects from any occupant in {selectedRasiMeta.name}.
              </p>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="font-bold text-slate-700 text-[10px] uppercase">Aspected Signs:</span>
                  {aspectedIndices.map(idx => {
                    const r = RASHIS_META[idx];
                    return (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px] cursor-pointer hover:bg-emerald-200"
                        onClick={() => setSelectedRasi(idx)}
                      >
                        {r.name} ({r.type})
                      </span>
                    );
                  })}
                </div>
                {adjacentExcludedIndex !== null && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="font-bold text-slate-700 text-[10px] uppercase">Adjacent Excluded:</span>
                    <span 
                      className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[9px] cursor-pointer hover:bg-rose-200"
                      onClick={() => setSelectedRasi(adjacentExcludedIndex)}
                    >
                      {RASHIS_META[adjacentExcludedIndex].name} ({RASHIS_META[adjacentExcludedIndex].type})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: CHARA KARAKAS TABLE */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔮</span>
              <h3 className="text-md font-black text-slate-800 tracking-tight uppercase font-serif">
                7-Chara Karakas (Highest to Lowest Sign Degrees)
              </h3>
            </div>

            {!charaKarakas || !charaKarakas.sortedList || charaKarakas.sortedList.length === 0 ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 text-xs font-semibold">
                Could not calculate Chara Karakas. Verify planetary longitudes.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider font-mono text-[9px]">
                        <th className="p-2.5">Rank</th>
                        <th className="p-2.5">Planet</th>
                        <th className="p-2.5">Sign Degree</th>
                        <th className="p-2.5">Karaka</th>
                        <th className="p-2.5">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {charaKarakas.sortedList.map((item, idx) => {
                        const currentRasiIdx = natalPlanets.find(p => p.planet === item.planet)?.rasiIndex ?? 0;
                        return (
                          <tr key={item.planet} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">
                              <span className={AstroEngine.PLANET_TEXT_COLORS[item.planet]}>
                                {item.planet}
                              </span>
                              <span className="text-[9px] text-slate-400 ml-1 font-normal">
                                in {RASHIS_META[currentRasiIdx].name.substring(0,3)}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 font-mono">{formatDms(item.degree)}</td>
                            <td className="p-2.5">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-black tracking-wide text-[9px]">
                                {item.label}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 italic text-[11px]">{item.fullName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-4">
                  <div className="bg-slate-800 p-3">
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                      <span>📜</span> Jaimini Sutras: Soul & Destiny Interpretation
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto">
                    {jaiminiInsights.map((insight, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border ${insight.bg} border-opacity-50 ${insight.color}`}>
                         <h4 className="font-black text-sm mb-2">{insight.question}</h4>
                         <p className="text-xs font-medium opacity-90 leading-relaxed">{insight.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Jaimini Quick Reference Cards */}
            <div className="mt-6 border-t border-amber-200/40 pt-4 space-y-3">
              <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-amber-900 font-serif">
                📖 Jaimini Rashi Aspects Quick Reference
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="bg-white/80 border border-slate-200 p-2.5 rounded-lg text-[11px]">
                  <strong className="text-amber-800">Chara (Cardinal) Aspects Fixed</strong>
                  <p className="text-slate-500 mt-0.5 leading-snug">
                    Aries, Cancer, Libra, and Capricorn aspect all Fixed signs except the one adjacent to them.
                  </p>
                </div>
                <div className="bg-white/80 border border-slate-200 p-2.5 rounded-lg text-[11px]">
                  <strong className="text-amber-800">Sthira (Fixed) Aspects Cardinal</strong>
                  <p className="text-slate-500 mt-0.5 leading-snug">
                    Taurus, Leo, Scorpio, and Aquarius aspect all Cardinal signs except the one adjacent to them.
                  </p>
                </div>
                <div className="bg-white/80 border border-slate-200 p-2.5 rounded-lg text-[11px]">
                  <strong className="text-amber-800">Dvisvabhava (Mutable) Aspects Mutable</strong>
                  <p className="text-slate-500 mt-0.5 leading-snug">
                    Gemini, Virgo, Sagittarius, and Pisces aspect all other Mutable signs (except itself).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
