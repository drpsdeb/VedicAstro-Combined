// ============================================================================
// 💘 ASTROMATCH DASHBOARD VIEW COMPONENT
// ============================================================================

import React, { useState, useMemo } from 'react';
import { DWADASH_KOOT_RULES, generateMatchSynthesisPrompt, calculateSynastryOverlays } from '../utils/dwadashKootRules';
import { NAKSHATRAS, RASHI_LORDS, getPositionsForProfile, getD9RasiIndex, AstroEngine } from '../utils/ephemerisEngine';
import SearchableDropdown from './SearchableDropdown';
import { ShieldCheck, Flame, Clock, Hourglass, AlertCircle, Activity, Skull } from 'lucide-react';
import PreciseCalculationToggle from './PreciseCalculationToggle';

const ICON_MAP = {
  ShieldCheck,
  Flame,
  Clock,
  Hourglass,
  AlertCircle,
  Activity,
  Skull
};

const MATCH_TYPES = {
  marriage: {
    label: 'Marriage',
    icon: '💍',
    refLabel: "Boy / Husband's Profile",
    compLabel: "Girl / Wife's Profile",
    placeholderA: "-- Choose Boy --",
    placeholderB: "-- Choose Girl --",
    activeKootas: ['dina', 'gana', 'yoni', 'maitri', 'bhakoot', 'nadi', 'varna', 'vashya', 'mahendra', 'striDirgha', 'rajju', 'vedha'],
    maxPoints: 50,
    desc: 'Full traditional 12-Koot compatibility assessment, including physical, mental, genetic, and long-term matrimonial longevity indicators.'
  },
  family: {
    label: 'Family & Relatives',
    icon: '🏡',
    refLabel: 'Profile A (Reference)',
    compLabel: 'Profile B (Comparison)',
    placeholderA: "-- Choose Profile A --",
    placeholderB: "-- Choose Profile B --",
    activeKootas: ['maitri', 'gana', 'vashya', 'yoni', 'varna'],
    maxPoints: 15,
    desc: 'Evaluates mutual understanding, mental temperament, family hierarchy dynamics, and ego compatibility.'
  },
  friendship: {
    label: 'Friendship & Social',
    icon: '🤝',
    refLabel: 'Profile A (Reference)',
    compLabel: 'Profile B (Comparison)',
    placeholderA: "-- Choose Profile A --",
    placeholderB: "-- Choose Profile B --",
    activeKootas: ['maitri', 'gana', 'vashya', 'yoni'],
    maxPoints: 14,
    desc: 'Evaluates intellectual compatibility, temperament alignment, subconscious affinity, and dominance balances.'
  },
  professional: {
    label: 'Professional / Business',
    icon: '💼',
    refLabel: 'Profile A (Reference)',
    compLabel: 'Profile B (Comparison)',
    placeholderA: "-- Choose Profile A --",
    placeholderB: "-- Choose Profile B --",
    activeKootas: ['maitri', 'vashya', 'varna', 'gana'],
    maxPoints: 11,
    desc: 'Evaluates alignment of work style, professional authority/hierarchy dynamics, and daily temperamental cooperation.'
  }
};

function checkMangalDosha(profileData) {
  if (!profileData) return { hasDosha: false };
  const astro = getPositionsForProfile(profileData);
  if (!astro || !astro.planets) return { hasDosha: false };

  const mars = astro.planets.find(p => p.name === 'Mars');
  const jupiter = astro.planets.find(p => p.name === 'Jupiter');
  const lagnaIndex = astro.lagnaIndex;

  if (!mars || isNaN(lagnaIndex)) return { hasDosha: false };

  const marsHouse = ((mars.rasiIndex - lagnaIndex + 12) % 12) + 1;
  const isMangalHouse = [1, 2, 4, 7, 8, 12].includes(marsHouse);

  if (!isMangalHouse) {
    return {
      hasDosha: false,
      marsHouse,
      marsRasi: mars.rasi
    };
  }

  // It is in a Manglik house, now check for cancellation (Bhang) rules
  let isCancelled = false;
  let cancelReason = '';

  // Rule 1: Mars in own sign or exaltation sign
  // Aries (0), Scorpio (7), Capricorn (9)
  if ([0, 7, 9].includes(mars.rasiIndex)) {
    isCancelled = true;
    cancelReason = `Mars is in its own or exalted sign (${mars.rasi}).`;
  }

  // Rule 2: Conjunction or Aspect by Jupiter
  if (jupiter) {
    const jupiterHouse = ((jupiter.rasiIndex - lagnaIndex + 12) % 12) + 1;
    const distance = ((marsHouse - jupiterHouse + 12) % 12) + 1;
    if ([1, 5, 7, 9].includes(distance)) {
      isCancelled = true;
      cancelReason = distance === 1 
        ? `Mars is conjoined with Jupiter (Guru) in House ${marsHouse}.` 
        : `Mars is aspected by Jupiter (Guru) from House ${jupiterHouse}.`;
    }
  }

  // Rule 3: Specific house-sign pairs
  if (!isCancelled) {
    const rasiIdx = mars.rasiIndex;
    if (marsHouse === 2 && [2, 5].includes(rasiIdx)) {
      isCancelled = true;
      cancelReason = `Mars in 2nd house in Mercury's sign (${mars.rasi}).`;
    } else if (marsHouse === 4 && [0, 7].includes(rasiIdx)) {
      isCancelled = true;
      cancelReason = `Mars in 4th house in its own sign (${mars.rasi}).`;
    } else if (marsHouse === 7 && [3, 9].includes(rasiIdx)) {
      isCancelled = true;
      cancelReason = `Mars in 7th house in Cancer or Capricorn (${mars.rasi}).`;
    } else if (marsHouse === 8 && [8, 11].includes(rasiIdx)) {
      isCancelled = true;
      cancelReason = `Mars in 8th house in Jupiter's sign (${mars.rasi}).`;
    } else if (marsHouse === 12 && [1, 6].includes(rasiIdx)) {
      isCancelled = true;
      cancelReason = `Mars in 12th house in Venus's sign (${mars.rasi}).`;
    }
  }

  return {
    hasDosha: true,
    isCancelled,
    cancelReason,
    marsHouse,
    marsRasi: mars.rasi
  };
}

