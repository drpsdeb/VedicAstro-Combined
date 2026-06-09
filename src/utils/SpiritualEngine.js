// ============================================================================
// 🧘 VEDIC ASTROLOGY SPIRITUAL PATHS & SANYASA YOGAS ENGINE
// ============================================================================

import { RASHI_LORDS } from './ephemerisEngine';

const DEBILITATION_SIGNS = {
  Sun: 6,     // Libra
  Moon: 7,    // Scorpio
  Mars: 3,    // Cancer
  Mercury: 11,// Pisces
  Jupiter: 9, // Capricorn
  Venus: 5,   // Virgo
  Saturn: 0   // Aries
};

const hasAspect = (fromPlanet, toRasiIndex, rasiPlacements) => {
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

const getD3RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); const d = Math.floor((s % 30) / 10); return (r + d * 4) % 12; };
const getD4RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); const d = Math.floor((s % 30) / 7.5); return (r + d * 3) % 12; };
const getD9RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; return ([0, 9, 6, 3][Math.floor(s / 30) % 4] + Math.floor((s % 30) / (40 / 12))) % 12; };
const getD12RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); const d = Math.floor((s % 30) / 2.5); return (r + d) % 12; };
const getD16RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); const d = Math.floor((s % 30) / 1.875); const start = (r % 3) * 4; return (start + d) % 12; };
const getD20RasiIndex = (deg) => { const s = ((deg % 360) + 360) % 360; const r = Math.floor(s / 30); return (([0, 8, 4][r % 3]) + Math.floor((s % 30) / 1.5)) % 12; };

