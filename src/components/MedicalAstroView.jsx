import React, { useState, useMemo } from 'react';
import { 
  Heart, Activity, Shield, Sparkles, ChevronLeft, ChevronRight, 
  Cpu, Loader2, AlertCircle, AlertTriangle, CheckCircle, Leaf, BookOpen, X 
} from 'lucide-react';
import { calculateMedicalAstro, BODY_PARTS_MAPPING, generateWellnessAIPrompt, calculateHealthTriggers } from '../utils/MedicalAstro';
import { getPositionsForProfile, AstroEngine } from '../utils/ephemerisEngine';
import SearchableDropdown from './SearchableDropdown';
import PreciseCalculationToggle from './PreciseCalculationToggle';

export default function MedicalAstroView({ 
  savedProfiles, 
  currentProfileName, 
  onSelectProfile, 
  profile, 
  geminiKey, 
  astroLevel, 
  language, 
  onBack 
}) {
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

  const activeProfile = useMemo(() => {
    return sortedProfiles.find(p => p.name === selectedProfile) || profile || sortedProfiles[0];
  }, [selectedProfile, sortedProfiles, profile]);

  React.useEffect(() => {
    if (profile?.name) {
      setSelectedProfile(profile.name);
    }
  }, [profile]);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBodyPart, setSelectedBodyPart] = useState(1);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [currentDashaLord, setCurrentDashaLord] = useState('Jupiter');

  const transitPlacements = useMemo(() => {
    return { Saturn: 10 }; // Mock transit: Saturn in Aquarius (10)
  }, []);

  // 1. Calculate positions for selected profile
  const coreAstro = useMemo(() => {
     if (!activeProfile) return null;
     return getPositionsForProfile(activeProfile);
  }, [activeProfile, preciseToggle, calcTrigger]);

  // 2. Perform Medical calculations
  const medicalData = useMemo(() => {
    if (!coreAstro || !activeProfile) return null;
    return calculateMedicalAstro(coreAstro.planets, coreAstro.lagnaIndex, coreAstro.lagnaDegree);
  }, [coreAstro, activeProfile]);

  if (!activeProfile || !medicalData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-900 bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <Loader2 className="animate-spin text-amber-500 mb-2" size={32} />
        <span className="font-serif font-bold text-sm">Analyzing biological chart signatures...</span>
      </div>
    );
  }

  // Stepper titles
  const steps = [
    { id: 1, name: "Constitution (Deha Bala)", desc: "Physical strength & immunity" },
    { id: 2, name: "Tri-Doshas (Prakriti)", desc: "Biological energy balance" },
    { id: 3, name: "Body Map Vulnerabilities", desc: "Interactive organ analysis" },
    { id: 4, name: "Disease Risk (Bhava Roga)", desc: "Vedic illness alerts" },
    { id: 5, name: "Ayurvedic Remedies (Upayas)", desc: "Wellness guidelines" }
  ];

  // Helper for step colors
  const getVulnerabilityColor = (score) => {
    if (score > 65) return { fill: 'rgba(239, 68, 68, 0.45)', stroke: '#ef4444', text: 'text-red-600' };
    if (score > 40) return { fill: 'rgba(245, 158, 11, 0.4)', stroke: '#f59e0b', text: 'text-amber-600' };
    return { fill: 'rgba(16, 185, 129, 0.3)', stroke: '#10b981', text: 'text-emerald-600' };
  };

  // Ask AI Wellness recommendation
  const handleAskAI = async (factor) => {
    setAiLoading(true);
    setAiError('');
    setAiText('');

    let customFactorText = "";
    if (factor.type === 'dosha') {
      customFactorText = `Ayur-Dosha Balance: Vata: ${medicalData.dosha.vata}%, Pitta: ${medicalData.dosha.pitta}%, Kapha: ${medicalData.dosha.kapha}%. Dominant: ${medicalData.remedy.type}.`;
    } else if (factor.type === 'organ') {
      customFactorText = `Afflicted Organ Region: ${factor.organ} (representing ${factor.part}). Vulnerability Rating: ${factor.score}%. Status: ${factor.status}.`;
    } else if (factor.type === 'alert') {
      customFactorText = `Specific Vedic Medical Alert: "${factor.title}". Status Level: ${factor.level}. Details: ${factor.desc}`;
    } else {
      customFactorText = `General Vitality (Deha Bala): Rating ${medicalData.vitalityScore}%. Type: ${medicalData.constitutionType}.`;
    }

    const prompt = `Client Name: ${activeProfile.name}. Ascendant: ${AstroEngine.SIDEREAL_RASIS[medicalData.lagnaIndex || 0]}.
Analyze the following Medical Astrology detail in their chart:
- ${customFactorText}

Act as an expert, warm, and highly practical Vedic Astrologer & Ayurvedic Advisor. Provide a 3-4 sentence personalized wellness guidance report. Focus purely on:
1. Standard Ayurvedic guidelines (diet, herbs, sleep) matching their constitution to stabilize this energy block.
2. Safe preventative Upayas (mindset shifts, breathing exercises, light remedies).
Strictly state that this is for wellness support and avoid prescribing medical treatments or predicting critical diagnoses.`;

    try {
      const response = await AstroEngine.callGemini(prompt, geminiKey, astroLevel, language);
      if (response.error) {
        setAiError(response.error);
      } else {
        setAiText(response.text || 'No response from AI.');
      }
    } catch (err) {
      setAiError(err.message || 'Failed to connect to AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateWellnessGuide = async () => {
    if (!geminiKey) {
      setAiError("Please configure your Gemini API Key in the settings first.");
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiText('');

    const healthState = {
      dehaBala: medicalData.vitalityScore,
      doshas: {
        vata: medicalData.dosha.vata,
        pitta: medicalData.dosha.pitta,
        kapha: medicalData.dosha.kapha
      },
      activeVulnerabilities: Object.entries(medicalData.vulnerabilities)
        .filter(([_, v]) => v.score > 65)
        .map(([_, v]) => v.organ),
      lagnaSign: AstroEngine.SIDEREAL_RASIS[coreAstro.lagnaIndex || 0] || 'Aries'
    };

    const prompt = generateWellnessAIPrompt(healthState);

    try {
      const response = await AstroEngine.callGemini(prompt, geminiKey, astroLevel, language);
      if (response.error) {
        setAiError(response.error);
      } else {
        setAiText(response.text || 'No response from AI.');
      }
    } catch (err) {
      setAiError(err.message || 'Failed to connect to AI.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-5 bg-[#f7f3e9] text-slate-900 rounded-3xl border border-slate-200 shadow-lg animate-in fade-in duration-300">
      
      {/* Disclaimer Notice */}
      <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl mb-5 flex items-start gap-2.5 text-[10.5px] leading-relaxed text-amber-800">
        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-900">Vedic Wellness Disclaimer:</strong> Medical Astrology (Roga Shastra) calculates energetic tendencies and constitutional vulnerabilities based on birth data. It is for spiritual and preventative lifestyle support and is not a medical diagnosis. Always consult a certified medical professional for physical illnesses.
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Profile Sidebar */}
        <aside className="w-full lg:w-[250px] shrink-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="border-b border-amber-900/20 pb-2 mb-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 font-serif">
              Patient Profiles
            </h4>
            <p className="text-[9px] text-amber-800/85">Select active chart for diagnostics</p>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="🔍 Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-slate-800 placeholder-slate-400"
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-amber-700 hover:text-amber-500 focus:outline-none"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-amber-500 shrink-0" />
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
              buttonClassName="w-full bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-xs font-bold font-serif py-1.5 px-2.5 rounded-lg text-left"
              groupByCategory={true}
            />
          </div>

          {/* Directory List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 border-t border-amber-950/20 pt-2.5 max-h-[300px] lg:max-h-[500px] scrollbar-thin scrollbar-thumb-amber-900/30">
            {filteredProfiles.length > 0 ? (
              groupedCategories.map((catGroup) => {
                const isCatExpanded = expandedFolders[catGroup.categoryName] !== false;
                return (
                  <div key={catGroup.categoryName} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleFolder(catGroup.categoryName)}
                      className="w-full px-2 py-1 text-[9px] uppercase font-extrabold tracking-wider bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-between text-left font-serif text-slate-800 border border-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <span>{isCatExpanded ? '📂' : '📁'}</span>
                        {catGroup.categoryName}
                      </span>
                      <span className="text-[7px] text-amber-600 opacity-80">{isCatExpanded ? '▼' : '▶'}</span>
                    </button>
                    
                    {isCatExpanded && (
                      <div className="pl-1.5 space-y-1.5 border-l border-amber-900/20 ml-1">
                        {catGroup.groups.map((fam) => {
                          const famKey = `family_${fam.head.id}`;
                          const isFamExpanded = expandedFolders[famKey] !== false;
                          return (
                            <div key={fam.head.id} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => toggleFolder(famKey)}
                                className="w-full px-1.5 py-0.5 text-[8.5px] font-bold text-slate-800 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded flex items-center justify-between text-left transition-colors border border-slate-200"
                              >
                                <span className="flex items-center gap-1">
                                  <span>👨‍👩‍👧‍👦</span>
                                  {fam.head.name}'s Group
                                </span>
                                <span className="text-[6.5px] text-amber-600 opacity-80">{isFamExpanded ? '▼' : '▶'}</span>
                              </button>
                              
                              {isFamExpanded && (
                                <div className="pl-2 border-l border-amber-900/20 ml-1 space-y-0.5">
                                  {fam.showHead && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedProfile(fam.head.name);
                                        if (onSelectProfile) onSelectProfile(fam.head);
                                      }}
                                      className={`w-full text-left px-2 py-1 text-xs font-serif truncate rounded-md block transition ${
                                        fam.head.name === selectedProfile 
                                          ? 'bg-amber-600 text-white font-bold shadow-sm' 
                                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
                                        className={`w-full text-left px-2 py-1 text-xs font-serif truncate rounded-md block transition ${
                                          isActive 
                                            ? 'bg-amber-600 text-white font-bold shadow-sm' 
                                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
                              className={`w-full text-left px-2 py-1 text-xs font-serif truncate rounded-md block transition ${
                                isActive 
                                  ? 'bg-amber-600 text-white font-bold shadow-sm' 
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
              <div className="text-center text-[10px] text-slate-500 py-3 font-serif">No profiles found</div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* Stepper Navigation header */}
          <div className="flex flex-col xl:flex-row items-center justify-between border-b border-amber-900/20 pb-4 mb-6 gap-4">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors mr-1" title="Back to Dashboard">
                <ChevronLeft size={18} />
              </button>
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                <Heart size={20} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-serif text-amber-900 leading-none mb-1">
                  Roga Shastra (Medical Astrology Studio)
                </h2>
                <p className="text-[10px] text-amber-800 font-sans font-medium">
                  Diagnostic steps for {activeProfile.name} • Birth: {activeProfile.dob} ({activeProfile.time || '12:00'})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <PreciseCalculationToggle />
              
              {/* Stepper Dots */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border border-slate-200 text-xs">
                {steps.map(step => (
                  <button
                    key={step.id}
                    onClick={() => {
                      setCurrentStep(step.id);
                      setAiText('');
                      setAiError('');
                    }}
                    className={`w-7 h-7 rounded-full font-bold flex items-center justify-center transition-all ${
                      currentStep === step.id 
                        ? 'bg-amber-500 text-white shadow' 
                        : 'text-slate-500 hover:bg-amber-100 hover:text-amber-700'
                    }`}
                  >
                    {step.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

      {/* Main stepper content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[460px] items-start">
        
        {/* Left main area (Diagnostic steps) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-h-[460px] flex flex-col justify-between">
              <span className="text-[10px] font-bold font-sans uppercase tracking-wider text-amber-700">
                Step {currentStep} of 5: {steps[currentStep-1].name}
              </span>
              <h3 className="text-md font-extrabold text-amber-900 font-serif leading-none mt-1">
                {steps[currentStep-1].desc}
              </h3>

            {/* STEP 1: DEHA BALA (VITALITY) */}
            {currentStep === 1 && (
              <div className="space-y-6 mt-4">
                <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  
                  {/* Circular Gauge */}
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        stroke="#f59e0b" 
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - medicalData.vitalityScore / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black font-mono text-amber-600">
                        {medicalData.vitalityScore}%
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-amber-800 font-extrabold">Deha Bala</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-amber-900 font-bold text-sm mb-1.5 flex items-center gap-1.5">
                      <Shield size={16} className="text-amber-500" />
                      Vitality Constitution Profile
                    </h4>
                    <p className="text-xs text-amber-800 font-medium italic mb-2">
                      "{medicalData.constitutionType}"
                    </p>
                    <p className="text-[11.5px] leading-relaxed text-slate-700">
                      Vedic constitution strength (Deha Bala) assesses the dignity of the Ascendant Lord (<span className="text-amber-700 font-bold">{medicalData.lagnaLordName}</span>) and its house placement. A strong Lord safeguards the physical body from transiting malefic attacks, while a weaker Lord signals a delicate energy shield that requires defensive dietary and daily wellness routines.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-0.5">Lagna Strength Details:</div>
                    <ul className="space-y-1 text-slate-600">
                      <li>• Ascendant Sign: <strong className="text-amber-800">{AstroEngine.SIDEREAL_RASIS[coreAstro.lagnaIndex]}</strong></li>
                      <li>• Ascendant Lord: <strong className="text-amber-800">{medicalData.lagnaLordName}</strong></li>
                      <li>• Lord Placement: House {((coreAstro.planets.find(p=>p.planet===medicalData.lagnaLordName)?.rasiIndex - coreAstro.lagnaIndex + 12) % 12) + 1}</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-0.5">Physical Shield Analysis:</div>
                    <ul className="space-y-1 text-slate-600">
                      <li>• Benefics in 1st House: {medicalData.vulnerabilities[1].beneficCount}</li>
                      <li>• Malefics in 1st House: {medicalData.vulnerabilities[1].maleficCount}</li>
                      <li>• Lord Combustion Status: {coreAstro.planets.find(p=>p.planet===medicalData.lagnaLordName)?.isCombust ? 'Combust (Weak)' : 'Normal (Shielded)'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DOSHA PRACTICE */}
            {currentStep === 2 && (
              <div className="space-y-6 mt-4">
                
                {/* Horizontal Progress Bars */}
                <div className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-amber-900 font-serif border-b border-amber-900/10 pb-1 mb-3">
                    Tri-Dosha Element Percentage (त्रि-दोष संतुलन)
                  </h4>
                  
                  {/* Vata Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-sky-700">Vata (वात) - Air/Wind</span>
                      <span className="text-sky-700 font-mono">{medicalData.dosha.vata}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${medicalData.dosha.vata}%` }}></div>
                    </div>
                  </div>
                  
                  {/* Pitta Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-red-700">Pitta (पित्त) - Fire/Bile</span>
                      <span className="text-red-700 font-mono">{medicalData.dosha.pitta}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${medicalData.dosha.pitta}%` }}></div>
                    </div>
                  </div>
                  
                  {/* Kapha Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-700">Kapha (कफ) - Water/Mucus</span>
                      <span className="text-emerald-700 font-mono">{medicalData.dosha.kapha}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${medicalData.dosha.kapha}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
                  <h4 className="font-extrabold text-amber-900 mb-1.5 flex items-center gap-1">
                    <Leaf size={14} className="text-emerald-600" />
                    Dominant Biological Energy: {medicalData.remedy.type}
                  </h4>
                  <p className="leading-relaxed text-slate-700">
                    Your chart has a dominant <strong className="text-amber-800 capitalize">{medicalData.dosha.dominant}</strong> element signature. In Ayurveda, this dictates your biological temperament (Prakriti). An excess or aggravation of this Dosha leads to specific physical imbalances. Staying close to your pacifying diet and routine helps maintain cellular equilibrium and supports natural self-healing.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: INTERACTIVE BODY MAP */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                
                {/* SVG Body Map */}
                <div className="md:col-span-5 flex items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  <svg width="220" height="380" viewBox="0 0 200 380" className="select-none">
                    
                    {/* Head (House 1) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(1)}>
                      <circle 
                        cx="100" cy="30" r="18" 
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[1].score).fill} 
                        stroke={selectedBodyPart === 1 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[1].score).stroke} 
                        strokeWidth={selectedBodyPart === 1 ? 2.5 : 1}
                      />
                      <text x="100" y="33" textAnchor="middle" fill="#451a03" className="text-[9px] font-black group-hover:scale-110 select-none">H1</text>
                    </g>
                    
                    {/* Throat/Neck (House 2) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(2)}>
                      <rect 
                        x="92" y="48" width="16" h="10" rx="2"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[2].score).fill} 
                        stroke={selectedBodyPart === 2 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[2].score).stroke} 
                        strokeWidth={selectedBodyPart === 2 ? 2.5 : 1}
                      />
                      <text x="100" y="56" textAnchor="middle" fill="#451a03" className="text-[7px] font-black select-none">H2</text>
                    </g>
                    
                    {/* Shoulders & Chest (House 3) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(3)}>
                      <path 
                        d="M 68 62 L 132 62 L 138 78 L 122 84 L 78 84 L 62 78 Z"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[3].score).fill} 
                        stroke={selectedBodyPart === 3 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[3].score).stroke} 
                        strokeWidth={selectedBodyPart === 3 ? 2.5 : 1}
                      />
                      <text x="100" y="75" textAnchor="middle" fill="#451a03" className="text-[8px] font-black select-none">H3</text>
                    </g>
                    
                    {/* Heart/Ribs (House 4) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(4)}>
                      <rect 
                        x="76" y="86" width="48" h="22" rx="3"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[4].score).fill} 
                        stroke={selectedBodyPart === 4 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[4].score).stroke} 
                        strokeWidth={selectedBodyPart === 4 ? 2.5 : 1}
                      />
                      <text x="100" y="100" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H4</text>
                    </g>
                    
                    {/* Stomach/Liver (House 5) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(5)}>
                      <rect 
                        x="76" y="110" width="48" h="22" rx="3"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[5].score).fill} 
                        stroke={selectedBodyPart === 5 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[5].score).stroke} 
                        strokeWidth={selectedBodyPart === 5 ? 2.5 : 1}
                      />
                      <text x="100" y="124" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H5</text>
                    </g>
                    
                    {/* Lower Abdomen/Intestines (House 6) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(6)}>
                      <rect 
                        x="76" y="134" width="48" h="22" rx="3"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[6].score).fill} 
                        stroke={selectedBodyPart === 6 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[6].score).stroke} 
                        strokeWidth={selectedBodyPart === 6 ? 2.5 : 1}
                      />
                      <text x="100" y="148" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H6</text>
                    </g>
                    
                    {/* Lower Back/Pelvic (House 7) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(7)}>
                      <path 
                        d="M 72 158 L 128 158 L 126 178 L 74 178 Z"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[7].score).fill} 
                        stroke={selectedBodyPart === 7 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[7].score).stroke} 
                        strokeWidth={selectedBodyPart === 7 ? 2.5 : 1}
                      />
                      <text x="100" y="171" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H7</text>
                    </g>
                    
                    {/* Genitals/Groin (House 8) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(8)}>
                      <rect 
                        x="88" y="180" width="24" h="15" rx="2"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[8].score).fill} 
                        stroke={selectedBodyPart === 8 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[8].score).stroke} 
                        strokeWidth={selectedBodyPart === 8 ? 2.5 : 1}
                      />
                      <text x="100" y="190" textAnchor="middle" fill="#451a03" className="text-[8px] font-black select-none">H8</text>
                    </g>
                    
                    {/* Thighs/Hips (House 9) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(9)}>
                      <rect 
                        x="72" y="198" width="22" h="50" rx="3"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[9].score).fill} 
                        stroke={selectedBodyPart === 9 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[9].score).stroke} 
                        strokeWidth={selectedBodyPart === 9 ? 2.5 : 1}
                      />
                      <rect 
                        x="106" y="198" width="22" h="50" rx="3"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[9].score).fill} 
                        stroke={selectedBodyPart === 9 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[9].score).stroke} 
                        strokeWidth={selectedBodyPart === 9 ? 2.5 : 1}
                      />
                      <text x="100" y="226" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H9</text>
                    </g>
                    
                    {/* Knees (House 10) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(10)}>
                      <circle 
                        cx="83" cy="256" r="8" 
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[10].score).fill} 
                        stroke={selectedBodyPart === 10 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[10].score).stroke} 
                        strokeWidth={selectedBodyPart === 10 ? 2.5 : 1}
                      />
                      <circle 
                        cx="117" cy="256" r="8" 
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[10].score).fill} 
                        stroke={selectedBodyPart === 10 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[10].score).stroke} 
                        strokeWidth={selectedBodyPart === 10 ? 2.5 : 1}
                      />
                      <text x="100" y="260" textAnchor="middle" fill="#451a03" className="text-[8px] font-black select-none">H10</text>
                    </g>
                    
                    {/* Calves (House 11) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(11)}>
                      <rect 
                        x="75" y="268" width="16" h="55" rx="2"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[11].score).fill} 
                        stroke={selectedBodyPart === 11 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[11].score).stroke} 
                        strokeWidth={selectedBodyPart === 11 ? 2.5 : 1}
                      />
                      <rect 
                        x="109" y="268" width="16" h="55" rx="2"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[11].score).fill} 
                        stroke={selectedBodyPart === 11 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[11].score).stroke} 
                        strokeWidth={selectedBodyPart === 11 ? 2.5 : 1}
                      />
                      <text x="100" y="298" textAnchor="middle" fill="#451a03" className="text-[9px] font-black select-none">H11</text>
                    </g>
                    
                    {/* Feet (House 12) */}
                    <g className="cursor-pointer group" onClick={() => setSelectedBodyPart(12)}>
                      <path 
                        d="M 64 330 L 92 330 L 88 340 L 60 340 Z"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[12].score).fill} 
                        stroke={selectedBodyPart === 12 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[12].score).stroke} 
                        strokeWidth={selectedBodyPart === 12 ? 2.5 : 1}
                      />
                      <path 
                        d="M 108 330 L 136 330 L 140 340 L 112 340 Z"
                        fill={getVulnerabilityColor(medicalData.vulnerabilities[12].score).fill} 
                        stroke={selectedBodyPart === 12 ? '#fbbf24' : getVulnerabilityColor(medicalData.vulnerabilities[12].score).stroke} 
                        strokeWidth={selectedBodyPart === 12 ? 2.5 : 1}
                      />
                      <text x="100" y="337" textAnchor="middle" fill="#451a03" className="text-[8px] font-black select-none">H12</text>
                    </g>
                    
                  </svg>
                </div>
                
                {/* Organ Details sidebar */}
                <div className="md:col-span-7 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between border-b border-amber-900/10 pb-2 mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 font-serif">
                          House {selectedBodyPart} Body System:
                        </h4>
                        <span className="text-[13px] font-black text-slate-900">
                          {medicalData.vulnerabilities[selectedBodyPart].organ}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                        medicalData.vulnerabilities[selectedBodyPart].score > 65 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : medicalData.vulnerabilities[selectedBodyPart].score > 40 
                          ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                        Vulnerability: {medicalData.vulnerabilities[selectedBodyPart].score}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mb-2 leading-relaxed">
                      <strong className="text-slate-900">Anatomical parts:</strong> {medicalData.vulnerabilities[selectedBodyPart].part}
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-700 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {medicalData.vulnerabilities[selectedBodyPart].desc}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 font-medium mb-3">
                      <div>• Malefics in House: {medicalData.vulnerabilities[selectedBodyPart].hasMalefics ? 'Yes' : 'No'}</div>
                      <div>• Benefics in House: {medicalData.vulnerabilities[selectedBodyPart].beneficCount}</div>
                    </div>

                    <button
                      onClick={() => handleAskAI({ type: 'organ', ...medicalData.vulnerabilities[selectedBodyPart] })}
                      className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                    >
                      <Sparkles size={11} />
                      AI Analysis for {medicalData.vulnerabilities[selectedBodyPart].organ}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* STEP 4: DISEASE RISK DASHBOARD */}
            {currentStep === 4 && (
              <div className="space-y-3.5 mt-4">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-widest border-b border-amber-900/10 pb-1 mb-2">
                  Classic Vedic Health Stress Points (रोग लक्षण)
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-900/20">
                  {medicalData.alerts.map((alert, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleAskAI({ type: 'alert', ...alert })}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            alert.level === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : alert.level === 'Moderate' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {alert.level} Risk
                          </span>
                          <strong className="text-slate-900 text-xs font-serif">{alert.title}</strong>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic pr-2">
                          "{alert.desc}"
                        </p>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAI({ type: 'alert', ...alert });
                        }}
                        className="text-[9.5px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded shrink-0 flex items-center gap-1 font-bold uppercase transition"
                      >
                        <Cpu size={10} /> AI
                      </button>
                    </div>
                  ))}
                </div>

                {/* CURRENT TIMELINE ALERTS */}
                <div className="flex items-center justify-between gap-4 border-b border-amber-900/10 pb-1.5 mb-2 mt-4">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">
                    Current Timeline Alerts (गोचर एवं दशा)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-800">
                    <span className="text-[10px] text-amber-700 font-sans font-bold">Dasha Lord:</span>
                    <select 
                      value={currentDashaLord}
                      onChange={(e) => setCurrentDashaLord(e.target.value)}
                      className="bg-white text-slate-900 border border-slate-300 rounded px-1.5 py-0.5 outline-none font-bold text-[10px] shadow-sm"
                    >
                      {['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map(lord => (
                        <option key={lord} value={lord}>{lord}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {calculateHealthTriggers(coreAstro.lagnaIndex, currentDashaLord, transitPlacements).map((trigger, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 border rounded-xl flex flex-col gap-1 transition-all ${trigger.color.replace('bg-red-950/30', 'bg-red-50').replace('text-red-300', 'text-red-700').replace('border-red-900/30', 'border-red-200').replace('bg-amber-950/20', 'bg-amber-50').replace('text-amber-200', 'text-amber-800').replace('border-amber-900/20', 'border-amber-200')}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider">{trigger.type}</span>
                        <span className="text-[9px] font-bold uppercase">{trigger.severity} Severity</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-medium">{trigger.message}</p>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* STEP 5: AYURVEDIC REMEDIES */}
            {currentStep === 5 && (
              <div className="space-y-4 mt-4">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-3 shadow-sm">
                  <div className="font-bold text-emerald-900 font-serif text-sm border-b border-emerald-200 pb-1 flex items-center gap-1">
                    <span>🌿</span> {medicalData.remedy.type}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="leading-relaxed text-slate-700">
                      <strong className="text-emerald-800">Diet Guidelines:</strong> {medicalData.remedy.diet}
                    </p>
                    <p className="leading-relaxed text-slate-700">
                      <strong className="text-emerald-800">Lifestyle routine:</strong> {medicalData.remedy.lifestyle}
                    </p>
                    <p className="leading-relaxed text-slate-700">
                      <strong className="text-emerald-800">Pacifying Herbs:</strong> {medicalData.remedy.herbs}
                    </p>
                    <p className="leading-relaxed text-slate-700">
                      <strong className="text-emerald-800">Remedial Yoga:</strong> {medicalData.remedy.yoga}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleAskAI({ type: 'remedy', ...medicalData.remedy })}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow mt-2 transition-colors"
                  >
                    <Sparkles size={11} />
                    Consult AI Guide for Ayurvedic Upayas
                  </button>
                </div>
              </div>
            )}

            {/* Bottom stepper controls */}
            <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                    setAiText('');
                    setAiError('');
                  }
                }}
                disabled={currentStep === 1}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:opacity-100 text-slate-800 rounded-xl flex items-center gap-1 font-bold text-xs transition shadow-sm"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              
              <span className="text-[10px] text-amber-700 font-mono font-bold">
                Step {currentStep} of 5
              </span>
              
              <button
                onClick={() => {
                  if (currentStep < 5) {
                    setCurrentStep(currentStep + 1);
                    setAiText('');
                    setAiError('');
                  }
                }}
                disabled={currentStep === 5}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:opacity-100 text-white rounded-xl flex items-center gap-1 font-bold text-xs transition shadow-sm"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

          </div>

        </div>

        {/* Right side: AI guidance console */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-h-[460px] flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between gap-1.5 border-b border-amber-900/10 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Cpu className="text-amber-600 shrink-0" size={18} />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Astro AI Wellness Guide
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium">Real-time Ayurvedic & preventative insight</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateWellnessGuide}
                disabled={aiLoading}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow transition"
              >
                <Sparkles size={10} />
                AI Analysis
              </button>
            </div>
            
            {aiLoading && (
              <div className="flex flex-col items-center justify-center gap-2 text-amber-600 py-20 animate-pulse">
                <Loader2 className="animate-spin text-amber-500" size={24} />
                <span className="text-[10.5px] font-bold font-serif uppercase tracking-widest">Consulting Dhanvantari...</span>
              </div>
            )}
            
            {aiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span>Error analyzing details: {aiError}</span>
              </div>
            )}
            
            {aiText && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner text-slate-800 font-serif leading-relaxed text-[11px] max-h-[340px] overflow-y-auto scrollbar-thin">
                  "{aiText}"
                </div>
                <div className="text-[8.5px] text-slate-500 leading-tight border-t border-slate-100 pt-2 italic">
                  Note: Astrological guidelines complement physical care. Consult a physician for all chronic diagnoses.
                </div>
              </div>
            )}
            
            {!aiLoading && !aiText && !aiError && (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-amber-700/60">
                <BookOpen size={30} className="mb-2 opacity-40 text-amber-600" />
                <p className="text-xs italic leading-normal font-medium text-slate-500">
                  Click the "AI Analysis" buttons inside any diagnostic step to generate tailored planetary wellness advice.
                </p>
              </div>
            )}
          </div>
          
          {/* Diagnostic score recap */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10.5px] space-y-1 mt-4 shadow-sm">
            <div className="flex justify-between border-b border-slate-200 pb-1 mb-1">
              <strong className="text-amber-900 font-serif">Diagnostic Summary:</strong>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Constitution Strength:</span>
              <span className="font-mono text-amber-700 font-bold">{medicalData.vitalityScore}%</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Dominant Dosha:</span>
              <span className="text-amber-700 capitalize font-bold">{medicalData.dosha.dominant}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Severe Vulnerabilities:</span>
              <span className="font-mono text-amber-700 font-bold">
                {Object.values(medicalData.vulnerabilities).filter(v => v.score > 65).length} organs
              </span>
            </div>
          </div>

        </div>
    </div>
    </div>
  </div>
  );
}