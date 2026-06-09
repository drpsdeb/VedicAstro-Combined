// ============================================================================
// 🔮 LAL KITAB VIEW - KALPURUSH KUNDALI & UPAYAS
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, BookOpen, Flame, ShieldAlert, Shield, ShieldCheck, Heart, Activity, AlertCircle, AlertTriangle, UserMinus, RefreshCw, Sun, Moon, EyeOff, X, ArrowLeft } from 'lucide-react';
import { AstroEngine, getPositionsForProfile } from '../utils/ephemerisEngine';
import { generateKalpurushChart, generateLalKitabInsights } from '../utils/lalKitabEngine';
import SearchableDropdown from './SearchableDropdown';
import PreciseCalculationToggle from './PreciseCalculationToggle';

const RASHIS_META = [
  { index: 0, name: 'Aries', sanskrit: 'Mesha', element: 'Fire' },
  { index: 1, name: 'Taurus', sanskrit: 'Vrishabha', element: 'Earth' },
  { index: 2, name: 'Gemini', sanskrit: 'Mithuna', element: 'Air' },
  { index: 3, name: 'Cancer', sanskrit: 'Karka', element: 'Water' },
  { index: 4, name: 'Leo', sanskrit: 'Simha', element: 'Fire' },
  { index: 5, name: 'Virgo', sanskrit: 'Kanya', element: 'Earth' },
  { index: 6, name: 'Libra', sanskrit: 'Tula', element: 'Air' },
  { index: 7, name: 'Scorpio', sanskrit: 'Vrishchika', element: 'Water' },
  { index: 8, name: 'Sagittarius', sanskrit: 'Dhanu', element: 'Fire' },
  { index: 9, name: 'Capricorn', sanskrit: 'Makara', element: 'Earth' },
  { index: 10, name: 'Aquarius', sanskrit: 'Kumbha', element: 'Air' },
  { index: 11, name: 'Pisces', sanskrit: 'Meena', element: 'Water' }
];

const numOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const safeStr = (str, delimiter) => {
  if (typeof str !== 'string' || !str) return '';
  return str.split(delimiter)[0] || '';
};

// North Indian Chart House coords (relative layout)
const northHouses = [
  { h: 1, x: 50, y: 25, points: "50,0 100,50 50,50 0,50" },
  { h: 2, x: 25, y: 12.5, points: "50,0 25,25 0,0" },
  { h: 3, x: 12.5, y: 25, points: "0,0 25,25 0,50" },
  { h: 4, x: 25, y: 50, points: "25,25 50,50 25,75 0,50" },
  { h: 5, x: 12.5, y: 75, points: "0,50 25,75 0,100" },
  { h: 6, x: 25, y: 87.5, points: "25,75 50,100 0,100" },
  { h: 7, x: 50, y: 75, points: "50,50 100,50 50,100 0,50" },
  { h: 8, x: 75, y: 87.5, points: "50,100 75,75 100,100" },
  { h: 9, x: 87.5, y: 75, points: "100,50 75,75 100,100" },
  { h: 10, x: 75, y: 50, points: "75,25 100,50 75,75 50,50" },
  { h: 11, x: 87.5, y: 25, points: "100,0 75,25 100,50" },
  { h: 12, x: 75, y: 12.5, points: "50,0 75,25 100,0" }
];