export const calculateSpiritualYogas = (planets, lagnaIndex, lagnaDegree) => {
  if (isNaN(lagnaIndex) || !planets || planets.length === 0) return [];
  
  let lDeg = lagnaDegree;
  if (lDeg === undefined || isNaN(lDeg)) lDeg = lagnaIndex * 30 + 15;

  const yogas = [];
  const placements = {};
  const rasiPlacements = {};
  const houseLords = {};
  const lordships = {};

  planets.forEach(p => {
    const name = p.planet || p.name;
    if (p) {
      // Store 1-based house placement from Lagna (1 to 12)
      placements[name] = ((p.rasiIndex - lagnaIndex + 12) % 12) + 1;
      // Store 0-based zodiac sign index (0 to 11)
      rasiPlacements[name] = p.rasiIndex;
    }
  });

  // Map out which planet rules which house
  for (let i = 1; i <= 12; i++) {
    const rasi = (lagnaIndex + i - 1) % 12;
    const lord = RASHI_LORDS[rasi];
    houseLords[i] = lord;
    if (!lordships[lord]) lordships[lord] = [];
    lordships[lord].push(i);
  }

  const getConjuncts = (pName) =>
    Object.keys(placements).filter(p => placements[p] === placements[pName] && p !== pName);

  const isDebilitated = (pName) => rasiPlacements[pName] === DEBILITATION_SIGNS[pName];
  const dusthanas = [6, 8, 12];

  // ==========================================
  // 1. SPIRITUAL PATHS & SANYASA YOGAS
  // ==========================================
  
  // Rule A: General Spiritual Inclination (Paths)
  const spiritualYogas = [
    { planet: 'Jupiter', path: 'Gyan Yoga (Knowledge)', icon: 'Book' },
    { planet: 'Saturn', path: 'Hath Yoga (Discipline)', icon: 'Activity' },
    { planet: 'Venus', path: 'Bhakti Yoga (Devotion)', icon: 'Heart' },
    { planet: 'Moon', path: 'Bhakti Yoga (Devotion)', icon: 'Heart' },
    { planet: 'Mercury', path: 'Bhakti Yoga (Devotion)', icon: 'Heart' },
    { planet: 'Rahu', path: 'Tantric Path', icon: 'Flame' },
    { planet: 'Ketu', path: 'Tantric Path', icon: 'Flame' }
  ];

  const spiritualLords = [houseLords[1], 'Jupiter', 'Saturn'];
  spiritualLords.forEach(p => {
    if (placements[p] && [9, 12].includes(placements[p])) { 
      const yogaInfo = spiritualYogas.find(y => y.planet === p);
      yogas.push({
        name: 'Spiritual Inclination',
        type: 'Spiritual',
        involved: [p],
        icon: yogaInfo?.icon || 'Sparkles',
        color: 'text-teal-700',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        desc: `${p} is heavily emphasized in a spiritual house (9th/12th). Suggests an inclination towards ${yogaInfo?.path || 'deep spiritual growth'}.`
      });
    }
  });

  // Rule B: Pravrajya Yoga (4+ planets in one house)
  const houseOccupantCounts = {};
  Object.keys(placements).forEach(p => {
     const h = placements[p];
     houseOccupantCounts[h] = (houseOccupantCounts[h] || 0) + 1;
  });
  
  for (let h in houseOccupantCounts) {
     if (houseOccupantCounts[h] >= 4) {
        const occupants = Object.keys(placements).filter(p => placements[p] == h);
        yogas.push({
           name: 'Pravrajya (Sanyas) Yoga',
           type: 'Spiritual',
           involved: occupants,
           icon: 'Sun',
           color: 'text-orange-700',
           bg: 'bg-orange-50',
           border: 'border-orange-200',
           desc: `Four or more planets conjunct in House ${h}. This creates a massive concentration of energy, strongly pulling the native towards asceticism, renunciation, or a monastic lifestyle.`
        });
     }
  }

  // Rule C: Vairagya Yoga (Saturn & Moon Connection)
  if (placements['Moon'] && placements['Saturn']) {
      const isConjunct = getConjuncts('Moon').includes('Saturn');
      const saturnAspectsMoon = hasAspect('Saturn', rasiPlacements['Moon'], rasiPlacements);
      
      if (isConjunct || saturnAspectsMoon) {
         yogas.push({
           name: 'Vairagya Yoga',
           type: 'Spiritual',
           involved: ['Moon', 'Saturn'],
           icon: 'Wind',
           color: 'text-slate-700',
           bg: 'bg-slate-100',
           border: 'border-slate-300',
           desc: `Saturn influences the Moon (mind). This restricts worldly attachments, bringing periods of emotional detachment, seriousness, and a strong pull toward spiritual truth and Vairagya (renunciation).`
         });
      }
  }

  // ==========================================
  // Rule D: Extended Moksha Yogas (Liberation)
  // ==========================================
  const mokshaReasons = [];
  const mokshaInvolved = new Set();
  
  // Helper variables for Moksha conditions
  const ascendantSign = lagnaIndex; // 0=Aries, 3=Cancer, 7=Scorpio, 11=Pisces
  const h12Occupants = Object.keys(placements).filter(p => placements[p] === 12);
  const h8Occupants = Object.keys(placements).filter(p => placements[p] === 8);
  const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

  // Condition 1: Ketu in 12th House (Standard)
  if (placements['Ketu'] === 12) {
      mokshaReasons.push("Ketu is placed in the 12th house (the ultimate karaka for liberation in the house of endings).");
      mokshaInvolved.add('Ketu');
  }

  // Condition 2: Jupiter and Ketu in 12th for Cancer, Scorpio, or Pisces Lagna
  if ([3, 7, 11].includes(ascendantSign) && placements['Jupiter'] === 12 && placements['Ketu'] === 12) {
      mokshaReasons.push("Jupiter and Ketu are strongly placed in the 12th house for a watery Ascendant, creating a rare spiritual gateway.");
      mokshaInvolved.add('Jupiter').add('Ketu');
  }

  // Condition 3: Jupiter in Pisces Ascendant, 12th house has no malefics (BPHS)
  if (ascendantSign === 11 && placements['Jupiter'] === 1) {
      const h12Malefics = h12Occupants.filter(p => maleficsList.includes(p));
      if (h12Malefics.length === 0) {
          mokshaReasons.push("Jupiter is in Pisces Ascendant with an unafflicted 12th house.");
          mokshaInvolved.add('Jupiter');
      }
  }

  // Condition 4: Malefic in 8th, 12th is empty, Lagna Lord in Ascendant
  const lagnaLordMoksha = houseLords[1];
  if (lagnaLordMoksha && placements[lagnaLordMoksha] === 1 && h12Occupants.length === 0) {
      const h8Malefics = h8Occupants.filter(p => maleficsList.includes(p));
      if (h8Malefics.length > 0) {
          mokshaReasons.push(`Lagna Lord (${lagnaLordMoksha}) is strong in Ascendant, the 12th house is empty, and malefic(s) sit in the 8th house.`);
          mokshaInvolved.add(lagnaLordMoksha);
          h8Malefics.forEach(m => {
              if (m) mokshaInvolved.add(m);
          });
      }
  }

  // Condition 5: 10th lord in 4th, and its dispositor (4th lord) is also in 4th
  const lord10 = houseLords[10];
  const lord4 = houseLords[4];
  if (lord10 && lord4 && placements[lord10] === 4 && placements[lord4] === 4) {
      mokshaReasons.push(`10th Lord (${lord10}) is placed in the 4th house alongside the 4th Lord (${lord4}).`);
      mokshaInvolved.add(lord10).add(lord4);
  }

  // Push the combined Moksha Yoga if any conditions were met
  if (mokshaReasons.length > 0) {
      yogas.push({
          name: 'Moksha Yoga',
          type: 'Spiritual',
          involved: Array.from(mokshaInvolved),
          icon: 'Cloud',
          color: 'text-violet-700',
          bg: 'bg-violet-50',
          border: 'border-violet-200',
          desc: `Classical indicators for attaining Moksha (ultimate liberation) are present: ${mokshaReasons.join(' ')}`
      });
  }
  // Condition 6: Special Moksha Combination (Sun 10th, Jup 1st, Sat 6th)
  if (placements['Sun'] === 10 && placements['Jupiter'] === 1 && placements['Saturn'] === 6) {
      const rasi10 = rasiPlacements['Sun']; // Sun is in the 10th, so its sign is the 10th house
      const maleficsToCheck = ['Mars', 'Rahu', 'Ketu']; // Saturn is in 6th, so it cannot aspect the 10th
      
      let is10thAfflicted = false;
      maleficsToCheck.forEach(m => {
          if (placements[m]) {
              // Check for conjunction (occupying the 10th) or aspect
              if (placements[m] === 10 || hasAspect(m, rasi10, rasiPlacements)) {
                  is10thAfflicted = true;
              }
          }
      });

      if (!is10thAfflicted) {
          mokshaReasons.push("Sun is in the 10th house, Jupiter in the Ascendant, and Saturn in the 6th house, with no malefic planets afflicting the 10th house.");
          mokshaInvolved.add('Sun').add('Jupiter').add('Saturn');
      }
  }
  // Condition 7: Jupiter in 9th house, 9th Lord in 12th house
  const lord9Moksha = houseLords[9];
  if (placements['Jupiter'] === 9 && lord9Moksha && placements[lord9Moksha] === 12) {
      mokshaReasons.push(`Jupiter is in the 9th house of Dharma, and the 9th Lord (${lord9Moksha}) is in the 12th house of liberation, creating a powerful yoga for spiritual awakening.`);
      mokshaInvolved.add('Jupiter').add(lord9Moksha);
  }

  // Condition 8: Jupiter conjunct Ketu in 9th or 12th house
  if (placements['Jupiter'] && placements['Ketu'] && placements['Jupiter'] === placements['Ketu']) {
      if (placements['Jupiter'] === 9 || placements['Jupiter'] === 12) {
          mokshaReasons.push(`Jupiter is conjunct Ketu in the ${placements['Jupiter']}th house. This strongly signifies a deep, intuitive spiritual connection and a path towards ultimate liberation.`);
          mokshaInvolved.add('Jupiter').add('Ketu');
      }
  }

  // Rule E: Tapasvi Yoga (Venus, Saturn, Ketu Connection)
  if (placements['Venus'] && placements['Saturn'] && placements['Ketu']) {
     const vRasi = rasiPlacements['Venus'];
     const sRasi = rasiPlacements['Saturn'];
     const kRasi = rasiPlacements['Ketu'];

     // Checks if they are in conjunction or mutual trines (1, 5, 9 axis)
     const isTrineOrConjunct = (r1, r2) => {
        const diff = Math.abs(r1 - r2);
        return diff === 0 || diff === 4 || diff === 8;
     };

     if (isTrineOrConjunct(vRasi, sRasi) && isTrineOrConjunct(sRasi, kRasi) && isTrineOrConjunct(vRasi, kRasi)) {
         yogas.push({
           name: 'Tapasvi Yoga',
           type: 'Spiritual',
           involved: ['Venus', 'Saturn', 'Ketu'],
           icon: 'Flame',
           color: 'text-rose-700',
           bg: 'bg-rose-50',
           border: 'border-rose-200',
           desc: `Venus, Saturn, and Ketu are connected via conjunction or mutual trines. This creates a highly disciplined ascetic (Tapasvi) capable of extreme spiritual penance and selfless devotion.`
         });
     }
  }

  // Rule F: Ascendant Lord Detachment
  const ascLordSpirit = houseLords[1];
  if (ascLordSpirit && placements[ascLordSpirit]) {
      const ascLordRasi = rasiPlacements[ascLordSpirit];
      const isAspectedBySaturn = hasAspect('Saturn', ascLordRasi, rasiPlacements) || getConjuncts(ascLordSpirit).includes('Saturn');
      const beneficPlanets = ['Jupiter', 'Venus', 'Mercury', 'Moon'].filter(b => b !== ascLordSpirit);
      
      let hasBeneficInfluence = false;
      beneficPlanets.forEach(b => {
          if (placements[b] && (hasAspect(b, ascLordRasi, rasiPlacements) || getConjuncts(ascLordSpirit).includes(b))) {
              hasBeneficInfluence = true;
          }
      });

      if (isAspectedBySaturn && !hasBeneficInfluence) {
         yogas.push({
           name: 'Sanyasa Detachment Yoga',
           type: 'Spiritual',
           involved: [ascLordSpirit, 'Saturn'],
           icon: 'EyeOff',
           color: 'text-zinc-700',
           bg: 'bg-zinc-100',
           border: 'border-zinc-300',
           desc: `The Ascendant Lord is solely influenced by Saturn with no benefic relief. This creates a personality naturally detached from materialistic pursuits and inclined towards a solitary or highly spiritual lifestyle.`
         });
      }
  }
  // ==========================================
  // Rule G: Advanced Classical Sanyasa Yogas
  // ==========================================
  const sanyasaReasons = [];
  const sanyasaInvolved = new Set();

  // Condition 1: Saturn in 9th house without any conjunctions
  if (placements['Saturn'] === 9) {
      const satConjuncts = getConjuncts('Saturn');
      if (satConjuncts.length === 0) {
          sanyasaReasons.push("Saturn is placed alone in the 9th house of Dharma, indicating a strict, unattached spiritual path.");
          sanyasaInvolved.add('Saturn');
      }
  }

  // Condition 2: Moon and Jupiter in Ascendant, influenced by Saturn
  if (placements['Moon'] === 1 && placements['Jupiter'] === 1) {
      const isSaturnAspecting = hasAspect('Saturn', rasiPlacements['Moon'], rasiPlacements) || placements['Saturn'] === 9;
      if (isSaturnAspecting) {
          sanyasaReasons.push("Moon and Jupiter are in the Ascendant, heavily influenced by Saturn (either via aspect or Saturn in 9th). Creates profound spiritual wisdom and detachment.");
          sanyasaInvolved.add('Moon').add('Jupiter').add('Saturn');
      }
  }

  // Condition 3: Weak Lagna Lord aspected by Saturn
  const lagnaLordSanyas = houseLords[1];
  if (lagnaLordSanyas) {
      const isWeak = dusthanas.includes(placements[lagnaLordSanyas]) || isDebilitated(lagnaLordSanyas);
      const saturnAspect = hasAspect('Saturn', rasiPlacements[lagnaLordSanyas], rasiPlacements) || getConjuncts(lagnaLordSanyas).includes('Saturn');
      
      if (isWeak && saturnAspect) {
          sanyasaReasons.push(`The Ascendant Lord (${lagnaLordSanyas}) is weak (placed in a Dusthana or Debilitated) and heavily influenced by Saturn, pulling energy away from the material world.`);
          sanyasaInvolved.add(lagnaLordSanyas).add('Saturn');
      }
  }

  // Condition 4: Dispositor of Moon aspected by Venus, while Moon is aspected by Saturn
  if (placements['Moon']) {
      const moonDispositor = RASHI_LORDS[rasiPlacements['Moon']];
      if (moonDispositor && placements[moonDispositor]) {
          const venusAspectsDispositor = hasAspect('Venus', rasiPlacements[moonDispositor], rasiPlacements);
          const saturnAspectsMoon = hasAspect('Saturn', rasiPlacements['Moon'], rasiPlacements);
          
          if (venusAspectsDispositor && saturnAspectsMoon) {
              sanyasaReasons.push("The Moon is aspected by Saturn, while the lord of the Moon's sign receives an aspect from Venus, a classical indicator for renunciation.");
              sanyasaInvolved.add('Moon').add('Saturn').add('Venus');
          }
      }
  }
  // Condition 5: Muni Yoga (Ascendant Lord conjunct 12th Lord)
  const lagnaLordMuni = houseLords[1];
  const lord12 = houseLords[12];
  
  // We ensure lagnaLord is not the same as 12th lord (e.g., Aquarius Ascendant)
  if (lagnaLordMuni && lord12 && lagnaLordMuni !== lord12) {
      if (placements[lagnaLordMuni] === placements[lord12]) {
          sanyasaReasons.push(`Muni Yoga: The Ascendant Lord (${lagnaLordMuni}) is conjunct the 12th Lord of liberation (${lord12}). This alignment indicates the native is pulled towards becoming a Muni (saint or ascetic).`);
          sanyasaInvolved.add(lagnaLordMuni).add(lord12);
      }
  }

  // Push the combined Sanyasa Yoga if any conditions were met
  if (sanyasaReasons.length > 0) {
      yogas.push({
          name: 'Classical Sanyasa Yoga',
          type: 'Spiritual',
          involved: Array.from(sanyasaInvolved),
          icon: 'Wind',
          color: 'text-amber-800',
          bg: 'bg-amber-100',
          border: 'border-amber-300',
          desc: `Specific classical alignments for asceticism and renunciation are present: ${sanyasaReasons.join(' ')}`
      });
  }

  // ==========================================
  // Rule H: Common Spiritual Inclinations (D1)
  // ==========================================

  // 1. Ketu in the 9th House
  if (placements['Ketu'] === 9) {
      yogas.push({
          name: 'Spiritual Seeker',
          type: 'Spiritual',
          involved: ['Ketu'],
          icon: 'Compass',
          color: 'text-teal-700',
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          desc: `Ketu is placed in the 9th house of Dharma. This naturally inclines the mind towards philosophy, religion, and deep spiritual seeking rather than orthodox rituals.`
      });
  }

  // 2. Planets in 8th House (Jupiter, Saturn, Rahu)
  const spiritual8thPlanets = ['Jupiter', 'Saturn', 'Rahu'];
  spiritual8thPlanets.forEach(p => {
      if (placements[p] === 8) {
          yogas.push({
              name: 'Occult & Mystical Inclination',
              type: 'Spiritual',
              involved: [p],
              icon: 'Moon',
              color: 'text-indigo-700',
              bg: 'bg-indigo-50',
              border: 'border-indigo-200',
              desc: `${p} is in the 8th house of mysteries and transformation. This placement often bestows a strong interest in occult sciences, deep spiritual truths, and uncovering the hidden aspects of life.`
          });
      }
  });

  // 3. Sun and Mercury in 9th House
  if (placements['Sun'] === 9 && placements['Mercury'] === 9) {
      yogas.push({
          name: 'Dharmic Wisdom',
          type: 'Spiritual',
          involved: ['Sun', 'Mercury'],
          icon: 'Sun',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `Sun and Mercury are conjunct in the 9th house (Budh Aditya in Dharma Bhava). This illuminating combination makes the native highly righteous, spiritual, and drawn to higher learning and teaching.`
      });
  }

  // ==========================================
  // DIVISIONAL CHART RULES FOR SPIRITUALITY
  // ==========================================

  // 1. D-3 Drekkana Chart Strength
  const d3Lagna = getD3RasiIndex(lDeg);
  const d3Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d3Placements[name] = getD3RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d3AscLord = RASHI_LORDS[d3Lagna];
  const d3H9 = (d3Lagna + 8) % 12;
  const d3H9Planets = Object.keys(d3Placements).filter(p => d3Placements[p] === d3H9);
  const d3H9Aspects = Object.keys(d3Placements).filter(p => hasAspect(p, d3H9, d3Placements));
  const isD3AscLordInH9 = d3Placements[d3AscLord] === d3H9;

  if (d3H9Planets.length > 0 || d3H9Aspects.length > 0 || isD3AscLordInH9) {
    yogas.push({
      name: 'Drekkana Spiritual Vigor (D3)',
      type: 'Spiritual',
      involved: [...new Set([...d3H9Planets, ...d3H9Aspects, d3AscLord])],
      icon: 'Sparkles',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `In the D-3 Drekkana (strength and willpower), ${isD3AscLordInH9 ? `the Ascendant Lord (${d3AscLord}) sits in the 9th house.` : ''} ${d3H9Planets.length > 0 ? `The 9th house of dharma holds ${d3H9Planets.join(', ')}.` : ''} ${d3H9Aspects.length > 0 ? `The 9th house is aspected by ${d3H9Aspects.join(', ')}.` : ''} This signifies active spiritual striving and robust resolve to follow your spiritual path.`
    });
  }

  // 2. D-4 Chaturthamsa Chart Comfort
  const d4Lagna = getD4RasiIndex(lDeg);
  const d4Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d4Placements[name] = getD4RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d4H9 = (d4Lagna + 8) % 12;
  const d4AscLord = RASHI_LORDS[d4Lagna];
  const d4MoonHouse = d4Placements['Moon'];
  const d4H9Benefics = Object.keys(d4Placements).filter(p => d4Placements[p] === d4H9 && ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p));
  const isD4AscLordInH9 = d4Placements[d4AscLord] === d4H9;

  if (d4MoonHouse === d4H9 || isD4AscLordInH9 || d4H9Benefics.length > 0) {
    yogas.push({
      name: 'Chaturthamsa Spiritual Comfort (D4)',
      type: 'Spiritual',
      involved: [...new Set(['Moon', d4AscLord, ...d4H9Benefics])],
      icon: 'Heart',
      color: 'text-sky-700',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      desc: `In the D-4 Chaturthamsa (inner happiness & alignment), ${d4MoonHouse === d4H9 ? 'the Moon resides in the 9th house of devotion.' : ''} ${isD4AscLordInH9 ? `the Ascendant Lord (${d4AscLord}) resides in the 9th house.` : ''} ${d4H9Benefics.length > 0 ? `benefic planet(s) (${d4H9Benefics.join(', ')}) occupy the 9th house.` : ''} This indicates that emotional contentment and peace are strongly rooted in spiritual pursuits and righteousness.`
    });
  }

  // 3. D-12 Dwadasamsa Chart Legacy
  const d12Lagna = getD12RasiIndex(lDeg);
  const d12Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d12Placements[name] = getD12RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d12H9 = (d12Lagna + 8) % 12;
  const d12AscLord = RASHI_LORDS[d12Lagna];
  const d12H9Planets = Object.keys(d12Placements).filter(p => d12Placements[p] === d12H9);
  const isD12AscLordInH9 = d12Placements[d12AscLord] === d12H9;

  if (d12H9Planets.length > 0 || isD12AscLordInH9) {
    yogas.push({
      name: 'Spiritual Ancestral Legacy (D12)',
      type: 'Spiritual',
      involved: [...new Set([...d12H9Planets, d12AscLord])],
      icon: 'Users',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `In the D-12 Dwadasamsa (ancestral karma & roots), ${isD12AscLordInH9 ? `the Ascendant Lord (${d12AscLord}) occupies the 9th house.` : ''} ${d12H9Planets.length > 0 ? `the 9th house of dharma holds ${d12H9Planets.join(', ')}.` : ''} This reveals a strong spiritual inheritance and suggests that your ancestors passed down positive spiritual energy and guidance.`
    });
  }

  // 4. D-16 Shodashamsa Chart Progress & Mentors
  const d16Lagna = getD16RasiIndex(lDeg);
  const d16Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d16Placements[name] = getD16RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d16H9 = (d16Lagna + 8) % 12;
  const d16MoonHouse = d16Placements['Moon'];
  const d16H9Benefics = Object.keys(d16Placements).filter(p => d16Placements[p] === d16H9 && ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p));

  if (d16MoonHouse === d16H9 || d16H9Benefics.length > 0) {
    yogas.push({
      name: 'Kalamsa Guru Grace (D16)',
      type: 'Spiritual',
      involved: [...new Set(['Moon', ...d16H9Benefics])],
      icon: 'Sun',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `In the D-16 Shodashamsa (inner pleasures & progress), ${d16MoonHouse === d16H9 ? 'the Moon resides in the 9th house.' : ''} ${d16H9Benefics.length > 0 ? `benefic planet(s) (${d16H9Benefics.join(', ')}) occupy the 9th house.` : ''} This indicates deep spiritual progression and a supportive, graceful relationship with gurus, teachers, and mentors.`
    });
  }

  // 5. D-9 Navamsha Chart Details
  const d9Lagna = getD9RasiIndex(lDeg);
  const d9Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d9Placements[name] = getD9RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d9AscLord = RASHI_LORDS[d9Lagna];
  const d9H9 = (d9Lagna + 8) % 12;
  const d9H5 = (d9Lagna + 4) % 12;
  const d9H12 = (d9Lagna + 11) % 12;

  // Navamsha Ascendant
  if (d9Placements['Jupiter'] === d9Lagna) {
    yogas.push({
      name: 'Navamsha Jupiter Lagna (D9)',
      type: 'Spiritual',
      involved: ['Jupiter'],
      icon: 'Sparkles',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `Jupiter sits in your Navamsha (D9) Ascendant, indicating a naturally noble, wise, and highly spiritual soul whose inner character is deeply aligned with truth (Satya) and wisdom.`
    });
  }

  if (d9Placements['Ketu'] === d9Lagna) {
    yogas.push({
      name: 'Navamsha Ketu Lagna (D9)',
      type: 'Spiritual',
      involved: ['Ketu'],
      icon: 'Compass',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `Ketu is in your Navamsha (D9) Ascendant. This is a classic indicator of a spiritual seeker who has naturally carried forward detachment, intuition, and spiritual seeking from past incarnations.`
    });
  }

  // Navamsha 9th House (Dharma)
  const d9H9Planets = Object.keys(d9Placements).filter(p => d9Placements[p] === d9H9);
  if (d9H9Planets.length > 0) {
    yogas.push({
      name: 'Navamsha Dharma Bhava (D9)',
      type: 'Spiritual',
      involved: d9H9Planets,
      icon: 'BookOpen',
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `Planets in the 9th house of the D9 Navamsha (${d9H9Planets.join(', ')}) influence your inner spiritual path and dharma. This connection guides your subconscious drive toward righteousness and spiritual practices.`
    });
  }

  // Navamsha 5th House (Mantra/Devotion)
  const d9H5Planets = Object.keys(d9Placements).filter(p => d9Placements[p] === d9H5);
  if (d9H5Planets.length > 0) {
    yogas.push({
      name: 'Navamsha Mantra & Devotion (D9)',
      type: 'Spiritual',
      involved: d9H5Planets,
      icon: 'Heart',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      desc: `Planets in the 5th house of the D9 Navamsha (${d9H5Planets.join(', ')}) signify inner devotion, mantra practices, and spiritual sadhana. They direct your natural inclination towards specific deities or forms of meditation.`
    });
  }

  // Navamsha 12th House (Renunciation/Moksha)
  const d9H12Planets = Object.keys(d9Placements).filter(p => d9Placements[p] === d9H12);
  if (d9H12Planets.length > 0) {
    yogas.push({
      name: 'Navamsha Renunciation Bhava (D9)',
      type: 'Spiritual',
      involved: d9H12Planets,
      icon: 'EyeOff',
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      desc: `Planets in the 12th house of the D9 Navamsha (${d9H12Planets.join(', ')}) highlight your capacity for detachment, letting go of worldly desires, and achieving spiritual liberation (Moksha).`
    });
  }

  // Navamsha Jupiter-Venus Devotion
  if (d9Placements['Jupiter'] !== undefined && d9Placements['Venus'] !== undefined && d9Placements['Jupiter'] === d9Placements['Venus']) {
    yogas.push({
      name: 'Navamsha Jupiter-Venus Devotion (D9)',
      type: 'Spiritual',
      involved: ['Jupiter', 'Venus'],
      icon: 'Sparkles',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      desc: `Jupiter and Venus are conjunct in the D9 Navamsha. This union of the two great Gurus (Brihaspati and Shukracharya) indicates supreme devotion, high spiritual ideals, and guidance on your path.`
    });
  }

  // Navamsha Jupiter Aspect to Lagna/9th
  const jupAspectsD9Lagna = hasAspect('Jupiter', d9Lagna, d9Placements);
  const jupAspectsD9H9 = hasAspect('Jupiter', d9H9, d9Placements);
  if (d9Placements['Jupiter'] !== undefined && (jupAspectsD9Lagna || jupAspectsD9H9)) {
    yogas.push({
      name: 'Navamsha Jupiterian Aspect (D9)',
      type: 'Spiritual',
      involved: ['Jupiter'],
      icon: 'Eye',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `Jupiter casts its divine aspect onto the D9 ${jupAspectsD9Lagna ? 'Lagna' : '9th house'} in the Navamsha, casting a protective and illuminating influence over your spiritual seeking and dharma.`
    });
  }

  // ==========================================
  // D-20 VIMSHAMSHA CHART SPIRITUALITY RULES
  // ==========================================
  const d20Lagna = getD20RasiIndex(lDeg);
  const d20Placements = {};
  planets.forEach(p => {
    const name = p.planet || p.name;
    d20Placements[name] = getD20RasiIndex(p.fullDegree !== undefined ? p.fullDegree : p.rasiIndex * 30 + 15);
  });
  const d20AscLord = RASHI_LORDS[d20Lagna];

  const d20H5 = (d20Lagna + 4) % 12;
  const d20H5Lord = RASHI_LORDS[d20H5];
  const d20H9 = (d20Lagna + 8) % 12;
  const d20H9Lord = RASHI_LORDS[d20H9];
  const d20H12 = (d20Lagna + 11) % 12;
  const d20H8 = (d20Lagna + 7) % 12;
  const d20H6 = (d20Lagna + 5) % 12;

  // Jaimini Karakas: Atmakaraka (highest degree) & Putrakaraka (5th highest)
  const jaiminiPlanets = planets.filter(p => ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(p.planet || p.name));
  const sortedBySignDeg = [...jaiminiPlanets].sort((a, b) => {
    const degA = (a.fullDegree !== undefined ? a.fullDegree : a.rasiIndex * 30 + 15) % 30;
    const degB = (b.fullDegree !== undefined ? b.fullDegree : b.rasiIndex * 30 + 15) % 30;
    return degB - degA;
  });

  const atmakaraka = sortedBySignDeg[0]?.planet || sortedBySignDeg[0]?.name;
  const putrakaraka = sortedBySignDeg[4]?.planet || sortedBySignDeg[4]?.name;

  // 1. D20 Yogas: Rajyoga, Dhan Yoga & Arishta Yoga (Slide 1, Point 2)
  const d20Kendras = [d20Lagna, (d20Lagna + 3) % 12, (d20Lagna + 6) % 12, (d20Lagna + 9) % 12];
  const d20Trikonas = [d20Lagna, (d20Lagna + 4) % 12, (d20Lagna + 8) % 12];
  const d20KendraLords = d20Kendras.map(h => RASHI_LORDS[h]);
  const d20TrikonaLords = d20Trikonas.map(h => RASHI_LORDS[h]);

  let hasD20Rajyoga = false;
  const ryInvolved = [];
  d20KendraLords.forEach(kl => {
    d20TrikonaLords.forEach(tl => {
      if (kl && tl && kl !== tl && d20Placements[kl] === d20Placements[tl]) {
        hasD20Rajyoga = true;
        ryInvolved.push(kl, tl);
      }
    });
  });

  const d20Lord2 = RASHI_LORDS[(d20Lagna + 1) % 12];
  const d20Lord11 = RASHI_LORDS[(d20Lagna + 10) % 12];
  const hasD20DhanaYoga = d20Lord2 && d20Lord11 && d20Placements[d20Lord2] === d20Placements[d20Lord11];
  const isD20Arishta = [d20H6, d20H8, d20H12].includes(d20Placements[d20AscLord]);

  if (hasD20Rajyoga || hasD20DhanaYoga || isD20Arishta) {
    const details = [];
    if (hasD20Rajyoga) details.push(`Rajyoga is present in D20 (conjunction of Kendra & Trikona lords ${[...new Set(ryInvolved)].join(', ')}), granting spiritual authority and realization.`);
    if (hasD20DhanaYoga) details.push(`Dhan Yoga is present in D20 (2nd lord ${d20Lord2} and 11th lord ${d20Lord11} conjunct), indicating spiritual wealth, rich experiences, and inner abundance.`);
    if (isD20Arishta) details.push(`Arishta Yoga is present in D20 (D20 Ascendant Lord ${d20AscLord} is placed in a D20 dusthana house), indicating periods of spiritual blockages, doubts, or testing times that require perseverance.`);

    yogas.push({
      name: 'Vimshamsha Yoga Alignments (D20)',
      type: 'Spiritual',
      involved: [...new Set([...ryInvolved, d20Lord2, d20Lord11, d20AscLord])],
      icon: 'Layers',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `Analysis of yogas inside the D20 Vimshamsha chart reveals: ${details.join(' ')}`
    });
  }

  // 2. D20 Lagna Sign Check from Natal Chart (Slide 1, Point 4)
  const d1H10 = (lagnaIndex + 9) % 12;
  const d1H12 = (lagnaIndex + 11) % 12;
  const d1H4 = (lagnaIndex + 3) % 12;

  if (d20Lagna === d1H10 || d20Lagna === d1H12 || d20Lagna === d1H4) {
    let natalHouseName = "";
    if (d20Lagna === d1H10) natalHouseName = "10th house (Karma Bhava)";
    else if (d20Lagna === d1H12) natalHouseName = "12th house (Moksha/Vyaya Bhava)";
    else if (d20Lagna === d1H4) natalHouseName = "4th house (Sukh Bhava)";

    yogas.push({
      name: 'Vimshamsha Lagna Obstruction',
      type: 'Spiritual',
      involved: [],
      icon: 'AlertTriangle',
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `The D20 Ascendant sign falls in your natal D1 ${natalHouseName}. In Vedic astrology, this sign occupies a dusthana (6th, 8th, or 12th) relative to your natal 5th house of devotion, suggesting that initial worldly duties, domestic attachments, or emotional hurdles may create obstacles on the religious path.`
    });
  }

  // 3. D20 9th Lord Condition (Slide 1, Point 5) & Exalted Saturn in 9th (Slide 1, Point 6)
  const d20H9LordPlanet = planets.find(p => (p.planet || p.name) === d20H9Lord);
  const isD20H9LordRetro = d20H9LordPlanet?.isRetro || false;
  const isD20H9LordWithRahu = d20Placements[d20H9Lord] === d20Placements['Rahu'];

  if (isD20H9LordRetro || isD20H9LordWithRahu) {
    yogas.push({
      name: 'Vimshamsha 9th Lord Affliction',
      type: 'Spiritual',
      involved: [d20H9Lord, 'Rahu'].filter(Boolean),
      icon: 'AlertCircle',
      color: 'text-stone-700',
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      desc: `The D20 9th Lord (${d20H9Lord}) is ${isD20H9LordRetro ? 'retrograde' : ''} ${isD20H9LordWithRahu ? 'associated with Rahu' : ''} in the Vimshamsha. This configuration indicates unconventional spiritual beliefs, potential skepticism towards orthodox religious rituals, or a path of self-guided spirituality.`
    });
  }

  if (d20Placements['Saturn'] === d20H9 && d20Placements['Saturn'] === 6) {
    yogas.push({
      name: 'Exalted Saturn in 9th House (D20)',
      type: 'Spiritual',
      involved: ['Saturn'],
      icon: 'Crown',
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      desc: `Saturn is exalted in the 9th house of the D20 Vimshamsha chart. This is a rare and highly spiritual combination, granting profound patience, absolute ascetic detachment, and supreme discipline in spiritual practices.`
    });
  }

  // 4. D20 Sun Strength (Slide 2, Point 6)
  const sunD20Sign = d20Placements['Sun'];
  if ([0, 4, 7].includes(sunD20Sign)) {
    let strengthDesc = "";
    if (sunD20Sign === 0) strengthDesc = "exalted (Aries)";
    else if (sunD20Sign === 4) strengthDesc = "in its own sign (Leo)";
    else if (sunD20Sign === 7) strengthDesc = "in Scorpio (deep transformation)";

    yogas.push({
      name: 'Vimshamsha Luminous Sun',
      type: 'Spiritual',
      involved: ['Sun'],
      icon: 'Sun',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `The Sun is highly strong in the D20 Vimshamsha chart, placed in its ${strengthDesc} sign. This indicates a high level of spiritual vitality, strong willpower, and pure soul aspiration towards enlightenment.`
    });
  }

  // 5. Jupiter and Ketu in Spiritual Houses (Slide 2, Point 7)
  const jupD20House = d20Placements['Jupiter'];
  const ketuD20House = d20Placements['Ketu'];
  const sparkHouses = [d20H5, d20H8, d20H12];
  const isJupInSpark = sparkHouses.includes(jupD20House);
  const isKetuInSpark = sparkHouses.includes(ketuD20House);

  if (isJupInSpark || isKetuInSpark) {
    const inv = [];
    const hNames = [];
    if (isJupInSpark) {
      inv.push('Jupiter');
      const hNum = jupD20House === d20H5 ? 5 : (jupD20House === d20H8 ? 8 : 12);
      hNames.push(`Jupiter in the ${hNum}th house`);
    }
    if (isKetuInSpark) {
      inv.push('Ketu');
      const hNum = ketuD20House === d20H5 ? 5 : (ketuD20House === d20H8 ? 8 : 12);
      hNames.push(`Ketu in the ${hNum}th house`);
    }

    yogas.push({
      name: 'Vimshamsha Divine Spark',
      type: 'Spiritual',
      involved: inv,
      icon: 'Flame',
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      desc: `Jupiter or Ketu is placed in a key spiritual house in D20 (${hNames.join(' and ')}). This gives a distinct 'divine spark' to your personality, leading to intuitive spiritual realizations and deep mystical insights.`
    });
  }

  // 6. Venus Control of Pleasures (Slide 2, Point 8)
  const venusD20Sign = d20Placements['Venus'];
  const isVenusStrong = [1, 6, 11].includes(venusD20Sign);
  const venusConjuncts = Object.keys(d20Placements).filter(p => d20Placements[p] === venusD20Sign && p !== 'Venus');
  const isVenusAfflicted = venusConjuncts.some(p => ['Rahu', 'Ketu', 'Mars', 'Saturn'].includes(p));

  if (isVenusStrong && !isVenusAfflicted) {
    yogas.push({
      name: 'Vimshamsha Venusian Mastery',
      type: 'Spiritual',
      involved: ['Venus'],
      icon: 'Shield',
      color: 'text-fuchsia-700',
      bg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200',
      desc: `Venus is strong and completely unafflicted in the D20 Vimshamsha. This configuration grants mastery over sensory desires and helps channel creative energies into pure spiritual devotion.`
    });
  }

  // 7. Vacant D20 5th House and Unassociated 5th Lord (Slide 2, Point 9)
  const d20H5Planets = Object.keys(d20Placements).filter(p => d20Placements[p] === d20H5);
  const d20H5LordD20House = d20Placements[d20H5Lord];
  const d20H5LordConjuncts = Object.keys(d20Placements).filter(p => d20Placements[p] === d20H5LordD20House && p !== d20H5Lord);

  if (d20H5Planets.length === 0 && d20H5LordConjuncts.length === 0) {
    yogas.push({
      name: 'Vimshamsha Pure Detachment',
      type: 'Spiritual',
      involved: [d20H5Lord],
      icon: 'EyeOff',
      color: 'text-zinc-700',
      bg: 'bg-zinc-50',
      border: 'border-zinc-200',
      desc: `The D20 5th house is completely vacant, and its lord (${d20H5Lord}) is unassociated with other planets in D20. This indicates an absence of emotional attachments or 'strings' during worship, allowing you to pray with pure, unconditioned intent.`
    });
  }

  // 8. Deity of Worship Suggestion (Slide 2, Point 10)
  const DEITIES = {
    Sun: "Lord Shiva / Lord Rama",
    Moon: "Goddess Parvati / Lord Krishna",
    Mars: "Lord Hanuman / Lord Kartikeya",
    Mercury: "Lord Vishnu",
    Jupiter: "Lord Vishnu / Lord Shiva / Guru",
    Venus: "Goddess Lakshmi / Goddess Durga",
    Saturn: "Lord Kurma / Lord Shiva / Goddess Kali",
    Rahu: "Goddess Durga",
    Ketu: "Lord Ganesha"
  };

  const deitiesToSuggest = [];
  if (d20H5Lord) deitiesToSuggest.push(`${DEITIES[d20H5Lord]} (based on D20 5th Lord ${d20H5Lord})`);
  const d1H5Lord = houseLords[5];
  if (d1H5Lord && d1H5Lord !== d20H5Lord) deitiesToSuggest.push(`${DEITIES[d1H5Lord]} (based on D1 5th Lord ${d1H5Lord})`);

  const D20_EXALTATIONS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const exaltedInD20 = Object.keys(D20_EXALTATIONS).find(p => d20Placements[p] === D20_EXALTATIONS[p]);
  if (exaltedInD20) {
    deitiesToSuggest.push(`${DEITIES[exaltedInD20]} (based on D20 exalted planet ${exaltedInD20})`);
  }

  if (deitiesToSuggest.length > 0) {
    yogas.push({
      name: 'Ishta Devta / Worship Alignment',
      type: 'Spiritual',
      involved: [d20H5Lord, d1H5Lord, exaltedInD20].filter(Boolean),
      icon: 'User',
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `Vimshamsha guidelines suggest your path of worship and connection connects strongly to: ${deitiesToSuggest.join(' or ')}. Worshipping this deity helps channel your devotion and brings spiritual peace.`
    });
  }

  // 9. Astrological Research Conjunction (Slide 3, Point 12)
  const isJupAspectingD20H9 = hasAspect('Jupiter', d20H9, d20Placements);
  const isJupConnectingKetuD20 = d20Placements['Ketu'] === d20H9 || hasAspect('Jupiter', d20Placements['Ketu'], d20Placements) || d20Placements['Jupiter'] === d20Placements['Ketu'];

  const d1H9 = (lagnaIndex + 8) % 12;
  const isJupAspectingD1H9 = hasAspect('Jupiter', d1H9, rasiPlacements);
  const isJupConnectingKetuD1 = rasiPlacements['Ketu'] === d1H9 || hasAspect('Jupiter', rasiPlacements['Ketu'], rasiPlacements) || rasiPlacements['Jupiter'] === rasiPlacements['Ketu'];

  if ((isJupAspectingD20H9 && isJupConnectingKetuD20) || (isJupAspectingD1H9 && isJupConnectingKetuD1)) {
    yogas.push({
      name: 'Astrological Research Vigor (KNR)',
      type: 'Spiritual',
      involved: ['Jupiter', 'Ketu'],
      icon: 'BookOpen',
      color: 'text-teal-800',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `Jupiter aspects the 9th house of higher learning while being associated with Ketu. This is a classical combination (KNR) granting deep intuitive ability, research acumen, and insights into occult sciences, dreams, and astrology.`
    });
  }

  // 10. Jaimini Karaka Conjunction in D1/D9/D20 (Slide 3, Point 13)
  let conjunctCount = 0;
  const conjunctCharts = [];
  if (atmakaraka && putrakaraka && atmakaraka !== putrakaraka) {
    if (rasiPlacements[atmakaraka] === rasiPlacements[putrakaraka]) { conjunctCount++; conjunctCharts.push("D1 Rashi"); }
    if (d9Placements[atmakaraka] === d9Placements[putrakaraka]) { conjunctCount++; conjunctCharts.push("D9 Navamsha"); }
    if (d20Placements[atmakaraka] === d20Placements[putrakaraka]) { conjunctCount++; conjunctCharts.push("D20 Vimshamsha"); }
  }

  if (conjunctCount >= 1) {
    yogas.push({
      name: 'Atmakaraka-Putrakaraka Union',
      type: 'Spiritual',
      involved: [atmakaraka, putrakaraka],
      icon: 'Sparkles',
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      desc: `Your Atmakaraka (${atmakaraka}) and Putrakaraka (${putrakaraka}) are conjunct in ${conjunctCharts.join(' and ')}. This Jaimini spiritual union acts as a catalyst for fast inner growth, purification of desires, and spiritual advancement.`
    });
  }

  // 11. Ketu Association with Benefics & House Lords (Slide 3, Point 14)
  const ketuSignD20 = d20Placements['Ketu'];
  const purityPlanets = [];
  if (d20Placements['Jupiter'] === ketuSignD20) purityPlanets.push('Jupiter');
  if (d20Placements['Mercury'] === ketuSignD20) purityPlanets.push('Mercury');
  if (d20Placements[d20H5Lord] === ketuSignD20) purityPlanets.push(`5th Lord ${d20H5Lord}`);
  if (d20Placements[d20H9Lord] === ketuSignD20) purityPlanets.push(`9th Lord ${d20H9Lord}`);

  if (purityPlanets.length > 0) {
    yogas.push({
      name: 'Vimshamsha Purity of Devotion',
      type: 'Spiritual',
      involved: ['Ketu', ...purityPlanets],
      icon: 'CheckCircle',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `Ketu is associated with ${purityPlanets.join(', ')} in the D20 Vimshamsha. This is a supreme indicator of pure devotion, free from ego-driven motives, prompting swift spiritual progress.`
    });
  }

  // 12. Deviation warning (Slide 3, Point 15)
  const d20Lord6 = RASHI_LORDS[d20H6];
  const d20Lord8 = RASHI_LORDS[d20H8];
  const isMercRetro = planets.find(p => (p.planet || p.name) === 'Mercury')?.isRetro || false;
  const isMoonWithD20DusthanaLords = d20Placements['Moon'] === d20Placements[d20Lord6] || d20Placements['Moon'] === d20Placements[d20Lord8];

  if (isMoonWithD20DusthanaLords && isMercRetro) {
    yogas.push({
      name: 'Devotional Test / Karmic Warning',
      type: 'Spiritual',
      involved: ['Moon', 'Mercury', d20Lord6, d20Lord8].filter(Boolean),
      icon: 'AlertTriangle',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      desc: `Moon is associated with the 6th/8th Lord in D20 alongside a retrograde Mercury. This indicates intense mental battles, inner conflict, or challenges in staying aligned with the righteous path. Regular meditation and self-reflection are highly recommended to steer energy constructively.`
    });
  }

  // 13. D20 Significators Connect (Slide 3, Point 16)
  const isJupSigConnected = d20Placements['Jupiter'] === d20H9 || d20Placements['Jupiter'] === d20Placements[d20H9Lord] || hasAspect('Jupiter', d20H9, d20Placements);
  const isVenusSigConnected = d20H5Lord === 'Venus' || d20Trikonas.includes(d20Placements['Venus']);
  const isKetuSigConnected = d20Placements['Ketu'] === d20H12;

  if (isJupSigConnected || isVenusSigConnected || isKetuSigConnected) {
    const signsList = [];
    if (isJupSigConnected) signsList.push("Jupiter is connected to the 9th house/lord, facilitating religious guidance and guru connection.");
    if (isVenusSigConnected) signsList.push("Venus is connected to the 5th house or trines, generating a beautiful, intense 'addiction' or deep love for the Divine.");
    if (isKetuSigConnected) signsList.push("Ketu sits in the 12th house of liberation, indicating total surrender to the Divine.");

    yogas.push({
      name: 'Vimshamsha Significator Blessings',
      type: 'Spiritual',
      involved: ['Jupiter', 'Venus', 'Ketu'].filter(p => d20Placements[p] !== undefined),
      icon: 'BookOpen',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `Your Vimshamsha chart matches key classical significator criteria: ${signsList.join(' ')}`
    });
  }

  // 14. 7th House from Atmakaraka in D9 (Karakamsa) (Slide 4)
  const akD9Sign = d9Placements[atmakaraka];
  if (akD9Sign !== undefined) {
    const h7FromAKD9 = (akD9Sign + 6) % 12;
    const h7PlanetsD9 = Object.keys(d9Placements).filter(p => d9Placements[p] === h7FromAKD9);

    if (h7PlanetsD9.length > 0) {
      const paths = [];
      h7PlanetsD9.forEach(p => {
        if (p === 'Mars') paths.push("Karma Yoga (action and service)");
        if (p === 'Saturn') paths.push("Hath Yoga (discipline & self-control)");
        if (p === 'Jupiter' || p === 'Sun') paths.push("Gyan Yoga (knowledge and inquiry)");
        if (p === 'Venus' || p === 'Moon' || p === 'Mercury') paths.push("Bhakti Yoga (devotional love)");
        if (p === 'Rahu' || p === 'Ketu') paths.push("Tantric Path (mystical energy)");
      });

      if (paths.length > 0) {
        yogas.push({
          name: 'Karakamsa Spiritual Path',
          type: 'Spiritual',
          involved: [atmakaraka, ...h7PlanetsD9],
          icon: 'Compass',
          color: 'text-emerald-700',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          desc: `In the D9 Navamsha, the 7th house from your Atmakaraka (${atmakaraka}) contains ${h7PlanetsD9.join(', ')}. This reveals your ultimate spiritual path to be centered around: ${[...new Set(paths)].join(', ')}.`
        });
      }
    }
  }

  // 15. D20 Ascendant Lord in Dusthana Check (Slide 5, Points 5, 8)
  const d20AscLordD20House = d20Placements[d20AscLord];
  if ([d20H6, d20H8, d20H12].includes(d20AscLordD20House)) {
    let houseNum = d20AscLordD20House === d20H6 ? 6 : (d20AscLordD20House === d20H8 ? 8 : 12);
    yogas.push({
      name: 'Vimshamsha Ascendant Lord in Dusthana',
      type: 'Spiritual',
      involved: [d20AscLord],
      icon: 'Activity',
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      desc: `The D20 Ascendant Lord (${d20AscLord}) occupies the ${houseNum}th house in D20. This indicates that rather than full renunciation, the native's journey is about resolving deep worldly karma and preparing spiritual roots for the next life.`
    });
  }

  // 16. Saturn and Jupiter Trine Connection in D1/D20 (Slide 5, Point 4)
  const satD20 = d20Placements['Saturn'];
  const jupD20 = d20Placements['Jupiter'];
  const satD1 = rasiPlacements['Saturn'];
  const jupD1 = rasiPlacements['Jupiter'];
  
  const isTrineD20 = satD20 !== undefined && jupD20 !== undefined && [0, 4, 8].includes(Math.abs(satD20 - jupD20));
  const isTrineD1 = satD1 !== undefined && jupD1 !== undefined && [0, 4, 8].includes(Math.abs(satD1 - jupD1));

  if (isTrineD20 || isTrineD1) {
    yogas.push({
      name: 'Dharmic Saturn-Jupiter Trine',
      type: 'Spiritual',
      involved: ['Saturn', 'Jupiter'],
      icon: 'Award',
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `Saturn and Jupiter share a powerful trine (1-5-9) connection in your ${isTrineD20 ? 'D20 Vimshamsha' : 'D1 Rashi'} chart. This alignment connects discipline (Saturn) and wisdom (Jupiter), indicating balanced spiritual growth and dharma.`
    });
  }

  const uniqueYogas = [];
  const seen = new Set();
  yogas.forEach(y => {
    if (!seen.has(y.desc)) {
      seen.add(y.desc);
      uniqueYogas.push(y);
    }
  });

  return uniqueYogas;
};