function buildChartData(astro, chartType) {
  if (!astro) return null;
  const isD9 = chartType === 'd9';
  const lagnaIdx = isD9 ? getD9RasiIndex(astro.lagnaDegree) : astro.lagnaIndex;

  const placements = {};
  const rasiPlacements = {};

  astro.planets.forEach(p => {
    const name = p.planet || p.name;
    const rasiVal = isD9 ? getD9RasiIndex(p.fullDegree) : p.rasiIndex;
    rasiPlacements[name] = rasiVal;
    placements[name] = ((rasiVal - lagnaIdx + 12) % 12) + 1;
  });

  const houseLords = {};
  for (let i = 1; i <= 12; i++) {
    const rasi = (lagnaIdx + i - 1) % 12;
    houseLords[i] = RASHI_LORDS[rasi];
  }

  const getConjuncts = (pName) => {
    const house = placements[pName];
    if (house === undefined) return [];
    return Object.keys(placements).filter(p => placements[p] === house && p !== pName);
  };

  const aspects = (fromPlanet, toRasiIndex) => {
    const fromRasi = rasiPlacements[fromPlanet];
    if (fromRasi === undefined) return false;
    const relHouse = ((toRasiIndex - fromRasi + 12) % 12) + 1;
    return (
      relHouse === 7 ||
      (fromPlanet === 'Mars' && [4, 8].includes(relHouse)) ||
      (fromPlanet === 'Jupiter' && [5, 9].includes(relHouse)) ||
      (fromPlanet === 'Saturn' && [3, 10].includes(relHouse))
    );
  };

  const houses = {};
  for (let i = 1; i <= 12; i++) {
    houses[i] = { occupants: [] };
  }
  Object.entries(placements).forEach(([planetName, houseIdx]) => {
    if (houses[houseIdx]) {
      houses[houseIdx].occupants.push(planetName);
    }
  });

  return {
    placements,
    rasiPlacements,
    houseLords,
    getConjuncts,
    aspects,
    houses
  };
}