export default function LalKitabView({ savedProfiles, onSelectProfile, currentProfileName, onBack }) {
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
  const [selectedHouse, setSelectedHouse] = useState(1);

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

  const profile = useMemo(() => {
    return savedProfiles.find(p => p.name === selectedProfile) || savedProfiles[0];
  }, [selectedProfile, savedProfiles]);

  const coreAstro = useMemo(() => {
    return getPositionsForProfile(profile);
  }, [profile, preciseToggle, calcTrigger]);

  const lagnaIndex = coreAstro ? coreAstro.lagnaIndex : 0;

  const d1Placements = useMemo(() => {
    if (!coreAstro) return {};
    const map = {};
    coreAstro.planets.forEach(p => {
      let houseNum = (p.rasiIndex - lagnaIndex + 12) % 12 + 1;
      map[p.planet] = houseNum;
    });
    return map;
  }, [coreAstro, lagnaIndex]);

  const lalKitabChart = useMemo(() => {
    if (!d1Placements) return null;
    return generateKalpurushChart(d1Placements);
  }, [d1Placements]);

  const insights = useMemo(() => {
    if (!lalKitabChart) return [];
    return generateLalKitabInsights(lalKitabChart);
  }, [lalKitabChart]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sortedProfiles;
    return sortedProfiles.filter(p => p.name.toLowerCase().includes(q));
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

  const selectedHouseMeta = RASHIS_META[selectedHouse - 1];

  const occupantsInHouse = useMemo(() => {
    if (!lalKitabChart) return [];
    return Object.entries(lalKitabChart)
      .filter(([_, house]) => house === selectedHouse)
      .map(([planet, _]) => planet);
  }, [lalKitabChart, selectedHouse]);

  return (
    <div className="min-h-screen bg-[#ececd6] text-slate-800 font-sans antialiased flex flex-col w-full">
      {/* Header bar */}
      <div className="h-12 bg-white/80 border-b border-slate-200 shadow-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded text-slate-650 transition-colors" title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="text-red-700 w-4 h-4" />
            <div className="font-serif text-sm font-bold text-amber-900 hidden sm:block">Lal Kitab Remedial Studio</div>
          </div>
        </div>
        <div>
          <PreciseCalculationToggle />
        </div>
        <div className="text-right text-[10px] sm:text-xs truncate max-w-[260px] text-emerald-950 font-bold font-serif">
          {profile ? `${profile.name} | ${profile.dob} | ${profile.time || '12:00'}` : 'No Active Profile'}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
        {/* Profile Sidebar */}
        <aside className="w-full lg:w-[250px] shrink-0 bg-white/85 border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col gap-2 max-h-[220px] lg:max-h-[calc(100vh-80px)]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="🔍 Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:border-emerald-500 outline-none text-slate-800"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-650"
              >
                <X size={12} />
              </button>
            )}
          </div>
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
            buttonClassName="w-full bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold font-serif"
            groupByCategory={true}
          />
          <div className="text-[10px] text-slate-500 px-1 border-b pb-1">Profile Library</div>
          
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {filteredProfiles.length > 0 ? (
              groupedCategories.map((catGroup) => {
                const isCatExpanded = expandedFolders[catGroup.categoryName] !== false;
                return (
                  <div key={catGroup.categoryName} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleFolder(catGroup.categoryName)}
                      className="w-full px-2 py-1 text-[10px] uppercase font-extrabold tracking-wider bg-emerald-50/50 hover:bg-emerald-100 rounded flex items-center justify-between text-left font-serif text-emerald-950 transition-colors"
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
                                          isActive ? 'bg-slate-600 text-white font-bold' : 'text-slate-650 hover:bg-emerald-50'
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

        {/* Chart Column */}
        <main className="flex-grow min-w-0 flex flex-col items-center justify-start overflow-y-auto">
          <div className="bg-red-800 text-white px-5 py-2 rounded-full text-xs font-bold shadow flex items-center gap-1.5 mb-6 uppercase tracking-wider font-serif border border-amber-500/20">
            <span>📕</span> Lal Kitab Kalpurush Kundali (Aries Lagna)
          </div>

          <div className="relative w-full max-w-[320px] xl:max-w-[400px] aspect-square flex items-center justify-center">
            {/* Lal Kitab always uses red boundaries for the North Indian chart */}
            <div className="w-full h-full border-4 border-red-800 bg-[#fffdf0] shadow-xl rounded-2xl relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                <g className="stroke-red-900/25 pointer-events-none" style={{ strokeWidth: 1 }}>
                  <line x1="0" y1="0" x2="100" y2="100" />
                  <line x1="100" y1="0" x2="0" y2="100" />
                  <line x1="50" y1="0" x2="100" y2="50" />
                  <line x1="100" y1="50" x2="50" y2="100" />
                  <line x1="50" y1="100" x2="0" y2="50" />
                  <line x1="0" y1="50" x2="50" y2="0" />
                </g>
                
                {northHouses.map(house => {
                  const isSelected = selectedHouse === house.h;
                  let houseFill = "fill-transparent hover:fill-red-100/30 cursor-pointer transition-colors";
                  let boundaryStroke = "stroke-transparent";
                  if (isSelected) {
                    houseFill = "fill-red-100/50 hover:fill-red-100/60 cursor-pointer";
                    boundaryStroke = "stroke-red-700";
                  }

                  return (
                    <polygon 
                      key={`north-poly-${house.h}`}
                      points={house.points} 
                      className={`${houseFill} ${boundaryStroke}`}
                      style={{ strokeWidth: isSelected ? 1.5 : 0 }}
                      onClick={() => setSelectedHouse(house.h)}
                    />
                  );
                })}
              </svg>
              
              {/* Overlays */}
              {northHouses.map(house => {
                const isSelected = selectedHouse === house.h;
                const signIndex = house.h - 1; // Aries = 0, Taurus = 1, etc.
                const signNum = signIndex + 1;
                
                let occupants = [];
                if (lalKitabChart) {
                  occupants = Object.entries(lalKitabChart)
                    .filter(([_, h]) => h === house.h)
                    .map(([planet, _]) => planet);
                }

                return (
                  <div 
                    key={`north-overlay-${house.h}`}
                    className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] pointer-events-none"
                    style={{ left: `${house.x}%`, top: `${house.y}%` }}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-black ${house.h === 1 ? 'text-red-700 font-extrabold' : 'text-slate-400'}`}>
                        {signNum}
                      </span>
                      {house.h === 1 && <span className="text-[7px] text-red-700 font-black uppercase">Lagna</span>}
                    </div>
                    
                    <div className="flex flex-wrap content-center justify-center gap-1 mt-1">
                      {occupants.map(p => (
                        <span 
                          key={p} 
                          className={`text-[9px] font-black leading-none px-1 rounded bg-white/70 border border-slate-200/50 ${AstroEngine.PLANET_TEXT_COLORS[p]}`}
                        >
                          {AstroEngine.PLANET_SHORTS[p]}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected house details */}
          <div className="w-full max-w-[320px] xl:max-w-[400px] mt-4 bg-white border border-red-200/80 rounded-2xl p-4 shadow-sm text-xs text-left">
            <h4 className="font-extrabold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-serif">
              <span>🏠</span> House {selectedHouse} — {selectedHouseMeta.name} ({selectedHouseMeta.sanskrit})
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2 rounded-lg text-[10px] font-semibold">
              <div>Element: <span className="text-slate-800 font-bold">{selectedHouseMeta.element}</span></div>
              <div>Sign Index: <span className="text-slate-800 font-bold">{selectedHouseMeta.index}</span></div>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Occupying Planets:</span>
              <div className="flex flex-wrap gap-1.5">
                {occupantsInHouse.length > 0 ? (
                  occupantsInHouse.map(p => (
                    <span key={p} className={`px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 ${AstroEngine.PLANET_TEXT_COLORS[p]}`}>
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No occupying planets (Empty House)</span>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Insights Column */}
        <aside className="w-full lg:w-[380px] shrink-0 bg-[#fdfde8] border border-amber-250 p-4 rounded-2xl shadow-lg flex flex-col overflow-y-auto max-h-[480px] lg:max-h-[calc(100vh-80px)]">
          <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-red-800 font-serif">Lal Kitab Remedies (Upayas)</div>
              <div className="text-[9px] text-slate-500 font-sans">Immediate practical actions and lifestyle precautions.</div>
            </div>
            <span className="text-[8px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Lal Kitab</span>
          </div>

          <div className="space-y-4 flex-1">
            {insights.length > 0 ? (
              insights.map((insight, idx) => {
                const renderInsightIcon = (iconName) => {
                  switch (iconName) {
                    case 'BookOpen':
                      return <BookOpen size={12} className="text-red-700" />;
                    case 'Shield':
                      return <Shield size={12} className="text-orange-700" />;
                    case 'Sun':
                      return <Sun size={12} className="text-amber-700" />;
                    case 'Moon':
                      return <Moon size={12} className="text-indigo-700" />;
                    case 'AlertTriangle':
                      return <AlertTriangle size={12} className="text-amber-700" />;
                    case 'EyeOff':
                      return <EyeOff size={12} className="text-slate-700" />;
                    case 'ShieldCheck':
                      return <ShieldCheck size={12} className="text-teal-700" />;
                    case 'UserMinus':
                      return <UserMinus size={12} className="text-blue-700" />;
                    default:
                      return <Sparkles size={12} className="text-purple-700" />;
                  }
                };

                const renderAnswerText = (text) => {
                  if (!text) return '';
                  return text.split('\n\n').map((paragraph, pIdx) => {
                    const parts = paragraph.split('**');
                    return (
                      <p key={pIdx} className="mb-2 last:mb-0 leading-relaxed">
                        {parts.map((part, i) => {
                          if (i % 2 === 1) {
                            return <strong key={i} className="font-extrabold text-red-950">{part}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  });
                };

                const borderClassMap = {
                  'bg-red-50': 'border-red-200/50',
                  'bg-orange-50': 'border-orange-200/50',
                  'bg-amber-50': 'border-amber-200/50',
                  'bg-indigo-50': 'border-indigo-200/50',
                  'bg-blue-50': 'border-blue-200/50',
                  'bg-purple-50': 'border-purple-200/50',
                  'bg-slate-50': 'border-slate-200/50',
                  'bg-teal-50': 'border-teal-200/50'
                };
                const borderClass = borderClassMap[insight.bg] || 'border-slate-200';

                return (
                  <div key={idx} className={`p-4 rounded-xl border ${insight.bg} ${borderClass} shadow-sm flex flex-col gap-2`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
                        {renderInsightIcon(insight.icon)}
                        {insight.icon} Placement
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-800 leading-tight">{insight.question}</div>
                    <div className="text-xs leading-relaxed text-slate-700 font-serif">
                      {renderAnswerText(insight.answer)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400 italic text-center py-6 text-xs font-serif">No remedies loaded. Please select or verify profile.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
