// ============================================================================
// 🧘 VEDIC ASTROLOGY YOGA RULES & CANCELLATIONS (YOGA BHANG) ENGINE
// ============================================================================

import { RASHI_LORDS } from './ephemerisEngine';

const EXALTATION_SIGNS = {
  Sun: 0,     // Aries
  Moon: 1,    // Taurus
  Mars: 9,    // Capricorn
  Mercury: 5, // Virgo
  Jupiter: 3, // Cancer
  Venus: 11,  // Pisces
  Saturn: 6   // Libra
};

const DEBILITATION_SIGNS = {
  Sun: 6,     // Libra
  Moon: 7,    // Scorpio
  Mars: 3,    // Cancer
  Mercury: 11,// Pisces
  Jupiter: 9, // Capricorn
  Venus: 5,   // Virgo
  Saturn: 0   // Aries
};

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", 
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", 
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

// Helper to determine if a planet receives aspect (Drishti) from another
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

export const calculateYogas = (planets, lagnaIndex) => {
  if (isNaN(lagnaIndex) || !planets || planets.length === 0) return [];
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

  const isExalted = (pName) => rasiPlacements[pName] === EXALTATION_SIGNS[pName];
  const isDebilitated = (pName) => rasiPlacements[pName] === DEBILITATION_SIGNS[pName];
  const isOwnSign = (pName) => RASHI_LORDS[rasiPlacements[pName]] === pName;

  const kendras = [1, 4, 7, 10];
  const trikonas = [1, 5, 9];
  const dusthanas = [6, 8, 12];

  // ==========================================
  // 1. PARIVARTANA YOGA (EXCHANGES)
  // ==========================================
  const checkedExchanges = new Set();
  Object.keys(placements).forEach(p1 => {
    const h1 = placements[p1];
    const disp1 = houseLords[h1];
    if (disp1 && disp1 !== p1 && placements[disp1]) {
      const h2 = placements[disp1];
      const disp2 = houseLords[h2];
      if (disp2 === p1 && !checkedExchanges.has(p1) && !checkedExchanges.has(disp1)) {
        const involved = [p1, disp1];
        yogas.push({
          name: 'Parivartana Yoga',
          type: 'Exchange',
          involved,
          icon: 'Zap',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          desc: `Mutual exchange between ${p1} (Lord of ${lordships[p1].join(',')}) and ${disp1} (Lord of ${lordships[disp1].join(',')}). Highly powerful connection.`
        });
        checkedExchanges.add(p1);
        checkedExchanges.add(disp1);
      }
    }
  });

  // ==========================================
  // 2. RAJA YOGA (KENDRA-TRIKONA LORD CONNECTION)
  // ==========================================
  Object.keys(placements).forEach(p1 => {
    const p1H = lordships[p1] || [];
    if (p1H.some(h => kendras.includes(h))) {
      getConjuncts(p1).forEach(p2 => {
        if (p1 < p2 && (lordships[p2] || []).some(h => trikonas.includes(h))) {
          const involved = [p1, p2];
          yogas.push({
            name: 'Raja Yoga',
            type: 'Power/Status',
            involved,
            icon: 'Star',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            desc: `${p1} and ${p2} combine Kendra and Trikona energies in House ${placements[p1]}.`
          });
        }
      });
    }
  });

  // ==========================================
  // 3. DHANA YOGA (WEALTH HOUSES CONNECTION)
  // ==========================================
  const wealthH = [1, 2, 5, 9, 11];
  Object.keys(placements).forEach(p1 => {
    const p1H = lordships[p1] || [];
    if (p1H.some(h => wealthH.includes(h))) {
      getConjuncts(p1).forEach(p2 => {
        const p2H = lordships[p2] || [];
        if (
          p1 < p2 && 
          p2H.some(h => wealthH.includes(h)) && 
          !p1H.some(h => dusthanas.includes(h)) && 
          !p2H.some(h => dusthanas.includes(h))
        ) {
          const involved = [p1, p2];
          yogas.push({
            name: 'Dhana Yoga',
            type: 'Wealth',
            involved,
            icon: 'BarChart2',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            desc: `${p1} and ${p2} combine wealth-giving houses in House ${placements[p1]}.`
          });
        }
      });
    }
  });

  // ==========================================
  // 4. ARISHTA YOGA & ARISHTA BHANG (CANCELLATION)
  // ==========================================
  const lagnaLord = houseLords[1];
  if (lagnaLord && placements[lagnaLord] && dusthanas.includes(placements[lagnaLord])) {
    const involved = [lagnaLord];
    const house = placements[lagnaLord];
    const rasiIdx = rasiPlacements[lagnaLord];

    // Check Arishta Bhang (cancellation) conditions:
    const bhangReasons = [];
    
    // Condition A: Aspected by or conjunct Jupiter
    const conjunctJupiter = getConjuncts(lagnaLord).includes('Jupiter');
    const aspectedByJupiter = hasAspect('Jupiter', rasiIdx, rasiPlacements);
    if (conjunctJupiter || aspectedByJupiter) {
      bhangReasons.push(`Lagna Lord is associated with beneficial Jupiter (Conjunct/Drishti)`);
    }

    // Condition B: Aspected by or conjunct Venus
    const conjunctVenus = getConjuncts(lagnaLord).includes('Venus');
    const aspectedByVenus = hasAspect('Venus', rasiIdx, rasiPlacements);
    if (conjunctVenus || aspectedByVenus) {
      bhangReasons.push(`Lagna Lord is associated with Venus`);
    }

    // Condition C: Jupiter is strong in Lagna (House 1)
    if (placements['Jupiter'] === 1) {
      bhangReasons.push(`Jupiter is strong in the 1st House (Lagna)`);
    }

    // Condition D: Lagna Lord is exalted or in own sign
    if (isExalted(lagnaLord)) {
      bhangReasons.push(`Lagna Lord is exalted in Rasi`);
    } else if (isOwnSign(lagnaLord)) {
      bhangReasons.push(`Lagna Lord is placed in its own sign`);
    }

    // Condition E: Benefics in Kendra
    const benefics = ['Jupiter', 'Venus', 'Mercury'];
    const kendraBenefics = benefics.filter(b => placements[b] && kendras.includes(placements[b]));
    if (kendraBenefics.length > 0) {
      bhangReasons.push(`Benefic planet(s) (${kendraBenefics.join(', ')}) placed in Kendras`);
    }

    if (bhangReasons.length > 0) {
      yogas.push({
        name: 'Arishta Bhanga',
        type: 'Protection',
        involved,
        icon: 'CheckCircle2',
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        desc: `Arishta Yoga (caused by Lagna Lord ${lagnaLord} in House ${house}) is Cancelled (Arishta Bhanga) because: ${bhangReasons.join('; ')}. The initial health/struggle obstacles are successfully broken and converted to resilience.`
      });
    } else {
      yogas.push({
        name: 'Arishta Yoga',
        type: 'Challenge',
        involved,
        icon: 'ShieldAlert',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        desc: `Lagna Lord ${lagnaLord} is placed in a Dusthana (House ${house}). Indicates physical/mental strain or initial life obstacles with no strong cancellation factors.`
      });
    }
  }

  // ==========================================
  // 5. NEECHA BHANGA RAJA YOGA (NBRY)
  // ==========================================
  const mainGrahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  mainGrahas.forEach(p => {
    if (isDebilitated(p)) {
      const pRasi = rasiPlacements[p];
      const signLord = RASHI_LORDS[pRasi];
      const exaltationLord = RASHI_LORDS[EXALTATION_SIGNS[p]];
      
      const nbReasons = [];

      // Reason A: Sign lord or exaltation lord is in a Kendra from Lagna
      if (placements[signLord] && kendras.includes(placements[signLord])) {
        nbReasons.push(`Lord of debilitated sign (${signLord}) is in a Kendra from Lagna`);
      }
      if (placements[exaltationLord] && kendras.includes(placements[exaltationLord])) {
        nbReasons.push(`Lord of exaltation sign (${exaltationLord}) is in a Kendra from Lagna`);
      }

      // Reason B: Sign lord or exaltation lord is in a Kendra from Moon
      if (rasiPlacements['Moon'] !== undefined) {
        const moonRasi = rasiPlacements['Moon'];
        if (placements[signLord]) {
          const relMoonH = ((rasiPlacements[signLord] - moonRasi + 12) % 12) + 1;
          if (kendras.includes(relMoonH)) {
            nbReasons.push(`Lord of debilitated sign (${signLord}) is in a Kendra from Moon`);
          }
        }
        if (placements[exaltationLord]) {
          const relMoonH = ((rasiPlacements[exaltationLord] - moonRasi + 12) % 12) + 1;
          if (kendras.includes(relMoonH)) {
            nbReasons.push(`Lord of exaltation sign (${exaltationLord}) is in a Kendra from Moon`);
          }
        }
      }

      // Reason C: Debilitated planet is aspected by or conjunct its sign lord or exaltation lord
      if (getConjuncts(p).includes(signLord)) {
        nbReasons.push(`Debilitated planet is conjunct its sign lord (${signLord})`);
      } else if (hasAspect(signLord, pRasi, rasiPlacements)) {
        nbReasons.push(`Debilitated planet receives aspect from its sign lord (${signLord})`);
      }

      if (nbReasons.length > 0) {
        yogas.push({
          name: 'Neecha Bhanga Raja Yoga',
          type: 'Power/Rise',
          involved: [p, signLord],
          icon: 'Sparkles',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          desc: `Debilitation of ${p} is cancelled (Neecha Bhanga) because: ${nbReasons.join('; ')}. This creates a Raja Yoga leading to rise, success, and resilience after early struggles.`
        });
      }
    }
  });

  // ==========================================
  // 6. GAJA KESARI YOGA
  // ==========================================
  if (placements['Moon'] && placements['Jupiter']) {
    const jupFromMoon = ((rasiPlacements['Jupiter'] - rasiPlacements['Moon'] + 12) % 12) + 1;
    if (kendras.includes(jupFromMoon)) {
      const conjuncts = getConjuncts('Moon').concat(getConjuncts('Jupiter'));
      const isAfflicted = conjuncts.some(c => ['Rahu', 'Ketu', 'Saturn'].includes(c));
      const involved = ['Moon', 'Jupiter'];

      if (isAfflicted) {
        yogas.push({
          name: 'Gaja Kesari Yoga (Afflicted)',
          type: 'Fame/Wisdom',
          involved,
          icon: 'AlertTriangle',
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          desc: `Jupiter is Kendra from Moon (House ${jupFromMoon}), but it is afflicted by Rahu, Ketu or Saturn. Grants intellect and fame, though with emotional tests or challenges.`
        });
      } else {
        yogas.push({
          name: 'Gaja Kesari Yoga',
          type: 'Fame/Wisdom',
          involved,
          icon: 'Sun',
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          desc: `Jupiter is in a Kendra (House ${jupFromMoon}) from the Moon. Grants intelligence, eloquence, wealth, and lasting reputation.`
        });
      }
    }
  }

  // ==========================================
  // 7. PANCHA MAHAPURUSHA YOGAS
  // ==========================================
  const pmpRules = {
    Mars: { name: 'Ruchaka Yoga', signs: [0, 7, 9], desc: 'Courage, leadership, and physical prowess.' },
    Mercury: { name: 'Bhadra Yoga', signs: [2, 5], desc: 'Intellect, communication, and sharp business acumen.' },
    Jupiter: { name: 'Hamsa Yoga', signs: [3, 8, 11], desc: 'Wisdom, purity, and spiritual elevation.' },
    Venus: { name: 'Malavya Yoga', signs: [1, 6, 11], desc: 'Beauty, luxury, charisma, and artistic brilliance.' },
    Saturn: { name: 'Sasha Yoga', signs: [6, 9, 10], desc: 'Discipline, authority, endurance, and mass influence.' }
  };
  Object.keys(pmpRules).forEach(planet => {
    if (
      placements[planet] && 
      kendras.includes(placements[planet]) && 
      pmpRules[planet].signs.includes(rasiPlacements[planet])
    ) {
      const involved = [planet];
      yogas.push({
        name: pmpRules[planet].name,
        type: 'Mahapurusha',
        involved,
        icon: 'Star',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        desc: `${planet} is in Kendra (House ${placements[planet]}) in its own/exalted sign. Grants: ${pmpRules[planet].desc}`
      });
    }
  });

  // ==========================================
  // 8. KEMADRUMA YOGA & KEMADRUMA BHANGA
  // ==========================================
  if (placements['Moon']) {
    const mRasi = rasiPlacements['Moon'];
    const pIn2 = Object.keys(rasiPlacements).filter(p => p !== 'Sun' && p !== 'Moon' && p !== 'Rahu' && p !== 'Ketu' && rasiPlacements[p] === (mRasi + 1) % 12);
    const pIn12 = Object.keys(rasiPlacements).filter(p => p !== 'Sun' && p !== 'Moon' && p !== 'Rahu' && p !== 'Ketu' && rasiPlacements[p] === (mRasi + 11) % 12);
    const conjunct = getConjuncts('Moon').filter(p => p !== 'Sun' && p !== 'Rahu' && p !== 'Ketu');
    
    if (pIn2.length === 0 && pIn12.length === 0 && conjunct.length === 0) {
      const involved = ['Moon'];
      
      // Kemadruma Bhanga (Cancellation) conditions:
      const kbReasons = [];
      const nonLuminaries = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
      const kendraPlanets = nonLuminaries.filter(p => placements[p] && kendras.includes(placements[p]));
      
      if (kendraPlanets.length > 0) {
        kbReasons.push(`Planets (${kendraPlanets.join(', ')}) occupy Kendras from Lagna`);
      }
      
      const moonHouse = placements['Moon'];
      const moonKendraPlanets = nonLuminaries.filter(p => {
        if (placements[p] === undefined) return false;
        const relMoonH = ((rasiPlacements[p] - mRasi + 12) % 12) + 1;
        return kendras.includes(relMoonH);
      });
      if (moonKendraPlanets.length > 0) {
        kbReasons.push(`Planets (${moonKendraPlanets.join(', ')}) occupy Kendras from Moon`);
      }

      if (hasAspect('Jupiter', mRasi, rasiPlacements)) {
        kbReasons.push(`Moon receives beneficial aspect from Jupiter`);
      }

      if (kbReasons.length > 0) {
        yogas.push({
          name: 'Kemadruma Bhanga',
          type: 'Protection',
          involved,
          icon: 'CheckCircle2',
          color: 'text-emerald-700',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          desc: `Kemadruma Yoga (Moon isolated with no adjacent planets) is cancelled (Kemadruma Bhanga) because: ${kbReasons.join('; ')}. The mind gains stability and initial financial/emotional struggles turn into slow building success.`
        });
      } else {
        yogas.push({
          name: 'Kemadruma Yoga',
          type: 'Challenge',
          involved,
          icon: 'Moon',
          color: 'text-slate-600',
          bg: 'bg-slate-100',
          border: 'border-slate-300',
          desc: `Moon is isolated with no planets adjacent or conjunct. Indicates emotional solitude, deep internal focus, or initial periods of feeling unsupported.`
        });
      }
    }
  }

  // ==========================================
  // 9. VIPREET RAJA YOGA (VRY)
  // ==========================================
  // Lords of 6, 8, 12 placed in other Dusthana houses
  const dusthanaLords = {
    6: houseLords[6],
    8: houseLords[8],
    12: houseLords[12]
  };

  Object.entries(dusthanaLords).forEach(([houseNum, lord]) => {
    if (lord && placements[lord]) {
      const currentHouse = placements[lord];
      if (dusthanas.includes(currentHouse)) {
        // Look at other non-dusthana conjuncts. A true VRY should not be conjunct with benefic lords of other houses
        const conjuncts = getConjuncts(lord);
        const nonDusthanaConjuncts = conjuncts.filter(c => {
          const housesOwned = lordships[c] || [];
          return !housesOwned.some(h => dusthanas.includes(h));
        });

        if (nonDusthanaConjuncts.length === 0) {
          let yogaName = 'Vipreet Raja Yoga';
          let subtype = '';
          if (houseNum === '6') { yogaName = 'Harsha Yoga'; subtype = 'Victory/Health'; }
          else if (houseNum === '8') { yogaName = 'Sarala Yoga'; subtype = 'Intellect/Mystery'; }
          else if (houseNum === '12') { yogaName = 'Vimala Yoga'; subtype = 'Independence/Wealth'; }

          yogas.push({
            name: yogaName,
            type: 'Vipreet Raja',
            involved: [lord],
            icon: 'Zap',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-200',
            desc: `Lord of House ${houseNum} (${lord}) is placed in Dusthana House ${currentHouse} without major benefic afflictions. Grants sudden progress, victory over obstacles, and wealth arising from struggles.`
          });
        }
      }
    }
  });

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
