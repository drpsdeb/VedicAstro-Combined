import { AstroEngine, RASHI_LORDS } from './ephemerisEngine';

/**
 * Maps standard life events to their primary signifying houses (1-indexed).
 */
export const EVENT_SIGNIFICATIONS = {
  MARRIAGE: [7],
  CHILD_BIRTH: [5],
  FIRST_CHILD_BIRTH: [5, 9, 11],
  SECOND_CHILD_BIRTH: [7, 9, 11],
  THIRD_CHILD_BIRTH: [9, 11],
  PARENTS_DEATH: [4, 9],
  MOTHERS_DEATH: [4, 5, 10, 12],
  FATHERS_DEATH: [9, 10, 4, 12],
  MAJOR_DISEASE: [6, 8],
  CAREER_CHANGE: [10],
  HIGHER_EDUCATION: [5, 9],
  ACCIDENT: [8, 12],
  WEALTH_GAIN: [2, 11],
  FOREIGN_TRAVEL: [9, 12],
  ELDER_SIBLING_BIRTH: [11, 2],
  YOUNGER_SIBLING_BIRTH: [3, 2],
  ELDER_SIBLING_DEATH: [11, 12, 5, 8],
  YOUNGER_SIBLING_DEATH: [3, 4, 9, 8],
  SPOUSE_DEATH: [7, 8, 2, 12],
  SELF_DEATH: [1, 8, 2, 7, 12]
};

/**
 * Returns the rasi index (0-11) of the given planet.
 */
function getPlanetRasiIndex(planetName, planets) {
  const p = planets.find(pl => pl.planet === planetName || pl.name === planetName);
  return p ? p.rasiIndex : -1;
}

/**
 * Computes standard Parashari aspects for a planet from its rasi index.
 * All planets aspect the 7th house (opposite sign).
 * Mars also aspects 4th and 8th.
 * Jupiter, Rahu, and Ketu also aspect 5th and 9th.
 * Saturn also aspects 3rd and 10th.
 *
 * @param {string} planetName - Name of the planet.
 * @param {number} planetRasi - Rasi index (0-11) the planet occupies.
 * @returns {number[]} Array of rasi indices (0-11) aspected by the planet.
 */
export function getAspectsForPlanet(planetName, planetRasi) {
  if (planetRasi === -1) return [];
  const aspects = [];

  // All planets aspect 7th house (offset of 6 signs)
  aspects.push((planetRasi + 6) % 12);

  // Mars: 4th (offset 3) and 8th (offset 7)
  if (planetName === 'Mars') {
    aspects.push((planetRasi + 3) % 12);
    aspects.push((planetRasi + 7) % 12);
  }
  // Jupiter, Rahu, Ketu: 5th (offset 4) and 9th (offset 8)
  else if (planetName === 'Jupiter' || planetName === 'Rahu' || planetName === 'Ketu') {
    aspects.push((planetRasi + 4) % 12);
    aspects.push((planetRasi + 8) % 12);
  }
  // Saturn: 3rd (offset 2) and 10th (offset 9)
  else if (planetName === 'Saturn') {
    aspects.push((planetRasi + 2) % 12);
    aspects.push((planetRasi + 9) % 12);
  }

  return aspects;
}

/**
 * Checks if a planet has a connection to a specific house index (1-12)
 * via Lordship, Occupancy, Aspect, or connection to the house lord.
 *
 * @param {string} lordName - Active Dasa lord planet name.
 * @param {number} houseNum - House index (1-12).
 * @param {Object} rectifiedChart - Computed chart details.
 * @returns {Object} Connection details if matched, else null.
 */
export function checkConnection(lordName, houseNum, rectifiedChart) {
  if (!rectifiedChart || !rectifiedChart.planets) return null;

  const lagnaIndex = rectifiedChart.lagnaIndex;
  // Determine rasi index of the house (1-indexed)
  const houseRasi = (lagnaIndex + houseNum - 1) % 12;
  const houseLord = RASHI_LORDS[houseRasi];

  const lordRasi = getPlanetRasiIndex(lordName, rectifiedChart.planets);
  if (lordRasi === -1) return null;

  // 1. Lordship
  if (houseLord === lordName) {
    return { type: 'Lordship', desc: `${lordName} rules the ${houseNum}h (${houseLord})` };
  }

  // 2. Occupancy
  if (lordRasi === houseRasi) {
    return { type: 'Occupancy', desc: `${lordName} occupies the ${houseNum}h` };
  }

  // 3. Aspect
  const aspects = getAspectsForPlanet(lordName, lordRasi);
  if (aspects.includes(houseRasi)) {
    return { type: 'Aspect', desc: `${lordName} aspects the ${houseNum}h` };
  }

  // 4. Connection to the House Lord (conjunct or aspecting)
  const houseLordRasi = getPlanetRasiIndex(houseLord, rectifiedChart.planets);
  if (houseLordRasi !== -1) {
    if (lordRasi === houseLordRasi) {
      return { type: 'Lord Connection', desc: `${lordName} is conjoined with house lord ${houseLord}` };
    }
    if (aspects.includes(houseLordRasi)) {
      return { type: 'Lord Connection', desc: `${lordName} aspects house lord ${houseLord}` };
    }
  }

  return null;
}

/**
 * Scores the alignment of a single life event against a rectified chart.
 */