export default function AstroMatchView({ 
  savedProfiles, onBack, onLoadCloudProfiles, cloudStatus, 
  cloudLoading, isCloudSignedIn, geminiKey, astroLevel, language 
}) {
  const fileInputRef = React.useRef(null);

  const importProfilesFromFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Expected JSON array of profiles');
        const normalized = data.filter(p => p && (p.id || p.name)).map(p => ({
          id: p.id || (p.name && p.dob ? `${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${p.dob}` : String(Math.random())),
          name: p.name || 'Unnamed',
          dob: p.dob || '',
          time: p.time || p.tob || '12:00',
          lat: p.lat || p.latitude || 0,
          lon: p.lon || p.longitude || 0,
          tzone: p.tzone || p.tz || 5.5
        }));
        window.localStorage.setItem('astroClients', JSON.stringify(normalized));
        alert(`Imported ${normalized.length} profiles. The page will reload to reflect changes.`);
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => fileInputRef.current && fileInputRef.current.click();

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importProfilesFromFile(f);
  };

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

  const [matchType, setMatchType] = useState('marriage');
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
  const [selectedBoy, setSelectedBoy] = useState('');
  const [selectedGirl, setSelectedGirl] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [autoFillMessage, setAutoFillMessage] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleBoyChange = (boyId) => {
    setSelectedBoy(boyId);
    if (!boyId) return;

    const boyProfile = savedProfiles.find(p => p.id === boyId);
    if (boyProfile) {
      let spouse = savedProfiles.find(p => p.id !== boyId && p.familyHeadId === boyId && p.relationship?.toLowerCase() === 'spouse');
      if (!spouse && boyProfile.familyHeadId && boyProfile.relationship?.toLowerCase() === 'spouse') {
        spouse = savedProfiles.find(p => p.id === boyProfile.familyHeadId);
      }
      if (spouse) {
        setSelectedGirl(spouse.id);
        const autoStr = matchType === 'marriage' ? 'Spouse profile' : 'Linked family profile';
        setAutoFillMessage(`${autoStr} (${spouse.name}) auto-selected for comparison!`);
        setTimeout(() => setAutoFillMessage(''), 4000);
      }
    }
  };

  const handleGirlChange = (girlId) => {
    setSelectedGirl(girlId);
    if (!girlId) return;

    const girlProfile = savedProfiles.find(p => p.id === girlId);
    if (girlProfile) {
      let spouse = savedProfiles.find(p => p.id !== girlId && p.familyHeadId === girlId && p.relationship?.toLowerCase() === 'spouse');
      if (!spouse && girlProfile.familyHeadId && girlProfile.relationship?.toLowerCase() === 'spouse') {
        spouse = savedProfiles.find(p => p.id === girlProfile.familyHeadId);
      }
      if (spouse) {
        setSelectedBoy(spouse.id);
        const autoStr = matchType === 'marriage' ? 'Spouse profile' : 'Linked family profile';
        setAutoFillMessage(`${autoStr} (${spouse.name}) auto-selected for comparison!`);
        setTimeout(() => setAutoFillMessage(''), 4000);
      }
    }
  };


  // 🧮 Core Match Score Computation Trigger
  const handleCalculateMatch = () => {
    if (!selectedBoy || !selectedGirl) {
      alert("Please choose both profiles to run the alignment engine!");
      return;
    }

    setAiText('');
    setAiError('');

    const boyData = savedProfiles.find(p => p.id === selectedBoy);
    const girlData = savedProfiles.find(p => p.id === selectedGirl);

    if (!boyData || !girlData) return;

    const boyAstro = getPositionsForProfile(boyData);
    const girlAstro = getPositionsForProfile(girlData);

    const boyMoon = boyAstro?.planets.find(p => p.name === 'Moon');
    const girlMoon = girlAstro?.planets.find(p => p.name === 'Moon');

    if (!boyMoon || !girlMoon) {
      alert('Unable to calculate Moon placement for one of the profiles. Please verify birth details.');
      return;
    }

    const boyNakIndex = NAKSHATRAS.indexOf(boyMoon.nakshatra);
    const girlNakIndex = NAKSHATRAS.indexOf(girlMoon.nakshatra);
    const boyRasiIndex = boyMoon.rasiIndex;
    const girlRasiIndex = girlMoon.rasiIndex;

    const nakDistance = (from, to) => ((to - from + 27) % 27) + 1;
    const rasiDistance = (from, to) => ((to - from + 12) % 12) + 1;
    const boyFromGirlNak = nakDistance(girlNakIndex, boyNakIndex);
    const boyFromGirlRasi = rasiDistance(girlRasiIndex, boyRasiIndex);
    const girlFromBoyRasi = rasiDistance(boyRasiIndex, girlRasiIndex);

    const gana = ['Deva','Manushya','Rakshasa','Manushya','Manushya','Manushya','Deva','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
    const rajju = ['Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada'];
    const nadi = (idx) => idx % 3;
    const varnaRank = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
    const vedhaPairs = [[0,18],[1,17],[2,16],[3,15],[4,23],[5,22],[6,21],[7,20],[8,19],[9,26],[10,25],[11,24]];
    const vedhaBad = vedhaPairs.some(([a, b]) => (
      (boyNakIndex === a && girlNakIndex === b) ||
      (boyNakIndex === b && girlNakIndex === a)
    ));

    const friendships = {
      Sun: ['Moon', 'Mars', 'Jupiter'],
      Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'],
      Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'],
      Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus']
    };

    const boyLord = RASHI_LORDS[boyRasiIndex];
    const girlLord = RASHI_LORDS[girlRasiIndex];
    const areFriends = boyLord === girlLord || friendships[boyLord]?.includes(girlLord) || friendships[girlLord]?.includes(boyLord);

    const badBhakoot = (
      (boyFromGirlRasi === 2 && girlFromBoyRasi === 12) ||
      (boyFromGirlRasi === 12 && girlFromBoyRasi === 2) ||
      (boyFromGirlRasi === 6 && girlFromBoyRasi === 8) ||
      (boyFromGirlRasi === 8 && girlFromBoyRasi === 6) ||
      (boyFromGirlRasi === 5 && girlFromBoyRasi === 9) ||
      (boyFromGirlRasi === 9 && girlFromBoyRasi === 5)
    );

    const scores = {
      dina: [2, 4, 6, 8, 9].includes(boyFromGirlNak % 9 || 9) ? 3 : 0,
      gana: gana[boyNakIndex] === gana[girlNakIndex] ? 6 : (gana[boyNakIndex] === 'Rakshasa' || gana[girlNakIndex] === 'Rakshasa' ? 1 : 5),
      yoni: boyNakIndex === girlNakIndex ? 4 : (Math.abs(boyNakIndex - girlNakIndex) % 3 === 0 ? 3 : 2),
      maitri: areFriends ? 2 : 1,
      bhakoot: badBhakoot ? 0 : 7,
      nadi: nadi(boyNakIndex) === nadi(girlNakIndex) ? 0 : 8,
      varna: varnaRank[boyRasiIndex] >= varnaRank[girlRasiIndex] ? 1 : 0,
      vashya: boyRasiIndex === girlRasiIndex || Math.abs(boyRasiIndex - girlRasiIndex) === 1 ? 2 : 1,
      mahendra: [4, 7, 10, 13, 16, 19, 22, 25].includes(boyFromGirlNak) ? 4 : 0,
      striDirgha: boyFromGirlNak >= 14 ? 3 : 0,
      rajju: rajju[boyNakIndex] === rajju[girlNakIndex] ? 0 : 7,
      vedha: vedhaBad ? 0 : 3
    };

    const activeKootas = MATCH_TYPES[matchType].activeKootas;
    const maxPoints = MATCH_TYPES[matchType].maxPoints;

    const filteredScores = {};
    activeKootas.forEach(k => {
      filteredScores[k] = scores[k] ?? 0;
    });

    const doshas = [];
    if (activeKootas.includes('rajju') && scores.rajju === 0) doshas.push('Rajju Dosha');
    if (activeKootas.includes('vedha') && scores.vedha === 0) doshas.push('Vedha Dosha');
    if (activeKootas.includes('nadi') && scores.nadi === 0) doshas.push('Nadi Dosha');
    if (activeKootas.includes('bhakoot') && scores.bhakoot === 0) doshas.push('Bhakoot Warning');

    const totalScore = Object.values(filteredScores).reduce((sum, value) => sum + value, 0);

    // Calculate Mangal Dosha & Bhanga
    const boyMangal = checkMangalDosha(boyData);
    const girlMangal = checkMangalDosha(girlData);

    let mangalVerdict = '';
    let mangalSeverity = 'neutral';

    const boyActive = boyMangal.hasDosha && !boyMangal.isCancelled;
    const girlActive = girlMangal.hasDosha && !girlMangal.isCancelled;

    if (boyActive && girlActive) {
      mangalVerdict = "Both partners have active Mangal Dosha. According to Shastras, when both partners are Manglik, the doshas mutually neutralize (cancel) each other out. This is a highly favorable configuration (Bilateral Manglik harmony).";
      mangalSeverity = 'safe';
    } else if (!boyMangal.hasDosha && !girlMangal.hasDosha) {
      mangalVerdict = "Both partners are Non-Manglik. No Mangal Dosha affliction is present in either chart. This is a safe and compatible alignment.";
      mangalSeverity = 'safe';
    } else if (boyActive && !girlActive) {
      mangalVerdict = "Boy has active Mangal Dosha, but Girl is Non-Manglik. This represents a potential match mismatch (affliction). Remedies (like Kumbha Vivaha or Pujas) are traditionally recommended to mitigate friction.";
      mangalSeverity = 'severe';
    } else if (!boyActive && girlActive) {
      mangalVerdict = "Girl has active Mangal Dosha, but Boy is Non-Manglik. This represents a potential match mismatch (affliction). Remedies (like Kumbha Vivaha or Pujas) are traditionally recommended to mitigate friction.";
      mangalSeverity = 'severe';
    } else {
      if (boyMangal.isCancelled && girlMangal.isCancelled) {
        mangalVerdict = "Both partners had Mangal Dosha placements, but they are cancelled (Bhanga) in both charts by strong counteracting placements. Highly compatible.";
        mangalSeverity = 'safe';
      } else if (boyMangal.isCancelled && !girlActive) {
        mangalVerdict = `Boy has Mars in House ${boyMangal.marsHouse}, but it is cancelled: ${boyMangal.cancelReason} Girl is Non-Manglik. This is a compatible alignment.`;
        mangalSeverity = 'safe';
      } else if (girlMangal.isCancelled && !boyActive) {
        mangalVerdict = `Girl has Mars in House ${girlMangal.marsHouse}, but it is cancelled: ${girlMangal.cancelReason} Boy is Non-Manglik. This is a compatible alignment.`;
        mangalSeverity = 'safe';
      } else if (boyActive && girlMangal.isCancelled) {
        mangalVerdict = `Boy has active Mangal Dosha, but Girl's Mangal Dosha is cancelled (${girlMangal.cancelReason}). Since the Girl is effectively Non-Manglik, a partial affliction exists. Remedial advice is suggested.`;
        mangalSeverity = 'warning';
      } else if (girlActive && boyMangal.isCancelled) {
        mangalVerdict = `Girl has active Mangal Dosha, but Boy's Mangal Dosha is cancelled (${boyMangal.cancelReason}). Since the Boy is effectively Non-Manglik, a partial affliction exists. Remedial advice is suggested.`;
        mangalSeverity = 'warning';
      }
    }

    const boyAstroWithCharts = boyAstro ? {
      ...boyAstro,
      d1: buildChartData(boyAstro, 'd1'),
      d9: buildChartData(boyAstro, 'd9')
    } : null;

    const girlAstroWithCharts = girlAstro ? {
      ...girlAstro,
      d1: buildChartData(girlAstro, 'd1'),
      d9: buildChartData(girlAstro, 'd9')
    } : null;

    setMatchResult({
      totalScore,
      maxPoints,
      scores: filteredScores,
      doshas,
      matchType,
      boyMangal,
      girlMangal,
      mangalVerdict,
      mangalSeverity,
      boyDetails: { name: boyData.name || selectedBoy, rasi: boyMoon?.rasi || 'Unknown', nakshatra: boyMoon?.nakshatra || 'Unknown' },
      girlDetails: { name: girlData.name || selectedGirl, rasi: girlMoon?.rasi || 'Unknown', nakshatra: girlMoon?.nakshatra || 'Unknown' },
      boyAstro: boyAstroWithCharts,
      girlAstro: girlAstroWithCharts
    });
  };

  React.useEffect(() => {
    if (selectedBoy && selectedGirl) {
      // Small timeout to allow background API fetches to trigger and complete
      const timer = setTimeout(() => {
        handleCalculateMatch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [preciseToggle, calcTrigger]);

  const handleGenerateAISynthesis = async () => {
    if (!matchResult) return;
    if (!geminiKey) {
      setAiError("Please configure your Gemini API Key in the settings first.");
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiText('');

    const matchState = {
      boyName: matchResult.boyDetails.name,
      girlName: matchResult.girlDetails.name,
      totalScore: matchResult.totalScore,
      maxScore: matchResult.maxPoints,
      mangalVerdict: matchResult.mangalVerdict,
      activeWarnings: matchResult.doshas || [],
      kootBreakdown: Object.entries(matchResult.scores).map(([kootName, score]) => ({ kootName, score })),
      overlays: synastryOverlays
    };

    const prompt = generateMatchSynthesisPrompt(matchState);

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

  const synastryOverlays = useMemo(() => {
    if (!matchResult || !matchResult.boyAstro || !matchResult.girlAstro) return [];
    
    const boyLagna = matchResult.boyAstro.lagnaIndex;
    const boyPlacements = matchResult.boyAstro.d1.rasiPlacements;
    const girlLagna = matchResult.girlAstro.lagnaIndex;
    const girlPlacements = matchResult.girlAstro.d1.rasiPlacements;
    
    return calculateSynastryOverlays(boyLagna, boyPlacements, girlLagna, girlPlacements);
  }, [matchResult]);

  // ============================================================================
  // 🔮 ADVANCED SYNASTRY & DESTINY ENGINE (MARRIAGE & DOSHA)
  // ============================================================================
  
  const advancedDestinyInsights = useMemo(() => {
    // Requires both profiles to be calculated via ephemerisEngine
    if (!matchResult || !matchResult.boyAstro || !matchResult.girlAstro) return [];
    
    const insights = [];
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    const fastPlanets = ['Moon', 'Mercury', 'Venus'];
    const slowPlanets = ['Saturn', 'Jupiter', 'Rahu', 'Ketu'];

    const analyzeProfile = (astro, gender) => {
      const d1 = astro.d1; // Assuming your engine provides d1 and d9 charts
      const d9 = astro.d9;
      if (!d1 || !d9) return;

      const partnerGender = gender === 'Boy' ? 'Girl' : 'Boy';

      // ----------------------------------------------------
      // 1. MANGAL DOSHA & BHANG (CANCELLATION) EVALUATION
      // ----------------------------------------------------
      const marsHouse = d1.placements['Mars'];
      const isManglik = [1, 2, 4, 7, 8, 12].includes(marsHouse);
      
      if (isManglik) {
        let isBhang = false;
        let bhangReason = '';

        // Bhang Rule 1: Mars is in own sign (Aries/Scorpio) or Exalted (Capricorn)
        const marsSign = d1.rasiPlacements['Mars'];
        if ([0, 7, 9].includes(marsSign)) {
          isBhang = true;
          bhangReason = 'Mars is in its own sign or exalted.';
        }
        // Bhang Rule 2: Jupiter aspects Mars
        else if (d1.aspects && d1.aspects('Jupiter', marsSign)) {
          isBhang = true;
          bhangReason = 'Jupiter fully aspects Mars.';
        }
        // Bhang Rule 3: Strong Jupiter or Venus in Ascendant
        else if (d1.placements['Jupiter'] === 1 || d1.placements['Venus'] === 1) {
          isBhang = true;
          bhangReason = 'Strong Benefic (Jupiter/Venus) is in the Ascendant.';
        }

        insights.push({
          type: isBhang ? 'Neutralized Dosha' : 'Critical Warning',
          title: `${gender}'s Mangal Dosha`,
          icon: isBhang ? 'ShieldCheck' : 'Flame',
          color: isBhang ? 'text-emerald-700' : 'text-red-700',
          bg: isBhang ? 'bg-emerald-50' : 'bg-red-50',
          border: isBhang ? 'border-emerald-200' : 'border-red-200',
          desc: isBhang 
            ? `${gender} has Mangal Dosha, but it is cancelled (Bhang) because ${bhangReason}`
            : `${gender} has active Mangal Dosha (Mars in house ${marsHouse}). Ensure partner is also Manglik or perform Kumbh Vivah remedies.`
        });
      }

      // ----------------------------------------------------
      // 2. TIMING OF MARRIAGE (D1 H7 Lord placed in D9)
      // ----------------------------------------------------
      const d1H7Lord = d1.houseLords[7];
      if (d1H7Lord && d9.placements[d1H7Lord]) {
        const lordD9Conjuncts = d9.getConjuncts(d1H7Lord) || [];
        const hasFast = lordD9Conjuncts.some(p => fastPlanets.includes(p));
        const hasSlow = lordD9Conjuncts.some(p => slowPlanets.includes(p));

        if (hasFast && !hasSlow) {
          insights.push({
            type: 'Timing Indicator',
            title: `${gender}'s Marriage Timing (Early)`,
            icon: 'Clock',
            color: 'text-blue-700',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            desc: `Lord of 7th House (${d1H7Lord}) is associated with fast-moving planets in the Navamsha (D9). Indicates a higher probability of early marriage.`
          });
        } else if (hasSlow) {
          insights.push({
            type: 'Timing Indicator',
            title: `${gender}'s Marriage Timing (Late)`,
            icon: 'Hourglass',
            color: 'text-amber-700',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            desc: `Lord of 7th House (${d1H7Lord}) is associated with slow-moving planets (Saturn/Rahu/Jupiter) in the Navamsha (D9). Indicates delays or late marriage.`
          });
        }
      }

      // ----------------------------------------------------
      // 3. LONGEVITY / DEATH OF SPOUSE INDICATORS (NAVAMSHA)
      // ----------------------------------------------------
      const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };

      // Helper to check if a house receives benefic influence in D9 (aspected or conjoined by Jupiter/Venus)
      const hasBeneficInfluence = (houseNum) => {
        const occupants = d9.houses[houseNum]?.occupants || [];
        if (occupants.includes('Jupiter') || occupants.includes('Venus')) return true;

        const d9LagnaIdx = getD9RasiIndex(astro.lagnaDegree);
        const houseRasiIdx = (d9LagnaIdx + houseNum - 1) % 12;

        if (d9.aspects('Jupiter', houseRasiIdx) || d9.aspects('Venus', houseRasiIdx)) {
          return true;
        }
        return false;
      };

      const d9H7Occupants = d9.houses[7].occupants || [];
      const d9H8Occupants = d9.houses[8].occupants || [];
      
      const h7Malefics = d9H7Occupants.filter(p => malefics.includes(p));
      const h8Malefics = d9H8Occupants.filter(p => malefics.includes(p));

      // Rule 1: 7th house has malefic relation -> check if severe (2+ malefics or debilitated malefic)
      if (h7Malefics.length > 0) {
        const isDebilitatedMalefic = h7Malefics.some(p => d9.rasiPlacements[p] === DEBILITATION_SIGNS[p]);
        const isSevere = h7Malefics.length >= 2 || isDebilitatedMalefic;
        const isMitigated = hasBeneficInfluence(7);

        insights.push({
          type: isMitigated ? 'Neutralized Affliction' : 'Longevity Alert',
          title: `Threat to ${partnerGender} (Via ${gender}'s Chart)`,
          icon: 'AlertCircle',
          color: isMitigated ? 'text-emerald-700' : 'text-fuchsia-800',
          bg: isMitigated ? 'bg-emerald-50' : 'bg-fuchsia-50',
          border: isMitigated ? 'border-emerald-200' : 'border-fuchsia-200',
          desc: isMitigated
            ? `The 7th House in ${gender}'s Navamsha contains malefics (${h7Malefics.join(', ')}), but it is neutralized because the house receives beneficial aspects/conjunctions from Jupiter or Venus.`
            : `The 7th House in ${gender}'s Navamsha contains conjoined or debilitated malefics (${h7Malefics.join(', ')}). In classical Jyotish, this represents an unmitigated threat to the spouse's health and longevity.`
        });
      }
      
      // Rule 2: 8th house has malefic relation -> check if severe
      if (h8Malefics.length > 0) {
        const isDebilitatedMalefic = h8Malefics.some(p => d9.rasiPlacements[p] === DEBILITATION_SIGNS[p]);
        const isSevere = h8Malefics.length >= 2 || isDebilitatedMalefic;
        const isMitigated = hasBeneficInfluence(8);

        insights.push({
          type: isMitigated ? 'Neutralized Affliction' : 'Longevity Alert',
          title: `Threat to ${gender} (Self)`,
          icon: 'Activity',
          color: isMitigated ? 'text-emerald-700' : 'text-purple-800',
          bg: isMitigated ? 'bg-emerald-50' : 'bg-purple-50',
          border: isMitigated ? 'border-emerald-200' : 'border-purple-200',
          desc: isMitigated
            ? `The 8th House (Manglya) in ${gender}'s Navamsha contains malefics (${h8Malefics.join(', ')}), but the affliction is cancelled due to protective aspects/conjunctions from Venus or Jupiter.`
            : `The 8th House in ${gender}'s Navamsha contains conjoined or debilitated malefics (${h8Malefics.join(', ')}). Under Parashari principles, this represents a severe threat to the native's own longevity.`
        });
      }
    };

    // Run isolated profile analysis
    analyzeProfile(matchResult.boyAstro, 'Boy');
    analyzeProfile(matchResult.girlAstro, 'Girl');

    // ----------------------------------------------------
    // 4. CROSS-CHART 8TH LORD SYNASTRY (WIDOWHOOD CHECK)
    // ----------------------------------------------------
    const checkCrossLongevity = (primary, secondary, primaryLabel, secondaryLabel) => {
      const primaryD9H8Lord = primary.d9.houseLords[8];
      if (primaryD9H8Lord) {
        // Find where the Primary's D9 8th Lord sits in the Secondary's D9 chart
        const positionInSecondary = secondary.d9.placements[primaryD9H8Lord];
        const conjunctsInSecondary = secondary.d9.getConjuncts(primaryD9H8Lord) || [];
        
        const isAfflicted = conjunctsInSecondary.some(p => malefics.includes(p));
        
        if (isAfflicted) {
          const inDusthana = [6, 8, 12].includes(positionInSecondary);
          const maleficCount = conjunctsInSecondary.filter(p => malefics.includes(p)).length;
          const isSevere = (inDusthana && maleficCount >= 1) || maleficCount >= 2;
          
          const secD9LagnaIdx = getD9RasiIndex(secondary.lagnaDegree);
          const houseRasiIdx = (secD9LagnaIdx + positionInSecondary - 1) % 12;
          const receivesBenefic = conjunctsInSecondary.includes('Jupiter') || conjunctsInSecondary.includes('Venus') ||
            secondary.d9.aspects('Jupiter', houseRasiIdx) || secondary.d9.aspects('Venus', houseRasiIdx);
            
          insights.push({
            type: receivesBenefic ? 'Neutralized Synastry' : 'Critical Synastry Alert',
            title: `Widowhood Indicator (${primaryLabel}'s Lord in ${secondaryLabel}'s Chart)`,
            icon: 'Skull',
            color: receivesBenefic ? 'text-emerald-700' : 'text-rose-900',
            bg: receivesBenefic ? 'bg-emerald-50' : 'bg-rose-100',
            border: receivesBenefic ? 'border-emerald-200' : 'border-rose-300',
            desc: receivesBenefic
              ? `The 8th Lord of ${primaryLabel}'s Navamsha (${primaryD9H8Lord}) sits in house ${positionInSecondary} of ${secondaryLabel}'s Navamsha under malefic influence, but the affliction is neutralized by aspect/conjunction from Venus or Jupiter.`
              : `The 8th Lord from ${primaryLabel}'s Navamsha (${primaryD9H8Lord}) is placed in house ${positionInSecondary} (Dusthana/Afflicted) in ${secondaryLabel}'s Navamsha conjoined with malefics. Classical texts warn of severe longevity risks to ${secondaryLabel}.`
          });
        }
      }
    };

    checkCrossLongevity(matchResult.girlAstro, matchResult.boyAstro, 'Girl', 'Boy');
    checkCrossLongevity(matchResult.boyAstro, matchResult.girlAstro, 'Boy', 'Girl');

    return insights;
  }, [matchResult]);

  const genderMismatchWarning = useMemo(() => {
    if (matchType !== 'marriage' || !selectedBoy || !selectedGirl) return null;
    const boyProfile = savedProfiles.find(p => p.id === selectedBoy);
    const girlProfile = savedProfiles.find(p => p.id === selectedGirl);
    if (!boyProfile || !girlProfile) return null;

    const warnings = [];
    if (boyProfile.gender === 'Female') {
      warnings.push(`Selected Husband profile "${boyProfile.name}" is marked as Female.`);
    }
    if (girlProfile.gender === 'Male') {
      warnings.push(`Selected Wife profile "${girlProfile.name}" is marked as Male.`);
    }
    return warnings.length > 0 ? warnings.join(' ') : null;
  }, [matchType, selectedBoy, selectedGirl, savedProfiles]);
  
  return (
    <div className="relative min-h-screen bg-[#fdfde8] p-4 md:p-8 pt-16 overflow-y-auto">
      
      {/* 🧭 NAVIGATION HEADER BAR */}
      <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white text-center py-1.5 px-4 text-[10px] font-bold z-50 shadow-md flex justify-center gap-1.5">
        AstroMatch Ver 1.6.0 - Relationship Compatibility Sandbox
      </div>

      {/* 🔮 MAIN CONTENT LAYOUT CONTAINER */}
      <div className="max-w-4xl mx-auto bg-white border border-amber-300 rounded-2xl shadow-xl p-6 md:p-10 mt-4">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-amber-100 pb-4 mb-6 gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all transition-colors" title="Back to Dashboard">
            ← Back to Dashboard
          </button>
          <PreciseCalculationToggle />
        </div>

        <h2 className="text-3xl font-bold text-amber-800 mb-6 text-center tracking-wider uppercase">
          {matchType === 'marriage' ? 'Dwadashkoot Guna Milan' : 'Relationship Compatibility'}
        </h2>

        {/* ☁️ FIREBASE CLOUD REAL-TIME PROFILE SYNC BAR */}
        <div className="max-w-2xl mx-auto mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className={isCloudSignedIn ? "text-emerald-500 text-lg" : "text-slate-400 text-lg"}>☁️</span>
            <span>
              {isCloudSignedIn 
                ? (cloudStatus || "Cloud Sync Active (Real-time)") 
                : "Sign in on the home screen to access your cloud profiles."
              }
            </span>
          </div>
          {isCloudSignedIn && (
            <button
              onClick={onLoadCloudProfiles}
              disabled={cloudLoading}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors disabled:bg-amber-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {cloudLoading ? "Loading..." : "Sync Profiles"}
            </button>
          )}
        </div>

        {/* RELATIONSHIP MATCH TYPE SELECTOR */}
        <div className="mb-8 max-w-2xl mx-auto">
          <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2.5 text-center">
            Compatibility Purpose / Match Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-amber-50/50 p-2 rounded-2xl border border-amber-200 shadow-sm">
            {Object.entries(MATCH_TYPES).map(([key, cfg]) => {
              const active = matchType === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setMatchType(key);
                    setMatchResult(null); // Reset results when switching types
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all font-bold text-xs border cursor-pointer ${
                    active
                      ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                      : 'bg-white hover:bg-amber-50 border-amber-200 text-slate-700 hover:text-amber-800'
                  }`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3 font-medium px-4 leading-relaxed">
            {MATCH_TYPES[matchType].desc}
          </p>
        </div>

        {/* AUTO-FILL NOTIFICATION BANNER */}
        {autoFillMessage && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            ✨ {autoFillMessage}
          </div>
        )}

        {/* PROFILE SELECTION DROP-DOWNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* PROFILE A SELECTION CARD */}
          <div className="flex flex-col gap-3 bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
            <label className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>{matchType === 'marriage' ? '👦' : '👤'}</span> {MATCH_TYPES[matchType].refLabel}
            </label>
            <SearchableDropdown
              options={sortedProfiles}
              value={selectedBoy}
              onChange={handleBoyChange}
              placeholder={MATCH_TYPES[matchType].placeholderA}
              className="w-full"
              buttonClassName="w-full bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-slate-700 text-sm shadow-sm hover:bg-slate-50 text-left h-[46px]"
              variant="form"
              groupByCategory={true}
            />
          </div>

          {/* PROFILE B SELECTION CARD */}
          <div className="flex flex-col gap-3 bg-pink-50 p-6 rounded-xl border border-pink-200 shadow-sm">
            <label className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>{matchType === 'marriage' ? '👩‍🦰' : '👥'}</span> {MATCH_TYPES[matchType].compLabel}
            </label>
            <SearchableDropdown
              options={sortedProfiles}
              value={selectedGirl}
              onChange={handleGirlChange}
              placeholder={MATCH_TYPES[matchType].placeholderB}
              className="w-full"
              buttonClassName="w-full bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-slate-700 text-sm shadow-sm hover:bg-slate-50 text-left h-[46px]"
              variant="form"
              groupByCategory={true}
            />
          </div>

        </div>

        {genderMismatchWarning && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold text-center shadow-sm">
            ⚠️ **Gender Alert**: {genderMismatchWarning}
          </div>
        )}

        {/* CALCULATION TRIGGER ENGINE ACTION */}
        <div className="text-center mb-10">
          <button
            onClick={handleCalculateMatch}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-md transform hover:-translate-y-0.5 transition-all text-lg cursor-pointer"
          >
            Calculate Compatibility
          </button>
        </div>

        {/* RESULTS GRID RENDERER */}
        {matchResult && (
          <div className="mt-8 border-t border-amber-200 pt-8 animate-fade-in">
            <div className="text-center mb-4 bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest block mb-1">
                {matchResult.matchType === 'marriage' ? 'TOTAL MILAN SCORE' : 'COMPATIBILITY SCORE'}
              </span>
              <div className="text-5xl font-black text-emerald-600">
                {matchResult.totalScore} <span className="text-2xl text-slate-400 font-normal">/ {matchResult.maxPoints}</span>
              </div>
            </div>

            {matchResult.doshas?.length > 0 ? (
              <div className="mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                <div className="font-bold uppercase text-[10px] tracking-widest mb-2">Warnings & Afflictions</div>
                <div className="flex flex-wrap gap-2">
                  {matchResult.doshas.map((dosha) => (
                    <span key={dosha} className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-700">
                      <span>⚠️</span>{dosha}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold">
                No major compatibility warning indicators detected.
              </div>
            )}

            {/* MANGAL DOSHA DETAILS PANEL */}
            {matchResult.matchType === 'marriage' && matchResult.boyMangal && matchResult.girlMangal && (
              <div className="mb-8 p-6 rounded-2xl border border-amber-200 bg-amber-50/30 text-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>🔥</span> Mangal Dosha Analysis (Kuja Dosha)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* BOY STATUS */}
                  <div className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col gap-2 shadow-inner">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Boy's Chart Placement</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Mars in House {matchResult.boyMangal.marsHouse} ({matchResult.boyMangal.marsRasi})</span>
                      {matchResult.boyMangal.hasDosha ? (
                        matchResult.boyMangal.isCancelled ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">Cancelled</span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wider">Manglik</span>
                        )
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">Non-Manglik</span>
                      )}
                    </div>
                    {matchResult.boyMangal.isCancelled && (
                      <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                        Reason: {matchResult.boyMangal.cancelReason}
                      </p>
                    )}
                  </div>

                  {/* GIRL STATUS */}
                  <div className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col gap-2 shadow-inner">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Girl's Chart Placement</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Mars in House {matchResult.girlMangal.marsHouse} ({matchResult.girlMangal.marsRasi})</span>
                      {matchResult.girlMangal.hasDosha ? (
                        matchResult.girlMangal.isCancelled ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">Cancelled</span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wider">Manglik</span>
                        )
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">Non-Manglik</span>
                      )}
                    </div>
                    {matchResult.girlMangal.isCancelled && (
                      <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                        Reason: {matchResult.girlMangal.cancelReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* VERDICT SUMMARY */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  matchResult.mangalSeverity === 'safe'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : matchResult.mangalSeverity === 'warning'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-lg leading-none mt-0.5">
                    {matchResult.mangalSeverity === 'safe' ? '✅' : matchResult.mangalSeverity === 'warning' ? '⚠️' : '🚨'}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-[10px] uppercase tracking-wider mb-1">Dosha Verdict</div>
                    <p className="text-xs leading-relaxed font-semibold">
                      {matchResult.mangalVerdict}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ADVANCED DESTINY & DOSHA INSIGHTS */}
            {advancedDestinyInsights && advancedDestinyInsights.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="text-xl">🔮</div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Advanced Navamsha & Dosha Synastry</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {advancedDestinyInsights.map((insight, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${insight.bg} ${insight.border} ${insight.color} shadow-sm flex flex-col gap-2`}>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{insight.type}</span>
                      </div>
                      <div className="font-bold text-sm">{insight.title}</div>
                      <p className="text-xs opacity-90 leading-relaxed font-medium">
                        {insight.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MUTUAL PLANETARY OVERLAYS (SYNASTRY) */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="text-xl">🌌</div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Mutual Planetary Overlays (Synastry)</h3>
              </div>
              {synastryOverlays && synastryOverlays.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {synastryOverlays.map((overlay, idx) => {
                    const isPositive = overlay.type === 'Positive';
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 transition-all hover:shadow-md ${
                          isPositive 
                            ? 'bg-teal-50/60 border-teal-200 text-teal-900' 
                            : 'bg-purple-50/60 border-amber-200 text-purple-900'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                            isPositive 
                              ? 'bg-teal-100/80 text-teal-800' 
                              : 'bg-amber-100/80 text-amber-900'
                          }`}>
                            {overlay.type}
                          </span>
                        </div>
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <span>{isPositive ? '✨' : '⚠️'}</span>
                          {overlay.title}
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed font-medium">
                          {overlay.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 text-slate-500 text-xs font-semibold text-center italic shadow-sm">
                  No major mutual planetary overlays (magnetic attraction, spiritual blessing, or karmic restriction) detected for this birth profile combination.
                </div>
              )}
            </div>

            {/* AI RELATIONSHIP COUNSELING SYNTHESIS */}
            <div className="mt-8 bg-amber-50/20 border border-amber-250 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-amber-900/10 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-xl">💬</div>
                  <h3 className="text-md font-black text-amber-900 tracking-tight uppercase">Astro AI Relationship Counseling</h3>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAISynthesis}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <span className="text-[14px]">🔮</span>
                  {aiLoading ? 'Consulting Sages...' : 'Generate AI Relationship Verdict'}
                </button>
              </div>

              {aiLoading && (
                <div className="flex flex-col items-center justify-center gap-2 text-amber-600 py-10 animate-pulse">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold font-serif uppercase tracking-widest">Generating Match Synthesis...</span>
                </div>
              )}

              {aiError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <span>⚠️</span>
                  <span>Error generating verdict: {aiError}</span>
                </div>
              )}

              {aiText && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-4 bg-[#fdfdf7] border border-amber-200 rounded-xl shadow-inner text-slate-700 font-serif leading-relaxed text-xs max-h-[360px] overflow-y-auto scrollbar-thin whitespace-pre-line">
                    {aiText}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight border-t border-slate-100 pt-2 italic">
                    Note: Astrological matching provides guidance on compatibility patterns. Personal efforts, mutual respect, and understanding shape the ultimate reality of any marriage.
                  </div>
                </div>
              )}

              {!aiLoading && !aiText && !aiError && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Click the button above to synthesize these scores into a holistic, human-readable relationship counseling report.
                </p>
              )}
            </div>

            {/* KOOT COMPREHENSIVE BREAKDOWN MATRIX */}
            <div className="overflow-x-auto shadow-sm border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Koot / Test Name</th>
                    <th className="p-4 text-center">Max Points</th>
                    <th className="p-4 text-center">Obtained Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm font-medium text-slate-700">
                  {DWADASH_KOOT_RULES.filter(rule => MATCH_TYPES[matchResult.matchType || 'marriage'].activeKootas.includes(rule.key)).map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{rule.name}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{rule.description}</div>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-bold">{rule.maxPoints}</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">{matchResult.scores?.[rule.key] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}