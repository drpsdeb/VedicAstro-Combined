// ============================================================================
// 🧠 DYNAMIC KP RULE INTERPRETER
// ============================================================================

import kpRules from './kpRules.json' with { type: 'json' };
import { getKPDivisions } from './kpEngine.js';

// Zodiac signs list in standard order
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Groupings for sign classifications
const BARREN_SIGNS = ['Aries', 'Gemini', 'Leo', 'Virgo'];
const FRUITFUL_SIGNS = ['Taurus', 'Cancer', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const WATERY_SIGNS = ['Cancer', 'Scorpio', 'Pisces'];

/**
 * Helper to determine the zodiac sign name from longitude in degrees (0-360)
 * @param {number} longitude 
 * @returns {string} Sign name
 */
export function getZodiacSign(longitude) {
  const normLon = ((longitude % 360) + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(normLon / 30)];
}

/**
 * Helper to determine the Badhaka house for a chart based on Lagna (Ascendant) longitude
 * Movable signs (Aries, Cancer, Libra, Capricorn) -> 11th house
 * Fixed signs (Taurus, Leo, Scorpio, Aquarius) -> 9th house
 * Dual/Common signs (Gemini, Virgo, Sagittarius, Pisces) -> 7th house
 * 
 * @param {number} lagnaLongitude 
 * @returns {number} Badhaka house number
 */
export function getBadhakaHouse(lagnaLongitude) {
  const signIndex = Math.floor(((lagnaLongitude % 360) + 360) % 360 / 30);
  if ([0, 3, 6, 9].includes(signIndex)) {
    return 11; // Movable
  } else if ([1, 4, 7, 10].includes(signIndex)) {
    return 9;  // Fixed
  } else {
    return 7;  // Common / Dual
  }
}

/**
 * Dynamic Rule Interpreter for KP Events
 * Cross-references the natal chart data against stored KP rules.
 * 
 * @param {string} category - Top level category (e.g. 'MARRIAGE', 'INCOME', 'DIFFICULTY')
 * @param {string} subcategory - Subcategory/Matter name
 * @param {object} computedChartData - Serialized or raw KP chart data
 * @returns {object} Synthesis object matching standard specification
 */
export function evaluateKPEvent(category, subcategory, computedChartData) {
  if (!computedChartData) {
    throw new Error('computedChartData is required for evaluation.');
  }

  // 1. Normalize Category & Subcategory keys
  const catKey = String(category).toUpperCase().replace(/\s+/g, '_');
  let subKey = String(subcategory)
    .toUpperCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
  
  if (subKey.length > 50) {
    subKey = subKey.substring(0, 47) + '_ETC';
  }

  const categoryRules = kpRules[catKey];
  if (!categoryRules) {
    throw new Error(`Category "${category}" not found in rules database.`);
  }

  let rule = categoryRules[subKey];
  if (!rule) {
    // Attempt fallback prefix matching or matter description lookup
    const keys = Object.keys(categoryRules);
    const matchedKey = keys.find(
      k => k.startsWith(subKey) || 
      k === subKey || 
      categoryRules[k].matter.toLowerCase() === subcategory.toLowerCase()
    );
    if (matchedKey) {
      rule = categoryRules[matchedKey];
    } else {
      throw new Error(`Subcategory "${subcategory}" not found in category "${category}".`);
    }
  }

  const { primaryCusp, primaryHouses, supportingHouses, negatingHouses, conditions } = rule;

  // 2. Identify the active house cusp under inspection
  let activeCusp = primaryCusp;
  if (activeCusp === null) {
    // Category-specific fallbacks when no specific cusp is defined in the rule
    if (catKey === 'MARRIAGE') activeCusp = 7;
    else if (catKey === 'CHILD_BIRTH') activeCusp = 5;
    else if (catKey === 'TRAVEL') activeCusp = 12;
    else if (catKey === 'PROPERTY') activeCusp = 4;
    else if (catKey === 'DIFFICULTY' || catKey === 'HEALTH_AND_DEATH') activeCusp = 1;
    else if (catKey === 'INCOME') activeCusp = 11;
    else if (catKey === 'LOSSES') activeCusp = 12;
    else activeCusp = 1;
  }

  // 3. Find the sub-lord of the active house cusp
  let subLordName = null;
  if (computedChartData.cusps) {
    const cuspData = computedChartData.cusps.find(c => c.house === activeCusp);
    if (cuspData) subLordName = cuspData.subLord;
  }
  
  // Fallback to raw houseCusps or lagna longitudes
  if (!subLordName && computedChartData.houseCusps) {
    const cuspDegree = computedChartData.houseCusps[activeCusp];
    if (cuspDegree !== undefined) {
      const div = getKPDivisions(cuspDegree);
      subLordName = div.subLord;
    }
  }

  if (!subLordName) {
    throw new Error(`Cusp sub-lord for house ${activeCusp} could not be resolved.`);
  }

  // 4. Retrieve houses signified by this sub-lord planet
  // Scan significators matrix in computedChartData or nested cusps
  const signifiedHouses = [];
  
  if (computedChartData.significators) {
    Object.keys(computedChartData.significators).forEach(h => {
      const sigData = computedChartData.significators[h];
      const allSigs = sigData?.allSignificators || sigData?.all || [];
      if (allSigs.includes(subLordName)) {
        signifiedHouses.push(parseInt(h, 10));
      }
    });
  }
  
  if (computedChartData.cusps && signifiedHouses.length === 0) {
    computedChartData.cusps.forEach(c => {
      const sigs = c.significators;
      const allSigs = sigs?.all || sigs?.allSignificators || [];
      if (allSigs.includes(subLordName)) {
        signifiedHouses.push(c.house);
      }
    });
  }

  if (signifiedHouses.length === 0) {
    // Try scanning the computedChartData itself as a flat house-to-significators map
    Object.keys(computedChartData).forEach(h => {
      const sigData = computedChartData[h];
      const allSigs = sigData?.allSignificators || sigData?.all || [];
      if (allSigs.includes(subLordName)) {
        const parsedHouse = parseInt(h, 10);
        if (!isNaN(parsedHouse)) {
          signifiedHouses.push(parsedHouse);
        }
      }
    });
  }

  // 5. Dynamic Maraka / Badhaka recognition
  const lagnaLon = computedChartData.ascendant?.longitude ?? computedChartData.cusps?.[0]?.longitude ?? 0;
  const badhakaHouse = getBadhakaHouse(lagnaLon);
  let dynamicNegatingHouses = [...(negatingHouses || [])];

  if (catKey === 'DIFFICULTY' || catKey === 'HEALTH_AND_DEATH') {
    // Add Maraka (2, 7)
    if (!dynamicNegatingHouses.includes(2)) dynamicNegatingHouses.push(2);
    if (!dynamicNegatingHouses.includes(7)) dynamicNegatingHouses.push(7);
    // Add Badhaka
    if (!dynamicNegatingHouses.includes(badhakaHouse)) {
      dynamicNegatingHouses.push(badhakaHouse);
    }
  }

  // 6. Cross-reference: calculate Hits
  const primaryHits = primaryHouses.filter(h => signifiedHouses.includes(h));
  const supportingHits = supportingHouses.filter(h => signifiedHouses.includes(h));
  const negatingHits = dynamicNegatingHouses.filter(h => signifiedHouses.includes(h));

  // 7. Base promise evaluation: True if all primaryHouses are signified
  let isPromised = primaryHouses.length > 0 
    ? primaryHouses.every(h => signifiedHouses.includes(h)) 
    : (supportingHits.length > 0);

  // 8. Process special conditions
  let conditionChecks = [];
  if (conditions) {
    const planets = computedChartData.planets || [];
    const subLordPlanet = planets.find(p => p.name === subLordName || p.planet === subLordName);
    const starLordPlanetName = subLordPlanet ? subLordPlanet.starLord : null;

    if (conditions.requiredPlanets) {
      const matchSub = conditions.requiredPlanets.includes(subLordName);
      const matchStar = starLordPlanetName && conditions.requiredPlanets.includes(starLordPlanetName);
      const satisfiesPlanets = matchSub || matchStar;
      conditionChecks.push({
        type: 'requiredPlanets',
        status: satisfiesPlanets,
        description: `Sub-lord (${subLordName}) or Star-lord (${starLordPlanetName || 'None'}) must connect to: ${conditions.requiredPlanets.join(', ')}`
      });
      if (!satisfiesPlanets) {
        isPromised = false;
      }
    }

    if (conditions.barrenSigns && subLordPlanet) {
      const subLordSign = getZodiacSign(subLordPlanet.longitude);
      const isBarren = BARREN_SIGNS.includes(subLordSign);
      conditionChecks.push({
        type: 'barrenSigns',
        status: isBarren,
        description: `Sub-lord (${subLordName}) is in a barren sign (${subLordSign})`
      });
    }

    if (conditions.fruitfulSigns && subLordPlanet) {
      const subLordSign = getZodiacSign(subLordPlanet.longitude);
      const isFruitful = FRUITFUL_SIGNS.includes(subLordSign);
      conditionChecks.push({
        type: 'fruitfulSigns',
        status: isFruitful,
        description: `Sub-lord (${subLordName}) is in a fruitful sign (${subLordSign})`
      });
    }

    if (conditions.waterySigns) {
      const sunPlanet = planets.find(p => p.name === 'Sun' || p.planet === 'Sun');
      const moonPlanet = planets.find(p => p.name === 'Moon' || p.planet === 'Moon');
      const sunSign = sunPlanet ? getZodiacSign(sunPlanet.longitude) : '';
      const moonSign = moonPlanet ? getZodiacSign(moonPlanet.longitude) : '';
      const isWatery = WATERY_SIGNS.includes(sunSign) || WATERY_SIGNS.includes(moonSign);
      conditionChecks.push({
        type: 'waterySigns',
        status: isWatery,
        description: `Sun/Moon is in a watery sign (Sun: ${sunSign}, Moon: ${moonSign})`
      });
    }

    if (conditions.maraka) {
      const signifiesMaraka = signifiedHouses.includes(2) || signifiedHouses.includes(7);
      conditionChecks.push({
        type: 'maraka',
        status: signifiesMaraka,
        description: `Sub-lord (${subLordName}) signifies Maraka houses (2, 7)`
      });
    }

    if (conditions.badhaka) {
      const signifiesBadhaka = signifiedHouses.includes(badhakaHouse);
      conditionChecks.push({
        type: 'badhaka',
        status: signifiesBadhaka,
        description: `Sub-lord (${subLordName}) signifies Badhaka house (${badhakaHouse})`
      });
    }
  }

  // 9. Standardized Return Object
  return {
    category: catKey,
    subcategory: subKey,
    matter: rule.matter,
    isPromised,
    primaryCusp: activeCusp,
    subLord: subLordName,
    cuspSubLord: subLordName, // Maintain compatibility
    significators: signifiedHouses,
    primaryHouses,
    supportingHouses,
    negatingHouses: dynamicNegatingHouses,
    primaryHits,
    supportingHits,
    negatingHits,
    conditionChecks: conditionChecks.length > 0 ? conditionChecks : null
  };
}

/**
 * Timing of Events Engine
 * Scans Vimshottari Dasa nested periods and evaluates viability based on significators.
 * 
 * @param {string} eventCategory 
 * @param {string} eventSubcategory 
 * @param {Array} dasaPeriods 
 * @param {object} computedChartData 
 * @returns {Array<object>} Active periods and their viability scores
 */
export function findEventTiming(eventCategory, eventSubcategory, dasaPeriods, computedChartData) {
  if (!computedChartData || !dasaPeriods) return [];

  // Normalize Category & Subcategory keys
  const catKey = String(eventCategory).toUpperCase().replace(/\s+/g, '_');
  let subKey = String(eventSubcategory)
    .toUpperCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
  
  if (subKey.length > 50) {
    subKey = subKey.substring(0, 47) + '_ETC';
  }

  const categoryRules = kpRules[catKey];
  if (!categoryRules) return [];
  
  let rule = categoryRules[subKey];
  if (!rule) {
    const keys = Object.keys(categoryRules);
    const matchedKey = keys.find(k => k.startsWith(subKey) || k === subKey || categoryRules[k].matter.toLowerCase() === eventSubcategory.toLowerCase());
    rule = matchedKey ? categoryRules[matchedKey] : Object.values(categoryRules)[0];
  }
  if (!rule) return [];

  const { primaryHouses, supportingHouses, negatingHouses } = rule;

  // Helper to check what houses a planet signifies
  const getSignifiedHouses = (planetName) => {
    const signified = [];
    if (computedChartData.significators) {
      Object.keys(computedChartData.significators).forEach(h => {
        const sigData = computedChartData.significators[h];
        const allSigs = sigData?.allSignificators || sigData?.all || [];
        if (allSigs.includes(planetName)) signified.push(parseInt(h, 10));
      });
    } else if (computedChartData.cusps) {
      computedChartData.cusps.forEach(c => {
        const sigs = c.significators;
        const allSigs = sigs?.all || sigs?.allSignificators || [];
        if (allSigs.includes(planetName)) signified.push(c.house);
      });
    }
    return signified;
  };

  // Cache planet significations to avoid repetitive calculations
  const planetSigs = {};
  const getPlanetSigs = (p) => {
    if (!planetSigs[p]) planetSigs[p] = getSignifiedHouses(p);
    return planetSigs[p];
  };

  // Helper to calculate viability score for a planet combination
  const calculateScore = (dasaPlanets) => {
    let score = 0;
    dasaPlanets.forEach((planet, idx) => {
      const sigs = getPlanetSigs(planet);
      const priHits = primaryHouses.filter(h => sigs.includes(h)).length;
      const supHits = supportingHouses.filter(h => sigs.includes(h)).length;
      const negHits = negatingHouses.filter(h => sigs.includes(h)).length;

      // Weight multiplier depending on level (0 = Dasa, 1 = Bhukti, 2 = Antara)
      const priWeight = [30, 35, 15][idx];
      const supWeight = [10, 15, 10][idx];
      const negWeight = [10, 15, 10][idx];

      if (priHits > 0) score += priWeight;
      if (supHits > 0) score += supWeight;
      if (negHits > 0) score -= negWeight;
    });

    return Math.max(0, Math.min(100, score));
  };

  const results = [];

  // Loop over hierarchical Dasa tree
  dasaPeriods.forEach(d => {
    const dLord = d.lord;
    const dSigs = getPlanetSigs(dLord);
    const dPri = primaryHouses.some(h => dSigs.includes(h));
    const dSup = supportingHouses.some(h => dSigs.includes(h));
    
    d.bhuktis.forEach(b => {
      const bLord = b.lord;
      const bSigs = getPlanetSigs(bLord);
      const bPri = primaryHouses.some(h => bSigs.includes(h));
      const bSup = supportingHouses.some(h => bSigs.includes(h));
      
      b.antaras.forEach(a => {
        const aLord = a.lord;
        const aSigs = getPlanetSigs(aLord);
        const aPri = primaryHouses.some(h => aSigs.includes(h));
        const aSup = supportingHouses.some(h => aSigs.includes(h));

        // Strict trigger rule: D, B, A must all signify the event's promised houses
        const dMatch = dPri || dSup;
        const bMatch = bPri || bSup;
        const aMatch = aPri || aSup;

        const isTriggerActive = dMatch && bMatch && aMatch;
        const viabilityScore = calculateScore([dLord, bLord, aLord]);

        if (isTriggerActive || viabilityScore > 35) {
          results.push({
            dasa: dLord,
            bhukti: bLord,
            antara: aLord,
            antaraStart: a.start,
            antaraEnd: a.end,
            viabilityScore,
            isTriggerActive
          });
        }
      });
    });
  });

  // Sort chronologically
  return results.sort((a, b) => a.antaraStart.getTime() - b.antaraStart.getTime());
}

/**
 * Longevity and Mortality Predictor Engine
 * Analyzes Cusp 8 sub-lord, Maraka, and Badhaka planets.
 * 
 * @param {object} computedChartData 
 * @returns {object} Longevity analysis results
 */
export function evaluateDeathPrediction(computedChartData) {
  if (!computedChartData) {
    throw new Error('computedChartData is required for longevity evaluation.');
  }

  // 1. Identify Maraka and Badhaka houses based on Lagna sign nature
  const lagnaLon = computedChartData.ascendant?.longitude ?? computedChartData.cusps?.[0]?.longitude ?? 0;
  const lagnaSignIndex = Math.floor(lagnaLon / 30);
  const lagnaSign = ZODIAC_SIGNS[lagnaSignIndex];
  
  let lagnaNature = 'Common';
  let badhakaHouse = 7;
  
  if ([0, 3, 6, 9].includes(lagnaSignIndex)) {
    lagnaNature = 'Movable';
    badhakaHouse = 11;
  } else if ([1, 4, 7, 10].includes(lagnaSignIndex)) {
    lagnaNature = 'Fixed';
    badhakaHouse = 9;
  }

  const marakaHouses = [2, 7];

  // Helper to fetch signified houses for any planet
  const getSignifiedHouses = (planetName) => {
    const signified = [];
    if (computedChartData.significators) {
      Object.keys(computedChartData.significators).forEach(h => {
        const sigData = computedChartData.significators[h];
        const allSigs = sigData?.allSignificators || sigData?.all || [];
        if (allSigs.includes(planetName)) signified.push(parseInt(h, 10));
      });
    } else if (computedChartData.cusps) {
      computedChartData.cusps.forEach(c => {
        const sigs = c.significators;
        const allSigs = sigs?.all || sigs?.allSignificators || [];
        if (allSigs.includes(planetName)) signified.push(c.house);
      });
    }
    return signified;
  };

  // 2. Identify the Sub-Lord of the 8th house cusp
  let cusp8 = null;
  if (computedChartData.cusps) {
    cusp8 = computedChartData.cusps.find(c => c.house === 8);
  }
  if (!cusp8) {
    throw new Error('Cusp 8 data not found in computedChartData.');
  }
  const cusp8SubLord = cusp8.subLord;
  const cusp8SubLordSigs = getSignifiedHouses(cusp8SubLord);

  // 3. Check connections
  const connectsTo1 = cusp8SubLordSigs.includes(1);
  const connectsTo8 = cusp8SubLordSigs.includes(8);
  const connectsTo12 = cusp8SubLordSigs.includes(12);
  const connectsToMaraka = marakaHouses.some(h => cusp8SubLordSigs.includes(h));
  const connectsToBadhaka = cusp8SubLordSigs.includes(badhakaHouse);

  // Calculate danger score for cusp 8 sublord
  const dangerHousesSignified = cusp8SubLordSigs.filter(h => [2, 7, 12, badhakaHouse].includes(h));
  const beneficHousesSignified = cusp8SubLordSigs.filter(h => [1, 5, 8, 11].includes(h));

  // 4. Longevity classification
  let longevityClass = 'Medium Life';
  let dangerLevel = 'Moderate';
  let analysisText = '';

  if (dangerHousesSignified.length >= 2 && beneficHousesSignified.length <= 1) {
    longevityClass = 'Short Life';
    dangerLevel = 'High';
    analysisText = `The 8th cusp sub-lord (${cusp8SubLord}) is heavily connected to the death-inflicting houses (${dangerHousesSignified.join(', ')}) with minimal positive configurations. This signifies Alpayu (Short Life, 0-33 years) under classical rules, indicating potential danger or severe health challenges early in life.`;
  } else if (beneficHousesSignified.length >= 2 && dangerHousesSignified.length <= 1) {
    longevityClass = 'Long Life';
    dangerLevel = 'Low';
    analysisText = `The 8th cusp sub-lord (${cusp8SubLord}) is strongly connected to longevity and health-supporting houses (${beneficHousesSignified.join(', ')}). This indicates Purnayu (Long Life, 66+ years) with a strong constitution, implying that the native will overcome general health challenges.`;
  } else {
    longevityClass = 'Medium Life';
    dangerLevel = 'Moderate';
    analysisText = `The 8th cusp sub-lord (${cusp8SubLord}) is connected to both longevity-supporting houses (${beneficHousesSignified.join(', ') || 'None'}) and mortality-inflicting houses (${dangerHousesSignified.join(', ') || 'None'}). This signifies Madhyayu (Medium Life, 33-66 years), representing a balanced physical constitution.`;
  }

  // 5. Identify Maraka and Badhaka planets
  const planets = computedChartData.planets || [];
  const marakaPlanets = [];
  const badhakaPlanets = [];

  planets.forEach(p => {
    const pName = p.name || p.planet;
    const sigs = getSignifiedHouses(pName);
    
    if (sigs.includes(2) || sigs.includes(7)) {
      marakaPlanets.push(pName);
    }
    if (sigs.includes(badhakaHouse)) {
      badhakaPlanets.push(pName);
    }
  });

  // 6. Dangerous transiting windows
  const criticalCusps = [
    { name: 'Ascendant (C1)', house: 1, longitude: computedChartData.cusps?.[0]?.longitude ?? lagnaLon },
    { name: 'Maraka Cusp (C2)', house: 2, longitude: computedChartData.cusps?.find(c => c.house === 2)?.longitude ?? 0 },
    { name: 'Maraka Cusp (C7)', house: 7, longitude: computedChartData.cusps?.find(c => c.house === 7)?.longitude ?? 0 },
    { name: 'Longevity Cusp (C8)', house: 8, longitude: cusp8.longitude },
    { name: 'Badhaka Cusp', house: badhakaHouse, longitude: computedChartData.cusps?.find(c => c.house === badhakaHouse)?.longitude ?? 0 }
  ];

  return {
    lagnaSign,
    lagnaNature,
    badhakaHouse,
    marakaHouses,
    cusp8SubLord,
    cusp8SubLordSigs,
    connectsTo: {
      cusp1: connectsTo1,
      cusp8: connectsTo8,
      cusp12: connectsTo12,
      maraka: connectsToMaraka,
      badhaka: connectsToBadhaka
    },
    dangerHousesSignified,
    beneficHousesSignified,
    longevityClass,
    dangerLevel,
    analysisText,
    marakaPlanets: Array.from(new Set(marakaPlanets)),
    badhakaPlanets: Array.from(new Set(badhakaPlanets)),
    criticalCusps
  };
}