export function scoreEventAlignment(event, rectifiedChart) {
  if (!rectifiedChart || !rectifiedChart.planets || !rectifiedChart.profile) {
    return { score: 0, aligned: false, details: 'Missing chart data or profile' };
  }

  const type = String(event.type || event.category || '').toUpperCase();
  const targetHouses = event.relevantHouses || event.customHouses || EVENT_SIGNIFICATIONS[type] || [];
  
  if (targetHouses.length === 0) {
    return { score: 0, aligned: false, details: `No house mapping for event type '${event.type || event.category}'` };
  }

  // Find Moon Degree to recalculate Dasa starting point
  const moonPlanet = rectifiedChart.planets.find(p => p.planet === 'Moon' || p.name === 'Moon');
  if (!moonPlanet) {
    return { score: 0, aligned: false, details: 'Moon not found in chart' };
  }

  // Recalculate dasa data for the event date using the rectified birth profile
  const dasaData = AstroEngine.getDasaData(rectifiedChart.profile, event.date, moonPlanet.fullDegree);
  if (!dasaData || !dasaData.current) {
    return { score: 0, aligned: false, details: 'Dasa calculation failed' };
  }

  const { mahadasha: md, antardasha: ad, pratyantardasha: pd } = dasaData.current;
  
  let mdConnections = [];
  let adConnections = [];
  let pdConnections = [];

  // Check connections for each lord against all signifying houses
  targetHouses.forEach(houseNum => {
    const mdConn = checkConnection(md, houseNum, rectifiedChart);
    if (mdConn) mdConnections.push({ house: houseNum, ...mdConn });

    const adConn = checkConnection(ad, houseNum, rectifiedChart);
    if (adConn) adConnections.push({ house: houseNum, ...adConn });

    const pdConn = checkConnection(pd, houseNum, rectifiedChart);
    if (pdConn) pdConnections.push({ house: houseNum, ...pdConn });
  });

  if (type === 'MARRIAGE') {
    console.group(`💍 [Marriage Calibration Breakdown] Date: ${event.date || event.eventDate}`);
    console.log(`Lords: Mahadasha (MD) = ${md}, Bhukti (AD) = ${ad}, Pratyantar (PD) = ${pd}`);
    console.log(`Target Houses: ${targetHouses.join(', ')}`);
    
    console.log(`- Mahadasha Lord (${md}) connections:`, mdConnections.length > 0 ? mdConnections.map(c => `House ${c.house} via ${c.type} (${c.desc})`) : 'None');
    console.log(`- Bhukti Lord (${ad}) connections:`, adConnections.length > 0 ? adConnections.map(c => `House ${c.house} via ${c.type} (${c.desc})`) : 'None');
    console.log(`- Pratyantar Lord (${pd}) connections:`, pdConnections.length > 0 ? pdConnections.map(c => `House ${c.house} via ${c.type} (${c.desc})`) : 'None');

    const failingLords = [];
    if (mdConnections.length === 0) failingLords.push(`MD (${md})`);
    if (adConnections.length === 0) failingLords.push(`AD (${ad})`);
    if (pdConnections.length === 0) failingLords.push(`PD (${pd})`);

    if (failingLords.length > 0) {
      console.log(`⚠️ Failing Lords (no connection to houses ${targetHouses.join(', ')}):`, failingLords.join(', '));
    } else {
      console.log(`🎉 All Lords connected to the target houses!`);
    }
    console.groupEnd();
  }

  // Calculate alignment score based on Vedic principles (Bhukti/Antardasha is prime timer)
  let score = 0;
  let connectionDescription = '';

  if (adConnections.length > 0) {
    // Prime Hit: Antardasha/Bhukti lord is directly connected
    score = 100;
    connectionDescription = `Bhukti Lord (${ad}) connected: ${adConnections.map(c => c.desc).join(', ')}`;
  } else if (mdConnections.length > 0 && pdConnections.length > 0) {
    // Secondary Hit: Both Major Dasa (MD) and Sub-sub period (PD) lords are connected
    score = 80;
    connectionDescription = `Dasa Lord (${md}) & Pratyantar Lord (${pd}) connected`;
  } else if (mdConnections.length > 0) {
    // Tertiary: Only Major Dasa lord is connected
    score = 50;
    connectionDescription = `Dasa Lord (${md}) connected: ${mdConnections.map(c => c.desc).join(', ')}`;
  } else if (pdConnections.length > 0) {
    // Minor: Only Pratyantar lord is connected
    score = 30;
    connectionDescription = `Pratyantar Lord (${pd}) connected: ${pdConnections.map(c => c.desc).join(', ')}`;
  } else {
    score = 0;
    connectionDescription = `No significant planetary connection to houses: ${targetHouses.join(', ')}`;
  }

  return {
    score,
    aligned: score >= 50,
    md,
    ad,
    pd,
    details: connectionDescription,
    targetHouses
  };
}

/**
 * Validates rectified chart against a list of events.
 * Returns confidence score (0-100%) and individual scores.
 */
export function validateRectification(rectifiedChart, lifeEvents) {
  if (!lifeEvents || lifeEvents.length === 0) {
    return { confidenceScore: 0, eventScores: [] };
  }

  let totalWeight = 0;
  let earnedScore = 0;

  const eventScores = lifeEvents.map(event => {
    const weight = Number(event.weight ?? 5); // Default to Medium (5) if not specified
    const alignment = scoreEventAlignment(event, rectifiedChart);

    totalWeight += weight;
    earnedScore += (alignment.score * weight);

    return {
      ...event,
      weight,
      alignment
    };
  });

  const confidenceScore = totalWeight > 0 ? Math.round(earnedScore / totalWeight) : 0;

  return {
    confidenceScore,
    eventScores
  };
}
