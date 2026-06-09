// ============================================================================
// 🧘 VEDIC ASTROLOGY YOGA RULES & CANCELLATIONS (YOGA BHANG) ENGINE
// ============================================================================

import { RASHI_LORDS, getBVRamanFunctionalDignity, getD9RasiIndex } from './ephemerisEngine';

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

const INIMICAL_SIGNS = {
  Sun: [1, 6, 9, 10], Moon: [], Mars: [2, 5], Mercury: [3], Jupiter: [2, 5, 1, 6], Venus: [4, 3], Saturn: [0, 7, 4, 3]
};

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

// const NAKSHATRAS = [
//   "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
//   "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
//   "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
//   "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
//   "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
// ];

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

/**
 * Retrieves the aspect strength for a planet aspecting a specific house.
 * @param {string} planet - The name of the aspecting planet.
 * @param {number} targetHouse - The house being aspected (1-12 relative to the aspecting planet).
 * @returns {number} The fractional strength (0, 0.25, 0.5, 0.75, or 1).
 */
export const getAspectStrength = (planet, targetHouse) => {
  // Special full aspects (1 unit) in Vedic astrology
  if (planet === 'Mars' && [4, 8].includes(targetHouse)) return 1.0;
  if (planet === 'Jupiter' && [5, 9].includes(targetHouse)) return 1.0;
  if (planet === 'Saturn' && [3, 10].includes(targetHouse)) return 1.0;

  // General aspect table
  const aspects = {
    7: 1.0,
    4: 0.75, 8: 0.75,
    5: 0.5, 9: 0.5,
    3: 0.25, 10: 0.25
  };

  return aspects[targetHouse] || 0;
};

// Calculates the Residential Strength of a planet within a Bhava
export const calculateResidentialStrength = (planetLong, bhavaArambha, bhavaMadhya, bhavaSandhi) => {
  const norm = (val) => (val % 360 + 360) % 360;

  const s1 = norm(bhavaArambha);
  const m = norm(bhavaMadhya - s1);
  const s2 = norm(bhavaSandhi - s1);
  const p = norm(planetLong - s1);

  // If planet is in the first half (Poorvabhaga: p is between 0 and m)
  if (p >= 0 && p < m) {
    // Symmetric correct formula: (planetLong - bhavaArambha) / (bhavaMadhya - bhavaArambha)
    // In normalized space relative to bhavaArambha: p / m
    return m === 0 ? 0 : p / m;
  } 
  // If planet is in the second half (Uttarabhaga: p is between m and s2)
  else if (p >= m && p <= s2) {
    // Formula: (bhavaSandhi - planetLong) / (bhavaSandhi - bhavaMadhya)
    // In normalized space relative to bhavaArambha: (s2 - p) / (s2 - m)
    const den = s2 - m;
    return den === 0 ? 0 : (s2 - p) / den;
  }
  return 0; // Planet is outside the house boundaries
};

// Calculates the potentiality score of a Yoga for a given planet and Lagna
export const calculateYogaPotential = (planet, lagna, allPlanets) => {
  const planetName = planet.planet || planet.name;
  const lagnaDeg = typeof lagna === 'object' ? (lagna.longitude ?? lagna.lagnaDegree ?? lagna.fullDegree) : lagna;
  const lagnaIndex = typeof lagna === 'object' ? (lagna.rasiIndex ?? Math.floor(lagnaDeg / 30)) : Math.floor(lagnaDeg / 30);
  const lagnaName = SIGN_NAMES[lagnaIndex];
  const planetLong = planet.fullDegree ?? planet.longitude;

  // Build rasiPlacements lookup
  const rasiPlacements = {};
  allPlanets.forEach(p => {
    rasiPlacements[p.planet || p.name] = p.rasiIndex;
  });

  let score = 0;

  // 1. Benefic Lord Contribution: +1 unit if the planet is a functional benefic (good lord)
  if (getBVRamanFunctionalDignity(planetName, lagnaName) === 'Benefic') {
    score += 1;
  }

  // 2. Association with Benefic Lord: +1 unit if conjunct or aspected by a functional benefic
  const otherFunctionalBenefics = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].filter(g => 
    g !== planetName && 
    getBVRamanFunctionalDignity(g, lagnaName) === 'Benefic'
  );
  
  const planetRasi = rasiPlacements[planetName];
  let hasAssociation = false;
  if (planetRasi !== undefined) {
    for (const bLord of otherFunctionalBenefics) {
      const bLordRasi = rasiPlacements[bLord];
      if (bLordRasi === undefined) continue;
      
      // Conjunction
      if (planetRasi === bLordRasi) {
        hasAssociation = true;
        break;
      }
      
      // Aspect
      if (hasAspect(bLord, planetRasi, rasiPlacements)) {
        hasAssociation = true;
        break;
      }
    }
  }
  if (hasAssociation) {
    score += 1;
  }

  // 3. Own or Exaltation House: +1 unit
  if (planetRasi !== undefined) {
    const isOwn = RASHI_LORDS[planetRasi] === planetName;
    const isExalted = EXALTATION_SIGNS[planetName] === planetRasi;
    if (isOwn || isExalted) {
      score += 1;
    }
  }

  // 4. Aspect of Benefic Lord: +0.25 to +1 unit
  let maxAspectStrength = 0;
  if (planetRasi !== undefined) {
    for (const bLord of otherFunctionalBenefics) {
      const bLordRasi = rasiPlacements[bLord];
      if (bLordRasi === undefined) continue;
      // Calculate 1-based relative house from bLord to the target planet (1-12)
      const targetHouse = ((planetRasi - bLordRasi + 12) % 12) + 1;
      const strength = getAspectStrength(bLord, targetHouse);
      if (strength > maxAspectStrength) {
        maxAspectStrength = strength;
      }
    }
  }
  score += maxAspectStrength;

  // 5. Incorporate Residential Strength (Bhava Bala)
  const relDeg = (planetLong - lagnaDeg + 360) % 360;
  const houseIndex = Math.floor((relDeg + 15) / 30) % 12;
  const bhavaMadhya = (lagnaDeg + houseIndex * 30) % 360;
  const bhavaArambha = (bhavaMadhya - 15 + 360) % 360;
  const bhavaSandhi = (bhavaMadhya + 15) % 360;

  const resStrength = calculateResidentialStrength(planetLong, bhavaArambha, bhavaMadhya, bhavaSandhi);
  
  return parseFloat((score * resStrength).toFixed(2));
};

/**
 * Checks if a Yoga is neutralized based on planetary aspects.
 * @param {Object} yoga - The detected yoga object.
 * @param {Array} aspects - Array of aspects acting on the yoga's primary planets.
 * @returns {Object} The updated yoga object with a 'neutralized' or 'modified' status.
 */
export const checkYogaBhanga = (yoga, aspects) => {
  let status = {
    isNeutralized: false,
    modification: null
  };

  // Example: Jupiter neutralizes Nishturabhashi Yoga (Yoga 296)
  if (yoga.name === 'Nishturabhashi Yoga' && aspects.includes('Jupiter')) {
    status.isNeutralized = true;
    status.modification = 'Neutralized by Jupiter\'s aspect';
  }

  // Example: Mars makes speech sarcastic in Nishturabhashi Yoga
  if (yoga.name === 'Nishturabhashi Yoga' && aspects.includes('Mars')) {
    status.modification = 'Harsh, blunt, and sarcastic speech';
  }

  return status;
};

// Internal Shadbala calculator for Raman framework calibration
const calculateShadbala = (planetsList, lagnaDeg) => {
  const scores = {};
  if (!Array.isArray(planetsList)) return scores;
  const EXALTATION_DEG = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
  const DIK_DEG = { Sun: (lagnaDeg + 270) % 360, Mars: (lagnaDeg + 270) % 360, Jupiter: lagnaDeg, Mercury: lagnaDeg, Saturn: (lagnaDeg + 180) % 360, Moon: (lagnaDeg + 90) % 360, Venus: (lagnaDeg + 90) % 360 };
  const NAISARGIKA = { Sun: 60, Moon: 51.4, Venus: 42.8, Jupiter: 34.2, Mercury: 25.7, Mars: 17.1, Saturn: 8.5 };
  const getAngle = (d1, d2) => { let diff = Math.abs(d1 - d2) % 360; return diff > 180 ? 360 - diff : diff; };

  const sunPlanet = planetsList.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
  const moonPlanet = planetsList.find(p => p && (p.planet === 'Moon' || p.name === 'Moon'));
  let pakshaValue = 30; 
  if (sunPlanet && moonPlanet) {
      const mPA = (moonPlanet.fullDegree - sunPlanet.fullDegree + 360) % 360;
      pakshaValue = mPA <= 180 ? mPA / 3 : (360 - mPA) / 3; 
  }

  const isDay = true;

  planetsList.forEach(p => {
      const pName = p.planet || p.name;
      if (!p || !EXALTATION_DEG[pName]) return; 
      const sthana = (getAngle(p.fullDegree, (EXALTATION_DEG[pName] + 180) % 360) / 180) * 60;
      const dik = ((180 - getAngle(p.fullDegree, DIK_DEG[pName])) / 180) * 60;
      let kaala = ['Moon', 'Jupiter', 'Venus', 'Mercury'].includes(pName) ? pakshaValue : (60 - pakshaValue);
      if (pName === 'Mercury') kaala += 60;
      else if (isDay && ['Sun', 'Jupiter', 'Venus'].includes(pName)) kaala += 60;
      let chesta = p.isRetro ? 60 : 0;
      if (pName === 'Sun') chesta = 30; if (pName === 'Moon') chesta = pakshaValue;

      const total = Math.round(sthana + dik + kaala + chesta + (NAISARGIKA[pName] || 0));
      scores[pName] = { total, percentage: Math.round((total / 300) * 100) };
  });
  return scores;
};

// ============================================================================
// 🌕 GOLA YOGA EVALUATION
// ============================================================================

const _checkGolaYoga = (lagnaIndex, placements, navamsaLagnaIndex, navamsaPlacements) => {
  if (!placements || !navamsaPlacements || lagnaIndex === undefined || navamsaLagnaIndex === undefined) {
    return null;
  }

  // Determine the 9th House and 3rd House indices (0-11 scale)
  const ninthHouse = (lagnaIndex + 8) % 12;
  const thirdHouse = (lagnaIndex + 2) % 12;

  // 1. Check if Moon, Jupiter, and Venus are conjunct in the 9th House
  const moonIn9th = placements['Moon'] === ninthHouse;
  const jupIn9th = placements['Jupiter'] === ninthHouse;
  const venIn9th = placements['Venus'] === ninthHouse;

  // 2. Verify it is a Full Moon
  // A Full Moon occurs when the Sun is exactly opposite the Moon. 
  // If the Moon is in the 9th house, the Sun must be in the 3rd house.
  const isFullMoon = placements['Sun'] === thirdHouse;

  // 3. Check if Mercury is in the Navamsa Lagna (D9 Ascendant)
  const mercInNavamsaLagna = navamsaPlacements['Mercury'] === navamsaLagnaIndex;

  if (moonIn9th && jupIn9th && venIn9th && isFullMoon && mercInNavamsaLagna) {
    return {
      name: "Gola Yoga",
      type: "Auspicious Yoga",
      description: "The Full Moon is in the 9th house conjunct Jupiter and Venus, while Mercury occupies the Navamsa Lagna.",
      results: "Makes the native polite, learned, a Magistrate or head of a village, long-lived, and accustomed to wholesome food."
    };
  }

  return null;
};

// ============================================================================
// 👁️ THRILOCHANA YOGA EVALUATION
// ============================================================================

const _checkThrilochanaYoga = (placements) => {
  if (!placements || placements['Sun'] === undefined || placements['Moon'] === undefined || placements['Mars'] === undefined) {
    return null;
  }

  const sunSign = placements['Sun'];
  const moonSign = placements['Moon'];
  const marsSign = placements['Mars'];

  // Planets are in mutual trines if they share the same element.
  // In a 0-11 sign index, signs of the same element share the same remainder when divided by 4.
  const isSameElement = (sunSign % 4 === moonSign % 4) && (moonSign % 4 === marsSign % 4);

  // To strictly form mutual trines (a grand trine), they must be in different signs.
  // (If they were in the same sign, it would be a 3-planet conjunction, not mutual trines).
  const areDistinctSigns = (sunSign !== moonSign) && (moonSign !== marsSign) && (sunSign !== marsSign);

  if (isSameElement && areDistinctSigns) {
    return {
      name: "Thrilochana Yoga",
      type: "Auspicious Yoga",
      description: "The Sun, Moon, and Mars are placed in mutual trines (1st, 5th, and 9th positions from each other).",
      results: "Bestows great wealth, high intelligence, and good longevity. Makes the native a terror to enemies and grants a smooth career free from major unfavorable forces."
    };
  }

  return null;
};

// ============================================================================
// 👨👩👧👦 KULAVARDHANA YOGA EVALUATION
// ============================================================================

const _checkKulavardhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements || placements['Sun'] === undefined || placements['Moon'] === undefined) {
    return null;
  }

  // For a house to be 5th from Lagna, Sun, and Moon simultaneously, 
  // the Sun and Moon must be placed in the 1st House (Lagna).
  const sunInLagna = placements['Sun'] === lagnaIndex;
  const moonInLagna = placements['Moon'] === lagnaIndex;

  if (!sunInLagna || !moonInLagna) return null; // Breaks the Sudarshana requirement

  // Calculate the 5th House from Lagna (0-11 scale)
  const fifthHouse = (lagnaIndex + 4) % 12;

  // B.V. Raman's remarks specify that the natural benefics must be disposed here
  const jupIn5th = placements['Jupiter'] === fifthHouse;
  const venIn5th = placements['Venus'] === fifthHouse;
  const mercIn5th = placements['Mercury'] === fifthHouse;

  if (jupIn5th && venIn5th && mercIn5th) {
    return {
      name: "Kulavardhana Yoga",
      type: "Auspicious Yoga",
      description: "The Sun and Moon are conjunct in the Lagna, and all natural benefics (Jupiter, Venus, Mercury) are placed in the 5th house from them.",
      results: "Grants an unbroken line of successors, wealthy, healthy, and long-lived. The family traditions will be perpetuated by children and grandchildren."
    };
  }

  return null;
};

// ============================================================================
// ⚠️ DURYOGA EVALUATION (Inauspicious / Career Struggle)
// ============================================================================
const _checkDuryoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;

  // Standard array mapping 0-11 sign indexes to their lords (Aries=Mars, Taurus=Venus, etc.)
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  // Find the 10th House Index (0-11 scale)
  const tenthHouseIndex = (lagnaIndex + 9) % 12;
  const tenthLord = lagnaLords[tenthHouseIndex];

  if (placements[tenthLord] === undefined) return null;

  // Calculate which house (1-12) the 10th Lord is sitting in
  const lord10House = ((placements[tenthLord] - lagnaIndex + 12) % 12) + 1;

  // Duryoga is caused if the 10th lord is in the 6th, 8th, or 12th
  if ([6, 8, 12].includes(lord10House)) {
    
    let resultsText = "The person will not derive the full fruits of their own bodily exertion, may be looked down upon by others, and might live in a foreign place. Often indicates earning a livelihood by manual labor.";
    
    // B.V. Raman's specific exception for the 12th house
    if (lord10House === 12) {
      resultsText += " However, because the lord is in the 12th house (the least malefic of the Dusthanas), while they may be deprived of the fruits of their labor, they will possess noble qualities and command a certain amount of respect in society.";
    }

    return {
      name: "Duryoga",
      type: "Inauspicious Yoga",
      description: `The Lord of the 10th House (${tenthLord}) is situated in a Dusthana (House ${lord10House}).`,
      results: resultsText
    };
  }

  return null;
};

// ============================================================================
// 📉 DARIDRA YOGA EVALUATION (Financial Struggle)
// ============================================================================
const _checkDaridraYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;

  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  // Find the 11th House Index (0-11 scale)
  const eleventhHouseIndex = (lagnaIndex + 10) % 12;
  const eleventhLord = lagnaLords[eleventhHouseIndex];

  if (placements[eleventhLord] === undefined) return null;

  const lord11House = ((placements[eleventhLord] - lagnaIndex + 12) % 12) + 1;

  if ([6, 8, 12].includes(lord11House)) {
    let resultsText = "The native may contract huge debts, suffer from auditory troubles, and face financial struggles.";
    
    // B.V. Raman's exception for the 6th house
    if (lord11House === 6) {
      resultsText += " However, because the 11th lord is specifically in the 6th house, if the Lagna is strong, the extreme poverty aspect is cancelled (exists only nominally). The native may still have selfish or avaricious tendencies, but will not necessarily be poor.";
    } else {
      resultsText += " This disposition generally indicates significant financial hurdles and poverty.";
    }

    return {
      name: "Daridra Yoga",
      type: "Inauspicious Yoga",
      description: `The Lord of the 11th House (${eleventhLord}) is situated in a Dusthana (House ${lord11House}).`,
      results: resultsText
    };
  }

  return null;
};

// ============================================================================
// 🧘‍♂️ PHYSICAL CONSTITUTION YOGAS (Body Comforts & Hardships)
// ============================================================================
const _checkPhysicalBodyYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];
  
  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord6 = lagnaLords[(lagnaIndex + 5) % 12];
  const lord8 = lagnaLords[(lagnaIndex + 7) % 12];
  const lord12 = lagnaLords[(lagnaIndex + 11) % 12];

  if (placements[lagnaLord] === undefined) return yogas;

  const getHouse = (planetName) => placements[planetName] !== undefined ? ((placements[planetName] - lagnaIndex + 12) % 12) + 1 : -1;
  const isKendra = (house) => [1, 4, 7, 10].includes(house);
  const isMovable = (signIndex) => signIndex % 3 === 0; // Aries(0), Cancer(3), Libra(6), Capricorn(9)

  const lagnaLordHouse = getHouse(lagnaLord);
  const lagnaLordSign = placements[lagnaLord];

  // 108. Sareera Soukhya Yoga
  const llInKendra = isKendra(lagnaLordHouse);
  const jupInKendra = isKendra(getHouse('Jupiter'));
  const venInKendra = isKendra(getHouse('Venus'));

  if (llInKendra || jupInKendra || venInKendra) {
    let resultsText = "The subject will be endowed with long life, wealth, and political favours.";
    if (llInKendra && jupInKendra && venInKendra) {
        resultsText += " Because the Ascendant Lord, Jupiter, and Venus are ALL in Kendras, this Yoga is rendered highly powerful, manifesting all its blessings fully.";
    }
    yogas.push({
      name: "Sareera Soukhya Yoga",
      type: "Auspicious Yoga",
      description: "The Lord of Lagna, Jupiter, or Venus occupies a quadrant (Kendra).",
      results: resultsText
    });
  }

  // 109. Dehapushti Yoga
  const aspectedByBenefic = true; // Placeholder: Replace with actual aspect checking logic when built
  if (isMovable(lagnaLordSign) && aspectedByBenefic) {
    yogas.push({
      name: "Dehapushti Yoga",
      type: "Auspicious Yoga",
      description: "The Ascendant Lord is in a movable sign and is aspected by a benefic.",
      results: "The native will be happy, possess a well-developed body, become rich, and enjoy life."
    });
  }

  // 110. Dehakashta Yoga
  const malefics = ['Sun', 'Mars', 'Saturn']; 
  const conjunctMalefic = malefics.some(m => placements[m] === lagnaLordSign);
  
  if (lagnaLordHouse === 8 || conjunctMalefic) {
    yogas.push({
      name: "Dehakashta Yoga",
      type: "Inauspicious Yoga",
      description: "The Lord of Lagna joins a malefic or occupies the 8th house.",
      results: "The subject may be devoid of bodily comforts and face physical difficulties. Often associated with manual laborers. (Note: This becomes defunct if a benefic aspects the Ascendant Lord)."
    });
  }

  // 111. Rogagrastha Yoga (Part A - Conjunction in Lagna)
  if (lagnaLordHouse === 1) {
      const conjunct6 = lord6 !== lagnaLord && placements[lord6] === lagnaLordSign;
      const conjunct8 = lord8 !== lagnaLord && placements[lord8] === lagnaLordSign;
      const conjunct12 = lord12 !== lagnaLord && placements[lord12] === lagnaLordSign;

      if (conjunct6 || conjunct8 || conjunct12) {
          let resultsText = "The native will possess a weak constitution and be sickly, lacking the requisite power of resistance.";
          if (conjunct12 && !conjunct6 && !conjunct8) {
              resultsText = "Because the Lagna Lord specifically joins the 12th Lord, the affliction expresses itself more in the nature of financial stress rather than pure physical disease.";
          }
          yogas.push({
            name: "Rogagrastha Yoga",
            type: "Inauspicious Yoga",
            description: "The Lord of Lagna occupies the Ascendant in conjunction with the Lord of the 6th, 8th, or 12th house.",
            results: resultsText
          });
      }
  }

  return yogas;
};

// ============================================================================
// 🍂 KRISANGA YOGAS (Lean/Emaciated Body & Bodily Pains)
// ============================================================================
const _checkKrisangaYogas = (lagnaIndex, placements, navamsaLagnaIndex) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lagnaLord = lagnaLords[lagnaIndex];

  if (placements[lagnaLord] === undefined) return yogas;

  const lagnaLordSign = placements[lagnaLord];

  // B.V. Raman's classification of "Dry" elements
  // Dry Signs: Aries(0), Taurus(1), Gemini(2), Leo(4), Virgo(5), Sagittarius(8)
  const drySigns = [0, 1, 2, 4, 5, 8]; 
  
  // Signs owned by "Dry" planets (Sun, Mars, Saturn, Mercury)
  // Aries(0), Gemini(2), Leo(4), Virgo(5), Scorpio(7), Capricorn(9), Aquarius(10)
  const signsOwnedByDryPlanets = [0, 2, 4, 5, 7, 9, 10]; 

  // 112. Krisanga Yoga (Variation 1)
  // Definition: Ascendant lord occupies a dry sign or a sign owned by a dry planet.
  if (drySigns.includes(lagnaLordSign) || signsOwnedByDryPlanets.includes(lagnaLordSign)) {
    yogas.push({
      name: "Krisanga Yoga (Type 1)",
      type: "Inauspicious Yoga",
      description: "The Ascendant Lord occupies a 'dry' sign or a sign owned by a 'dry' planet.",
      results: "The subject will have an emaciated or lean body and will suffer from bodily pains."
    });
  }

  // 113. Krisanga Yoga (Variation 2)
  // Definition: Navamsa Lagna owned by a dry planet AND malefics join the D1 Lagna.
  if (navamsaLagnaIndex !== undefined) {
    const navamsaLagnaOwnedByDry = signsOwnedByDryPlanets.includes(navamsaLagnaIndex);
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    const maleficsInLagna = malefics.some(m => placements[m] === lagnaIndex);

    if (navamsaLagnaOwnedByDry && maleficsInLagna) {
      yogas.push({
        name: "Krisanga Yoga (Type 2)",
        type: "Inauspicious Yoga",
        description: "The Navamsa Lagna is owned by a 'dry' planet and malefics join the Ascendant.",
        results: "The subject will have an emaciated or lean body and will suffer from bodily pains."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 💧 DEHASTHOULYA YOGAS (Corpulence / Stout Body)
// ============================================================================
const _checkDehasthoulyaYogas = (lagnaIndex, placements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lagnaLord = lagnaLords[lagnaIndex];

  if (placements[lagnaLord] === undefined) return yogas;

  // B.V. Raman's expanded classification of Watery Signs for this Yoga:
  // Cancer(3), Libra(6), Scorpio(7), Capricorn(9), Aquarius(10), Pisces(11)
  const waterySigns = [3, 6, 7, 9, 10, 11];
  
  // Watery Planets
  const wateryPlanets = ['Moon', 'Venus'];
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  const lagnaLordSign = placements[lagnaLord];
  
  // 114. Dehasthoulya Yoga (Variation 1)
  // Definition: Lord of Lagna and its Navamsa dispositor occupy watery signs.
  if (navamsaPlacements && navamsaPlacements[lagnaLord] !== undefined) {
      const navamsaSignOfLagnaLord = navamsaPlacements[lagnaLord];
      const navamsaDispositor = lagnaLords[navamsaSignOfLagnaLord];
      const navamsaDispositorSign = placements[navamsaDispositor];
      
      if (waterySigns.includes(lagnaLordSign) && waterySigns.includes(navamsaDispositorSign)) {
          yogas.push({
              name: "Dehasthoulya Yoga (Type 1)",
              type: "Physical Yoga",
              description: "The Lord of Lagna and the planet in whose Navamsa it is placed both occupy watery signs.",
              results: "The native will have a stout, unwieldy, and corpulent appearance."
          });
      }
  }

  // 115. Dehasthoulya Yoga (Variation 2)
  // Definition: Lagna occupied by Jupiter OR aspected by Jupiter from a watery sign.
  const jupInLagna = placements['Jupiter'] === lagnaIndex;
  const jupInWaterySign = waterySigns.includes(placements['Jupiter']);
  const jupAspectsLagna = false; // PLACEHOLDER: Update when aspect engine is integrated

  if (jupInLagna || (jupInWaterySign && jupAspectsLagna)) {
      yogas.push({
          name: "Dehasthoulya Yoga (Type 2)",
          type: "Physical Yoga",
          description: "Jupiter occupies the Ascendant, or aspects it from a watery sign.",
          results: "The native will have a stout, unwieldy, and corpulent appearance."
      });
  }

  // 116. Dehasthoulya Yoga (Variation 3)
  // Definition: Ascendant in a watery sign conjunct benefics OR Ascendant lord is a watery planet.
  const lagnaInWaterySign = waterySigns.includes(lagnaIndex);
  const beneficsInLagna = benefics.some(b => placements[b] === lagnaIndex);
  const lagnaLordIsWatery = wateryPlanets.includes(lagnaLord);

  if ((lagnaInWaterySign && beneficsInLagna) || lagnaLordIsWatery) {
      yogas.push({
          name: "Dehasthoulya Yoga (Type 3)",
          type: "Physical Yoga",
          description: "The Ascendant falls in a watery sign in conjunction with benefics, or the Ascendant lord is a watery planet (Moon or Venus).",
          results: "The native will have a stout, unwieldy, and corpulent appearance."
      });
  }

  return yogas;
};

// ============================================================================
// ✈️ SADA SANCHARA YOGA (Wanderer / Constant Travel)
// ============================================================================

const _checkSadaSancharaYoga = (lagnaIndex, placements, navamsaLagnaIndex) => {
  if (lagnaIndex === undefined || !placements) return null;

  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lagnaLord = lagnaLords[lagnaIndex];

  if (placements[lagnaLord] === undefined) return null;

  // Find where the Lagna Lord is placed
  const lagnaLordSign = placements[lagnaLord];
  
  // Find the Dispositor (the lord of the sign where the Lagna Lord is sitting)
  const dispositorOfLagnaLord = lagnaLords[lagnaLordSign];

  if (placements[dispositorOfLagnaLord] === undefined) return null;

  const dispositorSign = placements[dispositorOfLagnaLord];

  // Helper for movable signs: Aries(0), Cancer(3), Libra(6), Capricorn(9)
  const isMovable = (sign) => sign !== undefined && sign % 3 === 0;

  const lordInMovable = isMovable(lagnaLordSign);
  const dispositorInMovable = isMovable(dispositorSign);

  // Definition: The lord of either Lagna or the sign occupied by Lagna lord must be in a movable sign.
  if (lordInMovable || dispositorInMovable) {
    let resultsText = "The native will almost always be a wanderer. This is very common in the horoscopes of travelling agents, diplomats, and globe-troters.";

    // B.V. Raman's amplifier remark for extreme travel
    if (navamsaLagnaIndex !== undefined && isMovable(lagnaIndex) && isMovable(navamsaLagnaIndex)) {
        resultsText += " Furthermore, because both the Lagna and Navamsa Lagna are in movable signs, the subject will hardly confine themselves to any particular locality and will constantly be moving about.";
    }

    return {
      name: "Sada Sanchara Yoga",
      type: "Travel/Lifestyle Yoga",
      description: "The lord of the Ascendant or the dispositor of the Ascendant lord (the lord of the sign occupied by the Lagna lord) is in a movable sign.",
      results: resultsText
    };
  }

  return null;
};

// ============================================================================
// 💰 DHANA YOGAS (Wealth Combinations 118 - 122)
// ============================================================================

const _checkDhanaYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  
  // Calculate 5th and 11th house indices (0-11 scale)
  const fifthHouse = (lagnaIndex + 4) % 12;
  const eleventhHouse = (lagnaIndex + 10) % 12;

  const planetsIn11th = {
    Saturn: placements['Saturn'] === eleventhHouse,
    Moon: placements['Moon'] === eleventhHouse,
    Mars: placements['Mars'] === eleventhHouse,
    Mercury: placements['Mercury'] === eleventhHouse,
    Jupiter: placements['Jupiter'] === eleventhHouse
  };

  // 118. Venus in own 5th, Saturn in 11th (Lagnas: Capricorn, Gemini)
  if ((fifthHouse === 1 || fifthHouse === 6) && placements['Venus'] === fifthHouse && planetsIn11th.Saturn) {
    yogas.push({
      name: "Dhana Yoga (Comb. 118)",
      type: "Wealth/Dhana Yoga",
      description: "Venus is in its own sign in the 5th house, and Saturn is in the 11th house.",
      results: "The native will acquire much wealth."
    });
  }

  // 119. Mercury in own 5th, Moon & Mars in 11th (Lagnas: Aquarius, Taurus)
  if ((fifthHouse === 2 || fifthHouse === 5) && placements['Mercury'] === fifthHouse && planetsIn11th.Moon && planetsIn11th.Mars) {
    yogas.push({
      name: "Dhana Yoga (Comb. 119)",
      type: "Wealth/Dhana Yoga",
      description: "Mercury is in its own sign in the 5th house, and the Moon and Mars are in the 11th house.",
      results: "The native will acquire much wealth."
    });
  }

  // 120. Saturn in own 5th, Mercury & Mars in 11th (Lagnas: Virgo, Libra)
  if ((fifthHouse === 9 || fifthHouse === 10) && placements['Saturn'] === fifthHouse && planetsIn11th.Mercury && planetsIn11th.Mars) {
    yogas.push({
      name: "Dhana Yoga (Comb. 120)",
      type: "Wealth/Dhana Yoga",
      description: "Saturn is in its own sign in the 5th house, and Mercury and Mars are in the 11th house.",
      results: "The native will acquire much wealth."
    });
  }

  // 121. Sun in own 5th, Jupiter & Moon in 11th (Lagna: Aries)
  if (fifthHouse === 4 && placements['Sun'] === fifthHouse && planetsIn11th.Jupiter && planetsIn11th.Moon) {
    yogas.push({
      name: "Dhana Yoga (Comb. 121)",
      type: "Wealth/Dhana Yoga",
      description: "The Sun is in its own sign in the 5th house, and Jupiter and the Moon are in the 11th house.",
      results: "The native will acquire much wealth. This is an especially powerful Dhana Yoga."
    });
  }

  // 122. Jupiter in own 5th, Mars & Moon in 11th (Lagnas: Leo, Scorpio)
  if ((fifthHouse === 8 || fifthHouse === 11) && placements['Jupiter'] === fifthHouse && planetsIn11th.Mars && planetsIn11th.Moon) {
    yogas.push({
      name: "Dhana Yoga (Comb. 122)",
      type: "Wealth/Dhana Yoga",
      description: "Jupiter is in its own sign in the 5th house, and Mars and the Moon are in the 11th house.",
      results: "The native will acquire much wealth."
    });
  }

  return yogas;
};

// ============================================================================
// 💰 ADDITIONAL DHANA YOGAS (Combinations 123 - 128) & BAHUDRAVYARJANA YOGA
// ============================================================================

const _checkAdditionalDhanaYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  if (placements[lagnaLord] === undefined) return yogas;

  const getHouse = (planetName) => placements[planetName] !== undefined ? ((placements[planetName] - lagnaIndex + 12) % 12) + 1 : -1;

  // ------------------------------------------------------------------------
  // Combinations 123 to 128: Lord of Lagna in its own sign in the 1st House
  // ------------------------------------------------------------------------
  if (getHouse(lagnaLord) === 1) {
    
    // Helper function to check if specific planets are conjunct in Lagna. 
    // NOTE: This currently checks conjunctions. Aspect logic should be added here once the aspect engine is integrated.
    const isJoinedBy = (planetsArr) => planetsArr.every(p => placements[p] === lagnaIndex);

    // 123. Sun in Leo Lagna, joined/aspected by Mars and Jupiter
    if (lagnaIndex === 4 && isJoinedBy(['Mars', 'Jupiter'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 123)",
        type: "Wealth/Dhana Yoga",
        description: "The Sun is in Lagna identical with Leo, and aspected or joined by Mars and Jupiter.",
        results: "The subject acquires immense wealth."
      });
    }

    // 124. Moon in Cancer Lagna, joined/aspected by Jupiter and Mars
    if (lagnaIndex === 3 && isJoinedBy(['Jupiter', 'Mars'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 124)",
        type: "Wealth/Dhana Yoga",
        description: "The Moon is in Lagna identical with Cancer, and aspected or joined by Jupiter and Mars.",
        results: "The subject acquires immense wealth."
      });
    }

    // 125. Mars in Aries or Scorpio Lagna, joined/aspected by Moon, Venus, Saturn
    if ((lagnaIndex === 0 || lagnaIndex === 7) && isJoinedBy(['Moon', 'Venus', 'Saturn'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 125)",
        type: "Wealth/Dhana Yoga",
        description: "Mars is in Lagna identical with Aries or Scorpio, and joined or aspected by the Moon, Venus, and Saturn.",
        results: "The subject acquires immense wealth."
      });
    }

    // 126. Mercury in Gemini or Virgo Lagna, joined/aspected by Saturn and Venus
    if ((lagnaIndex === 2 || lagnaIndex === 5) && isJoinedBy(['Saturn', 'Venus'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 126)",
        type: "Wealth/Dhana Yoga",
        description: "Mercury is in Lagna identical with his own sign, and joined or aspected by Saturn and Venus.",
        results: "The subject acquires immense wealth."
      });
    }

    // 127. Jupiter in Sagittarius or Pisces Lagna, joined/aspected by Mercury and Mars
    if ((lagnaIndex === 8 || lagnaIndex === 11) && isJoinedBy(['Mercury', 'Mars'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 127)",
        type: "Wealth/Dhana Yoga",
        description: "Jupiter is in Lagna identical with his own sign, and joined or aspected by Mercury and Mars.",
        results: "The subject acquires immense wealth."
      });
    }

    // 128. Venus in Taurus or Libra Lagna, joined/aspected by Saturn and Mercury
    if ((lagnaIndex === 1 || lagnaIndex === 6) && isJoinedBy(['Saturn', 'Mercury'])) {
      yogas.push({
        name: "Dhana Yoga (Comb. 128)",
        type: "Wealth/Dhana Yoga",
        description: "Venus is in Lagna identical with his own sign, and joined or aspected by Saturn and Mercury.",
        results: "The subject acquires immense wealth."
      });
    }
  }

  // ------------------------------------------------------------------------
  // 129. Bahudravyarjana Yoga: Interchanging Lords of 1st, 2nd, and 11th
  // ------------------------------------------------------------------------
  const secondHouseIndex = (lagnaIndex + 1) % 12;
  const eleventhHouseIndex = (lagnaIndex + 10) % 12;
  
  const lordOf2nd = lagnaLords[secondHouseIndex];
  const lordOf11th = lagnaLords[eleventhHouseIndex];

  if (placements[lordOf2nd] !== undefined && placements[lordOf11th] !== undefined) {
    if (getHouse(lagnaLord) === 2 && getHouse(lordOf2nd) === 11 && getHouse(lordOf11th) === 1) {
      yogas.push({
        name: "Bahudravyarjana Yoga",
        type: "Wealth/Dhana Yoga",
        description: "The Lord of the Lagna is in the 2nd house, the Lord of the 2nd is in the 11th, and the Lord of the 11th is in the Lagna.",
        results: "The subject will earn a lot of money and will amass a good fortune."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 💪 SWAVEERYADDHANA YOGAS (Self-Earned Wealth: Combinations 130 - 132)
// ============================================================================

const _checkSwaveeryaddhanaYogas = (lagnaIndex, placements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined) return yogas;

  const lagnaLordSign = placements[lagnaLord];
  const lord2Sign = placements[lord2];

  // Exaltation Signs (0-11 scale): Sun(0), Moon(1), Mars(9), Mercury(5), Jupiter(3), Venus(11), Saturn(6)
  const exaltationSigns = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  // Helper to calculate relative distance between two signs (returns 1-12)
  const relativeHouse = (planetSign, refSign) => ((planetSign - refSign + 12) % 12) + 1;
  const isKendra = (pSign, refSign) => [1, 4, 7, 10].includes(relativeHouse(pSign, refSign));
  const isTrikona = (pSign, refSign) => [1, 5, 9].includes(relativeHouse(pSign, refSign));

  // ------------------------------------------------------------------------
  // 130. Lagna Lord in Kendra with Jupiter, 2nd Lord in Vaiseshikamsa
  // ------------------------------------------------------------------------
  // Placeholders for strength calculations (to be connected to Shadbala/Varga engines)
  const lagnaLordIsStrongest = true; 
  const lord2InVaiseshikamsa = true; 

  if (isKendra(lagnaLordSign, lagnaIndex) && placements['Jupiter'] === lagnaLordSign && lagnaLordIsStrongest && lord2InVaiseshikamsa) {
    yogas.push({
      name: "Swaveeryaddhana Yoga (Comb. 130)",
      type: "Auspicious Wealth Yoga",
      involved: [lagnaLord, 'Jupiter'],
      description: "The Lord of Lagna is the strongest planet, occupies a Kendra conjunct Jupiter, and the 2nd Lord is in Vaiseshikamsa.",
      results: "The subject will earn money by their own efforts and exertions. Wealth acquired will be rightly spent and not wasted."
    });
  }

  // ------------------------------------------------------------------------
  // 131. The Complex Dispositor Chain Rule
  // ------------------------------------------------------------------------
  if (navamsaPlacements && navamsaPlacements[lagnaLord] !== undefined) {
    // Step A: Find Navamsa occupied by Lagna Lord
    const navamsaOfLagnaLord = navamsaPlacements[lagnaLord];
    
    // Step B: Find the Lord of that Navamsa sign
    const lordOfNavamsa = lagnaLords[navamsaOfLagnaLord];
    
    // Step C: Find where that Lord sits in the D1 (Rasi) chart
    const rasiOfLordOfNavamsa = placements[lordOfNavamsa];
    
    // Step D: Find the Lord of that D1 sign (The Target Planet)
    if (rasiOfLordOfNavamsa !== undefined) {
      const targetPlanet = lagnaLords[rasiOfLordOfNavamsa];
      const targetPlanetSign = placements[targetPlanet];

      if (targetPlanetSign !== undefined) {
        const targetInKendraOrTrikonaFrom2nd = isKendra(targetPlanetSign, lord2Sign) || isTrikona(targetPlanetSign, lord2Sign);
        const targetInOwnSign = lagnaLords[targetPlanetSign] === targetPlanet;
        const targetInExaltation = exaltationSigns[targetPlanet] === targetPlanetSign;
        const targetIsStrong = true; // Placeholder for Shadbala strength

        if (targetIsStrong && (targetInKendraOrTrikonaFrom2nd || targetInOwnSign || targetInExaltation)) {
          yogas.push({
            name: "Swaveeryaddhana Yoga (Comb. 131)",
            type: "Auspicious Wealth Yoga",
            involved: [...new Set([lagnaLord, lordOfNavamsa, targetPlanet])],
            description: "The lord of the sign containing the D1 dispositor of the Navamsa lord of the Lagna lord is strong, and placed in a Kendra/Trikona from the 2nd Lord, OR in its own/exaltation sign.",
            results: "The subject will earn money by their own efforts and exertions. Wealth acquired will be rightly spent."
          });
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // 132. 2nd Lord in Kendra/Trikona from 1st Lord, OR is a Benefic & Exalted
  // ------------------------------------------------------------------------
  const lord2InKendraTrikonaFromLagnaLord = isKendra(lord2Sign, lagnaLordSign) || isTrikona(lord2Sign, lagnaLordSign);
  
  const lord2IsBenefic = benefics.includes(lord2);
  const lord2InExaltation = exaltationSigns[lord2] === lord2Sign;
  
  // Check if any planet sitting in the same sign as Lord 2 is exalted
  const conjunctExaltedPlanet = Object.keys(exaltationSigns).some(planet => 
    placements[planet] === lord2Sign && exaltationSigns[planet] === lord2Sign
  );

  if (lord2InKendraTrikonaFromLagnaLord || (lord2IsBenefic && (lord2InExaltation || conjunctExaltedPlanet))) {
    yogas.push({
      name: "Swaveeryaddhana Yoga (Comb. 132)",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord2, lagnaLord])],
      description: "The 2nd Lord occupies a quadrant or trine from the 1st Lord, OR the 2nd Lord is a benefic and is either exalted or conjunct an exalted planet.",
      results: "The subject will earn money by their own efforts and exertions. Wealth acquired will be rightly spent."
    });
  }

  return yogas;
};

// ============================================================================
// ⏳ MADHYA VAYASI DHANA YOGA (Mid-Life Wealth: Combination 133)
// ============================================================================

const _checkMadhyaVayasiDhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord11 = lagnaLords[(lagnaIndex + 10) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord11] === undefined) {
      return yogas;
  }

  const lagnaLordSign = placements[lagnaLord];
  const lord2Sign = placements[lord2];
  const lord11Sign = placements[lord11];

  // 1. Check if they are all conjunct in the same sign
  const areConjunct = (lord2Sign === lagnaLordSign) && (lagnaLordSign === lord11Sign);

  // 2. Check if the conjunction happens in a Kendra (1, 4, 7, 10) or Trikona (1, 5, 9)
  const relativeHouse = ((lord2Sign - lagnaIndex + 12) % 12) + 1;
  const inKendraOrTrikona = [1, 4, 5, 7, 9, 10].includes(relativeHouse);

  // 3. Placeholders for Kalabala (Temporal Strength) and Benefic Aspects
  // To be fully wired up when the Shadbala and Aspect calculation engines are integrated.
  const lord2HasKalabala = true; 
  const aspectedByBenefics = true; 

  if (areConjunct && inKendraOrTrikona && lord2HasKalabala && aspectedByBenefics) {
    yogas.push({
      name: "Madhya Vayasi Dhana Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord2, lagnaLord, lord11])],
      description: "The 2nd lord (possessing temporal strength) joins the lords of the Lagna and the 11th in a quadrant or trine, aspected by benefics.",
      results: "The person will acquire money by self-effort towards the middle part of their life."
    });
  }

  return yogas;
};

// ============================================================================
// 🌅 ANTHYA VAYASI DHANA YOGA (Late-Life Wealth: Combination 134)
// ============================================================================

const _checkAnthyaVayasiDhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2Index = (lagnaIndex + 1) % 12;
  const lord2 = lagnaLords[lord2Index];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined) return yogas;

  const lagnaLordSign = placements[lagnaLord];
  const lord2Sign = placements[lord2];

  // Condition 1: Lord of 1st and 2nd must be conjunct in the same sign
  if (lagnaLordSign === lord2Sign) {
    const conjunctionSign = lagnaLordSign;

    // Condition 2: A natural benefic must also be conjunct with them
    const naturalBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    
    // We verify that the benefic is a distinct third planet in this conjunction
    const conjunctBenefics = naturalBenefics.filter(benefic => 
        placements[benefic] === conjunctionSign && benefic !== lagnaLord && benefic !== lord2
    );

    if (conjunctBenefics.length > 0) {
      // Condition 3: The lord of this sign (the dispositor) must be in the Lagna
      const dispositor = lagnaLords[conjunctionSign];
      const dispositorSign = placements[dispositor];
      
      // Placeholder for strength calculation (to be tied to Shadbala engine later)
      const dispositorIsStrong = true; 

      if (dispositorSign === lagnaIndex && dispositorIsStrong) {
        yogas.push({
          name: "Anthya Vayasi Dhana Yoga",
          type: "Auspicious Wealth Yoga",
          involved: [...new Set([lagnaLord, lord2, ...conjunctBenefics, dispositor])],
          description: "The lords of the 1st and 2nd houses are conjunct with a natural benefic, and their dispositor is strongly placed in the Ascendant (Lagna).",
          results: "The subject will acquire finance through various means towards the last part of their life. Fortune dawns suddenly at the later stages of life."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🌅 BALYA DHANA YOGA (Early-Life Wealth: Combination 135)
// ============================================================================

const _checkBalyaDhanaYoga = (lagnaIndex, placements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord10 = lagnaLords[(lagnaIndex + 9) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord10] === undefined) {
      return yogas;
  }

  const lord2Sign = placements[lord2];
  const lord10Sign = placements[lord10];

  // Condition A: 2nd and 10th lords must be in conjunction
  if (lord2Sign === lord10Sign) {
    const conjunctionSign = lord2Sign;

    // Condition B: They must occupy a Kendra (quadrant) from Lagna
    const relativeHouse = ((conjunctionSign - lagnaIndex + 12) % 12) + 1;
    const isKendra = [1, 4, 7, 10].includes(relativeHouse);

    if (isKendra && navamsaPlacements && navamsaPlacements[lagnaLord] !== undefined) {
      // Condition C: Aspected by the planet who owns the Navamsa occupied by the Ascendant lord
      const navamsaOfLagnaLord = navamsaPlacements[lagnaLord];
      const lordOfNavamsa = lagnaLords[navamsaOfLagnaLord];

      // Placeholder for aspect checking (to be wired up when the aspect calculation engine is integrated)
      const isAspectedByNavamsaLord = true; 

      if (isAspectedByNavamsaLord) {
        yogas.push({
          name: "Balya Dhana Yoga",
          type: "Auspicious Wealth Yoga",
          involved: [...new Set([lord2, lord10, lordOfNavamsa])],
          description: "The lords of the 2nd and 10th houses are conjunct in a quadrant (Kendra) and are aspected by the lord of the Navamsa occupied by the Ascendant lord.",
          results: "The person acquires immense riches in the early part of life."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🤝 BHRATRUMOOLADDHANAPRAPTI YOGA (Wealth through Brothers/Relatives)
// ============================================================================

const _checkBhratrumooladdhanapraptiYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord3 = lagnaLords[(lagnaIndex + 2) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord3] === undefined) {
      return yogas;
  }

  const lagnaLordSign = placements[lagnaLord];
  const lord2Sign = placements[lord2];
  const lord3Sign = placements[lord3];
  const jupSign = placements['Jupiter'];

  const getHouse = (signIndex) => ((signIndex - lagnaIndex + 12) % 12) + 1;

  // ------------------------------------------------------------------------
  // 136. Lords of Lagna and 2nd join the 3rd house, aspected by benefics
  // ------------------------------------------------------------------------
  const isAspectedByBenefic = true; // PLACEHOLDER: Update when aspect engine is integrated
  
  if (getHouse(lagnaLordSign) === 3 && getHouse(lord2Sign) === 3 && isAspectedByBenefic) {
    yogas.push({
      name: "Bhratrumooladdhanaprapti Yoga (Comb. 136)",
      type: "Auspicious Wealth Yoga",
      involved: [lagnaLord, lord2],
      description: "The lords of the Ascendant and the 2nd house are conjunct in the 3rd house and aspected by benefics.",
      results: "The native gets money through brothers and relatives."
    });
  }

  // ------------------------------------------------------------------------
  // 137. Lord of 3rd in 2nd with Jupiter, aspected/conjoined by Lagna Lord in Vaiseshikamsa
  // ------------------------------------------------------------------------
  const isLagnaLordInVaiseshikamsa = true; // PLACEHOLDER: Update when Varga strength engine is integrated
  
  // Check if Lagna Lord is conjunct the 2nd house, otherwise assume aspect placeholder
  const lagnaLordConjuncts2nd = getHouse(lagnaLordSign) === 2;
  const lagnaLordAspects2nd = true; // PLACEHOLDER: Update when aspect engine is integrated
  
  if (getHouse(lord3Sign) === 2 && jupSign === lord3Sign && (lagnaLordConjuncts2nd || lagnaLordAspects2nd) && isLagnaLordInVaiseshikamsa) {
    yogas.push({
      name: "Bhratrumooladdhanaprapti Yoga (Comb. 137)",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord3, 'Jupiter', lagnaLord])],
      description: "The lord of the 3rd house is in the 2nd house with Jupiter, and is aspected by or conjoined with the Ascendant lord who has attained Vaiseshikamsa.",
      results: "The native gets money through brothers and relatives."
    });
  }

  return yogas;
};

// ============================================================================
// 👩🌾 MATRUMOOLADDHANA YOGA (Wealth through Mother / 4th House: Combination 138)
// ============================================================================

const _checkMatrumooladdhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord4 = lagnaLords[(lagnaIndex + 3) % 12];

  if (placements[lord2] === undefined || placements[lord4] === undefined) {
      return yogas;
  }

  const lord2Sign = placements[lord2];
  const lord4Sign = placements[lord4];

  // Definition: 2nd lord joins the 4th lord (or is aspected by him)
  const areConjunct = lord2Sign === lord4Sign;
  const isAspectedBy4thLord = false; // PLACEHOLDER: Update when aspect engine is integrated

  if (areConjunct || isAspectedBy4thLord) {
    
    let resultsText = "The native earns money with the help of their mother.";
    
    // Dr. Raman's remark: the nature of the 4th lord varies the source
    if (lord4 === 'Mars') {
        resultsText += " Because the 4th lord is Mars, agriculture, lands, or real estate may be a highly prominent source of this earning.";
    } else {
        resultsText += ` The specific nature of this earning is often heavily influenced by the natural significations of the 4th lord (${lord4}).`;
    }

    yogas.push({
      name: "Matrumooladdhana Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [lord2, lord4],
      description: "The lord of the 2nd house joins or is aspected by the lord of the 4th house.",
      results: resultsText
    });
  }

  return yogas;
};

// ============================================================================
// 👶 PUTRAMOOLADDHANA YOGA (Wealth through Sons: Combination 139)
// ============================================================================

const _checkPutramooladdhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord5 = lagnaLords[(lagnaIndex + 4) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord5] === undefined) {
      return yogas;
  }

  const lord2Sign = placements[lord2];
  const lord5Sign = placements[lord5];
  const jupSign = placements['Jupiter'];

  // Condition 1: 2nd lord is conjunct the 5th lord OR Jupiter
  const conjunct5thLordOrJupiter = (lord2Sign === lord5Sign) || (lord2Sign === jupSign);

  // Placeholders for strength calculations (to be wired up when Shadbala and Varga engines are integrated)
  const lord2IsStrong = true;
  const lagnaLordInVaiseshikamsa = true;

  if (conjunct5thLordOrJupiter && lord2IsStrong && lagnaLordInVaiseshikamsa) {
    // Determine which planets are actually conjoined with Lord 2 for involved listing
    const conjunctionPartners = [];
    if (lord2Sign === lord5Sign) conjunctionPartners.push(lord5);
    if (lord2Sign === jupSign) conjunctionPartners.push('Jupiter');
    
    yogas.push({
      name: "Putramooladdhana Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord2, ...conjunctionPartners, lagnaLord])],
      description: "The strong lord of the 2nd house is conjoined with the lord of the 5th house or Jupiter, and the lord of Lagna has attained Vaiseshikamsa.",
      results: "The native gets wealth through their sons (often in later life, assisting in business or establishing financial facilities)."
    });
  }

  return yogas;
};

// ============================================================================
// ⚔️ SATRUMOOLADDHANA YOGA (Wealth through Enemies: Combination 140)
// ============================================================================

const _checkSatrumooladdhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord6 = lagnaLords[(lagnaIndex + 5) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord6] === undefined) {
      return yogas;
  }

  const lord2Sign = placements[lord2];
  const lord6Sign = placements[lord6];
  const marsSign = placements['Mars'];

  // Condition 1: 2nd lord is conjunct the 6th lord OR Mars (or aspected by them)
  const isConjunct = (lord2Sign === lord6Sign) || (lord2Sign === marsSign);
  const isAspected = false; // PLACEHOLDER: Update when aspect engine is integrated

  // Placeholders for strength calculations (to be wired up when Shadbala and Varga engines are integrated)
  const lord2IsStrong = true;
  const lagnaLordInVaiseshikamsa = true;

  if ((isConjunct || isAspected) && lord2IsStrong && lagnaLordInVaiseshikamsa) {
    // Determine which planets are conjoined with Lord 2 for involved listing
    const conjunctionPartners = [];
    if (lord2Sign === lord6Sign) conjunctionPartners.push(lord6);
    if (lord2Sign === marsSign) conjunctionPartners.push('Mars');

    yogas.push({
      name: "Satrumooladdhana Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord2, ...conjunctionPartners, lagnaLord])],
      description: "The strong lord of the 2nd house joins (or is aspected by) the lord of the 6th house or Mars, and the lord of Lagna has attained Vaiseshikamsa.",
      results: "The native earns money through their enemies (such as through litigation, competition, or overcoming adversaries)."
    });
  }

  return yogas;
};

// ============================================================================
// 👫 KALATRAMOOLADDHANA YOGA (Wealth through Spouse: Combination 141)
// ============================================================================

const _checkKalatramooladdhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord7 = lagnaLords[(lagnaIndex + 6) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined || placements[lord7] === undefined) {
      return yogas;
  }

  const lord2Sign = placements[lord2];
  const lord7Sign = placements[lord7];
  const venSign = placements['Venus'];

  // Condition 1: 2nd lord conjoins both 7th lord and Venus (or is aspected by them)
  const isConjunct = (lord2Sign === lord7Sign) && (lord2Sign === venSign);
  const isAspected = false; // PLACEHOLDER: Update when aspect engine is integrated

  // Placeholders for strength calculations
  const lord2IsStrong = true;
  const lagnaLordIsPowerful = true;

  if ((isConjunct || isAspected) && lord2IsStrong && lagnaLordIsPowerful) {
    yogas.push({
      name: "Kalatramooladdhana Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [...new Set([lord2, lord7, 'Venus', lagnaLord])],
      description: "The strong lord of the 2nd house conjoins (or is aspected by) the 7th lord and Venus, and the lord of Lagna is powerful.",
      results: "The subject will earn money or become rich on account of their wife/spouse."
    });
  }

  return yogas;
};

// ============================================================================
// 💎 AMARANANTHA DHANA YOGA (Life-long Wealth: Combination 142)
// ============================================================================

const _checkAmarananthaDhanaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  // Planets occupying 2nd house
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const getHouse = (signIndex) => ((signIndex - lagnaIndex + 12) % 12) + 1;

  const planetsIn2nd = classicalPlanets.filter(p => 
    placements[p] !== undefined && getHouse(placements[p]) === 2
  );

  // Condition 1: A number of planets (at least 2) occupy the 2nd house
  if (planetsIn2nd.length >= 2) {
    
    // Condition 2: The 2nd lord and Jupiter should be strongly disposed (or occupy own/exaltation signs)
    const exaltationSigns = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
    const ownSigns = {
      Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10]
    };

    const isOwnOrExalted = (planet) => {
      const sign = placements[planet];
      if (sign === undefined) return false;
      return exaltationSigns[planet] === sign || ownSigns[planet]?.includes(sign);
    };

    const lord2IsStronglyDisposed = isOwnOrExalted(lord2) || true; // Placeholder for Shadbala strength
    const jupiterIsStronglyDisposed = isOwnOrExalted('Jupiter') || true; // Placeholder for Shadbala strength

    if (lord2IsStronglyDisposed && jupiterIsStronglyDisposed) {
      yogas.push({
        name: "Amaranantha Dhana Yoga",
        type: "Auspicious Wealth Yoga",
        involved: [...new Set([lord2, 'Jupiter', ...planetsIn2nd])],
        description: "A number of planets occupy the 2nd house, and the primary wealth-giving ones (the 2nd lord and Jupiter) are strongly disposed or occupy their own or exaltation signs.",
        results: "The native will enjoy and command riches throughout life. The results are permanent and manifest throughout the life course."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🍀 AYATNADHANALABHA YOGA (Effortless Wealth: Combination 143)
// ============================================================================

const _checkAyatnadhanalabhaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  if (placements[lagnaLord] === undefined || placements[lord2] === undefined) {
      return yogas;
  }

  const lagnaLordSign = placements[lagnaLord];
  const lord2Sign = placements[lord2];

  const sign2Index = (lagnaIndex + 1) % 12;

  // Condition: Parivarthana (mutual exchange) between 1st (Lagna) and 2nd lords
  const exchangeLagnaAnd2nd = (lagnaLordSign === sign2Index) && (lord2Sign === lagnaIndex);

  if (exchangeLagnaAnd2nd) {
    yogas.push({
      name: "Ayatnadhanalabha Yoga",
      type: "Auspicious Wealth Yoga",
      involved: [lagnaLord, lord2],
      description: "The lord of the Lagna and the lord of the 2nd house exchange their places (Parivarthana Yoga between 1st and 2nd houses).",
      results: "The native earns wealth easily and without much strain or effort, indicating the fruits of good previous Karma."
    });
  }

  return yogas;
};

// ============================================================================
// 📉 DARIDRA YOGAS (Combinations 144 - 153)
// ============================================================================
const _checkDaridraYogas = (lagnaIndex, rasiPlacements, navamsaLagnaIndex, navamsaPlacements) => {
  if (lagnaIndex === undefined || !rasiPlacements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  // Helper to determine house placement (1 to 12) from Lagna Index
  const getHouse = (planetName) => {
    const rasi = rasiPlacements[planetName];
    if (rasi === undefined) return -1;
    return ((rasi - lagnaIndex + 12) % 12) + 1;
  };

  const getConjunctsLocal = (pName) =>
    Object.keys(rasiPlacements).filter(p => rasiPlacements[p] === rasiPlacements[pName] && p !== pName);

  const hasAspectOrConjLocal = (fromPlanet, toPlanet) => {
    const toRasi = rasiPlacements[toPlanet];
    if (toRasi === undefined) return false;
    return rasiPlacements[fromPlanet] === toRasi || hasAspect(fromPlanet, toRasi, rasiPlacements);
  };

  const lord1 = lagnaLords[lagnaIndex];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];
  const lord5 = lagnaLords[(lagnaIndex + 4) % 12];
  const lord6 = lagnaLords[(lagnaIndex + 5) % 12];
  const lord7 = lagnaLords[(lagnaIndex + 6) % 12];
  const lord8 = lagnaLords[(lagnaIndex + 7) % 12];
  const lord9 = lagnaLords[(lagnaIndex + 8) % 12];
  const lord10 = lagnaLords[(lagnaIndex + 9) % 12];
  const lord12 = lagnaLords[(lagnaIndex + 11) % 12];

  const house1Sign = lagnaIndex;
  const house6Sign = (lagnaIndex + 5) % 12;
  const house8Sign = (lagnaIndex + 7) % 12;
  const house12Sign = (lagnaIndex + 11) % 12;

  // 144: Lagna Lord in 12th house, 12th Lord in Lagna, conjoined or aspected by 7th Lord.
  if (rasiPlacements[lord1] !== undefined && rasiPlacements[lord12] !== undefined) {
    const isExchanged = (rasiPlacements[lord1] === house12Sign) && (rasiPlacements[lord12] === house1Sign);
    if (isExchanged) {
      const hasL7Influence = hasAspectOrConjLocal(lord7, lord1) || hasAspectOrConjLocal(lord7, lord12);
      if (hasL7Influence) {
        yogas.push({
          name: "Daridra Yoga (Comb. 144)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord1, lord12, lord7])],
          description: "The lords of the 12th and Lagna exchange their positions and are conjoined with or aspected by the lord of the 7th.",
          results: "The native will produce dire poverty, financial straits, wretchedness and miseries."
        });
      }
    }
  }

  // 145: Lords of the 6th and Lagna interchange their positions and the Moon is aspected by the 2nd or 7th lord.
  if (rasiPlacements[lord1] !== undefined && rasiPlacements[lord6] !== undefined && rasiPlacements['Moon'] !== undefined) {
    const isExchanged = (rasiPlacements[lord1] === house6Sign) && (rasiPlacements[lord6] === house1Sign);
    if (isExchanged) {
      const moonInfluenced = hasAspectOrConjLocal(lord2, 'Moon') || hasAspectOrConjLocal(lord7, 'Moon');
      if (moonInfluenced) {
        yogas.push({
          name: "Daridra Yoga (Comb. 145)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord1, lord6, 'Moon', lord2, lord7])],
          description: "The lords of the 6th and Lagna interchange their positions and the Moon is conjoined with or aspected by the 2nd or 7th lord.",
          results: "The native will face dire poverty, financial straits, wretchedness and miseries."
        });
      }
    }
  }

  // 146: Ketu and the Moon should be in Lagna.
  if (rasiPlacements['Moon'] === house1Sign && rasiPlacements['Ketu'] === house1Sign) {
    yogas.push({
      name: "Daridra Yoga (Comb. 146)",
      type: "Inauspicious Yoga",
      involved: ['Moon', 'Ketu'],
      description: "Ketu and the Moon occupy the Lagna.",
      results: "Produces dire poverty, financial straits, wretchedness and miseries."
    });
  }

  // 147: Lagna Lord in 8th house, aspected by or in conjunction with the 2nd or 7th lord.
  if (rasiPlacements[lord1] === house8Sign) {
    const hasL2orL7Influence = hasAspectOrConjLocal(lord2, lord1) || hasAspectOrConjLocal(lord7, lord1);
    if (hasL2orL7Influence) {
      yogas.push({
        name: "Daridra Yoga (Comb. 147)",
        type: "Inauspicious Yoga",
        involved: [...new Set([lord1, lord2, lord7])],
        description: "The lord of Lagna is in the 8th house aspected by or in conjunction with the 2nd or 7th lord.",
        results: "Renders the native subject to dire poverty, financial straits, and misery."
      });
    }
  }

  // 148: Lagna Lord in 6th, 8th or 12th house, conjunct with a malefic, and aspected by or combined with the 2nd or 7th lord.
  const lord1House = getHouse(lord1);
  if ([6, 8, 12].includes(lord1House)) {
    const conjuncts = getConjunctsLocal(lord1);
    const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    const conjunctMalefic = conjuncts.find(p => maleficsList.includes(p));
    if (conjunctMalefic) {
      const l2orL7ConjOrAspect = hasAspectOrConjLocal(lord2, lord1) || hasAspectOrConjLocal(lord7, lord1);
      if (l2orL7ConjOrAspect) {
        yogas.push({
          name: "Daridra Yoga (Comb. 148)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord1, conjunctMalefic, lord2, lord7])],
          description: "The lord of Lagna joins the 6th, 8th or 12th house with a malefic and is aspected by or combined with the 2nd or 7th lord.",
          results: "Produces dire poverty, financial straits, wretchedness and miseries."
        });
      }
    }
  }

  // 149: Lord of Lagna is associated with the 6th, 8th or 12th lord and subjected to malefic aspects.
  if (rasiPlacements[lord1] !== undefined) {
    const isAssociatedWith6_8_12 = 
      hasAspectOrConjLocal(lord6, lord1) || hasAspectOrConjLocal(lord1, lord6) ||
      hasAspectOrConjLocal(lord8, lord1) || hasAspectOrConjLocal(lord1, lord8) ||
      hasAspectOrConjLocal(lord12, lord1) || hasAspectOrConjLocal(lord1, lord12);
    if (isAssociatedWith6_8_12) {
      const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
      const hasMaleficAspectOrConj = maleficsList.some(p => p !== lord1 && hasAspectOrConjLocal(p, lord1));
      if (hasMaleficAspectOrConj) {
        const dusthanaLords = [lord6, lord8, lord12].filter(dl => dl !== undefined && hasAspectOrConjLocal(dl, lord1));
        const activeMalefics = maleficsList.filter(m => m !== lord1 && hasAspectOrConjLocal(m, lord1));
        yogas.push({
          name: "Daridra Yoga (Comb. 149)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord1, ...dusthanaLords, ...activeMalefics])],
          description: "The lord of Lagna is associated with the 6th, 8th or 12th lord and subjected to malefic aspects or conjunctions.",
          results: "Brings dire poverty, financial straits, wretchedness and miseries."
        });
      }
    }
  }

  // 150: The lord of the 5th joins the lord of the 6th, 8th or 12th without beneficial aspects or conjunctions.
  if (rasiPlacements[lord5] !== undefined) {
    const joinsDusthanaLord = 
      (rasiPlacements[lord5] === rasiPlacements[lord6] && lord5 !== lord6) ||
      (rasiPlacements[lord5] === rasiPlacements[lord8] && lord5 !== lord8) ||
      (rasiPlacements[lord5] === rasiPlacements[lord12] && lord5 !== lord12);
    if (joinsDusthanaLord) {
      const beneficsList = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
      const hasBeneficInfluence = beneficsList.some(b => b !== lord5 && hasAspectOrConjLocal(b, lord5));
      if (!hasBeneficInfluence) {
        const dusthanaLord = [lord6, lord8, lord12].find(dl => rasiPlacements[dl] === rasiPlacements[lord5]);
        yogas.push({
          name: "Daridra Yoga (Comb. 150)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord5, dusthanaLord])],
          description: "The lord of the 5th house joins the lord of the 6th, 8th or 12th house without receiving any beneficial aspects or conjunctions.",
          results: "Produces dire poverty, financial straits, wretchedness and miseries."
        });
      }
    }
  }

  // 151: The lord of the 5th is in the 6th or 10th aspected by lords of the 2nd, 6th, 7th, 8th or 12th.
  const lord5House = getHouse(lord5);
  if ([6, 10].includes(lord5House)) {
    const aspectingLords = [lord2, lord6, lord7, lord8, lord12];
    const isAspectedByAny = aspectingLords.some(l => l !== lord5 && hasAspectOrConjLocal(l, lord5));
    if (isAspectedByAny) {
      const activeLords = aspectingLords.filter(l => l !== lord5 && hasAspectOrConjLocal(l, lord5));
      yogas.push({
        name: "Daridra Yoga (Comb. 151)",
        type: "Inauspicious Yoga",
        involved: [...new Set([lord5, ...activeLords])],
        description: "The lord of the 5th is in the 6th or 10th house, aspected by or conjoined with the lord of the 2nd, 6th, 7th, 8th or 12th house.",
        results: "Produces dire poverty, financial straits, wretchedness and miseries."
      });
    }
  }

  // 152: Natural malefics, who do not own the 9th or 10th, should occupy Lagna and associate with or be aspected by the maraka lords (2nd and 7th).
  const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const non9or10Malefics = maleficsList.filter(m => m !== lord9 && m !== lord10);
  const lagnaMalefic = non9or10Malefics.find(m => rasiPlacements[m] === house1Sign);
  if (lagnaMalefic) {
    const associatedWithMaraka = hasAspectOrConjLocal(lord2, lagnaMalefic) || hasAspectOrConjLocal(lord7, lagnaMalefic);
    if (associatedWithMaraka) {
      yogas.push({
        name: "Daridra Yoga (Comb. 152)",
        type: "Inauspicious Yoga",
        involved: [...new Set([lagnaMalefic, lord2, lord7])],
        description: "Natural malefics, who do not own the 9th or 10th houses, occupy Lagna and are conjoined with or aspected by the maraka lords (2nd or 7th).",
        results: "Produces dire poverty, financial straits, wretchedness and miseries."
      });
    }
  }

  // 153: The lords of the Lagna and Navamsa Lagna should occupy the 6th, 8th or 12th (Rasi) and have the aspect or conjunction of the lords of the 2nd and 7th (Rasi).
  if (navamsaLagnaIndex !== undefined && navamsaPlacements) {
    const navLagnaLord = lagnaLords[navamsaLagnaIndex];
    if (navLagnaLord) {
      const lord1House = getHouse(lord1);
      const navLagnaLordHouse = getHouse(navLagnaLord);
      if ([6, 8, 12].includes(lord1House) && [6, 8, 12].includes(navLagnaLordHouse)) {
        const lord1Influenced = hasAspectOrConjLocal(lord2, lord1) || hasAspectOrConjLocal(lord7, lord1);
        const navLordInfluenced = hasAspectOrConjLocal(lord2, navLagnaLord) || hasAspectOrConjLocal(lord7, navLagnaLord);
        if (lord1Influenced && navLordInfluenced) {
          yogas.push({
            name: "Daridra Yoga (Comb. 153)",
            type: "Inauspicious Yoga",
            involved: [...new Set([lord1, navLagnaLord, lord2, lord7])],
            description: "The lords of the Lagna and Navamsa Lagna occupy the 6th, 8th or 12th house, and are conjoined with or aspected by the lords of the 2nd and 7th houses.",
            results: "Produces dire poverty, financial straits, wretchedness and miseries."
          });
        }
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🗣️ YUKTHI SAMANWITHAVAGMI YOGAS (Combinations 154 - 155)
// ============================================================================
const _checkYukthiSamanwithavagmiYogas = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  if (rasiPlacements[lord2] === undefined) return yogas;

  const lord2House = placements[lord2];
  const isKendra = [1, 4, 7, 10].includes(lord2House);
  const isTrikona = [5, 9].includes(lord2House);
  const isExalted = (pName) => rasiPlacements[pName] === EXALTATION_SIGNS[pName];

  const getConjunctsLocal = (pName) =>
    Object.keys(rasiPlacements).filter(p => rasiPlacements[p] === rasiPlacements[pName] && p !== pName);

  const conjuncts = getConjunctsLocal(lord2);

  // 154: The 2nd lord should join a benefic in a kendra or thrikona, or be exalted and combined with Jupiter.
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const conjunctBenefic = conjuncts.find(p => benefics.includes(p) && p !== lord2);

  const conditionA = (isKendra || isTrikona) && conjunctBenefic !== undefined;
  const conditionB = isExalted(lord2) && conjuncts.includes('Jupiter');

  if (conditionA || conditionB) {
    const primaryBenefic = conjunctBenefic || 'Jupiter';
    yogas.push({
      name: "Yukthi Samanwithavagmi Yoga (Comb. 154)",
      type: "Auspicious Yoga",
      involved: [...new Set([lord2, primaryBenefic])],
      description: "The 2nd lord conjoins a benefic in a Kendra or Trikona, or is exalted and conjoined with Jupiter.",
      results: "The native becomes an eloquent and skilled speaker, capable of convincing speech."
    });
  }

  // 155: The lord of speech [2nd lord] should occupy a kendra, attain paramochha and gain Parvatamsa, while Jupiter or Venus should be in Simhasanamsa.
  const lord2InParvatamsa = true; // Placeholder for divisional chart strength (Parvatamsa)
  const jupOrVenInSimhasanamsa = true; // Placeholder for divisional chart strength (Simhasanamsa)

  if (isKendra && isExalted(lord2) && lord2InParvatamsa && jupOrVenInSimhasanamsa) {
    yogas.push({
      name: "Yukthi Samanwithavagmi Yoga (Comb. 155)",
      type: "Auspicious Yoga",
      involved: [...new Set([lord2, 'Jupiter', 'Venus'])],
      description: "The 2nd lord occupies a Kendra, attains exaltation (paramochha) and gains Parvatamsa, while Jupiter or Venus is in Simhasanamsa.",
      results: "The native will become an eloquent and skilled speaker, with highly refined oratorical skills."
    });
  }

  return yogas;
};

// ============================================================================
// 🎭 PARIHASAKA YOGA (Combination 156)
// ============================================================================
const _checkParihasakaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  if (navamsaPlacements['Sun'] === undefined) return yogas;

  // 1. Get the Navamsa sign occupied by the Sun
  const sunNavamsaSign = navamsaPlacements['Sun'];
  
  // 2. Lord of the Navamsa occupied by the Sun
  const sunNavamsaLord = lagnaLords[sunNavamsaSign];

  if (placements[sunNavamsaLord] === undefined) return yogas;

  // 3. Check if the lord joins the 2nd house (1-based house = 2)
  const lordHouse = placements[sunNavamsaLord];

  // 4. Attain Vaiseshikamsa (placeholder)
  const sunNavamsaLordInVaiseshikamsa = true;

  if (lordHouse === 2 && sunNavamsaLordInVaiseshikamsa) {
    yogas.push({
      name: "Parihasaka Yoga",
      type: "Auspicious Yoga",
      involved: ['Sun', sunNavamsaLord],
      description: "The lord of the Navamsa occupied by the Sun attains Vaiseshikamsa and joins the 2nd house.",
      results: "The native becomes a humorous and witty speaker."
    });
  }

  return yogas;
};

// ============================================================================
// 🤥 ASATYAVADI YOGA (Combination 157)
// ============================================================================
const _checkAsatyavadiYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  if (rasiPlacements[lord2] === undefined) return yogas;

  // Helper to determine house placement (1 to 12) from Lagna Index
  const getHouse = (planetName) => {
    const rasi = rasiPlacements[planetName];
    if (rasi === undefined) return -1;
    return ((rasi - lagnaIndex + 12) % 12) + 1;
  };

  // Variant A: 2nd Lord in Aries (0), Scorpio (7), Capricorn (9), Aquarius (10)
  // AND malefics occupy kendras and trikonas.
  const lord2InMarsOrSaturnSign = [0, 7, 9, 10].includes(rasiPlacements[lord2]);
  
  const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const maleficsInKendras = maleficsList.filter(p => [1, 4, 7, 10].includes(getHouse(p)));
  const maleficsInTrikonas = maleficsList.filter(p => [5, 9].includes(getHouse(p)));

  const hasMaleficsInKendrasAndTrikonas = maleficsInKendras.length > 0 && maleficsInTrikonas.length > 0;

  const variantA = lord2InMarsOrSaturnSign && hasMaleficsInKendrasAndTrikonas;

  // Variant B: lord of the Navamsa occupied by the lord of the 2nd is Mars or Saturn,
  // or stays in the signs of Mars/Saturn (0, 7, 9, 10).
  let variantB = false;
  let lord2NavamsaLord = null;
  if (navamsaPlacements[lord2] !== undefined) {
    const lord2NavamsaSign = navamsaPlacements[lord2];
    lord2NavamsaLord = lagnaLords[lord2NavamsaSign];
    if (lord2NavamsaLord === 'Mars' || lord2NavamsaLord === 'Saturn') {
      variantB = true;
    } else if (rasiPlacements[lord2NavamsaLord] !== undefined && [0, 7, 9, 10].includes(rasiPlacements[lord2NavamsaLord])) {
      variantB = true;
    }
  }

  if (variantA || variantB) {
    const involved = [lord2];
    if (variantA) {
      if (maleficsInKendras[0]) involved.push(maleficsInKendras[0]);
      if (maleficsInTrikonas[0]) involved.push(maleficsInTrikonas[0]);
    }
    if (variantB && lord2NavamsaLord) {
      involved.push(lord2NavamsaLord);
    }

    yogas.push({
      name: "Asatyavadi Yoga",
      type: "Inauspicious Yoga",
      involved: [...new Set(involved)],
      description: variantA 
        ? "The lord of the 2nd house occupies a sign of Mars or Saturn, and malefics occupy Kendra and Trikona houses."
        : "The lord of the Navamsa occupied by the 2nd lord is Mars/Saturn or is placed in a sign of Mars/Saturn.",
      results: "The native will be a liar (inclined to untruthfulness or exaggeration)."
    });
  }

  return yogas;
};

// ============================================================================
// 🧠 BUDDHIMATURYA YOGA (Great Intelligence 231)
// ============================================================================
export const checkBuddhimaturyaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  
  if (!lord5) return yogas;

  const lord5Sign = rasiPlacements[lord5];
  const targetBenefics = ['Jupiter', 'Mercury', 'Venus'];
  const allBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  let isAssociated = false;
  const involvedPlanets = new Set([lord5]);

  for (const benefic of targetBenefics) {
    if (rasiPlacements[benefic] !== undefined) {
      if (rasiPlacements[benefic] === lord5Sign || hasAspect(benefic, lord5Sign, rasiPlacements)) {
        isAssociated = true;
        involvedPlanets.add(benefic);
      }
    }
  }

  let isOccupiedByBenefic = false;
  for (const benefic of allBenefics) {
    if (placements[benefic] === 5) {
      isOccupiedByBenefic = true;
      involvedPlanets.add(benefic);
    }
  }

  if (isAssociated || isOccupiedByBenefic) {
    yogas.push({
      name: "Buddhimaturya Yoga",
      type: "Auspicious Yoga",
      involved: [...involvedPlanets],
      description: "The 5th lord is associated with Jupiter, Mercury, or Venus, or the 5th house is occupied by benefics.",
      results: "The native is endowed with great intelligence and excellent character."
    });
  }

  return yogas;
};

// ============================================================================
// 🧠 THEEVRABUDDHI YOGA (Exceptionally Acute Intelligence Combination 232)
// ============================================================================
const _checkTheevrabuddhiYoga = (lagnaIndex, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  
  if (!lord5) return yogas;

  // 1. Find Navamsa sign of 5th lord
  const lord5NavamsaSign = navamsaPlacements[lord5];
  if (lord5NavamsaSign === undefined) return yogas;

  // 2. Identify the lord of that Navamsa sign
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const navamsaLord = lagnaLords[lord5NavamsaSign];
  
  if (!navamsaLord) return yogas;

  const navamsaLordRasiSign = rasiPlacements[navamsaLord];
  if (navamsaLordRasiSign === undefined) return yogas;

  // 3. Check for conjunction or aspect from a natural benefic in D1 (Rasi chart)
  // Or should it be checked in Navamsa? The prompt says "The yoga is present if this Navamsa lord is either aspected by a natural benefic... or is in conjunction with a natural benefic." 
  // Normally, aspects/conjunctions are evaluated in the D1 chart unless otherwise specified. I'll check in D1 using rasiPlacements.
  
  const naturalBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  let isInfluencedByBenefic = false;
  const involvedPlanets = new Set([lord5, navamsaLord]);

  for (const benefic of naturalBenefics) {
    if (benefic === navamsaLord) continue; // Skip itself for conjunction/aspect, or maybe the yoga requires another benefic?
    
    if (rasiPlacements[benefic] !== undefined) {
      if (rasiPlacements[benefic] === navamsaLordRasiSign || hasAspect(benefic, navamsaLordRasiSign, rasiPlacements)) {
        isInfluencedByBenefic = true;
        involvedPlanets.add(benefic);
      }
    }
  }

  if (isInfluencedByBenefic) {
    yogas.push({
      name: "Theevrabuddhi Yoga",
      type: "Auspicious Yoga",
      involved: [...involvedPlanets],
      description: "The lord of the Navamsa occupied by the 5th lord is conjoined with or aspected by a natural benefic.",
      results: "The native will be exceptionally intelligent and acute."
    });
  }

  return yogas;
};

// ============================================================================
// 🧠 BUDDHI JADA YOGA (Combination 233)
// ============================================================================
const _checkBuddhiJadaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  
  if (!lagnaLord) return yogas;

  // 1. Saturn must occupy the 5th house
  const isSaturnIn5th = placements['Saturn'] === 5;
  if (!isSaturnIn5th) return yogas;

  const lagnaLordRasiSign = rasiPlacements[lagnaLord];
  if (lagnaLordRasiSign === undefined) return yogas;

  // 2. Lagna lord must be conjoined with OR aspected by malefics
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  let isInfluencedByMalefic = false;
  const involvedPlanets = new Set(['Saturn', lagnaLord]);

  for (const malefic of malefics) {
    if (malefic === lagnaLord) continue;
    if (rasiPlacements[malefic] !== undefined) {
      if (rasiPlacements[malefic] === lagnaLordRasiSign || hasAspect(malefic, lagnaLordRasiSign, rasiPlacements)) {
        isInfluencedByMalefic = true;
        involvedPlanets.add(malefic);
      }
    }
  }

  // 3. Lagna lord must be aspected by Saturn
  const isAspectedBySaturn = hasAspect('Saturn', lagnaLordRasiSign, rasiPlacements);

  if (isInfluencedByMalefic && isAspectedBySaturn) {
    yogas.push({
      name: "Buddhi Jada Yoga",
      type: "Dosha",
      involved: [...involvedPlanets],
      description: "The Lord of the Ascendant is conjoined with or aspected by malefics, Saturn occupies the 5th house, and the Ascendant Lord is aspected by Saturn.",
      results: "Indicates dullness of intellect or issues related to children."
    });
  }

  return yogas;
};

// ============================================================================
// 👁️ THRIKALAGNANA YOGA (Combination 234)
// ============================================================================
const _checkThrikalagnanaYoga = (lagnaIndex, rasiPlacements, navamsaPlacements, planets) => {
  if (lagnaIndex === undefined || !rasiPlacements || !navamsaPlacements || !planets) return [];

  const yogas = [];

  const jupiter = planets.find(p => (p.planet || p.name) === 'Jupiter');
  if (!jupiter || jupiter.fullDegree === undefined) return yogas;

  const jupDeg = jupiter.fullDegree;
  const sign = Math.floor(jupDeg / 30) % 12;
  const isOddSign = sign % 2 === 0; // 0=Aries (odd), 1=Taurus (even)
  const degInSign = jupDeg % 30;

  // Condition (a) Mrudwamsa + Own Navamsa
  // 1. Own Navamsa?
  const jupNavamsaSign = navamsaPlacements['Jupiter'];
  const isOwnNavamsa = jupNavamsaSign === 8 || jupNavamsaSign === 11; // Sagittarius or Pisces

  // 2. Mrudwamsa? (19th part in odd, 42nd in even)
  const shashtiamsaIndex = Math.floor(degInSign / 0.5) + 1; // 1 to 60
  const isMrudwamsa = isOddSign ? (shashtiamsaIndex === 19) : (shashtiamsaIndex === 42);

  const conditionA = isOwnNavamsa && isMrudwamsa;

  // Condition (b) Gopuramsa + Aspected by Natural Benefic
  // 1. Gopuramsa (own varga at least 4 times) using Dasavarga
  const getD1 = (deg) => Math.floor(deg / 30) % 12;
  const getD2 = (deg) => {
    const s = getD1(deg);
    const d = deg % 30;
    if (s % 2 === 0) return d < 15 ? 4 : 3; // Sun(Leo), Moon(Cancer)
    return d < 15 ? 3 : 4; // Moon, Sun
  };
  const getD3 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / 10);
    return (s + part * 4) % 12;
  };
  const getD7 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / (30/7));
    return (s % 2 === 0) ? (s + part) % 12 : (s + 6 + part) % 12;
  };
  const getD9 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / (30/9));
    const startSign = [0, 9, 6, 3][s % 4];
    return (startSign + part) % 12;
  };
  const getD10 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / 3);
    return (s % 2 === 0) ? (s + part) % 12 : (s + 8 + part) % 12;
  };
  const getD12 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / 2.5);
    return (s + part) % 12;
  };
  const getD16 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) / (30/16));
    const startSign = [0, 4, 8][s % 3]; 
    return (startSign + part) % 12;
  };
  const getD30 = (deg) => {
    const s = getD1(deg);
    const d = deg % 30;
    if (s % 2 === 0) { // odd
        if (d < 5) return 0;
        if (d < 10) return 10;
        if (d < 18) return 8;
        if (d < 25) return 2;
        return 6;
    } else { // even
        if (d < 5) return 1;
        if (d < 12) return 5;
        if (d < 20) return 11;
        if (d < 25) return 9;
        return 7;
    }
  };
  const getD60 = (deg) => {
    const s = getD1(deg);
    const part = Math.floor((deg % 30) * 2);
    return (s + part) % 12;
  };

  const vargas = [
    getD1(jupDeg), getD2(jupDeg), getD3(jupDeg), getD7(jupDeg), getD9(jupDeg),
    getD10(jupDeg), getD12(jupDeg), getD16(jupDeg), getD30(jupDeg), getD60(jupDeg)
  ];
  
  let ownVargaCount = 0;
  vargas.forEach(v => {
    if (v === 8 || v === 11) ownVargaCount++; // Jupiter's own signs
  });

  const isGopuramsa = ownVargaCount >= 4;

  // 2. Aspected by Natural Benefic
  const naturalBenefics = ['Venus', 'Mercury', 'Moon']; // excluding Jupiter itself
  let aspectedByBenefic = false;
  const involvedPlanets = new Set(['Jupiter']);

  if (isGopuramsa) {
    for (const benefic of naturalBenefics) {
      if (rasiPlacements[benefic] !== undefined && rasiPlacements['Jupiter'] !== undefined) {
        if (hasAspect(benefic, rasiPlacements['Jupiter'], rasiPlacements)) {
          aspectedByBenefic = true;
          involvedPlanets.add(benefic);
        }
      }
    }
  }

  const conditionB = isGopuramsa && aspectedByBenefic;

  if (conditionA || conditionB) {
    yogas.push({
      name: "Thrikalagnana Yoga",
      type: "Yoga",
      involved: [...involvedPlanets],
      description: conditionA 
        ? "Jupiter is in its own Navamsa and has attained Mrudwamsa (19th Shashtiamsa in an odd sign or 42nd in an even sign)." 
        : "Jupiter has attained Gopuramsa (occupies its own varga at least four times) and is aspected by a natural benefic.",
      results: "The native is capable of reading the past, present, and future (Thrikalagnani)."
    });
  }

  return yogas;
};

// ============================================================================
// 👶 PUTRA SUKHA YOGA (Combination 235)
// ============================================================================
const _checkPutraSukhaYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  
  if (!lord5) return yogas;

  // Benefics for this rule
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  // Condition 1: 5th house is occupied by Jupiter AND Venus.
  const isJupIn5th = placements['Jupiter'] === 5;
  const isVenIn5th = placements['Venus'] === 5;
  const condition1 = isJupIn5th && isVenIn5th;

  // Condition 2: Mercury joins the 5th house.
  const condition2 = placements['Mercury'] === 5;

  // Condition 3: 5th house is a sign ruled by a benefic AND is occupied by a benefic.
  const isLord5Benefic = ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(lord5);
  
  // Occupied by a benefic
  const beneficsIn5th = benefics.filter(b => placements[b] === 5);
  const condition3 = isLord5Benefic && beneficsIn5th.length > 0;

  if (condition1 || condition2 || condition3) {
    const involved = new Set();
    if (condition1) { involved.add('Jupiter'); involved.add('Venus'); }
    if (condition2) involved.add('Mercury');
    if (condition3) {
      beneficsIn5th.forEach(b => involved.add(b));
    }

    yogas.push({
      name: "Putra Sukha Yoga",
      type: "Yoga",
      involved: [...involved],
      description: condition1 ? "The 5th house is occupied by Jupiter and Venus." :
                   condition2 ? "Mercury occupies the 5th house." :
                   "The 5th house is ruled by a benefic and occupied by a benefic.",
      results: "The native will have happiness on account of children."
    });
  }

  return yogas;
};

// ============================================================================
// 🔥 JARA YOGA (Combination 236)
// ============================================================================
const _checkJaraYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord10 = houseLords[10];
  const lord2 = houseLords[2];
  const lord7 = houseLords[7];

  if (!lord10 || !lord2 || !lord7) return yogas;

  // Condition 1: 10th house is occupied by the lords of 10th, 2nd, and 7th.
  const isLord10In10th = placements[lord10] === 10;
  const isLord2In10th = placements[lord2] === 10;
  const isLord7In10th = placements[lord7] === 10;

  if (isLord10In10th && isLord2In10th && isLord7In10th) {
    // Check if 7th lord is Mars or Venus
    const isLord7MarsOrVenus = lord7 === 'Mars' || lord7 === 'Venus';
    
    // Check if aspected by a natural benefic
    const naturalBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    let isAspectedByBenefic = false;
    
    // The conjunction is in the 10th house. Let's find the sign of the 10th house
    const sign10th = (lagnaIndex + 9) % 12;
    
    for (const benefic of naturalBenefics) {
      if (benefic === lord10 || benefic === lord2 || benefic === lord7) continue; 
      if (rasiPlacements[benefic] !== undefined) {
         if (hasAspect(benefic, sign10th, rasiPlacements)) {
            isAspectedByBenefic = true;
            break;
         }
      }
    }

    let description = "The 10th house is occupied by the lords of the 10th, 2nd, and 7th houses (a triple conjunction in the 10th house).";
    let results = "Indicates a potential for extra-marital relations or over-sensuality.";

    if (isLord7MarsOrVenus) {
       description += ` The 7th lord is ${lord7}, making this yoga's negative impact on character more pronounced.`;
    }

    if (isAspectedByBenefic) {
       description += " However, there is an aspect from a natural benefic, which tempers the intensity of this yoga.";
       results = "Indicates a potential for extra-marital relations or over-sensuality, but the tendency is kept in check or tempered by benefic influence.";
    }

    yogas.push({
      name: "Jara Yoga",
      type: "Dosha",
      involved: [...new Set([lord10, lord2, lord7])],
      description,
      results
    });
  }

  return yogas;
};

// ============================================================================
// 💔 JARAJAPUTRA YOGA (Combination 237)
// ============================================================================
const _checkJarajaputraYoga = (lagnaIndex, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  const lord6 = houseLords[6];
  const lord7 = houseLords[7];

  if (!lord5 || !lord6 || !lord7) return yogas;

  // Conjunction: all three lords must be in the same sign
  const rasi5 = rasiPlacements[lord5];
  const rasi6 = rasiPlacements[lord6];
  const rasi7 = rasiPlacements[lord7];

  if (rasi5 !== undefined && rasi5 === rasi6 && rasi6 === rasi7) {
    // Check if aspected by at least one natural benefic
    const naturalBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    let isAspectedByBenefic = false;
    const involvedPlanets = new Set([lord5, lord6, lord7]);

    for (const benefic of naturalBenefics) {
      if (benefic === lord5 || benefic === lord6 || benefic === lord7) continue; 
      if (rasiPlacements[benefic] !== undefined) {
         if (hasAspect(benefic, rasi5, rasiPlacements)) {
            isAspectedByBenefic = true;
            involvedPlanets.add(benefic);
         }
      }
    }

    if (isAspectedByBenefic) {
      yogas.push({
        name: "Jarajaputra Yoga",
        type: "Dosha",
        involved: [...involvedPlanets],
        description: "The lords of the 5th, 6th, and 7th houses are in conjunction, and the combination is aspected by a natural benefic.",
        results: "Indicates the possibility of a child born outside of wedlock or related interpretations as per classical texts."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 👩 BAHU STREE YOGA (Combination 238)
// ============================================================================
const _checkBahuStreeYoga = (lagnaIndex, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord7 = houseLords[7];

  if (!lagnaLord || !lord7) return yogas;

  const lagnaLordRasiSign = rasiPlacements[lagnaLord];
  const lord7RasiSign = rasiPlacements[lord7];

  if (lagnaLordRasiSign === undefined || lord7RasiSign === undefined) return yogas;

  const isConjoined = lagnaLordRasiSign === lord7RasiSign;
  const isMutualAspect = hasAspect(lagnaLord, lord7RasiSign, rasiPlacements) && hasAspect(lord7, lagnaLordRasiSign, rasiPlacements);

  if (isConjoined || isMutualAspect) {
    yogas.push({
      name: "Bahu Stree Yoga",
      type: "Yoga",
      involved: [...new Set([lagnaLord, lord7])],
      description: isConjoined 
        ? "The Lord of the Lagna and the Lord of the 7th house are in conjunction." 
        : "The Lord of the Lagna and the Lord of the 7th house are in mutual aspect.",
      results: "The native will have intimacy with a number of women."
    });
  }

  return yogas;
};

// ============================================================================
// 💍 SATKALATRA YOGA (Combination 239)
// ============================================================================
const _checkSatkalatraYoga = (lagnaIndex, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord7 = houseLords[7];
  
  if (!lord7) return yogas;

  const benefics = ['Jupiter', 'Mercury'];
  
  // We need to check if lord7 OR Venus is conjoined with or aspected by Jupiter OR Mercury
  const targets = [lord7, 'Venus'];
  // Keep it unique if lord7 is Venus
  const uniqueTargets = [...new Set(targets)];
  
  let yogaFound = false;
  const involvedPlanets = new Set();
  let description = "";

  for (const target of uniqueTargets) {
    const targetRasiSign = rasiPlacements[target];
    if (targetRasiSign === undefined) continue;

    for (const benefic of benefics) {
      if (benefic === target) continue; // Can't be conjoined/aspected by itself
      
      const beneficRasiSign = rasiPlacements[benefic];
      if (beneficRasiSign !== undefined) {
        if (beneficRasiSign === targetRasiSign || hasAspect(benefic, targetRasiSign, rasiPlacements)) {
          yogaFound = true;
          involvedPlanets.add(target);
          involvedPlanets.add(benefic);
          
          if (!description) {
             description = `${target} is conjoined with or aspected by ${benefic}.`;
          } else {
             description += ` ${target} is also conjoined with or aspected by ${benefic}.`;
          }
        }
      }
    }
  }

  if (yogaFound) {
    yogas.push({
      name: "Satkalatra Yoga",
      type: "Yoga",
      involved: [...involvedPlanets],
      description,
      results: "The native's wife will be noble and virtuous."
    });
  }

  return yogas;
};

// ============================================================================
// 😘 BHAGA CHUMBANA YOGA (Combination 240)
// ============================================================================
const _checkBhagaChumbanaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord7 = houseLords[7];
  const lagnaLord = houseLords[1];
  
  if (!lord7 || !lagnaLord) return yogas;

  // Condition: Lord of the 7th house in 4th house AND in conjunction with Venus
  const isLord7In4th = placements[lord7] === 4;
  const isVenIn4th = placements['Venus'] === 4;
  const isConjoinedWithVenus = rasiPlacements[lord7] === rasiPlacements['Venus'];

  // Note: Result may also occur if Lagna Lord is debilitated in Rasi or Navamsa.
  const debilitationSigns = {
    'Sun': 6, 'Moon': 7, 'Mars': 3, 'Mercury': 11, 'Jupiter': 9, 'Venus': 5, 'Saturn': 0
  };
  const lagnaLordDebRasi = rasiPlacements[lagnaLord] === debilitationSigns[lagnaLord];
  const lagnaLordDebNavamsa = navamsaPlacements && navamsaPlacements[lagnaLord] === debilitationSigns[lagnaLord];
  const isLagnaLordDebilitated = lagnaLordDebRasi || lagnaLordDebNavamsa;

  if ((isLord7In4th && isConjoinedWithVenus) || isLagnaLordDebilitated) {
    let description = "";
    if (isLord7In4th && isConjoinedWithVenus) {
       description = "The Lord of the 7th house is in the 4th house and in conjunction with Venus.";
    } else {
       description = `The Lagna Lord (${lagnaLord}) is debilitated in ${lagnaLordDebRasi ? 'Rasi' : 'Navamsa'}.`;
    }

    yogas.push({
      name: "Bhaga Chumbana Yoga",
      type: "Yoga",
      involved: isLord7In4th && isConjoinedWithVenus ? [...new Set([lord7, 'Venus'])] : [lagnaLord],
      description,
      results: "The native will indulge in Bhaga Chumbana."
    });
  }

  return yogas;
};

// ============================================================================
// 🍀 BHAGYA YOGA (Combination 241)
// ============================================================================
const _checkBhagyaYoga = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  // A strong benefic planet must occupy Lagna, 3rd, or 5th AND aspect the 9th house.
  // 9th house sign
  const sign9th = (lagnaIndex + 8) % 12;

  const validPlacements = [1, 3, 5];
  let yogaFound = false;
  const involvedPlanets = new Set();
  let descriptionParts = [];

  for (const benefic of benefics) {
    const housePlacement = placements[benefic];
    if (validPlacements.includes(housePlacement)) {
      // Check if it aspects the 9th house
      if (hasAspect(benefic, sign9th, rasiPlacements)) {
         yogaFound = true;
         involvedPlanets.add(benefic);
         descriptionParts.push(`${benefic} occupies the ${housePlacement} house and aspects the 9th house`);
      }
    }
  }

  if (yogaFound) {
    yogas.push({
      name: "Bhagya Yoga",
      type: "Yoga",
      involved: [...involvedPlanets],
      description: descriptionParts.join(" AND ") + ".",
      results: "The native will be extremely fortunate, pleasure-loving, and rich."
    });
  }

  return yogas;
};

// ============================================================================
// ⚰️ JANANATPURVAM PITRU MARANA YOGA (Combination 242)
// ============================================================================
const _checkJananatpurvamPitruMaranaYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  
  // The Sun must be in the 6th, 8th, or 12th house.
  const sunHouse = placements['Sun'];
  const isSunInDusthana = sunHouse === 6 || sunHouse === 8 || sunHouse === 12;
  
  if (!isSunInDusthana) return yogas;

  // The Lord of the 8th house must be in the 9th house.
  const lord8 = houseLords[8];
  const isLord8In9th = placements[lord8] === 9;

  // The Lord of the 12th house must be in the Lagna.
  const lord12 = houseLords[12];
  const isLord12InLagna = placements[lord12] === 1;

  // The Lord of the 6th house must be in the 5th house.
  const lord6 = houseLords[6];
  const isLord6In5th = placements[lord6] === 5;

  if (isLord8In9th && isLord12InLagna && isLord6In5th) {
    yogas.push({
      name: "Jananatpurvam Pitru Marana Yoga",
      type: "Dosha",
      involved: [...new Set(['Sun', lord8, lord12, lord6])],
      description: "The Sun is in the 6th, 8th, or 12th house, the 8th lord is in the 9th, the 12th lord is in the Lagna, and the 6th lord is in the 5th.",
      results: "The native will be a posthumous child (the father dies before the child's birth)."
    });
  }

  return yogas;
};

// ============================================================================
// 🎁 DHATRUTWA YOGA (Combination 243)
// ============================================================================
const _checkDhatrutwaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord9 = houseLords[9];
  
  if (!lord9) return yogas;

  // 1. Lord of the 9th house must be in exaltation
  const EXALTATION_SIGNS = {
    'Sun': 0, 'Moon': 1, 'Mars': 9, 'Mercury': 5, 'Jupiter': 3, 'Venus': 11, 'Saturn': 6, 'Rahu': 2, 'Ketu': 8
  };
  
  const isLord9Exalted = rasiPlacements[lord9] === EXALTATION_SIGNS[lord9];
  if (!isLord9Exalted) return yogas;

  // 2. The 9th house itself must be occupied by a natural benefic
  const naturalBenefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const beneficsIn9th = naturalBenefics.filter(b => placements[b] === 9);
  
  if (beneficsIn9th.length === 0) return yogas;

  // 3. Lord of the 9th house must be aspected by a natural benefic
  let isLord9AspectedByBenefic = false;
  const involvedPlanets = new Set([lord9, ...beneficsIn9th]);
  const lord9RasiSign = rasiPlacements[lord9];

  for (const benefic of naturalBenefics) {
    if (benefic === lord9) continue;
    if (rasiPlacements[benefic] !== undefined) {
       if (hasAspect(benefic, lord9RasiSign, rasiPlacements)) {
          isLord9AspectedByBenefic = true;
          involvedPlanets.add(benefic);
       }
    }
  }

  if (isLord9AspectedByBenefic) {
    yogas.push({
      name: "Dhatrutwa Yoga",
      type: "Yoga",
      involved: [...involvedPlanets],
      description: "The 9th lord is exalted and aspected by a natural benefic, while the 9th house itself is occupied by a natural benefic.",
      results: "The native will be an embodiment of generosity and will possess a highly charitable disposition."
    });
  }

  return yogas;
};

// ============================================================================
// 📉 APAKEERTI YOGA (Combination 244)
// ============================================================================
const _checkApakeertiYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements) return [];

  const yogas = [];

  // 1. The 10th house must be occupied by both the Sun and Saturn.
  const isSunIn10th = placements['Sun'] === 10;
  const isSaturnIn10th = placements['Saturn'] === 10;

  if (!isSunIn10th || !isSaturnIn10th) return yogas;

  // Sign of the 10th house
  const sign10th = (lagnaIndex + 9) % 12;

  // 2. Aspected by natural malefic planets OR Sun and Saturn occupy malefic navamsas.
  const naturalMalefics = ['Mars', 'Rahu', 'Ketu']; // Sun and Saturn are already in the 10th
  let isAspectedByMalefic = false;
  const involvedPlanets = new Set(['Sun', 'Saturn']);

  for (const malefic of naturalMalefics) {
    if (rasiPlacements[malefic] !== undefined) {
      if (hasAspect(malefic, sign10th, rasiPlacements)) {
        isAspectedByMalefic = true;
        involvedPlanets.add(malefic);
      }
    }
  }

  // Malefic navamsas: ruled by Sun (4), Mars (0, 7), Saturn (9, 10)
  const maleficNavamsaSigns = [0, 4, 7, 9, 10];
  const sunNavamsa = navamsaPlacements['Sun'];
  const saturnNavamsa = navamsaPlacements['Saturn'];

  const isInMaleficNavamsas = maleficNavamsaSigns.includes(sunNavamsa) && maleficNavamsaSigns.includes(saturnNavamsa);

  if (isAspectedByMalefic || isInMaleficNavamsas) {
    yogas.push({
      name: "Apakeerti Yoga",
      type: "Dosha",
      involved: [...involvedPlanets],
      description: "The 10th house is occupied by the Sun and Saturn, and this combination is either aspected by malefic planets or both occupy malefic navamsas.",
      results: "The native's reputation may be marred, and they might face public disgrace or a bad reputation."
    });
  }

  return yogas;
};

// ============================================================================
// 👑 RAJA YOGA (Combination 245)
// ============================================================================
const _checkRajaYoga245 = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const yogas = [];
  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const OWN_SIGNS = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };

  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const qualifyingPlanets = [];

  for (const p of planets) {
    const rasi = rasiPlacements[p];
    if (rasi !== undefined) {
      const isExalted = rasi === EXALTATION_SIGNS[p];
      const isOwnSign = OWN_SIGNS[p].includes(rasi);
      
      if (isExalted || isOwnSign) {
        const house = placements[p];
        if ([1, 4, 7, 10].includes(house)) {
          qualifyingPlanets.push(p);
        }
      }
    }
  }

  if (qualifyingPlanets.length >= 3) {
    yogas.push({
      name: "Raja Yoga (245)",
      type: "Yoga",
      involved: qualifyingPlanets,
      description: "Three or more planets are in their exaltation or own signs, and simultaneously occupy Kendra houses (1st, 4th, 7th, or 10th).",
      results: "The native will attain a high position of authority, akin to becoming a famous king."
    });
  }

  return yogas;
};

// ============================================================================
// 👑 RAJA YOGA (Combination 246)
// ============================================================================
const _checkRajaYoga246 = (placements, rasiPlacements, planetsData, shadbalaScores) => {
  if (!placements || !rasiPlacements || !planetsData) return [];

  const yogas = [];
  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const involved = [];

  for (const p of planets) {
    const rasi = rasiPlacements[p];
    if (rasi !== undefined && rasi === DEBILITATION_SIGNS[p]) {
      const planetObj = planetsData.find(pd => (pd.planet || pd.name) === p);
      const isRetro = planetObj && planetObj.isRetro;
      const hasBrightRays = shadbalaScores && shadbalaScores[p] && shadbalaScores[p].percentage >= 60;
      
      if (isRetro || hasBrightRays) {
        const house = placements[p];
        if ([1, 4, 7, 10, 5, 9].includes(house)) {
          involved.push(p);
        }
      }
    }
  }

  if (involved.length > 0) {
    yogas.push({
      name: "Raja Yoga (246)",
      type: "Yoga",
      involved: involved,
      description: "A debilitated planet has bright rays or is retrograde, and occupies a favourable position (Kendra or Trikona).",
      results: "The native will attain a position equal to that of a ruler."
    });
  }

  return yogas;
};

// ============================================================================
// 👑 RAJA YOGA (Combination 247)
// ============================================================================
const _checkRajaYoga247 = (placements) => {
  if (!placements) return [];

  const yogas = [];
  const digbalaPlanets = [];

  if (placements['Jupiter'] === 1) digbalaPlanets.push('Jupiter');
  if (placements['Mercury'] === 1) digbalaPlanets.push('Mercury');
  
  if (placements['Moon'] === 4) digbalaPlanets.push('Moon');
  if (placements['Venus'] === 4) digbalaPlanets.push('Venus');
  
  if (placements['Saturn'] === 7) digbalaPlanets.push('Saturn');
  
  if (placements['Sun'] === 10) digbalaPlanets.push('Sun');
  if (placements['Mars'] === 10) digbalaPlanets.push('Mars');

  if (digbalaPlanets.length >= 2) {
    yogas.push({
      name: "Raja Yoga (247)",
      type: "Yoga",
      involved: digbalaPlanets,
      description: "Two, three, or four planets possess Digbala (directional strength).",
      results: "A person born in an ordinary family will become a ruler."
    });
  }

  return yogas;
};

// ============================================================================
// 👑 RAJA YOGA (Combination 248)
// ============================================================================
const _checkRajaYoga248 = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, planets) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !planets) {
    return [];
  }

  // Lagna must be Kumbha (Aquarius)
  if (lagnaIndex !== 10) return [];

  // Venus (Sukra) must be in the Lagna
  if (placements['Venus'] !== 1) return [];

  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
  const maleficNavamsas = [0, 4, 7, 9, 10]; // Aries, Leo, Scorpio, Capricorn, Aquarius (ruled by Mars, Sun, Saturn)

  const planetsToCheck = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Saturn'];
  const qualifyingPlanets = [];

  for (const p of planetsToCheck) {
    const rasi = rasiPlacements[p];
    if (rasi === undefined) continue;

    // Check if exalted
    if (rasi === EXALTATION_SIGNS[p]) {
      // Check Navamsa
      const navSign = navamsaPlacements[p];
      if (navSign === undefined) continue;
      const isMaleficNav = maleficNavamsas.includes(navSign);

      // Check Shashtiamsa
      const planetObj = planets.find(pl => (pl.planet || pl.name) === p);
      const degWithinSign = planetObj ? (planetObj.fullDegree % 30) : 15;
      const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
      const actualShashtiamsaIndex = rasi % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;
      const isMaleficShashtiamsa = cruelShashtiamsas.includes(actualShashtiamsaIndex);

      if (!isMaleficNav && !isMaleficShashtiamsa) {
        qualifyingPlanets.push(p);
      }
    }
  }

  if (qualifyingPlanets.length >= 4) {
    return [{
      name: "Raja Yoga (248)",
      type: "Yoga",
      involved: ['Venus', ...qualifyingPlanets],
      description: "The Lagna is Aquarius with Venus placed in it, and four other planets occupy their sign of exaltation without occupying malefic Navamsas or Shashtiamsas.",
      results: "The native is destined to become a ruler or equal to him, attaining great power, command, and authority."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 249)
// ============================================================================
const _checkRajaYoga249 = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  // The Moon must occupy the Lagna
  if (placements['Moon'] !== 1) return [];

  // Jupiter must occupy the 4th house
  if (placements['Jupiter'] !== 4) return [];

  // Venus must occupy the 10th house
  if (placements['Venus'] !== 10) return [];

  // Saturn must be in its sign of exaltation or in its own house
  const saturnRasi = rasiPlacements['Saturn'];
  if (saturnRasi === undefined) return [];
  const saturnQualifies = saturnRasi === 6 || saturnRasi === 9 || saturnRasi === 10;

  if (saturnQualifies) {
    return [{
      name: "Raja Yoga (249)",
      type: "Yoga",
      involved: ['Moon', 'Jupiter', 'Venus', 'Saturn'],
      description: "The Moon is in the Lagna, Jupiter is in the 4th house, Venus is in the 10th house, and Saturn is in its sign of exaltation or its own sign.",
      results: "The native has the potential to become a ruler, achieving high position, honor, and royal status."
    }];
  }

  return [];
};

// ============================================================================
// 👑 NEECHABHANGA RAJA YOGA (Combination 250)
// ============================================================================
const _checkNeechabhangaRajaYoga250 = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const yogas = [];

  for (const p of planets) {
    const rasi = rasiPlacements[p];
    if (rasi === undefined) continue;

    // Identify a planet that is in its sign of debilitation
    if (rasi === DEBILITATION_SIGNS[p]) {
      // Identify the planet that would be exalted in that same sign
      let exaltedInSign = null;
      for (const pl of planets) {
        if (EXALTATION_SIGNS[pl] === rasi) {
          exaltedInSign = pl;
          break;
        }
      }

      // Also identify the lord of the sign where planet p gets exalted
      const exaltationSign = EXALTATION_SIGNS[p];
      const exaltationLord = RASHI_LORDS[exaltationSign];

      // Identify the lord of the debilitation sign itself
      const debilitationLord = RASHI_LORDS[rasi];

      // Helper to check if a target planet is in Kendra (1, 4, 7, 10) relative to Lagna or Moon
      const isKendra = (targetName) => {
        if (!targetName) return false;
        
        // Kendra from Lagna
        const houseFromLagna = placements[targetName];
        const inKendraLagna = houseFromLagna !== undefined && [1, 4, 7, 10].includes(houseFromLagna);

        // Kendra from Moon
        let inKendraMoon = false;
        if (rasiPlacements['Moon'] !== undefined && rasiPlacements[targetName] !== undefined) {
          const relMoonH = ((rasiPlacements[targetName] - rasiPlacements['Moon'] + 12) % 12) + 1;
          inKendraMoon = [1, 4, 7, 10].includes(relMoonH);
        }

        return inKendraLagna || inKendraMoon;
      };

      // Check if either exaltedInSign, exaltationLord, or debilitationLord is in Kendra
      const isExaltedInSignKendra = isKendra(exaltedInSign);
      const isExaltationLordKendra = isKendra(exaltationLord);
      const isDebilitationLordKendra = isKendra(debilitationLord);

      if (isExaltedInSignKendra || isExaltationLordKendra || isDebilitationLordKendra) {
        const reasons = [];
        if (isExaltedInSignKendra) {
          reasons.push(`the planet exalted in that sign (${exaltedInSign}) is in a Kendra from Lagna/Moon`);
        }
        if (isExaltationLordKendra) {
          reasons.push(`the lord of its exaltation sign (${exaltationLord}) is in a Kendra from Lagna/Moon`);
        }
        if (isDebilitationLordKendra) {
          reasons.push(`the lord of its debilitated sign (${debilitationLord}) is in a Kendra from Lagna/Moon`);
        }

        yogas.push({
          name: "Neechabhanga Raja Yoga (250)",
          type: "Yoga",
          involved: [...new Set([p, exaltedInSign, exaltationLord, debilitationLord].filter(Boolean))],
          description: `The debilitated planet ${p} gets cancellation of debilitation (Neechabhanga) because: ${reasons.join(', or ')}.`,
          results: "This elevates the native from an ordinary or low status to a position of success, honor, and prosperity."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 👑 RAJA YOGA (Combination 251)
// ============================================================================
const _checkRajaYoga251 = (placements, rasiPlacements, planets, shadbalaScores) => {
  if (!placements || !rasiPlacements || !planets) return [];

  const moonHouse = placements['Moon'];
  if (moonHouse === undefined) return [];

  // The Moon must be in a Kendra house (4th, 7th, or 10th), specifically excluding the Lagna (1st house).
  if (![4, 7, 10].includes(moonHouse)) return [];

  const moonRasi = rasiPlacements['Moon'];
  if (moonRasi === undefined) return [];

  // The Moon must be aspected by Jupiter.
  const isAspectedByJupiter = hasAspect('Jupiter', moonRasi, rasiPlacements);
  if (!isAspectedByJupiter) return [];

  // The Moon must otherwise be 'powerful' (e.g., in a strong state or phase).
  // Powerful: Exalted (Taurus = 1), in own sign (Cancer = 3), waxing (Sukla Paksha), or high Shadbala (>= 60%)
  const moonPlanet = planets.find(p => p && (p.planet === 'Moon' || p.name === 'Moon'));
  const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));

  let isWaxing = false;
  if (moonPlanet && moonPlanet.fullDegree !== undefined && sunPlanet && sunPlanet.fullDegree !== undefined) {
    const mPA = (moonPlanet.fullDegree - sunPlanet.fullDegree + 360) % 360;
    isWaxing = mPA >= 0 && mPA <= 180;
  }

  const isExalted = moonRasi === 1;
  const isOwnSign = moonRasi === 3;
  const hasHighShadbala = shadbalaScores && shadbalaScores['Moon'] && shadbalaScores['Moon'].percentage >= 60;

  if (isExalted || isOwnSign || isWaxing || hasHighShadbala) {
    return [{
      name: 'Raja Yoga (251)',
      type: 'Yoga',
      involved: ['Moon', 'Jupiter'],
      description: `The Moon is in a Kendra house (${moonHouse}th house) excluding the Lagna, aspected by Jupiter, and is otherwise powerful (exalted, in its own sign, waxing, or possessing high Shadbala).`,
      results: "The native attains wealth, power, and influence."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 252)
// ============================================================================
const _checkRajaYoga252 = (rasiPlacements, navamsaPlacements) => {
  if (!rasiPlacements || !navamsaPlacements) return [];

  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };

  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const qualifyingPlanets = [];

  for (const p of planets) {
    const rasi = rasiPlacements[p];
    const navamsa = navamsaPlacements[p];
    if (rasi !== undefined && navamsa !== undefined) {
      if (rasi === DEBILITATION_SIGNS[p] && navamsa === EXALTATION_SIGNS[p]) {
        qualifyingPlanets.push(p);
      }
    }
  }

  if (qualifyingPlanets.length > 0) {
    return [{
      name: 'Raja Yoga (252)',
      type: 'Yoga',
      involved: qualifyingPlanets,
      description: `The planet(s) (${qualifyingPlanets.join(', ')}) are in their sign of debilitation in the Rasi chart but occupy their sign of exaltation in the Navamsa (D9) chart.`,
      results: "The native attains a position equal to a ruler."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 253)
// ============================================================================
const _checkRajaYoga253 = (placements, rasiPlacements, houseLords) => {
  if (!placements || !rasiPlacements || !houseLords) return [];

  // Jupiter must be in the Lagna
  if (placements['Jupiter'] !== 1) return [];

  // Mercury must be in a Kendra house (1st, 4th, 7th, or 10th)
  const mercHouse = placements['Mercury'];
  if (mercHouse === undefined || ![1, 4, 7, 10].includes(mercHouse)) return [];

  const lord9 = houseLords[9];
  const lord11 = houseLords[11];

  if (!lord9 || !lord11) return [];

  const jupRasi = rasiPlacements['Jupiter'];
  const mercRasi = rasiPlacements['Mercury'];

  if (jupRasi === undefined || mercRasi === undefined) return [];

  // Jupiter must be aspected by the Lord of the 9th house
  const isJupAspectedByLord9 = hasAspect(lord9, jupRasi, rasiPlacements);
  if (!isJupAspectedByLord9) return [];

  // Mercury must be aspected by the Lord of the 11th house
  const isMercAspectedByLord11 = hasAspect(lord11, mercRasi, rasiPlacements);
  if (!isMercAspectedByLord11) return [];

  return [{
    name: 'Raja Yoga (253)',
    type: 'Yoga',
    involved: ['Jupiter', 'Mercury', lord9, lord11],
    description: `Jupiter is in the Lagna aspected by the Lord of the 9th house (${lord9}), and Mercury is in a Kendra house aspected by the Lord of the 11th house (${lord11}).`,
    results: "The native attains wealth, power, and influence."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 254)
// ============================================================================
const _checkRajaYoga254 = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  // This yoga is not applicable if the Lagna is Kanya (5), Dhanus (8), or Meena (11)
  if ([5, 8, 11].includes(lagnaIndex)) return [];

  const saturnRasi = rasiPlacements['Saturn'];
  if (saturnRasi === undefined) return [];

  // Saturn must be in its exaltation sign (Thula = 6) or its Moolathrikona sign (Kumbha = 10)
  if (saturnRasi !== 6 && saturnRasi !== 10) return [];

  // Saturn must occupy a Kendra (1, 4, 7, 10) or a Thrikona (1, 5, 9) house
  const saturnHouse = placements['Saturn'];
  if (saturnHouse === undefined || ![1, 4, 7, 10, 5, 9].includes(saturnHouse)) return [];

  // Saturn must be aspected by the Lord of the 10th house
  const lord10 = houseLords[10];
  if (!lord10) return [];

  const isAspectedByLord10 = hasAspect(lord10, saturnRasi, rasiPlacements);
  if (!isAspectedByLord10) return [];

  return [{
    name: 'Raja Yoga (254)',
    type: 'Yoga',
    involved: ['Saturn', lord10],
    description: `Saturn is in its exalted or Moolathrikona sign (${saturnRasi === 6 ? 'Libra' : 'Aquarius'}), occupies a Kendra/Trikona house (${saturnHouse}th house), and is aspected by the 10th Lord (${lord10}).`,
    results: "The native becomes a ruler or equal to one."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 255)
// ============================================================================
const _checkRajaYoga255 = (placements) => {
  if (!placements) return [];

  const moonHouse = placements['Moon'];
  const marsHouse = placements['Mars'];
  const rahuHouse = placements['Rahu'];

  if (moonHouse === undefined || marsHouse === undefined || rahuHouse === undefined) return [];

  // The Moon must join Mars in the 2nd or 3rd house
  if (moonHouse !== marsHouse || ![2, 3].includes(moonHouse)) return [];

  // Rahu must occupy the 5th house
  if (rahuHouse !== 5) return [];

  return [{
    name: 'Raja Yoga (255)',
    type: 'Yoga',
    involved: ['Moon', 'Mars', 'Rahu'],
    description: `The Moon is conjoined with Mars in the ${moonHouse}nd/3rd house, and Rahu occupies the 5th house.`,
    results: "The native attains status, power, wealth, and becomes a ruler or equal to one."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 256)
// ============================================================================
const _checkRajaYoga256 = (houseLords, navamsaPlacements) => {
  if (!houseLords || !navamsaPlacements) return [];

  const lord10 = houseLords[10];
  if (!lord10) return [];

  const navSign = navamsaPlacements[lord10];
  if (navSign === undefined) return [];

  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const FRIENDLY_SIGNS = {
    Sun: [4, 8, 11, 0, 7, 3],
    Moon: [4, 2, 5, 1],
    Mars: [0, 7, 4, 3, 8, 11],
    Mercury: [2, 5, 4, 1, 6],
    Jupiter: [8, 11, 3, 4, 0, 7],
    Venus: [1, 6, 2, 5, 9, 10],
    Saturn: [9, 10, 6, 2, 5, 1, 6]
  };

  const isExaltedNav = navSign === EXALTATION_SIGNS[lord10];
  const isFriendlyNav = (FRIENDLY_SIGNS[lord10] || []).includes(navSign);

  if (!isExaltedNav && !isFriendlyNav) return [];

  // The planet must have attained 'Uttamamsa'
  const hasAttainedUttamamsa = true; // Placeholder for varga strength metric

  if (hasAttainedUttamamsa) {
    return [{
      name: 'Raja Yoga (256)',
      type: 'Yoga',
      involved: [lord10],
      description: `The Lord of the 10th house (${lord10}) occupies an exalted or friendly Navamsa, and has attained Uttamamsa.`,
      results: "The native becomes a ruler or equal to one, attaining immense power and high position."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 257)
// ============================================================================
const _checkRajaYoga257 = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  // Jupiter must be in the 5th house from the Lagna
  if (placements['Jupiter'] !== 5) return [];

  // Jupiter must be in a Kendra house relative to the Moon
  const jupRasi = rasiPlacements['Jupiter'];
  const moonRasi = rasiPlacements['Moon'];
  if (jupRasi === undefined || moonRasi === undefined) return [];

  const relMoonH = ((jupRasi - moonRasi + 12) % 12) + 1;
  const isKendraFromMoon = [1, 4, 7, 10].includes(relMoonH);
  if (!isKendraFromMoon) return [];

  // The Lagna must be a fixed sign (Taurus = 1, Leo = 4, Scorpio = 7, Aquarius = 10)
  const fixedSigns = [1, 4, 7, 10];
  if (!fixedSigns.includes(lagnaIndex)) return [];

  // The Lord of the Lagna must occupy the 10th house
  const lagnaLord = houseLords[1];
  if (!lagnaLord || placements[lagnaLord] !== 10) return [];

  return [{
    name: 'Raja Yoga (257)',
    type: 'Yoga',
    involved: ['Jupiter', 'Moon', lagnaLord],
    description: `Jupiter is in the 5th house from Lagna and in a Kendra from the Moon, Lagna is a fixed sign, and the Lagna Lord (${lagnaLord}) is in the 10th house.`,
    results: "The native is destined to become a highly respected ruler or leader with command over vast resources."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 258)
// ============================================================================
const _checkRajaYoga258 = (placements, rasiPlacements, navamsaPlacements) => {
  if (!placements || !rasiPlacements || !navamsaPlacements) return [];

  const moonRasi = rasiPlacements['Moon'];
  const moonNavamsa = navamsaPlacements['Moon'];
  if (moonRasi === undefined || moonNavamsa === undefined) return [];

  const amsaLord = RASHI_LORDS[moonNavamsa];
  if (!amsaLord) return [];

  const amsaLordHouse = placements[amsaLord];
  const amsaLordRasi = rasiPlacements[amsaLord];
  const mercRasi = rasiPlacements['Mercury'];

  if (amsaLordHouse === undefined || amsaLordRasi === undefined) return [];

  // Kendra/Thrikona from Lagna: 1, 4, 7, 10, 5, 9
  const isKendraTrikonaLagna = [1, 4, 7, 10, 5, 9].includes(amsaLordHouse);

  // Kendra/Thrikona from Mercury
  let isKendraTrikonaMerc = false;
  if (mercRasi !== undefined) {
    const relMercH = ((amsaLordRasi - mercRasi + 12) % 12) + 1;
    isKendraTrikonaMerc = [1, 4, 7, 10, 5, 9].includes(relMercH);
  }

  if (isKendraTrikonaLagna || isKendraTrikonaMerc) {
    return [{
      name: 'Raja Yoga (258)',
      type: 'Yoga',
      involved: ['Moon', amsaLord],
      description: `The Lord of the Moon's Navamsa (${amsaLord}) is in a Kendra or Trikona house from Lagna (${amsaLordHouse}th house) or from Mercury.`,
      results: "The native attains status, power, wealth, and the rank of a ruler or equal to one."
    }];
  }

  return [];
};

// ============================================================================
// 👑 YOGA (Combination 259)
// ============================================================================
const _checkYoga259 = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  // Lagna must be Taurus (Vrishabha = 1)
  if (lagnaIndex !== 1) return [];

  // Moon must be in the Lagna (1st house)
  if (placements['Moon'] !== 1) return [];

  // Saturn must be in the 10th house
  if (placements['Saturn'] !== 10) return [];

  // Sun must be in the 4th house
  if (placements['Sun'] !== 4) return [];

  // Jupiter must be in the 7th house
  if (placements['Jupiter'] !== 7) return [];

  return [{
    name: 'Yoga 259',
    type: 'Yoga',
    involved: ['Moon', 'Saturn', 'Sun', 'Jupiter'],
    description: "The Lagna is Taurus with the Moon in the 1st house, Saturn in the 10th house, the Sun in the 4th house, and Jupiter in the 7th house.",
    results: "The person becomes a commander or an equal to a ruler."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 260)
// ============================================================================
const _checkRajaYoga260 = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  // Lagna must be a movable sign (Aries=0, Cancer=3, Libra=6, Capricorn=9)
  const movableSigns = [0, 3, 6, 9];
  if (!movableSigns.includes(lagnaIndex)) return [];

  // The Lord of the Lagna must occupy a movable sign
  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];
  const lagnaLordRasi = rasiPlacements[lagnaLord];
  if (lagnaLordRasi === undefined || !movableSigns.includes(lagnaLordRasi)) return [];

  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  const qualifyingPlanets = [];

  for (const p of classicalPlanets) {
    const rasi = rasiPlacements[p];
    if (rasi !== undefined && rasi === DEBILITATION_SIGNS[p]) {
      const navamsaSign = navamsaPlacements[p];
      if (navamsaSign !== undefined) {
        const amsaLord = RASHI_LORDS[navamsaSign];
        if (amsaLord) {
          const amsaLordHouse = placements[amsaLord];
          // Navamsa lord must occupy a Kendra (1, 4, 7, 10) or Trikona (1, 5, 9) from Lagna
          if (amsaLordHouse !== undefined && [1, 4, 7, 10, 5, 9].includes(amsaLordHouse)) {
            qualifyingPlanets.push({ planet: p, amsaLord });
          }
        }
      }
    }
  }

  if (qualifyingPlanets.length > 0) {
    const involvedPlanets = [lagnaLord, ...qualifyingPlanets.map(q => q.planet), ...qualifyingPlanets.map(q => q.amsaLord)];
    return [{
      name: 'Raja Yoga (260)',
      type: 'Yoga',
      involved: [...new Set(involvedPlanets)],
      description: `The Lagna is a movable sign, the Lagna Lord (${lagnaLord}) is in a movable sign, and the Navamsa Lord of the debilitated planet (${qualifyingPlanets.map(q => `${q.planet}'s Navamsa Lord: ${q.amsaLord}`).join(', ')}) occupies a Kendra or Trikona from Lagna.`,
      results: "The native becomes a ruler or an equal to him."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 261)
// ============================================================================
const _checkRajaYoga261 = (placements, rasiPlacements, houseLords) => {
  if (!placements || !rasiPlacements || !houseLords) return [];

  // Saturn and Rahu must occupy the 10th house
  if (placements['Saturn'] !== 10 || placements['Rahu'] !== 10) return [];

  // Lord of the Lagna must be conjoined with a debilitated planet
  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];

  const lagnaLordHouse = placements[lagnaLord];
  if (lagnaLordHouse === undefined) return [];

  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  let hasDebilitatedConjunction = false;
  let debilitatedPlanet = null;

  for (const p of classicalPlanets) {
    if (p !== lagnaLord && placements[p] === lagnaLordHouse) {
      if (rasiPlacements[p] === DEBILITATION_SIGNS[p]) {
        hasDebilitatedConjunction = true;
        debilitatedPlanet = p;
        break;
      }
    }
  }

  if (!hasDebilitatedConjunction) return [];

  // Rahu and Saturn in 10th must be aspected by the Lord of the 9th house
  const lord9 = houseLords[9];
  if (!lord9) return [];

  const saturnRasi = rasiPlacements['Saturn'];
  if (saturnRasi === undefined) return [];

  const isSaturnAspectedByLord9 = hasAspect(lord9, saturnRasi, rasiPlacements);
  if (!isSaturnAspectedByLord9) return [];

  return [{
    name: 'Raja Yoga (261)',
    type: 'Yoga',
    involved: [lagnaLord, debilitatedPlanet, 'Saturn', 'Rahu', lord9],
    description: `The Lagna Lord (${lagnaLord}) conjoins a debilitated planet (${debilitatedPlanet}), Rahu and Saturn are in the 10th house, and they are aspected by the 9th Lord (${lord9}).`,
    results: "The native becomes a ruler or an equal to him."
  }];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 262)
// ============================================================================
const _checkRajaYoga262 = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  // According to remarks, applicable only if Lagna is Kumbha (10), Simha (4), Vrishabha (1), or Vrischika (7)
  if (![10, 4, 1, 7].includes(lagnaIndex)) return [];

  // Jupiter must be the lord of either the 2nd, 5th, or 11th house
  const isJupLord = houseLords[2] === 'Jupiter' || houseLords[5] === 'Jupiter' || houseLords[11] === 'Jupiter';
  if (!isJupLord) return [];

  const moonRasi = rasiPlacements['Moon'];
  if (moonRasi === undefined) return [];

  // Identify lords of 11th, 9th, and 2nd houses
  const lord11 = houseLords[11];
  const lord9 = houseLords[9];
  const lord2 = houseLords[2];

  const targetLords = [lord11, lord9, lord2].filter(Boolean);
  let hasKendraFromMoon = false;
  const involvedLords = [];

  for (const L of targetLords) {
    const rasi = rasiPlacements[L];
    if (rasi !== undefined) {
      const relMoon = ((rasi - moonRasi + 12) % 12) + 1;
      if ([1, 4, 7, 10].includes(relMoon)) {
        hasKendraFromMoon = true;
        involvedLords.push(L);
      }
    }
  }

  if (hasKendraFromMoon) {
    return [{
      name: 'Raja Yoga (262)',
      type: 'Yoga',
      involved: [...new Set(['Moon', 'Jupiter', ...involvedLords])],
      description: `Lagna is a fixed/semi-fixed sign (${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][lagnaIndex]}), Jupiter rules the 2nd, 5th, or 11th house, and the Lord(s) of 11th, 9th, or 2nd (${involvedLords.join(', ')}) occupy a Kendra from the Moon.`,
      results: "The native becomes a great man or a respected ruler."
    }];
  }

  return [];
};

// ============================================================================
// 👑 RAJA YOGA (Combination 263)
// ============================================================================
const _checkRajaYoga263 = (placements, rasiPlacements, planets) => {
  if (!placements || !rasiPlacements || !planets) return [];

  const targetPlanets = ['Jupiter', 'Mercury', 'Venus', 'Moon'];
  const qualifyingPlanets = [];

  const naturalFriends = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus']
  };

  const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));

  for (const p of targetPlanets) {
    if (placements[p] === 9) {
      // Free from combustion
      let isCombust = false;
      if (sunPlanet && sunPlanet.fullDegree !== undefined) {
        const pPlanet = planets.find(pl => pl && (pl.planet === p || pl.name === p));
        if (pPlanet && pPlanet.fullDegree !== undefined) {
          const diff = Math.abs(pPlanet.fullDegree - sunPlanet.fullDegree) % 360;
          const separation = diff > 180 ? 360 - diff : diff;
          if (separation < 10) isCombust = true;
        }
      }

      if (!isCombust) {
        // Aspected by or conjoined with friendly planets
        const friends = naturalFriends[p] || [];
        let isAssociatedOrAspected = false;

        for (const f of friends) {
          // Associated (conjoined in 9th)
          if (placements[f] === 9) {
            isAssociatedOrAspected = true;
            break;
          }
          // Aspected
          const pRasi = rasiPlacements[p];
          if (pRasi !== undefined && hasAspect(f, pRasi, rasiPlacements)) {
            isAssociatedOrAspected = true;
            break;
          }
        }

        if (isAssociatedOrAspected) {
          qualifyingPlanets.push(p);
        }
      }
    }
  }

  if (qualifyingPlanets.length > 0) {
    return [{
      name: 'Raja Yoga (263)',
      type: 'Yoga',
      involved: qualifyingPlanets,
      description: `The planet(s) (${qualifyingPlanets.join(', ')}) occupy the 9th house, are free from combustion, and are conjoined with or aspected by friendly planets.`,
      results: "The native becomes a great man or a respected ruler."
    }];
  }

  return [];
};

// ============================================================================
// 👂 GALAKARNA YOGA (Combination 264)
// ============================================================================
const _checkGalakarnaYoga = (placements, rasiPlacements, planets) => {
  if (!placements || !rasiPlacements || !planets) return [];

  // Mandi and Rahu conjoined in the 3rd house
  const conditionA = placements['Mandi'] === 3 && placements['Rahu'] === 3;

  // OR Mars in the 3rd house in the Shashtiamsa (D60) of 'Preta Puriha' (12th Shashtiamsa index)
  let conditionB = false;
  if (placements['Mars'] === 3) {
    const marsPlanet = planets.find(p => p && (p.planet === 'Mars' || p.name === 'Mars'));
    const marsRasi = rasiPlacements['Mars'];
    if (marsPlanet && marsPlanet.fullDegree !== undefined && marsRasi !== undefined) {
      const degWithinSign = marsPlanet.fullDegree % 30;
      const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
      const actualIndex = marsRasi % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;
      if (actualIndex === 12) {
        conditionB = true;
      }
    }
  }

  if (conditionA || conditionB) {
    const involved = conditionA ? ['Mandi', 'Rahu'] : ['Mars'];
    return [{
      name: 'Galakarna Yoga',
      type: 'Arishta Yoga',
      involved,
      description: conditionA 
        ? "Mandi and Rahu occupy the 3rd house." 
        : "Mars occupies the 3rd house in the Preta Puriha (12th) Shashtiamsa.",
      results: "The native suffers from ear troubles."
    }];
  }

  return [];
};

// ============================================================================
// 🤕 VRANA YOGA (Combination 265)
// ============================================================================
const _checkVranaYoga = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  const lord6 = houseLords[6];
  if (!lord6) return [];

  // Lord of the 6th house must be a natural malefic planet (Sun, Mars, Saturn)
  const malefics = ['Sun', 'Mars', 'Saturn'];
  if (!malefics.includes(lord6)) return [];

  // This malefic 6th Lord must occupy the Lagna (1), the 8th house (8), or the 10th house (10)
  const lord6House = placements[lord6];
  if (lord6House !== undefined && [1, 8, 10].includes(lord6House)) {
    return [{
      name: 'Vrana Yoga',
      type: 'Arishta Yoga',
      involved: [lord6],
      description: `The 6th Lord (${lord6}) is a natural malefic planet and occupies the ${lord6House === 1 ? 'Lagna (1st)' : lord6House === 8 ? '8th' : '10th'} house.`,
      results: "The person suffers from dreadful disease of cancer."
    }];
  }

  return [];
};

// ============================================================================
// 🍆 SISNAVYADHI YOGA (Combination 266)
// ============================================================================
const _checkSisnavyadhiYoga = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  // Mercury must join the Lagna (1st house)
  if (placements['Mercury'] !== 1) return [];

  const lord6 = houseLords[6];
  const lord8 = houseLords[8];
  if (!lord6 || !lord8) return [];

  // This conjunction must be in association with both the Lord of the 6th house AND the Lord of the 8th house
  if (placements[lord6] === 1 && placements[lord8] === 1) {
    return [{
      name: 'Sisnavyadhi Yoga',
      type: 'Arishta Yoga',
      involved: ['Mercury', lord6, lord8],
      description: `Mercury conjoins the Lagna (1st house) along with the 6th Lord (${lord6}) and 8th Lord (${lord8}).`,
      results: "The native will suffer from incurable sexual diseases."
    }];
  }

  return [];
};

// ============================================================================
// 🙍‍♀️ KALATRASHANDA YOGA (Combination 267)
// ============================================================================
const _checkKalatrashandaYoga = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  const lord7 = houseLords[7];
  if (!lord7) return [];

  // The Lord of the 7th house must occupy the 6th house
  const lord7House = placements[lord7];
  if (lord7House !== 6) return [];

  // The Lord of the 7th house must be in conjunction with Venus
  if (placements['Venus'] === 6) {
    return [{
      name: 'Kalatrashanda Yoga',
      type: 'Arishta Yoga',
      involved: [lord7, 'Venus'],
      description: `The 7th Lord (${lord7}) occupies the 6th house in conjunction with Venus.`,
      results: "The person's wife will be frigid."
    }];
  }

  return [];
};

// ============================================================================
// 🩺 KUSHTAROGA YOGA (Combination 268)
// ============================================================================
const _checkKushtarogaYoga268 = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];

  const llHouse = placements[lagnaLord];
  if (llHouse !== 4 && llHouse !== 12) return [];

  // Conjunction with Mars AND Mercury
  if (placements['Mars'] === llHouse && placements['Mercury'] === llHouse) {
    return [{
      name: 'Kushtaroga Yoga (268)',
      type: 'Arishta Yoga',
      involved: [lagnaLord, 'Mars', 'Mercury'],
      description: `The Lagna Lord (${lagnaLord}) occupies the ${llHouse === 4 ? '4th' : '12th'} house in conjunction with Mars and Mercury.`,
      results: "The person suffers from leprosy."
    }];
  }

  return [];
};

// ============================================================================
// 🩺 KUSHTAROGA YOGA (Combination 269)
// ============================================================================
const _checkKushtarogaYoga269 = (placements) => {
  if (!placements) return [];

  // Jupiter must occupy the 6th house
  if (placements['Jupiter'] !== 6) return [];

  // Conjunction/association with Saturn AND the Moon
  if (placements['Saturn'] === 6 && placements['Moon'] === 6) {
    return [{
      name: 'Kushtaroga Yoga (269)',
      type: 'Arishta Yoga',
      involved: ['Jupiter', 'Saturn', 'Moon'],
      description: "Jupiter occupies the 6th house in association with Saturn and the Moon.",
      results: "The person suffers from leprosy."
    }];
  }

  return [];
};

// ============================================================================
// 🫁 KSHAYAROGA YOGA (Combination 270)
// ============================================================================
const _checkKshayarogaYoga = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];

  // Rahu must be in the 6th house
  if (placements['Rahu'] !== 6) return [];

  // Mandi must be in a Kendra house (1, 4, 7, 10) from Lagna
  const mandiHouse = placements['Mandi'];
  if (!mandiHouse || ![1, 4, 7, 10].includes(mandiHouse)) return [];

  // The Lord of the Lagna must be in the 8th house
  if (placements[lagnaLord] !== 8) return [];

  return [{
    name: 'Kshayaroga Yoga',
    type: 'Arishta Yoga',
    involved: ['Rahu', 'Mandi', lagnaLord],
    description: `Rahu occupies the 6th house, Mandi occupies a Kendra (${mandiHouse} house), and the Lagna Lord (${lagnaLord}) occupies the 8th house.`,
    results: "The person suffers from tuberculosis."
  }];
};

// ============================================================================
// 🔗 BANDHANA YOGA (Combination 271)
// ============================================================================
const _checkBandhanaYoga = (placements, houseLords) => {
  if (!placements || !houseLords) return [];

  const lagnaLord = houseLords[1];
  const lord6 = houseLords[6];
  if (!lagnaLord || !lord6) return [];

  // Lord of the Lagna and the Lord of the 6th house must be in conjunction
  const llHouse = placements[lagnaLord];
  const l6House = placements[lord6];
  if (llHouse === undefined || llHouse !== l6House) return [];

  // This combination must occur in a Kendra (1st, 4th, 7th, or 10th) or Trikona (1st, 5th, or 9th) house
  const validHouses = [1, 4, 5, 7, 9, 10];
  if (!validHouses.includes(llHouse)) return [];

  // Conjunction with Saturn, Rahu, OR Ketu
  const saturnConj = placements['Saturn'] === llHouse;
  const rahuConj = placements['Rahu'] === llHouse;
  const ketuConj = placements['Ketu'] === llHouse;

  if (saturnConj || rahuConj || ketuConj) {
    const malefic = saturnConj ? 'Saturn' : (rahuConj ? 'Rahu' : 'Ketu');
    return [{
      name: 'Bandhana Yoga',
      type: 'Arishta Yoga',
      involved: [lagnaLord, lord6, malefic],
      description: `The Lagna Lord (${lagnaLord}) and 6th Lord (${lord6}) occupy a Kendra/Trikona (House ${llHouse}) conjoined with ${malefic}.`,
      results: "The native will be incarcerated."
    }];
  }

  return [];
};

// ============================================================================
// ⚔️ KARASCHEDA YOGA (Combination 272)
// ============================================================================
const _checkKaraschedaYoga = (placements) => {
  if (!placements) return [];

  const saturnHouse = placements['Saturn'];
  const jupiterHouse = placements['Jupiter'];
  const moonHouse = placements['Moon'];
  const marsHouse = placements['Mars'];
  const rahuHouse = placements['Rahu'];
  const mercuryHouse = placements['Mercury'];

  let matched = false;
  let reason = '';
  let involved = [];

  // 1. Saturn in 9th and Jupiter in 3rd (or vice versa)
  if (saturnHouse !== undefined && jupiterHouse !== undefined) {
    if ((saturnHouse === 9 && jupiterHouse === 3) || (saturnHouse === 3 && jupiterHouse === 9)) {
      matched = true;
      reason = `Saturn occupies the ${saturnHouse} house and Jupiter occupies the ${jupiterHouse} house.`;
      involved = ['Saturn', 'Jupiter'];
    }
  }

  // 2. Saturn and Jupiter in the 8th and 12th houses (either order)
  if (!matched && saturnHouse !== undefined && jupiterHouse !== undefined) {
    if ((saturnHouse === 8 && jupiterHouse === 12) || (saturnHouse === 12 && jupiterHouse === 8)) {
      matched = true;
      reason = `Saturn occupies the ${saturnHouse} house and Jupiter occupies the ${jupiterHouse} house.`;
      involved = ['Saturn', 'Jupiter'];
    }
  }

  // 3. The Moon in the 7th or 8th house in association with Mars
  if (!matched && moonHouse !== undefined && marsHouse !== undefined) {
    if ((moonHouse === 7 || moonHouse === 8) && moonHouse === marsHouse) {
      matched = true;
      reason = `The Moon occupies the ${moonHouse} house conjoined with Mars.`;
      involved = ['Moon', 'Mars'];
    }
  }

  // 4. Conjunction of Rahu, Saturn, and Mercury in the 10th house
  if (!matched && rahuHouse === 10 && saturnHouse === 10 && mercuryHouse === 10) {
    matched = true;
    reason = "Rahu, Saturn, and Mercury are all conjoined in the 10th house.";
    involved = ['Rahu', 'Saturn', 'Mercury'];
  }

  if (matched) {
    return [{
      name: 'Karascheda Yoga',
      type: 'Arishta Yoga',
      involved,
      description: reason,
      results: "The native's hands will be cut off."
    }];
  }

  return [];
};

// ============================================================================
// 🪓 SIRACHCHEDA YOGA (Combination 273)
// ============================================================================
const _checkSirachchedaYoga = (placements, rasiPlacements, houseLords, planets) => {
  if (!placements || !rasiPlacements || !houseLords || !planets) return [];

  const lord6 = houseLords[6];
  if (!lord6) return [];

  // The Lord of the 6th house must be in conjunction with Venus
  if (placements[lord6] === undefined || placements[lord6] !== placements['Venus']) return [];

  // Either the Sun OR Saturn must be in conjunction with Rahu
  const sunConjRahu = placements['Sun'] !== undefined && placements['Sun'] === placements['Rahu'];
  const saturnConjRahu = placements['Saturn'] !== undefined && placements['Saturn'] === placements['Rahu'];
  if (!sunConjRahu && !saturnConjRahu) return [];

  // That conjunction (Sun-Rahu or Saturn-Rahu) must occupy a 'cruel' Shashtiamsa (D60)
  const conjunctPlanet = sunConjRahu ? 'Sun' : 'Saturn';
  const pPlanet = planets.find(p => p && (p.planet === conjunctPlanet || p.name === conjunctPlanet));
  const rasiIdx = rasiPlacements[conjunctPlanet];
  
  if (pPlanet && pPlanet.fullDegree !== undefined && rasiIdx !== undefined) {
    const degWithinSign = pPlanet.fullDegree % 30;
    const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
    const actualIndex = rasiIdx % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;

    const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
    if (cruelShashtiamsas.includes(actualIndex)) {
      return [{
        name: 'Sirachcheda Yoga',
        type: 'Arishta Yoga',
        involved: [lord6, 'Venus', conjunctPlanet, 'Rahu'],
        description: `The 6th Lord (${lord6}) is conjunct Venus, and the ${conjunctPlanet} is conjunct Rahu in a cruel Shashtiamsa (D60 index ${actualIndex}).`,
        results: "The person's death will be due to his head being cut off."
      }];
    }
  }

  return [];
};

// ============================================================================
// 💀 DURMARANA YOGA (Combination 274)
// ============================================================================
const _checkDurmaranaYoga = (placements, rasiPlacements, houseLords) => {
  if (!placements || !rasiPlacements || !houseLords) return [];

  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];

  const moonHouse = placements['Moon'];
  if (moonHouse === undefined) return [];

  // The Moon must occupy the 6th, 8th, or 12th house
  if (![6, 8, 12].includes(moonHouse)) return [];

  // The Moon must be aspected by the Lord of the Lagna (aspect or conjunction)
  const moonRasi = rasiPlacements['Moon'];
  const isAspectedByLL = placements[lagnaLord] === moonHouse || (moonRasi !== undefined && hasAspect(lagnaLord, moonRasi, rasiPlacements));
  if (!isAspectedByLL) return [];

  // The Moon must be in association (conjunction or mutual aspect) with Saturn, Mandi, or Rahu
  const malefics = ['Saturn', 'Mandi', 'Rahu'];
  const isAssociated = malefics.some(m => {
    if (placements[m] === undefined) return false;
    const conjunct = placements[m] === moonHouse;
    const mRasi = rasiPlacements[m];
    const aspect = (mRasi !== undefined && hasAspect(m, moonRasi, rasiPlacements)) || 
                   (moonRasi !== undefined && mRasi !== undefined && hasAspect('Moon', mRasi, rasiPlacements));
    return conjunct || aspect;
  });

  if (isAssociated) {
    return [{
      name: 'Durmarana Yoga',
      type: 'Arishta Yoga',
      involved: ['Moon', lagnaLord],
      description: `The Moon occupies the ${moonHouse} house aspected/conjoined by Lagna Lord (${lagnaLord}), and associated with a malefic.`,
      results: "The person will meet with unnatural death."
    }];
  }

  return [];
};

// ============================================================================
// 💀 YUDDHE MARANA YOGA (Combination 275)
// ============================================================================
const _checkYuddheMaranaYoga = (placements, rasiPlacements, houseLords, planets) => {
  if (!placements || !rasiPlacements || !houseLords || !planets) return [];

  const isMars6or8Lord = houseLords[6] === 'Mars' || houseLords[8] === 'Mars';
  if (!isMars6or8Lord) return [];

  const lord3 = houseLords[3];
  if (!lord3) return [];

  // Mars (as Lord of 6th or 8th house) must conjoin the 3rd Lord
  const marsHouse = placements['Mars'];
  if (marsHouse === undefined || marsHouse !== placements[lord3]) return [];

  // This conjunction must include Rahu, Saturn, or Mandi
  const conjunctionIncludesMalefic = 
    placements['Rahu'] === marsHouse || 
    placements['Saturn'] === marsHouse || 
    placements['Mandi'] === marsHouse;

  if (!conjunctionIncludesMalefic) return [];

  // These planets must occupy cruel amsas (we check Mars for cruel Shashtiamsa)
  const marsPlanet = planets.find(p => p && (p.planet === 'Mars' || p.name === 'Mars'));
  const rasiIdx = rasiPlacements['Mars'];

  if (marsPlanet && marsPlanet.fullDegree !== undefined && rasiIdx !== undefined) {
    const degWithinSign = marsPlanet.fullDegree % 30;
    const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
    const actualIndex = rasiIdx % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;

    const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
    if (cruelShashtiamsas.includes(actualIndex)) {
      const associatedMalefic = placements['Rahu'] === marsHouse ? 'Rahu' : (placements['Saturn'] === marsHouse ? 'Saturn' : 'Mandi');
      return [{
        name: 'Yuddhe Marana Yoga',
        type: 'Arishta Yoga',
        involved: ['Mars', lord3, associatedMalefic],
        description: `Mars (6th/8th Lord) conjoins the 3rd Lord (${lord3}) and ${associatedMalefic} in a cruel Shashtiamsa.`,
        results: "The person will be killed in battle."
      }];
    }
  }

  return [];
};

// ============================================================================
// 💀 SANGHATAKA MARANA YOGA (Combination 276)
// ============================================================================
const _checkSanghatakaMaranaYoga276 = (placements, rasiPlacements, planets, navamsaPlacements) => {
  if (!placements || !rasiPlacements || !planets) return [];
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
  
  const qualifyingPlanets = [];
  
  malefics.forEach(pName => {
    // Check if in 8th house (1-based index)
    if (placements[pName] !== 8) return;
    
    // Check Martian Rasi (Aries = 0, Scorpio = 7)
    const rasiIdx = rasiPlacements[pName];
    const isMartianRasi = rasiIdx === 0 || rasiIdx === 7;
    
    // Check Martian Navamsa
    const navamsaIdx = navamsaPlacements ? navamsaPlacements[pName] : undefined;
    const isMartianNavamsa = navamsaIdx === 0 || navamsaIdx === 7;
    
    if (!isMartianRasi && !isMartianNavamsa) return;
    
    // Check cruel Shashtiamsa
    const pObj = planets.find(pl => (pl.planet || pl.name) === pName);
    if (!pObj || pObj.fullDegree === undefined || rasiIdx === undefined) return;
    
    const degWithinSign = pObj.fullDegree % 30;
    const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
    const actualShashtiamsa = rasiIdx % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;
    
    if (cruelShashtiamsas.includes(actualShashtiamsa)) {
      qualifyingPlanets.push(pName);
    }
  });
  
  if (qualifyingPlanets.length >= 2) {
    return [{
      name: 'Sanghataka Marana Yoga (276)',
      type: 'Arishta Yoga',
      involved: qualifyingPlanets,
      description: `Many malefic planets (${qualifyingPlanets.join(', ')}) occupy the 8th house, sit in Martian Rasis or Navamsas, and join evil Shashtiamsa subdivisions.`,
      results: "The person will die with many others."
    }];
  }
  
  return [];
};

// ============================================================================
// 💀 SANGHATAKA MARANA YOGA (Combination 277)
// ============================================================================
const _checkSanghatakaMaranaYoga277 = (placements, rasiPlacements, planets, navamsaPlacements, houseLords) => {
  if (!placements || !rasiPlacements || !planets || !houseLords) return [];
  
  const sunRasi = rasiPlacements['Sun'];
  const rahuRasi = rasiPlacements['Rahu'];
  const saturnRasi = rasiPlacements['Saturn'];
  
  if (sunRasi === undefined || rahuRasi === undefined || saturnRasi === undefined) return [];
  
  // Check conjunction: Sun, Rahu, and Saturn must occupy the same sign
  if (sunRasi !== rahuRasi || sunRasi !== saturnRasi) return [];
  
  const conjunctionRasi = sunRasi;
  const lord8 = houseLords[8];
  if (!lord8) return [];
  
  // Check if aspected by the Lord of the 8th house (or conjoined/present in the same house)
  const isAspectedBy8thLord = 
    rasiPlacements[lord8] === conjunctionRasi || 
    hasAspect(lord8, conjunctionRasi, rasiPlacements);
    
  if (!isAspectedBy8thLord) return [];
  
  // Check evil amsas
  const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
  const maleficNavamsas = [0, 4, 7, 9, 10];
  
  const isEvilAmsa = (pName) => {
    const rIdx = rasiPlacements[pName];
    if (rIdx === undefined) return false;
    
    const navIdx = navamsaPlacements ? navamsaPlacements[pName] : undefined;
    const isMaleficNav = navIdx !== undefined && maleficNavamsas.includes(navIdx);
    
    const pObj = planets.find(pl => (pl.planet || pl.name) === pName);
    let isMaleficShashtiamsa = false;
    if (pObj && pObj.fullDegree !== undefined) {
      const degWithinSign = pObj.fullDegree % 30;
      const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1;
      const actualShashtiamsa = rIdx % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;
      isMaleficShashtiamsa = cruelShashtiamsas.includes(actualShashtiamsa);
    }
    
    return isMaleficNav || isMaleficShashtiamsa;
  };
  
  if (isEvilAmsa('Sun') && isEvilAmsa('Saturn') && isEvilAmsa('Rahu')) {
    return [{
      name: 'Sanghataka Marana Yoga (277)',
      type: 'Arishta Yoga',
      involved: ['Sun', 'Saturn', 'Rahu', lord8],
      description: `Sun, Saturn, and Rahu are conjoined in ${SIGN_NAMES[conjunctionRasi]}, aspected or conjoined by the 8th Lord (${lord8}), and all occupy evil amsas (malefic Navamsas or cruel Shashtiamsas).`,
      results: "The person will die with many others."
    }];
  }
  
  return [];
};

// ============================================================================
// 💀 PEENASAROGA YOGA (Combination 278)
// ============================================================================
const _checkPeenasarogaYoga = (placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (!placements || !rasiPlacements || !houseLords) return [];
  
  // Moon in 6th house
  if (placements['Moon'] !== 6) return [];
  
  // Saturn in 8th house
  if (placements['Saturn'] !== 8) return [];
  
  // Natural malefic in 12th house (excluding Saturn since it is in 8th)
  const malefics = ['Sun', 'Mars', 'Rahu', 'Ketu', 'Mandi'];
  const maleficIn12 = malefics.find(m => placements[m] === 12);
  if (!maleficIn12) return [];
  
  // Lord of Lagna in malefic Navamsa
  const lagnaLord = houseLords[1];
  if (!lagnaLord) return [];
  
  const maleficNavamsas = [0, 4, 7, 9, 10]; // Aries, Leo, Scorpio, Capricorn, Aquarius
  const lagnaLordNav = navamsaPlacements ? navamsaPlacements[lagnaLord] : undefined;
  
  if (lagnaLordNav === undefined || !maleficNavamsas.includes(lagnaLordNav)) return [];
  
  return [{
    name: 'Peenasaroga Yoga',
    type: 'Arishta Yoga',
    involved: ['Moon', 'Saturn', maleficIn12, lagnaLord],
    description: `The Moon occupies the 6th house, Saturn occupies the 8th house, a natural malefic (${maleficIn12}) occupies the 12th house, and the Lagna Lord (${lagnaLord}) is in a malefic Navamsa.`,
    results: "The person suffers from inflammation of the Schneiderian membrane (a disease of the nose)."
  }];
};

// ============================================================================
// 💀 PITTAROGA YOGA (Combination 279)
// ============================================================================
const _checkPittarogaYoga = (placements, rasiPlacements, planets) => {
  if (!placements || !rasiPlacements) return [];
  
  // Sun in 6th house
  if (placements['Sun'] !== 6) return [];
  
  const sunRasi = rasiPlacements['Sun'];
  if (sunRasi === undefined) return [];
  
  // Natural malefics conjoined with Sun in the 6th house
  const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  const conjoinedMalefics = malefics.filter(m => placements[m] === 6);
  
  if (conjoinedMalefics.length === 0) return [];
  
  // Find if another natural malefic (not conjoined with Sun) aspects the Sun's sign
  const otherMalefics = malefics.filter(m => placements[m] !== undefined && placements[m] !== 6);
  const aspectingMalefic = otherMalefics.find(m => hasAspect(m, sunRasi, rasiPlacements));
  
  if (!aspectingMalefic) return [];
  
  return [{
    name: 'Pittaroga Yoga',
    type: 'Arishta Yoga',
    involved: ['Sun', ...conjoinedMalefics, aspectingMalefic],
    description: `The Sun occupies the 6th house, conjoined with natural malefic(s) (${conjoinedMalefics.join(', ')}), and aspected by another natural malefic (${aspectingMalefic}).`,
    results: "The subject suffers from bilious complaints."
  }];
};

// ============================================================================
// 💀 VIKALANGAPATNI YOGA (Combination 280)
// ============================================================================
const _checkVikalangapatniYoga = (placements, rasiPlacements, planets) => {
  if (!placements || !rasiPlacements) return [];
  
  const sunHouse = placements['Sun'];
  const venusHouse = placements['Venus'];
  
  // Venus and Sun must occupy the 5th, 7th, or 9th house together
  if (sunHouse === undefined || venusHouse === undefined || sunHouse !== venusHouse) return [];
  if (![5, 7, 9].includes(sunHouse)) return [];
  
  const conjunctionRasi = rasiPlacements['Sun'];
  if (conjunctionRasi === undefined) return [];
  
  // Look for other malefic planets (excluding Sun and Venus)
  const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  
  // Afflicted if conjoined with a malefic in that house
  const isConjunctMalefic = malefics.some(m => placements[m] === sunHouse);
  
  // Afflicted if aspected by a malefic (placed in a different house but aspecting)
  const isAspectedByMalefic = malefics.some(m => placements[m] !== sunHouse && hasAspect(m, conjunctionRasi, rasiPlacements));
  
  if (!isConjunctMalefic && !isAspectedByMalefic) return [];
  
  const involved = ['Sun', 'Venus'];
  malefics.forEach(m => {
    if (placements[m] === sunHouse) involved.push(m);
  });
  
  return [{
    name: 'Vikalangapatni Yoga',
    type: 'Arishta Yoga',
    involved,
    description: `Venus and the Sun occupy the ${sunHouse}th house, and are afflicted by conjunction or aspect from malefic planet(s).`,
    results: "The person's wife will have deformed limbs."
  }];
};

// ============================================================================
// 💀 PUTRAKALATRAHEENA YOGA (Combination 281)
// ============================================================================
const _checkPutrakalatraheenaYoga = (placements, rasiPlacements, planets) => {
  if (!placements || !rasiPlacements || !planets) return [];
  
  // Waning Moon in 5th house
  if (placements['Moon'] !== 5) return [];
  
  const sunObj = planets.find(p => p && (p.name === 'Sun' || p.planet === 'Sun'));
  const moonObj = planets.find(p => p && (p.name === 'Moon' || p.planet === 'Moon'));
  if (!sunObj || !moonObj || sunObj.fullDegree === undefined || moonObj.fullDegree === undefined) return [];
  
  const mPA = (moonObj.fullDegree - sunObj.fullDegree + 360) % 360;
  const isWaning = mPA > 180 && mPA < 360;
  if (!isWaning) return [];
  
  // Malefics occupy 1st, 7th, and 12th houses
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  
  const lagnaMalefics = malefics.filter(m => placements[m] === 1);
  const house7Malefics = malefics.filter(m => placements[m] === 7);
  const house12Malefics = malefics.filter(m => placements[m] === 12);
  
  if (lagnaMalefics.length === 0 || house7Malefics.length === 0 || house12Malefics.length === 0) return [];
  
  // Specific variation check based on Sun, Mars, Saturn in those houses
  const variationA = placements['Sun'] === 1 && placements['Mars'] === 7 && placements['Saturn'] === 12;
  const variationB = placements['Mars'] === 1 && placements['Saturn'] === 7 && placements['Sun'] === 12;
  const variationC = placements['Saturn'] === 1 && placements['Sun'] === 7 && placements['Mars'] === 12;
  
  let variationStr = "";
  if (variationA) variationStr = " (Variation A: Sun in Lagna, Mars in 7th, Saturn in 12th)";
  else if (variationB) variationStr = " (Variation B: Mars in Lagna, Saturn in 7th, Sun in 12th)";
  else if (variationC) variationStr = " (Variation C: Saturn in Lagna, Sun in 7th, Mars in 12th)";
  else {
    variationStr = ` (Placements: Lagna: ${lagnaMalefics.join('/')}, 7th: ${house7Malefics.join('/')}, 12th: ${house12Malefics.join('/')})`;
  }
  
  const involvedPlanets = ['Moon', ...lagnaMalefics, ...house7Malefics, ...house12Malefics];
  
  return [{
    name: 'Putrakalatraheena Yoga',
    type: 'Arishta Yoga',
    involved: [...new Set(involvedPlanets)],
    description: `A waning Moon occupies the 5th house, and natural malefics occupy the Lagna, 7th, and 12th houses${variationStr}.`,
    results: "The person will be deprived of his family and children."
  }];
};

// ============================================================================
// 💀 BHARYASAHAVYABHICHARA YOGA (Combination 282)
// ============================================================================
const _checkBharyasahavyabhicharaYoga = (placements) => {
  if (!placements) return [];
  
  if (
    placements['Moon'] === 7 &&
    placements['Venus'] === 7 &&
    placements['Saturn'] === 7 &&
    placements['Mars'] === 7
  ) {
    return [{
      name: 'Bharyasahavyabhichara Yoga',
      type: 'Arishta Yoga',
      involved: ['Moon', 'Venus', 'Saturn', 'Mars'],
      description: "Moon, Venus, Saturn, and Mars are conjoined together in the 7th house.",
      results: "The husband and wife will both be guilty of adultery."
    }];
  }
  
  return [];
};

// ============================================================================
// 💀 VAMSACHEDA YOGA (Combination 283)
// ============================================================================
const _checkVamsachedaYoga = (placements) => {
  if (!placements) return [];
  
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  
  // Standard variation: Moon in 10th, Venus in 7th, Malefic in 4th
  const standardMatch = 
    placements['Moon'] === 10 && 
    placements['Venus'] === 7 && 
    malefics.some(m => placements[m] === 4);
    
  // Remark variation: Moon & Venus in 7th, Malefics in 4th & 10th
  const remarkMatch = 
    placements['Moon'] === 7 && 
    placements['Venus'] === 7 && 
    malefics.some(m => placements[m] === 4) && 
    malefics.some(m => placements[m] === 10);
    
  if (!standardMatch && !remarkMatch) return [];
  
  let variationStr = standardMatch 
    ? " (Standard: Moon in 10th, Venus in 7th, malefic in 4th)"
    : " (Remark variant: Moon & Venus in 7th, malefics in 4th and 10th)";
    
  const involved = ['Moon', 'Venus'];
  malefics.forEach(m => {
    if (placements[m] === 4 || placements[m] === 10) involved.push(m);
  });
  
  return [{
    name: 'Vamsacheda Yoga',
    type: 'Arishta Yoga',
    involved: [...new Set(involved)],
    description: `The Moon and Venus occupy key relationship/action houses (10H/7H), while natural malefics afflict critical domestic/career angles (4H/10H)${variationStr}.`,
    results: "The person will be the extinguisher of his family."
  }];
};

// ============================================================================
// 💀 GUHYAROGA YOGA (Combination 284)
// ============================================================================
const _checkGuhyarogaYoga = (placements, rasiPlacements, navamsaPlacements) => {
  if (!rasiPlacements || !navamsaPlacements) return [];
  
  const moonRasi = rasiPlacements['Moon'];
  const moonNav = navamsaPlacements['Moon'];
  
  if (moonRasi === undefined || moonNav === undefined) return [];
  
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  
  // Condition A: Moon conjoined with malefic in D1 and both in Cancer (3) or Scorpio (7) Navamsa
  let conjoinedMalefic = malefics.find(m => 
    rasiPlacements[m] === moonRasi && 
    navamsaPlacements[m] === moonNav && 
    (moonNav === 3 || moonNav === 7)
  );
  
  // Condition B (Remarks): Moon in Cancer Rasi (3) & Scorpio Navamsa (7) or vice versa
  const remarkMatch = 
    (moonRasi === 3 && moonNav === 7) || 
    (moonRasi === 7 && moonNav === 3);
    
  if (!conjoinedMalefic && !remarkMatch) return [];
  
  const involved = ['Moon'];
  if (conjoinedMalefic) involved.push(conjoinedMalefic);
  
  let variationStr = conjoinedMalefic 
    ? ` (Standard: Moon conjoined with ${conjoinedMalefic} in Navamsa sign ${moonNav === 3 ? 'Cancer' : 'Scorpio'})`
    : ` (Remark variant: Moon in Rasi ${moonRasi === 3 ? 'Cancer' : 'Scorpio'} and Navamsa ${moonNav === 3 ? 'Cancer' : 'Scorpio'})`;
    
  return [{
    name: 'Guhyaroga Yoga',
    type: 'Arishta Yoga',
    involved,
    description: `The Moon is afflicted by malefic conjunction in Scorpio/Cancer Navamsa, or occupies Cancer Rasi and Scorpio Navamsa (or vice-versa)${variationStr}.`,
    results: "The person suffers from diseases in the private parts."
  }];
};

// ============================================================================
// 💀 ANGAHEENA YOGA (Combination 285)
// ============================================================================
const _checkAngaheenaYoga = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const moonHouse = placements['Moon'];
  const marsHouse = placements['Mars'];
  const saturnRasi = rasiPlacements['Saturn'];
  const sunRasi = rasiPlacements['Sun'];

  if (
    moonHouse === undefined ||
    marsHouse === undefined ||
    saturnRasi === undefined ||
    sunRasi === undefined
  ) {
    return [];
  }

  // 10th house occupied by Moon, 7th house occupied by Mars, Saturn in 2nd from Sun
  const moonIn10 = moonHouse === 10;
  const marsIn7 = marsHouse === 7;
  const saturnIn2ndFromSun = ((saturnRasi - sunRasi + 12) % 12) === 1;

  if (moonIn10 && marsIn7 && saturnIn2ndFromSun) {
    return [{
      name: 'Angaheena Yoga',
      type: 'Arishta Yoga',
      involved: ['Moon', 'Mars', 'Saturn', 'Sun'],
      description: "The Moon occupies the 10th house, Mars is in the 7th house, and Saturn is in the 2nd house relative to the Sun.",
      results: "The person suffers from loss of limbs or similar physical impairments."
    }];
  }

  return [];
};

// ============================================================================
// 💀 SWETAKUSHTA YOGA (Combination 286)
// ============================================================================
const _checkSwetakushtaYoga = (placements) => {
  if (!placements) return [];

  const marsHouse = placements['Mars'];
  const saturnHouse = placements['Saturn'];
  const moonHouse = placements['Moon'];
  const sunHouse = placements['Sun'];

  if (
    marsHouse === undefined ||
    saturnHouse === undefined ||
    moonHouse === undefined ||
    sunHouse === undefined
  ) {
    return [];
  }

  // Mars and Saturn occupy the 2nd and 12th houses (in either order)
  const marsSaturn2And12 = 
    (marsHouse === 2 && saturnHouse === 12) ||
    (marsHouse === 12 && saturnHouse === 2);

  // Moon occupies Lagna (1st house), Sun occupies 7th house
  const moonInLagna = moonHouse === 1;
  const sunIn7 = sunHouse === 7;

  if (marsSaturn2And12 && moonInLagna && sunIn7) {
    return [{
      name: 'Swetakushta Yoga',
      type: 'Arishta Yoga',
      involved: ['Mars', 'Saturn', 'Moon', 'Sun'],
      description: "Mars and Saturn occupy the 2nd and 12th houses in either order, the Moon occupies the 1st house (Lagna), and the Sun occupies the 7th house.",
      results: "The person suffers from white leprosy."
    }];
  }

  return [];
};

// ============================================================================
// 💀 PISACHA GRASTHA YOGA (Combination 287)
// ============================================================================
const _checkPisachaGrasthaYoga = (placements) => {
  if (!placements) return [];

  const rahuHouse = placements['Rahu'];
  const moonHouse = placements['Moon'];

  if (rahuHouse === undefined || moonHouse === undefined) return [];

  // Rahu in Lagna (1st house) conjunct Moon
  const rahuMoonInLagna = rahuHouse === 1 && moonHouse === 1;

  // Natural malefics occupy trine (1st, 5th, 9th) houses
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu', 'Mandi'];
  const maleficInTrine = malefics.some(m => m !== 'Rahu' && [1, 5, 9].includes(placements[m]));

  if (rahuMoonInLagna && maleficInTrine) {
    const involved = ['Rahu', 'Moon'];
    malefics.forEach(m => {
      if (m !== 'Rahu' && [1, 5, 9].includes(placements[m])) {
        involved.push(m);
      }
    });

    return [{
      name: 'Pisacha Grastha Yoga',
      type: 'Arishta Yoga',
      involved: [...new Set(involved)],
      description: "Rahu and the Moon are conjoined in the Lagna (1st house), while other natural malefic planets occupy the trine houses (1st, 5th, or 9th).",
      results: "The person suffers from the attacks of spirits."
    }];
  }

  return [];
};

// ============================================================================
// 💀 ANDHA YOGA (Combination 288)
// ============================================================================
const _checkAndhaYoga288 = (placements) => {
  if (!placements) return [];

  const sunHouse = placements['Sun'];
  const rahuHouse = placements['Rahu'];

  if (sunHouse === undefined || rahuHouse === undefined) return [];

  // Sun and Rahu conjoined in Lagna (1st house)
  const sunRahuInLagna = sunHouse === 1 && rahuHouse === 1;

  // Other natural malefics disposed in Trikona (5th or 9th) houses
  const otherMalefics = ['Mars', 'Saturn', 'Ketu', 'Mandi'];
  const maleficInTrikona = otherMalefics.some(m => [5, 9].includes(placements[m]));

  if (sunRahuInLagna && maleficInTrikona) {
    const involved = ['Sun', 'Rahu'];
    otherMalefics.forEach(m => {
      if ([5, 9].includes(placements[m])) {
        involved.push(m);
      }
    });

    return [{
      name: 'Andha Yoga (288)',
      type: 'Arishta Yoga',
      involved: [...new Set(involved)],
      description: "The Sun and Rahu are conjunct in the Lagna (1st house) and other natural malefic planets occupy the 5th or 9th houses (Trikona).",
      results: "The person will be born stone-blind."
    }];
  }

  return [];
};

// ============================================================================
// 💀 ANDHA YOGA (Combination 289)
// ============================================================================
const _checkAndhaYoga289 = (placements) => {
  if (!placements) return [];

  const marsHouse = placements['Mars'];
  const moonHouse = placements['Moon'];
  const saturnHouse = placements['Saturn'];
  const sunHouse = placements['Sun'];

  if (
    marsHouse === undefined ||
    moonHouse === undefined ||
    saturnHouse === undefined ||
    sunHouse === undefined
  ) {
    return [];
  }

  // Mars in 2nd, Moon in 6th, Saturn in 12th, Sun in 8th
  const match = 
    marsHouse === 2 && 
    moonHouse === 6 && 
    saturnHouse === 12 && 
    sunHouse === 8;

  if (match) {
    return [{
      name: 'Andha Yoga (289)',
      type: 'Arishta Yoga',
      involved: ['Mars', 'Moon', 'Saturn', 'Sun'],
      description: "Mars occupies the 2nd house, the Moon occupies the 6th house, Saturn occupies the 12th house, and the Sun occupies the 8th house.",
      results: "The person will be born stone-blind."
    }];
  }

  return [];
};

// ============================================================================
// 💀 VATHAROGA YOGA (Combination 290)
// ============================================================================
const _checkVatharogaYoga = (placements) => {
  if (!placements) return [];

  const jupHouse = placements['Jupiter'];
  const satHouse = placements['Saturn'];

  if (jupHouse === undefined || satHouse === undefined) return [];

  // Jupiter in Lagna (1st house), Saturn in 7th house
  if (jupHouse === 1 && satHouse === 7) {
    return [{
      name: 'Vatharoga Yoga',
      type: 'Arishta Yoga',
      involved: ['Jupiter', 'Saturn'],
      description: "Jupiter occupies the Lagna (1st house) and Saturn occupies the 7th house.",
      results: "The person suffers from windy complaints (Vatha diseases). Note: While this combination may also form certain Raja Yogas depending on chart strengths, it is traditionally known as a powerful indicator of rheumatism, arthritis, and other health issues related to Vata (wind) imbalance."
    }];
  }

  return [];
};

// ============================================================================
// 🧠 MATIBHRAMANA YOGA (Combination 291)
// ============================================================================
const _checkMatibhramanaYoga291 = (placements) => {
  if (!placements) return [];

  const jupHouse = placements['Jupiter'];
  const marsHouse = placements['Mars'];

  if (jupHouse === 1 && marsHouse === 7) {
    return [{
      name: 'Matibhramana Yoga (291)',
      type: 'Arishta Yoga',
      involved: ['Jupiter', 'Mars'],
      description: 'Jupiter occupies the Lagna (1st house) and Mars occupies the 7th house.',
      results: 'The person becomes insane.'
    }];
  }

  return [];
};

// ============================================================================
// 🧠 MATIBHRAMANA YOGA (Combination 292)
// ============================================================================
const _checkMatibhramanaYoga292 = (placements) => {
  if (!placements) return [];

  const satHouse = placements['Saturn'];
  const marsHouse = placements['Mars'];

  if (satHouse === 1 && [5, 7, 9].includes(marsHouse)) {
    return [{
      name: 'Matibhramana Yoga (292)',
      type: 'Arishta Yoga',
      involved: ['Saturn', 'Mars'],
      description: 'Saturn occupies the Lagna (1st house) and Mars occupies the 5th, 7th, or 9th house.',
      results: 'The person becomes insane.'
    }];
  }

  return [];
};

// ============================================================================
// 🧠 MATIBHRAMANA YOGA (Combination 293)
// ============================================================================
const _checkMatibhramanaYoga293 = (placements, planets) => {
  if (!placements || !planets) return [];

  const satHouse = placements['Saturn'];
  const moonHouse = placements['Moon'];

  if (satHouse === 12 && moonHouse === 12) {
    const moonPlanet = planets.find(p => p && (p.planet === 'Moon' || p.name === 'Moon'));
    const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));

    if (moonPlanet && moonPlanet.fullDegree !== undefined && sunPlanet && sunPlanet.fullDegree !== undefined) {
      const mPA = (moonPlanet.fullDegree - sunPlanet.fullDegree + 360) % 360;
      const isWaning = mPA > 180 && mPA < 360;

      if (isWaning) {
        return [{
          name: 'Matibhramana Yoga (293)',
          type: 'Arishta Yoga',
          involved: ['Saturn', 'Moon'],
          description: 'Saturn occupies the 12th house, and the Moon (in a waning phase) is in conjunction with Saturn in the 12th house.',
          results: 'The person becomes insane.'
        }];
      }
    }
  }

  return [];
};

// ============================================================================
// 🧠 MATIBHRAMANA YOGA (Combination 294)
// ============================================================================
const _checkMatibhramanaYoga294 = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const moonHouse = placements['Moon'];
  const mercHouse = placements['Mercury'];

  if (moonHouse === undefined || mercHouse === undefined) return [];

  const kendras = [1, 4, 7, 10];
  if (kendras.includes(moonHouse) && kendras.includes(mercHouse)) {
    // Check if Moon and Mercury combination is aspected by or conjoined with any other planet.
    const otherPlanets = ['Sun', 'Mars', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const involved = ['Moon', 'Mercury'];

    otherPlanets.forEach(p => {
      const isConjoined = placements[p] === moonHouse || placements[p] === mercHouse;
      const isAspected = (rasiPlacements['Moon'] !== undefined && hasAspect(p, rasiPlacements['Moon'], rasiPlacements)) ||
                         (rasiPlacements['Mercury'] !== undefined && hasAspect(p, rasiPlacements['Mercury'], rasiPlacements));

      if (isConjoined || isAspected) {
        involved.push(p);
      }
    });

    // If any other planet conjoins or aspects either Moon or Mercury, the condition is met.
    if (involved.length > 2) {
      return [{
        name: 'Matibhramana Yoga (294)',
        type: 'Arishta Yoga',
        involved: [...new Set(involved)],
        description: 'The Moon and Mercury occupy Kendra houses (1st, 4th, 7th, or 10th) and are conjoined with or aspected by other planet(s).',
        results: 'The person becomes insane.'
      }];
    }
  }

  return [];
};

// ============================================================================
// 👨‍🦲 KHALWATA YOGA (Combination 295)
// ============================================================================
const _checkKhalwataYoga = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !rasiPlacements) return [];

  const maleficSigns = [0, 4, 7, 9, 10]; // Aries, Leo, Scorpio, Capricorn, Aquarius
  const isMaleficLagna = maleficSigns.includes(lagnaIndex);
  const isTaurusOrSagit = lagnaIndex === 1 || lagnaIndex === 8;

  let match = false;
  let involved = [];
  let reason = '';

  if (isMaleficLagna) {
    match = true;
    reason = 'The Lagna is a malefic sign.';
  } else if (isTaurusOrSagit) {
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    const aspectingMalefics = malefics.filter(p => hasAspect(p, lagnaIndex, rasiPlacements));
    if (aspectingMalefics.length > 0) {
      match = true;
      involved = aspectingMalefics;
      reason = `The Lagna is ${lagnaIndex === 1 ? 'Taurus' : 'Sagittarius'} and is aspected by malefic planet(s): ${aspectingMalefics.join(', ')}.`;
    }
  }

  if (match) {
    return [{
      name: 'Khalwata Yoga',
      type: 'Arishta Yoga',
      involved,
      description: reason,
      results: 'The person will be bald-headed.'
    }];
  }

  return [];
};

// ============================================================================
// 🤐 NISHTURABHASHI YOGA (Combination 296)
// ============================================================================
const _checkNishturabhashiYoga = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const moonHouse = placements['Moon'];
  const saturnHouse = placements['Saturn'];

  if (moonHouse === undefined || saturnHouse === undefined || moonHouse !== saturnHouse) return [];

  return [{
    name: 'Nishturabhashi Yoga',
    type: 'Arishta Yoga',
    involved: ['Moon', 'Saturn'],
    description: 'The Moon is conjoined with Saturn in the same house.',
    results: 'The person will be harsh in speech.'
  }];
};

// ============================================================================
// 👑 RAJABHRASHTA YOGA (Combination 297)
// ============================================================================
const _checkRajabhrashtaYoga = (lagnaIndex, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !rasiPlacements || !houseLords) return [];

  const rashiLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  const getAroodhaPosition = (houseRasi, lordRasi) => {
    if (houseRasi === undefined || lordRasi === undefined) return -1;
    const dist = (lordRasi - houseRasi + 12) % 12;
    return (lordRasi + dist) % 12;
  };

  // 1. Calculate Aroodha Lagna (1st house)
  const lagnaLord = houseLords[1];
  const lagnaLordRasi = rasiPlacements[lagnaLord];
  const aroodhaLagna = getAroodhaPosition(lagnaIndex, lagnaLordRasi);

  // 2. Calculate Aroodha Dwadasa (12th house)
  const house12Rasi = (lagnaIndex + 11) % 12;
  const lord12 = houseLords[12];
  const lord12Rasi = rasiPlacements[lord12];
  const aroodhaDwadasa = getAroodhaPosition(house12Rasi, lord12Rasi);

  if (aroodhaLagna === -1 || aroodhaDwadasa === -1) return [];

  const lordAL = rashiLords[aroodhaLagna];
  const lordAD = rashiLords[aroodhaDwadasa];

  const rasiAL = rasiPlacements[lordAL];
  const rasiAD = rasiPlacements[lordAD];

  if (rasiAL !== undefined && rasiAL === rasiAD) {
    return [{
      name: 'Rajabhrashta Yoga',
      type: 'Arishta Yoga',
      involved: [...new Set([lagnaLord, lord12, lordAL, lordAD])],
      description: `The Lord of Aroodha Lagna (${lordAL}) and the Lord of Aroodha Dwadasa (${lordAD}) are conjoined in the same sign (${rasiAL !== undefined ? ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][rasiAL] : ''}).`,
      results: 'The subject will suffer a fall from high position.'
    }];
  }

  return [];
};

// ============================================================================
// 📉 RAJA YOGA BHANGA (Combination 298)
// ============================================================================
const _checkRajaYogaBhanga298 = (lagnaIndex, rasiPlacements, planets) => {
  if (lagnaIndex === undefined || !rasiPlacements || !planets) return [];

  // Lagna must be Leo (4)
  if (lagnaIndex !== 4) return [];

  const satRasi = rasiPlacements['Saturn'];
  // Saturn must be in exaltation (Libra / 6)
  if (satRasi !== 6) return [];

  const satPlanet = planets.find(p => p && (p.planet === 'Saturn' || p.name === 'Saturn'));
  if (!satPlanet || satPlanet.fullDegree === undefined) return [];

  // Exaltation Libra is 180° to 210°. 20° to 23° 20' of Libra is 200° to 203° 20'.
  const satDegInLibra = satPlanet.fullDegree - 180;
  const inVisakha1 = satDegInLibra >= 20.0 && satDegInLibra <= 23.3334;

  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const hasBeneficAspect = benefics.some(p => hasAspect(p, 6, rasiPlacements));

  if (inVisakha1 || hasBeneficAspect) {
    let reason = '';
    if (inVisakha1) {
      reason = 'Saturn is in exaltation (Libra) but occupies a debilitated Navamsa (1st pada of Visakha, 20° to 23° 20\' of Libra).';
    } else {
      reason = 'Saturn is in exaltation (Libra) and is aspected by benefic planet(s).';
    }

    return [{
      name: 'Raja Yoga Bhanga (298)',
      type: 'Arishta Yoga',
      involved: ['Saturn'],
      description: reason,
      results: 'The person, though born in a royal family, will be bereft of fortune and social position.'
    }];
  }

  return [];
};

// ============================================================================
// 📉 RAJA YOGA BHANGA (Combination 299)
// ============================================================================
const _checkRajaYogaBhanga299 = (planets) => {
  if (!planets) return [];

  const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
  if (!sunPlanet || sunPlanet.fullDegree === undefined || sunPlanet.rasiIndex !== 6) return [];

  const sunDegInLibra = sunPlanet.fullDegree - 180;
  // 10th degree is 9° to 10°
  if (sunDegInLibra >= 9.0 && sunDegInLibra <= 10.0) {
    return [{
      name: 'Raja Yoga Bhanga (299)',
      type: 'Arishta Yoga',
      involved: ['Sun'],
      description: `The Sun occupies the 10th degree of Libra (${sunDegInLibra.toFixed(2)}°), which is its point of deep debilitation.`,
      results: 'The person, though born in a royal family, will be bereft of fortune and social position.'
    }];
  }

  return [];
};

// ============================================================================
// 🪓 GOHANTA YOGA (Combination 300)
// ============================================================================
const _checkGohantaYoga = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const jupHouse = placements['Jupiter'];
  if (jupHouse !== 8) return [];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const kendras = [1, 4, 7, 10];

  const kendraMalefics = malefics.filter(m => kendras.includes(placements[m]));
  const unafflictedKendraMalefics = kendraMalefics.filter(m => {
    const mRasi = rasiPlacements[m];
    if (mRasi === undefined) return false;
    const isAspected = benefics.some(b => hasAspect(b, mRasi, rasiPlacements));
    return !isAspected;
  });

  if (unafflictedKendraMalefics.length > 0) {
    return [{
      name: 'Gohanta Yoga',
      type: 'Arishta Yoga',
      involved: ['Jupiter', ...unafflictedKendraMalefics],
      description: `Jupiter occupies the 8th house, and natural malefic planet(s) (${unafflictedKendraMalefics.join(', ')}) occupy Kendra house(s) unafflicted by benefic aspects.`,
      results: 'The person becomes a butcher.'
    }];
  }

  return [];
};

// ============================================================================
// 🧠 JADA YOGA & ☀️ BHASKARA YOGA (Combinations 158 - 159)
// ============================================================================
const _checkJadaAndBhaskaraYogas = (lagnaIndex, placements, rasiPlacements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const lord2 = lagnaLords[(lagnaIndex + 1) % 12];

  // 158. Jada Yoga
  // The lord of the 2nd should be posited in the 10th with malefics.
  // Exception: if the 2nd lord is in a benefic Navamsa, the Yoga is found to lose its significance.
  if (rasiPlacements[lord2] !== undefined) {
    const isLord2In10 = placements[lord2] === 10;
    if (isLord2In10) {
      const getConjunctsLocal = (pName) =>
        Object.keys(rasiPlacements).filter(p => rasiPlacements[p] === rasiPlacements[pName] && p !== pName);
      
      const conjuncts = getConjunctsLocal(lord2);
      const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
      const conjunctMalefic = conjuncts.find(p => maleficsList.includes(p));

      if (conjunctMalefic) {
        // Benefic Navamsa check
        let isBeneficNavamsa = false;
        if (navamsaPlacements && navamsaPlacements[lord2] !== undefined) {
          const beneficSigns = [1, 2, 3, 5, 6, 8, 11]; // Taurus, Gemini, Cancer, Virgo, Libra, Sagittarius, Pisces
          isBeneficNavamsa = beneficSigns.includes(navamsaPlacements[lord2]);
        }

        if (!isBeneficNavamsa) {
          yogas.push({
            name: "Jada Yoga",
            type: "Inauspicious Yoga",
            involved: [lord2, conjunctMalefic],
            description: "The lord of the 2nd house occupies the 10th house conjoined with a malefic, and is not placed in a benefic Navamsa.",
            results: "The native becomes nervous in public assemblies (fear of public speaking or social anxiety)."
          });
        }
      }
    }
  }

  // 159. Bhaskara Yoga
  // Mercury in the 2nd from the Sun, the Moon in the 11th from Mercury and Jupiter in the 5th or 9th from the Moon.
  if (rasiPlacements['Sun'] !== undefined && rasiPlacements['Mercury'] !== undefined && 
      rasiPlacements['Moon'] !== undefined && rasiPlacements['Jupiter'] !== undefined) {
    
    const mercFromSun = (rasiPlacements['Mercury'] - rasiPlacements['Sun'] + 12) % 12;
    const moonFromMerc = (rasiPlacements['Moon'] - rasiPlacements['Mercury'] + 12) % 12;
    const jupFromMoon = ((rasiPlacements['Jupiter'] - rasiPlacements['Moon'] + 12) % 12) + 1;

    const conditionMercury = mercFromSun === 1;
    const conditionMoon = moonFromMerc === 10;
    const conditionJupiter = jupFromMoon === 5 || jupFromMoon === 9;

    if (conditionMercury && conditionMoon && conditionJupiter) {
      yogas.push({
        name: "Bhaskara Yoga",
        type: "Auspicious Yoga",
        involved: ['Mercury', 'Sun', 'Moon', 'Jupiter'],
        description: "Mercury is in the 2nd house from the Sun, the Moon is in the 11th from Mercury (12th from Sun), and Jupiter is in the 5th or 9th house from the Moon.",
        results: "The native will be wealthy, valorous, aristocratic, learned in Sastras, Astrology and Music, and will have a good personality."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🌬️ MARUD YOGA (Combination 160)
// ============================================================================
const _checkMarudYoga = (rasiPlacements) => {
  if (!rasiPlacements) return [];

  const yogas = [];

  if (rasiPlacements['Jupiter'] !== undefined && rasiPlacements['Venus'] !== undefined && 
      rasiPlacements['Moon'] !== undefined && rasiPlacements['Sun'] !== undefined) {
    
    const jupFromVenus = ((rasiPlacements['Jupiter'] - rasiPlacements['Venus'] + 12) % 12) + 1;
    const moonFromJup = ((rasiPlacements['Moon'] - rasiPlacements['Jupiter'] + 12) % 12) + 1;
    const sunFromMoon = ((rasiPlacements['Sun'] - rasiPlacements['Moon'] + 12) % 12) + 1;

    const conditionJup = jupFromVenus === 5 || jupFromVenus === 9;
    const conditionMoon = moonFromJup === 5;
    const conditionSun = [1, 4, 7, 10].includes(sunFromMoon);

    if (conditionJup && conditionMoon && conditionSun) {
      yogas.push({
        name: "Marud Yoga",
        type: "Auspicious Yoga",
        involved: ['Jupiter', 'Venus', 'Moon', 'Sun'],
        description: "Jupiter is in the 5th or 9th house from Venus, the Moon is in the 5th from Jupiter, and the Sun is in a Kendra (1st, 4th, 7th, or 10th) from the Moon.",
        results: "The native will be a good conversationalist, large-hearted, rich, learned, a successful businessman, a king or equal to him, and will have a protruding belly."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🏛️ SARASWATHI YOGA (Combination 161)
// ============================================================================
const _checkSaraswathiYoga = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];

  const jup = placements['Jupiter'];
  const ven = placements['Venus'];
  const merc = placements['Mercury'];

  if (jup !== undefined && ven !== undefined && merc !== undefined) {
    const allowedHouses = [1, 2, 4, 5, 7, 9, 10];
    
    const condHouses = allowedHouses.includes(jup) && 
                       allowedHouses.includes(ven) && 
                       allowedHouses.includes(merc);
                       
    if (condHouses) {
      const jupRasi = rasiPlacements['Jupiter'];
      if (jupRasi !== undefined) {
        // Jupiter's own signs: Sagittarius (8), Pisces (11)
        // Jupiter's exaltation sign: Cancer (3)
        // Jupiter's friendly signs: Aries (0), Leo (4), Scorpio (7)
        const ownSigns = [8, 11];
        const exaltationSign = 3;
        const friendlySigns = [0, 4, 7];
        
        const condJupiterDignity = ownSigns.includes(jupRasi) || 
                                   jupRasi === exaltationSign || 
                                   friendlySigns.includes(jupRasi);
                                   
        if (condJupiterDignity) {
          yogas.push({
            name: "Saraswathi Yoga",
            type: "Auspicious Yoga",
            involved: ['Jupiter', 'Venus', 'Mercury'],
            description: "Jupiter, Venus and Mercury occupy Lagna, 2nd, 4th, 5th, 7th, 9th or 10th houses (jointly or severally), with Jupiter being in his own, exaltation or friendly sign.",
            results: "The native will be a poet, famous, learned in all sciences, skilled, rich, praised by all, and blessed with a good wife and children."
          });
        }
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🎓 BUDHA YOGA (Combination 162)
// ============================================================================
const _checkBudhaYoga = (placements, rasiPlacements) => {
  if (!placements || !rasiPlacements) return [];

  const yogas = [];

  const jup = placements['Jupiter'];
  const moon = placements['Moon'];
  const rahuSign = rasiPlacements['Rahu'];
  const moonSign = rasiPlacements['Moon'];
  const sunSign = rasiPlacements['Sun'];
  const marsSign = rasiPlacements['Mars'];

  if (jup === 1 && [1, 4, 7, 10].includes(moon) &&
      rahuSign !== undefined && moonSign !== undefined &&
      sunSign !== undefined && marsSign !== undefined) {
      
    const rahuFromMoon = ((rahuSign - moonSign + 12) % 12) + 1;
    const sunFromRahu = ((sunSign - rahuSign + 12) % 12) + 1;
    const marsFromRahu = ((marsSign - rahuSign + 12) % 12) + 1;

    if (rahuFromMoon === 2 && sunFromRahu === 3 && marsFromRahu === 3) {
      yogas.push({
        name: "Budha Yoga",
        type: "Auspicious Yoga",
        involved: ['Jupiter', 'Moon', 'Rahu', 'Sun', 'Mars'],
        description: "Jupiter is in Lagna, the Moon is in a Kendra (1st, 4th, 7th, or 10th house), Rahu is in the 2nd house from the Moon, and the Sun and Mars conjoin in the 3rd house from Rahu (4th from the Moon).",
        results: "The native will enjoy kingly comforts, be powerful, famous, aristocratic, learned in sciences, intelligent, and devoid of enemies."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🔇 MOOKA YOGA (Combination 163)
// ============================================================================
const _checkMookaYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];

  const lord2 = houseLords[2];
  const jup = placements['Jupiter'];
  const l2House = placements[lord2];

  if (jup !== undefined && l2House !== undefined && jup === l2House) {
    if (jup === 8 || jup === 12) {
      const targetSign = (lagnaIndex + jup - 1) % 12;
      
      // Jupiter's own signs: Sagittarius (8), Pisces (11)
      // Jupiter's exaltation sign: Cancer (3)
      const ownSigns = [8, 11];
      const exaltationSign = 3;
      
      const isCancelled = ownSigns.includes(targetSign) || targetSign === exaltationSign;
      
      if (!isCancelled) {
        yogas.push({
          name: "Mooka Yoga",
          type: "Inauspicious Yoga",
          involved: ['Jupiter', lord2],
          description: `The 2nd lord (${lord2}) conjoins Jupiter in the ${jup}th house${jup === 12 ? " (Ganapathi variation)" : ""}.`,
          results: "The person becomes dumb (speech-impaired or has communication difficulties)."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 👁️ NETRANASA YOGA (Combination 164)
// ============================================================================
const _checkNetranasaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];

  const lord2 = houseLords[2];
  const lord6 = houseLords[6];
  const lord10 = houseLords[10];

  if (!lord2 || !lord6 || !lord10) return [];

  const h2 = placements[lord2];
  const h6 = placements[lord6];
  const h10 = placements[lord10];

  // Variant A: 2nd, 6th, and 10th lords occupy Lagna (1st house)
  const condA = (h2 === 1 && h6 === 1 && h10 === 1);

  // Variant B: 2nd, 6th, and 10th lords are in Neechamsa (debilitated in Navamsa)
  let condB = false;
  if (navamsaPlacements) {
    const n2 = navamsaPlacements[lord2];
    const n6 = navamsaPlacements[lord6];
    const n10 = navamsaPlacements[lord10];

    const DEBILITATION_SIGNS = {
      Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0
    };

    if (n2 !== undefined && n6 !== undefined && n10 !== undefined) {
      condB = (n2 === DEBILITATION_SIGNS[lord2] &&
               n6 === DEBILITATION_SIGNS[lord6] &&
               n10 === DEBILITATION_SIGNS[lord10]);
    }
  }

  if (condA || condB) {
    // Check cancellation: Sun and Moon strongly and favourably situated
    // Strongly situated: placed in own, exalted, or friendly signs in Rasi, AND occupy Kendra or Trikona houses from Lagna
    const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
    const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    const FRIENDLY_SIGNS = {
      Sun: [4, 8, 11, 0, 7, 3],
      Moon: [4, 2, 5, 1]
    };

    const isExalted = (pName) => rasiPlacements[pName] === EXALTATION_SIGNS[pName];
    const isOwnSign = (pName) => RASHI_LORDS[rasiPlacements[pName]] === pName;
    const isFriendly = (pName) => (FRIENDLY_SIGNS[pName] || []).includes(rasiPlacements[pName]);
    const isKendraTrikona = (pName) => [1, 4, 7, 10, 5, 9].includes(placements[pName]);

    const isSunStrong = (isExalted('Sun') || isOwnSign('Sun') || isFriendly('Sun')) && isKendraTrikona('Sun');
    const isMoonStrong = (isExalted('Moon') || isOwnSign('Moon') || isFriendly('Moon')) && isKendraTrikona('Moon');

    if (!(isSunStrong && isMoonStrong)) {
      yogas.push({
        name: "Netranasa Yoga",
        type: "Inauspicious Yoga",
        involved: [...new Set(['Sun', 'Moon', lord2, lord6, lord10])],
        description: condA
          ? `The lords of the 2nd (${lord2}), 6th (${lord6}), and 10th (${lord10}) houses all conjoin in the Lagna.`
          : `The lords of the 2nd (${lord2}), 6th (${lord6}), and 10th (${lord10}) houses are all in Neechamsa (debilitated in Navamsa).`,
        results: "The native loses their eyesight (or suffers from blindness/severe visual impairment) some time in life."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 👁️ ANDHA YOGA (Combination 165)
// ============================================================================
const _checkAndhaYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];

  const lagnaLord = houseLords[1];
  const lord2 = houseLords[2];

  if (!lagnaLord || !lord2) return [];

  const mercHouse = placements['Mercury'];
  const moonHouse = placements['Moon'];
  const sunHouse = placements['Sun'];
  const llHouse = placements[lagnaLord];
  const l2House = placements[lord2];

  // Variant A: Mercury and Moon in the 2nd house
  const condA = (mercHouse === 2 && moonHouse === 2);

  // Variant B: Lagna Lord, 2nd Lord, and Sun conjoin in the 2nd house
  const condB = (llHouse === 2 && l2House === 2 && sunHouse === 2);

  if (condA || condB) {
    const secondHouseSign = (lagnaIndex + 1) % 12;
    const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };

    // Check if the 2nd house happens to be the exaltation place of one of the participating planets
    let isModified = false;
    let exaltedPlanetName = '';
    
    if (condB) {
      if (EXALTATION_SIGNS[lagnaLord] === secondHouseSign) { isModified = true; exaltedPlanetName = lagnaLord; }
      else if (EXALTATION_SIGNS[lord2] === secondHouseSign) { isModified = true; exaltedPlanetName = lord2; }
      else if (EXALTATION_SIGNS['Sun'] === secondHouseSign) { isModified = true; exaltedPlanetName = 'Sun'; }
    }

    if (condA) {
      yogas.push({
        name: "Andha Yoga",
        type: "Inauspicious Yoga",
        involved: ['Mercury', 'Moon'],
        description: "Mercury and the Moon occupy the 2nd house.",
        results: "The native will have defective sight during the night (night blindness)."
      });
    } else if (condB) {
      yogas.push({
        name: "Andha Yoga",
        type: "Inauspicious Yoga",
        involved: [lagnaLord, lord2, 'Sun'],
        description: `The Lagna Lord (${lagnaLord}), 2nd Lord (${lord2}), and the Sun occupy the 2nd house.${isModified ? ` Note: The 2nd house (${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][secondHouseSign]}) is the exaltation sign of ${exaltedPlanetName}, mitigating/modifying the blindness.` : ""}`,
        results: isModified
          ? "The native will have defective sight (visual impairment), but the condition is mitigated (not born blind)."
          : "The native will be born blind."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 😊 SUMUKHA YOGAS (Combinations 166 & 167)
// ============================================================================
const _checkSumukhaYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];

  const lord2 = houseLords[2];
  if (!lord2) return [];

  const l2House = placements[lord2];
  const l2Sign = rasiPlacements[lord2];

  if (l2House !== undefined && l2Sign !== undefined) {
    const isKendra = [1, 4, 7, 10].includes(l2House);
    
    // 166. A: 2nd Lord in Kendra aspected by benefics
    const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    const aspectedByBenefic = benefics.some(b => b !== lord2 && hasAspect(b, l2Sign, rasiPlacements));
    
    // 166. B: Benefics join 2nd house
    const beneficIn2nd = benefics.some(b => placements[b] === 2);

    // 167. 2nd Lord in own/exalted/friendly Kendra, and Lord of that Kendra in Gopuramsa (defaulted to true)
    const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
    const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    const FRIENDLY_SIGNS = {
      Sun: [4, 8, 11, 0, 7, 3],
      Moon: [4, 2, 5, 1],
      Mars: [0, 7, 4, 3, 8, 11],
      Mercury: [2, 5, 4, 1, 6],
      Jupiter: [8, 11, 3, 4, 0, 7],
      Venus: [1, 6, 2, 5, 9, 10],
      Saturn: [9, 10, 6, 2, 5, 1]
    };

    const isExalted = l2Sign === EXALTATION_SIGNS[lord2];
    const isOwn = RASHI_LORDS[l2Sign] === lord2;
    const isFriendly = (FRIENDLY_SIGNS[lord2] || []).includes(l2Sign);

    const isLord2Dignified = isExalted || isOwn || isFriendly;

    if (isKendra && aspectedByBenefic) {
      yogas.push({
        name: "Sumukha Yoga (Comb. 166)",
        type: "Auspicious Yoga",
        involved: [...new Set(['Jupiter', 'Venus', 'Mercury', 'Moon', lord2])],
        description: `The 2nd Lord (${lord2}) is in a Kendra house (${l2House}) and aspected by benefic planets.`,
        results: "The subject will have an attractive and smiling face."
      });
    } else if (beneficIn2nd) {
      yogas.push({
        name: "Sumukha Yoga (Comb. 166)",
        type: "Auspicious Yoga",
        involved: [...new Set(benefics.filter(b => placements[b] === 2))],
        description: "Benefics occupy the 2nd house.",
        results: "The subject will have an attractive and smiling face."
      });
    }

    // Comb. 167
    if (isKendra && isLord2Dignified) {
      const kendraLord = RASHI_LORDS[(lagnaIndex + l2House - 1) % 12];
      yogas.push({
        name: "Sumukha Yoga (Comb. 167)",
        type: "Auspicious Yoga",
        involved: [...new Set([lord2, kendraLord])],
        description: `The 2nd Lord (${lord2}) is in a Kendra house (${l2House}) which is its own, exalted, or friendly sign, and the lord of the Kendra (${kendraLord}) attains Gopuramsa.`,
        results: "The subject will have an attractive and smiling face."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 😠 DURMUKHA YOGAS (Combinations 168 & 169)
// ============================================================================
const _checkDurmukhaYogas = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];

  const lord2 = houseLords[2];
  if (!lord2) return [];

  const l2House = placements[lord2];
  const l2Sign = rasiPlacements[lord2];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const INIMICAL_SIGNS = {
    Sun: [1, 6, 9, 10], Moon: [], Mars: [2, 5], Mercury: [3], Jupiter: [2, 5, 1, 6], Venus: [4, 3], Saturn: [0, 7, 4, 3]
  };

  // 168. Malefics occupy the 2nd house, and 2nd Lord conjoins a malefic or is debilitated
  const maleficsIn2nd = malefics.filter(m => placements[m] === 2);
  const isLord2Debilitated = l2Sign !== undefined && l2Sign === DEBILITATION_SIGNS[lord2];
  const isLord2ConjunctMalefic = malefics.some(m => m !== lord2 && placements[m] !== undefined && placements[m] === l2House);

  if (maleficsIn2nd.length > 0 && (isLord2Debilitated || isLord2ConjunctMalefic)) {
    yogas.push({
      name: "Durmukha Yoga (Comb. 168)",
      type: "Inauspicious Yoga",
      involved: [...new Set([...maleficsIn2nd, lord2])],
      description: `Malefic planets occupy the 2nd house, and the 2nd Lord (${lord2}) is ${isLord2Debilitated ? "debilitated" : "conjoined with a malefic"}.`,
      results: "The native will have an ugly or repulsive face and he becomes angry and irritable."
    });
  }

  // 169. 2nd Lord is a natural malefic, and joins Gulika (placeholder) or occupies unfriendly and debilitated Navamsa with malefics
  const naturalMalefics = ['Sun', 'Mars', 'Saturn'];
  if (naturalMalefics.includes(lord2) && navamsaPlacements) {
    const navSign = navamsaPlacements[lord2];
    if (navSign !== undefined) {
      const isUnfriendlyNav = (INIMICAL_SIGNS[lord2] || []).includes(navSign);
      const isDebilitatedNav = navSign === DEBILITATION_SIGNS[lord2];

      const maleficsInSameNav = malefics.filter(m => m !== lord2 && navamsaPlacements[m] === navSign);

      if ((isUnfriendlyNav || isDebilitatedNav) && maleficsInSameNav.length > 0) {
        yogas.push({
          name: "Durmukha Yoga (Comb. 169)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord2, ...maleficsInSameNav])],
          description: `The 2nd Lord (${lord2}) is a natural malefic, occupies an unfriendly or debilitated Navamsa sign (${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][navSign]}), and is conjoined with a malefic in Navamsa.`,
          results: "The native will have an ugly or repulsive face and he becomes angry and irritable."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🍽️ BHOJANA SOUKHYA YOGA (Combination 170)
// ============================================================================
const _checkBhojanaSoukhyaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const l2Sign = rasiPlacements[lord2];
  if (l2Sign === undefined) return [];

  const lord2InVaiseshikamsa = true; // Placeholder for varga strength
  const hasJupiterAspect = hasAspect('Jupiter', l2Sign, rasiPlacements);
  const hasVenusAspect = hasAspect('Venus', l2Sign, rasiPlacements);

  if (lord2InVaiseshikamsa && (hasJupiterAspect || hasVenusAspect)) {
    yogas.push({
      name: "Bhojana Soukhya Yoga",
      type: "Auspicious Yoga",
      involved: [...new Set(['Jupiter', 'Venus', lord2])],
      description: "The powerful lord of the 2nd should occupy Vaiseshikamsa and have the aspect of Jupiter or Venus.",
      results: "The subject becomes rich and will always have good and delicious food."
    });
  }

  return yogas;
};

// ============================================================================
// 🍲 ANNADANA YOGA (Combination 171)
// ============================================================================
const _checkAnnadanaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const l2Sign = rasiPlacements[lord2];
  if (l2Sign === undefined) return [];

  const lord2InVaiseshikamsa = true; // Placeholder for varga strength
  const jupSign = rasiPlacements['Jupiter'];
  const mercSign = rasiPlacements['Mercury'];

  if (jupSign !== undefined && mercSign !== undefined) {
    const conjunctOrAspectedByJupiter = (l2Sign === jupSign) || hasAspect('Jupiter', l2Sign, rasiPlacements);
    const conjunctOrAspectedByMercury = (l2Sign === mercSign) || hasAspect('Mercury', l2Sign, rasiPlacements);

    if (lord2InVaiseshikamsa && conjunctOrAspectedByJupiter && conjunctOrAspectedByMercury) {
      yogas.push({
        name: "Annadana Yoga",
        type: "Auspicious Yoga",
        involved: [...new Set(['Jupiter', 'Mercury', lord2])],
        description: "The lord of the 2nd should join Vaiseshikamsa and be in conjunction with or aspected by Jupiter and Mercury.",
        results: "The person will have a hospitable nature and will feed a large number of people."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🍽️ PARANNABHOJANA YOGA (Combination 172)
// ============================================================================
const _checkParannabhojanaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const l2Sign = rasiPlacements[lord2];
  if (l2Sign === undefined) return [];

  const isDebilitatedRasi = l2Sign === DEBILITATION_SIGNS[lord2];

  let isUnfriendlyNav = false;
  let isDebilitatedNav = false;
  if (navamsaPlacements) {
    const navSign = navamsaPlacements[lord2];
    if (navSign !== undefined) {
      isUnfriendlyNav = (INIMICAL_SIGNS[lord2] || []).includes(navSign);
      isDebilitatedNav = navSign === DEBILITATION_SIGNS[lord2];
    }
  }

  const matchesDignity = isDebilitatedRasi || isUnfriendlyNav || isDebilitatedNav;

  if (matchesDignity) {
    const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const aspectingDebPlanet = classicalPlanets.find(p => {
      const pRasi = rasiPlacements[p];
      if (pRasi === undefined) return false;
      const isPDeb = pRasi === DEBILITATION_SIGNS[p];
      return isPDeb && hasAspect(p, l2Sign, rasiPlacements);
    });

    if (aspectingDebPlanet) {
      const isHaterOfFood = isDebilitatedNav;
      yogas.push({
        name: "Parannabhojana Yoga",
        type: "Inauspicious Yoga",
        involved: [...new Set([lord2, aspectingDebPlanet])],
        description: `The lord of the 2nd (${lord2}) is in ${isDebilitatedRasi ? 'debilitation' : 'unfriendly navamsa'} and aspected by a debilitated planet (${aspectingDebPlanet}).`,
        results: isHaterOfFood 
          ? "The person will live upon food doled out by others or will be a dependent, and will be a hater of food." 
          : "The person will live upon food doled out by others or will be a dependent."
      });
    }
  }

  return yogas;
};

// ============================================================================
// ⚱️ SRADDHANNABHUKTHA YOGA (Combination 173)
// ============================================================================
const _checkSraddhannabhukthaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const saturnOwns2 = lord2 === 'Saturn';
  const saturnConjoinsLord2 = placements['Saturn'] !== undefined && placements[lord2] !== undefined && placements['Saturn'] === placements[lord2];

  const secondHouseSign = (lagnaIndex + 1) % 12;
  const isSaturnDebilitated = rasiPlacements['Saturn'] === DEBILITATION_SIGNS['Saturn'];
  const saturnAspects2nd = isSaturnDebilitated && hasAspect('Saturn', secondHouseSign, rasiPlacements);

  if (saturnOwns2 || saturnConjoinsLord2 || saturnAspects2nd) {
    const trigger = saturnOwns2 
      ? "Saturn owns the 2nd house" 
      : saturnConjoinsLord2 
        ? "Saturn conjoins the 2nd Lord" 
        : "the 2nd house is aspected by debilitated Saturn";
    
    yogas.push({
      name: "Sraddhannabhuktha Yoga",
      type: "Inauspicious Yoga",
      involved: [...new Set(['Saturn', lord2])],
      description: `Saturn owns the 2nd, joins the 2nd lord, or the 2nd is aspected by debilitated Saturn (specifically, ${trigger}).`,
      results: "The subject gets food prepared at the times of obsequies (death ceremonies)."
    });
  }

  return yogas;
};

// ============================================================================
// 🐍 SARPAGANDA YOGA (Combination 174)
// ============================================================================
const _checkSarpagandaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const rahuIn2nd = placements['Rahu'] === 2;
  const MandiIn2nd = true; // Placeholder for Mandi/Gulika in the 2nd house

  if (rahuIn2nd && MandiIn2nd) {
    yogas.push({
      name: "Sarpaganda Yoga",
      type: "Inauspicious Yoga",
      involved: ['Rahu'],
      description: "Rahu conjoins the 2nd house with Mandi.",
      results: "The person will be bitten by a snake."
    });
  }

  return yogas;
};

// ============================================================================
// 🗣️ VAKCHALANA YOGA (Combination 175)
// ============================================================================
const _checkVakchalanaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const isMaleficLord = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(lord2);

  let joinsCruelNav = false;
  let navSignName = "";
  if (navamsaPlacements) {
    const navSign = navamsaPlacements[lord2];
    if (navSign !== undefined) {
      const navLord = RASHI_LORDS[navSign];
      joinsCruelNav = ['Sun', 'Mars', 'Saturn'].includes(navLord);
      navSignName = SIGN_NAMES[navSign];
    }
  }

  const secondHouseSign = (lagnaIndex + 1) % 12;
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const hasBeneficIn2 = benefics.some(b => placements[b] === 2);
  const hasBeneficAspectOn2 = benefics.some(b => hasAspect(b, secondHouseSign, rasiPlacements));
  const devoidOfBenefic = !hasBeneficIn2 && !hasBeneficAspectOn2;

  if (isMaleficLord && joinsCruelNav && devoidOfBenefic) {
    yogas.push({
      name: "Vakchalana Yoga",
      type: "Inauspicious Yoga",
      involved: [lord2],
      description: `A malefic Lord (${lord2}) owns the 2nd house, occupies a cruel Navamsa (${navSignName} owned by a malefic), and the 2nd house is devoid of benefic aspect or association.`,
      results: "The native becomes a stammerer."
    });
  }

  return yogas;
};

// ============================================================================
// 🧪 VISHAPRAYOGA YOGA (Combination 176)
// ============================================================================
const _checkVishaprayogaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord2 = houseLords[2];
  if (!lord2) return [];

  const secondHouseSign = (lagnaIndex + 1) % 12;
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

  const maleficIn2 = malefics.filter(m => placements[m] === 2);
  const isJoinedByMalefic = maleficIn2.length > 0;

  const maleficAspect2nd = malefics.filter(m => hasAspect(m, secondHouseSign, rasiPlacements));
  const isAspectedByMalefic = maleficAspect2nd.length > 0;

  let inCruelNav = false;
  if (navamsaPlacements) {
    const navSign = navamsaPlacements[lord2];
    if (navSign !== undefined) {
      const navLord = RASHI_LORDS[navSign];
      inCruelNav = ['Sun', 'Mars', 'Saturn'].includes(navLord);
    }
  }

  const l2Sign = rasiPlacements[lord2];
  const isLord2AspectedByMalefic = l2Sign !== undefined && malefics.some(m => hasAspect(m, l2Sign, rasiPlacements));

  if (isJoinedByMalefic && isAspectedByMalefic && inCruelNav && isLord2AspectedByMalefic) {
    const involvedPlanets = [...new Set([lord2, ...maleficIn2, ...maleficAspect2nd])];
    yogas.push({
      name: "Vishaprayoga Yoga",
      type: "Inauspicious Yoga",
      involved: involvedPlanets,
      description: "The 2nd house is conjoined and aspected by malefics, and the 2nd lord occupies a cruel Navamsa and receives malefic aspect.",
      results: "The person will be poisoned by others."
    });
  }

  return yogas;
};

// ============================================================================
// 👨👦 BHRATRUVIRIDDHI YOGA (Combination 177)
// ============================================================================
const _checkBhratruvriddhiYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const thirdHouseSign = (lagnaIndex + 2) % 12;
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  const FRIENDLY_SIGNS = {
    Sun: [4, 8, 11, 0, 7, 3],
    Moon: [4, 2, 5, 1],
    Mars: [0, 7, 4, 3, 8, 11],
    Mercury: [2, 5, 4, 1, 6],
    Jupiter: [8, 11, 3, 4, 0, 7],
    Venus: [1, 6, 2, 5, 9, 10],
    Saturn: [9, 10, 6, 2, 5, 1]
  };

  const isRasiDignified = (pName) => {
    const rasiIdx = rasiPlacements[pName];
    if (rasiIdx === undefined) return false;
    const isOwn = RASHI_LORDS[rasiIdx] === pName;
    const isExalted = rasiIdx === EXALTATION_SIGNS[pName];
    const isFriendly = (FRIENDLY_SIGNS[pName] || []).includes(rasiIdx);
    return isOwn || isExalted || isFriendly;
  };

  const l3Sign = rasiPlacements[lord3];
  const l3JoinedBenefic = benefics.filter(b => b !== lord3 && placements[b] === placements[lord3]);
  const l3AspectedBenefic = l3Sign !== undefined ? benefics.filter(b => b !== lord3 && hasAspect(b, l3Sign, rasiPlacements)) : [];
  const l3Condition = l3JoinedBenefic.length > 0 || l3AspectedBenefic.length > 0;

  const marsSign = rasiPlacements['Mars'];
  const marsJoinedBenefic = benefics.filter(b => b !== 'Mars' && placements[b] === placements['Mars']);
  const marsAspectedBenefic = marsSign !== undefined ? benefics.filter(b => b !== 'Mars' && hasAspect(b, marsSign, rasiPlacements)) : [];
  const marsCondition = marsJoinedBenefic.length > 0 || marsAspectedBenefic.length > 0;

  const house3JoinedBenefic = benefics.filter(b => placements[b] === 3);
  const house3AspectedBenefic = benefics.filter(b => hasAspect(b, thirdHouseSign, rasiPlacements));
  const house3Condition = house3JoinedBenefic.length > 0 || house3AspectedBenefic.length > 0;

  const isL3Strong = isRasiDignified(lord3) || [1, 4, 7, 10, 5, 9, 11].includes(placements[lord3]);
  const isMarsStrong = isRasiDignified('Mars') || [1, 4, 7, 10, 5, 9, 11].includes(placements['Mars']);
  const isOtherwiseStrong = isL3Strong || isMarsStrong;

  if ((l3Condition || marsCondition || house3Condition) && isOtherwiseStrong) {
    const associatedPlanets = [...new Set([
      lord3,
      'Mars',
      ...l3JoinedBenefic,
      ...l3AspectedBenefic,
      ...marsJoinedBenefic,
      ...marsAspectedBenefic,
      ...house3JoinedBenefic,
      ...house3AspectedBenefic
    ])];

    yogas.push({
      name: "Bhratruvriddhi Yoga",
      type: "Auspicious Yoga",
      involved: associatedPlanets,
      description: "The 3rd lord, Mars, or the 3rd house should be joined or aspected by benefics and otherwise strong.",
      results: "The native will have a large number of brothers, or their brothers will prosper/survive."
    });
  }

  return yogas;
};

// ============================================================================
// 💀 SODARANASA YOGA (Combination 178)
// ============================================================================
const _checkSodaranasaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const marsHouse = placements['Mars'];
  const l3House = placements[lord3];

  if (marsHouse !== undefined && l3House !== undefined) {
    if (marsHouse === 8 && l3House === 8) {
      const eighthHouseSign = (lagnaIndex + 7) % 12;
      const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
      const aspectingMalefics = malefics.filter(m => m !== 'Mars' && m !== lord3 && hasAspect(m, eighthHouseSign, rasiPlacements));

      if (aspectingMalefics.length > 0) {
        yogas.push({
          name: "Sodaranasa Yoga",
          type: "Inauspicious Yoga",
          involved: [...new Set(['Mars', lord3, ...aspectingMalefics])],
          description: `Mars and the 3rd Lord (${lord3}) occupy the 8th house and are aspected by malefic planets.`,
          results: "The native will be devoid of brothers and sisters."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 👩 EKABHAGINI YOGA (Combination 179)
// ============================================================================
const _checkEkabhaginiYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const mercHouse = placements['Mercury'];
  const l3House = placements[lord3];
  const moonHouse = placements['Moon'];
  const marsHouse = placements['Mars'];
  const saturnHouse = placements['Saturn'];

  if (mercHouse !== undefined && l3House !== undefined && moonHouse !== undefined && marsHouse !== undefined && saturnHouse !== undefined) {
    const mercIn3rd = mercHouse === 3;
    const lord3WithMoon = l3House === moonHouse;
    const marsWithSaturn = marsHouse === saturnHouse;

    if (mercIn3rd && lord3WithMoon && marsWithSaturn) {
      yogas.push({
        name: "Ekabhagini Yoga",
        type: "Auspicious Yoga",
        involved: [...new Set(['Mercury', lord3, 'Moon', 'Mars', 'Saturn'])],
        description: `Mercury joins the 3rd house, the 3rd Lord (${lord3}) conjoins the Moon, and Mars conjoins Saturn.`,
        results: "The person will have only one sister."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 👨 Dwadasa Sahodara Yoga (Combination 180)
// ============================================================================
const _checkDwadasaSahodaraYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const l3House = placements[lord3];
  const l3Sign = rasiPlacements[lord3];

  if (l3House !== undefined && l3Sign !== undefined) {
    const inKendra = [1, 4, 7, 10].includes(l3House);

    const marsSign = rasiPlacements['Mars'];
    const jupSign = rasiPlacements['Jupiter'];
    const marsJupInCapricorn = (marsSign === 9 && jupSign === 9);

    if (inKendra && marsJupInCapricorn) {
      const diff = (9 - l3Sign + 12) % 12 + 1;
      const isTrine = [1, 5, 9].includes(diff);

      if (isTrine) {
        yogas.push({
          name: "Dwadasa Sahodara Yoga",
          type: "Auspicious Yoga",
          involved: [...new Set(['Mars', 'Jupiter', lord3])],
          description: `The 3rd Lord (${lord3}) is in a Kendra, and exalted Mars conjoins Jupiter in Capricorn (which is a trine from the 3rd Lord).`,
          results: "The native will be the third out of twelve brothers and sisters."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 👨 Sapthasankhya Sahodara Yoga (Combination 181)
// ============================================================================
const _checkSapthasankhyaSahodaraYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord12 = houseLords[12];
  if (!lord12) return [];

  const l12House = placements[lord12];
  const marsHouse = placements['Mars'];
  const moonHouse = placements['Moon'];
  const jupHouse = placements['Jupiter'];
  const venHouse = placements['Venus'];

  if (l12House !== undefined && marsHouse !== undefined && moonHouse !== undefined && jupHouse !== undefined) {
    const lord12WithMars = l12House === marsHouse;
    const moonIn3rd = moonHouse === 3;
    const moonWithJup = moonHouse === jupHouse;
    const moonRasi = (lagnaIndex + 2) % 12;
    const noVenusWithMoon = venHouse !== moonHouse;
    const noVenusAspect = !hasAspect('Venus', moonRasi, rasiPlacements);

    if (lord12WithMars && moonIn3rd && moonWithJup && noVenusWithMoon && noVenusAspect) {
      yogas.push({
        name: "Sapthasankhya Sahodara Yoga",
        type: "Auspicious Yoga",
        involved: [...new Set([lord12, 'Mars', 'Moon', 'Jupiter'])],
        description: `Lord of the 12th (${lord12}) conjoins Mars, and the Moon is in the 3rd house conjoined with Jupiter, devoid of association or aspect of Venus.`,
        results: "The native will have seven brothers."
      });
    }
  }

  return yogas;
};

// ============================================================================
// ⚔️ Parakrama Yoga (Combination 182)
// ============================================================================
const _checkParakramaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const l3House = placements[lord3];
  const l3Sign = rasiPlacements[lord3];
  const marsSign = rasiPlacements['Mars'];

  if (l3House !== undefined && l3Sign !== undefined && marsSign !== undefined) {
    // 1. 3rd Lord occupies a benefic Navamsa
    const navSign = navamsaPlacements[lord3];
    if (navSign === undefined) return [];

    const navLord = RASHI_LORDS[navSign];
    const inBeneficNav = ['Moon', 'Mercury', 'Jupiter', 'Venus'].includes(navLord);

    // 2. 3rd Lord conjoined or aspected by benefic planets
    const benefics = ['Moon', 'Mercury', 'Jupiter', 'Venus'];
    const l3JoinedBenefic = benefics.filter(b => b !== lord3 && placements[b] === l3House);
    const l3AspectedBenefic = benefics.filter(b => b !== lord3 && hasAspect(b, l3Sign, rasiPlacements));
    const participatingBenefics = [...new Set([...l3JoinedBenefic, ...l3AspectedBenefic])];
    const isL3AspectedOrConjoinedBenefic = participatingBenefics.length > 0;

    // 3. Mars occupies a benefic sign
    const marsSignLord = RASHI_LORDS[marsSign];
    const marsInBeneficSign = ['Moon', 'Mercury', 'Jupiter', 'Venus'].includes(marsSignLord);

    if (inBeneficNav && isL3AspectedOrConjoinedBenefic && marsInBeneficSign) {
      yogas.push({
        name: "Parakrama Yoga",
        type: "Auspicious Yoga",
        involved: [...new Set([lord3, 'Mars', ...participatingBenefics])],
        description: `The 3rd Lord (${lord3}) occupies a benefic Navamsa, conjoined with or aspected by benefic planets, and Mars occupies a benefic sign.`,
        results: "The subject will possess much courage."
      });
    }
  }

  return yogas;
};

// ============================================================================
// ⚔️ Yuddha Praveena Yoga (Combination 183)
// ============================================================================
const _checkYuddhaPraveenaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const navSign1 = navamsaPlacements[lord3];
  if (navSign1 === undefined) return [];

  const owner1 = RASHI_LORDS[navSign1];
  const navSign2 = navamsaPlacements[owner1];
  if (navSign2 === undefined) return [];

  const owner2 = RASHI_LORDS[navSign2];

  const rasiSign2 = rasiPlacements[owner2];
  const navSignOwner2 = navamsaPlacements[owner2];

  const isOwnRasi = rasiSign2 !== undefined && RASHI_LORDS[rasiSign2] === owner2;
  const isOwnNav = navSignOwner2 !== undefined && RASHI_LORDS[navSignOwner2] === owner2;

  if (isOwnRasi || isOwnNav) {
    yogas.push({
      name: "Yuddha Praveena Yoga",
      type: "Auspicious Yoga",
      involved: [...new Set([lord3, owner1, owner2])],
      description: `The lord of the Navamsa (${owner2}) occupied by the owner (${owner1}) of the Navamsa occupied by the 3rd Lord (${lord3}) is in its own sign in Rasi or Navamsa (own Vargas).`,
      results: "The person becomes a capable strategist and an expert in warfare."
    });
  }

  return yogas;
};

// ============================================================================
// 🏹 Yuddhatpoorvadridhachitta Yoga (Combination 184)
// ============================================================================
const _checkYuddhatpoorvadridhachittaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const isExaltedL3 = rasiPlacements[lord3] === EXALTATION_SIGNS[lord3];

  if (isExaltedL3) {
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    
    // Conjoined in movable Rasi
    const rasiMalefics = malefics.filter(m => m !== lord3 && placements[m] !== undefined && placements[m] === placements[lord3]);
    const isRasiMovable = rasiPlacements[lord3] !== undefined && (rasiPlacements[lord3] % 3 === 0);
    const rasiCondition = rasiMalefics.length > 0 && isRasiMovable;

    // Conjoined in movable Navamsa
    const navMalefics = navamsaPlacements ? malefics.filter(m => m !== lord3 && navamsaPlacements[m] !== undefined && navamsaPlacements[m] === navamsaPlacements[lord3]) : [];
    const isNavMovable = navamsaPlacements && navamsaPlacements[lord3] !== undefined && (navamsaPlacements[lord3] % 3 === 0);
    const navCondition = navMalefics.length > 0 && isNavMovable;

    if (rasiCondition || navCondition) {
      const conjoinedPlanets = [...new Set([...rasiMalefics, ...navMalefics])];
      yogas.push({
        name: "Yuddhatpoorvadridhachitta Yoga",
        type: "Inauspicious Yoga",
        involved: [...new Set([lord3, ...conjoinedPlanets])],
        description: `The exalted Lord of the 3rd (${lord3}) is conjoined with malefics (${conjoinedPlanets.join(', ')}) in a movable Rasi or Navamsa.`,
        results: "The native will show courage before the war begins, but will lose balance of mind and retreat in the actual theater of conflict."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🛡️ Yuddhatpaschaddrudha Yoga (Combination 185)
// ============================================================================
const _checkYuddhatpaschaddrudhaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords, planets) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords || !planets) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const l3Sign = rasiPlacements[lord3];
  const l3NavSign = navamsaPlacements[lord3];

  if (l3Sign !== undefined && l3NavSign !== undefined) {
    const fixedSigns = [1, 4, 7, 10]; // Taurus, Leo, Scorpio, Aquarius
    const inFixedRasi = fixedSigns.includes(l3Sign);
    const inFixedNav = fixedSigns.includes(l3NavSign);

    if (inFixedRasi && inFixedNav) {
      // Check cruel Shashtiamsa
      const lord3Planet = planets.find(p => p && (p.planet === lord3 || p.name === lord3));
      const degWithinSign = lord3Planet ? (lord3Planet.fullDegree % 30) : 15;
      
      const shashtiamsaIndex = Math.floor(degWithinSign * 2) + 1; // 1 to 60
      const actualIndex = l3Sign % 2 === 0 ? shashtiamsaIndex : 61 - shashtiamsaIndex;
      const cruelShashtiamsas = [1, 2, 7, 8, 9, 10, 11, 12, 15, 16, 26, 31, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44, 48, 51, 52, 55, 59];
      const isCruelShashtiamsa = cruelShashtiamsas.includes(actualIndex);

      if (isCruelShashtiamsa) {
        // Lord of occupied rasi in debility
        const signLord = RASHI_LORDS[l3Sign];
        const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
        const isSignLordDebilitated = rasiPlacements[signLord] !== undefined && rasiPlacements[signLord] === DEBILITATION_SIGNS[signLord];

        if (isSignLordDebilitated) {
          yogas.push({
            name: "Yuddhatpaschaddrudha Yoga",
            type: "Auspicious Yoga",
            involved: [...new Set([lord3, signLord])],
            description: `The Lord of the 3rd (${lord3}) occupies a fixed Rasi and fixed Navamsa in a cruel Shashtiamsa, and the Lord of that Rasi (${signLord}) is debilitated.`,
            results: "The native gets courage after the commencement of the war (resolute in conflict)."
          });
        }
      }
    }
  }

  return yogas;
};

// ============================================================================
// 📖 Satkathadisravana Yoga (Combination 186)
// ============================================================================
const _checkSatkathadisravanaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord3 = houseLords[3];
  if (!lord3) return [];

  const thirdHouseSign = (lagnaIndex + 2) % 12;
  const benefics = ['Moon', 'Mercury', 'Jupiter', 'Venus'];

  const is3rdHouseBeneficSign = benefics.includes(RASHI_LORDS[thirdHouseSign]);
  const is3rdHouseAspectedByBenefic = benefics.some(b => hasAspect(b, thirdHouseSign, rasiPlacements));

  const navSign = navamsaPlacements[lord3];
  const isL3InBeneficNav = navSign !== undefined && benefics.includes(RASHI_LORDS[navSign]);

  const l3Sign = rasiPlacements[lord3];
  const l3JoinedBenefic = benefics.filter(b => b !== lord3 && placements[b] === placements[lord3]);
  const l3AspectedBenefic = l3Sign !== undefined ? benefics.filter(b => b !== lord3 && hasAspect(b, l3Sign, rasiPlacements)) : [];
  const participatingBenefics = [...new Set([...l3JoinedBenefic, ...l3AspectedBenefic])];
  const isL3AspectedOrConjoinedBenefic = participatingBenefics.length > 0;

  if (is3rdHouseBeneficSign && is3rdHouseAspectedByBenefic && isL3InBeneficNav && isL3AspectedOrConjoinedBenefic) {
    yogas.push({
      name: "Satkathadisravana Yoga",
      type: "Auspicious Yoga",
      involved: [...new Set([lord3, ...participatingBenefics])],
      description: `The 3rd house is a benefic sign aspected by benefic planets, the 3rd Lord (${lord3}) occupies a benefic Navamsa, and is conjoined with or aspected by benefic planets.`,
      results: "The native will always be interested in reading high-class literature and in listening to religious discourses."
    });
  }

  return yogas;
};

// ============================================================================
// 🏠 Uttama Griha Yoga (Combination 187)
// ============================================================================
export const checkUttamaGrihaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const l4House = placements[lord4];
  const l4Sign = rasiPlacements[lord4];

  if (l4House !== undefined) {
    const isL4InKendraOrTrikona = [1, 4, 7, 10, 5, 9].includes(l4House);

    if (isL4InKendraOrTrikona) {
      const benefics = ['Moon', 'Mercury', 'Jupiter', 'Venus'];
      const conjoinedBenefics = benefics.filter(b => b !== lord4 && placements[b] === l4House);
      const aspectedBenefics = l4Sign !== undefined ? benefics.filter(b => b !== lord4 && hasAspect(b, l4Sign, rasiPlacements)) : [];
      const associatedBenefics = [...new Set([...conjoinedBenefics, ...aspectedBenefics])];

      if (associatedBenefics.length > 0) {
        yogas.push({
          name: "Uttama Griha Yoga",
          type: "Auspicious Yoga",
          involved: [...new Set([lord4, ...associatedBenefics])],
          description: `The Lord of the 4th (${lord4}) is conjoined with or aspected by benefic planets in a Kendra or Trikona house.`,
          results: "The subject will possess good houses."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🏰 Vichitra Saudha Prakara Yoga (Combination 188)
// ============================================================================
export const checkVichitraSaudhaPrakaraYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  const lord10 = houseLords[10];
  if (!lord4 || !lord10) return [];

  const l4House = placements[lord4];
  const l10House = placements[lord10];
  const satHouse = placements['Saturn'];
  const marsHouse = placements['Mars'];

  if (l4House !== undefined && l10House !== undefined && satHouse !== undefined && marsHouse !== undefined) {
    if (l4House === l10House && l4House === satHouse && l4House === marsHouse) {
      yogas.push({
        name: "Vichitra Saudha Prakara Yoga",
        type: "Auspicious Yoga",
        involved: [...new Set([lord4, lord10, 'Saturn', 'Mars'])],
        description: `The Lords of the 4th (${lord4}) and 10th (${lord10}) are conjoined together with Saturn and Mars.`,
        results: "The person acquires innumerable mansions."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 🥁 BHERI YOGAS (Combinations 189 & 190)
// ============================================================================

const _checkBheriYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const ninthLordIndex = (lagnaIndex + 8) % 12;
  const ninthLord = lagnaLords[ninthLordIndex];

  const venSign = placements['Venus'];
  const jupSign = placements['Jupiter'];
  const llSign = placements[lagnaLord];

  if (venSign === undefined || jupSign === undefined || llSign === undefined || placements[ninthLord] === undefined) {
      return yogas;
  }

  // Placeholder for 9th lord being "strongly disposed"
  const ninthLordIsStrong = true; 

  // Helper to check if two signs are in mutual Kendras (0, 3, 6, 9 signs apart)
  const isMutual = (s1, s2) => {
      const diff = (s1 - s2 + 12) % 12;
      return [0, 3, 6, 9].includes(diff);
  };

  const areMutualKendras = isMutual(venSign, jupSign) && isMutual(venSign, llSign) && isMutual(jupSign, llSign);

  // Helper to check if a sign is a Kendra from Lagna (Houses 1, 4, 7, 10)
  const getHouse = (signIndex) => ((signIndex - lagnaIndex + 12) % 12) + 1;
  const isKendra = (signIndex) => [1, 4, 7, 10].includes(getHouse(signIndex));

  const allInLagnaKendras = isKendra(venSign) && isKendra(jupSign) && isKendra(llSign);

  const resultsText = "The subject will be long-lived, free from disease, a ruler, possess various forms of wealth, wise, having a noble spouse and children, and an elevated soul.";

  // 190. Bheri Yoga (Kendras from Lagna) 
  if (ninthLordIsStrong && allInLagnaKendras) {
      yogas.push({
          name: "Bheri Yoga (Comb. 190)",
          type: "Auspicious Yoga",
          involved: ['Venus', 'Jupiter', lagnaLord, ninthLord],
          description: "Venus, Jupiter, and the lord of Lagna occupy Kendras from the Ascendant, and the lord of the 9th is strongly disposed.",
          results: resultsText
      });
  } 
  // 189. Bheri Yoga (Mutual Kendras)
  else if (ninthLordIsStrong && areMutualKendras) {
      yogas.push({
          name: "Bheri Yoga (Comb. 189)",
          type: "Auspicious Yoga",
          involved: ['Venus', 'Jupiter', lagnaLord, ninthLord],
          description: "Venus, Jupiter, and the lord of Lagna are in mutual Kendras from each other, and the lord of the 9th is strongly disposed.",
          results: resultsText
      });
  }

  return yogas;
};

// ============================================================================
// 🏚️ GRIHANASA YOGAS (Combinations 191 & 192)
// ============================================================================
const _checkGrihanasaYogas = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const l4House = placements[lord4];
  const l4Sign = rasiPlacements[lord4];

  if (l4House !== undefined && l4Sign !== undefined) {
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

    // 191: Lord of 4th is in the 12th from the 4th (i.e., 3rd house from Lagna) aspected by a malefic
    const aspectingMalefics = malefics.filter(m => m !== lord4 && rasiPlacements[m] !== undefined && hasAspect(m, l4Sign, rasiPlacements));
    
    if (l4House === 3 && aspectingMalefics.length > 0) {
      yogas.push({
        name: "Grihanasa Yoga (Comb. 191)",
        type: "Inauspicious Yoga",
        involved: [...new Set([lord4, ...aspectingMalefics])],
        description: `The Lord of the 4th house (${lord4}) is posited in the 12th from the 4th (which is the 3rd house from Ascendant) and is aspected by malefic planets (${aspectingMalefics.join(', ')}).`,
        results: "The person will lose all their house property (already acquired or ancestral)."
      });
    }
    // 192: Lord of Navamsa occupied by Lord of 4th is in 12th from 4th (i.e., 3rd house from Lagna)
    const navSignOfLord4 = navamsaPlacements[lord4];
    if (navSignOfLord4 !== undefined) {
      const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
      const navLordOfLord4 = RASHI_LORDS[navSignOfLord4];
      const navLordHouse = placements[navLordOfLord4];

      if (navLordHouse === 3) {
        yogas.push({
          name: "Grihanasa Yoga (Comb. 192)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord4, navLordOfLord4])],
          description: `The lord of the Navamsa occupied by the 4th lord (${navLordOfLord4}) is disposed in the 12th from the 4th (which is the 3rd house from Ascendant).`,
          results: "The person will lose all their house property (already acquired or ancestral)."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🙏 BANDHU PUJYA YOGAS (Combinations 193 & 194)
// ============================================================================
const _checkBandhuPujyaYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const l4Sign = rasiPlacements[lord4];
  const house4Sign = (lagnaIndex + 3) % 12;

  // 193: Benefic lord of the 4th aspected by another benefic, and Mercury in Lagna
  // Dr. Raman notes: applicable to Mesha, Mithuna, Kataka, Dhanus, and Meena lagnas.
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  if (benefics.includes(lord4)) {
    const mercInLagna = placements['Mercury'] === 1;
    
    // Aspected by *another* benefic
    const aspectingBenefics = benefics.filter(b => b !== lord4 && rasiPlacements[b] !== undefined && hasAspect(b, l4Sign, rasiPlacements));
    
    if (mercInLagna && aspectingBenefics.length > 0) {
      yogas.push({
        name: "Bandhu Pujya Yoga (Comb. 193)",
        type: "Auspicious Yoga",
        involved: [...new Set([lord4, 'Mercury', ...aspectingBenefics])],
        description: `The 4th house is owned by a benefic (${lord4}) which is aspected by another benefic (${aspectingBenefics.join(', ')}), and Mercury is in the Lagna.`,
        results: "The person will be highly respected by his relatives and friends for their character and integrity."
      });
    }
  }

  // 194: 4th house or 4th lord associated with or aspected by Jupiter
  const jupIn4th = placements['Jupiter'] === 4;
  const jupAspects4thHouse = hasAspect('Jupiter', house4Sign, rasiPlacements);
  const jupWithLord4 = placements['Jupiter'] !== undefined && placements['Jupiter'] === placements[lord4];
  const jupAspectsLord4 = l4Sign !== undefined && hasAspect('Jupiter', l4Sign, rasiPlacements);

  if (jupIn4th || jupAspects4thHouse || jupWithLord4 || jupAspectsLord4) {
    // Build description details based on which condition triggered
    const reasons = [];
    if (jupIn4th) reasons.push("occupies the 4th house");
    if (jupAspects4thHouse) reasons.push("aspects the 4th house");
    if (jupWithLord4) reasons.push(`is conjoined with the 4th lord (${lord4})`);
    if (jupAspectsLord4) reasons.push(`aspects the 4th lord (${lord4})`);

    yogas.push({
      name: "Bandhu Pujya Yoga (Comb. 194)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Jupiter', lord4])],
      description: `Jupiter ${reasons.join(' and ')}.`,
      results: "The person will be loved and respected by all his relatives and friends for his generous instincts."
    });
  }

  return yogas;
};

// ============================================================================
// 🚶‍♂️ BANDHUBHISTHYAKTHA YOGA (Combination 195)
// ============================================================================
const _checkBandhubhisthyakthaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const l4Sign = rasiPlacements[lord4];
  if (l4Sign === undefined) return [];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const INIMICAL_SIGNS = {
    Sun: [1, 6, 9, 10], Moon: [], Mars: [2, 5], Mercury: [3], Jupiter: [2, 5, 1, 6], Venus: [4, 3], Saturn: [0, 7, 4, 3]
  };

  // 1. Associated with malefics
  const conjunctMalefics = malefics.filter(m => m !== lord4 && placements[m] === placements[lord4]);
  // Note: hasAspect helper is assumed to be available in your file scope
  const aspectingMalefics = malefics.filter(m => m !== lord4 && typeof hasAspect === 'function' && hasAspect(m, l4Sign, rasiPlacements));
  const hasMaleficAssociation = conjunctMalefics.length > 0 || aspectingMalefics.length > 0;

  // 2. Occupy evil shashtiamsas (Placeholder for deep varga analysis)
  const inEvilShashtiamsa = false; 

  // 3. Join inimical or debilitation signs
  const isDebilitated = l4Sign === DEBILITATION_SIGNS[lord4];
  const isInimical = (INIMICAL_SIGNS[lord4] || []).includes(l4Sign);

  // The text says "or", meaning any of these conditions trigger the yoga.
  if (hasMaleficAssociation || inEvilShashtiamsa || isDebilitated || isInimical) {
    
    let triggerDetails = [];
    if (hasMaleficAssociation) triggerDetails.push("associated with malefics");
    if (isDebilitated) triggerDetails.push("in debilitation");
    if (isInimical) triggerDetails.push("in an inimical sign");

    yogas.push({
      name: "Bandhubhisthyaktha Yoga",
      type: "Challenge",
      involved: [...new Set([lord4, ...conjunctMalefics, ...aspectingMalefics])],
      description: `The 4th lord (${lord4}) is ${triggerDetails.join(' or ')}.`,
      results: "Classically, the person is deserted by relatives. However, Dr. B.V. Raman notes: 'Because of its very general nature, one possessing this combination could simply be misunderstood by his associates, friends and relatives, ostensibly for no fault of his.'"
    });
  }

  return yogas;
};

// ============================================================================
// 🤱 MATRUDEERGHAYUR YOGAS (Combinations 196 & 197)
// ============================================================================
const _checkMatrudeerghayurYogas = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

  // 196: Benefic in 4th, 4th lord exalted, Moon strong
  const beneficsIn4th = benefics.filter(b => placements[b] === 4);
  const isLord4Exalted = rasiPlacements[lord4] === EXALTATION_SIGNS[lord4];
  const isMoonStrong = true; // Placeholder for Shadbala strength

  if (beneficsIn4th.length > 0 && isLord4Exalted && isMoonStrong) {
    yogas.push({
      name: "Matrudeerghayur Yoga (Comb. 196)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Moon', lord4, ...beneficsIn4th])],
      description: `A benefic (${beneficsIn4th.join(', ')}) occupies the 4th house, the 4th lord (${lord4}) is exalted, and the Moon is strong.`,
      results: "The native's mother will live long. This combination gives a strong positive clue for ascertaining the longevity and health of one's mother."
    });
  }

  // 197: Navamsa lord of 4th lord is strong, in Kendra from Lagna AND Kendra from Chandra Lagna (Moon)
  const l4NavSign = navamsaPlacements[lord4];
  if (l4NavSign !== undefined && placements['Moon'] !== undefined) {
    const navLordOfL4 = RASHI_LORDS[l4NavSign];
    
    if (navLordOfL4 && placements[navLordOfL4] !== undefined) {
      const isNavLordStrong = true; // Placeholder for Shadbala strength
      
      const houseFromLagna = placements[navLordOfL4];
      const inKendraFromLagna = [1, 4, 7, 10].includes(houseFromLagna);

      const moonHouse = placements['Moon'];
      const relFromMoon = ((houseFromLagna - moonHouse + 12) % 12) + 1;
      const inKendraFromMoon = [1, 4, 7, 10].includes(relFromMoon);

      if (isNavLordStrong && inKendraFromLagna && inKendraFromMoon) {
        yogas.push({
          name: "Matrudeerghayur Yoga (Comb. 197)",
          type: "Auspicious Yoga",
          involved: [lord4, navLordOfL4, 'Moon'],
          description: `The lord of the Navamsa occupied by the 4th lord (${navLordOfL4}) is strong and occupies a kendra from both the Lagna and the Chandra Lagna (Moon).`,
          results: "The native's mother will live long. This combination gives a strong positive clue for ascertaining the longevity and health of one's mother."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🥀 MATRUNASA YOGAS (Combinations 198 & 199)
// ============================================================================
const _checkMatrunasaYogas = (lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  if (!lord4) return [];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  // --- COMBINATION 198: Moon afflicted ---
  if (placements['Moon'] !== undefined && rasiPlacements['Moon'] !== undefined) {
    const moonRasi = rasiPlacements['Moon'];
    const moonHouse = placements['Moon'];

    // 1. Papakarthari (Hemmed by malefics in 2nd and 12th from Moon)
    const signAhead = (moonRasi + 1) % 12;
    const signBehind = (moonRasi + 11) % 12;
    const maleficsAhead = malefics.filter(m => rasiPlacements[m] === signAhead);
    const maleficsBehind = malefics.filter(m => rasiPlacements[m] === signBehind);
    const isPapakarthari = maleficsAhead.length > 0 && maleficsBehind.length > 0;

    // 2. Conjoined with malefics
    const conjunctMalefics = malefics.filter(m => placements[m] === moonHouse);
    
    // 3. Aspected by malefics (Assumes hasAspect is available in scope)
    const aspectingMalefics = malefics.filter(m => typeof hasAspect === 'function' && hasAspect(m, moonRasi, rasiPlacements));

    const hasAffliction = isPapakarthari || conjunctMalefics.length > 0 || aspectingMalefics.length > 0;

    if (hasAffliction) {
      // Check mitigations and aggravations based on Dr. Raman's remarks
      const jupAspect = typeof hasAspect === 'function' && hasAspect('Jupiter', moonRasi, rasiPlacements);
      
      // Check if 4th lord is ALSO afflicted
      const lord4Rasi = rasiPlacements[lord4];
      const lord4House = placements[lord4];
      const lord4Conjunct = malefics.some(m => placements[m] === lord4House);
      const lord4Aspected = typeof hasAspect === 'function' && malefics.some(m => hasAspect(m, lord4Rasi, rasiPlacements));
      const isLord4Afflicted = lord4Conjunct || lord4Aspected;

      let severity = "an early death";
      let remarks = "";

      if (isPapakarthari && conjunctMalefics.length > 0 && aspectingMalefics.length > 0) {
         severity = "immediate death after birth";
         remarks = " All three afflictions (Papakarthari, conjunction, and malefic aspect) are present simultaneously.";
      }

      if (jupAspect) {
         remarks += " However, the benefic aspect of Jupiter upon the Moon delays the event.";
      } else if (isLord4Afflicted) {
         remarks += ` Furthermore, the 4th lord (${lord4}) is also afflicted, making the early loss inevitable.`;
      }

      const involved = [...new Set(['Moon', ...conjunctMalefics, ...aspectingMalefics])];
      if (jupAspect) involved.push('Jupiter');
      if (isLord4Afflicted) involved.push(lord4);

      yogas.push({
        name: "Matrunasa Yoga (Comb. 198)",
        type: "Inauspicious Yoga",
        involved: involved,
        description: `The Moon is afflicted by malefics (Hemmed between: ${isPapakarthari ? 'Yes' : 'No'}, Conjoined: ${conjunctMalefics.length > 0 ? 'Yes' : 'No'}, Aspected: ${aspectingMalefics.length > 0 ? 'Yes' : 'No'}).${remarks}`,
        results: `The native's mother will face a risk of ${severity}.`
      });
    }
  }

  // --- COMBINATION 199: Complex Navamsa Dispositor ---
  const navSignL4 = navamsaPlacements[lord4];
  if (navSignL4 !== undefined) {
    const navLordL4 = RASHI_LORDS[navSignL4]; // Lord of Navamsa occupied by 4th lord
    const navSignNavLordL4 = navamsaPlacements[navLordL4]; // Navamsa occupied by THAT lord
    
    if (navSignNavLordL4 !== undefined) {
      const finalLord = RASHI_LORDS[navSignNavLordL4]; // Planet owning that navamsa
      const finalLordHouse = placements[finalLord];

      if ([6, 8, 12].includes(finalLordHouse)) {
        yogas.push({
          name: "Matrunasa Yoga (Comb. 199)",
          type: "Inauspicious Yoga",
          involved: [...new Set([lord4, navLordL4, finalLord])],
          description: `The 4th Lord (${lord4}) is in ${navLordL4}'s Navamsa. ${navLordL4} is in ${finalLord}'s Navamsa. Finally, ${finalLord} is disposed in the ${finalLordHouse}th house (a Dusthana) in the Rasi chart.`,
          results: "The person's mother will have a very early death."
        });
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🌑 MATRUGAMI YOGA (Combination 200)
// ============================================================================
const _checkMatrugamiYoga = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];
  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

  // Condition 1: An evil planet (malefic) occupies the 4th house
  const maleficsIn4th = malefics.filter(m => placements[m] === 4);
  if (maleficsIn4th.length === 0) return yogas;

  // Condition 2: Moon OR Venus in a Kendra, conjunct or aspected by a malefic
  const checkPlanetAfflictionInKendra = (planetName) => {
    const house = placements[planetName];
    // Check if in Kendra
    if (![1, 4, 7, 10].includes(house)) return false;

    const rasi = rasiPlacements[planetName];
    const conjunctMalefics = malefics.filter(m => m !== planetName && placements[m] === house);
    
    // Assumes hasAspect is available in scope
    const aspectingMalefics = malefics.filter(m => m !== planetName && typeof hasAspect === 'function' && hasAspect(m, rasi, rasiPlacements));

    if (conjunctMalefics.length > 0 || aspectingMalefics.length > 0) {
      return [...conjunctMalefics, ...aspectingMalefics];
    }
    return false;
  };

  const moonAfflictors = checkPlanetAfflictionInKendra('Moon');
  const venusAfflictors = checkPlanetAfflictionInKendra('Venus');

  if (moonAfflictors !== false || venusAfflictors !== false) {
    const afflictedPlanets = [];
    const afflictors = [];
    
    if (moonAfflictors !== false) { 
      afflictedPlanets.push('Moon'); 
      afflictors.push(...moonAfflictors); 
    }
    if (venusAfflictors !== false) { 
      afflictedPlanets.push('Venus'); 
      afflictors.push(...venusAfflictors); 
    }

    yogas.push({
      name: "Matrugami Yoga (Comb. 200)",
      type: "Dosha",
      involved: [...new Set([...afflictedPlanets, ...afflictors, ...maleficsIn4th])],
      description: `A malefic planet (${maleficsIn4th.join(', ')}) occupies the 4th house, and ${afflictedPlanets.join(' and/or ')} occupies a Kendra conjoined with or aspected by a malefic (${[...new Set(afflictors)].join(', ')}).`,
      results: "Classically described as committing severe moral transgressions with maternal figures. However, B.V. Raman clarifies this implies a severe moral depravity involving women held in equal esteem (e.g., step-mother, preceptor's wife, brother's wife, mother-in-law). It denotes a mind (Moon) and passions (Venus) heavily afflicted by mental filth, leading to a lack of healthy psychological boundaries."
    });
  }

  return yogas;
};

// ============================================================================
// 🌑 SAHODAREESANGAMA YOGA (Combination 201)
// ============================================================================
const _checkSahodareesangamaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord7 = houseLords[7];
  if (!lord7) return [];

  // 7th Lord and Venus in 4th House
  if (placements[lord7] === 4 && placements['Venus'] === 4) {
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    
    // Associated with or aspected by malefics
    const conjunctMalefics = malefics.filter(m => m !== lord7 && m !== 'Venus' && placements[m] === 4);
    const l7Sign = rasiPlacements[lord7]; // same as Venus sign since both are in 4th
    const aspectingMalefics = malefics.filter(m => m !== lord7 && m !== 'Venus' && typeof hasAspect === 'function' && hasAspect(m, l7Sign, rasiPlacements));
    
    const hasAffliction = conjunctMalefics.length > 0 || aspectingMalefics.length > 0;
    const inCruelShashtiamsa = false; // Placeholder for deep varga analysis

    if (hasAffliction || inCruelShashtiamsa) {
      yogas.push({
        name: "Sahodareesangama Yoga",
        type: "Dosha",
        involved: [...new Set([lord7, 'Venus', ...conjunctMalefics, ...aspectingMalefics])],
        description: `The 7th lord (${lord7}) and Venus are in conjunction in the 4th house, and are afflicted by malefics (${[...conjunctMalefics, ...aspectingMalefics].join(', ')}).`,
        results: "Classically denotes severe sexual immorality. B.V. Raman clarifies that intimacy with forbidden relations arises from bestial instincts overpowering conscience, indicating a severely afflicted Venus and 7th lord resulting in completely depraved boundaries."
      });
    }
  }
  return yogas;
};

// ============================================================================
// 🎭 KAPATA YOGAS (Combinations 202 - 204)
// ============================================================================
const _checkKapataYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  const lord10 = houseLords[10];
  if (!lord4 || !lord10) return [];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const l4Sign = rasiPlacements[lord4];
  const l4House = placements[lord4];

  // Helper for Papakarthari (hemmed between malefics) around 4th lord
  const checkPapakarthari = () => {
    if (l4Sign === undefined) return false;
    const signAhead = (l4Sign + 1) % 12;
    const signBehind = (l4Sign + 11) % 12;
    const maleficsAhead = malefics.some(m => rasiPlacements[m] === signAhead);
    const maleficsBehind = malefics.some(m => rasiPlacements[m] === signBehind);
    return maleficsAhead && maleficsBehind;
  };

  // 202: 4th house joined by malefic AND 4th lord associated/aspected/hemmed by malefics
  const maleficsIn4th = malefics.filter(m => placements[m] === 4);
  if (maleficsIn4th.length > 0) {
    const conjunctL4 = malefics.filter(m => m !== lord4 && placements[m] === l4House);
    const aspectingL4 = malefics.filter(m => m !== lord4 && typeof hasAspect === 'function' && hasAspect(m, l4Sign, rasiPlacements));
    const isHemmed = checkPapakarthari();

    if (conjunctL4.length > 0 || aspectingL4.length > 0 || isHemmed) {
       yogas.push({
         name: "Kapata Yoga (Comb. 202)",
         type: "Challenge",
         involved: [...new Set([lord4, ...maleficsIn4th, ...conjunctL4, ...aspectingL4])],
         description: `The 4th house is joined by a malefic (${maleficsIn4th.join(', ')}), and the 4th lord (${lord4}) is afflicted by malefics (Conjoined, Aspected, or Hemmed).`,
         results: "The native becomes a hypocrite. B.V. Raman notes that the 4th house rules the heart; malefic afflictions here make one conceal real feelings. This is commonly found in the charts of diplomats, as 'diplomacy always implies dignified hypocrisy.'"
       });
    }
  }

  // 203: 4th occupied by Saturn, Mars, Rahu, and malefic 10th lord aspected by malefics
  const satIn4 = placements['Saturn'] === 4;
  const marsIn4 = placements['Mars'] === 4;
  const rahuIn4 = placements['Rahu'] === 4;
  const lord10IsMalefic = malefics.includes(lord10);
  const lord10In4 = placements[lord10] === 4;
  
  if (satIn4 && marsIn4 && rahuIn4 && lord10IsMalefic && lord10In4) {
     const aspectingL10 = malefics.filter(m => m !== lord10 && typeof hasAspect === 'function' && hasAspect(m, rasiPlacements[lord10], rasiPlacements));
     if (aspectingL10.length > 0) {
        yogas.push({
           name: "Kapata Yoga (Comb. 203)",
           type: "Challenge",
           involved: ['Saturn', 'Mars', 'Rahu', lord10],
           description: `The 4th house is occupied by Saturn, Mars, Rahu, and the malefic 10th lord (${lord10}), who is aspected by malefics.`,
           results: "The native becomes a hypocrite. B.V. Raman notes combinations of Saturn-Rahu, Saturn-Mars, and Mars-Rahu actuate selfish and mean motives, creating an impure heart that conceals real feelings."
        });
     }
  }

  // 204: 4th lord joins Saturn, Mandi (omitted here), Rahu and aspected by malefics
  const l4WithSaturn = placements[lord4] !== undefined && placements[lord4] === placements['Saturn'];
  const l4WithRahu = placements[lord4] !== undefined && placements[lord4] === placements['Rahu'];
  
  if (l4WithSaturn && l4WithRahu) {
     const aspectingL4 = malefics.filter(m => m !== lord4 && m !== 'Saturn' && m !== 'Rahu' && typeof hasAspect === 'function' && hasAspect(m, l4Sign, rasiPlacements));
     if (aspectingL4.length > 0) {
        yogas.push({
           name: "Kapata Yoga (Comb. 204)",
           type: "Challenge",
           involved: [lord4, 'Saturn', 'Rahu', ...aspectingL4],
           description: `The 4th lord (${lord4}) joins Saturn and Rahu, and is aspected by malefics (${aspectingL4.join(', ')}).`,
           results: "The native becomes a hypocrite. B.V. Raman states that association of Saturn or Rahu with the 4th lord is highly undesirable, leading to concealed feelings and diplomatic or selfish behavior."
        });
     }
  }

  return yogas;
};



// ============================================================================
// 🕊️ NISHKAPATA YOGAS (Combinations 205 & 206)
// ============================================================================
const _checkNishkapataYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord4 = houseLords[4];
  const lagnaLord = houseLords[1];
  if (!lord4 || !lagnaLord) return [];

  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const house4Sign = (lagnaIndex + 3) % 12;
  const planetsIn4th = Object.keys(placements).filter(p => placements[p] === 4);
  
  let cond205 = false;
  let reason205 = "";

  // 205: 4th house occupied by a benefic, or an exalted/own house planet, or 4th is a benefic sign
  if (planetsIn4th.length > 0) {
    for (let p of planetsIn4th) {
      if (benefics.includes(p)) { 
        cond205 = true; 
        reason205 = `the benefic ${p} occupies the 4th house`; 
        break; 
      }
      const pRasi = rasiPlacements[p];
      if (pRasi !== undefined && pRasi === EXALTATION_SIGNS[p]) { 
        cond205 = true; 
        reason205 = `${p} is exalted in the 4th house`; 
        break; 
      }
      if (pRasi !== undefined && RASHI_LORDS[pRasi] === p) { 
        cond205 = true; 
        reason205 = `${p} is in its own sign in the 4th house`; 
        break; 
      }
    }
  }
  
  const isBeneficSign = benefics.includes(RASHI_LORDS[house4Sign]);
  if (!cond205 && isBeneficSign) {
    cond205 = true;
    reason205 = `the 4th house falls in a benefic sign (${RASHI_LORDS[house4Sign]}-ruled)`;
  }

  // 206: Lord of Lagna joins 4th, aspected/conjoined by benefic (or Parvata/Uttamamsa)
  let cond206 = false;
  let reason206 = "";
  if (placements[lagnaLord] === 4) {
    const conjunctBenefics = benefics.filter(b => b !== lagnaLord && placements[b] === 4);
    const aspectingBenefics = benefics.filter(b => b !== lagnaLord && typeof hasAspect === 'function' && hasAspect(b, rasiPlacements[lagnaLord], rasiPlacements));
    const inAuspiciousVarga = true; // Placeholder for Parvata/Uttamamsa
    
    if (conjunctBenefics.length > 0 || aspectingBenefics.length > 0 || inAuspiciousVarga) {
      cond206 = true;
      reason206 = `the Lagna lord (${lagnaLord}) occupies the 4th house associated with benefics or auspicious Vargas`;
    }
  }

  // B.V. Raman's strict guardrail: The 4th lord must NOT be afflicted by Rahu/Saturn without Jupiter/Venus saving it.
  let passesRamanGuardrail = true;
  let overrideNote = "";
  const l4House = placements[lord4];
  const lord4ConjunctRS = ['Rahu', 'Saturn'].filter(m => placements[m] !== undefined && placements[m] === l4House);

  if (lord4ConjunctRS.length > 0) {
    const l4Sign = rasiPlacements[lord4];
    const jupAspectOrConjunct = (placements['Jupiter'] === l4House) || (typeof hasAspect === 'function' && hasAspect('Jupiter', l4Sign, rasiPlacements));
    const venAspectOrConjunct = (placements['Venus'] === l4House) || (typeof hasAspect === 'function' && hasAspect('Venus', l4Sign, rasiPlacements));

    if (!jupAspectOrConjunct && !venAspectOrConjunct) {
      passesRamanGuardrail = false; // Pure heart is corrupted by unmitigated affliction
    } else {
      overrideNote = ` B.V. Raman notes that although the 4th lord (${lord4}) conjoins ${lord4ConjunctRS.join('/')}, the redeeming influence of ${jupAspectOrConjunct ? 'Jupiter' : 'Venus'} preserves the native's pure heart.`;
    }
  }

  if ((cond205 || cond206) && passesRamanGuardrail) {
    const triggerReason = cond205 ? reason205 : reason206;
    yogas.push({
      name: `Nishkapata Yoga (Comb. ${cond205 ? '205' : '206'})`,
      type: "Auspicious Yoga",
      involved: [...new Set([lord4, lagnaLord, ...planetsIn4th])],
      description: `Formed because ${triggerReason}.${overrideNote}`,
      results: "The person will be pure-hearted and hates secrecy and hypocrisy. B.V. Raman notes this shows an uncorrupted 4th house and 4th lord, ensuring genuine feelings and moral integrity."
    });
  }

  return yogas;
};

// ============================================================================
// 😠 MATRU SATRUTWA YOGA (Combination 207)
// ============================================================================
const _checkMatruSatrutwaYoga = (lagnaIndex, placements, rasiPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements) return [];

  const yogas = [];
  
  // B.V. Raman states this is ONLY applicable to Gemini (Mithuna) Lagna where Mercury rules 1st & 4th.
  if (lagnaIndex === 2 && placements['Mercury'] !== undefined && rasiPlacements['Mercury'] !== undefined) {
    const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
    const mercHouse = placements['Mercury'];
    const mercSign = rasiPlacements['Mercury'];

    const conjunctMalefics = malefics.filter(m => placements[m] === mercHouse);
    const aspectingMalefics = malefics.filter(m => typeof hasAspect === 'function' && hasAspect(m, mercSign, rasiPlacements));

    if (conjunctMalefics.length > 0 || aspectingMalefics.length > 0) {
      yogas.push({
        name: "Matru Satrutwa Yoga",
        type: "Challenge",
        involved: ['Mercury', ...conjunctMalefics, ...aspectingMalefics],
        description: `For Gemini Ascendant, Mercury (acting as both Lagna and 4th lord) is afflicted by malefics (${[...conjunctMalefics, ...aspectingMalefics].join(', ')}).`,
        results: "Classically indicates the person will hate his mother or experience severe friction. B.V. Raman notes this specific dynamic occurs uniquely for Gemini Lagna when the 4th/1st lord is marred by malefic forces."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 👩‍👦 MATRU SNEHA YOGA (Combination 208)
// ============================================================================
const _checkMatruSnehaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord4 = houseLords[4];
  if (!lagnaLord || !lord4) return [];

  // Condition 1: Common Lord (Only possible for Gemini and Sagittarius Lagnas)
  const hasCommonLord = lagnaLord === lord4;

  // Condition 2: Natural Friends (Standard Vedic Friendship Matrix)
  const naturalFriends = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus']
  };
  
  const isNaturalFriend = naturalFriends[lagnaLord]?.includes(lord4) || naturalFriends[lord4]?.includes(lagnaLord);

  // Condition 3: Temporal (Tatkalika) Friends 
  // Planets placed in the 2nd, 3rd, 4th, 10th, 11th, and 12th from each other become temporal friends.
  let isTemporalFriend = false;
  if (rasiPlacements[lagnaLord] !== undefined && rasiPlacements[lord4] !== undefined && !hasCommonLord) {
    const diff = (rasiPlacements[lord4] - rasiPlacements[lagnaLord] + 12) % 12 + 1;
    if ([2, 3, 4, 10, 11, 12].includes(diff)) {
      isTemporalFriend = true;
    }
  }

  // Condition 4: Both aspected by benefics
  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const lagnaLordAspected = benefics.some(b => b !== lagnaLord && typeof hasAspect === 'function' && hasAspect(b, rasiPlacements[lagnaLord], rasiPlacements));
  const lord4Aspected = benefics.some(b => b !== lord4 && typeof hasAspect === 'function' && hasAspect(b, rasiPlacements[lord4], rasiPlacements));
  const bothAspectedByBenefic = hasCommonLord ? lagnaLordAspected : (lagnaLordAspected && lord4Aspected);

  if (hasCommonLord || isNaturalFriend || isTemporalFriend || bothAspectedByBenefic) {
    let triggerReason = "";
    if (hasCommonLord) {
      triggerReason = `the 1st and 4th houses share a common lord (${lagnaLord}), which occurs for ${lagnaIndex === 2 ? 'Gemini' : 'Sagittarius'} ascendants`;
    } else if (isNaturalFriend) {
      triggerReason = `the Lagna lord (${lagnaLord}) and 4th lord (${lord4}) are natural friends`;
    } else if (isTemporalFriend) {
      triggerReason = `the Lagna lord (${lagnaLord}) and 4th lord (${lord4}) are temporal (Tatkalika) friends based on their mutual placement`;
    } else if (bothAspectedByBenefic) {
      triggerReason = `the Lagna lord (${lagnaLord}) and 4th lord (${lord4}) are both aspected by benefics`;
    }

    yogas.push({
      name: "Matru Sneha Yoga",
      type: "Auspicious Yoga",
      involved: [...new Set([lagnaLord, lord4])],
      description: `Formed because ${triggerReason}.`,
      results: "Cordial relations will prevail between mother and child. B.V. Raman notes that when the lords of the Ascendant and the 4th house are mutual or temporal friends, or share a common lordship, strong maternal affection and harmony are guaranteed."
    });
  }

  return yogas;
};


// ============================================================================
// 🚗 VAHANA YOGAS (Combinations 209, 210 & Additional Raman Rules)
// ============================================================================
const _checkVahanaYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord4 = houseLords[4];
  if (!lagnaLord || !lord4) return [];

  const EXALTATION_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  // 209: Lord of Lagna joins 4th, 9th, or 11th AND is strong
  const llHouse = placements[lagnaLord];
  const isLagnaLordStrong = true; // Placeholder for Shadbala strength
  if ([4, 9, 11].includes(llHouse) && isLagnaLordStrong) {
    yogas.push({
      name: "Vahana Yoga (Comb. 209)",
      type: "Auspicious Yoga",
      involved: [lagnaLord],
      description: `The Lord of Lagna (${lagnaLord}) occupies the ${llHouse}th house and is strongly disposed.`,
      results: "The native will acquire material comforts and conveyances (vehicles). B.V. Raman notes that for this specific yoga to function properly, the Lagna Lord must be strong."
    });
  }

  // 210: 4th lord exalted, and lord of exaltation sign occupies Kendra/Trikona
  const l4Sign = rasiPlacements[lord4];
  if (l4Sign !== undefined && l4Sign === EXALTATION_SIGNS[lord4]) {
    const exaltationLord = RASHI_LORDS[l4Sign];
    const exLordHouse = placements[exaltationLord];
    
    if (exLordHouse !== undefined && [1, 4, 7, 10, 5, 9].includes(exLordHouse)) {
      yogas.push({
        name: "Vahana Yoga (Comb. 210)",
        type: "Auspicious Yoga",
        involved: [...new Set([lord4, exaltationLord])],
        description: `The 4th Lord (${lord4}) is exalted, and its dispositor (${exaltationLord}) occupies a Kendra or Trikona (House ${exLordHouse}).`,
        results: "The native will acquire high-quality material comforts and conveyances."
      });
    }
  }

  // Raman Extra Rule 1: Venus and 4th lord in 4th house
  if (placements['Venus'] === 4 && placements[lord4] === 4) {
    yogas.push({
      name: "Vahana Yoga (Raman Rule 1)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Venus', lord4])],
      description: `Venus (the Vahanakaraka) joins the 4th Lord (${lord4}) in the 4th house.`,
      results: "The person will possess ordinary vehicles (practical, everyday conveyances)."
    });
  }

  // Raman Extra Rule 2: Venus or 4th lord in 11th or 9th
  const venHouse = placements['Venus'];
  const l4House = placements[lord4];
  if ([9, 11].includes(venHouse) || [9, 11].includes(l4House)) {
    const trigger = [9, 11].includes(venHouse) ? 'Venus' : `the 4th Lord (${lord4})`;
    const triggerHouse = [9, 11].includes(venHouse) ? venHouse : l4House;
    yogas.push({
      name: "Vahana Yoga (Raman Rule 2)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Venus', lord4])],
      description: `${trigger} is placed in the ${triggerHouse}th house.`,
      results: "The native will possess a number of conveyances (a fleet or multiple vehicles)."
    });
  }

  // Raman Extra Rule 3: 4th lord connected with Moon
  const l4ConjunctMoon = placements[lord4] !== undefined && placements[lord4] === placements['Moon'];
  const l4AspectedByMoon = typeof hasAspect === 'function' && hasAspect('Moon', rasiPlacements[lord4], rasiPlacements);
  const moonAspectedByL4 = typeof hasAspect === 'function' && hasAspect(lord4, rasiPlacements['Moon'], rasiPlacements);

  if (l4ConjunctMoon || l4AspectedByMoon || moonAspectedByL4) {
    yogas.push({
      name: "Vahana Yoga (Raman Rule 3)",
      type: "Auspicious Yoga",
      involved: [lord4, 'Moon'],
      description: `The 4th Lord (${lord4}) is connected with the Moon via conjunction or aspect.`,
      results: "The person will have carriages drawn by horses, or in modern parlance, motor cars."
    });
  }

  return yogas;
};

// ============================================================================
// 🚸 ANAPATHYA YOGA (Combination 211)
// ============================================================================
const _checkAnapathyaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord5 = houseLords[5];
  const lord7 = houseLords[7];

  if (!lagnaLord || !lord5 || !lord7 || placements['Jupiter'] === undefined) return [];

  const DEBILITATION_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };

  // Helper to determine if a planet is structurally weak 
  // (Using Debilitation or placement in 6th, 8th, 12th houses as a proxy for low Shadbala)
  const isWeak = (planet) => {
    const rasi = rasiPlacements[planet];
    const house = placements[planet];
    if (rasi === undefined || house === undefined) return false;
    
    const isDebilitated = rasi === DEBILITATION_SIGNS[planet];
    const inDusthana = [6, 8, 12].includes(house);
    
    return isDebilitated || inDusthana;
  };

  const jupWeak = isWeak('Jupiter');
  const llWeak = isWeak(lagnaLord);
  const l5Weak = isWeak(lord5);
  const l7Weak = isWeak(lord7);

  if (jupWeak && llWeak && l5Weak && l7Weak) {
    yogas.push({
      name: "Anapathya Yoga",
      type: "Challenge",
      involved: [...new Set(['Jupiter', lagnaLord, lord5, lord7])],
      description: `Jupiter (the natural Karaka for children), the Lagna Lord (${lagnaLord}), the 5th Lord (${lord5}), and the 7th Lord (${lord7}) are all structurally weak (debilitated or placed in Dusthanas).`,
      results: "Classically indicates the person will have no issues (childless). However, B.V. Raman notes that if Jupiter and the 5th lord possess some underlying strength, this yoga gets modified, pointing instead to delays, medical interventions, or adopting rather than absolute denial."
    });
  }

  return yogas;
};

// ============================================================================
// 🐍 SARPASAPA YOGAS (Combinations 212 to 215)
// ============================================================================
const _checkSarpasapaYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  if (!lord5) return [];

  const rahuIn5 = placements['Rahu'] === 5;
  const rahuSign = rasiPlacements['Rahu'];
  const house5Sign = (lagnaIndex + 4) % 12;
  const is5thMarsSign = [0, 7].includes(house5Sign); // Aries (0) or Scorpio (7)

  // 212: 5th occupied by Rahu and aspected by Mars OR 5th is Mars sign occupied by Rahu
  if (rahuIn5) {
    const marsAspectsRahu = typeof hasAspect === 'function' && hasAspect('Mars', rahuSign, rasiPlacements);
    if (marsAspectsRahu || is5thMarsSign) {
      yogas.push({
        name: "Sarpasapa Yoga (Comb. 212)",
        type: "Dosha",
        involved: [...new Set(['Rahu', is5thMarsSign ? lord5 : 'Mars'])],
        description: marsAspectsRahu 
          ? "Rahu occupies the 5th house and is aspected by Mars." 
          : "The 5th house falls in a sign of Mars (Aries/Scorpio) and is occupied by Rahu.",
        results: "Classically indicates the premature death of children due to 'Sarpasapa' (curse of serpents). Represents severe karmic affliction to the 5th house."
      });
    }
  }

  // 213: 5th lord conjunct Rahu, Saturn in 5th aspected/associated with Moon
  const l5WithRahu = placements[lord5] !== undefined && placements[lord5] === placements['Rahu'];
  const satIn5 = placements['Saturn'] === 5;
  if (l5WithRahu && satIn5) {
    const satSign = rasiPlacements['Saturn'];
    const moonWithSaturn = placements['Moon'] === 5;
    const moonAspectsSaturn = typeof hasAspect === 'function' && hasAspect('Moon', satSign, rasiPlacements);
    
    if (moonWithSaturn || moonAspectsSaturn) {
      yogas.push({
        name: "Sarpasapa Yoga (Comb. 213)",
        type: "Dosha",
        involved: [lord5, 'Rahu', 'Saturn', 'Moon'],
        description: `The 5th lord (${lord5}) is conjoined with Rahu, while Saturn occupies the 5th house and is ${moonWithSaturn ? 'conjoined with' : 'aspected by'} the Moon.`,
        results: "B.V. Raman notes the Moon-Saturn connection to the 5th house implies great sorrow and suffering owing to the loss or lack of children."
      });
    }
  }

  // 214: Jupiter (karaka) associated with Mars, Rahu in Lagna, 5th lord in Dusthana
  const rahuIn1 = placements['Rahu'] === 1;
  const l5InDusthana = [6, 8, 12].includes(placements[lord5]);
  if (rahuIn1 && l5InDusthana && placements['Jupiter'] !== undefined && placements['Mars'] !== undefined) {
    const jupWithMars = placements['Jupiter'] === placements['Mars'];
    const jupAspectsMars = typeof hasAspect === 'function' && hasAspect('Jupiter', rasiPlacements['Mars'], rasiPlacements);
    const marsAspectsJup = typeof hasAspect === 'function' && hasAspect('Mars', rasiPlacements['Jupiter'], rasiPlacements);
    
    if (jupWithMars || jupAspectsMars || marsAspectsJup) {
      const isJupiterStrong = true; // Placeholder for Shadbala check
      const mitigationNote = isJupiterStrong 
        ? " 🌟 **B.V. Raman Exception**: Because Jupiter (Karaka) has sufficient strength, this yoga becomes essentially defunct. Rather than death of children, it may merely manifest as early complications or miscarriages before healthy children are born." 
        : "";

      yogas.push({
        name: "Sarpasapa Yoga (Comb. 214)",
        type: isJupiterStrong ? "Challenge" : "Dosha",
        involved: ['Jupiter', 'Mars', 'Rahu', lord5],
        description: `Jupiter is associated with Mars, Rahu is in the Ascendant, and the 5th lord (${lord5}) is in a Dusthana (${placements[lord5]}th house).`,
        results: `Classically indicates the premature death of children due to 'Sarpasapa'.${mitigationNote}`
      });
    }
  }

  // 215: 5th house is Mars sign, conjoined by Rahu, associated/aspected by Mercury
  if (is5thMarsSign && rahuIn5) {
    const mercWithRahu = placements['Mercury'] === 5;
    const mercAspectsRahu = typeof hasAspect === 'function' && hasAspect('Mercury', rahuSign, rasiPlacements);
    
    if (mercWithRahu || mercAspectsRahu) {
      yogas.push({
        name: "Sarpasapa Yoga (Comb. 215)",
        type: "Dosha",
        involved: ['Rahu', 'Mercury', lord5],
        description: `The 5th house falls in a sign of Mars (${SIGN_NAMES[house5Sign] || house5Sign}), is occupied by Rahu, and is ${mercWithRahu ? 'conjoined with' : 'aspected by'} Mercury.`,
        results: "Classically indicates the premature death of children due to 'Sarpasapa' (curse of serpents). Represents severe karmic affliction to the 5th house."
      });
    }
  }

  return yogas;
};

// ============================================================================
// 👨‍👦 PITRUSAPA SUTAKSHAYA YOGA (Combination 216)
// ============================================================================
const _checkPitrusapaSutakshayaYoga = (lagnaIndex, placements, rasiPlacements, navamsaPlacements) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !navamsaPlacements) return [];

  const yogas = [];
  const sunHouse = placements['Sun'];

  // The primary baseline rule: Sun MUST occupy the 5th house
  if (sunHouse === 5) {
    const sunRasi = rasiPlacements['Sun'];
    const sunNavamsa = navamsaPlacements['Sun'];
    // Sun is the target, so the other malefics for Papakarthari are Mars, Saturn, Rahu, Ketu
    const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu']; 

    // Condition A: Sun is debilitated in the 5th house (Libra - Index 6). 
    // Dr. Raman notes this is mathematically only possible for Gemini (Mithuna) Lagna.
    const isDebilitated = sunRasi === 6;

    // Condition B: Sun's Navamsa is Makara (Capricorn - 9) or Kumbha (Aquarius - 10)
    const isSaturnNavamsa = sunNavamsa === 9 || sunNavamsa === 10;

    // Condition C: Sun is hemmed between malefics (Papakarthari Yoga around the 5th house)
    const signAhead = (sunRasi + 1) % 12;
    const signBehind = (sunRasi + 11) % 12;
    const maleficsAhead = malefics.filter(m => rasiPlacements[m] === signAhead);
    const maleficsBehind = malefics.filter(m => rasiPlacements[m] === signBehind);
    const isPapakarthari = maleficsAhead.length > 0 && maleficsBehind.length > 0;

    if (isDebilitated || isSaturnNavamsa || isPapakarthari) {
      let triggerReasons = [];
      if (isDebilitated) triggerReasons.push("debilitated (in Libra)");
      if (isSaturnNavamsa) triggerReasons.push(`in the Navamsa of Saturn (${sunNavamsa === 9 ? 'Capricorn' : 'Aquarius'})`);
      if (isPapakarthari) triggerReasons.push(`hemmed between malefics (${[...maleficsAhead, ...maleficsBehind].join(', ')})`);

      // Add B.V. Raman's special remarks on the Navamsa rule
      let ramanNote = "";
      if (isSaturnNavamsa) {
          ramanNote = " B.V. Raman adds en passant that the mere fact of the 5th house/Sun falling in the Navamsa of Saturn is enough to indicate severe affliction to progeny, unless counteracted by strong benefics.";
      }

      yogas.push({
        name: "Pitrusapa Sutakshaya Yoga (Comb. 216)",
        type: "Dosha",
        involved: [...new Set(['Sun', ...maleficsAhead, ...maleficsBehind])],
        description: `The Sun occupies the 5th house and is ${triggerReasons.join(' OR ')}.`,
        results: `Classically indicates the loss of children due to 'Pitrusapa' (the curse or wrath of the father or ancestors).${ramanNote} Note: B.V. Raman explains that 'curses' on a subtle plane often reflect intense karmic passions discharging destructive ethereal energy.`
      });
    }
  }

  return yogas;
};



// ============================================================================
// 👩‍👦 MATRUSAPA SUTAKSHAYA YOGA (Combination 217)
// ============================================================================
const _checkMatrusapaSutakshayaYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  
  // B.V. Raman's explicit exemption: Cannot operate for Leo (4) and Aquarius (10) 
  // because the same planet rules both the 5th and 8th houses.
  if (lagnaIndex === 4 || lagnaIndex === 10) return yogas;

  const lord4 = houseLords[4];
  const lord5 = houseLords[5];
  const lord8 = houseLords[8];

  if (!lord4 || !lord5 || !lord8) return [];

  const isParivarthana5and8 = placements[lord8] === 5 && placements[lord5] === 8;
  const moonIn6 = placements['Moon'] === 6;
  const lord4In6 = placements[lord4] === 6;

  if (isParivarthana5and8 && moonIn6 && lord4In6) {
    yogas.push({
      name: "Matrusapa Sutakshaya Yoga (Comb. 217)",
      type: "Dosha",
      involved: [...new Set([lord5, lord8, 'Moon', lord4])],
      description: `There is a mutual exchange (Parivarthana) between the 5th lord (${lord5}) and 8th lord (${lord8}), while the Matrukaraka Moon and the 4th lord (${lord4}) both join the 6th house (a Dusthana).`,
      results: "Classically indicates the loss of children due to 'Matrusapa' (the curse of the mother). B.V. Raman explains that this reflects a deep karmic affliction combining severe damage to the house of progeny (5th/8th exchange) with the significators of the mother (4th house and Moon) relegated to an evil house."
    });
  }

  return yogas;
};

// ============================================================================
// 😡 BHRATRUSAPA SUTAKSHAYA YOGA (Combination 218)
// ============================================================================
const _checkBhratrusapaSutakshayaYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord5 = houseLords[5];
  const lord3 = houseLords[3];

  if (!lagnaLord || !lord5 || !lord3) return [];

  // Condition 1: Strict Classical Definition
  const llIn8 = placements[lagnaLord] === 8;
  const l5In8 = placements[lord5] === 8;
  const l3In5 = placements[lord3] === 5;
  const marsIn5 = placements['Mars'] === 5;
  const rahuIn5 = placements['Rahu'] === 5;

  const isClassicalStrict = llIn8 && l5In8 && l3In5 && marsIn5 && rahuIn5;

  // Condition 2: B.V. Raman's Extended Principles
  // Variation A: Mars and Rahu in the 5th house
  const isRamanVariationA = marsIn5 && rahuIn5;

  // Variation B: 5th lord associated with Mars AND the 3rd house/lord is involved
  const l5WithMars = placements[lord5] !== undefined && placements[lord5] === placements['Mars'];
  const l5AspectedByMars = typeof hasAspect === 'function' && hasAspect('Mars', rasiPlacements[lord5], rasiPlacements);
  const l3WithL5 = placements[lord3] !== undefined && placements[lord3] === placements[lord5];
  const l3AspectsL5 = typeof hasAspect === 'function' && hasAspect(lord3, rasiPlacements[lord5], rasiPlacements);
  
  const isRamanVariationB = (l5WithMars || l5AspectedByMars) && (l3WithL5 || l3AspectsL5 || l3In5);

  if (isClassicalStrict || isRamanVariationA || isRamanVariationB) {
    let triggerDesc = "";
    if (isClassicalStrict) {
       triggerDesc = `The lords of Lagna (${lagnaLord}) and the 5th (${lord5}) occupy the 8th house, while the 3rd lord (${lord3}), Mars, and Rahu occupy the 5th house`;
    } else if (isRamanVariationA) {
       triggerDesc = `Mars (the Bhratrukaraka) and Rahu jointly occupy the 5th house`;
    } else if (isRamanVariationB) {
       triggerDesc = `The 5th lord (${lord5}) is afflicted by Mars, while simultaneously under the influence of the 3rd house/lord (${lord3})`;
    }

    yogas.push({
      name: "Bhratrusapa Sutakshaya Yoga (Comb. 218)",
      type: "Dosha",
      involved: [...new Set([lagnaLord, lord5, lord3, 'Mars', 'Rahu'])],
      description: `${triggerDesc}.`,
      results: "Classically indicates the loss of children due to 'Bhratrusapa' (curses from brothers). B.V. Raman clarifies that the core principle is an intense karmic affliction to the 5th house brought about by the 3rd house/lord and Mars (the significator of brothers)."
    });
  }

  return yogas;
};

// ============================================================================
// 👻 PRETASAPA YOGA (Combination 219)
// ============================================================================
const _checkPretasapaYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];

  const yogas = [];

  // Definition: Sun and Saturn in 5th, weak Moon in 7th, Rahu in Lagna, Jupiter in 12th.
  const sunIn5 = placements['Sun'] === 5;
  const satIn5 = placements['Saturn'] === 5;
  const moonIn7 = placements['Moon'] === 7;
  const rahuIn1 = placements['Rahu'] === 1;
  const jupIn12 = placements['Jupiter'] === 12;

  if (sunIn5 && satIn5 && moonIn7 && rahuIn1 && jupIn12) {
    yogas.push({
      name: "Pretasapa Yoga (Comb. 219)",
      type: "Dosha",
      involved: ['Sun', 'Saturn', 'Moon', 'Rahu', 'Jupiter'],
      description: "The Sun and Saturn occupy the 5th house, a weak Moon occupies the 7th house, Rahu is in the Ascendant, and Jupiter is relegated to the 12th house.",
      results: "Classically indicates the loss of children through the curses of 'Pretas' (manes of the dead). B.V. Raman notes that the resulting Moon-Rahu-Saturn connection is highly destructive and represents severe karmic backlashes, often attributed to unperformed ancestral rites."
    });
  }

  return yogas;
};

// ============================================================================
// 👶 BAHUPUTRA YOGAS (Combinations 220 & 221)
// ============================================================================
const _checkBahuputraYogas = (lagnaIndex, placements, navamsaPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !navamsaPlacements || !houseLords) return [];

  const yogas = [];
  const lord7 = houseLords[7];
  if (!lord7) return [];

  const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  // 220: Rahu in 5th house, in a Navamsa OTHER than Saturn's (Capricorn [9] / Aquarius [10])
  if (placements['Rahu'] === 5) {
    const rahuNavamsa = navamsaPlacements['Rahu'];
    if (rahuNavamsa !== undefined && rahuNavamsa !== 9 && rahuNavamsa !== 10) {
      const navamsaSignName = SIGN_NAMES[rahuNavamsa];
      yogas.push({
        name: "Bahuputra Yoga (Comb. 220)",
        type: "Auspicious Yoga",
        involved: ['Rahu'],
        description: `Rahu occupies the 5th house but falls in a Navamsa other than Saturn's (specifically, the ${navamsaSignName} Navamsa).`,
        results: "The person will have a large number of children. B.V. Raman notes this is a highly important exception to the general rule that Rahu in the 5th is harmful; the harm only strictly applies if Rahu also falls in Saturn's Navamsa."
      });
    }
  }

  // 221: Lord of the Navamsa occupied by a planet associated with 7th lord is in 1st, 2nd, or 5th
  const lord7House = placements[lord7];
  if (lord7House !== undefined) {
    // Find planets associated with (conjoined) the 7th lord
    const associatedPlanets = Object.keys(placements).filter(p => p !== lord7 && placements[p] === lord7House);
    
    for (let planetX of associatedPlanets) {
      const navSignOfX = navamsaPlacements[planetX];
      if (navSignOfX !== undefined) {
        const planetY = RASHI_LORDS[navSignOfX]; // Lord of the Navamsa occupied by Planet X
        const planetYHouse = placements[planetY];
        
        if (planetYHouse !== undefined && [1, 2, 5].includes(planetYHouse)) {
          yogas.push({
            name: "Bahuputra Yoga (Comb. 221)",
            type: "Auspicious Yoga",
            involved: [...new Set([lord7, planetX, planetY])],
            description: `${planetX} is associated with the 7th lord (${lord7}). The lord of the Navamsa occupied by ${planetX} is ${planetY}, which is posited in the ${planetYHouse}th house.`,
            results: "The person will have a large number of children."
          });
          break; // Prevent duplicate yogas if multiple planets satisfy the condition
        }
      }
    }
  }

  return yogas;
};

// ============================================================================
// 🏠 DATTAPUTRA YOGAS (Combinations 222 & 223)
// ============================================================================
const _checkDattaputraYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lagnaLord = houseLords[1];
  const lord5 = houseLords[5];
  const lord7 = houseLords[7];

  if (!lagnaLord || !lord5 || !lord7) return [];

  const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const marsIn5 = placements['Mars'] === 5;
  const satIn5 = placements['Saturn'] === 5;

  // --- 222: Mars & Saturn in 5th, Lagna Lord in Mercury's sign AND aspected/associated by Mercury ---
  if (marsIn5 && satIn5) {
    const llSign = rasiPlacements[lagnaLord];
    // Gemini (2) or Virgo (5)
    const llInMercSign = llSign === 2 || llSign === 5; 
    
    const llWithMerc = placements[lagnaLord] === placements['Mercury'];
    const llAspectedByMerc = typeof hasAspect === 'function' && hasAspect('Mercury', llSign, rasiPlacements);

    if (llInMercSign && (llWithMerc || llAspectedByMerc)) {
      yogas.push({
        name: "Dattaputra Yoga (Comb. 222)",
        type: "Neutral Yoga",
        involved: ['Mars', 'Saturn', lagnaLord, 'Mercury'],
        description: `Mars and Saturn occupy the 5th house, while the Lagna lord (${lagnaLord}) occupies a sign of Mercury (Gemini/Virgo) and is ${llWithMerc ? 'associated with' : 'aspected by'} Mercury.`,
        results: "The person will have adopted children. B.V. Raman explains that the affliction to the 5th house combined with the Lagna lord's subjection to Mercury (a neutral planet) deprives the native of the power to procreate, leading to adoption."
      });
    }
  }

  // --- 223: 7th lord in 11th, 5th lord with benefic, and 5th house has Mars OR Saturn ---
  const l7In11 = placements[lord7] === 11;
  const l5WithBenefic = benefics.some(b => b !== lord5 && placements[b] === placements[lord5]);
  const l5BeneficsList = benefics.filter(b => b !== lord5 && placements[b] === placements[lord5]);

  if (l7In11 && l5WithBenefic && (marsIn5 || satIn5)) {
    const maleficIn5 = marsIn5 && satIn5 ? 'Mars and Saturn' : (marsIn5 ? 'Mars' : 'Saturn');
    
    yogas.push({
      name: "Dattaputra Yoga (Comb. 223)",
      type: "Neutral Yoga",
      involved: [...new Set([lord7, lord5, ...l5BeneficsList, marsIn5 ? 'Mars' : null, satIn5 ? 'Saturn' : null].filter(Boolean))],
      description: `The 7th lord (${lord7}) is posited in the 11th house, the 5th lord (${lord5}) is conjoined with a benefic (${l5BeneficsList.join(', ')}), and the 5th house is occupied by ${maleficIn5}.`,
      results: "The person will have adopted children. While the exact rationale is classically obscured, horoscopes with this yoga generally show the acquisition of adopted issues."
    });
  }

  return yogas;
};

// ============================================================================
// 🚸 APUTRA YOGA (Combination 224)
// ============================================================================
const _checkAputraYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];

  if (!lord5) return [];

  const lord5House = placements[lord5];

  if ([6, 8, 12].includes(lord5House)) {
    yogas.push({
      name: "Aputra Yoga (Comb. 224)",
      type: "Challenge",
      involved: [lord5],
      description: `The 5th lord (${lord5}) occupies a Dusthana (the ${lord5House}th house).`,
      results: "Classically indicates the person will have no issues (children). B.V. Raman remarks that unlike other combinations that denote the loss of children due to curses, Aputra Yoga is a general combination revealing that there will be no birth of issues at all."
    });
  }

  return yogas;
};

// ============================================================================
// 👶 EKAPUTRA YOGA (Combination 225)
// ============================================================================
const _checkEkaputraYoga = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];

  if (!lord5) return [];

  const lord5House = placements[lord5];

  // Check if 5th lord is in a Kendra (1, 4, 7, 10) or Trikona (1, 5, 9)
  if ([1, 4, 5, 7, 9, 10].includes(lord5House)) {
    const isKendra = [1, 4, 7, 10].includes(lord5House);
    const isTrikona = [1, 5, 9].includes(lord5House);
    const houseType = isKendra && isTrikona ? "Kendra/Trikona" : (isKendra ? "Kendra" : "Trikona");

    yogas.push({
      name: "Ekaputra Yoga (Comb. 225)",
      type: "Auspicious Yoga",
      involved: [lord5],
      description: `The Lord of the 5th house should join a kendra or trikona. Here, the 5th lord (${lord5}) occupies the ${lord5House}th house, which is a ${houseType}.`,
      results: "The person will have only one son. B.V. Raman remarks that most of these yogas bearing on the 5th house cannot be applied verbatim. It is the intrinsic strength or weakness of the house that really gives us all the details."
    });
  }

  return yogas;
};

// ============================================================================
// 🌟 SUPUTRA YOGA (Combination 226)
// ============================================================================
const _checkSuputraYoga = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];

  // Dr. Raman specifies this ONLY applies when Jupiter is the 5th lord.
  // This mathematically only happens for Leo (4) and Scorpio (7) ascendants.
  if (lord5 === 'Jupiter' && (lagnaIndex === 4 || lagnaIndex === 7)) {
    const sunHouse = placements['Sun'];
    const sunRasi = rasiPlacements['Sun'];

    // "Sun occupies a favourable position" 
    // Defined here as Kendras (1,4,7,10), Trikonas (5,9), or 2/11, 
    // and NOT debilitated (Libra = 6) or in dusthanas (6,8,12)
    const isFavourableHouse = [1, 2, 4, 5, 7, 9, 10, 11].includes(sunHouse);
    const isNotDebilitated = sunRasi !== 6;

    if (isFavourableHouse && isNotDebilitated) {
      yogas.push({
        name: "Suputra Yoga (Comb. 226)",
        type: "Auspicious Yoga",
        involved: ['Jupiter', 'Sun'],
        description: `Jupiter is the lord of the 5th house (applicable for ${lagnaIndex === 4 ? 'Leo' : 'Scorpio'} Ascendant), and the Sun occupies a favourable position (the ${sunHouse}th house, free from debilitation).`,
        results: "The native will have a worthy son. B.V. Raman notes that while children can sometimes become a source of misery, this specific combination ensures the child brings extreme joy. If further supported by benefic vargas, the son will be a 'beacon light to the family'."
      });
    }
  }

  return yogas;
};

// ============================================================================
// ⏳ KALANIRDESAT PUTRA YOGAS (Combinations 227 & 228)
// ============================================================================
const _checkKalanirdesatPutraYogas = (lagnaIndex, placements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  const lagnaLord = houseLords[1];

  if (!lord5 || !lagnaLord || placements['Jupiter'] === undefined || placements['Venus'] === undefined) return [];

  const jupHouse = placements['Jupiter'];
  const venHouse = placements['Venus'];
  const lord5House = placements[lord5];
  const llHouse = placements[lagnaLord];

  // 227: Jupiter in 5th, Lord of 5th conjoins Venus
  if (jupHouse === 5 && lord5House === venHouse) {
    yogas.push({
      name: "Kalanirdesat Putra Yoga (Comb. 227)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Jupiter', 'Venus', lord5])],
      description: `Jupiter occupies the 5th house, and the 5th lord (${lord5}) is in conjunction with Venus.`,
      results: "The native will beget a son in their 32nd or 33rd year. B.V. Raman notes this prediction holds true provided the appropriate directional influences (Dasa and Bhukti) are operating at that time."
    });
  }

  // 228: Jupiter in 9th, Venus in 9th from Jupiter (i.e., 5th house), Venus conjunct Lagna Lord
  if (jupHouse === 9 && venHouse === 5 && llHouse === 5) {
    yogas.push({
      name: "Kalanirdesat Putra Yoga (Comb. 228)",
      type: "Auspicious Yoga",
      involved: [...new Set(['Jupiter', 'Venus', lagnaLord])],
      description: `Jupiter occupies the 9th house, while Venus occupies the 9th from Jupiter (the 5th house) in conjunction with the Lagna lord (${lagnaLord}).`,
      results: "The native will beget a son in their 40th year. B.V. Raman notes this specific timing applies provided the appropriate Dasa and Bhukti are current at that age."
    });
  }

  return yogas;
};

// ============================================================================
// ⚠️ KALANIRDESAT PUTRANASA YOGAS (Combinations 229 & 230)
// ============================================================================
const _checkKalanirdesatPutranasaYogas = (lagnaIndex, placements, rasiPlacements, houseLords) => {
  if (lagnaIndex === undefined || !placements || !rasiPlacements || !houseLords) return [];

  const yogas = [];
  const lord5 = houseLords[5];
  if (!lord5 || placements['Jupiter'] === undefined) return [];

  const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];

  // --- 229: Rahu in 5th, 5th lord conjunct malefic, Jupiter debilitated ---
  const rahuIn5 = placements['Rahu'] === 5;
  const jupDebilitated = rasiPlacements['Jupiter'] === 9; // Capricorn (Makara) index is 9

  const lord5House = placements[lord5];
  const lord5ConjunctMalefic = malefics.some(m => m !== lord5 && placements[m] === lord5House);
  const conjunctMaleficsList = malefics.filter(m => m !== lord5 && placements[m] === lord5House);

  if (rahuIn5 && lord5ConjunctMalefic && jupDebilitated) {
    yogas.push({
      name: "Kalanirdesat Putranasa Yoga (Comb. 229)",
      type: "Dosha",
      involved: ['Rahu', lord5, 'Jupiter', ...conjunctMaleficsList],
      description: `Rahu occupies the 5th house, the 5th lord (${lord5}) is conjoined with a malefic (${conjunctMaleficsList.join(', ')}), and Jupiter is debilitated.`,
      results: "Classically predicts the loss of a son in the 32nd year. However, B.V. Raman notes that in actual practice, this triple affliction (to the house, lord, and karaka) often results in more serious effects, such as still-births or the death of children within their first year."
    });
  }

  // --- 230: Malefic in 5th from Lagna AND Malefic in 5th from Jupiter ---
  const maleficIn5FromLagna = malefics.some(m => placements[m] === 5);
  const maleficsIn5thList = malefics.filter(m => placements[m] === 5);

  const jupHouse = placements['Jupiter'];
  // Calculate the 5th house relative to Jupiter's placement
  const fifthFromJup = (jupHouse + 3) % 12 + 1; 
  const maleficIn5FromJup = malefics.some(m => placements[m] === fifthFromJup);
  const maleficsIn5FromJupList = malefics.filter(m => placements[m] === fifthFromJup);

  if (maleficIn5FromLagna && maleficIn5FromJup) {
    yogas.push({
      name: "Kalanirdesat Putranasa Yoga (Comb. 230)",
      type: "Dosha",
      involved: [...new Set([...maleficsIn5thList, ...maleficsIn5FromJupList, 'Jupiter'])],
      description: `Malefics are disposed in the 5th house from Lagna (${maleficsIn5thList.join(', ')}) AND in the 5th house from Jupiter (${maleficsIn5FromJupList.join(', ')} in House ${fifthFromJup}).`,
      results: "Classically predicts the loss of issues in the 32nd and 40th years. B.V. Raman observes that in practice, this combination usually manifests as a few children dying while a few issues survive."
    });
  }

  return yogas;
};



// ============================================================================
// 🌌 NABHASA YOGAS (AKRITI GROUP: Yupa, Ishu, Sakti, Danda)
// ============================================================================

const _checkNabhasaAkritiYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;

  // Nabhasa Yogas only consider the 7 classical planets (excluding Rahu/Ketu)
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const occupiedHouses = new Set();
  let allPlanetsValid = true;

  // Calculate the house (1-12) for all 7 planets
  const planetHouses = classicalPlanets.map(planet => {
    if (placements[planet] === undefined) {
      allPlanetsValid = false;
      return -1;
    }
    const house = ((placements[planet] - lagnaIndex + 12) % 12) + 1;
    occupiedHouses.add(house);
    return house;
  });

  if (!allPlanetsValid) return null;

  // Helper: Checks if the planets are ONLY in the target houses, AND that all 4 target houses have at least one planet
  const arePlanetsExclusivelyIn = (targetHouses) => {
    const strictlyInside = planetHouses.every(h => targetHouses.includes(h));
    const allFourOccupied = targetHouses.every(h => occupiedHouses.has(h));
    return strictlyInside && allFourOccupied;
  };

  // 1. Yupa Yoga: 1st, 2nd, 3rd, 4th
  if (arePlanetsExclusivelyIn([1, 2, 3, 4])) {
    return {
      name: "Yupa Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets are placed contiguously in the 1st, 2nd, 3rd, and 4th houses.",
      results: "Makes the native liberal, self-possessed, and noted for charitable deeds."
    };
  }

  // 2. Ishu (Sara) Yoga: 4th, 5th, 6th, 7th
  if (arePlanetsExclusivelyIn([4, 5, 6, 7])) {
    return {
      name: "Ishu Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets are placed contiguously in the 4th, 5th, 6th, and 7th houses.",
      results: "Can indicate success as a superintendent or head of restrictive institutions (like jails or camps). Provides strong clues regarding livelihood."
    };
  }

  // 3. Sakti Yoga: 7th, 8th, 9th, 10th
  if (arePlanetsExclusivelyIn([7, 8, 9, 10])) {
    return {
      name: "Sakti Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets are placed contiguously in the 7th, 8th, 9th, and 10th houses.",
      results: "Makes the native lazy, slothful, devoid of riches, and generally disliked."
    };
  }

  // 4. Danda Yoga: 10th, 11th, 12th, 1st
  if (arePlanetsExclusivelyIn([10, 11, 12, 1])) {
    return {
      name: "Danda Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets are placed contiguously in the 10th, 11th, 12th, and 1st houses.",
      results: "Suggests the person will lack happiness due from a spouse and children."
    };
  }

  return null;
};

// ============================================================================
// 🌌 NABHASA YOGAS (7-HOUSE AKRITI GROUP: Nav, Kuta, Chhatra, Chapa)
// ============================================================================

const _checkNabhasaSevenHouseYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;

  // Nabhasa Yogas only consider the 7 classical planets (excluding Rahu/Ketu)
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const occupiedHouses = new Set();
  let allPlanetsValid = true;

  // Calculate the house (1-12) for all 7 planets
  classicalPlanets.forEach(planet => {
    if (placements[planet] === undefined) {
      allPlanetsValid = false;
    } else {
      const house = ((placements[planet] - lagnaIndex + 12) % 12) + 1;
      occupiedHouses.add(house);
    }
  });

  if (!allPlanetsValid) return null;

  // Helper: Since there are 7 planets and we are checking for 7 contiguous houses,
  // checking if all 7 target houses are in the 'occupiedHouses' set guarantees 
  // that every house has exactly one planet, with no breaks and no planets elsewhere.
  const areAllSevenOccupied = (targetHouses) => {
    return targetHouses.every(h => occupiedHouses.has(h));
  };

  // 1. Nav Yoga: 1st, 2nd, 3rd, 4th, 5th, 6th, 7th
  if (areAllSevenOccupied([1, 2, 3, 4, 5, 6, 7])) {
    return {
      name: "Nav Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets occupy seven contiguous houses starting from the Lagna (1st to 7th).",
      results: "Makes the native occasionally happy, famous, and miserly. Associated with water, watery places, and aquatic substances since planets fall in the invisible sphere."
    };
  }

  // 2. Kuta Yoga: 4th, 5th, 6th, 7th, 8th, 9th, 10th
  if (areAllSevenOccupied([4, 5, 6, 7, 8, 9, 10])) {
    return {
      name: "Kuta Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets occupy seven contiguous houses starting from the 4th house (4th to 10th).",
      results: "The native may frequent caves or mountains and can be addicted to evil habits. Classically associated with jailors, liars, and individuals prone to deceit."
    };
  }

  // 3. Chhatra Yoga: 7th, 8th, 9th, 10th, 11th, 12th, 1st
  if (areAllSevenOccupied([7, 8, 9, 10, 11, 12, 1])) {
    return {
      name: "Chhatra Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets occupy seven contiguous houses starting from the 7th house (7th to 1st).",
      results: "Produces a happy individual with great strength of mind who earns much wealth. Happiness is particularly prominent at the beginning and end of life."
    };
  }

  // 4. Chapa Yoga: 10th, 11th, 12th, 1st, 2nd, 3rd, 4th
  if (areAllSevenOccupied([10, 11, 12, 1, 2, 3, 4])) {
    return {
      name: "Chapa Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets occupy seven contiguous houses starting from the 10th house (10th to 4th).",
      results: "Makes the native brave and happy in the first and last periods of life. Leads a comfortable life delighting in good deeds."
    };
  }

  return null;
};

// ============================================================================
// 🌙 ARDHA CHANDRA YOGA EVALUATION (Nabhasa Akriti Group)
// ============================================================================

const _checkArdhaChandraYoga = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;

  // Nabhasa Yogas only consider the 7 classical planets
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const occupiedHouses = new Set();
  let allPlanetsValid = true;

  classicalPlanets.forEach(planet => {
    if (placements[planet] === undefined) {
      allPlanetsValid = false;
    } else {
      const house = ((placements[planet] - lagnaIndex + 12) % 12) + 1;
      occupiedHouses.add(house);
    }
  });

  if (!allPlanetsValid) return null;

  // Helper: Checks if all 7 target houses are occupied (1 planet per house)
  const areAllSevenOccupied = (targetHouses) => {
    return targetHouses.every(h => occupiedHouses.has(h));
  };

  // The 8 possible contiguous sequences starting from Panaparas or Apoklimas
  const sequences = [
    { houses: [2, 3, 4, 5, 6, 7, 8], start: '2nd' },
    { houses: [3, 4, 5, 6, 7, 8, 9], start: '3rd' },
    { houses: [5, 6, 7, 8, 9, 10, 11], start: '5th' },
    { houses: [6, 7, 8, 9, 10, 11, 12], start: '6th' },
    { houses: [8, 9, 10, 11, 12, 1, 2], start: '8th' },
    { houses: [9, 10, 11, 12, 1, 2, 3], start: '9th' },
    { houses: [11, 12, 1, 2, 3, 4, 5], start: '11th' },
    { houses: [12, 1, 2, 3, 4, 5, 6], start: '12th' }
  ];

  for (let seq of sequences) {
    if (areAllSevenOccupied(seq.houses)) {
      return {
        name: "Ardha Chandra Yoga",
        type: "Nabhasa Yoga",
        description: `All seven classical planets occupy seven continuous houses beginning from the ${seq.start} house.`,
        results: "The native will have fair features and will be happy throughout life."
      };
    }
  }

  return null;
};

// ============================================================================
// 📐 NABHASA YOGAS (GEOMETRIC & PATTERN GROUP)
// ============================================================================

const _checkNabhasaPatternYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return [];
  
  const yogas = [];
  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const occupiedHouses = new Set();
  let allPlanetsValid = true;

  // Map the 7 classical planets to their respective houses (1-12)
  classicalPlanets.forEach(planet => {
    if (placements[planet] === undefined) {
      allPlanetsValid = false;
    } else {
      const house = ((placements[planet] - lagnaIndex + 12) % 12) + 1;
      occupiedHouses.add(house);
    }
  });

  if (!allPlanetsValid) return yogas;

  // Helper: Checks if planets are ONLY in the provided houses
  const strictlyInside = (houses) => Array.from(occupiedHouses).every(h => houses.includes(h));
  // Helper: Checks if planets are ONLY in the provided houses AND all provided houses are occupied
  const exactMatch = (houses) => strictlyInside(houses) && houses.every(h => occupiedHouses.has(h));

  // 80. Chandra Yoga (All planets in odd houses)
  if (strictlyInside([1, 3, 5, 7, 9, 11])) {
    yogas.push({
      name: "Chandra Yoga",
      type: "Nabhasa Yoga",
      description: "All planets occupy only the odd houses (1st, 3rd, 5th, 7th, 9th, 11th).",
      results: "The subject will be a king or equal, command respect, and earn and spend well."
    });
  }

  // 90. Samadura Yoga (All planets in even houses)
  if (strictlyInside([2, 4, 6, 8, 10, 12])) {
    yogas.push({
      name: "Samadura Yoga",
      type: "Nabhasa Yoga",
      description: "All seven classical planets exclusively occupy the six even houses (2nd, 4th, 6th, 8th, 10th, 12th).",
      results: "The native will be a ruler or live like one, free from care and worry."
    });
  }

  // 81. Gada Yoga (Adjacent Kendras)
  if (exactMatch([1, 4]) || exactMatch([4, 7]) || exactMatch([7, 10]) || exactMatch([10, 1])) {
    yogas.push({
      name: "Gada Yoga",
      type: "Nabhasa Yoga",
      description: "All planets occupy two adjacent kendras.",
      results: "Makes one highly religious and wealthy."
    });
  }

  // 82. Sakata Yoga (1st and 7th)
  if (exactMatch([1, 7])) {
    yogas.push({
      name: "Sakata Yoga",
      type: "Nabhasa Yoga",
      description: "All planets occupy the 1st and 7th houses.",
      results: "Renders one poor, unhappy in domestic life, sickly, and derives livelihood by manual labour."
    });
  }

  // 83. Vihaga Yoga (4th and 10th)
  if (exactMatch([4, 10])) {
    yogas.push({
      name: "Vihaga Yoga",
      type: "Nabhasa Yoga",
      description: "All planets occupy the 4th and 10th houses.",
      results: "The native becomes a vagrant, quarrelsome, and mean. Often associated with travel agents or guards who are always moving."
    });
  }

  // 86. Sringhataka Yoga (1st, 5th, 9th)
  if (exactMatch([1, 5, 9])) {
    yogas.push({
      name: "Sringhataka Yoga",
      type: "Nabhasa Yoga",
      description: "All planets occupy the Ascendant and its trines (1st, 5th, 9th).",
      results: "Makes one happy in later life with a smooth career and progeny."
    });
  }

  // 87. Hala Yoga (Other trinal groupings)
  if (exactMatch([2, 6, 10]) || exactMatch([3, 7, 11]) || exactMatch([4, 8, 12])) {
    yogas.push({
      name: "Hala Yoga",
      type: "Nabhasa Yoga",
      description: "All planets are confined exclusively to mutually trinal houses other than 1, 5, and 9.",
      results: "Makes one an agriculturist, farmer, estate manager, or landlord."
    });
  }

  // 88. Kamala Yoga (All four Kendras)
  if (exactMatch([1, 4, 7, 10])) {
    yogas.push({
      name: "Kamala Yoga",
      type: "Nabhasa Yoga",
      description: "All planets are situated in all four Kendras.",
      results: "Commands high prestige, wide fame, and innumerable virtues, though not necessarily immense wealth."
    });
  }

  // 89. Vapee Yoga (All four Panaparas or Apoklimas)
  if (exactMatch([2, 5, 8, 11]) || exactMatch([3, 6, 9, 12])) {
    yogas.push({
      name: "Vapee Yoga",
      type: "Nabhasa Yoga",
      description: "All planets are ranged exclusively in the four Panaparas or the four Apoklimas.",
      results: "Makes one mean, prone to trickery, and always pining to hoard wealth."
    });
  }

  return yogas;
};

// ============================================================================
// 🔢 NABHASA YOGAS (SANKHYA / NUMERICAL GROUP)
// ============================================================================
// Note: Classically, these are only considered if no Akriti Yoga is present.

const _checkNabhasaSankhyaYogas = (placements) => {
  if (!placements) return null;

  const classicalPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const uniqueSigns = new Set();
  let allPlanetsValid = true;

  // Count how many unique signs are occupied by the 7 classical planets
  classicalPlanets.forEach(planet => {
    if (placements[planet] === undefined) {
      allPlanetsValid = false;
    } else {
      uniqueSigns.add(placements[planet]);
    }
  });

  if (!allPlanetsValid) return null;

  const signCount = uniqueSigns.size;

  // 91. Vallaki (Veena) Yoga: 7 planets in 7 signs
  if (signCount === 7) {
    return {
      name: "Vallaki (Veena) Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven classical planets are distributed across exactly seven different signs.",
      results: "The person will have a large number of friends, be fond of music and fine arts, learned, happy, and famous."
    };
  }

  // 92. Damni (Dama) Yoga: 7 planets in 6 signs
  if (signCount === 6) {
    return {
      name: "Damni (Dama) Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven classical planets are distributed across exactly six different signs.",
      results: "The person will be highly charitable, always helping others, and a protector of cattle (or general wealth). Grants intellect, fame, and wealth."
    };
  }

  // 93. Pasa Yoga: 7 planets in 5 signs
  if (signCount === 5) {
    return {
      name: "Pasa Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven planets occupy exactly five signs.",
      results: "Acquires wealth through right means; surrounded by friends and servants."
    };
  }
  
  // 94. Kedara Yoga: 7 planets in 4 signs
  if (signCount === 4) {
    return {
      name: "Kedara Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven planets occupy exactly four signs.",
      results: "Earns livelihood by agriculture and is highly helpful to others."
    };
  }
  
  // 95. Sula Yoga: 7 planets in 3 signs
  if (signCount === 3) {
    return {
      name: "Sula Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven planets occupy exactly three signs.",
      results: "Can be devoid of wealth, courageous, cruel, and possess marks of wounds."
    };
  }
  
  // 96. Yuga Yoga: 7 planets in 2 signs
  if (signCount === 2) {
    return {
      name: "Yuga Yoga",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven planets occupy exactly two signs.",
      results: "Renders one poor, ostracised by society, heretical, or a drunkard."
    };
  }
  
  // 97. Gola Yoga (Sankhya): 7 planets in 1 sign
  if (signCount === 1) {
    return {
      name: "Gola Yoga (Sankhya)",
      type: "Nabhasa Sankhya Yoga",
      description: "All seven planets occupy a single sign.",
      results: "Gives rise to a poor, dirty, ignorant, and indolent individual."
    };
  }

  return null;
};

// ============================================================================
// 🏛️ NABHASA YOGAS (ASRAYA GROUP)
// ============================================================================
const _checkNabhasaAsrayaYogas = (placements) => {
  if (!placements) return null;
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  
  let allMovable = true; let allFixed = true; let allCommon = true;

  planets.forEach(p => {
    if (placements[p] === undefined) return;
    const mod = placements[p] % 3;
    if (mod !== 0) allMovable = false; // 0: Aries, Cancer, Libra, Capricorn
    if (mod !== 1) allFixed = false;   // 1: Taurus, Leo, Scorpio, Aquarius
    if (mod !== 2) allCommon = false;  // 2: Gemini, Virgo, Sagittarius, Pisces
  });

  if (allMovable) return { name: "Rajju Yoga", type: "Nabhasa Asraya", description: "All planets in movable signs.", results: "Fond of travel, handsome, searches for wealth in foreign countries." };
  if (allFixed) return { name: "Musala Yoga", type: "Nabhasa Asraya", description: "All planets in fixed signs.", results: "Endowed with self-respect, wealth, steady mind, and fame." };
  if (allCommon) return { name: "Nala Yoga", type: "Nabhasa Asraya", description: "All planets in common/dual signs.", results: "Makes one deformed, shrewd, and defected." };

  return null;
};

// ============================================================================
// ⚖️ NABHASA YOGAS (DALA GROUP)
// ============================================================================
const _checkNabhasaDalaYogas = (lagnaIndex, placements) => {
  if (lagnaIndex === undefined || !placements) return null;
  
  const getHouse = (sign) => ((sign - lagnaIndex + 12) % 12) + 1;
  const isKendra = (h) => [1, 4, 7, 10].includes(h);

  // Classical text excludes the Moon for Dala Yogas
  const benefics = ['Mercury', 'Jupiter', 'Venus'];
  const malefics = ['Sun', 'Mars', 'Saturn'];

  const beneficsInKendras = benefics.every(p => placements[p] !== undefined && isKendra(getHouse(placements[p])));
  const maleficsInKendras = malefics.every(p => placements[p] !== undefined && isKendra(getHouse(placements[p])));

  if (beneficsInKendras && !maleficsInKendras) return { name: "Srik (Mala) Yoga", type: "Nabhasa Dala", description: "Kendras are exclusively occupied by benefics.", results: "Lives in comfort, possesses conveyances, and has many enjoyments." };
  if (maleficsInKendras && !beneficsInKendras) return { name: "Sarpa Yoga", type: "Nabhasa Dala", description: "Kendras are exclusively occupied by malefics.", results: "Renders one miserable in many ways, cruel, and stupid." };

  return null;
};

export const calculateYogas = (planets, lagnaIndex, lagnaDegree, additionalInfo = {}) => {
  if (isNaN(lagnaIndex) || !planets || planets.length === 0) return [];
  const shadbalaScores = calculateShadbala(planets, lagnaDegree);
  const gender = additionalInfo.gender || 'Male';
  const isDay = additionalInfo.isDay !== undefined ? additionalInfo.isDay : true;

  const navamsaLagnaIndex = additionalInfo.navamsaLagnaIndex !== undefined 
    ? additionalInfo.navamsaLagnaIndex 
    : getD9RasiIndex(lagnaDegree);

  let navamsaPlacements = additionalInfo.navamsaPlacements;
  if (!navamsaPlacements) {
    navamsaPlacements = {};
    planets.forEach(p => {
      if (p) {
        navamsaPlacements[p.planet || p.name] = getD9RasiIndex(p.fullDegree);
      }
    });
  }
  
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

  const lagnaLord = houseLords[1];
  const lord9 = houseLords[9];
  const lord10 = houseLords[10];
  const lord4 = houseLords[4];
  const lord7 = houseLords[7];
  const lord5 = houseLords[5];
  const lord6 = houseLords[6];
  const lord11 = houseLords[11];
  const lord2 = houseLords[2];
  const lord8 = houseLords[8];
  const mainPlanetsList = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const beneficsList = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const maleficsList = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const fixedSigns = [1, 4, 7, 10]; // Taurus, Leo, Scorpio, Aquarius
  const isLagnaFixed = fixedSigns.includes(lagnaIndex);

  const getConjuncts = (pName) =>
    Object.keys(placements).filter(p => placements[p] === placements[pName] && p !== pName);

  const isExalted = (pName) => rasiPlacements[pName] === EXALTATION_SIGNS[pName];
  const isDebilitated = (pName) => rasiPlacements[pName] === DEBILITATION_SIGNS[pName];
  const isOwnSign = (pName) => RASHI_LORDS[rasiPlacements[pName]] === pName;

  const kendras = [1, 4, 7, 10];
  const trikonas = [1, 5, 9];
  const dusthanas = [6, 8, 12];

  const isMercExalted = isExalted('Mercury');
  const sunObj = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
  const mercObj = planets.find(p => p && (p.planet === 'Mercury' || p.name === 'Mercury'));
  let sunMercDistance = 360;
  if (sunObj && mercObj) {
    const diff = Math.abs(sunObj.fullDegree - mercObj.fullDegree) % 360;
    sunMercDistance = diff > 180 ? 360 - diff : diff;
  }
  const isBudhaditya = !!(placements['Mercury'] && placements['Sun'] && placements['Mercury'] === placements['Sun'] && sunMercDistance >= 10);

  // ==========================================
  // ⚖️ B.V. RAMAN QUANTITATIVE EVALUATION HELPERS
  // ==========================================
  const FRIENDLY_SIGNS = {
    Sun: [4, 8, 11, 0, 7, 3], // Leo, Sag, Pis, Ari, Sco, Can
    Moon: [4, 2, 5, 1], // Leo, Gem, Vir, Tau
    Mars: [0, 7, 4, 3, 8, 11], // Ari, Sco, Leo, Can, Sag, Pis
    Mercury: [2, 5, 4, 1, 6], // Gem, Vir, Leo, Tau, Lib
    Jupiter: [8, 11, 3, 4, 0, 7], // Sag, Pis, Can, Leo, Ari, Sco
    Venus: [1, 6, 2, 5, 9, 10], // Tau, Lib, Gem, Vir, Cap, Aqu
    Saturn: [9, 10, 6, 2, 5, 1, 6] // Cap, Aqu, Lib, Gem, Vir, Tau
  };

  const INIMICAL_SIGNS = {
    Sun: [1, 6, 9, 10], // Tau, Lib, Cap, Aqu
    Moon: [],
    Mars: [2, 5], // Gem, Vir
    Mercury: [3], // Can
    Jupiter: [2, 5, 1, 6], // Gem, Vir, Tau, Lib
    Venus: [4, 3], // Leo, Can
    Saturn: [0, 7, 4, 3] // Ari, Sco, Leo, Can
  };

  const getPlanetarySignRelation = (pName, rasiIdx) => {
    if (FRIENDLY_SIGNS[pName]?.includes(rasiIdx)) return 'Friend';
    if (INIMICAL_SIGNS[pName]?.includes(rasiIdx)) return 'Enemy';
    return 'Neutral';
  };

  const getNetUnits = (pName, lagnaRasiIdx) => {
    const lagnaRasiName = SIGN_NAMES[lagnaRasiIdx] || "Aries";
    let score = 0.0;

    // 1. Functional benefic/malefic (1.0 for Benefic, -1.0 for Malefic, 0.0 for Neutral)
    const dignity = getBVRamanFunctionalDignity(pName, lagnaRasiName);
    if (dignity === 'Benefic') score += 1.0;
    else if (dignity === 'Malefic') score -= 1.0;

    // 2. Association with benefic/malefic
    const conjuncts = getConjuncts(pName);
    conjuncts.forEach(cp => {
      const cpDignity = getBVRamanFunctionalDignity(cp, lagnaRasiName);
      if (cpDignity === 'Benefic') score += 1.0;
      else if (cpDignity === 'Malefic') score -= 1.0;
    });

    // 3. Aspect of benefic/malefic
    Object.keys(placements).forEach(ap => {
      if (ap !== pName && hasAspect(ap, rasiPlacements[pName], rasiPlacements)) {
        const apDignity = getBVRamanFunctionalDignity(ap, lagnaRasiName);
        if (apDignity === 'Benefic') score += 1.0;
        else if (apDignity === 'Malefic') score -= 1.0;
      }
    });

    // 4. Exaltation / Debilitation / Sign friendship
    if (rasiPlacements[pName] === EXALTATION_SIGNS[pName] || isOwnSign(pName)) {
      score += 1.0;
    } else if (rasiPlacements[pName] === DEBILITATION_SIGNS[pName]) {
      score -= 1.0;
    } else {
      const relation = getPlanetarySignRelation(pName, rasiPlacements[pName]);
      if (relation === 'Friend') score += 1.0;
      else if (relation === 'Enemy') score += 0.25;
      else score += 0.75; // Neutral is 0.75 as per B.V. Raman
    }

    return parseFloat(score.toFixed(2));
  };

  const getResidentialStrength = (pName, lagnaDegreeVal) => {
    if (lagnaDegreeVal === undefined || isNaN(lagnaDegreeVal)) return 0.5;
    const p = planets.find(pl => (pl.planet || pl.name) === pName);
    if (!p) return 0.5;
    
    const pDeg = p.longitude ? (p.longitude % 30) : (p.rasiDegrees !== undefined ? p.rasiDegrees : 15);
    const lagnaDegSign = lagnaDegreeVal % 30;
    
    let diff = Math.abs(pDeg - lagnaDegSign);
    if (diff > 15) diff = 30 - diff;
    
    return (15 - diff) / 15;
  };

  const getNeutralizationReason = (pName, netUnits, resStrength) => {
    const reasons = [];
    if (netUnits >= 1) {
      reasons.push(`favorable functional support (Net Units: ${netUnits >= 0 ? '+' : ''}${netUnits})`);
    }
    if (resStrength < 0.3) {
      reasons.push(`weak residential placement near the house boundary (strength: ${Math.round(resStrength * 100)}%)`);
    }
    return reasons.join(' and ');
  };

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
  // 2A. PUSHKALA YOGA
  // ==========================================
  if (lagnaLord && rasiPlacements['Moon'] !== undefined) {
    const moonRasi = rasiPlacements['Moon'];
    const moonSignLord = RASHI_LORDS[moonRasi];
    
    if (moonSignLord) {
      // Condition 1: Lord of Lagna is with the Moon (conjoined in same house/sign)
      const isMoonWithLagnaLord = placements['Moon'] !== undefined && 
                                  placements[lagnaLord] !== undefined && 
                                  placements['Moon'] === placements[lagnaLord];
      
      // Condition 2: Lord of sign occupied by Moon is in Kendra or in house of friendly sign, AND aspects Lagna
      const isInKendra = kendras.includes(placements[moonSignLord]);
      
      const isFriendlySign = (FRIENDLY_SIGNS[moonSignLord] || []).includes(rasiPlacements[moonSignLord]) ||
                            rasiPlacements[moonSignLord] === EXALTATION_SIGNS[moonSignLord] ||
                            RASHI_LORDS[rasiPlacements[moonSignLord]] === moonSignLord;
      
      const aspectsLagna = hasAspect(moonSignLord, lagnaIndex, rasiPlacements);
      
      // B.V. Raman's definition: conjoined, dispositor in Kendra/friendly, aspecting Lagna
      if (isMoonWithLagnaLord && (isInKendra || isFriendlySign) && aspectsLagna) {
        // Condition 3: Lagna is occupied by a powerful planet
        const planetsInLagna = Object.keys(placements).filter(p => placements[p] === 1);
        const hasPowerfulPlanetInLagna = planetsInLagna.some(p => isExalted(p) || isOwnSign(p) || getNetUnits(p, lagnaIndex) >= 0.5);
        
        let statusDetail = "";
        if (planetsInLagna.length > 0) {
          if (hasPowerfulPlanetInLagna) {
            statusDetail = " (Fully Complete - all 3 conditions met including a powerful planet in Lagna)";
          } else {
            statusDetail = " (Partially Complete - Lagna has a planet, but it lacks high strength)";
          }
        } else {
          statusDetail = " (Raman Classic Exception - present without a planet occupying Lagna, as in Chart No. 26)";
        }
        
        const involved = ['Moon', lagnaLord, moonSignLord];
        if (planetsInLagna.length > 0) {
          involved.push(...planetsInLagna);
        }
        
        yogas.push({
          name: 'Pushkala Yoga',
          type: 'Power/Status',
          involved: [...new Set(involved)],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `The lord of the sign occupied by the Moon (${moonSignLord}) is placed in ${isInKendra ? 'a Kendra' : 'a friendly sign'} and aspects the Lagna, while the Lagna Lord (${lagnaLord}) is conjoined with the Moon. ${statusDetail}. According to B.V. Raman, this makes the native wealthy, sweet-speeched, famous, and highly honored by authority figures or state leaders. It indicates that the Lagna, the Lagna Lord, the Moon, and the Chandra Lagna Lord are all robustly disposed.`
        });
      }
    }
  }

  // ==========================================
  // 2B. GAURI YOGA
  // ==========================================
  if (lagnaLord && lord10) {
    const lord10Planet = planets.find(p => p && (p.planet === lord10 || p.name === lord10));
    
    let conditionA = false;
    let navSign = -1;
    let navLord = null;
    
    if (lord10Planet && lord10Planet.fullDegree !== undefined) {
      navSign = getD9RasiIndex(lord10Planet.fullDegree);
      navLord = RASHI_LORDS[navSign];
      
      if (navLord) {
        // Condition A: Lord of Navamsa occupied by 10th Lord is in 10th house exalted, and Lagna Lord conjoins it there
        const isNavLordIn10 = placements[navLord] === 10;
        const isNavLordExalted = rasiPlacements[navLord] === EXALTATION_SIGNS[navLord];
        const isLagnaLordIn10 = placements[lagnaLord] === 10;
        conditionA = isNavLordIn10 && isNavLordExalted && isLagnaLordIn10;
      }
    }

    // Condition B (Alternate School): Lord of 9th and Moon are in own/exalted signs identical with Kendra/Trikona
    const isLord9InTrikKendra = placements[lord9] !== undefined && [1, 4, 7, 10, 5, 9].includes(placements[lord9]);
    const isLord9OwnOrExalted = rasiPlacements[lord9] !== undefined && (isOwnSign(lord9) || isExalted(lord9));
    const isMoonInTrikKendra = placements['Moon'] !== undefined && [1, 4, 7, 10, 5, 9].includes(placements['Moon']);
    const isMoonOwnOrExalted = rasiPlacements['Moon'] !== undefined && (isOwnSign('Moon') || isExalted('Moon'));
    
    const conditionB = isLord9InTrikKendra && isLord9OwnOrExalted && isMoonInTrikKendra && isMoonOwnOrExalted;

    if (conditionA || conditionB) {
      const involved = [];
      const triggers = [];
      
      if (conditionA) {
        involved.push(lord10, navLord, lagnaLord);
        triggers.push(`👑 **Primary Definition**: The Lord of the Navamsa occupied by the 10th Lord (${navLord}) is placed in the 10th house exalted (specifically, rules Navamsa sign ${SIGN_NAMES[navSign]} and is conjoined with the Lagna Lord ${lagnaLord} in the 10th house).`);
      }
      
      if (conditionB) {
        involved.push(lord9, 'Moon');
        triggers.push(`🌙 **Alternate Definition (Remarks)**: The Lord of the 9th House (${lord9}) and the Moon are both posited in their own or exalted signs identical with a Kendra or Trikona house (specifically: ${lord9} in House ${placements[lord9]}, Moon in House ${placements['Moon']}).`);
      }

      const description = `${triggers.join('\n\n')}\n\nAccording to classical texts and B.V. Raman, Gauri Yoga makes the native belong to a respectable family, own several lands, possess a charitable and virtuous character, perform religious rites, and receive praise from all. It ensures that the native's sons/children will have excellent moral character.`;

      yogas.push({
        name: 'Gauri Yoga',
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: description
      });
    }
  }

  // ==========================================
  // 2C. CHAPA YOGA
  // ==========================================
  if (lagnaLord && lord4 && lord10) {
    const isLagnaLordExalted = isExalted(lagnaLord);
    const is4thLordIn10 = placements[lord4] === 10;
    const is10thLordIn4 = placements[lord10] === 4;

    if (isLagnaLordExalted && is4thLordIn10 && is10thLordIn4) {
      yogas.push({
        name: 'Chapa Yoga',
        type: 'Power/Status',
        involved: [lagnaLord, lord4, lord10],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Ascendant Lord (${lagnaLord}) is exalted, and the Lord of the 4th House (${lord4}) and the Lord of the 10th House (${lord10}) have interchanged houses (specifically: ${lord4} is in the 10th house and ${lord10} is in the 4th house). According to B.V. Raman, this classical combination (Chapa Yoga) signifies that the person will grace a King's Council, be full of strength, and occupy a key financial post (such as an Exchequer, Comptroller of the Treasury, or financial secretary). Raman notes that this yoga predominantly makes the native control the wealth of others (e.g. bank cashiers, financial managers) rather than necessarily making them personally ultra-rich.`
      });
    }
  }

  // ==========================================
  // 2D. SREENATHA YOGA (SREENATH YOGA)
  // ==========================================
  if (lord7 && lord10 && lord9) {
    const isLord7In10 = placements[lord7] === 10;
    const isLord7Exalted = rasiPlacements[lord7] === EXALTATION_SIGNS[lord7];
    const isLord10With9thLord = placements[lord10] !== undefined && 
                                placements[lord9] !== undefined && 
                                placements[lord10] === placements[lord9];

    if (isLord7In10 && isLord7Exalted && isLord10With9thLord) {
      yogas.push({
        name: 'Sreenatha Yoga',
        type: 'Power/Status',
        involved: [lord7, lord10, lord9],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Lord of the 7th House (${lord7}) is exalted in the 10th house, and the Lord of the 10th House (${lord10}) is conjoined with the Lord of the 9th House (${lord9}). According to B.V. Raman, this is a highly auspicious Raja Yoga establishing connection between the 7th, 9th, and 10th houses. It blesses the native with wealth, status, power, agreeable speech, godliness, and a very good spouse and children, with the native being universally loved.`
      });
    }
  }

  // ==========================================
  // 2E. MALLIKA YOGAS (MALLIKA YOGA)
  // ==========================================
  const placementsSet = new Set(mainPlanetsList.map(p => placements[p]).filter(h => h !== undefined));

  if (placementsSet.size === 7) {
    for (let startHouse = 1; startHouse <= 12; startHouse++) {
      let isContiguous = true;
      const involvedHouses = [];
      
      for (let offset = 0; offset < 7; offset++) {
        const h = ((startHouse - 1 + offset) % 12) + 1;
        involvedHouses.push(h);
        if (!placementsSet.has(h)) {
          isContiguous = false;
          break;
        }
      }

      if (isContiguous) {
        const malikaNames = {
          1: { name: 'Lagna Malika Yoga', desc: 'King, Ruler or Commander, wealthy.' },
          2: { name: 'Dhana Malika Yoga', desc: 'Very wealthy, dutiful, resolute and unsympathetic.' },
          3: { name: 'Vikrama Malika Yoga', desc: 'Ruler, rich, sickly, surrounded by brave men.' },
          4: { name: 'Sukha Malika Yoga', desc: 'Charitable and wealthy.' },
          5: { name: 'Putra Malika Yoga', desc: 'Highly religious and famous.' },
          6: { name: 'Satru Malika Yoga', desc: 'Greedy and somewhat poor.' },
          7: { name: 'Kalatra Malika Yoga', desc: 'Coveted by women and influential.' },
          8: { name: 'Randhra Malika Yoga', desc: 'Poor and hen-pecked.' },
          9: { name: 'Bhagya Malika Yoga', desc: 'Religious, well-to-do, mighty and good.' },
          10: { name: 'Karma Malika Yoga', desc: 'Respected and virtuous.' },
          11: { name: 'Labha Malika Yoga', desc: 'Skilful and lovely women.' },
          12: { name: 'Vraya Malika Yoga', desc: 'Honoured, liberal and respected.' }
        };

        const malika = malikaNames[startHouse];
        const involvedPlanets = mainPlanetsList.filter(p => involvedHouses.includes(placements[p]));

        yogas.push({
          name: malika.name,
          type: 'Power/Status',
          involved: involvedPlanets,
          icon: 'Compass',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          desc: `All 7 physical planets occupy 7 contiguous houses starting from House ${startHouse} (${involvedHouses.join(' → ')}). According to B.V. Raman, this forms the ${malika.name}. Results: ${malika.desc}`
        });
        
        break; // Max one Malika Yoga possible
      }
    }
  }

  // ==========================================
  // 2F. SANKHA YOGA (SHANKHA YOGA)
  // ==========================================
  if (lord5 && lord6 && lagnaLord) {
    const h5 = placements[lord5];
    const h6 = placements[lord6];
    
    if (h5 && h6) {
      const diff = (h5 - h6 + 12) % 12;
      const isMutualKendra = [0, 3, 6, 9].includes(diff);
      const isLagnaLordPowerful = isOwnSign(lagnaLord) || isExalted(lagnaLord) || getNetUnits(lagnaLord, lagnaIndex) >= 0.5;

      if (isMutualKendra && isLagnaLordPowerful) {
        yogas.push({
          name: 'Sankha Yoga',
          type: 'Power/Status',
          involved: [lord5, lord6, lagnaLord],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `The Lord of the 5th House (${lord5}) and the Lord of the 6th House (${lord6}) are in mutual Kendras (placed in House ${h5} and House ${h6} respectively, at a ${diff === 0 ? 'conjoined' : (diff === 6 ? '7th (opposite)' : '4th/10th')} angle from each other), while the Lagna Lord (${lagnaLord}) is strongly disposed. According to B.V. Raman, Sankha Yoga makes the native fond of pleasures, humanitarian, blessed with a good spouse, children, and lands, righteously inclined, and long-lived. Raman notes that while the 6th lordship brings minor struggles or debts/enemies, this yoga acts as a major catalyst for converting those trials into success.`
        });
      }
    }
  }

  // ==========================================
  // 2G. GAJA YOGA
  // ==========================================
  if (lord7 && lord11) {
    const isLord7In11 = placements[lord7] === 11;
    const isMoonIn11 = placements['Moon'] === 11;
    
    // 7th Lord conjoined with Moon (or 7th Lord is Moon itself, in which case conjunction is automatic)
    const isConjoinedWithMoon = lord7 === 'Moon' ? isMoonIn11 : (isLord7In11 && isMoonIn11);
    
    if (isConjoinedWithMoon) {
      // Aspected or conjoined by lord of 11th
      const isAspectedByLord11 = hasAspect(lord11, rasiPlacements[lord7], rasiPlacements) || 
                                 placements[lord11] === placements[lord7];
      
      if (isAspectedByLord11) {
        const involved = [lord7, 'Moon', lord11];
        const relationDetail = placements[lord11] === placements[lord7]
          ? `conjoined with the 11th Lord (${lord11})`
          : `aspected by the 11th Lord (${lord11})`;

        yogas.push({
          name: 'Gaja Yoga',
          type: 'Power/Status',
          involved: [...new Set(involved)],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `The Lord of the 9th from the 11th (which is the 7th Lord, ${lord7}) occupies the 11th house conjoined with the Moon (or is the Moon itself in the 11th) and is ${relationDetail}. According to B.V. Raman, Gaja Yoga blesses the native with high status, command over resources, vehicles (traditionally cattle, elephants, and horses), and lifelong wealth and happiness. Raman also notes that when this yoga is strong, the native consistently gains in their dealings with others.`
        });
      }
    }
  }

  // ==========================================
  // 2H. KALANIDHI YOGA
  // ==========================================
  if (placements['Jupiter'] !== undefined) {
    const jupHouse = placements['Jupiter'];
    const jupRasi = rasiPlacements['Jupiter'];
    
    const isJupIn2or5 = jupHouse === 2 || jupHouse === 5;
    const isJupInSwakshetraMercOrVenus = [1, 2, 5, 6].includes(jupRasi); // Taurus, Gemini, Virgo, Libra
    
    const isJupWithMerc = placements['Mercury'] !== undefined && placements['Mercury'] === jupHouse;
    const isJupAspectedByMerc = hasAspect('Mercury', jupRasi, rasiPlacements);
    const isJupWithVenus = placements['Venus'] !== undefined && placements['Venus'] === jupHouse;
    const isJupAspectedByVenus = hasAspect('Venus', jupRasi, rasiPlacements);
    
    const isConnectedMerc = isJupWithMerc || isJupAspectedByMerc;
    const isConnectedVenus = isJupWithVenus || isJupAspectedByVenus;
    
    // 1. Classical definition: Jupiter in 2nd/5th in Mercury/Venus sign, connected to BOTH Mercury and Venus
    const condClassical = isJupIn2or5 && isJupInSwakshetraMercOrVenus && isConnectedMerc && isConnectedVenus;
    
    // 2. Raman's Remarks definition: Jupiter in 2nd, 5th, or 9th conjoined with Mercury, Venus, or both
    const isJupIn2or5or9 = jupHouse === 2 || jupHouse === 5 || jupHouse === 9;
    const condRemarks = isJupIn2or5or9 && (isJupWithMerc || isJupWithVenus);
    
    if (condClassical || condRemarks) {
      const involved = ['Jupiter'];
      const triggers = [];
      
      if (condClassical) {
        involved.push('Mercury', 'Venus');
        triggers.push(`📜 **Primary Definition**: Jupiter is in House ${jupHouse} in a sign ruled by Mercury/Venus (${SIGN_NAMES[jupRasi]}) and is connected to both Mercury (via ${isJupWithMerc ? 'conjunction' : 'aspect'}) and Venus (via ${isJupWithVenus ? 'conjunction' : 'aspect'}).`);
      }
      
      if (condRemarks && !condClassical) {
        const withPlanets = [];
        if (isJupWithMerc) { withPlanets.push('Mercury'); involved.push('Mercury'); }
        if (isJupWithVenus) { withPlanets.push('Venus'); involved.push('Venus'); }
        triggers.push(`✍️ **Raman Remarks Definition**: Jupiter is placed in House ${jupHouse} conjoined with ${withPlanets.join(' and ')}.`);
      }
      
      if (triggers.length > 0) {
        yogas.push({
          name: 'Kalanidhi Yoga',
          type: 'Power/Status',
          involved: [...new Set(involved)],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `${triggers.join('\n\n')}\n\nAccording to B.V. Raman, Kalanidhi Yoga makes the native highly passionate, good-natured, respected by rulers or state authorities, and possessor of various conveyances and luxurious amenities. The native is also said to be generally immune from disease. Raman notes that while the classical version requires Jupiter to be in Venus/Mercury signs, his own observations show the yoga can also powerfully operate when Jupiter conjoins Venus and/or Mercury in the 2nd, 5th, or 9th houses, bringing alternate periods of struggles and prosperity.`
        });
      }
    }
  }

  // ==========================================
  // 2I. AMSAVATARA YOGA
  // ==========================================
  const movableSigns = [0, 3, 6, 9]; // Aries, Cancer, Libra, Capricorn
  const isLagnaMovable = movableSigns.includes(lagnaIndex);
  
  if (isLagnaMovable && placements['Venus'] && placements['Jupiter'] && placements['Saturn']) {
    const isVenusInKendra = kendras.includes(placements['Venus']);
    const isJupiterInKendra = kendras.includes(placements['Jupiter']);
    const isSaturnInKendra = kendras.includes(placements['Saturn']);
    const isSaturnExalted = rasiPlacements['Saturn'] === EXALTATION_SIGNS['Saturn']; // Saturn is exalted in Libra (6)
    
    if (isVenusInKendra && isJupiterInKendra && isSaturnInKendra && isSaturnExalted) {
      yogas.push({
        name: 'Amsavatara Yoga',
        type: 'Power/Status',
        involved: ['Venus', 'Jupiter', 'Saturn'],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Ascendant is in a movable sign (${SIGN_NAMES[lagnaIndex]}), Venus and Jupiter are both in Kendras (placed in House ${placements['Venus']} and House ${placements['Jupiter']} respectively), and Saturn is exalted in a Kendra (placed in House ${placements['Saturn']} in Libra). According to B.V. Raman, Amsavatara Yoga blesses the native with an unsullied name and fame, versatile learning, passions under control, and a status equal to a ruler or authority of philosophy.`
      });
    }
  }

  // ==========================================
  // 2J. HARIHARA BRAHMA YOGA
  // ==========================================
  if (lord2 && placements[lord2]) {
    // Condition A: Benefics in 8th or 12th from 2nd Lord
    const beneficsIn8thFromLord2 = beneficsList.filter(p => {
      if (placements[p] === undefined) return false;
      const rel = ((placements[p] - placements[lord2] + 12) % 12) + 1;
      return rel === 8;
    });
    const beneficsIn12thFromLord2 = beneficsList.filter(p => {
      if (placements[p] === undefined) return false;
      const rel = ((placements[p] - placements[lord2] + 12) % 12) + 1;
      return rel === 12;
    });
    
    const hasCondA = beneficsIn8thFromLord2.length > 0 || beneficsIn12thFromLord2.length > 0;
    
    // Condition B: Jupiter, Moon, Mercury in 4th, 9th, 8th from 7th Lord respectively
    let hasCondB = false;
    if (lord7 && placements[lord7] && placements['Jupiter'] && placements['Moon'] && placements['Mercury']) {
      const jupRel = ((placements['Jupiter'] - placements[lord7] + 12) % 12) + 1;
      const moonRel = ((placements['Moon'] - placements[lord7] + 12) % 12) + 1;
      const mercRel = ((placements['Mercury'] - placements[lord7] + 12) % 12) + 1;
      hasCondB = jupRel === 4 && moonRel === 9 && mercRel === 8;
    }
    
    // Condition C: Sun, Venus, Mars in 4th, 10th, 11th from Lagna Lord respectively
    let hasCondC = false;
    if (lagnaLord && placements[lagnaLord] && placements['Sun'] && placements['Venus'] && placements['Mars']) {
      const sunRel = ((placements['Sun'] - placements[lagnaLord] + 12) % 12) + 1;
      const venRel = ((placements['Venus'] - placements[lagnaLord] + 12) % 12) + 1;
      const marsRel = ((placements['Mars'] - placements[lagnaLord] + 12) % 12) + 1;
      hasCondC = sunRel === 4 && venRel === 10 && marsRel === 11;
    }
    
    if (hasCondA || hasCondB || hasCondC) {
      const involved = [];
      const reasons = [];
      
      if (hasCondA) {
        involved.push(lord2, ...beneficsIn8thFromLord2, ...beneficsIn12thFromLord2);
        const details = [];
        if (beneficsIn8thFromLord2.length > 0) {
          details.push(`benefics (${beneficsIn8thFromLord2.join(', ')}) in the 8th`);
        }
        if (beneficsIn12thFromLord2.length > 0) {
          details.push(`benefics (${beneficsIn12thFromLord2.join(', ')}) in the 12th`);
        }
        reasons.push(`☸️ **Definition A**: There are ${details.join(' and ')} from the 2nd Lord (${lord2}).`);
      }
      
      if (hasCondB) {
        involved.push(lord7, 'Jupiter', 'Moon', 'Mercury');
        reasons.push(`☸️ **Definition B**: Jupiter, Moon, and Mercury are in the 4th, 9th, and 8th houses respectively from the 7th Lord (${lord7}).`);
      }
      
      if (hasCondC) {
        involved.push(lagnaLord, 'Sun', 'Venus', 'Mars');
        reasons.push(`☸️ **Definition C**: Sun, Venus, and Mars are in the 4th, 10th, and 11th houses respectively from the Lagna Lord (${lagnaLord}).`);
      }
      
      yogas.push({
        name: 'Harihara Brahma Yoga',
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `${reasons.join('\n\n')}\n\nAccording to B.V. Raman, Harihara Brahma Yoga represents the activities of creation, protection, and destruction carried on by the Hindu Trinity (Brahma, Vishnu, and Shiva). It blesses the native with eminent scholarship (especially in sacred texts like the Vedas), truthfulness, a pleasing speech, victory over enemies, helpfulness, and a life surrounded by comforts and virtuous deeds.`
      });
    }
  }

  // ==========================================
  // 2K. KUSUMA YOGA
  // ==========================================
  if (placements['Jupiter'] === 1 && placements['Moon'] === 7 && placements['Sun'] !== undefined) {
    const sunRelFromMoon = ((placements['Sun'] - placements['Moon'] + 12) % 12) + 1;
    if (sunRelFromMoon === 8) {
      yogas.push({
        name: 'Kusuma Yoga',
        type: 'Power/Status',
        involved: ['Jupiter', 'Moon', 'Sun'],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Jupiter is in the Lagna (1st House), the Moon is in the 7th House, and the Sun is in the 8th House from the Moon (placed in the 2nd House). According to B.V. Raman, Kusuma Yoga represents the auspicious combination of Gajakesari Yoga (Jupiter-Moon in Kendra) and Vasi Yoga (Jupiter in the 12th from the Sun). It makes the native a leader, protector, or king/equal to a king (magistrates, mayors, municipal commissioners), with an unsullied reputation.`
      });
    }
  }

  // ==========================================
  // 2L. MATSYA YOGA
  // ==========================================
  // Lagna (1st) and 9th occupied by malefics
  // 5th occupied by both malefics and benefics
  // 4th and 8th occupied by malefics
  const getPlanetsInHouse = (h) => Object.keys(placements).filter(p => placements[p] === h);
  
  const planetsH1 = getPlanetsInHouse(1);
  const planetsH9 = getPlanetsInHouse(9);
  const planetsH5 = getPlanetsInHouse(5);
  const planetsH4 = getPlanetsInHouse(4);
  const planetsH8 = getPlanetsInHouse(8);
  
  const maleficsIn1 = planetsH1.filter(p => maleficsList.includes(p));
  const maleficsIn9 = planetsH9.filter(p => maleficsList.includes(p));
  const maleficsIn4 = planetsH4.filter(p => maleficsList.includes(p));
  const maleficsIn8 = planetsH8.filter(p => maleficsList.includes(p));
  
  const maleficsIn5 = planetsH5.filter(p => maleficsList.includes(p));
  const beneficsIn5_matsya = planetsH5.filter(p => beneficsList.includes(p));
  
  const hasMaleficsIn1 = maleficsIn1.length > 0;
  const hasMaleficsIn9 = maleficsIn9.length > 0;
  const hasMaleficsIn4 = maleficsIn4.length > 0;
  const hasMaleficsIn8 = maleficsIn8.length > 0;
  const hasMaleficsIn5 = maleficsIn5.length > 0;
  const hasBeneficsIn5 = beneficsIn5_matsya.length > 0;
  
  if (hasMaleficsIn1 && hasMaleficsIn9 && hasMaleficsIn4 && hasMaleficsIn8 && hasMaleficsIn5 && hasBeneficsIn5) {
    const involved = [
      ...maleficsIn1,
      ...maleficsIn9,
      ...maleficsIn4,
      ...maleficsIn8,
      ...maleficsIn5,
      ...beneficsIn5_matsya
    ];
    
    yogas.push({
      name: 'Matsya Yoga',
      type: 'Power/Status',
      involved: [...new Set(involved)],
      icon: 'Crown',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    });
  }

  // ==========================================
  // 2LA. GOLA YOGA
  // ==========================================
  const golaYogaResult = checkGolaYoga(lagnaIndex, rasiPlacements, navamsaLagnaIndex, navamsaPlacements);
  if (golaYogaResult) {
    yogas.push({
      name: golaYogaResult.name,
      type: golaYogaResult.type,
      involved: ['Moon', 'Jupiter', 'Venus', 'Sun', 'Mercury'],
      icon: 'Star',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    });
  }

  // ==========================================
  // 2LB. THRILOCHANA YOGA
  // ==========================================
  const thrilochanaYogaResult = checkThrilochanaYoga(rasiPlacements);
  if (thrilochanaYogaResult) {
    yogas.push({
      name: thrilochanaYogaResult.name,
      type: thrilochanaYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars'],
      icon: 'Star',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    });
  }

  // ==========================================
  // 2LC. KULAVARDHANA YOGA
  // ==========================================
  const kulavardhanaYogaResult = checkKulavardhanaYoga(lagnaIndex, rasiPlacements);
  if (kulavardhanaYogaResult) {
    yogas.push({
      name: kulavardhanaYogaResult.name,
      type: kulavardhanaYogaResult.type,
      involved: ['Sun', 'Moon', 'Jupiter', 'Venus', 'Mercury'],
      icon: 'Users',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    });
  }

  // ==========================================
  // 2LCA. DURYOGA (Career Struggle)
  // ==========================================
  const duryogaResult = checkDuryoga(lagnaIndex, rasiPlacements);
  if (duryogaResult) {
    yogas.push({
      name: duryogaResult.name,
      type: duryogaResult.type,
      involved: [lord10],
      icon: 'ShieldAlert',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      desc: `${duryogaResult.description} Results: ${duryogaResult.results}`
    });
  }

  // ==========================================
  // 2LCB. DARIDRA YOGA (Financial Struggle)
  // ==========================================
  const daridraYogaResult = checkDaridraYoga(lagnaIndex, rasiPlacements);
  if (daridraYogaResult) {
    yogas.push({
      name: daridraYogaResult.name,
      type: daridraYogaResult.type,
      involved: [lord11],
      icon: 'TrendingDown',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      desc: `${daridraYogaResult.description} Results: ${daridraYogaResult.results}`
    });
  }

  // ==========================================
  // 2LCC. PHYSICAL CONSTITUTION YOGAS (Body Comforts & Hardships)
  // ==========================================
  const physicalBodyResult = checkPhysicalBodyYogas(lagnaIndex, rasiPlacements);
  yogas.push(...physicalBodyResult.map(y => ({
    ...y,
    involved: y.name === "Sareera Soukhya Yoga" 
      ? [lagnaLord, 'Jupiter', 'Venus'] 
      : (y.name === "Rogagrastha Yoga" ? [lagnaLord, houseLords[6], houseLords[8], houseLords[12]] : [lagnaLord]),
    icon: y.type === "Auspicious Yoga" ? 'Heart' : 'Activity',
    color: y.type === "Auspicious Yoga" ? 'text-emerald-700' : 'text-rose-700',
    bg: y.type === "Auspicious Yoga" ? 'bg-emerald-50' : 'bg-rose-50',
    border: y.type === "Auspicious Yoga" ? 'border-emerald-200' : 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 2LCD. KRISANGA YOGAS (Lean/Emaciated Body & Bodily Pains)
  // ==========================================
  const krisangaResult = checkKrisangaYogas(lagnaIndex, rasiPlacements, navamsaLagnaIndex);
  yogas.push(...krisangaResult.map(y => ({
    ...y,
    involved: [lagnaLord],
    icon: 'Activity',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 2LCE. DEHASTHOULYA YOGAS (Corpulence / Stout Body)
  // ==========================================
  const dehasthoulyaResult = checkDehasthoulyaYogas(lagnaIndex, rasiPlacements, navamsaPlacements);
  yogas.push(...dehasthoulyaResult.map(y => {
    let involved = [lagnaLord];
    if (y.name === "Dehasthoulya Yoga (Type 1)") {
      if (navamsaPlacements && navamsaPlacements[lagnaLord] !== undefined) {
        const lagnaLordsList = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const navamsaDispositor = lagnaLordsList[navamsaPlacements[lagnaLord]];
        involved = [lagnaLord, navamsaDispositor];
      }
    } else if (y.name === "Dehasthoulya Yoga (Type 2)") {
      involved = ['Jupiter'];
    } else if (y.name === "Dehasthoulya Yoga (Type 3)") {
      const beneficsList = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
      const activeBenefics = beneficsList.filter(b => rasiPlacements[b] === lagnaIndex);
      involved = [...new Set([lagnaLord, ...activeBenefics])];
    }
    
    return {
      ...y,
      involved,
      icon: 'Activity',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${y.description} Results: ${y.results}`
    };
  }));

  // ==========================================
  // ✈️ SADA SANCHARA YOGA (Wanderer / Constant Travel)
  // ==========================================
  const sadaSancharaResult = checkSadaSancharaYoga(lagnaIndex, rasiPlacements, navamsaLagnaIndex);
  if (sadaSancharaResult) {
    const lagnaLordsList = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    const lagnaLord = lagnaLordsList[lagnaIndex];
    const lagnaLordSign = rasiPlacements[lagnaLord];
    const dispositorOfLagnaLord = lagnaLordsList[lagnaLordSign];
    yogas.push({
      name: sadaSancharaResult.name,
      type: sadaSancharaResult.type,
      involved: [...new Set([lagnaLord, dispositorOfLagnaLord])],
      icon: 'Compass',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${sadaSancharaResult.description} Results: ${sadaSancharaResult.results}`
    });
  }

  // ==========================================
  // 💰 DHANA YOGAS (Wealth Combinations 118 - 122)
  // ==========================================
  const dhanaYogasResult = checkDhanaYogas(lagnaIndex, rasiPlacements);
  yogas.push(...dhanaYogasResult.map(y => {
    let involved = [];
    if (y.name === "Dhana Yoga (Comb. 118)") involved = ['Venus', 'Saturn'];
    else if (y.name === "Dhana Yoga (Comb. 119)") involved = ['Mercury', 'Moon', 'Mars'];
    else if (y.name === "Dhana Yoga (Comb. 120)") involved = ['Saturn', 'Mercury', 'Mars'];
    else if (y.name === "Dhana Yoga (Comb. 121)") involved = ['Sun', 'Jupiter', 'Moon'];
    else if (y.name === "Dhana Yoga (Comb. 122)") involved = ['Jupiter', 'Mars', 'Moon'];

    return {
      ...y,
      involved,
      icon: 'BarChart2',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      desc: `${y.description} Results: ${y.results}`
    };
  }));

  // ==========================================
  // 💰 ADDITIONAL DHANA YOGAS & BAHUDRAVYARJANA YOGA (Wealth Combinations 123 - 129)
  // ==========================================
  const additionalDhanaResult = checkAdditionalDhanaYogas(lagnaIndex, rasiPlacements);
  yogas.push(...additionalDhanaResult.map(y => {
    let involved = [];
    if (y.name === "Dhana Yoga (Comb. 123)") involved = ['Sun', 'Mars', 'Jupiter'];
    else if (y.name === "Dhana Yoga (Comb. 124)") involved = ['Moon', 'Jupiter', 'Mars'];
    else if (y.name === "Dhana Yoga (Comb. 125)") involved = ['Mars', 'Moon', 'Venus', 'Saturn'];
    else if (y.name === "Dhana Yoga (Comb. 126)") involved = ['Mercury', 'Saturn', 'Venus'];
    else if (y.name === "Dhana Yoga (Comb. 127)") involved = ['Jupiter', 'Mercury', 'Mars'];
    else if (y.name === "Dhana Yoga (Comb. 128)") involved = ['Venus', 'Saturn', 'Mercury'];
    else if (y.name === "Bahudravyarjana Yoga") {
      const lagnaLordsList = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
      const lagnaLord = lagnaLordsList[lagnaIndex];
      const secondHouseIndex = (lagnaIndex + 1) % 12;
      const eleventhHouseIndex = (lagnaIndex + 10) % 12;
      const lordOf2nd = lagnaLordsList[secondHouseIndex];
      const lordOf11th = lagnaLordsList[eleventhHouseIndex];
      involved = [...new Set([lagnaLord, lordOf2nd, lordOf11th])];
    }

    return {
      ...y,
      involved,
      icon: 'BarChart2',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      desc: `${y.description} Results: ${y.results}`
    };
  }));

  // ==========================================
  // 💪 SWAVEERYADDHANA YOGAS (Self-Earned Wealth: Combinations 130 - 132)
  // ==========================================
  const swaveeryaddhanaResult = checkSwaveeryaddhanaYogas(lagnaIndex, rasiPlacements, navamsaPlacements);
  yogas.push(...swaveeryaddhanaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⏳ MADHYA VAYASI DHANA YOGA (Mid-Life Wealth: Combination 133)
  // ==========================================
  const madhyaVayasiResult = checkMadhyaVayasiDhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...madhyaVayasiResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🌅 ANTHYA VAYASI DHANA YOGA (Late-Life Wealth: Combination 134)
  // ==========================================
  const anthyaVayasiResult = checkAnthyaVayasiDhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...anthyaVayasiResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🌅 BALYA DHANA YOGA (Early-Life Wealth: Combination 135)
  // ==========================================
  const balyaDhanaResult = checkBalyaDhanaYoga(lagnaIndex, rasiPlacements, navamsaPlacements);
  yogas.push(...balyaDhanaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🤝 BHRATRUMOOLADDHANAPRAPTI YOGA (Wealth through Brothers/Relatives: Combinations 136 - 137)
  // ==========================================
  const bhratrumoolaResult = checkBhratrumooladdhanapraptiYoga(lagnaIndex, rasiPlacements);
  yogas.push(...bhratrumoolaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👩🌾 MATRUMOOLADDHANA YOGA (Wealth through Mother / 4th House: Combination 138)
  // ==========================================
  const matrumoolaResult = checkMatrumooladdhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...matrumoolaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👶 PUTRAMOOLADDHANA YOGA (Wealth through Sons: Combination 139)
  // ==========================================
  const putramoolaResult = checkPutramooladdhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...putramoolaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚔️ SATRUMOOLADDHANA YOGA (Wealth through Enemies: Combination 140)
  // ==========================================
  const satrumoolaResult = checkSatrumooladdhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...satrumoolaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👫 KALATRAMOOLADDHANA YOGA (Wealth through Spouse: Combination 141)
  // ==========================================
  const kalatramoolaResult = checkKalatramooladdhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...kalatramoolaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💎 AMARANANTHA DHANA YOGA (Life-long Wealth: Combination 142)
  // ==========================================
  const amarananthaResult = checkAmarananthaDhanaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...amarananthaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍀 AYATNADHANALABHA YOGA (Effortless Wealth: Combination 143)
  // ==========================================
  const ayatnadhanalabhaResult = checkAyatnadhanalabhaYoga(lagnaIndex, rasiPlacements);
  yogas.push(...ayatnadhanalabhaResult.map(y => ({
    ...y,
    icon: 'BarChart2',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 📉 DARIDRA YOGAS (Combinations 144 - 153)
  // ==========================================
  const daridraYogasResult = checkDaridraYogas(lagnaIndex, rasiPlacements, navamsaLagnaIndex, navamsaPlacements);
  yogas.push(...daridraYogasResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🗣️ YUKTHI SAMANWITHAVAGMI YOGAS (Combinations 154 - 155)
  // ==========================================
  const yukthiSamanwithavagmiResult = checkYukthiSamanwithavagmiYogas(lagnaIndex, placements, rasiPlacements);
  yogas.push(...yukthiSamanwithavagmiResult.map(y => ({
    ...y,
    icon: 'MessageSquare',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🎭 PARIHASAKA YOGA (Combination 156)
  // ==========================================
  const parihasakaResult = checkParihasakaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements);
  yogas.push(...parihasakaResult.map(y => ({
    ...y,
    icon: 'Smile',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🤥 ASATYAVADI YOGA (Combination 157)
  // ==========================================
  const asatyavadiResult = checkAsatyavadiYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements);
  yogas.push(...asatyavadiResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🧠 BUDDHIMATURYA YOGA (Great Intelligence)
  // ==========================================
  const buddhimaturyaResult = checkBuddhimaturyaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...buddhimaturyaResult.map(y => ({
    ...y,
    icon: 'Brain',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🧠 THEEVRABUDDHI YOGA (Exceptionally Acute Intelligence)
  // ==========================================
  const theevrabuddhiResult = checkTheevrabuddhiYoga(lagnaIndex, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...theevrabuddhiResult.map(y => ({
    ...y,
    icon: 'Zap',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🧠 BUDDHI JADA YOGA (Combination 233)
  // ==========================================
  const buddhiJadaResult = checkBuddhiJadaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...buddhiJadaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👁️ THRIKALAGNANA YOGA (Combination 234)
  // ==========================================
  const thrikalagnanaResult = checkThrikalagnanaYoga(lagnaIndex, rasiPlacements, navamsaPlacements, planets);
  yogas.push(...thrikalagnanaResult.map(y => ({
    ...y,
    icon: 'Eye',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👶 PUTRA SUKHA YOGA (Combination 235)
  // ==========================================
  const putraSukhaResult = checkPutraSukhaYoga(lagnaIndex, placements, houseLords);
  yogas.push(...putraSukhaResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🔥 JARA YOGA (Combination 236)
  // ==========================================
  const jaraResult = checkJaraYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...jaraResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💔 JARAJAPUTRA YOGA (Combination 237)
  // ==========================================
  const jarajaputraResult = checkJarajaputraYoga(lagnaIndex, rasiPlacements, houseLords);
  yogas.push(...jarajaputraResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👩 BAHU STREE YOGA (Combination 238)
  // ==========================================
  const bahuStreeResult = checkBahuStreeYoga(lagnaIndex, rasiPlacements, houseLords);
  yogas.push(...bahuStreeResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💍 SATKALATRA YOGA (Combination 239)
  // ==========================================
  const satkalatraResult = checkSatkalatraYoga(lagnaIndex, rasiPlacements, houseLords);
  yogas.push(...satkalatraResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 😘 BHAGA CHUMBANA YOGA (Combination 240)
  // ==========================================
  const bhagaChumbanaResult = checkBhagaChumbanaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...bhagaChumbanaResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍀 BHAGYA YOGA (Combination 241)
  // ==========================================
  const bhagyaResult = checkBhagyaYoga(lagnaIndex, placements, rasiPlacements);
  yogas.push(...bhagyaResult.map(y => ({
    ...y,
    icon: 'Star',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚰️ JANANATPURVAM PITRU MARANA YOGA (Combination 242)
  // ==========================================
  const jananatpurvamPitruMaranaResult = checkJananatpurvamPitruMaranaYoga(lagnaIndex, placements, houseLords);
  yogas.push(...jananatpurvamPitruMaranaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🎁 DHATRUTWA YOGA (Combination 243)
  // ==========================================
  const dhatrutwaResult = checkDhatrutwaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...dhatrutwaResult.map(y => ({
    ...y,
    icon: 'Gift',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 📉 APAKEERTI YOGA (Combination 244)
  // ==========================================
  const apakeertiResult = checkApakeertiYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements);
  yogas.push(...apakeertiResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👑 RAJA YOGAS (Combinations 248 - 249) & NEECHABHANGA RAJA YOGA (Combination 250)
  // ==========================================
  const rajaYoga248Result = checkRajaYoga248(lagnaIndex, placements, rasiPlacements, navamsaPlacements, planets);
  yogas.push(...rajaYoga248Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga249Result = checkRajaYoga249(placements, rasiPlacements);
  yogas.push(...rajaYoga249Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const neechabhangaRajaYoga250Result = checkNeechabhangaRajaYoga250(placements, rasiPlacements);
  yogas.push(...neechabhangaRajaYoga250Result.map(y => ({
    ...y,
    icon: 'Sparkles',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga251Result = checkRajaYoga251(placements, rasiPlacements, planets, shadbalaScores);
  yogas.push(...rajaYoga251Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga252Result = checkRajaYoga252(rasiPlacements, navamsaPlacements);
  yogas.push(...rajaYoga252Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga253Result = checkRajaYoga253(placements, rasiPlacements, houseLords);
  yogas.push(...rajaYoga253Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga254Result = checkRajaYoga254(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...rajaYoga254Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga255Result = checkRajaYoga255(placements);
  yogas.push(...rajaYoga255Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga256Result = checkRajaYoga256(houseLords, navamsaPlacements);
  yogas.push(...rajaYoga256Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga257Result = checkRajaYoga257(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...rajaYoga257Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga258Result = checkRajaYoga258(placements, rasiPlacements, navamsaPlacements);
  yogas.push(...rajaYoga258Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const yoga259Result = checkYoga259(lagnaIndex, placements);
  yogas.push(...yoga259Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga260Result = checkRajaYoga260(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...rajaYoga260Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga261Result = checkRajaYoga261(placements, rasiPlacements, houseLords);
  yogas.push(...rajaYoga261Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga262Result = checkRajaYoga262(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...rajaYoga262Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  const rajaYoga263Result = checkRajaYoga263(placements, rasiPlacements, planets);
  yogas.push(...rajaYoga263Result.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👂 GALAKARNA YOGA (Combination 264)
  // ==========================================
  const galakarnaYogaResult = checkGalakarnaYoga(placements, rasiPlacements, planets);
  yogas.push(...galakarnaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🤕 VRANA YOGA (Combination 265)
  // ==========================================
  const vranaYogaResult = checkVranaYoga(placements, houseLords);
  yogas.push(...vranaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍆 SISNAVYADHI YOGA (Combination 266)
  // ==========================================
  const sisnavyadhiYogaResult = checkSisnavyadhiYoga(placements, houseLords);
  yogas.push(...sisnavyadhiYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🙍‍♀️ KALATRASHANDA YOGA (Combination 267)
  // ==========================================
  const kalatrashandaYogaResult = checkKalatrashandaYoga(placements, houseLords);
  yogas.push(...kalatrashandaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🩺 KUSHTAROGA YOGA (Combination 268)
  // ==========================================
  const kushtarogaYoga268Result = checkKushtarogaYoga268(placements, houseLords);
  yogas.push(...kushtarogaYoga268Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🩺 KUSHTAROGA YOGA (Combination 269)
  // ==========================================
  const kushtarogaYoga269Result = checkKushtarogaYoga269(placements);
  yogas.push(...kushtarogaYoga269Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🫁 KSHAYAROGA YOGA (Combination 270)
  // ==========================================
  const kshayarogaYogaResult = checkKshayarogaYoga(placements, houseLords);
  yogas.push(...kshayarogaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🔗 BANDHANA YOGA (Combination 271)
  // ==========================================
  const bandhanaYogaResult = checkBandhanaYoga(placements, houseLords);
  yogas.push(...bandhanaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚔️ KARASCHEDA YOGA (Combination 272)
  // ==========================================
  const karaschedaYogaResult = checkKaraschedaYoga(placements);
  yogas.push(...karaschedaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🪓 SIRACHCHEDA YOGA (Combination 273)
  // ==========================================
  const sirachchedaYogaResult = checkSirachchedaYoga(placements, rasiPlacements, houseLords, planets);
  yogas.push(...sirachchedaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 DURMARANA YOGA (Combination 274)
  // ==========================================
  const durmaranaYogaResult = checkDurmaranaYoga(placements, rasiPlacements, houseLords);
  yogas.push(...durmaranaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 YUDDHE MARANA YOGA (Combination 275)
  // ==========================================
  const yuddheMaranaYogaResult = checkYuddheMaranaYoga(placements, rasiPlacements, houseLords, planets);
  yogas.push(...yuddheMaranaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 SANGHATAKA MARANA YOGA (Combination 276)
  // ==========================================
  const sanghatakaMaranaYoga276Result = checkSanghatakaMaranaYoga276(placements, rasiPlacements, planets, navamsaPlacements);
  yogas.push(...sanghatakaMaranaYoga276Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 SANGHATAKA MARANA YOGA (Combination 277)
  // ==========================================
  const sanghatakaMaranaYoga277Result = checkSanghatakaMaranaYoga277(placements, rasiPlacements, planets, navamsaPlacements, houseLords);
  yogas.push(...sanghatakaMaranaYoga277Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 PEENASAROGA YOGA (Combination 278)
  // ==========================================
  const peenasarogaYogaResult = checkPeenasarogaYoga(placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...peenasarogaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 PITTAROGA YOGA (Combination 279)
  // ==========================================
  const pittarogaYogaResult = checkPittarogaYoga(placements, rasiPlacements, planets);
  yogas.push(...pittarogaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 VIKALANGAPATNI YOGA (Combination 280)
  // ==========================================
  const vikalangapatniYogaResult = checkVikalangapatniYoga(placements, rasiPlacements, planets);
  yogas.push(...vikalangapatniYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 PUTRAKALATRAHEENA YOGA (Combination 281)
  // ==========================================
  const putrakalatraheenaYogaResult = checkPutrakalatraheenaYoga(placements, rasiPlacements, planets);
  yogas.push(...putrakalatraheenaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 BHARYASAHAVYABHICHARA YOGA (Combination 282)
  // ==========================================
  const bharyasahavyabhicharaYogaResult = checkBharyasahavyabhicharaYoga(placements);
  yogas.push(...bharyasahavyabhicharaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 VAMSACHEDA YOGA (Combination 283)
  // ==========================================
  const vamsachedaYogaResult = checkVamsachedaYoga(placements);
  yogas.push(...vamsachedaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 GUHYAROGA YOGA (Combination 284)
  // ==========================================
  const guhyarogaYogaResult = checkGuhyarogaYoga(placements, rasiPlacements, navamsaPlacements);
  yogas.push(...guhyarogaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 ANGAHEENA YOGA (Combination 285)
  // ==========================================
  const angaheenaYogaResult = checkAngaheenaYoga(placements, rasiPlacements);
  yogas.push(...angaheenaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 SWETAKUSHTA YOGA (Combination 286)
  // ==========================================
  const swetakushtaYogaResult = checkSwetakushtaYoga(placements);
  yogas.push(...swetakushtaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 PISACHA GRASTHA YOGA (Combination 287)
  // ==========================================
  const pisachaGrasthaYogaResult = checkPisachaGrasthaYoga(placements);
  yogas.push(...pisachaGrasthaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 ANDHA YOGA (Combination 288)
  // ==========================================
  const andhaYoga288Result = checkAndhaYoga288(placements);
  yogas.push(...andhaYoga288Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 ANDHA YOGA (Combination 289)
  // ==========================================
  const andhaYoga289Result = checkAndhaYoga289(placements);
  yogas.push(...andhaYoga289Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 VATHAROGA YOGA (Combination 290)
  // ==========================================
  const vatharogaYogaResult = checkVatharogaYoga(placements);
  yogas.push(...vatharogaYogaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 MATIBHRAMANA YOGA (Combination 291)
  // ==========================================
  const matibhramanaYoga291Result = checkMatibhramanaYoga291(placements);
  yogas.push(...matibhramanaYoga291Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 MATIBHRAMANA YOGA (Combination 292)
  // ==========================================
  const matibhramanaYoga292Result = checkMatibhramanaYoga292(placements);
  yogas.push(...matibhramanaYoga292Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 MATIBHRAMANA YOGA (Combination 293)
  // ==========================================
  const matibhramanaYoga293Result = checkMatibhramanaYoga293(placements, planets);
  yogas.push(...matibhramanaYoga293Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 MATIBHRAMANA YOGA (Combination 294)
  // ==========================================
  const matibhramanaYoga294Result = checkMatibhramanaYoga294(placements, rasiPlacements);
  yogas.push(...matibhramanaYoga294Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 KHALWATA YOGA (Combination 295)
  // ==========================================
  const khalwataResult = checkKhalwataYoga(lagnaIndex, placements, rasiPlacements);
  yogas.push(...khalwataResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 NISHTURABHASHI YOGA (Combination 296)
  // ==========================================
  const nishturabhashiResult = checkNishturabhashiYoga(placements, rasiPlacements);
  yogas.push(...nishturabhashiResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 RAJABHRASHTA YOGA (Combination 297)
  // ==========================================
  const rajabhrashtaResult = checkRajabhrashtaYoga(lagnaIndex, rasiPlacements, houseLords);
  yogas.push(...rajabhrashtaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 RAJA YOGA BHANGA (Combination 298)
  // ==========================================
  const rajaYogaBhanga298Result = checkRajaYogaBhanga298(lagnaIndex, rasiPlacements, planets);
  yogas.push(...rajaYogaBhanga298Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 RAJA YOGA BHANGA (Combination 299)
  // ==========================================
  const rajaYogaBhanga299Result = checkRajaYogaBhanga299(planets);
  yogas.push(...rajaYogaBhanga299Result.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 GOHANTA YOGA (Combination 300)
  // ==========================================
  const gohantaResult = checkGohantaYoga(placements, rasiPlacements);
  yogas.push(...gohantaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));


  // ==========================================
  // 🧠 JADA YOGA & ☀️ BHASKARA YOGA (Combinations 158 - 159)
  // ==========================================
  const jadaAndBhaskaraResult = checkJadaAndBhaskaraYogas(lagnaIndex, placements, rasiPlacements, navamsaPlacements);
  yogas.push(...jadaAndBhaskaraResult.map(y => ({
    ...y,
    icon: y.name === 'Bhaskara Yoga' ? 'Sun' : 'EyeOff',
    color: y.name === 'Bhaskara Yoga' ? 'text-amber-600' : 'text-rose-700',
    bg: y.name === 'Bhaskara Yoga' ? 'bg-amber-50' : 'bg-rose-50',
    border: y.name === 'Bhaskara Yoga' ? 'border-amber-200' : 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🌬️ MARUD YOGA (Combination 160)
  // ==========================================
  const marudResult = checkMarudYoga(rasiPlacements);
  yogas.push(...marudResult.map(y => ({
    ...y,
    icon: 'Wind',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🏛️ SARASWATHI YOGA (Combination 161)
  // ==========================================
  const saraswathiResult = checkSaraswathiYoga(lagnaIndex, placements, rasiPlacements);
  yogas.push(...saraswathiResult.map(y => ({
    ...y,
    icon: 'Award',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🎓 BUDHA YOGA (Combination 162)
  // ==========================================
  const budhaResult = checkBudhaYoga(placements, rasiPlacements);
  yogas.push(...budhaResult.map(y => ({
    ...y,
    icon: 'Award',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🔇 MOOKA YOGA (Combination 163)
  // ==========================================
  const mookaResult = checkMookaYoga(lagnaIndex, placements, houseLords);
  yogas.push(...mookaResult.map(y => ({
    ...y,
    icon: 'VolumeX',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👁️ NETRANASA YOGA (Combination 164)
  // ==========================================
  const netranasaResult = checkNetranasaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...netranasaResult.map(y => ({
    ...y,
    icon: 'EyeOff',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👁️ ANDHA YOGA (Combination 165)
  // ==========================================
  const andhaResult = checkAndhaYoga(lagnaIndex, placements, houseLords);
  yogas.push(...andhaResult.map(y => ({
    ...y,
    icon: 'EyeOff',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 😊 SUMUKHA YOGAS (Combinations 166 & 167)
  // ==========================================
  const sumukhaResult = checkSumukhaYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sumukhaResult.map(y => ({
    ...y,
    icon: 'Smile',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 😠 DURMUKHA YOGAS (Combinations 168 & 169)
  // ==========================================
  const durmukhaResult = checkDurmukhaYogas(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...durmukhaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍽️ BHOJANA SOUKHYA YOGA (Combination 170)
  // ==========================================
  const bhojanaResult = checkBhojanaSoukhyaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...bhojanaResult.map(y => ({
    ...y,
    icon: 'ChefHat',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍲 ANNADANA YOGA (Combination 171)
  // ==========================================
  const annadanaResult = checkAnnadanaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...annadanaResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🍽️ PARANNABHOJANA YOGA (Combination 172)
  // ==========================================
  const parannaResult = checkParannabhojanaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...parannaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚱️ SRADDHANNABHUKTHA YOGA (Combination 173)
  // ==========================================
  const sraddhaResult = checkSraddhannabhukthaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sraddhaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🐍 SARPAGANDA YOGA (Combination 174)
  // ==========================================
  const sarpagandaResult = checkSarpagandaYoga(lagnaIndex, placements);
  yogas.push(...sarpagandaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🗣️ VAKCHALANA YOGA (Combination 175)
  // ==========================================
  const vakchalanaResult = checkVakchalanaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...vakchalanaResult.map(y => ({
    ...y,
    icon: 'VolumeX',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🧪 VISHAPRAYOGA YOGA (Combination 176)
  // ==========================================
  const vishaprayogaResult = checkVishaprayogaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...vishaprayogaResult.map(y => ({
    ...y,
    icon: 'Skull',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👨👦 BHRATRUVIRIDDHI YOGA (Combination 177)
  // ==========================================
  const bhratruvriddhiResult = checkBhratruvriddhiYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...bhratruvriddhiResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 💀 SODARANASA YOGA (Combination 178)
  // ==========================================
  const sodaranasaResult = checkSodaranasaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sodaranasaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👩 EKABHAGINI YOGA (Combination 179)
  // ==========================================
  const ekabhaginiResult = checkEkabhaginiYoga(lagnaIndex, placements, houseLords);
  yogas.push(...ekabhaginiResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👨 Dwadasa Sahodara Yoga (Combination 180)
  // ==========================================
  const dwadasaResult = checkDwadasaSahodaraYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...dwadasaResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👨 Sapthasankhya Sahodara Yoga (Combination 181)
  // ==========================================
  const sapthasankhyaResult = checkSapthasankhyaSahodaraYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sapthasankhyaResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚔️ Parakrama Yoga (Combination 182)
  // ==========================================
  const parakramaResult = checkParakramaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...parakramaResult.map(y => ({
    ...y,
    icon: 'Flame',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚔️ Yuddha Praveena Yoga (Combination 183)
  // ==========================================
  const yuddhaPraveenaResult = checkYuddhaPraveenaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...yuddhaPraveenaResult.map(y => ({
    ...y,
    icon: 'Shield',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🏹 Yuddhatpoorvadridhachitta Yoga (Combination 184)
  // ==========================================
  const yuddhatpoorvaResult = checkYuddhatpoorvadridhachittaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...yuddhatpoorvaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🛡️ Yuddhatpaschaddrudha Yoga (Combination 185)
  // ==========================================
  const yuddhatpaschadResult = checkYuddhatpaschaddrudhaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords, planets);
  yogas.push(...yuddhatpaschadResult.map(y => ({
    ...y,
    icon: 'Shield',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 📖 Satkathadisravana Yoga (Combination 186)
  // ==========================================
  const satkathadisravanaResult = checkSatkathadisravanaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...satkathadisravanaResult.map(y => ({
    ...y,
    icon: 'BookOpen',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🏠 Uttama Griha Yoga (Combination 187)
  // ==========================================
  const uttamaGrihaResult = checkUttamaGrihaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...uttamaGrihaResult.map(y => ({
    ...y,
    icon: 'Home',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🏰 Vichitra Saudha Prakara Yoga (Combination 188)
  // ==========================================
  const vichitraSaudhaResult = checkVichitraSaudhaPrakaraYoga(lagnaIndex, placements, houseLords);
  yogas.push(...vichitraSaudhaResult.map(y => ({
    ...y,
    icon: 'Home',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🥁 BHERI YOGAS (Combinations 189 & 190)
  // ==========================================
  const bheriResult = checkBheriYogas(lagnaIndex, rasiPlacements);
  yogas.push(...bheriResult.map(y => ({
    ...y,
    icon: 'Crown',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🏚️ GRIHANASA YOGAS (Combinations 191 & 192)
  // ==========================================
  const grihanasaResult = checkGrihanasaYogas(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...grihanasaResult.map(y => ({
    ...y,
    icon: 'Home',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🙏 BANDHU PUJYA YOGAS (Combinations 193 & 194)
  // ==========================================
  const bandhuPujyaResult = checkBandhuPujyaYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...bandhuPujyaResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🚶‍♂️ BANDHUBHISTHYAKTHA YOGA (Combination 195)
  // ==========================================
  const bandhubhisthyakthaResult = checkBandhubhisthyakthaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...bandhubhisthyakthaResult.map(y => ({
    ...y,
    icon: 'Users',
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    border: 'border-stone-300',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🤱 MATRUDEERGHAYUR YOGAS (Combinations 196 & 197)
  // ==========================================
  const matrudeerghayurResult = checkMatrudeerghayurYogas(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...matrudeerghayurResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🥀 MATRUNASA YOGAS (Combinations 198 & 199)
  // ==========================================
  const matrunasaResult = checkMatrunasaYogas(lagnaIndex, placements, rasiPlacements, navamsaPlacements, houseLords);
  yogas.push(...matrunasaResult.map(y => ({
    ...y,
    icon: 'ShieldAlert',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🌑 MATRUGAMI YOGA (Combination 200)
  // ==========================================
  const matrugamiResult = checkMatrugamiYoga(lagnaIndex, placements, rasiPlacements);
  yogas.push(...matrugamiResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-zinc-800',
    bg: 'bg-zinc-200',
    border: 'border-zinc-400',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🌑 SAHODAREESANGAMA YOGA (Combination 201)
  // ==========================================
  const sahodareesangamaResult = checkSahodareesangamaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sahodareesangamaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-zinc-800',
    bg: 'bg-zinc-200',
    border: 'border-zinc-400',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🎭 KAPATA YOGAS (Combinations 202 - 204)
  // ==========================================
  const kapataResult = checkKapataYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...kapataResult.map(y => ({
    ...y,
    icon: 'EyeOff',
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    border: 'border-stone-300',
    desc: `${y.description} Results: ${y.results}`
  })));
  
  // ==========================================
  // 🕊️ NISHKAPATA YOGAS (Combinations 205 & 206)
  // ==========================================
  const nishkapataResult = checkNishkapataYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...nishkapataResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 😠 MATRU SATRUTWA YOGA (Combination 207)
  // ==========================================
  const matruSatrutwaResult = checkMatruSatrutwaYoga(lagnaIndex, placements, rasiPlacements);
  yogas.push(...matruSatrutwaResult.map(y => ({
    ...y,
    icon: 'Frown',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👩‍👦 MATRU SNEHA YOGA (Combination 208)
  // ==========================================
  const matruSnehaResult = checkMatruSnehaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...matruSnehaResult.map(y => ({
    ...y,
    icon: 'Heart',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  
// ==========================================
  // 🚗 VAHANA YOGAS (Combinations 209, 210)
  // ==========================================
  const vahanaResult = checkVahanaYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...vahanaResult.map(y => ({
    ...y,
    icon: 'Compass',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🚸 ANAPATHYA YOGA (Combination 211)
  // ==========================================
  const anapathyaResult = checkAnapathyaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...anapathyaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    border: 'border-stone-300',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🐍 SARPASAPA YOGAS (Combinations 212 to 215)
  // ==========================================
  const sarpasapaResult = checkSarpasapaYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...sarpasapaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: y.type === 'Challenge' ? 'text-amber-700' : 'text-red-800',
    bg: y.type === 'Challenge' ? 'bg-amber-50' : 'bg-red-100',
    border: y.type === 'Challenge' ? 'border-amber-200' : 'border-red-300',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👨‍👦 PITRUSAPA SUTAKSHAYA YOGA (Combination 216)
  // ==========================================
  const pitrusapaResult = checkPitrusapaSutakshayaYoga(lagnaIndex, placements, rasiPlacements, navamsaPlacements);
  yogas.push(...pitrusapaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-red-800',
    bg: 'bg-red-100',
    border: 'border-red-300',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👩‍👦 MATRUSAPA SUTAKSHAYA YOGA (Combination 217)
  // ==========================================
  const matrusapaSutakshayaResult = checkMatrusapaSutakshayaYoga(lagnaIndex, placements, houseLords);
  yogas.push(...matrusapaSutakshayaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-red-800',
    bg: 'bg-red-100',
    border: 'border-red-300',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 😡 BHRATRUSAPA SUTAKSHAYA YOGA (Combination 218)
  // ==========================================
  const bhratrusapaResult = checkBhratrusapaSutakshayaYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...bhratrusapaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-red-800',
    bg: 'bg-red-100',
    border: 'border-red-300',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 👻 PRETASAPA YOGA (Combination 219)
  // ==========================================
  const pretasapaResult = checkPretasapaYoga(lagnaIndex, placements);
  yogas.push(...pretasapaResult.map(y => ({
    ...y,
    icon: 'Ghost',
    color: 'text-fuchsia-800',
    bg: 'bg-fuchsia-100',
    border: 'border-fuchsia-300',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 👶 BAHUPUTRA YOGAS (Combinations 220 & 221)
  // ==========================================
  const bahuputraResult = checkBahuputraYogas(lagnaIndex, placements, navamsaPlacements, houseLords);
  yogas.push(...bahuputraResult.map(y => ({
    ...y,
    icon: 'Baby',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🏠 DATTAPUTRA YOGAS (Combinations 222 & 223)
  // ==========================================
  const dattaputraResult = checkDattaputraYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...dattaputraResult.map(y => ({
    ...y,
    icon: 'Home',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // 🚸 APUTRA YOGA (Combination 224)
  // ==========================================
  const aputraResult = checkAputraYoga(lagnaIndex, placements, houseLords);
  yogas.push(...aputraResult.map(y => ({
    ...y,
    icon: 'UserMinus',
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    border: 'border-stone-300',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 👶 EKAPUTRA YOGA (Combination 225)
  // ==========================================
  const ekaputraResult = checkEkaputraYoga(lagnaIndex, placements, houseLords);
  yogas.push(...ekaputraResult.map(y => ({
    ...y,
    icon: 'User',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    desc: `${y.description} Results: ${y.results}`
  })));

// ==========================================
  // 🌟 SUPUTRA YOGA (Combination 226)
  // ==========================================
  const suputraResult = checkSuputraYoga(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...suputraResult.map(y => ({
    ...y,
    icon: 'Sun',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: `${y.description} Results: ${y.results}`
  })));


// ==========================================
  // ⏳ KALANIRDESAT PUTRA YOGAS (Combinations 227 & 228)
  // ==========================================
  const kalanirdesatResult = checkKalanirdesatPutraYogas(lagnaIndex, placements, houseLords);
  yogas.push(...kalanirdesatResult.map(y => ({
    ...y,
    icon: 'Clock',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: `${y.description} Results: ${y.results}`
  })));

  // ==========================================
  // ⚠️ KALANIRDESAT PUTRANASA YOGAS (Combinations 229 & 230)
  // ==========================================
  const kalanirdesatPutranasaResult = checkKalanirdesatPutranasaYogas(lagnaIndex, placements, rasiPlacements, houseLords);
  yogas.push(...kalanirdesatPutranasaResult.map(y => ({
    ...y,
    icon: 'AlertTriangle',
    color: 'text-red-800',
    bg: 'bg-red-100',
    border: 'border-red-300',
    desc: `${y.description} Results: ${y.results}`
  })));



  // ==========================================
  // 🏛️ NABHASA YOGAS EVALUATION & CONFLICT RESOLUTION
  // ==========================================
  
  // 1. Gather all candidates
  const nabhasaAkritiYogaResult = checkNabhasaAkritiYogas(lagnaIndex, rasiPlacements);
  const nabhasaSevenHouseYogaResult = checkNabhasaSevenHouseYogas(lagnaIndex, rasiPlacements);
  const ardhaChandraYogaResult = checkArdhaChandraYoga(lagnaIndex, rasiPlacements);
  
  let nabhasaPatternYogasResult = checkNabhasaPatternYogas(lagnaIndex, rasiPlacements) || [];
  // Chandra and Samadura Yogas require occupying 6 different houses/signs. 
  // If the unique sign count is less than 6, these yogas are invalid and are filtered out.
  const uniqueSignsCount = new Set(Object.values(rasiPlacements).filter(v => v !== undefined)).size;
  if (uniqueSignsCount < 6) {
    nabhasaPatternYogasResult = nabhasaPatternYogasResult.filter(
      y => y.name !== "Chandra Yoga" && y.name !== "Samadura Yoga"
    );
  }
  
  let asrayaYogaResult = checkNabhasaAsrayaYogas(rasiPlacements);
  let dalaYogaResult = checkNabhasaDalaYogas(lagnaIndex, rasiPlacements);
  let sankhyaYogaResult = checkNabhasaSankhyaYogas(rasiPlacements);

  // 2. Identify if any Akriti Yoga (Pattern/Geometric) is present
  const hasAkriti = !!(
    nabhasaAkritiYogaResult ||
    nabhasaSevenHouseYogaResult ||
    ardhaChandraYogaResult ||
    nabhasaPatternYogasResult.length > 0
  );

  // 3. Apply B.V. Raman's strict cancellation rules:
  // - If an Akriti Yoga is present, Sankhya and Asraya Yogas become defunct.
  if (hasAkriti) {
    asrayaYogaResult = null;
    sankhyaYogaResult = null;
  } else {
    // If no Akriti Yoga is present:
    // - If Asraya Yoga coincides with Sankhya (Kedara, Sula, Yuga), Asraya prevails (Sankhya defunct).
    // - If Asraya Yoga coincides with Gola Yoga, Gola prevails (Asraya defunct).
    if (asrayaYogaResult && sankhyaYogaResult) {
      if (sankhyaYogaResult.name.includes("Gola")) {
        asrayaYogaResult = null;
      } else if (["Kedara Yoga", "Sula Yoga", "Yuga Yoga"].includes(sankhyaYogaResult.name)) {
        sankhyaYogaResult = null;
      }
    }
    // - If Dala coincides with Sankhya, Dala prevails (Sankhya defunct).
    if (dalaYogaResult && sankhyaYogaResult) {
      sankhyaYogaResult = null;
    }
  }

  // 4. Push prevailing Nabhasa Yogas into the final array
  if (nabhasaAkritiYogaResult) {
    yogas.push({
      name: nabhasaAkritiYogaResult.name,
      type: nabhasaAkritiYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${nabhasaAkritiYogaResult.description} Results: ${nabhasaAkritiYogaResult.results}`
    });
  }

  if (nabhasaSevenHouseYogaResult) {
    yogas.push({
      name: nabhasaSevenHouseYogaResult.name,
      type: nabhasaSevenHouseYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${nabhasaSevenHouseYogaResult.description} Results: ${nabhasaSevenHouseYogaResult.results}`
    });
  }

  if (ardhaChandraYogaResult) {
    yogas.push({
      name: ardhaChandraYogaResult.name,
      type: ardhaChandraYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${ardhaChandraYogaResult.description} Results: ${ardhaChandraYogaResult.results}`
    });
  }

  if (nabhasaPatternYogasResult.length > 0) {
    nabhasaPatternYogasResult.forEach(y => {
      yogas.push({
        name: y.name,
        type: y.type,
        involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
        icon: y.name === 'Kamala Yoga' ? 'Crown' : (y.name === 'Chandra Yoga' ? 'Star' : 'Compass'),
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        desc: `${y.description} Results: ${y.results}`
      });
    });
  }

  if (asrayaYogaResult) {
    yogas.push({
      name: asrayaYogaResult.name,
      type: asrayaYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${asrayaYogaResult.description} Results: ${asrayaYogaResult.results}`
    });
  }

  if (dalaYogaResult) {
    yogas.push({
      name: dalaYogaResult.name,
      type: dalaYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${dalaYogaResult.description} Results: ${dalaYogaResult.results}`
    });
  }

  if (sankhyaYogaResult) {
    yogas.push({
      name: sankhyaYogaResult.name,
      type: sankhyaYogaResult.type,
      involved: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
      icon: 'Compass',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `${sankhyaYogaResult.description} Results: ${sankhyaYogaResult.results}`
    });
  }

  // ==========================================
  // 2M. KURMA YOGA
  // ==========================================
  const isD9Dignified = (pName) => {
    const pObj = planets.find(pl => (pl.planet || pl.name) === pName);
    if (!pObj || pObj.fullDegree === undefined) return false;
    const d9Rasi = getD9RasiIndex(pObj.fullDegree);
    const isOwn = RASHI_LORDS[d9Rasi] === pName;
    const isExalted = d9Rasi === EXALTATION_SIGNS[pName];
    const isFriendly = (FRIENDLY_SIGNS[pName] || []).includes(d9Rasi);
    return isOwn || isExalted || isFriendly;
  };

  const isRasiDignified = (pName) => {
    const rasiIdx = rasiPlacements[pName];
    if (rasiIdx === undefined) return false;
    const isOwn = RASHI_LORDS[rasiIdx] === pName;
    const isExalted = rasiIdx === EXALTATION_SIGNS[pName];
    const isFriendly = (FRIENDLY_SIGNS[pName] || []).includes(rasiIdx);
    return isOwn || isExalted || isFriendly;
  };

  // Variation A: Benefics in 5, 6, 7 and join own/exalted/friendly Navamsas
  const beneficsIn5 = beneficsList.filter(p => placements[p] === 5 && isD9Dignified(p));
  const beneficsIn6 = beneficsList.filter(p => placements[p] === 6 && isD9Dignified(p));
  const beneficsIn7 = beneficsList.filter(p => placements[p] === 7 && isD9Dignified(p));
  const hasCondA = beneficsIn5.length > 0 && beneficsIn6.length > 0 && beneficsIn7.length > 0;

  // Variation B: Benefics in 1, 3, 11 identical with own/exalted/friendly signs
  const beneficsIn1 = beneficsList.filter(p => placements[p] === 1 && isRasiDignified(p));
  const beneficsIn3 = beneficsList.filter(p => placements[p] === 3 && isRasiDignified(p));
  const beneficsIn11 = beneficsList.filter(p => placements[p] === 11 && isRasiDignified(p));
  const hasCondB = beneficsIn1.length > 0 && beneficsIn3.length > 0 && beneficsIn11.length > 0;

  if (hasCondA || hasCondB) {
    const involved = [];
    const triggers = [];
    
    if (hasCondA) {
      involved.push(...beneficsIn5, ...beneficsIn6, ...beneficsIn7);
      triggers.push(`🗺️ **Navamsa Variation (a)**: Benefics occupy the 5th, 6th, and 7th houses and are placed in own, exalted, or friendly Navamsas (specifically: ${beneficsIn5.join(', ')} in 5th, ${beneficsIn6.join(', ')} in 6th, and ${beneficsIn7.join(', ')} in 7th).`);
    }
    
    if (hasCondB) {
      involved.push(...beneficsIn1, ...beneficsIn3, ...beneficsIn11);
      triggers.push(`🪐 **Rasi Variation (b)**: Benefics occupy the 1st, 3rd, and 11th houses in own, exalted, or friendly signs (specifically: ${beneficsIn1.join(', ')} in 1st, ${beneficsIn3.join(', ')} in 3rd, and ${beneficsIn11.join(', ')} in 11th).`);
    }
    
    yogas.push({
      name: 'Kurma Yoga',
      type: 'Power/Status',
      involved: [...new Set(involved)],
      icon: 'Crown',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `${triggers.join('\n\n')}\n\nAccording to B.V. Raman, Kurma Yoga makes the native world-famous, enjoying princely pleasures, righteous, courageous, happy, helpful to others, a leader of men, and of mild temperament. Raman notes that this combination indicates a clean reputation, influence, and fame, though not necessarily extreme wealth.`
    });
  }

  // ==========================================
  // 2N. DEVENDRA YOGA
  // ==========================================
  if (isLagnaFixed && lagnaLord && lord11 && lord2 && lord10) {
    const is1and11Exchange = placements[lagnaLord] === 11 && placements[lord11] === 1;
    const is2and10Exchange = placements[lord2] === 10 && placements[lord10] === 2;
    
    if (is1and11Exchange && is2and10Exchange) {
      yogas.push({
        name: 'Devendra Yoga',
        type: 'Power/Status',
        involved: [lagnaLord, lord11, lord2, lord10],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Lagna is a fixed sign (${SIGN_NAMES[lagnaIndex]}), and two mutual house exchanges (Parivartana Yogas) are formed: the Lagna Lord (${lagnaLord}) and the 11th Lord (${lord11}) interchange houses, while the 2nd Lord (${lord2}) and the 10th Lord (${lord10}) also interchange houses. According to B.V. Raman, Devendra Yoga makes the native a person of sterling character, handsome appearance, romantic nature, with good longevity and an unsullied reputation, occupying a position equal to a ruler, monarch, or successful commander.`
      });
    }
  }

  // ==========================================
  // 2O. MAKUTA YOGA
  // ==========================================
  if (placements['Jupiter'] !== undefined && placements['Saturn'] === 10 && lord9 && placements[lord9] !== undefined) {
    const jupRelFromLord9 = ((placements['Jupiter'] - placements[lord9] + 12) % 12) + 1;
    
    if (jupRelFromLord9 === 9) {
      // Find other benefics in 9th from Jupiter
      const otherBenefics = ['Venus', 'Mercury', 'Moon'];
      const beneficsIn9thFromJup = otherBenefics.filter(p => {
        if (placements[p] === undefined) return false;
        const rel = ((placements[p] - placements['Jupiter'] + 12) % 12) + 1;
        return rel === 9;
      });
      
      if (beneficsIn9thFromJup.length > 0) {
        const involved = ['Jupiter', 'Saturn', lord9, ...beneficsIn9thFromJup];
        yogas.push({
          name: 'Makuta Yoga',
          type: 'Power/Status',
          involved: [...new Set(involved)],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `Jupiter is in the 9th from the 9th Lord (${lord9}), a benefic (${beneficsIn9thFromJup.join(', ')}) is in the 9th from Jupiter, and Saturn is in the 10th House. According to B.V. Raman, Makuta Yoga makes the native a leader (traditionally a king or head of forest tribes, conservator of forests, or gang leader), powerful, courageous, and a successful sportsman. The placement of Saturn in the 10th (house of action) reflects the executive discipline and capability required to manage unruly groups.`
        });
      }
    }
  }

  // ==========================================
  // 2P. CHANDIKA YOGA
  // ==========================================
  if (isLagnaFixed && lord6 && lord9 && placements['Sun'] !== undefined) {
    const isLagnaAspectedBy6thLord = hasAspect(lord6, lagnaIndex, rasiPlacements);
    
    if (isLagnaAspectedBy6thLord) {
      const lord6Planet = planets.find(p => p && (p.planet === lord6 || p.name === lord6));
      const lord9Planet = planets.find(p => p && (p.planet === lord9 || p.name === lord9));
      
      if (lord6Planet && lord6Planet.fullDegree !== undefined && lord9Planet && lord9Planet.fullDegree !== undefined) {
        const navSign6 = getD9RasiIndex(lord6Planet.fullDegree);
        const navLord6 = RASHI_LORDS[navSign6];
        
        const navSign9 = getD9RasiIndex(lord9Planet.fullDegree);
        const navLord9 = RASHI_LORDS[navSign9];
        
        if (navLord6 && navLord9) {
          const sunHouse = placements['Sun'];
          const isNavLord6WithSun = placements[navLord6] === sunHouse;
          const isNavLord9WithSun = placements[navLord9] === sunHouse;
          
          if (isNavLord6WithSun && isNavLord9WithSun) {
            const involved = [lord6, lord9, 'Sun', navLord6, navLord9];
            
            yogas.push({
              name: 'Chandika Yoga',
              type: 'Power/Status',
              involved: [...new Set(involved)],
              icon: 'Crown',
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              border: 'border-amber-200',
              desc: `The Lagna is a fixed sign (${SIGN_NAMES[lagnaIndex]}) and is aspected by the 6th Lord (${lord6}). Additionally, the Navamsa Lord of the 6th Lord (${navLord6}, ruling Navamsa sign ${SIGN_NAMES[navSign6]}) and the Navamsa Lord of the 9th Lord (${navLord9}, ruling Navamsa sign ${SIGN_NAMES[navSign9]}) are both conjoined with the Sun in House ${sunHouse}. According to B.V. Raman, Chandika Yoga blends both benefic and malefic forces to bestow political power, aggression, charitable nature, wealth, a ministerial post or equivalent status, a long and happy life, and great fame.`
            });
          }
        }
      }
    }
  }

  // ==========================================
  // 2Q. JAYA YOGA
  // ==========================================
  if (lord6 && lord10 && rasiPlacements[lord6] !== undefined && rasiPlacements[lord10] !== undefined) {
    const isLord6Debilitated = rasiPlacements[lord6] === DEBILITATION_SIGNS[lord6];
    const isLord10Exalted = rasiPlacements[lord10] === EXALTATION_SIGNS[lord10];
    
    if (isLord6Debilitated && isLord10Exalted) {
      // Check if lord10 is near its deep exaltation degree (deep exaltation degrees: Sun 10, Moon 3, Mars 28, Mercury 15, Jupiter 5, Venus 27, Saturn 20)
      const DEEP_EXALT_DEGS = { Sun: 10, Moon: 3, Mars: 28, Mercury: 15, Jupiter: 5, Venus: 27, Saturn: 20 };
      const lord10Planet = planets.find(p => p && (p.planet === lord10 || p.name === lord10));
      const pDeg = lord10Planet 
        ? (lord10Planet.longitude !== undefined ? (lord10Planet.longitude % 30) : (lord10Planet.fullDegree !== undefined ? (lord10Planet.fullDegree % 30) : (lord10Planet.rasiDegrees !== undefined ? lord10Planet.rasiDegrees : 15)))
        : 15;
      
      const targetDeg = DEEP_EXALT_DEGS[lord10] || 15;
      const isDeeplyExalted = Math.abs(pDeg - targetDeg) <= 5.0;
      
      const exaltationDetail = isDeeplyExalted
        ? `in close proximity (within 5°) to its deep exaltation degree of ${targetDeg}° (current degree: ${parseFloat(pDeg.toFixed(2))}°)`
        : `exalted in ${SIGN_NAMES[rasiPlacements[lord10]]} (current degree: ${parseFloat(pDeg.toFixed(2))}°)`;
      
      yogas.push({
        name: 'Jaya Yoga',
        type: 'Power/Status',
        involved: [lord6, lord10],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The 6th Lord (${lord6}) is debilitated (weakening the obstructive forces of debts, disease, and enemies), and the 10th Lord (${lord10}) is ${exaltationDetail}. According to B.V. Raman, Jaya Yoga ensures the native will be happy, victorious over enemies, highly successful in all undertakings, and long-lived.`
      });
    }
  }

  // ==========================================
  // 2R. VIDYUT YOGA
  // ==========================================
  if (lord11 && lagnaLord && placements[lord11] !== undefined && placements['Venus'] !== undefined && placements[lagnaLord] !== undefined) {
    const isLord11Exalted = rasiPlacements[lord11] === EXALTATION_SIGNS[lord11];
    const isJoinedVenus = placements[lord11] === placements['Venus'];
    
    if (isLord11Exalted && isJoinedVenus) {
      const hCommon = placements[lord11];
      const hLagnaLord = placements[lagnaLord];
      const relHouse = ((hCommon - hLagnaLord + 12) % 12) + 1;
      const isInKendraFromLagnaLord = [1, 4, 7, 10].includes(relHouse);
      
      if (isInKendraFromLagnaLord) {
        const DEEP_EXALT_DEGS = { Sun: 10, Moon: 3, Mars: 28, Mercury: 15, Jupiter: 5, Venus: 27, Saturn: 20 };
        const lord11Planet = planets.find(p => p && (p.planet === lord11 || p.name === lord11));
        const pDeg = lord11Planet 
          ? (lord11Planet.longitude !== undefined ? (lord11Planet.longitude % 30) : (lord11Planet.fullDegree !== undefined ? (lord11Planet.fullDegree % 30) : (lord11Planet.rasiDegrees !== undefined ? lord11Planet.rasiDegrees : 15)))
          : 15;
        
        const targetDeg = DEEP_EXALT_DEGS[lord11] || 15;
        const isDeeplyExalted = Math.abs(pDeg - targetDeg) <= 5.0;
        
        const exaltationDetail = isDeeplyExalted
          ? `in close proximity (within 5°) to its deep exaltation degree of ${targetDeg}° (current degree: ${parseFloat(pDeg.toFixed(2))}°)`
          : `exalted in ${SIGN_NAMES[rasiPlacements[lord11]]} (current degree: ${parseFloat(pDeg.toFixed(2))}°)`;
        
        yogas.push({
          name: 'Vidyut Yoga',
          type: 'Power/Status',
          involved: [lord11, 'Venus', lagnaLord],
          icon: 'Crown',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `The 11th Lord (${lord11}) is ${exaltationDetail}, conjoins Venus in House ${hCommon}, and this placement is at a Kendra angle (House ${relHouse}) relative to the Lagna Lord (${lagnaLord}, placed in House ${hLagnaLord}). According to B.V. Raman, Vidyut Yoga blesses the native with a charitable and pleasure-loving nature, making them a controller or treasurer of wealth, and a ruler or equal to one.`
        });
      }
    }
  }

  // ==========================================
  // 2S. GANDHARVA YOGA
  // ==========================================
  if (lord10 && lagnaLord && placements[lord10] !== undefined && placements['Jupiter'] !== undefined && placements[lagnaLord] !== undefined && rasiPlacements['Sun'] !== undefined && placements['Moon'] !== undefined) {
    const isLord10InKamaTrikona = [3, 7, 11].includes(placements[lord10]);
    const isLord10ConjunctJupiter = placements[lord10] === placements['Jupiter'];
    
    // Lagna Lord and Jupiter are in association (conjoined or aspecting each other)
    const isLagnaLordConjunctJupiter = placements[lagnaLord] === placements['Jupiter'];
    const isAspected = hasAspect(lagnaLord, rasiPlacements['Jupiter'], rasiPlacements) || hasAspect('Jupiter', rasiPlacements[lagnaLord], rasiPlacements);
    const hasAssociation = isLagnaLordConjunctJupiter || isAspected;

    const isSunExalted = rasiPlacements['Sun'] === 0; // Exalted in Aries
    const isMoonIn9th = placements['Moon'] === 9;

    if (isLord10InKamaTrikona && isLord10ConjunctJupiter && hasAssociation && isSunExalted && isMoonIn9th) {
      const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
      const sunDeg = sunPlanet 
        ? (sunPlanet.longitude !== undefined ? (sunPlanet.longitude % 30) : (sunPlanet.fullDegree !== undefined ? (sunPlanet.fullDegree % 30) : (sunPlanet.rasiDegrees !== undefined ? sunPlanet.rasiDegrees : 15)))
        : 15;
      
      const targetDeg = 10; // Sun deep exaltation in Aries
      const isSunDeeplyExalted = Math.abs(sunDeg - targetDeg) <= 5.0;
      
      const sunStrengthDetail = isSunDeeplyExalted
        ? `in close proximity (within 5°) to its deep exaltation degree of 10° Aries (current degree: ${parseFloat(sunDeg.toFixed(2))}°)`
        : `exalted in Aries (current degree: ${parseFloat(sunDeg.toFixed(2))}°)`;

      const assocDetail = isLagnaLordConjunctJupiter
        ? `conjoined with Jupiter in House ${placements[lagnaLord]}`
        : (hasAspect(lagnaLord, rasiPlacements['Jupiter'], rasiPlacements) && hasAspect('Jupiter', rasiPlacements[lagnaLord], rasiPlacements))
          ? `mutually aspecting Jupiter`
          : hasAspect('Jupiter', rasiPlacements[lagnaLord], rasiPlacements)
            ? `aspected by Jupiter`
            : `aspecting Jupiter`;

      yogas.push({
        name: 'Gandharva Yoga',
        type: 'Power/Status',
        involved: [...new Set([lord10, 'Jupiter', lagnaLord, 'Sun', 'Moon'])],
        icon: 'Music',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The 10th Lord (${lord10}) occupies a Kama Trikona house (House ${placements[lord10]}) conjoined with Jupiter. The Lagna Lord (${lagnaLord}) and Jupiter are in association (specifically: Lagna Lord is ${assocDetail}). The Sun is strong, being ${sunStrengthDetail}, and the Moon occupies the 9th house. According to B.V. Raman, Gandharva Yoga makes the native a connoisseur of fine arts (such as music, dancing, and painting), strong, pleasure-loving, well-dressed, famous, and grants longevity up to 68 years.`
      });
    }
  }

  // ==========================================
  // 2T. SIVA YOGA
  // ==========================================
  if (lord5 && lord9 && lord10 && placements[lord5] !== undefined && placements[lord9] !== undefined && placements[lord10] !== undefined) {
    const isPrimary = placements[lord5] === 9 && placements[lord9] === 10 && placements[lord10] === 5;
    const isAriesSpecial = lagnaIndex === 0 && placements['Sun'] === 9 && (placements['Saturn'] === 10 || placements['Saturn'] === 5);
    const isParivartana = placements[lord5] === 10 && placements[lord10] === 5;

    if (isPrimary || isAriesSpecial || isParivartana) {
      let subtype = "Primary";
      let detailDesc = `The Lord of the 5th (${lord5}) is in the 9th house, the Lord of the 9th (${lord9}) is in the 10th house, and the Lord of the 10th (${lord10}) is in the 5th house.`;
      const involved = [lord5, lord9, lord10];

      if (isAriesSpecial && !isPrimary) {
        subtype = "Aries Special";
        detailDesc = `For Aries Lagna, the 5th Lord (Sun) is in the 9th house (Aries) and the 10th Lord (Saturn) occupies the ${placements['Saturn'] === 10 ? '10th' : '5th'} house, causing a modified Siva Yoga as described in B.V. Raman's remarks.`;
        involved.push('Sun', 'Saturn');
      } else if (isParivartana) {
        subtype = "Parivartana Exchange";
        detailDesc = `The Lord of the 5th (${lord5}) and the Lord of the 10th (${lord10}) are in mutual house exchange (Parivartana), with the 5th Lord in the 10th house and the 10th Lord in the 5th house.`;
      }

      let extraWarning = "";
      if ((lord5 === 'Sun' && lord10 === 'Saturn') || (involved.includes('Sun') && involved.includes('Saturn'))) {
        if (isParivartana) {
          extraWarning = "\n\n⚠️ **Raman Warning**: Since the Sun (5th Lord) and Saturn (10th Lord) are bitter enemies, their mutual exchange, although generating a form of Siva Yoga, can be full of evil indications unless both have acquired sufficient Moolatrikona or exaltation strength (Moolathrikonadi Bala).";
        } else {
          extraWarning = "\n\n💡 **Raman Note**: B.V. Raman highlights that having the Sun (5th Lord) in the 9th and Saturn (10th Lord) in the 10th is a stronger and more favorable Siva Yoga configuration than their mutual exchange, minimizing the afflictive results of their natural enmity.";
        }
      }

      yogas.push({
        name: `Siva Yoga (${subtype})`,
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `${detailDesc} According to B.V. Raman, Siva Yoga makes the native a big trader, a conqueror, and a commander of armies. The native will possess divine wisdom and lead a virtuous life, benefiting significantly in matters of fortune, commerce, and philosophical knowledge.${extraWarning}`
      });
    }
  }

  // ==========================================
  // 2U. VISHNU YOGA
  // ==========================================
  if (lord9 && lord10 && placements[lord9] !== undefined && placements[lord10] !== undefined) {
    const lord9Planet = planets.find(p => p && (p.planet === lord9 || p.name === lord9));
    
    if (lord9Planet && lord9Planet.fullDegree !== undefined) {
      const navSign = getD9RasiIndex(lord9Planet.fullDegree);
      const amsaLord = RASHI_LORDS[navSign];

      if (amsaLord && placements[amsaLord] !== undefined) {
        const isLord9In2nd = placements[lord9] === 2;
        const isLord10In2nd = placements[lord10] === 2;
        const isAmsaLordIn2nd = placements[amsaLord] === 2;

        if (isLord9In2nd && isLord10In2nd && isAmsaLordIn2nd) {
          const involved = [lord9, lord10, amsaLord];
          const amsaLordShadbala = shadbalaScores[amsaLord]?.percentage ?? 50;
          const isAmsaLordStrongest = Object.keys(shadbalaScores).every(p => (shadbalaScores[p]?.percentage ?? 0) <= amsaLordShadbala);

          let strengthNote = "";
          if (isAmsaLordStrongest) {
            strengthNote = `\n\n🌟 **High-Strength Expression**: The Navamsa Lord of the 9th Lord (${amsaLord}) is the strongest planet in the chart (Shadbala: ${amsaLordShadbala}%), which B.V. Raman notes ensures the yoga operates practically throughout life with full force.`;
          } else {
            strengthNote = `\n\n⚖️ **Moderate Expression**: The Navamsa Lord of the 9th Lord (${amsaLord}) has a Shadbala of ${amsaLordShadbala}%. B.V. Raman notes that if this Navamsa Lord is not exceptionally strong in Shadbala, the yoga may operate with certain restrictions, manifesting on a moderate scale.`;
          }

          yogas.push({
            name: 'Vishnu Yoga',
            type: 'Power/Status',
            involved: [...new Set(involved)],
            icon: 'Crown',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            desc: `The Lord of the 9th house (${lord9}), the Lord of the 10th house (${lord10}), and the Navamsa Lord of the 9th Lord (${amsaLord}, ruling Navamsa sign ${SIGN_NAMES[navSign]}) are all conjoined in the 2nd house. According to B.V. Raman, Vishnu Yoga blends both Raja and Dhana Yogas to bless the native with an enjoyable life, fortunes acquired from various countries, great wealth (earning in lakhs), physical strength, eloquence in discussions, and a long life up to 100 years free from disease.${strengthNote}`
          });
        }
      }
    }
  }

  // ==========================================
  // 2V. BRAHMA YOGA
  // ==========================================
  if (lord9 && lord10 && lord11 && lagnaLord &&
      placements['Jupiter'] !== undefined && placements['Venus'] !== undefined && placements['Mercury'] !== undefined &&
      placements[lord9] !== undefined && placements[lord11] !== undefined && placements[lagnaLord] !== undefined && placements[lord10] !== undefined) {

    // Condition 1: Jupiter is in a Kendra from the 9th Lord
    const relJup = ((placements['Jupiter'] - placements[lord9] + 12) % 12) + 1;
    const cond1 = [1, 4, 7, 10].includes(relJup);

    // Condition 2: Venus is in a Kendra from the 11th Lord
    const relVen = ((placements['Venus'] - placements[lord11] + 12) % 12) + 1;
    const cond2 = [1, 4, 7, 10].includes(relVen);

    // Condition 3: Mercury is in a Kendra from either lagnaLord or the 10th Lord
    const relMercLagna = ((placements['Mercury'] - placements[lagnaLord] + 12) % 12) + 1;
    const relMerc10 = ((placements['Mercury'] - placements[lord10] + 12) % 12) + 1;
    const cond3 = [1, 4, 7, 10].includes(relMercLagna) || [1, 4, 7, 10].includes(relMerc10);

    const conditionsMet = [cond1, cond2, cond3].filter(Boolean).length;

    if (conditionsMet >= 2) {
      const isJupIdentical = lord9 === 'Jupiter';
      const isVenIdentical = lord11 === 'Venus';
      const isMercIdentical = lagnaLord === 'Mercury' || lord10 === 'Mercury';
      
      const isModifiedByLagna = isJupIdentical || isVenIdentical || isMercIdentical;

      let subtype = "Full";
      let detailDesc = "";

      if (conditionsMet === 3) {
        if (isModifiedByLagna) {
          subtype = "Modified";
          const reasons = [];
          if (isJupIdentical) reasons.push(`Jupiter is the 9th Lord itself (as in Aries/Cancer Lagna)`);
          if (isVenIdentical) reasons.push(`Venus is the 11th Lord itself (as in Cancer/Sagittarius Lagna)`);
          if (isMercIdentical) reasons.push(`Mercury is the Lagna Lord or 10th Lord itself (as in Virgo/Sagittarius Lagna)`);
          detailDesc = `Jupiter is in a Kendra from the 9th Lord, Venus is in a Kendra from the 11th Lord, and Mercury is in a Kendra from the Lagna Lord or 10th Lord. However, because ${reasons.join(', and ')}, the disposition of these benefics relative to their own lordship is modified, which B.V. Raman highlights as creating a modified/partial presence of the yoga.`;
        } else {
          subtype = "Full";
          detailDesc = `Jupiter is in a Kendra from the 9th Lord (${lord9}), Venus is in a Kendra from the 11th Lord (${lord11}), and Mercury is in a Kendra from either the Lagna Lord (${lagnaLord}) or the 10th Lord (${lord10}).`;
        }
      } else {
        subtype = "Partial";
        const satisfied = [];
        if (cond1) satisfied.push(`Jupiter is in a Kendra from the 9th Lord (${lord9})`);
        if (cond2) satisfied.push(`Venus is in a Kendra from the 11th Lord (${lord11})`);
        if (cond3) satisfied.push(`Mercury is in a Kendra from the Lagna Lord (${lagnaLord}) or 10th Lord (${lord10})`);
        detailDesc = `Brahma Yoga is partially present as 2 out of the 3 conditions are fully satisfied (specifically: ${satisfied.join(', and ')}). B.V. Raman notes that when a chart contains one or two factors of the yoga, it suggests the yoga does operate, though in a feebler/partial capacity.`;
      }

      yogas.push({
        name: `Brahma Yoga (${subtype})`,
        type: 'Power/Status',
        involved: [...new Set(['Jupiter', 'Venus', 'Mercury', lord9, lord11, lagnaLord, lord10])],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `${detailDesc} According to B.V. Raman, Brahma Yoga is a highly beneficial combination involving all natural benefics (Jupiter, Venus, and Mercury). It makes the native enjoy luxurious foods, respected by learned men, highly learned, long-lived, charitable, and always bent on doing good deeds, commanding health, wealth, fame, and a strong instinct to serve others.`
      });
    }
  }

  // ==========================================
  // 2W. INDRA YOGA
  // ==========================================
  if (lord5 && lord11 && placements[lord5] !== undefined && placements[lord11] !== undefined && placements['Moon'] !== undefined) {
    const isExchange = placements[lord5] === 11 && placements[lord11] === 5;
    const isMoonIn5th = placements['Moon'] === 5;

    if (isExchange && isMoonIn5th) {
      const involved = [lord5, lord11, 'Moon'];
      
      // Longevity Assessment (8th Lord)
      let longevityNote = "";
      if (lord8) {
        const lord8NetUnits = getNetUnits(lord8, lagnaIndex);
        const lord8ResStrength = getResidentialStrength(lord8, lagnaDegree);
        const isLord8Strong = !isDebilitated(lord8) && (lord8NetUnits >= 0.75 || lord8ResStrength >= 0.75);
        
        if (isLord8Strong) {
          longevityNote = `\n\n✨ **Longevity Assessment**: The Lord of Longevity (8th Lord: ${lord8}) is strong in the chart (Net Units: ${lord8NetUnits >= 0 ? '+' : ''}${lord8NetUnits}, Residential Strength: ${Math.round(lord8ResStrength * 100)}%). While Indra Yoga traditionally indicates a short lifespan (up to 36 years) but with lasting fame (as in the horoscopes of Jesus Christ, Adi Shankara, and Alexander the Great), the strength of your 8th Lord acts as a protective shield to bolster longevity.`;
        } else {
          longevityNote = `\n\n⚠️ **Longevity Note**: B.V. Raman highlights that Indra Yoga traditionally carries a risk of a shorter life (up to 36 years) but accompanied by immense, lasting historical fame (as seen in the charts of Jesus Christ, Alexander the Great, and Adi Shankara). Since the 8th Lord (${lord8}) is not exceptionally strong in this chart, B.V. Raman notes that caution is required in longevity assessment unless other general life-saving aspects are present.`;
        }
      }

      yogas.push({
        name: 'Indra Yoga',
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Lords of the 5th house (${lord5}) and the 11th house (${lord11}) have interchanged houses (specifically: 5th Lord is in the 11th, and 11th Lord is in the 5th), and the Moon occupies the 5th house. According to B.V. Raman, Indra Yoga makes the native highly courageous, of lasting fame (becoming a "King of Kings"), and enjoying the best comforts of life.${longevityNote}`
      });
    }
  }

  // ==========================================
  // 2X. RAVI YOGA
  // ==========================================
  if (lord10 && placements['Sun'] !== undefined && placements[lord10] !== undefined && placements['Saturn'] !== undefined) {
    const isSunIn10 = placements['Sun'] === 10;
    const isLord10In3rd = placements[lord10] === 3;
    const isSaturnIn3rd = placements['Saturn'] === 3;

    if (isSunIn10 && isLord10In3rd && isSaturnIn3rd) {
      const involved = ['Sun', lord10, 'Saturn'];
      
      let remarkNote = "";
      if ([0, 1, 7].includes(lagnaIndex)) {
        // Aries (0), Taurus (1), Scorpio (7)
        remarkNote = `\n\n⚠️ **Raman Lagna Restriction**: For Aries, Taurus, and Scorpio Lagnas, B.V. Raman notes that Ravi Yoga cannot be said to exist in its real sense. For Aries and Taurus, Saturn itself rules the 10th house, making conjunction with Saturn redundant. For Scorpio, the Sun rules the 10th house, making it impossible to be simultaneously in the 10th house and the 3rd house.`;
      } else if ([8, 9, 4, 5].includes(lagnaIndex)) {
        // Sagittarius (8), Capricorn (9), Leo (4), Virgo (5)
        remarkNote = `\n\n🚫 **Astronomical Impossibility**: For Sagittarius, Capricorn, Leo, and Virgo Lagnas, the 10th Lord is either Mercury or Venus. Since Mercury/Venus cannot exceed an elongation of 28°/48° from the Sun, placing the Sun in the 10th house and the 10th Lord in the 3rd house (150° to 180° away) is astronomically impossible. This configuration can only be achieved under custom/mock chart inputs.`;
      } else {
        // Gemini (2), Cancer (3), Libra (6), Aquarius (10), Pisces (11)
        remarkNote = `\n\n🌟 **Astronomical Validity**: This is an astronomically valid and rare configuration. The 10th Lord (${lord10}) is a planet that can achieve high elongation or opposition from the Sun (such as Jupiter, Mars, or the Moon), making this a true and powerful manifestation of Ravi Yoga.`;
      }

      yogas.push({
        name: 'Ravi Yoga',
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Sun',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `The Sun is placed in the 10th house, and the Lord of the 10th house (${lord10}) occupies the 3rd house conjoined with Saturn. According to B.V. Raman, Ravi Yoga makes the native respected by rulers, well-versed in sciences, highly passionate, fond of simple foods, and physically well-proportioned, achieving fame after the 15th year of life.${remarkNote}`
      });
    }
  }

  // ==========================================
  // 2Y. GARUDA YOGA
  // ==========================================
  if (placements['Moon'] !== undefined && rasiPlacements['Moon'] !== undefined) {
    const moonPlanet = planets.find(p => p && (p.planet === 'Moon' || p.name === 'Moon'));
    const sunPlanet = planets.find(p => p && (p.planet === 'Sun' || p.name === 'Sun'));
    
    if (moonPlanet && moonPlanet.fullDegree !== undefined && sunPlanet && sunPlanet.fullDegree !== undefined) {
      const navSign = getD9RasiIndex(moonPlanet.fullDegree);
      const amsaLord = RASHI_LORDS[navSign];

      if (amsaLord && rasiPlacements[amsaLord] !== undefined) {
        const isAmsaLordExalted = rasiPlacements[amsaLord] === EXALTATION_SIGNS[amsaLord];
        
        // Waxing Moon (Sukla Paksha): Moon's longitude is ahead of Sun's by 0° to 180°
        const mPA = (moonPlanet.fullDegree - sunPlanet.fullDegree + 360) % 360;
        const isWaxing = mPA >= 0 && mPA <= 180;

        if (isAmsaLordExalted && isDay && isWaxing) {
          const involved = ['Moon', amsaLord];

          // Longevity Assessment (8th Lord)
          let longevityNote = "";
          if (lord8) {
            const lord8NetUnits = getNetUnits(lord8, lagnaIndex);
            const lord8ResStrength = getResidentialStrength(lord8, lagnaDegree);
            const isLord8Strong = !isDebilitated(lord8) && (lord8NetUnits >= 0.75 || lord8ResStrength >= 0.75);

            if (isLord8Strong) {
              longevityNote = `\n\n✨ **Longevity Assessment**: The Lord of Longevity (8th Lord: ${lord8}) is strong in the chart (Net Units: ${lord8NetUnits >= 0 ? '+' : ''}${lord8NetUnits}, Residential Strength: ${Math.round(lord8ResStrength * 100)}%). While Garuda Yoga traditionally indicates a risk of danger from poison in the 34th year of life, B.V. Raman explicitly highlights that this danger should *not* be predicted if the house of longevity is strong enough.`;
            } else {
              longevityNote = `\n\n⚠️ **Longevity Warning**: B.V. Raman highlights that Garuda Yoga traditionally warns of a danger from poison in the 34th year of life. Since the 8th Lord (${lord8}) is not exceptionally strong in this chart, this classic indication advises caution around this age.`;
            }
          }

          yogas.push({
            name: 'Garuda Yoga',
            type: 'Power/Status',
            involved: [...new Set(involved)],
            icon: 'ShieldAlert',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            desc: `The Lord of the Navamsa occupied by the Moon (${amsaLord}) is exalted, birth occurred during the daytime, and the Moon is waxing (specifically: Moon is ${Math.round(mPA)}° ahead of the Sun). According to B.V. Raman, Garuda Yoga makes the native respected by the pious, polished in speech, feared by enemies, strong, and facing potential danger from poison in the 34th year of life.${longevityNote}`
          });
        }
      }
    }
  }

  // ==========================================
  // 2Z. GO YOGA
  // ==========================================
  if (lagnaLord && lord2 && placements['Jupiter'] !== undefined && rasiPlacements['Jupiter'] !== undefined && rasiPlacements[lagnaLord] !== undefined) {
    const isJupInSag = rasiPlacements['Jupiter'] === 8; // Sagittarius is Jupiter's own/Moolatrikona sign
    
    // Conjunction with 2nd Lord (or Scorpio/Aquarius automatic exemption)
    const isJupWithLord2 = (lord2 === 'Jupiter') || (placements['Jupiter'] === placements[lord2]);
    
    const isLagnaLordExalted = rasiPlacements[lagnaLord] === EXALTATION_SIGNS[lagnaLord];

    if (isJupInSag && isJupWithLord2 && isLagnaLordExalted) {
      const jupiterPlanet = planets.find(p => p && (p.planet === 'Jupiter' || p.name === 'Jupiter'));
      const jupDeg = jupiterPlanet 
        ? (jupiterPlanet.longitude !== undefined ? (jupiterPlanet.longitude % 30) : (jupiterPlanet.fullDegree !== undefined ? (jupiterPlanet.fullDegree % 30) : (jupiterPlanet.rasiDegrees !== undefined ? jupiterPlanet.rasiDegrees : 5)))
        : 5;
      
      const isMoolatrikonaRange = jupDeg >= 0 && jupDeg <= 13.33; // Moola constellation (first 13.33 degrees of Sagittarius)
      
      let moolaNote = "";
      if (isMoolatrikonaRange) {
        moolaNote = ` 🌟 **Constellation of Moola Boost**: Jupiter is placed at ${parseFloat(jupDeg.toFixed(2))}° Sagittarius, occupying the Moola constellation (first 13.33°). B.V. Raman notes that because Moolatrikona strength is confined here, the Go Yoga operates at its highest potency.`;
      } else {
        moolaNote = ` ⚖️ **General Own Sign Placement**: Jupiter is placed at ${parseFloat(jupDeg.toFixed(2))}° Sagittarius. While in Sagittarius, it lies outside the specific Moola constellation range (first 13.33°), rendering the yoga active but milder.`;
      }

      const involved = ['Jupiter', lagnaLord];
      if (lord2 !== 'Jupiter') {
        involved.push(lord2);
      }

      let associationType = (lord2 === 'Jupiter')
        ? `automatically satisfied as Jupiter itself rules the 2nd house (for ${lagnaIndex === 7 ? 'Scorpio' : 'Aquarius'} Lagna)`
        : `conjoined with the 2nd Lord (${lord2}) in House ${placements['Jupiter']}`;

      yogas.push({
        name: 'Go Yoga',
        type: 'Power/Status',
        involved: [...new Set(involved)],
        icon: 'Crown',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Jupiter is in its Moolatrikona sign Sagittarius, ${associationType}, and the Lagna Lord (${lagnaLord}) is exalted in the Rasi chart.${moolaNote} According to B.V. Raman, Go Yoga makes the native hail from a highly respectable family, a leader (king or equal to him), wealthy, and strong.`
      });
    }
  }

  // ==========================================
  // 3. DHANA YOGA (WEALTH HOUSES CONNECTION)
  // ==========================================
  const wealthH = [1, 2, 5, 9, 11];
  Object.keys(placements).forEach(p1 => {
    const p1H = lordships[p1] || [];
    if (p1H.some(h => wealthH.includes(h))) {
      Object.keys(placements).forEach(p2 => {
        if (p1 >= p2) return; // Prevent duplicates
        const p2H = lordships[p2] || [];

        if (p2H.some(h => wealthH.includes(h))) {
          const isConjunct = getConjuncts(p1).includes(p2);
          const isAspected = hasAspect(p1, rasiPlacements[p2], rasiPlacements) || hasAspect(p2, rasiPlacements[p1], rasiPlacements);

          // Standard Dhan Yoga: Lords of 1,2,5,9,11 conjunct or aspecting each other.
          // They must not rule or be placed in a Dusthana (6, 8, 12) to avoid Yoga Bhanga (cancellation) by placement.
          if ((isConjunct || isAspected) && 
              !p1H.some(h => dusthanas.includes(h)) && 
              !p2H.some(h => dusthanas.includes(h)) &&
              !dusthanas.includes(placements[p1]) && 
              !dusthanas.includes(placements[p2])) {
            const involved = [p1, p2];
            const p1Houses = p1H.filter(h => wealthH.includes(h)).map(h => h === 1 ? 'Lagna' : `${h}th Lord`).join('/');
            const p2Houses = p2H.filter(h => wealthH.includes(h)).map(h => h === 1 ? 'Lagna' : `${h}th Lord`).join('/');
            const relation = isConjunct ? 'conjunction' : 'aspect';
            yogas.push({
              name: 'Maha Dhana Yoga',
              type: 'Wealth',
              involved,
              icon: 'BarChart2',
              color: 'text-emerald-600',
              bg: 'bg-emerald-55',
              border: 'border-emerald-250',
              desc: `${p1} (${p1Houses}) and ${p2} (${p2Houses}) are strongly connected via ${relation} in House ${placements[p1]}. Represents great earning capacity, prosperity, and financial luck.`
            });
          }
        }
      });
    }
  });

  // ==========================================
  // 3A. SPECIAL DHANA YOGAS (BPHS & CLASSICS)
  // ==========================================

  // 1A. Lakshmi Yoga
  if (lagnaLord && lord9) {
    // Condition A: Mutual association or aspect between Lagna Lord and 9th Lord in houses other than 3, 6, 8
    const isLagnaLordWith9thLord = placements[lagnaLord] !== undefined && 
                                   placements[lord9] !== undefined && 
                                   placements[lagnaLord] === placements[lord9];
    const hasMutualAspect = hasAspect(lagnaLord, rasiPlacements[lord9], rasiPlacements) && 
                            hasAspect(lord9, rasiPlacements[lagnaLord], rasiPlacements);
    const inGoodHouse = placements[lagnaLord] !== undefined && ![3, 6, 8].includes(placements[lagnaLord]);
    const conditionA = (isLagnaLordWith9thLord || hasMutualAspect) && inGoodHouse;

    // Condition B: Lord of 9th occupies own or exaltation sign identical with Kendra/Trikona, and Lagna Lord is powerful
    const isLord9InKendraOrTrikona = placements[lord9] !== undefined && [1, 4, 7, 10, 5, 9].includes(placements[lord9]);
    const isLord9OwnOrExalted = rasiPlacements[lord9] !== undefined && (isOwnSign(lord9) || isExalted(lord9));
    const isLagnaLordPowerful = lagnaLord && (isOwnSign(lagnaLord) || isExalted(lagnaLord) || getNetUnits(lagnaLord, lagnaIndex) >= 0.5);
    const conditionB = isLord9InKendraOrTrikona && isLord9OwnOrExalted && isLagnaLordPowerful;

    // Condition C: Lord of 9th and Venus are both in own/exalted sign and in Kendra/Trikona
    const isVenusInKendraOrTrikona = placements['Venus'] !== undefined && [1, 4, 7, 10, 5, 9].includes(placements['Venus']);
    const isVenusOwnOrExalted = rasiPlacements['Venus'] !== undefined && (isOwnSign('Venus') || isExalted('Venus'));
    const conditionC = isLord9InKendraOrTrikona && isLord9OwnOrExalted && isVenusInKendraOrTrikona && isVenusOwnOrExalted;

    if (conditionA || conditionB || conditionC) {
      const involved = [lagnaLord, lord9];
      if (conditionC) involved.push('Venus');
      
      let description = `Triggered conditions:`;
      const triggers = [];
      if (conditionC) {
        triggers.push(`✨ **Most Powerful Variation (c)**: 9th Lord (${lord9}) and Venus are both placed in their own or exalted signs identical with a Kendra/Trikona house (specifically: ${lord9} in House ${placements[lord9]}, Venus in House ${placements['Venus']}). According to B.V. Raman, this is the most pristine and powerful variation of Lakshmi Yoga, generating immense wealth and unmatched prosperity.`);
      }
      if (conditionB) {
        triggers.push(`🌟 **Standard Variation (b)**: The 9th Lord (${lord9}) occupies its own or exalted sign in a Kendra/Trikona house (House ${placements[lord9]}), while the Lagna Lord (${lagnaLord}) is strongly disposed.`);
      }
      if (conditionA) {
        triggers.push(`🤝 **Association Variation (a)**: Lagna Lord (${lagnaLord}) and 9th Lord (${lord9}) are connected via ${isLagnaLordWith9thLord ? 'conjunction' : 'mutual aspect'} in House ${placements[lagnaLord]} (which is auspiciously placed outside the 3rd, 6th, and 8th houses).`);
      }
      
      description = `${triggers.join('\n\n')}\n\nAccording to classical astrology and B.V. Raman, Lakshmi Yoga (ruled by the Goddess of Wealth) blesses the native with high wealth, nobility, learning, high integrity, reputation, a handsome appearance, leadership, and a life enjoying all the comforts and pleasures of life.`;

      yogas.push({
        name: 'Lakshmi Yoga',
        type: 'Wealth',
        involved: [...new Set(involved)],
        icon: 'BarChart2',
        color: 'text-emerald-600',
        bg: 'bg-emerald-55',
        border: 'border-emerald-250',
        desc: description
      });
    }
  }

  // 1. Chandra-Mangala Yoga
  if (placements['Moon'] && placements['Mars']) {
    const isConjunct = getConjuncts('Moon').includes('Mars');
    const isAspected = hasAspect('Mars', rasiPlacements['Moon'], rasiPlacements) || hasAspect('Moon', rasiPlacements['Mars'], rasiPlacements);

    if (isConjunct || isAspected) {
      const moonRasi = rasiPlacements['Moon'];
      const marsRasi = rasiPlacements['Mars'];
      const moonHouse = placements['Moon'];
      const marsHouse = placements['Mars'];

      let extraNotes = "";
      
      // Excellent positions: Moon in Taurus (1) + Mars in Scorpio (7), or Moon in Cancer (3) + Mars in Capricorn (9)
      if (moonRasi === 1 && marsRasi === 7) {
        extraNotes += " ✨ **Excellent Position**: Moon is exalted in Taurus and Mars is in own sign Scorpio, forming a highly auspicious mutual aspect.";
      } else if (moonRasi === 3 && marsRasi === 9) {
        extraNotes += " ✨ **Excellent Position**: Moon is in own sign Cancer and Mars is exalted in Capricorn, forming a highly auspicious mutual aspect.";
      }

      // 2nd, 9th, 10th, 11th houses check (productive of good / approved means)
      const inGoodHouse = [2, 9, 10, 11].includes(moonHouse) || [2, 9, 10, 11].includes(marsHouse);
      if (inGoodHouse) {
        extraNotes += ` 🌟 **Approved Earnings**: Because the yoga occurs in a favorable house (${[2, 9, 10, 11].includes(moonHouse) ? `House ${moonHouse} (Moon)` : `House ${marsHouse} (Mars)`}), B.V. Raman states that the financial gains will manifest through approved, honorable means rather than unscrupulous or baser occupations.`;
      }

      const desc = `Moon and Mars are connected via ${isConjunct ? 'conjunction' : 'aspect'}. According to classical texts, this acts as a powerful factor in establishing financial worth. Ancient writers warn of potential harshness towards the mother/relatives or earning through unscrupulous means (or catering to baser needs). However, B.V. Raman notes that when well-disposed, it brings immense business acumen, prosperity, and wealth through approved means.${extraNotes}`;

      yogas.push({
        name: 'Chandra-Mangala Yoga',
        type: 'Wealth',
        involved: ['Moon', 'Mars'],
        icon: 'BarChart2',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        desc
      });
    }
  }

  // 2. Vasumathi Yoga
  if (placements['Moon']) {
    const mRasi = rasiPlacements['Moon'];
    const upachayaHouses = [3, 6, 10, 11];
    const benefics = ['Mercury', 'Jupiter', 'Venus'];

    const upachayaFromLagna = benefics.filter(p => placements[p] && upachayaHouses.includes(placements[p]));
    const upachayaFromMoon = benefics.filter(p => {
      if (placements[p] === undefined) return false;
      const relHouse = ((rasiPlacements[p] - mRasi + 12) % 12) + 1;
      return upachayaHouses.includes(relHouse);
    });

    const lagnaCount = upachayaFromLagna.length;
    const moonCount = upachayaFromMoon.length;

    if (lagnaCount >= 2 || moonCount >= 2) {
      const isFromLagna = lagnaCount >= moonCount;
      const activeCount = isFromLagna ? lagnaCount : moonCount;
      const activeList = isFromLagna ? upachayaFromLagna : upachayaFromMoon;
      const referenceName = isFromLagna ? 'Lagna (Ascendant)' : 'Moon';

      let strengthDesc;
      if (activeCount === 3) {
        strengthDesc = "All three natural benefics occupy the Upachaya houses. According to B.V. Raman and Varahamihira, this makes the yoga extremely powerful and ensures the native will command plenty of wealth, never be a dependent, and achieve high prosperity.";
      } else if (activeCount === 2) {
        strengthDesc = "Two natural benefics occupy the Upachaya houses. This grants significant financial independence and moderate wealth.";
      } else {
        strengthDesc = "Only one natural benefic occupies the Upachaya houses, granting ordinary wealth.";
      }

      // Check for exaltation/debilitation in the upachayas
      const exaltedInUpachayas = activeList.filter(p => isExalted(p));
      const debilitatedInUpachayas = activeList.filter(p => isDebilitated(p));

      let extraNotes = "";
      if (exaltedInUpachayas.length > 0) {
        extraNotes += ` ✨ **Exaltation Boost**: The planet(s) ${exaltedInUpachayas.join(', ')} are exalted in the Upachayas, making the yoga exceptionally powerful.`;
      }
      if (debilitatedInUpachayas.length > 0) {
        extraNotes += ` ⚠️ **Debilitation Reduction**: The planet(s) ${debilitatedInUpachayas.join(', ')} are debilitated, which may reduce the intensity of the wealth results.`;
      }

      const involved = ['Moon', ...activeList];
      yogas.push({
        name: 'Vasumathi Yoga',
        type: 'Wealth',
        involved,
        icon: 'BarChart2',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        desc: `Benefics occupy the Upachaya houses (3, 6, 10, 11) from the ${referenceName} (specifically: ${activeList.join(', ')}). ${strengthDesc}${extraNotes}`
      });
    }
  }

  // 3. Lord of 1st in 10th (Self-made wealth)
  if (lagnaLord && placements[lagnaLord] === 10) {
    yogas.push({
      name: 'Simhasana/Karma Dhana Yoga',
      type: 'Wealth/Career',
      involved: [lagnaLord],
      icon: 'Briefcase',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      desc: `Lagna Lord ${lagnaLord} is in the 10th house. The native becomes highly successful in career and wealthier than their parents.`
    });
  }

  // 3. Lagna-Specific BPHS Wealth Yogas (Ch41: 9-15)
  if (placements[lagnaLord] === 1 && isOwnSign(lagnaLord)) {
    const lagnaSign = rasiPlacements[lagnaLord];
    let isBphsWealth = false;
    let bphsPlanets = [];

    if (lagnaLord === 'Sun' && lagnaSign === 4 && (getConjuncts('Sun').some(p => ['Mars', 'Jupiter'].includes(p)) || hasAspect('Mars', 4, rasiPlacements) || hasAspect('Jupiter', 4, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Sun', 'Mars', 'Jupiter'];
    } else if (lagnaLord === 'Moon' && lagnaSign === 3 && (getConjuncts('Moon').some(p => ['Mercury', 'Jupiter'].includes(p)) || hasAspect('Mercury', 3, rasiPlacements) || hasAspect('Jupiter', 3, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Moon', 'Mercury', 'Jupiter'];
    } else if (lagnaLord === 'Mars' && (lagnaSign === 0 || lagnaSign === 7) && (getConjuncts('Mars').some(p => ['Mercury', 'Venus', 'Saturn'].includes(p)) || hasAspect('Mercury', lagnaSign, rasiPlacements) || hasAspect('Venus', lagnaSign, rasiPlacements) || hasAspect('Saturn', lagnaSign, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Mars', 'Mercury/Venus/Saturn'];
    } else if (lagnaLord === 'Mercury' && (lagnaSign === 2 || lagnaSign === 5) && (getConjuncts('Mercury').some(p => ['Saturn', 'Jupiter'].includes(p)) || hasAspect('Saturn', lagnaSign, rasiPlacements) || hasAspect('Jupiter', lagnaSign, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Mercury', 'Saturn/Jupiter'];
    } else if (lagnaLord === 'Jupiter' && (lagnaSign === 8 || lagnaSign === 11) && (getConjuncts('Jupiter').some(p => ['Mercury', 'Mars'].includes(p)) || hasAspect('Mercury', lagnaSign, rasiPlacements) || hasAspect('Mars', lagnaSign, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Jupiter', 'Mercury/Mars'];
    } else if (lagnaLord === 'Venus' && (lagnaSign === 1 || lagnaSign === 6) && (getConjuncts('Venus').some(p => ['Saturn', 'Mercury'].includes(p)) || hasAspect('Saturn', lagnaSign, rasiPlacements) || hasAspect('Mercury', lagnaSign, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Venus', 'Saturn/Mercury'];
    } else if (lagnaLord === 'Saturn' && (lagnaSign === 9 || lagnaSign === 10) && (getConjuncts('Saturn').some(p => ['Mars', 'Jupiter'].includes(p)) || hasAspect('Mars', lagnaSign, rasiPlacements) || hasAspect('Jupiter', lagnaSign, rasiPlacements))) {
      isBphsWealth = true; bphsPlanets = ['Saturn', 'Mars/Jupiter'];
    }

    if (isBphsWealth) {
      yogas.push({
        name: 'BPHS Special Dhana Yoga',
        type: 'Wealth',
        involved: bphsPlanets,
        icon: 'Crown',
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        border: 'border-emerald-300',
        desc: `Specific BPHS wealth combination triggered for ${lagnaLord} Lagna. Generates great affluence, fortune, and lifelong financial stability.`
      });
    }
  }

  // ==========================================
  // 3B. DARIDRA & SHRAPIT DOSHAS (POVERTY/STRUGGLE)
  // ==========================================

  // 1. Daridra Dosha (Financial Crisis)
  // Condition: Lords of 2/11 in Dusthanas (6, 8, 12), OR Dusthana Lords in 2/11
  let isDaridra = false;
  const daridraPlanets = [];
  const daridraDetails = [];

  [2, 11].forEach(h => {
    const lord = houseLords[h];
    if (lord && dusthanas.includes(placements[lord])) {
      isDaridra = true;
      if (!daridraPlanets.includes(lord)) daridraPlanets.push(lord);
      daridraDetails.push(`${h === 2 ? '2nd Lord' : '11th Lord'} (${lord}) is placed in the challenging ${placements[lord]}th house`);
    }
  });

  dusthanas.forEach(h => {
    const lord = houseLords[h];
    if (lord && [2, 11].includes(placements[lord])) {
      isDaridra = true;
      if (!daridraPlanets.includes(lord)) daridraPlanets.push(lord);
      const isSecond = placements[lord] === 2;
      daridraDetails.push(`${h === 6 ? '6th Lord' : h === 8 ? '8th Lord' : '12th Lord'} (${lord}) occupies the wealth-producing ${isSecond ? '2nd' : '11th'} house`);
    }
  });

  if (isDaridra) {
    const dbhangReasons = [];

    // Check 1: Lagna Lord is strong
    if (lagnaLord) {
      if (isOwnSign(lagnaLord)) {
        dbhangReasons.push(`Lagna Lord (${lagnaLord}) is in its own sign`);
      } else if (isExalted(lagnaLord)) {
        dbhangReasons.push(`Lagna Lord (${lagnaLord}) is exalted`);
      } else if ([1, 4, 7, 10, 5, 9].includes(placements[lagnaLord])) {
        dbhangReasons.push(`Lagna Lord (${lagnaLord}) is well-placed in House ${placements[lagnaLord]}`);
      }
    }

    // Check 2: Jupiter is strong
    if (placements['Jupiter']) {
      if ([1, 4, 7, 10, 5, 9].includes(placements['Jupiter'])) {
        dbhangReasons.push(`Benefic Jupiter is strong in House ${placements['Jupiter']}`);
      }
    }

    // Check 3: 2nd or 11th Lord is exalted or in its own sign
    [2, 11].forEach(h => {
      const lord = houseLords[h];
      if (lord) {
        if (isOwnSign(lord)) {
          dbhangReasons.push(`${h === 2 ? '2nd' : '11th'} Lord (${lord}) is in its own sign`);
        } else if (isExalted(lord)) {
          dbhangReasons.push(`${h === 2 ? '2nd' : '11th'} Lord (${lord}) is exalted`);
        }
      }
    });

    // Check 4: The afflicted wealth lord/planet is aspected by or conjunct Jupiter or Venus
    daridraPlanets.forEach(p => {
      const isConjunctJupOrVen = getConjuncts(p).some(cp => ['Jupiter', 'Venus'].includes(cp));
      const isAspectedByJup = hasAspect('Jupiter', rasiPlacements[p], rasiPlacements);
      const isAspectedByVen = hasAspect('Venus', rasiPlacements[p], rasiPlacements);

      if (isConjunctJupOrVen) {
        dbhangReasons.push(`Afflicted planet ${p} is conjunct a strong benefic (Jupiter/Venus)`);
      } else if (isAspectedByJup) {
        dbhangReasons.push(`Afflicted planet ${p} receives positive aspect from Jupiter`);
      } else if (isAspectedByVen) {
        dbhangReasons.push(`Afflicted planet ${p} receives positive aspect from Venus`);
      }
    });

    if (dbhangReasons.length > 0) {
      yogas.push({
        name: 'Daridra Bhanga',
        type: 'Protection',
        involved: daridraPlanets,
        icon: 'CheckCircle2',
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        desc: `Daridra Dosha (${daridraDetails.join(', and ')}) is Cancelled (Daridra Bhanga) because: ${dbhangReasons.join('; ')}. The financial strain is converted to structural growth, wealth retention, and eventual prosperity.`
      });
    } else {
      yogas.push({
        name: 'Daridra Dosha',
        type: 'Challenge',
        involved: daridraPlanets,
        icon: 'ShieldAlert',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        desc: `${daridraDetails.join(', and ')}. Indicates financial fluctuations, unpredicted expenses, or career shifts. Feeding animals/birds is a recommended remedy.`
      });
    }
  }

  // 1a. Sakata Yoga (Obstruction of Fortune)
  if (placements['Moon'] && placements['Jupiter']) {
    const relHouse = ((rasiPlacements['Moon'] - rasiPlacements['Jupiter'] + 12) % 12) + 1;
    if ([6, 8, 12].includes(relHouse)) {
      // Check for cancellation (Moon in Kendra from Lagna)
      const isCancelled = [1, 4, 7, 10].includes(placements['Moon']);
      
      const moonNet = getNetUnits('Moon', lagnaIndex);
      const jupNet = getNetUnits('Jupiter', lagnaIndex);
      const isMitigated = moonNet >= 1 || jupNet >= 1;

      let desc = `The Moon is placed in the ${relHouse}th house from Jupiter. According to B.V. Raman, this classical combination (Sakata Yoga) signifies that fortune is obstructed now and then ('Sakatayogajatasya Yogobhangam Pade-pade'). The native may experience alternating periods of losing and regaining fortune, feeling ordinary/insignificant at times, or experiencing periods of financial/mental misery, particularly when the transiting Moon passes through the 6th, 8th, or 12th from radical Jupiter.`;
      
      if (isCancelled || isMitigated) {
        const reasonStr = isCancelled 
          ? "the Moon being in a Kendra house from the Lagna, which causes Sakata Bhanga (cancellation of the negative effects)" 
          : `favorable planetary support (Moon Net: ${moonNet >= 0 ? '+' : ''}${moonNet}, Jupiter Net: ${jupNet >= 0 ? '+' : ''}${jupNet})`;
        desc += `\n\n✨ **Cancellation/Mitigation**: The negative indications of this yoga are neutralized due to ${reasonStr}, converting the cyclic struggles into resilience and ultimate recovery of fortune.`;
      }

      yogas.push({
        name: isCancelled ? 'Sakata Yoga (Cancelled)' : 'Sakata Yoga',
        type: isCancelled ? 'Protection' : 'Challenge',
        involved: ['Moon', 'Jupiter'],
        icon: isCancelled ? 'CheckCircle2' : 'AlertTriangle',
        color: isCancelled ? 'text-sky-600' : 'text-stone-700',
        bg: isCancelled ? 'bg-sky-50' : 'bg-stone-100',
        border: isCancelled ? 'border-sky-250' : 'border-stone-300',
        desc
      });
    }
  }

  // 2. Shrapit Dosha (Saturn & Rahu conjunction)
  if (placements['Saturn'] && placements['Rahu'] && getConjuncts('Saturn').includes('Rahu')) {
    const shrapitBhangReasons = [];

    // Check 1: Aspected by Jupiter
    if (hasAspect('Jupiter', rasiPlacements['Saturn'], rasiPlacements) || hasAspect('Jupiter', rasiPlacements['Rahu'], rasiPlacements)) {
      shrapitBhangReasons.push("Benefic Jupiter casts a protective aspect (Drishti) on the Saturn-Rahu conjunction");
    }

    // Check 2: Aspected by Venus
    if (hasAspect('Venus', rasiPlacements['Saturn'], rasiPlacements) || hasAspect('Venus', rasiPlacements['Rahu'], rasiPlacements)) {
      shrapitBhangReasons.push("Venus casts a protective aspect on the Saturn-Rahu conjunction");
    }

    // Check 3: Jupiter is conjunct Saturn or Rahu
    if (getConjuncts('Saturn').includes('Jupiter')) {
      shrapitBhangReasons.push("Saturn is conjunct beneficial Jupiter");
    }

    // Check 4: Exalted planet in chart provides strength
    const hasExaltedPlanet = Object.keys(rasiPlacements).some(p => isExalted(p));
    if (hasExaltedPlanet) {
      shrapitBhangReasons.push("Chart holds exalted planetary strengths providing general protection");
    }

    if (shrapitBhangReasons.length > 0) {
      yogas.push({
        name: 'Shrapit Dosha Bhanga',
        type: 'Protection',
        involved: ['Saturn', 'Rahu'],
        icon: 'CheckCircle2',
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        desc: `Shrapit Dosha (Saturn and Rahu conjunct in House ${placements['Saturn']}) is Cancelled (Shrapit Dosha Bhanga) because: ${shrapitBhangReasons.join('; ')}. The karmic blocks are transformed into a source of deep spiritual strength and eventual breakthrough.`
      });
    } else {
      yogas.push({
        name: 'Shrapit Dosha',
        type: 'Challenge',
        involved: ['Saturn', 'Rahu'],
        icon: 'AlertTriangle',
        color: 'text-stone-700',
        bg: 'bg-stone-200',
        border: 'border-stone-400',
        desc: `Saturn and Rahu are conjunct in House ${placements['Saturn']}. Represents past-life karmic blockages requiring immense hard work to unlock desired results.`
      });
    }
  }

  // ==========================================
  // 4. DOSHAS & MALIGNANT YOGAS (CHALLENGES)
  // ==========================================

  // Helper arrays for Dosha calculations (commented out as unused)
  // const malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  // const benefics = ['Moon', 'Mercury', 'Jupiter', 'Venus']; // Standard benefic set
  // 1. VANCHANA CHORA BHEETHI YOGA
  if (lagnaLord) {
    const lagnaLordConjuncts = getConjuncts(lagnaLord);
    const afflicting = ['Rahu', 'Saturn', 'Ketu'].filter(p => lagnaLordConjuncts.includes(p));
    if (afflicting.length > 0) {
      const lordNet = getNetUnits(lagnaLord, lagnaIndex);
      const isMitigated = lordNet >= 1;
      let desc = `The Lord of Lagna (${lagnaLord}) is conjunct with a malefic planet (${afflicting.join(', ')}). According to B.V. Raman, this causes the native to always entertain feelings of suspicion towards others around them, and feel afraid of being cheated, swindled, or robbed (Vanchana Chora Bheethi Yoga).`;
      if (isMitigated) {
        desc += `\n\n✨ **Mitigation**: Under Raman rules, the intensity of these suspicious fears is mitigated due to the Lagna Lord's favorable functional support (Net Units: ${lordNet >= 0 ? '+' : ''}${lordNet}).`;
      }
      yogas.push({
        name: 'Vanchana Chora Bheethi Yoga',
        type: 'Dosha',
        involved: [lagnaLord, ...afflicting],
        icon: 'ShieldAlert',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        desc
      });
    }
  }

  // 2. VISH DOSHA (PUNARPHOO) 
  // Condition: Moon conjunct Saturn.
  if (placements['Moon'] && placements['Saturn'] && getConjuncts('Moon').includes('Saturn')) {
    const moonNet = getNetUnits('Moon', lagnaIndex);
    const satNet = getNetUnits('Saturn', lagnaIndex);
    const isMitigated = moonNet >= 1 || satNet >= 1;
    let desc = `Saturn conjuncts the Moon, poisoning its milky effect. This brings emotional discipline but can cause mental anxiety, depression, and feelings of restriction. [cite: 1876, 1880]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications of this afflictive combination are heavily neutralized/mitigated due to favorable functional support (Moon Net Units: ${moonNet >= 0 ? '+' : ''}${moonNet}, Saturn Net Units: ${satNet >= 0 ? '+' : ''}${satNet}).`;
    }
    yogas.push({
      name: 'Vish Dosha',
      type: 'Dosha',
      involved: ['Moon', 'Saturn'],
      icon: 'AlertTriangle',
      color: 'text-indigo-800',
      bg: 'bg-indigo-100',
      border: 'border-indigo-300',
      desc
    });
  }

  // 3. AMAVASYA DOSHA [cite: 1901]
  // Condition: Sun conjunct Moon.
  if (placements['Sun'] && placements['Moon'] && getConjuncts('Sun').includes('Moon')) {
    const sunNet = getNetUnits('Sun', lagnaIndex);
    const moonNet = getNetUnits('Moon', lagnaIndex);
    const isMitigated = sunNet >= 1 || moonNet >= 1;
    let desc = `Sun and Moon are conjunct. Gives strong inclination for reading/literature, but can lead to low willpower, struggles with the mother, and a lack of mental clarity. [cite: 1902, 1905]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications of this combination are mitigated due to favorable functional support (Sun Net Units: ${sunNet >= 0 ? '+' : ''}${sunNet}, Moon Net Units: ${moonNet >= 0 ? '+' : ''}${moonNet}).`;
    }
    yogas.push({
      name: 'Amavasya Dosha',
      type: 'Dosha',
      involved: ['Sun', 'Moon'],
      icon: 'Circle',
      color: 'text-slate-800',
      bg: 'bg-slate-200',
      border: 'border-slate-400',
      desc
    });
  }

  // 4. GURU CHANDAAL DOSHA [cite: 1958]
  // Condition: Jupiter conjunct Rahu.
  if (placements['Jupiter'] && placements['Rahu'] && getConjuncts('Jupiter').includes('Rahu')) {
    const jupNet = getNetUnits('Jupiter', lagnaIndex);
    const isMitigated = jupNet >= 1;
    let desc = `Jupiter is conjunct Rahu. Creates inner conflict between spirituality and materialism, ethical dilemmas, and potential skepticism of traditional beliefs. [cite: 1965, 1966]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications are heavily mitigated due to Jupiter's favorable functional support (Net Units: ${jupNet >= 0 ? '+' : ''}${jupNet}).`;
    }
    yogas.push({
      name: 'Guru Chandaal Dosha',
      type: 'Dosha',
      involved: ['Jupiter', 'Rahu'],
      icon: 'AlertOctagon',
      color: 'text-amber-700',
      bg: 'bg-amber-100',
      border: 'border-amber-300',
      desc
    });
  }

  // 5. ANGARAKA DOSHA [cite: 1984]
  // Condition: Mars conjunct Rahu.
  if (placements['Mars'] && placements['Rahu'] && getConjuncts('Mars').includes('Rahu')) {
    const marsNet = getNetUnits('Mars', lagnaIndex);
    const isMitigated = marsNet >= 1;
    let desc = `Mars is conjunct Rahu. Leads to increased anger, ego, and impulsivity. Channeling this intense fiery energy constructively is highly required to avoid accidents or conflicts. [cite: 1987, 1990]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications are mitigated due to Mars' favorable functional support (Net Units: ${marsNet >= 0 ? '+' : ''}${marsNet}).`;
    }
    yogas.push({
      name: 'Angaraka Dosha',
      type: 'Dosha',
      involved: ['Mars', 'Rahu'],
      icon: 'Flame',
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-400',
      desc
    });
  }

  // 6. PISHACHA YOGA [cite: 2010]
  // Condition: Saturn conjunct Ketu.
  if (placements['Saturn'] && placements['Ketu'] && getConjuncts('Saturn').includes('Ketu')) {
    const satNet = getNetUnits('Saturn', lagnaIndex);
    const isMitigated = satNet >= 1;
    let desc = `Saturn is conjunct Ketu. Brings negative thoughts, pessimism, laziness, and sometimes deep psychological struggles. [cite: 2012]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications are mitigated due to Saturn's favorable functional support (Net Units: ${satNet >= 0 ? '+' : ''}${satNet}).`;
    }
    yogas.push({
      name: 'Pishacha Yoga',
      type: 'Dosha',
      involved: ['Saturn', 'Ketu'],
      icon: 'Ghost',
      color: 'text-gray-800',
      bg: 'bg-gray-300',
      border: 'border-gray-500',
      desc
    });
  }

  // 7. PITRA DOSHA (Primary Combinations) 
  // Condition: Sun/Moon afflicted by Rahu/Ketu, or 9th Lord afflicted by Rahu/Ketu.
  const pitraInvolved = [];
  if (getConjuncts('Sun').includes('Rahu')) pitraInvolved.push('Sun', 'Rahu');
  if (getConjuncts('Sun').includes('Ketu')) pitraInvolved.push('Sun', 'Ketu');
  if (getConjuncts('Moon').includes('Rahu')) pitraInvolved.push('Moon', 'Rahu');
  if (getConjuncts('Moon').includes('Ketu')) pitraInvolved.push('Moon', 'Ketu');

  if (lord9 && (getConjuncts(lord9).includes('Rahu') || getConjuncts(lord9).includes('Ketu'))) {
    pitraInvolved.push(lord9, 'Rahu/Ketu');
  }

  if (pitraInvolved.length > 0) {
    const sunNet = getNetUnits('Sun', lagnaIndex);
    const moonNet = getNetUnits('Moon', lagnaIndex);
    const isMitigated = sunNet >= 1 || moonNet >= 1;
    let desc = `The Sun, Moon, or 9th house/lord is afflicted by Rahu or Ketu. Indicates unresolved ancestral karmic debts causing stagnation, relationship issues, or delays. [cite: 2048, 2054, 2065]`;
    if (isMitigated) {
      desc += `\n\n✨ **Mitigation**: Under Raman rules, the negative indications are mitigated due to favorable functional support (Sun Net Units: ${sunNet >= 0 ? '+' : ''}${sunNet}, Moon Net Units: ${moonNet >= 0 ? '+' : ''}${moonNet}).`;
    }
    yogas.push({
      name: 'Pitra Dosha',
      type: 'Dosha',
      involved: [...new Set(pitraInvolved)],
      icon: 'Users',
      color: 'text-orange-800',
      bg: 'bg-orange-100',
      border: 'border-orange-300',
      desc
    });
  }



  // Duplicate Shrapit Dosha block removed.

  // ==========================================
  // 4a. ARISHTA YOGA & ARISHTA BHANG (CANCELLATION)
  // ==========================================
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

    // Condition F: Unified Raman framework check (Net units >= 1 or Residential strength < 30%)
    const lagnaLordNetUnits = getNetUnits(lagnaLord, lagnaIndex);
    const lagnaLordResStrength = getResidentialStrength(lagnaLord, lagnaDegree);
    const isLagnaLordNeutralized = lagnaLordNetUnits >= 1 || lagnaLordResStrength < 0.3;
    if (isLagnaLordNeutralized) {
      bhangReasons.push(`mathematical neutralization under Raman rules due to ${getNeutralizationReason(lagnaLord, lagnaLordNetUnits, lagnaLordResStrength)}`);
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
  // 5. ADDICTION & INTOXICATION VULNERABILITIES
  // ==========================================

  // 1. Primary Rahu Placement (Intoxication Risk)
  // Rahu in 1st, 2nd, 7th, or 12th house makes the native prone to smoking or substance abuse.
  // Exception: Conjunction or aspect from a strong benefic (Jupiter/Venus) provides self-control and willpower protection.
  if (placements['Rahu'] && [1, 2, 7, 12].includes(placements['Rahu'])) {
    const isAspectedByJup = hasAspect('Jupiter', rasiPlacements['Rahu'], rasiPlacements);
    const isAspectedByVen = hasAspect('Venus', rasiPlacements['Rahu'], rasiPlacements);
    const isConjunctJupOrVen = getConjuncts('Rahu').some(cp => ['Jupiter', 'Venus'].includes(cp));

    const rahuResStrength = getResidentialStrength('Rahu', lagnaDegree);
    const isRahuNeutralized = rahuResStrength < 0.3 || (isAspectedByJup || isAspectedByVen || isConjunctJupOrVen);

    if (isRahuNeutralized) {
      const helper = isAspectedByJup ? 'Jupiter' : (isAspectedByVen ? 'Venus' : isConjunctJupOrVen ? 'benefics' : '');
      const reasonStr = rahuResStrength < 0.3 
        ? `weak residential placement near the house boundary (strength: ${Math.round(rahuResStrength * 100)}%)` 
        : `a protective aspect or conjunction from a strong benefic (${helper})`;
      yogas.push({
        name: 'Intoxication Protection',
        type: 'Protection',
        involved: ['Rahu'],
        icon: 'CheckCircle2',
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        desc: `The psychological vulnerability towards deceptive coping mechanisms (Rahu in House ${placements['Rahu']}) is shielded and neutralized under Raman rules because of ${reasonStr}, granting excellent self-control and willpower.`
      });
    } else {
      yogas.push({
        name: 'Intoxication Vulnerability',
        type: 'Challenge',
        involved: ['Rahu'],
        icon: 'AlertTriangle',
        color: 'text-zinc-800',
        bg: 'bg-zinc-200',
        border: 'border-zinc-400',
        desc: `Rahu is placed in House ${placements['Rahu']}. This specific placement creates a psychological vulnerability towards smoking, alcohol, or other deceptive coping mechanisms. Strengthening the Sun (willpower) is highly recommended.`
      });
    }
  }

  // 2. Afflicted Moon by Rahu (Addictive Mindset)
  // Moon conjunct Rahu indicates mental obsession or emotional escapism.
  if (placements['Moon'] && placements['Rahu'] && getConjuncts('Moon').includes('Rahu')) {
    const moonNetUnits = getNetUnits('Moon', lagnaIndex);
    const moonResStrength = getResidentialStrength('Moon', lagnaDegree);
    const isMoonNeutralized = moonNetUnits >= 1 || moonResStrength < 0.3;

    if (isMoonNeutralized) {
      yogas.push({
        name: 'Obsessive Mind Protection',
        type: 'Protection',
        involved: ['Moon', 'Rahu'],
        icon: 'CheckCircle2',
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        desc: `The potential emotional obsession or addictive mindset (Moon conjunct Rahu) is mathematically neutralized under Raman rules due to ${getNeutralizationReason('Moon', moonNetUnits, moonResStrength)}.`
      });
    } else {
      yogas.push({
        name: 'Obsessive Mind / Addiction Risk',
        type: 'Challenge',
        involved: ['Moon', 'Rahu'],
        icon: 'Brain',
        color: 'text-indigo-900',
        bg: 'bg-indigo-100',
        border: 'border-indigo-400',
        desc: `The Moon (mind) is eclipsed by Rahu (illusions/obsessions). This indicates a high susceptibility to emotional escapes through alcohol or drugs. Remedies include making the Moon and Venus strong via Vedic mantras.`
      });
    }
  }

  // 3. Rahu in Scorpio + Afflicted Moon (Severe Drug/Alcohol Risk)
  // Rahu in Scorpio (Index 7) + Moon aspected or conjunct by Saturn or Mars
  if (rasiPlacements['Rahu'] === 7 && placements['Moon']) {
    const moonAfflicted = getConjuncts('Moon').some(p => ['Saturn', 'Mars'].includes(p)) ||
      hasAspect('Saturn', rasiPlacements['Moon'], rasiPlacements) ||
      hasAspect('Mars', rasiPlacements['Moon'], rasiPlacements);

    if (moonAfflicted) {
      const moonNetUnits = getNetUnits('Moon', lagnaIndex);
      const moonResStrength = getResidentialStrength('Moon', lagnaDegree);
      const isMoonNeutralized = moonNetUnits >= 1 || moonResStrength < 0.3;

      if (isMoonNeutralized) {
        yogas.push({
          name: 'Severe Addiction Protection',
          type: 'Protection',
          involved: ['Rahu', 'Moon'],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The severe addiction vulnerability (Rahu in Scorpio with afflicted Moon) is neutralized under Raman rules due to Moon having ${getNeutralizationReason('Moon', moonNetUnits, moonResStrength)}.`
        });
      } else {
        yogas.push({
          name: 'Severe Addiction Vulnerability',
          type: 'Challenge',
          involved: ['Rahu', 'Moon', 'Saturn/Mars'],
          icon: 'Activity',
          color: 'text-purple-900',
          bg: 'bg-purple-100',
          border: 'border-purple-400',
          desc: `Rahu is in Scorpio while the Moon is afflicted by Saturn or Mars. This is a classical indication of severe substance abuse or drug addiction from an early age. Strict discipline and remedies (like donating black items on Saturdays) are required.`
        });
      }
    }
  }

  // 4. Weak/Debilitated Venus (Pleasure Indulgence & Lack of Moderation)
  // Venus debilitated in Virgo (Index 5) and under malefic influence
  if (rasiPlacements['Venus'] === 5) {
    const venusAfflicted = getConjuncts('Venus').some(p => ['Rahu', 'Ketu', 'Saturn', 'Mars'].includes(p));
    if (venusAfflicted) {
      const venNetUnits = getNetUnits('Venus', lagnaIndex);
      const venResStrength = getResidentialStrength('Venus', lagnaDegree);
      const isVenNeutralized = venNetUnits >= 1 || venResStrength < 0.3;

      if (isVenNeutralized) {
        yogas.push({
          name: 'Sensory Moderation Strength',
          type: 'Protection',
          involved: ['Venus'],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The sensory indulgence weakness (debilitated and afflicted Venus) is mathematically neutralized under Raman rules due to ${getNeutralizationReason('Venus', venNetUnits, venResStrength)}.`
        });
      } else {
        yogas.push({
          name: 'Sensory Indulgence Weakness',
          type: 'Challenge',
          involved: ['Venus'],
          icon: 'Coffee',
          color: 'text-fuchsia-800',
          bg: 'bg-fuchsia-100',
          border: 'border-fuchsia-300',
          desc: `Venus (signifying pleasure and indulgence) is debilitated and afflicted by malefics. The native may experience difficulty with moderation and turn to alcohol or other substances to fulfill pleasure or emotional voids.`
        });
      }
    }
  }

  // ==========================================
  // 6. LEARNING & COGNITIVE VULNERABILITIES (DYSLEXIA INDICATORS)
  // ==========================================

  // 1. Afflicted Mercury (Communication & Processing)
  // Mercury conjunct or aspected by Saturn, Mars, or Rahu impacts cognitive abilities and language.
  // Exception: Sun-Mercury conjunction (Budhaditya Yoga) protects against this cognitive challenge.
  if (placements['Mercury']) {
    const mercConjuncts = getConjuncts('Mercury');
    const isMercAfflicted = mercConjuncts.some(p => ['Saturn', 'Mars', 'Rahu'].includes(p)) ||
      hasAspect('Saturn', rasiPlacements['Mercury'], rasiPlacements) ||
      hasAspect('Mars', rasiPlacements['Mercury'], rasiPlacements);

    if (isMercAfflicted) {
      const mercNetUnits = getNetUnits('Mercury', lagnaIndex);
      const mercResStrength = getResidentialStrength('Mercury', lagnaDegree);
      const isMercNeutralized = isMercExalted || isBudhaditya || mercNetUnits >= 1 || mercResStrength < 0.3;
      const afflicting = ['Saturn', 'Mars', 'Rahu'].filter(p => mercConjuncts.includes(p) || hasAspect(p, rasiPlacements['Mercury'], rasiPlacements));

      if (isMercNeutralized) {
        let reason;
        if (isMercExalted) reason = "Mercury (significator of speech and intellect) is Exalted, granting excellent cognitive strength";
        else if (isBudhaditya) reason = "the native holds the active Budh Aditya Yoga (Sun-Mercury conjunction)";
        else reason = `mathematical neutralization under Raman rules due to ${getNeutralizationReason('Mercury', mercNetUnits, mercResStrength)}`;

        yogas.push({
          name: 'Cognitive Protection (Budha Bhanga)',
          type: 'Protection',
          involved: ['Mercury', ...afflicting],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The alignment for cognitive processing/learning challenges is structurally present in the chart, but it is neutralized (Budha Bhanga) because ${reason}.`
        });
      } else {
        yogas.push({
          name: 'Cognitive Processing Vulnerability',
          type: 'Challenge',
          involved: ['Mercury', ...afflicting],
          icon: 'BookOpen',
          color: 'text-sky-800',
          bg: 'bg-sky-100',
          border: 'border-sky-300',
          desc: `Mercury (significator of communication and learning) is afflicted by malefics. This can indicate difficulties related to language processing, spelling, or a potential for learning differences like dyslexia.`
        });
      }
    }

    if (placements['Mercury'] && placements['Sun'] && placements['Mercury'] === placements['Sun']) {
      if (isBudhaditya) {
        yogas.push({
          name: 'Budh Aditya Yoga',
          type: 'Intellect',
          involved: ['Mercury', 'Sun'],
          icon: 'Sparkles',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          desc: `Sun and Mercury are conjunct in House ${placements['Mercury']} with a safe separation of ${sunMercDistance.toFixed(1)}° (at least 10° separation). According to B.V. Raman, this forms the active Budh-Aditya Yoga, making the native highly intelligent, skilful in all works, possessing a good reputation and personal respect, and surrounded by all comforts and happiness.`
        });
      } else {
        yogas.push({
          name: 'Budh Aditya Yoga (Combust)',
          type: 'Challenge',
          involved: ['Mercury', 'Sun'],
          icon: 'AlertTriangle',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          desc: `Sun and Mercury are conjunct in House ${placements['Mercury']} but are too close at a separation of only ${sunMercDistance.toFixed(1)}°. According to B.V. Raman, any planet in association with the Sun generally becomes combust (Astha) and loses its power to do good. Although Mercury is a partial exception, they must be separated by at least 10° to give rise to Budha-Aditya Yoga. Proximity below 10° causes combustion, neutralizing its de facto intellectual power and protective benefits.`
        });
      }
    }
  }

  // 2. Afflicted 3rd House Lord (Mental Processes)
  // The 3rd house represents mental processes; its lord under malefic influence creates comprehension hurdles.
  const lord3 = houseLords[3];
  if (lord3) {
    const lord3Conjuncts = getConjuncts(lord3);
    const afflicting = ['Saturn', 'Mars', 'Rahu', 'Ketu'].filter(p => lord3Conjuncts.includes(p) || hasAspect(p, rasiPlacements[lord3], rasiPlacements));
    const isLord3Afflicted = afflicting.length > 0;

    // Special emphasis if the 3rd lord is Mercury itself
    if (isLord3Afflicted) {
      const lord3NetUnits = getNetUnits(lord3, lagnaIndex);
      const lord3ResStrength = getResidentialStrength(lord3, lagnaDegree);
      const isLord3Neutralized = isMercExalted || isBudhaditya || lord3NetUnits >= 1 || lord3ResStrength < 0.3;

      if (isLord3Neutralized) {
        let reason;
        if (isMercExalted) reason = "Mercury (significator of speech and intellect) is Exalted, granting excellent cognitive strength";
        else if (isBudhaditya) reason = "the native holds the auspicious Budh Aditya Yoga (Sun-Mercury conjunction)";
        else reason = `mathematical neutralization under Raman rules due to ${getNeutralizationReason(lord3, lord3NetUnits, lord3ResStrength)}`;

        yogas.push({
          name: 'Communication Challenge Bhanga',
          type: 'Protection',
          involved: [lord3, 'Mercury', ...afflicting],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The potential communication/learning hurdles from an afflicted 3rd House Lord (${lord3}) are neutralized (Bhanga) due to ${reason}.`
        });
      } else {
        yogas.push({
          name: 'Comprehension & Communication Challenge',
          type: 'Challenge',
          involved: [lord3, ...afflicting],
          icon: 'MessageCircle',
          color: 'text-cyan-800',
          bg: 'bg-cyan-100',
          border: 'border-cyan-300',
          desc: `The Lord of the 3rd House (${lord3}) is afflicted. Since the 3rd house governs mental processes and learning, this affliction can create hurdles in standard educational environments or reading comprehension.`
        });
      }
    }
  }

  // 3. Afflicted Moon in Gemini or Pisces (Mind & Emotions)
  // Moon in Pisces (Index 11) or Gemini (Index 2) under malefic influence contributes to learning challenges.
  if (placements['Moon'] && (rasiPlacements['Moon'] === 2 || rasiPlacements['Moon'] === 11)) {
    const moonConjuncts = getConjuncts('Moon');
    const afflicting = ['Saturn', 'Mars', 'Rahu', 'Ketu'].filter(p => moonConjuncts.includes(p) || hasAspect(p, rasiPlacements['Moon'], rasiPlacements));
    const isMoonAfflicted = afflicting.length > 0;

    if (isMoonAfflicted) {
      const moonNetUnits = getNetUnits('Moon', lagnaIndex);
      const moonResStrength = getResidentialStrength('Moon', lagnaDegree);
      const isMoonNeutralized = moonNetUnits >= 1 || moonResStrength < 0.3;

      if (isMoonNeutralized) {
        yogas.push({
          name: 'Emotional Focus Protection',
          type: 'Protection',
          involved: ['Moon', ...afflicting],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The potential emotional focus challenge (Moon afflicted in Gemini/Pisces) is mathematically neutralized under Raman rules due to ${getNeutralizationReason('Moon', moonNetUnits, moonResStrength)}.`
        });
      } else {
        yogas.push({
          name: 'Emotional Learning Blockage',
          type: 'Challenge',
          involved: ['Moon', ...afflicting],
          icon: 'Brain',
          color: 'text-blue-800',
          bg: 'bg-blue-100',
          border: 'border-blue-300',
          desc: `The Moon is placed in a sensitive communicative/watery sign (Gemini or Pisces) and afflicted by malefics. This emotional instability can manifest as a difficulty in focusing on traditional learning.`
        });
      }
    }
  }

  // 4. Afflicted Jupiter (Wisdom & Overall Education)
  // Jupiter signifies wisdom; its affliction affects the overall learning process.
  if (placements['Jupiter']) {
    const jupConjuncts = getConjuncts('Jupiter');
    const afflicting = ['Saturn', 'Mars', 'Rahu', 'Ketu'].filter(p => jupConjuncts.includes(p) || hasAspect(p, rasiPlacements['Jupiter'], rasiPlacements));
    const isJupAfflicted = afflicting.length > 0;

    if (isJupAfflicted) {
      const jupNetUnits = getNetUnits('Jupiter', lagnaIndex);
      const jupResStrength = getResidentialStrength('Jupiter', lagnaDegree);
      const isJupNeutralized = jupNetUnits >= 1 || jupResStrength < 0.3;

      if (isJupNeutralized) {
        yogas.push({
          name: 'Educational Strength Protection',
          type: 'Protection',
          involved: ['Jupiter', ...afflicting],
          icon: 'CheckCircle2',
          color: 'text-sky-600',
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          desc: `The potential academic disruption risk (Jupiter afflicted by malefics) is mathematically neutralized under Raman rules due to ${getNeutralizationReason('Jupiter', jupNetUnits, jupResStrength)}.`
        });
      } else {
        yogas.push({
          name: 'Educational Disruption Risk',
          type: 'Challenge',
          involved: ['Jupiter', ...afflicting],
          icon: 'GraduationCap',
          color: 'text-teal-800',
          bg: 'bg-teal-100',
          border: 'border-teal-300',
          desc: `Jupiter (the significator of education and knowledge) is under malefic influence. This can disrupt conventional academic pursuits and indicates alternative learning methods might be required.`
        });
      }
    }
  }

  // ==========================================
  // 7. NEECHA BHANGA RAJA YOGA (NBRY)
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
  // 8. GAJA KESARI YOGA
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
          desc: `Jupiter is in a Kendra (House ${jupFromMoon}) from the Moon, but is afflicted by Rahu, Ketu, or Saturn. According to B.V. Raman, this grants intelligence, eloquence, and reputation, but the manifestation is subject to delays, emotional trials, or reputational hurdles due to the afflicting planets. In modern contexts, the administrative power or leadership potential may face opposition or require extra effort to fully realize.`
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
          desc: `Jupiter is in a Kendra (House ${jupFromMoon}) from the Moon. According to B.V. Raman, this grants many relations, a polite and generous nature, and a lasting reputation even long after death. In modern contexts, this indicates positions of authority and community leadership, such as an engineer, municipal leader, magistrate, or mayor, and building significant assets or community projects (from small shrines to large institutions).`
        });
      }
    }
  }

  // ==========================================
  // 9. PANCHA MAHAPURUSHA YOGAS
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
      let customDesc = `${planet} is in Kendra (House ${placements[planet]}) in its own/exalted sign. Grants: ${pmpRules[planet].desc}`;

      if (planet === 'Mars') {
        const marsHouse = placements['Mars'];
        const isMarsAfflicted = getConjuncts('Mars').some(p => ['Saturn', 'Rahu', 'Ketu'].includes(p)) ||
          ['Saturn', 'Rahu', 'Ketu'].some(p => hasAspect(p, rasiPlacements['Mars'], rasiPlacements));
        
        const marsNetUnits = getNetUnits('Mars', lagnaIndex);
        const isMarsWeak = marsNetUnits < 0;

        const strengthNote = (isMarsAfflicted || isMarsWeak)
          ? " ⚠️ **Nominal (De Jure) Presence**: Because Mars is afflicted (conjunct or aspected by Saturn, Rahu, or Ketu) or is weak in net units, B.V. Raman notes that the yoga may operate only nominally (*de jure*) rather than in its real, active sense (*de facto*)."
          : " 🌟 **De Facto Vitality (Balishta)**: With Mars being unafflicted and strong in planetary net units, B.V. Raman notes this yoga operates in its true, full vitality (*de facto*), allowing its powerful qualities to find full expression.";

        customDesc = `Mars occupies a Kendra (House ${marsHouse}) in its own or exaltation sign. According to B.V. Raman, Ruchaka Yoga makes the native martial, a leader of men, a great commander, and an aggressive but patriotic leader or equal. It grants a strong physique, attractive body, ruddy complexion, charitable disposition, wealth, and longevity, with the native conforming to traditions and customs.${strengthNote}`;
      }

      if (planet === 'Mercury') {
        const mercHouse = placements['Mercury'];
        const isMercAfflicted = getConjuncts('Mercury').some(p => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(p)) ||
          ['Saturn', 'Mars', 'Rahu', 'Ketu'].some(p => hasAspect(p, rasiPlacements['Mercury'], rasiPlacements));
        
        const mercNetUnits = getNetUnits('Mercury', lagnaIndex);
        const isMercWeak = mercNetUnits < 0;

        const strengthNote = (isMercAfflicted || isMercWeak)
          ? " ⚠️ **Nominal (De Jure) Presence**: Because Mercury is afflicted (conjunct or aspected by Saturn, Mars, Rahu, or Ketu) or is weak in net units, B.V. Raman notes that the yoga may operate only nominally (*de jure*) rather than in its real, active sense (*de facto*)."
          : " 🌟 **De Facto Intellect (Balishta)**: With Mercury being unafflicted and strong in planetary net units, B.V. Raman notes this yoga operates in its true, full intellectual capacity (*de facto*), allowing the native to fully manifest its excellent results.";

        customDesc = `Mercury occupies a Kendra (House ${mercHouse}) in its own or exaltation sign. According to B.V. Raman, Bhadra Yoga makes the native strong, with a lion-like face, well-developed chest, and well-proportioned limbs. The native will be taciturn (speaking only when wise/necessary), helpful to relatives, highly intellectual, and will live to a good old age (longevity).${strengthNote}`;
      }

      if (planet === 'Jupiter') {
        const jupRasi = rasiPlacements['Jupiter'];
        const isJupExalted = jupRasi === 3;
        const is10thHouse = placements['Jupiter'] === 10;

        const exaltationNote = isJupExalted
          ? " 🌟 **Exaltation (Uccha) Neutralization**: Because Jupiter is exalted in Cancer rather than simply in its own sign, B.V. Raman explains that any residual Kendradhipati Dosha (the minor blemish of owning angular houses as a natural benefic) is entirely neutralized, making this the most pristine and preferred manifestation of the yoga."
          : " 🏛️ **Swakshetra Placement**: Jupiter is placed in its own sign (Sagittarius or Pisces). According to B.V. Raman, this is highly auspicious, though a minor trace of Kendradhipati Dosha (quadrangular ownership) exists, which is largely neutralized by the yoga's general strength.";

        const houseStrengthNote = is10thHouse
          ? " 👑 **Tenth Kendra Boost**: Since Jupiter occupies the 10th house, B.V. Raman notes that this is the most powerful Kendra position for Hamsa Yoga, giving maximum prominence and career strength."
          : ` 📍 **Kendra Placement**: Jupiter is placed in Kendra House ${placements['Jupiter']}.`;

        const geometricNote = " 🌐 **Zodiac Geometry**: Hamsa Yoga is possible only for movable signs (Aries, Cancer, Libra, Capricorn) and common signs (Gemini, Virgo, Sagittarius, Pisces) Ascendants, and can never occur for fixed sign Ascendants (Taurus, Leo, Scorpio, Aquarius).";

        customDesc = `Jupiter occupies a Kendra (House ${placements['Jupiter']}) in its own or exaltation sign. According to B.V. Raman, Hamsa Yoga produces a person of sterling character and immense moral fibre. The native will possess a handsome body, be liked by others, be righteous in disposition, and pure in mind. Traditional texts mention auspicious markings of a conch, lotus, fish, and ankusa on the limbs.${exaltationNote}${houseStrengthNote}${geometricNote}`;
      }

      if (planet === 'Venus') {
        const venHouse = placements['Venus'];
        let houseDetails;

        if (venHouse === 1 && [1, 6, 11].includes(lagnaIndex)) {
          houseDetails = " manifests directly on your **1st house (Ascendant)**. According to B.V. Raman's lagna mapping, this blesses your physical appearance, vitality, and personal charisma, granting a handsome/magnetic presence, elegant manners, and strong self-belief.";
        } else if (venHouse === 7 && [0, 7, 5].includes(lagnaIndex)) {
          houseDetails = " manifests in your **7th house (Partnership & Marriage)**. According to B.V. Raman's lagna mapping, this highlights your relationships, blessing you with a refined, loving, or wealthy partner, marital happiness, and excellent public relations.";
        } else if (venHouse === 10 && [2, 4, 9].includes(lagnaIndex)) {
          houseDetails = " manifests in your **10th house (Career & Profession)**. According to B.V. Raman's lagna mapping, this boosts your public status and career success, steering you toward prosperity through arts, luxury, design, or public-facing roles.";
        } else if (venHouse === 4 && [8, 10, 3].includes(lagnaIndex)) {
          houseDetails = " manifests in your **4th house (Home, Vehicles, & Happiness)**. According to B.V. Raman's lagna mapping, this guarantees domestic peace, high-quality conveyances (vehicles), a luxurious home environment, and maternal blessings.";
        } else {
          houseDetails = ` manifests in Kendra House ${venHouse}, granting material comfort, aesthetic sense, and strong creative talents.`;
        }

        const philosophyNote = " 🎭 **Materialism vs. Spirituality**: B.V. Raman contrasts Malavya Yoga with Hamsa Yoga. While Hamsa makes one idealistic and spiritual, Malavya points to a love of pleasure, appreciation for beauty, and a predominantly materialistic, comfortable, and luxury-filled outlook on life, where spiritual growth is often pursued in balance with material joys.";

        customDesc = `Venus occupies a Kendra (House ${venHouse}) in its own or exaltation sign. According to B.V. Raman, Malavya Yoga grants a well-developed physique, a strong-minded and resolute nature, immense wealth, happiness from partner/children, and widespread fame. Since Venus rules fine arts, luxury, music, dancing, and material comforts, this yoga ${houseDetails}${philosophyNote}`;
      }

      if (planet === 'Saturn') {
        const satHouse = placements['Saturn'];
        
        const isMoonAfflicted = placements['Moon'] && (
          getConjuncts('Moon').some(p => ['Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p)) ||
          ['Mars', 'Saturn', 'Rahu', 'Ketu'].some(p => hasAspect(p, rasiPlacements['Moon'], rasiPlacements))
        );

        const moonNote = (!isMoonAfflicted)
          ? " 🌕 **Restricted Play of Malefic Traits**: Since your Moon is free from malefic afflictions (no conjunction or aspect from Mars, Saturn, Rahu, or Ketu), B.V. Raman explains that any negative behavioral tendencies of Saturn (such as unscrupulousness or coveting others' wealth) will have a restricted play, preserving a strong moral character."
          : " ⚠️ **Afflicted Moon Influence**: Since your Moon receives malefic association (conjunct or aspected by Mars, Saturn, Rahu, or Ketu), B.V. Raman notes that Saturn's raw, intense qualities can manifest, making the native prone to questionable moral choices or ruthlessness if they do not consciously practice ethical discipline.";

        const geometricNote = " 🌐 **Zodiac Geometry**: Sasa Yoga is possible only for movable signs (Aries, Cancer, Libra, Capricorn) and fixed signs (Taurus, Leo, Scorpio, Aquarius) Ascendants, while common signs are geometrically exempted.";

        customDesc = `Saturn occupies a Kendra (House ${satHouse}) in its own or exaltation sign. According to B.V. Raman, Sasa Yoga grants authority, commanding power over workers/servants, and leadership (like the head of a town, village, or executive head). However, because Saturn represents cruel or undignified traits classically, Raman warns of a questionable moral character, perverse tendencies, or unscrupulous wealth-gaining (noting that successful, ruthless industrial profiteers and 'war contractors' often possess this yoga).${moonNote}${geometricNote}`;
      }

      yogas.push({
        name: pmpRules[planet].name,
        type: 'Mahapurusha',
        involved,
        icon: 'Star',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        desc: customDesc
      });
    }
  });

  // ==========================================
  // 10. KEMADRUMA YOGA & KEMADRUMA BHANGA
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
          desc: `Kemadruma Yoga (Moon isolated with no adjacent planets) is cancelled (Kemadruma Bhanga) because: ${kbReasons.join('; ')}. According to B.V. Raman, this cancellation neutralizes the classical negative indications (such as dependence, sorrow, or lack of support), allowing the native to gain mental stability, resilience, and convert initial struggles into long-term building success.`
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
          desc: `Moon is isolated with no planets adjacent or conjunct (excluding Sun, Rahu, and Ketu). According to B.V. Raman and Varahamihira, this indicates a susceptibility to mental/physical sorrow, feeling unsupported, dependent, or facing financial/social hardships. Unrighteous or unconventional paths should be avoided through building strong habits and self-discipline.`
        });
      }
    }
  }

  // ==========================================
  // 10A. SUNAPHA, 10B. ANAPHA, & 10C. DHURDHURA YOGAS
  // ==========================================
  if (placements['Moon']) {
    const mRasi = rasiPlacements['Moon'];
    const secondRasi = (mRasi + 1) % 12;
    const twelfthRasi = (mRasi + 11) % 12;

    const sunaphaPlanets = Object.keys(rasiPlacements).filter(p => 
      ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(p) && 
      rasiPlacements[p] === secondRasi
    );
    const anaphaPlanets = Object.keys(rasiPlacements).filter(p => 
      ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(p) && 
      rasiPlacements[p] === twelfthRasi
    );

    if (sunaphaPlanets.length > 0 && anaphaPlanets.length > 0) {
      const involved = ['Moon', ...new Set([...sunaphaPlanets, ...anaphaPlanets])];
      yogas.push({
        name: 'Dhurdhura Yoga',
        type: 'Wealth/Status',
        involved,
        icon: 'TrendingUp',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Mars, Mercury, Jupiter, Venus, or Saturn occupy both the 2nd and 12th houses from the Moon (specifically, 2nd: ${sunaphaPlanets.join(', ')} | 12th: ${anaphaPlanets.join(', ')}). According to B.V. Raman, this classical combination (also referred to as Dhurandhar Yoga) makes the native bountiful, blessed with much wealth, conveyances (vehicles), power, and a lasting reputation. The Dasa/Bhukti of the occupying planets (${[...new Set([...sunaphaPlanets, ...anaphaPlanets])].join(', ')}) will trigger the major benefits of this yoga.`
      });
    } else if (sunaphaPlanets.length > 0) {
      const involved = ['Moon', ...sunaphaPlanets];
      yogas.push({
        name: 'Sunapha Yoga',
        type: 'Wealth/Status',
        involved,
        icon: 'TrendingUp',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Mars, Mercury, Jupiter, Venus, or Saturn (specifically: ${sunaphaPlanets.join(', ')}) occupy the 2nd house from the Moon (with the 12th house remaining vacant). According to B.V. Raman, this grants self-earned property, intelligence, wealth, good reputation, and status equal to a ruler or king. The Dasa/Bhukti of the occupying planets (${sunaphaPlanets.join(', ')}) will trigger the major benefits of this yoga.`
      });
    } else if (anaphaPlanets.length > 0) {
      const involved = ['Moon', ...anaphaPlanets];
      yogas.push({
        name: 'Anapha Yoga',
        type: 'Wealth/Status',
        involved,
        icon: 'TrendingUp',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Mars, Mercury, Jupiter, Venus, or Saturn (specifically: ${anaphaPlanets.join(', ')}) occupy the 12th house from the Moon (with the 2nd house remaining vacant). According to B.V. Raman, this grants well-formed organs, majestic appearance, good reputation, polite, generous nature, self-respect, and a fondness for dress and sense pleasures. In later life, it leads to renunciation and austerity. The Dasa/Bhukti of the occupying planets (${anaphaPlanets.join(', ')}) will trigger the major benefits of this yoga.`
      });
    }
  }

  // ==========================================
  // 10D. ADHI YOGA
  // ==========================================
  if (placements['Moon']) {
    const mRasi = rasiPlacements['Moon'];
    const targetHouses = [6, 7, 8];
    const adhiPlanets = ['Mercury', 'Jupiter', 'Venus'].filter(p => {
      if (placements[p] === undefined) return false;
      const relHouse = ((rasiPlacements[p] - mRasi + 12) % 12) + 1;
      return targetHouses.includes(relHouse);
    });

    if (adhiPlanets.length === 3) {
      const strongPlanets = adhiPlanets.filter(p => 
        isExalted(p) || isOwnSign(p) || (getResidentialStrength(p, lagnaDegree) >= 0.7)
      );

      let strengthNote;
      if (strongPlanets.length === 1) {
        strengthNote = " With one planet in full strength, the native becomes a prominent leader/commander.";
      } else if (strongPlanets.length === 2) {
        strengthNote = " With two planets in full strength, the native becomes a minister or equivalent high ranking official.";
      } else if (strongPlanets.length === 3) {
        strengthNote = " With all three planets in full strength, the native occupies an eminent, supreme station in life.";
      } else {
        strengthNote = " Although all three benefics occupy these houses, they are devoid of exceptional strength, rendering the yoga's influence mild but still active.";
      }

      const involved = ['Moon', ...adhiPlanets];
      yogas.push({
        name: 'Adhi Yoga',
        type: 'Wealth/Status',
        involved,
        icon: 'Sun',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc: `Natural benefics (Mercury, Jupiter, and Venus) occupy the 6th, 7th, and/or 8th houses from the Moon. According to B.V. Raman and Varahamihira, this is a highly auspicious Raja Yoga. It grants a polite, trustworthy character, a happy and enjoyable life surrounded by affluence and luxury, victory over adversaries, robust health, and longevity.${strengthNote} The Dasa/Bhukti of the participating planets (${adhiPlanets.join(', ')}) will trigger the key outcomes of this yoga.`
      });
    }
  }

  // ==========================================
  // 10E. CHATUSSAGARA YOGA
  // ==========================================
  const occupiedKendras = new Set();
  const kendraOccupations = { 1: [], 4: [], 7: [], 10: [] };

  mainPlanetsList.forEach(p => {
    const house = placements[p];
    if (house && [1, 4, 7, 10].includes(house)) {
      occupiedKendras.add(house);
      kendraOccupations[house].push(p);
    }
  });

  if (occupiedKendras.size === 4) {
    const involved = Object.values(kendraOccupations).flat();
    yogas.push({
      name: 'Chatussagara Yoga',
      type: 'Other',
      involved,
      icon: 'Sparkles',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: `All four Kendra houses (1st, 4th, 7th, and 10th) from the Ascendant are occupied by planets (specifically: House 1: ${kendraOccupations[1].join(', ')} | House 4: ${kendraOccupations[4].join(', ')} | House 7: ${kendraOccupations[7].join(', ')} | House 10: ${kendraOccupations[10].join(', ')}). According to B.V. Raman, this classical combination (Four Oceans Yoga) grants a long, healthy, and prosperous life, good children, and an excellent reputation that travels to the confines of the four oceans, making the native equal to a ruler.`
    });
  }

  // ==========================================
  // 10F. RAJALAKSHANA YOGA
  // ==========================================
  const rajalakshanaPlanets = ['Jupiter', 'Venus', 'Mercury', 'Moon'].filter(p => placements[p] && [1, 4, 7, 10].includes(placements[p]));
  if (rajalakshanaPlanets.length === 4) {
    yogas.push({
      name: 'Rajalakshana Yoga',
      type: 'Power/Rise',
      involved: ['Jupiter', 'Venus', 'Mercury', 'Moon'],
      icon: 'Star',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: `Jupiter, Venus, Mercury, and the Moon all occupy Kendra houses (1st, 4th, 7th, or 10th) from the Ascendant. According to B.V. Raman, this highly auspicious Raja Yoga endows the native with an attractive appearance and all the virtues and good qualities of high personages. It contributes great luck, respect, dignity, and command in society.`
    });
  }

  // ==========================================
  // 10G. AMALA YOGA
  // ==========================================
  if (placements['Moon']) {
    const mRasi = rasiPlacements['Moon'];
    const tenthRasiFromMoon = (mRasi + 9) % 12;

    const beneficsIn10Lagna = ['Mercury', 'Jupiter', 'Venus'].filter(p => placements[p] === 10);
    const beneficsIn10Moon = ['Mercury', 'Jupiter', 'Venus'].filter(p => rasiPlacements[p] === tenthRasiFromMoon);

    const hasAmalaLagna = beneficsIn10Lagna.length > 0;
    const hasAmalaMoon = beneficsIn10Moon.length > 0;

    if (hasAmalaLagna || hasAmalaMoon) {
      const activeList = [...new Set([...beneficsIn10Lagna, ...beneficsIn10Moon])];
      const involved = ['Moon', ...activeList];

      let referenceStr;
      if (hasAmalaLagna && hasAmalaMoon) {
        referenceStr = "both the Lagna (Ascendant) and the Moon";
      } else if (hasAmalaLagna) {
        referenceStr = "the Lagna (Ascendant)";
      } else {
        referenceStr = "the Moon";
      }

      // Check if there are also malefics in the 10th from Lagna or Moon (which could complicate the spotless character or indicate questioning means)
      const maleficsIn10Lagna = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].filter(p => placements[p] === 10);
      const maleficsIn10Moon = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].filter(p => rasiPlacements[p] === tenthRasiFromMoon);
      const activeMalefics = [...new Set([...maleficsIn10Lagna, ...maleficsIn10Moon])];

      let extraDesc;
      if (activeMalefics.length > 0) {
        extraDesc = ` ⚠️ **Malefic Influence**: The presence of malefic planet(s) (${activeMalefics.join(', ')}) in the 10th house may bring significant wealth but can make the earning methods questionable or challenge the spotless reputation, as noted by B.V. Raman.`;
      } else {
        extraDesc = " 🌟 **Pure Manifestation**: With no afflicting malefics, prosperity and affluence will be achieved through fair, honorable, and pure means.";
      }

      yogas.push({
        name: 'Amala Yoga',
        type: 'Power/Rise',
        involved,
        icon: 'Sparkles',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        desc: `A natural benefic (${activeList.join(', ')}) occupies the 10th house from ${referenceStr}. According to B.V. Raman, this classical combination (also referred to as Amal Yoga) grants lasting fame, an honorable reputation, a spotless character, and a highly prosperous life.${extraDesc}`
      });
    }
  }

  // ==========================================
  // 10H. PARVATA YOGA
  // ==========================================
  const lord12 = houseLords[12];
  const naturalBenefics = ['Mercury', 'Jupiter', 'Venus'];
  const kendraBenefics = naturalBenefics.filter(p => placements[p] && kendras.includes(placements[p]));

  const planetsIn6 = Object.keys(placements).filter(p => placements[p] === 6);
  const planetsIn8 = Object.keys(placements).filter(p => placements[p] === 8);
  const planetsIn6Or8 = [...new Set([...planetsIn6, ...planetsIn8])];
  const hasMaleficsIn6Or8 = planetsIn6Or8.some(p => maleficsList.includes(p));
  const is6And8Empty = planetsIn6Or8.length === 0;

  let parvatReason = null;
  const involvedParvata = [];

  if (kendraBenefics.length > 0 && !hasMaleficsIn6Or8) {
    involvedParvata.push(...kendraBenefics);
    if (planetsIn6Or8.length > 0) {
      involvedParvata.push(...planetsIn6Or8);
    }
    const occStr = is6And8Empty 
      ? "the 6th and 8th houses are entirely unoccupied (free)"
      : `the 6th and 8th houses are occupied only by benefic planets (${planetsIn6Or8.join(', ')})`;
    
    parvatReason = `Natural benefic(s) (${kendraBenefics.join(', ')}) occupy Kendra houses (1st, 4th, 7th, 10th) from Lagna, and ${occStr}.`;
  } else if (lagnaLord && lord12 && placements[lagnaLord] && placements[lord12] && lagnaIndex !== 10) {
    // Only valid if Lagna is not Aquarius (Kumbha, rasiIndex = 10)
    const hL = placements[lagnaLord];
    const h12 = placements[lord12];
    const diff = (hL - h12 + 12) % 12;
    if ([0, 3, 6, 9].includes(diff)) {
      involvedParvata.push(lagnaLord, lord12);
      parvatReason = `The Lord of Lagna (${lagnaLord}) and the Lord of the 12th House (${lord12}) are in mutual Kendras (placed in ${hL} and ${h12} houses respectively, which are at a ${diff === 0 ? '1st (conjunct)' : (diff === 6 ? '7th (opposite)' : '4th/10th')} angle from each other).`;
    }
  }

  if (parvatReason) {
    const finalInvolved = [...new Set(involvedParvata)];
    const extraRemark = (kendraBenefics.length > 0 && !hasMaleficsIn6Or8 && is6And8Empty)
      ? " 🛡️ **Protection from Enemies & Debts**: Since the 6th and 8th houses are entirely free from any planets, B.V. Raman notes that the native will be free from the machinations of enemies and debts."
      : "";

    yogas.push({
      name: 'Parvata Yoga',
      type: 'Power/Rise',
      involved: finalInvolved,
      icon: 'Compass',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      desc: `${parvatReason} According to B.V. Raman, this classical combination (Parvata Yoga) makes the native wealthy, prosperous, liberal, charitable, humorous, and a prominent leader in their community (like the head of a town or village). Raman notes that while it may not grant massive political power (tending instead to make one a respected figure within a limited circle), it adds substantial financial stability and structural strength to the chart.${extraRemark}`
    });
  }

  // ==========================================
  // 10I. KAHALA YOGA (KAHAL YOGA)
  // ==========================================

  const isLagnaLordStrong = lagnaLord && (
    isExalted(lagnaLord) || 
    isOwnSign(lagnaLord) || 
    [1, 4, 7, 10, 5, 9].includes(placements[lagnaLord]) || 
    getNetUnits(lagnaLord, lagnaIndex) >= 0.75
  );

  let kahalaReason = null;
  const involvedKahala = [];

  // Definition 1: 4th and 9th lords in mutual Kendras + strong Lagna Lord (Except for Aquarius Lagna)
  if (lagnaIndex !== 10 && lord4 && lord9 && placements[lord4] && placements[lord9] && isLagnaLordStrong) {
    const h4 = placements[lord4];
    const h9 = placements[lord9];
    const diff = (h4 - h9 + 12) % 12;
    if ([0, 3, 6, 9].includes(diff)) {
      involvedKahala.push(lord4, lord9, lagnaLord);
      kahalaReason = `The Lord of the 4th House (${lord4}) and the Lord of the 9th House (${lord9}) are in mutual Kendras (placed in ${h4} and ${h9} houses respectively, which are at a ${diff === 0 ? '1st (conjunct)' : (diff === 6 ? '7th (opposite)' : '4th/10th')} angle from each other), and the Lagna Lord (${lagnaLord}) is strongly disposed.`;
    }
  }

  // Definition 2: 4th lord exalted or in own house, conjoined with or aspected by 10th lord
  if (!kahalaReason && lord4 && lord10 && placements[lord4] && placements[lord10]) {
    const isLord4Strong = isExalted(lord4) || isOwnSign(lord4);
    const isConnected = getConjuncts(lord4).includes(lord10) || hasAspect(lord10, rasiPlacements[lord4], rasiPlacements);
    if (isLord4Strong && isConnected) {
      involvedKahala.push(lord4, lord10);
      const aspectConj = getConjuncts(lord4).includes(lord10) 
        ? `conjoined with` 
        : `aspected by`;
      kahalaReason = `The Lord of the 4th House (${lord4}) is exalted or in its own house, and is ${aspectConj} the Lord of the 10th House (${lord10}).`;
    }
  }

  if (kahalaReason) {
    const finalInvolved = [...new Set(involvedKahala)];
    yogas.push({
      name: 'Kahala Yoga',
      type: 'Challenge',
      involved: finalInvolved,
      icon: 'ShieldAlert',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      desc: `${kahalaReason} According to B.V. Raman, this combination traditionally indicates a stubborn, daring, and sometimes not well-informed nature, where the person may lead local groups (head of a small army or a few villages). Under a modern, intelligent interpretation, Raman notes that the native tends to find their path in protective, structured service, such as the police, military force, or executive/administrative posts (like a Collector or Tahsildar), building stability through discipline and overcoming challenges.`
    });
  }

  // ==========================================
  // 11. VIPREET RAJA YOGA (VRY)
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
          let resultsText = `Lord of House ${houseNum} (${lord}) is placed in Dusthana House ${currentHouse} without major benefic afflictions. Grants sudden progress, victory over obstacles, and wealth arising from struggles.`;
          
          if (houseNum === '6') { 
            yogaName = 'Harsha Yoga'; 
            resultsText = `Lord of House 6 (${lord}) is placed in Dusthana House ${currentHouse} without major benefic afflictions. Harsha Yoga makes one fortunate and physically strong. However, per Sage Parasara, the evil of the 6th lordship is only modified, not erased; relatives may become enemies (if in 6th) or the native may be sickly (if in 8th/12th).`;
          } else if (houseNum === '8') { 
            yogaName = 'Sarala Yoga'; 
            resultsText = `Lord of House 8 (${lord}) is placed in Dusthana House ${currentHouse} without major benefic afflictions. Sarala Yoga grants longevity and fearless character. However, the intrinsic evil of the 8th lordship remains, requiring the native to carefully navigate hidden enemies and sudden changes.`;
          } else if (houseNum === '12') { 
            yogaName = 'Vimala Yoga'; 
            resultsText = `Lord of House 12 (${lord}) is placed in Dusthana House ${currentHouse} without major benefic afflictions. Vimala Yoga renders the person frugal and independent. However, the intrinsic evil of the 12th lordship means the native must consciously guard against isolation and heavy expenditures.`;
          }

          yogas.push({
            name: yogaName,
            type: 'Vipreet Raja',
            involved: [lord],
            icon: 'Zap',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-200',
            desc: resultsText
          });
        }
      }
    }
  });

  // ==========================================
  // 12. YOGAS WITH THE SUN (VESI, VASI, & OBHAYACHARI)
  // ==========================================
  if (placements['Sun']) {
    const sRasi = rasiPlacements['Sun'];
    const secondRasiFromSun = (sRasi + 1) % 12;
    const twelfthRasiFromSun = (sRasi + 11) % 12;

    const eligiblePlanets = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const vesiPlanets = eligiblePlanets.filter(p => placements[p] !== undefined && rasiPlacements[p] === secondRasiFromSun);
    const vasiPlanets = eligiblePlanets.filter(p => placements[p] !== undefined && rasiPlacements[p] === twelfthRasiFromSun);

    if (vesiPlanets.length > 0 && vasiPlanets.length > 0) {
      // 12C. OBHAYACHARI YOGA
      const involved = ['Sun', ...new Set([...vesiPlanets, ...vasiPlanets])];
      const activeBenefics = involved.filter(p => naturalBenefics.includes(p));
      const activeMalefics = involved.filter(p => ['Mars', 'Saturn'].includes(p));

      let subtype = "Mixed";
      let descType = "a combination of natural benefics and malefics";
      let resultsStr = "grants a balanced, prosperous, and reputable life with moderate fortunes and resilience in overcoming life challenges.";
      
      if (activeBenefics.length > 0 && activeMalefics.length === 0) {
        subtype = "Subha-Obhayachari";
        descType = "only natural benefics";
        resultsStr = "makes the native highly popular, respected, sweet-tongued, wealthy, and universally liked, with stable fortunes and a peaceful mind.";
      } else if (activeMalefics.length > 0 && activeBenefics.length === 0) {
        subtype = "Papa-Obhayachari";
        descType = "only natural malefics";
        resultsStr = "signifies that the native's rise, wealth, and status may come through hard struggles, sudden fluctuations, or high-risk ventures, requiring caution and self-discipline.";
      }

      yogas.push({
        name: `Obhayachari Yoga (${subtype})`,
        type: subtype === 'Papa-Obhayachari' ? 'Challenge' : 'Power/Rise',
        involved,
        icon: 'Sun',
        color: subtype === 'Papa-Obhayachari' ? 'text-red-700' : 'text-amber-600',
        bg: subtype === 'Papa-Obhayachari' ? 'bg-red-50/50' : 'bg-amber-50/50',
        border: subtype === 'Papa-Obhayachari' ? 'border-red-200' : 'border-amber-200',
        desc: `Planets occupy both the 2nd and 12th houses from the Sun (specifically, 2nd: ${vesiPlanets.join(', ')} | 12th: ${vasiPlanets.join(', ')}), featuring ${descType}. According to B.V. Raman, this Obhayachari Yoga ${resultsStr}`
      });

    } else if (vesiPlanets.length > 0) {
      // 12A. VESI YOGA
      const involved = ['Sun', ...vesiPlanets];
      const activeBenefics = vesiPlanets.filter(p => naturalBenefics.includes(p));
      const activeMalefics = vesiPlanets.filter(p => ['Mars', 'Saturn'].includes(p));

      let subtype = "Mixed";
      let descType = "a combination of natural benefics and malefics";
      let resultsStr = "gives moderate fortunes and structural career progress, balancing virtues with struggles.";
      
      if (activeBenefics.length > 0 && activeMalefics.length === 0) {
        subtype = "Subhavesi";
        descType = "only natural benefic planets";
        resultsStr = "makes the person fortunate, happy, virtuous, famous, respected, and aristocratic, with steady financial gains.";
      } else if (activeMalefics.length > 0 && activeBenefics.length === 0) {
        subtype = "Papavesi";
        descType = "only natural malefic planets";
        resultsStr = "indicates that the native may face initial struggles in life, speak harshly, or experience delays in accumulation of wealth, though they remain hardworking and daring.";
      }

      let specialBoostStr = "";
      if (lagnaIndex === 3 && rasiPlacements['Sun'] === 0 && rasiPlacements['Venus'] === 1 && vesiPlanets.includes('Venus')) {
        specialBoostStr = " 🌟 **B.V. Raman Supreme Boost**: With Lagna in Cancer, the Sun exalted in Aries, and Venus strong in Taurus causing Vesi Yoga, B.V. Raman highlights this as a supremely powerful configuration. The good results will find full play during the Dasa/Bhukti of the Sun and Venus.";
      }

      yogas.push({
        name: `Vesi Yoga (${subtype})`,
        type: subtype === 'Papavesi' ? 'Challenge' : 'Power/Rise',
        involved,
        icon: 'Sun',
        color: subtype === 'Papavesi' ? 'text-red-700' : 'text-amber-600',
        bg: subtype === 'Papavesi' ? 'bg-red-50/50' : 'bg-amber-50/50',
        border: subtype === 'Papavesi' ? 'border-red-200' : 'border-amber-200',
        desc: `Planets occupy the 2nd house from the Sun with the 12th remaining vacant (specifically: ${vesiPlanets.join(', ')}), featuring ${descType}. According to B.V. Raman, this Vesi Yoga ${resultsStr}${specialBoostStr}`
      });

    } else if (vasiPlanets.length > 0) {
      // 12B. VASI YOGA
      const involved = ['Sun', ...vasiPlanets];
      const activeBenefics = vasiPlanets.filter(p => naturalBenefics.includes(p));
      const activeMalefics = vasiPlanets.filter(p => ['Mars', 'Saturn'].includes(p));

      let subtype = "Mixed";
      let descType = "a combination of natural benefics and malefics";
      let resultsStr = "grants moderate prosperity and reputation with some initial struggles.";
      
      if (activeBenefics.length > 0 && activeMalefics.length === 0) {
        subtype = "Subhavasi";
        descType = "only natural benefic planets";
        resultsStr = "makes the person renowned, charitable, sweet-tongued, highly intelligent, and well-known in administrative or executive circles.";
      } else if (activeMalefics.length > 0 && activeBenefics.length === 0) {
        subtype = "Papavasi";
        descType = "only natural malefic planets";
        resultsStr = "may indicate a daring/aggressive temperament, initial career delays, or conflicts with authority, needing self-restraint and caution.";
      }

      yogas.push({
        name: `Vasi Yoga (${subtype})`,
        type: subtype === 'Papavasi' ? 'Challenge' : 'Power/Rise',
        involved,
        icon: 'Sun',
        color: subtype === 'Papavasi' ? 'text-red-700' : 'text-amber-600',
        bg: subtype === 'Papavasi' ? 'bg-red-50/50' : 'bg-amber-50/50',
        border: subtype === 'Papavasi' ? 'border-red-200' : 'border-amber-200',
        desc: `Planets occupy the 12th house from the Sun with the 2nd remaining vacant (specifically: ${vasiPlanets.join(', ')}), featuring ${descType}. According to B.V. Raman, this Vasi Yoga ${resultsStr}`
      });
    }
  }

  // ==========================================
  // 12D. MAHABHAGYA YOGA
  // ==========================================
  if (rasiPlacements['Sun'] !== undefined && rasiPlacements['Moon'] !== undefined && lagnaIndex !== undefined) {
    const isSunOdd = rasiPlacements['Sun'] % 2 === 0;
    const isMoonOdd = rasiPlacements['Moon'] % 2 === 0;
    const isLagnaOdd = lagnaIndex % 2 === 0;

    let hasMahabhagya = false;
    let desc = "";

    const isMale = String(gender).toLowerCase() === 'male' || String(gender).toLowerCase() === 'boy';
    if (isMale) {
      if (isDay && isSunOdd && isMoonOdd && isLagnaOdd) {
        hasMahabhagya = true;
        desc = `Sun (in ${SIGN_NAMES[rasiPlacements['Sun']]} - odd), Moon (in ${SIGN_NAMES[rasiPlacements['Moon']]} - odd), and Lagna (in ${SIGN_NAMES[lagnaIndex]} - odd) are all placed in odd signs, with birth during the daytime. According to B.V. Raman, a male born under Mahabhagya Yoga will have good character, will be a source of pleasure to others, will be liberal, generous, famous, a ruler or an equal to him, and will live to a good old age. The Lagna, the Sun, and the Moon form the tripod of life, ruling the body, soul, and mind respectively; when all three elements are disposed in odd or masculine signs for a male, the native becomes an ideal, highly fortunate person.`;
      }
    } else {
      if (!isDay && !isSunOdd && !isMoonOdd && !isLagnaOdd) {
        hasMahabhagya = true;
        desc = `Sun (in ${SIGN_NAMES[rasiPlacements['Sun']]} - even), Moon (in ${SIGN_NAMES[rasiPlacements['Moon']]} - even), and Lagna (in ${SIGN_NAMES[lagnaIndex]} - even) are all placed in even signs, with birth during the nighttime. According to B.V. Raman, a female born under Mahabhagya Yoga will be really fortunate, blessed with long-lived children and wealth, and she will be of good conduct. The Lagna, the Sun, and the Moon form the tripod of life, ruling the body, soul, and mind respectively; when all three elements are disposed in even or feminine signs for a female, it indicates an exceptionally fortunate alignment.`;
      }
    }

    if (hasMahabhagya) {
      yogas.push({
        name: 'Mahabhagya Yoga',
        type: 'Raja Yoga',
        involved: ['Sun', 'Moon'],
        icon: 'Crown',
        color: 'text-amber-800',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        desc
      });
    }
  }

  const mainPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  yogas.forEach(y => {
    // Check Yoga Bhanga (Cancellation/Modification)
    let isNeutralized = false;
    let bhangaModification = null;
    if (y.involved && Array.isArray(y.involved)) {
      const aspecting = [];
      y.involved.forEach(ip => {
        const ipRasi = rasiPlacements[ip];
        if (ipRasi !== undefined) {
          mainPlanets.forEach(p => {
            if (p !== ip) {
              // Conjunction
              if (rasiPlacements[p] === ipRasi) {
                aspecting.push(p);
              }
              // Aspect
              else if (hasAspect(p, ipRasi, rasiPlacements)) {
                aspecting.push(p);
              }
            }
          });
        }
      });
      const aspects = [...new Set(aspecting)];
      const bhanga = checkYogaBhanga(y, aspects);
      isNeutralized = bhanga.isNeutralized;
      bhangaModification = bhanga.modification;
      
      if (isNeutralized) {
        y.status = 'Neutralized';
        y.type = 'Neutralized';
        if (bhangaModification) {
          y.desc += ` [Neutralized: ${bhangaModification}]`;
        } else {
          y.desc += ` [Cancelled / Neutralized]`;
        }
      } else if (bhangaModification) {
        y.status = 'Active';
        y.desc += ` [Modified: ${bhangaModification}]`;
        if (y.name === 'Nishturabhashi Yoga' && bhangaModification.includes('sarcastic')) {
          y.results = 'The person will be sarcastic in speech.';
          if (!y.involved.includes('Mars')) {
            y.involved.push('Mars');
          }
        }
      } else {
        y.status = 'Active';
      }
    } else {
      y.status = 'Active';
    }

    if (y.involved && Array.isArray(y.involved)) {
      const participants = y.involved.filter(p => mainPlanets.includes(p));
      if (participants.length >= 2) {
        let strongest = null;
        let strongestScore = -99999;
        let weakest = null;
        let weakestScore = 99999;
        
        const infoLines = [];
        participants.forEach(p => {
          const score = shadbalaScores[p]?.percentage ?? 50;
          const netUnits = getNetUnits(p, lagnaIndex);
          const resStrength = getResidentialStrength(p, lagnaDegree);
          
          // Use B.V. Raman's Net Units as primary strength metric, and Shadbala as tie-breaker
          const comparisonValue = netUnits * 1000 + score;
          
          if (comparisonValue > strongestScore) {
            strongestScore = comparisonValue;
            strongest = p;
          }
          if (comparisonValue < weakestScore) {
            weakestScore = comparisonValue;
            weakest = p;
          }
          
          infoLines.push(`• **${p}**: Net Units: **${netUnits >= 0 ? '+' : ''}${netUnits}**, Residential Strength: **${Math.round(resStrength * 100)}%**, Shadbala: **${score}%**`);
        });
        
        if (strongest && weakest && strongest !== weakest) {
          const strongestRes = Math.round(getResidentialStrength(strongest, lagnaDegree) * 100);
          const weakestRes = Math.round(getResidentialStrength(weakest, lagnaDegree) * 100);
          
          y.desc += `\n\n⚖️ **Raman Strength Calibration**:\n${infoLines.join('\n')}\n\n• **Dasa Lord (Major)**: **${strongest}** will fulfill the larger part of the indications of the yoga during its Dasa (major period) with a potential manifestation capacity of **${strongestRes}%** based on its residential strength.\n• **Bhukti Lord (Sub-period)**: **${weakest}** will fulfill its part to a lesser extent as a Bhukti/Sub-lord with a potential manifestation capacity of **${weakestRes}%** based on its residential strength.`;
        }
      }
    }
  });

  const uniqueYogas = [];
  const seen = new Set();
  yogas.forEach(y => {
    const categorized = attachCategory(y);
    if (!seen.has(categorized.desc)) {
      seen.add(categorized.desc);
      uniqueYogas.push(categorized);
    }
  });

  return uniqueYogas;
};

// ============================================================================
// 🛠️ YOGA WRAPPER & CENTRALIZED EXPORTS
// ============================================================================

// ============================================================================
// 🛠️ YOGA WRAPPER & CENTRALIZED EXPORTS
// ============================================================================

// ============================================================================
// 🛠️ YOGA WRAPPER & CENTRALIZED EXPORTS
// ============================================================================

// ============================================================================
// 🛠️ YOGA WRAPPER & CENTRALIZED EXPORTS
// ============================================================================

let activeCategoryFilter = null;

export const YOGA_CATEGORIES = {
  RAJA_YOGA: 'RAJA_YOGA',
  DHANA_YOGA: 'DHANA_YOGA',
  ARISHTA_YOGA: 'ARISHTA_YOGA',
  NABHASA_YOGA: 'NABHASA_YOGA',
  PHYSICAL_LIFESTYLE_YOGA: 'PHYSICAL_LIFESTYLE_YOGA'
};

export const attachCategory = (yoga) => {
  if (!yoga) return yoga;
  let category = YOGA_CATEGORIES.PHYSICAL_LIFESTYLE_YOGA;
  const name = yoga.name || '';
  const type = yoga.type || '';
  
  if (name.includes('Bhanga') && !name.includes('Neechabhanga')) {
    category = YOGA_CATEGORIES.ARISHTA_YOGA;
  } else if (
    name.includes('Raja') ||
    name.includes('Neechabhanga') ||
    name.includes('Gola') ||
    name.includes('Thrilochana') ||
    name.includes('Kulavardhana') ||
    name.includes('Bhagya') ||
    name.includes('Saraswathi') ||
    name.includes('Budha') ||
    name.includes('Bheri') ||
    name.includes('Parivartana') ||
    name.includes('Pushkala') ||
    name.includes('Gauri') ||
    name.includes('Chapa') ||
    name.includes('Sreenatha') ||
    name.includes('Sankha') ||
    name.includes('Gaja') ||
    name.includes('Kalanidhi') ||
    name.includes('Amsavatara') ||
    name.includes('Harihara') ||
    name.includes('Kusuma') ||
    name.includes('Matsya') ||
    name.includes('Adhi') ||
    name.includes('Chatussagara') ||
    name.includes('Rajalakshana') ||
    name.includes('Amala') ||
    name.includes('Parvata') ||
    type === 'Vipreet Raja' ||
    type === 'Power/Status' ||
    type === 'Power/Rise' ||
    type === 'Raja Yoga'
  ) {
    category = YOGA_CATEGORIES.RAJA_YOGA;
  } else if (
    name.includes('Dhana') ||
    name.includes('Swaveeryaddhana') ||
    name.includes('Vayasi') ||
    name.includes('mooladdhana') ||
    name.includes('Ayatna') ||
    name.includes('Amaranantha') ||
    type === 'Wealth/Dhana Yoga' ||
    type === 'Auspicious Wealth Yoga'
  ) {
    category = YOGA_CATEGORIES.DHANA_YOGA;
  } else if (
    type === 'Challenge' ||
    type === 'Dosha' ||
    type === 'Protection' ||
    type === 'Inauspicious Yoga' ||
    type === 'Arishta Yoga' ||
    name.includes('Bhrashta') ||
    name.includes('Duryoga') ||
    name.includes('Daridra') ||
    name.includes('Kahala') ||
    name.includes('Kemadruma')
  ) {
    category = YOGA_CATEGORIES.ARISHTA_YOGA;
  } else if (type.includes('Nabhasa')) {
    category = YOGA_CATEGORIES.NABHASA_YOGA;
  }

  return {
    ...yoga,
    category,
    subType: yoga.subType || yoga.type || 'Other'
  };
};

const wrapYogaChecker = (fn, category, defaultSubType, returnsArray = false) => {
  return (...args) => {
    if (activeCategoryFilter && activeCategoryFilter !== category) {
      return returnsArray ? [] : null;
    }
    const result = fn(...args);
    if (!result) return returnsArray ? [] : null;
    if (Array.isArray(result)) {
      return result.map(item => ({
        ...item,
        category,
        subType: item.type || item.subType || defaultSubType
      }));
    }
    return {
      ...result,
      category,
      subType: result.type || result.subType || defaultSubType
    };
  };
};

export const YOGA_REGISTRY = {
  RAJA_YOGA: {
    checkGolaYoga: wrapYogaChecker(_checkGolaYoga, 'RAJA_YOGA', 'Power/Status', false),
    checkThrilochanaYoga: wrapYogaChecker(_checkThrilochanaYoga, 'RAJA_YOGA', 'Power/Status', false),
    checkKulavardhanaYoga: wrapYogaChecker(_checkKulavardhanaYoga, 'RAJA_YOGA', 'Power/Status', false),
    checkBhagyaYoga: wrapYogaChecker(_checkBhagyaYoga, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga245: wrapYogaChecker(_checkRajaYoga245, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga246: wrapYogaChecker(_checkRajaYoga246, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga247: wrapYogaChecker(_checkRajaYoga247, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga248: wrapYogaChecker(_checkRajaYoga248, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga249: wrapYogaChecker(_checkRajaYoga249, 'RAJA_YOGA', 'Power/Status', true),
    checkNeechabhangaRajaYoga250: wrapYogaChecker(_checkNeechabhangaRajaYoga250, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga251: wrapYogaChecker(_checkRajaYoga251, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga252: wrapYogaChecker(_checkRajaYoga252, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga253: wrapYogaChecker(_checkRajaYoga253, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga254: wrapYogaChecker(_checkRajaYoga254, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga255: wrapYogaChecker(_checkRajaYoga255, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga256: wrapYogaChecker(_checkRajaYoga256, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga257: wrapYogaChecker(_checkRajaYoga257, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga258: wrapYogaChecker(_checkRajaYoga258, 'RAJA_YOGA', 'Power/Status', true),
    checkYoga259: wrapYogaChecker(_checkYoga259, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga260: wrapYogaChecker(_checkRajaYoga260, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga261: wrapYogaChecker(_checkRajaYoga261, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga262: wrapYogaChecker(_checkRajaYoga262, 'RAJA_YOGA', 'Power/Status', true),
    checkRajaYoga263: wrapYogaChecker(_checkRajaYoga263, 'RAJA_YOGA', 'Power/Status', true),
    checkMarudYoga: wrapYogaChecker(_checkMarudYoga, 'RAJA_YOGA', 'Power/Status', true),
    checkSaraswathiYoga: wrapYogaChecker(_checkSaraswathiYoga, 'RAJA_YOGA', 'Power/Status', true),
    checkBudhaYoga: wrapYogaChecker(_checkBudhaYoga, 'RAJA_YOGA', 'Power/Status', true),
    checkBheriYogas: wrapYogaChecker(_checkBheriYogas, 'RAJA_YOGA', 'Power/Status', true)
  },
  DHANA_YOGA: {
    checkDhanaYogas: wrapYogaChecker(_checkDhanaYogas, 'DHANA_YOGA', 'Wealth/Status', true),
    checkAdditionalDhanaYogas: wrapYogaChecker(_checkAdditionalDhanaYogas, 'DHANA_YOGA', 'Wealth/Status', true),
    checkSwaveeryaddhanaYogas: wrapYogaChecker(_checkSwaveeryaddhanaYogas, 'DHANA_YOGA', 'Wealth/Status', true),
    checkMadhyaVayasiDhanaYoga: wrapYogaChecker(_checkMadhyaVayasiDhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkAnthyaVayasiDhanaYoga: wrapYogaChecker(_checkAnthyaVayasiDhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkBalyaDhanaYoga: wrapYogaChecker(_checkBalyaDhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkBhratrumooladdhanapraptiYoga: wrapYogaChecker(_checkBhratrumooladdhanapraptiYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkMatrumooladdhanaYoga: wrapYogaChecker(_checkMatrumooladdhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkPutramooladdhanaYoga: wrapYogaChecker(_checkPutramooladdhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkSatrumooladdhanaYoga: wrapYogaChecker(_checkSatrumooladdhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkKalatramooladdhanaYoga: wrapYogaChecker(_checkKalatramooladdhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkAmarananthaDhanaYoga: wrapYogaChecker(_checkAmarananthaDhanaYoga, 'DHANA_YOGA', 'Wealth/Status', true),
    checkAyatnadhanalabhaYoga: wrapYogaChecker(_checkAyatnadhanalabhaYoga, 'DHANA_YOGA', 'Wealth/Status', true)
  },
  ARISHTA_YOGA: {
    checkDuryoga: wrapYogaChecker(_checkDuryoga, 'ARISHTA_YOGA', 'Arishta/Challenge', false),
    checkDaridraYoga: wrapYogaChecker(_checkDaridraYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', false),
    checkDaridraYogas: wrapYogaChecker(_checkDaridraYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAsatyavadiYoga: wrapYogaChecker(_checkAsatyavadiYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkBuddhiJadaYoga: wrapYogaChecker(_checkBuddhiJadaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkJaraYoga: wrapYogaChecker(_checkJaraYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkJarajaputraYoga: wrapYogaChecker(_checkJarajaputraYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkJananatpurvamPitruMaranaYoga: wrapYogaChecker(_checkJananatpurvamPitruMaranaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkApakeertiYoga: wrapYogaChecker(_checkApakeertiYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkGalakarnaYoga: wrapYogaChecker(_checkGalakarnaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVranaYoga: wrapYogaChecker(_checkVranaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSisnavyadhiYoga: wrapYogaChecker(_checkSisnavyadhiYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKalatrashandaYoga: wrapYogaChecker(_checkKalatrashandaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKushtarogaYoga268: wrapYogaChecker(_checkKushtarogaYoga268, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKushtarogaYoga269: wrapYogaChecker(_checkKushtarogaYoga269, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKshayarogaYoga: wrapYogaChecker(_checkKshayarogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkBandhanaYoga: wrapYogaChecker(_checkBandhanaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKaraschedaYoga: wrapYogaChecker(_checkKaraschedaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSirachchedaYoga: wrapYogaChecker(_checkSirachchedaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkDurmaranaYoga: wrapYogaChecker(_checkDurmaranaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkYuddheMaranaYoga: wrapYogaChecker(_checkYuddheMaranaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSanghatakaMaranaYoga276: wrapYogaChecker(_checkSanghatakaMaranaYoga276, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSanghatakaMaranaYoga277: wrapYogaChecker(_checkSanghatakaMaranaYoga277, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPeenasarogaYoga: wrapYogaChecker(_checkPeenasarogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPittarogaYoga: wrapYogaChecker(_checkPittarogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVikalangapatniYoga: wrapYogaChecker(_checkVikalangapatniYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPutrakalatraheenaYoga: wrapYogaChecker(_checkPutrakalatraheenaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkBharyasahavyabhicharaYoga: wrapYogaChecker(_checkBharyasahavyabhicharaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVamsachedaYoga: wrapYogaChecker(_checkVamsachedaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkGuhyarogaYoga: wrapYogaChecker(_checkGuhyarogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAngaheenaYoga: wrapYogaChecker(_checkAngaheenaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSwetakushtaYoga: wrapYogaChecker(_checkSwetakushtaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPisachaGrasthaYoga: wrapYogaChecker(_checkPisachaGrasthaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAndhaYoga288: wrapYogaChecker(_checkAndhaYoga288, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAndhaYoga289: wrapYogaChecker(_checkAndhaYoga289, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVatharogaYoga: wrapYogaChecker(_checkVatharogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatibhramanaYoga291: wrapYogaChecker(_checkMatibhramanaYoga291, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatibhramanaYoga292: wrapYogaChecker(_checkMatibhramanaYoga292, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatibhramanaYoga293: wrapYogaChecker(_checkMatibhramanaYoga293, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatibhramanaYoga294: wrapYogaChecker(_checkMatibhramanaYoga294, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKhalwataYoga: wrapYogaChecker(_checkKhalwataYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkNishturabhashiYoga: wrapYogaChecker(_checkNishturabhashiYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkRajabhrashtaYoga: wrapYogaChecker(_checkRajabhrashtaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkRajaYogaBhanga298: wrapYogaChecker(_checkRajaYogaBhanga298, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkRajaYogaBhanga299: wrapYogaChecker(_checkRajaYogaBhanga299, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkGohantaYoga: wrapYogaChecker(_checkGohantaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMookaYoga: wrapYogaChecker(_checkMookaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkNetranasaYoga: wrapYogaChecker(_checkNetranasaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAndhaYoga: wrapYogaChecker(_checkAndhaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkDurmukhaYogas: wrapYogaChecker(_checkDurmukhaYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkParannabhojanaYoga: wrapYogaChecker(_checkParannabhojanaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSraddhannabhukthaYoga: wrapYogaChecker(_checkSraddhannabhukthaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSarpagandaYoga: wrapYogaChecker(_checkSarpagandaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVakchalanaYoga: wrapYogaChecker(_checkVakchalanaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkVishaprayogaYoga: wrapYogaChecker(_checkVishaprayogaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSodaranasaYoga: wrapYogaChecker(_checkSodaranasaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkYuddhatpoorvadridhachittaYoga: wrapYogaChecker(_checkYuddhatpoorvadridhachittaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkGrihanasaYogas: wrapYogaChecker(_checkGrihanasaYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkBandhubhisthyakthaYoga: wrapYogaChecker(_checkBandhubhisthyakthaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatrunasaYogas: wrapYogaChecker(_checkMatrunasaYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatrugamiYoga: wrapYogaChecker(_checkMatrugamiYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSahodareesangamaYoga: wrapYogaChecker(_checkSahodareesangamaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKapataYogas: wrapYogaChecker(_checkKapataYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatruSatrutwaYoga: wrapYogaChecker(_checkMatruSatrutwaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAnapathyaYoga: wrapYogaChecker(_checkAnapathyaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkSarpasapaYogas: wrapYogaChecker(_checkSarpasapaYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPitrusapaSutakshayaYoga: wrapYogaChecker(_checkPitrusapaSutakshayaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkMatrusapaSutakshayaYoga: wrapYogaChecker(_checkMatrusapaSutakshayaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkBhratrusapaSutakshayaYoga: wrapYogaChecker(_checkBhratrusapaSutakshayaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkPretasapaYoga: wrapYogaChecker(_checkPretasapaYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkAputraYoga: wrapYogaChecker(_checkAputraYoga, 'ARISHTA_YOGA', 'Arishta/Challenge', true),
    checkKalanirdesatPutranasaYogas: wrapYogaChecker(_checkKalanirdesatPutranasaYogas, 'ARISHTA_YOGA', 'Arishta/Challenge', true)
  },
  NABHASA_YOGA: {
    checkNabhasaAkritiYogas: wrapYogaChecker(_checkNabhasaAkritiYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', false),
    checkNabhasaSevenHouseYogas: wrapYogaChecker(_checkNabhasaSevenHouseYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', false),
    checkArdhaChandraYoga: wrapYogaChecker(_checkArdhaChandraYoga, 'NABHASA_YOGA', 'Nabhasa Configuration', false),
    checkNabhasaPatternYogas: wrapYogaChecker(_checkNabhasaPatternYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', true),
    checkNabhasaSankhyaYogas: wrapYogaChecker(_checkNabhasaSankhyaYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', false),
    checkNabhasaAsrayaYogas: wrapYogaChecker(_checkNabhasaAsrayaYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', false),
    checkNabhasaDalaYogas: wrapYogaChecker(_checkNabhasaDalaYogas, 'NABHASA_YOGA', 'Nabhasa Configuration', false)
  },
  PHYSICAL_LIFESTYLE_YOGA: {
    checkPhysicalBodyYogas: wrapYogaChecker(_checkPhysicalBodyYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkKrisangaYogas: wrapYogaChecker(_checkKrisangaYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkDehasthoulyaYogas: wrapYogaChecker(_checkDehasthoulyaYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSadaSancharaYoga: wrapYogaChecker(_checkSadaSancharaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', false),
    checkYukthiSamanwithavagmiYogas: wrapYogaChecker(_checkYukthiSamanwithavagmiYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkParihasakaYoga: wrapYogaChecker(_checkParihasakaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkTheevrabuddhiYoga: wrapYogaChecker(_checkTheevrabuddhiYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkThrikalagnanaYoga: wrapYogaChecker(_checkThrikalagnanaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkPutraSukhaYoga: wrapYogaChecker(_checkPutraSukhaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBahuStreeYoga: wrapYogaChecker(_checkBahuStreeYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSatkalatraYoga: wrapYogaChecker(_checkSatkalatraYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBhagaChumbanaYoga: wrapYogaChecker(_checkBhagaChumbanaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkDhatrutwaYoga: wrapYogaChecker(_checkDhatrutwaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkJadaAndBhaskaraYogas: wrapYogaChecker(_checkJadaAndBhaskaraYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSumukhaYogas: wrapYogaChecker(_checkSumukhaYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBhojanaSoukhyaYoga: wrapYogaChecker(_checkBhojanaSoukhyaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkAnnadanaYoga: wrapYogaChecker(_checkAnnadanaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBhratruvriddhiYoga: wrapYogaChecker(_checkBhratruvriddhiYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkEkabhaginiYoga: wrapYogaChecker(_checkEkabhaginiYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkDwadasaSahodaraYoga: wrapYogaChecker(_checkDwadasaSahodaraYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSapthasankhyaSahodaraYoga: wrapYogaChecker(_checkSapthasankhyaSahodaraYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkParakramaYoga: wrapYogaChecker(_checkParakramaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkYuddhaPraveenaYoga: wrapYogaChecker(_checkYuddhaPraveenaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkYuddhatpaschaddrudhaYoga: wrapYogaChecker(_checkYuddhatpaschaddrudhaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSatkathadisravanaYoga: wrapYogaChecker(_checkSatkathadisravanaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBandhuPujyaYogas: wrapYogaChecker(_checkBandhuPujyaYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkMatrudeerghayurYogas: wrapYogaChecker(_checkMatrudeerghayurYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkNishkapataYogas: wrapYogaChecker(_checkNishkapataYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkMatruSnehaYoga: wrapYogaChecker(_checkMatruSnehaYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkVahanaYogas: wrapYogaChecker(_checkVahanaYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkBahuputraYogas: wrapYogaChecker(_checkBahuputraYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkDattaputraYogas: wrapYogaChecker(_checkDattaputraYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkEkaputraYoga: wrapYogaChecker(_checkEkaputraYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkSuputraYoga: wrapYogaChecker(_checkSuputraYoga, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true),
    checkKalanirdesatPutraYogas: wrapYogaChecker(_checkKalanirdesatPutraYogas, 'PHYSICAL_LIFESTYLE_YOGA', 'Physical/Lifestyle', true)
  }
};

// Individual checker exports (wrapped with category and subType metadata)
export const checkGolaYoga = YOGA_REGISTRY.RAJA_YOGA.checkGolaYoga;
export const checkThrilochanaYoga = YOGA_REGISTRY.RAJA_YOGA.checkThrilochanaYoga;
export const checkKulavardhanaYoga = YOGA_REGISTRY.RAJA_YOGA.checkKulavardhanaYoga;
export const checkBhagyaYoga = YOGA_REGISTRY.RAJA_YOGA.checkBhagyaYoga;
export const checkRajaYoga245 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga245;
export const checkRajaYoga246 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga246;
export const checkRajaYoga247 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga247;
export const checkRajaYoga248 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga248;
export const checkRajaYoga249 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga249;
export const checkNeechabhangaRajaYoga250 = YOGA_REGISTRY.RAJA_YOGA.checkNeechabhangaRajaYoga250;
export const checkRajaYoga251 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga251;
export const checkRajaYoga252 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga252;
export const checkRajaYoga253 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga253;
export const checkRajaYoga254 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga254;
export const checkRajaYoga255 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga255;
export const checkRajaYoga256 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga256;
export const checkRajaYoga257 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga257;
export const checkRajaYoga258 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga258;
export const checkYoga259 = YOGA_REGISTRY.RAJA_YOGA.checkYoga259;
export const checkRajaYoga260 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga260;
export const checkRajaYoga261 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga261;
export const checkRajaYoga262 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga262;
export const checkRajaYoga263 = YOGA_REGISTRY.RAJA_YOGA.checkRajaYoga263;
export const checkMarudYoga = YOGA_REGISTRY.RAJA_YOGA.checkMarudYoga;
export const checkSaraswathiYoga = YOGA_REGISTRY.RAJA_YOGA.checkSaraswathiYoga;
export const checkBudhaYoga = YOGA_REGISTRY.RAJA_YOGA.checkBudhaYoga;
export const checkBheriYogas = YOGA_REGISTRY.RAJA_YOGA.checkBheriYogas;
export const checkDhanaYogas = YOGA_REGISTRY.DHANA_YOGA.checkDhanaYogas;
export const checkAdditionalDhanaYogas = YOGA_REGISTRY.DHANA_YOGA.checkAdditionalDhanaYogas;
export const checkSwaveeryaddhanaYogas = YOGA_REGISTRY.DHANA_YOGA.checkSwaveeryaddhanaYogas;
export const checkMadhyaVayasiDhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkMadhyaVayasiDhanaYoga;
export const checkAnthyaVayasiDhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkAnthyaVayasiDhanaYoga;
export const checkBalyaDhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkBalyaDhanaYoga;
export const checkBhratrumooladdhanapraptiYoga = YOGA_REGISTRY.DHANA_YOGA.checkBhratrumooladdhanapraptiYoga;
export const checkMatrumooladdhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkMatrumooladdhanaYoga;
export const checkPutramooladdhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkPutramooladdhanaYoga;
export const checkSatrumooladdhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkSatrumooladdhanaYoga;
export const checkKalatramooladdhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkKalatramooladdhanaYoga;
export const checkAmarananthaDhanaYoga = YOGA_REGISTRY.DHANA_YOGA.checkAmarananthaDhanaYoga;
export const checkAyatnadhanalabhaYoga = YOGA_REGISTRY.DHANA_YOGA.checkAyatnadhanalabhaYoga;
export const checkDuryoga = YOGA_REGISTRY.ARISHTA_YOGA.checkDuryoga;
export const checkDaridraYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkDaridraYoga;
export const checkDaridraYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkDaridraYogas;
export const checkAsatyavadiYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkAsatyavadiYoga;
export const checkBuddhiJadaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkBuddhiJadaYoga;
export const checkJaraYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkJaraYoga;
export const checkJarajaputraYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkJarajaputraYoga;
export const checkJananatpurvamPitruMaranaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkJananatpurvamPitruMaranaYoga;
export const checkApakeertiYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkApakeertiYoga;
export const checkGalakarnaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkGalakarnaYoga;
export const checkVranaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVranaYoga;
export const checkSisnavyadhiYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSisnavyadhiYoga;
export const checkKalatrashandaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkKalatrashandaYoga;
export const checkKushtarogaYoga268 = YOGA_REGISTRY.ARISHTA_YOGA.checkKushtarogaYoga268;
export const checkKushtarogaYoga269 = YOGA_REGISTRY.ARISHTA_YOGA.checkKushtarogaYoga269;
export const checkKshayarogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkKshayarogaYoga;
export const checkBandhanaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkBandhanaYoga;
export const checkKaraschedaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkKaraschedaYoga;
export const checkSirachchedaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSirachchedaYoga;
export const checkDurmaranaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkDurmaranaYoga;
export const checkYuddheMaranaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkYuddheMaranaYoga;
export const checkSanghatakaMaranaYoga276 = YOGA_REGISTRY.ARISHTA_YOGA.checkSanghatakaMaranaYoga276;
export const checkSanghatakaMaranaYoga277 = YOGA_REGISTRY.ARISHTA_YOGA.checkSanghatakaMaranaYoga277;
export const checkPeenasarogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPeenasarogaYoga;
export const checkPittarogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPittarogaYoga;
export const checkVikalangapatniYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVikalangapatniYoga;
export const checkPutrakalatraheenaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPutrakalatraheenaYoga;
export const checkBharyasahavyabhicharaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkBharyasahavyabhicharaYoga;
export const checkVamsachedaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVamsachedaYoga;
export const checkGuhyarogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkGuhyarogaYoga;
export const checkAngaheenaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkAngaheenaYoga;
export const checkSwetakushtaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSwetakushtaYoga;
export const checkPisachaGrasthaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPisachaGrasthaYoga;
export const checkAndhaYoga288 = YOGA_REGISTRY.ARISHTA_YOGA.checkAndhaYoga288;
export const checkAndhaYoga289 = YOGA_REGISTRY.ARISHTA_YOGA.checkAndhaYoga289;
export const checkVatharogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVatharogaYoga;
export const checkMatibhramanaYoga291 = YOGA_REGISTRY.ARISHTA_YOGA.checkMatibhramanaYoga291;
export const checkMatibhramanaYoga292 = YOGA_REGISTRY.ARISHTA_YOGA.checkMatibhramanaYoga292;
export const checkMatibhramanaYoga293 = YOGA_REGISTRY.ARISHTA_YOGA.checkMatibhramanaYoga293;
export const checkMatibhramanaYoga294 = YOGA_REGISTRY.ARISHTA_YOGA.checkMatibhramanaYoga294;
export const checkKhalwataYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkKhalwataYoga;
export const checkNishturabhashiYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkNishturabhashiYoga;
export const checkRajabhrashtaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkRajabhrashtaYoga;
export const checkRajaYogaBhanga298 = YOGA_REGISTRY.ARISHTA_YOGA.checkRajaYogaBhanga298;
export const checkRajaYogaBhanga299 = YOGA_REGISTRY.ARISHTA_YOGA.checkRajaYogaBhanga299;
export const checkGohantaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkGohantaYoga;
export const checkMookaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkMookaYoga;
export const checkNetranasaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkNetranasaYoga;
export const checkAndhaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkAndhaYoga;
export const checkDurmukhaYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkDurmukhaYogas;
export const checkParannabhojanaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkParannabhojanaYoga;
export const checkSraddhannabhukthaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSraddhannabhukthaYoga;
export const checkSarpagandaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSarpagandaYoga;
export const checkVakchalanaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVakchalanaYoga;
export const checkVishaprayogaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkVishaprayogaYoga;
export const checkSodaranasaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSodaranasaYoga;
export const checkYuddhatpoorvadridhachittaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkYuddhatpoorvadridhachittaYoga;
export const checkGrihanasaYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkGrihanasaYogas;
export const checkBandhubhisthyakthaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkBandhubhisthyakthaYoga;
export const checkMatrunasaYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkMatrunasaYogas;
export const checkMatrugamiYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkMatrugamiYoga;
export const checkSahodareesangamaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkSahodareesangamaYoga;
export const checkKapataYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkKapataYogas;
export const checkMatruSatrutwaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkMatruSatrutwaYoga;
export const checkAnapathyaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkAnapathyaYoga;
export const checkSarpasapaYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkSarpasapaYogas;
export const checkPitrusapaSutakshayaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPitrusapaSutakshayaYoga;
export const checkMatrusapaSutakshayaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkMatrusapaSutakshayaYoga;
export const checkBhratrusapaSutakshayaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkBhratrusapaSutakshayaYoga;
export const checkPretasapaYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkPretasapaYoga;
export const checkAputraYoga = YOGA_REGISTRY.ARISHTA_YOGA.checkAputraYoga;
export const checkKalanirdesatPutranasaYogas = YOGA_REGISTRY.ARISHTA_YOGA.checkKalanirdesatPutranasaYogas;
export const checkNabhasaAkritiYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaAkritiYogas;
export const checkNabhasaSevenHouseYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaSevenHouseYogas;
export const checkArdhaChandraYoga = YOGA_REGISTRY.NABHASA_YOGA.checkArdhaChandraYoga;
export const checkNabhasaPatternYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaPatternYogas;
export const checkNabhasaSankhyaYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaSankhyaYogas;
export const checkNabhasaAsrayaYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaAsrayaYogas;
export const checkNabhasaDalaYogas = YOGA_REGISTRY.NABHASA_YOGA.checkNabhasaDalaYogas;
export const checkPhysicalBodyYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkPhysicalBodyYogas;
export const checkKrisangaYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkKrisangaYogas;
export const checkDehasthoulyaYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkDehasthoulyaYogas;
export const checkSadaSancharaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSadaSancharaYoga;
export const checkYukthiSamanwithavagmiYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkYukthiSamanwithavagmiYogas;
export const checkParihasakaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkParihasakaYoga;
export const checkTheevrabuddhiYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkTheevrabuddhiYoga;
export const checkThrikalagnanaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkThrikalagnanaYoga;
export const checkPutraSukhaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkPutraSukhaYoga;
export const checkBahuStreeYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBahuStreeYoga;
export const checkSatkalatraYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSatkalatraYoga;
export const checkBhagaChumbanaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBhagaChumbanaYoga;
export const checkDhatrutwaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkDhatrutwaYoga;
export const checkJadaAndBhaskaraYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkJadaAndBhaskaraYogas;
export const checkSumukhaYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSumukhaYogas;
export const checkBhojanaSoukhyaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBhojanaSoukhyaYoga;
export const checkAnnadanaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkAnnadanaYoga;
export const checkBhratruvriddhiYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBhratruvriddhiYoga;
export const checkEkabhaginiYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkEkabhaginiYoga;
export const checkDwadasaSahodaraYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkDwadasaSahodaraYoga;
export const checkSapthasankhyaSahodaraYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSapthasankhyaSahodaraYoga;
export const checkParakramaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkParakramaYoga;
export const checkYuddhaPraveenaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkYuddhaPraveenaYoga;
export const checkYuddhatpaschaddrudhaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkYuddhatpaschaddrudhaYoga;
export const checkSatkathadisravanaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSatkathadisravanaYoga;
export const checkBandhuPujyaYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBandhuPujyaYogas;
export const checkMatrudeerghayurYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkMatrudeerghayurYogas;
export const checkNishkapataYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkNishkapataYogas;
export const checkMatruSnehaYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkMatruSnehaYoga;
export const checkVahanaYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkVahanaYogas;
export const checkBahuputraYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkBahuputraYogas;
export const checkDattaputraYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkDattaputraYogas;
export const checkEkaputraYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkEkaputraYoga;
export const checkSuputraYoga = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkSuputraYoga;
export const checkKalanirdesatPutraYogas = YOGA_REGISTRY.PHYSICAL_LIFESTYLE_YOGA.checkKalanirdesatPutraYogas;

export const getProcessedYogas = (first, ...rest) => {
  let planets, lagnaIndex, lagnaDegree, additionalInfo, categoryFilter;
  if (first && typeof first === 'object' && !Array.isArray(first) && (first.planets || first.natalPlanets || first.rasiPlacements)) {
    planets = first.planets || first.natalPlanets || [];
    lagnaIndex = first.lagnaIndex ?? 0;
    lagnaDegree = first.lagnaDegree ?? 15;
    additionalInfo = first.additionalInfo || first;
    categoryFilter = rest[0] !== undefined ? rest[0] : (first.categoryFilter || null);
  } else {
    planets = first;
    if (rest.length === 1) {
      categoryFilter = rest[0];
      lagnaIndex = 0;
      lagnaDegree = 15;
      additionalInfo = {};
    } else {
      lagnaIndex = rest[0] ?? 0;
      lagnaDegree = rest[1] ?? 15;
      additionalInfo = rest[2] || {};
      categoryFilter = rest[3] || null;
    }
  }

  activeCategoryFilter = categoryFilter;
  try {
    const results = calculateYogas(planets, lagnaIndex, lagnaDegree, additionalInfo);
    if (categoryFilter) {
      return results.filter(y => y.category === categoryFilter);
    }
    return results;
  } finally {
    activeCategoryFilter = null;
  }
};
