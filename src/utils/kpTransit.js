// ============================================================================
// 🧠 KP TRANSIT ALIGNMENT & EVENT TRIGGERING ENGINE
// ============================================================================

import { getKPDivisions } from './kpEngine.js';
import { OfflineEphemeris } from './ephemerisEngine.js';

/**
 * 2. Transit Alignment & Event Triggering
 * Evaluates transiting longitudes against the natal Star/Sub lords of the eventHouse cusp.
 * A promised event triggers when transiting significator planets (Sun, Jupiter, Saturn, Mars)
 * touch the sensitive points (Star Lord or Sub Lord) of the relevant house cusp.
 * 
 * @param {string|number|Date} targetDate - The date of the transit to analyze
 * @param {number} eventHouse - The house cusp to check (1-12)
 * @param {Array<number>} houseCusps - 1-indexed array of natal house cusps (cusp 1 at index 1)
 * @param {object} [ephemerisEngine] - Optional custom ephemeris engine
 * @param {number} [lat=17.3850] - Latitude of the transit observation location
 * @param {number} [lon=78.4867] - Longitude of the transit observation location
 * @param {number} [tzone=5.5] - Timezone offset of the transit observation location
 * @returns {object} Transit evaluation result containing scores, details, and overall match probability
 */
export function checkTransitTriggers(targetDate, eventHouse, houseCusps, ephemerisEngine, lat = 17.3850, lon = 78.4867, tzone = 5.5) {
  const dateObj = new Date(targetDate);
  const houseIndex = Number(eventHouse);
  
  if (!houseCusps || !houseCusps[houseIndex]) {
    throw new Error(`Invalid natal house cusps or eventHouse index: ${houseIndex}`);
  }

  // 1. Natal Cusp Info
  const cuspLon = houseCusps[houseIndex];
  const cuspDiv = getKPDivisions(cuspLon);
  const cuspStarLord = cuspDiv.starLord;
  const cuspSubLord = cuspDiv.subLord;
  const cuspSignLord = cuspDiv.signLord;

  // 2. Fetch transit planetary positions
  let transitData;
  try {
    if (ephemerisEngine && typeof ephemerisEngine.getTransitPositions === 'function') {
      transitData = ephemerisEngine.getTransitPositions(dateObj, lat, lon, tzone);
    } else if (ephemerisEngine && typeof ephemerisEngine.getPositions === 'function') {
      transitData = ephemerisEngine.getPositions(dateObj, lat, lon);
    } else {
      transitData = OfflineEphemeris.getPositions(dateObj, lat, lon);
    }
  } catch (err) {
    console.error("Failed to fetch transit positions using engine, falling back to OfflineEphemeris", err);
    transitData = OfflineEphemeris.getPositions(dateObj, lat, lon);
  }

  if (!transitData || !transitData.planets) {
    throw new Error("Could not compute transit planetary positions.");
  }

  // 3. Define target transiting planets for KP triggering
  const triggerPlanets = ['Sun', 'Jupiter', 'Saturn', 'Mars'];
  const planetScores = {};

  triggerPlanets.forEach((pName) => {
    // Find the planet in transit data
    const pData = transitData.planets.find(pl => pl.name === pName || pl.planet === pName);
    if (!pData) return;

    const transitLon = pData.longitude ?? pData.fullDegree ?? pData.l;
    const transitDiv = getKPDivisions(transitLon);
    const transitStarLord = transitDiv.starLord;
    const transitSubLord = transitDiv.subLord;

    // Calculate degree proximity to natal cusp
    let diff = Math.abs(transitLon - cuspLon);
    if (diff > 180) diff = 360 - diff;

    // Proximity score (Max 100 using a 3.33 degree orb - i.e., 1 Nakshatra Pada extent)
    const orb = 3.33;
    const proximityScore = diff <= orb ? Math.round((1 - diff / orb) * 100) : 0;

    // Lord alignment checks (matching transiting Star/Sub lords with natal cusp Star/Sub lords)
    // Direct matches score higher, cross matches also count
    let lordMatchScore = 0;
    let starMatch = false;
    let subMatch = false;

    // Transiting Star Lord matches Natal Cusp Star Lord
    if (transitStarLord === cuspStarLord) {
      lordMatchScore += 50;
      starMatch = true;
    }
    // Transiting Sub Lord matches Natal Cusp Sub Lord
    if (transitSubLord === cuspSubLord) {
      lordMatchScore += 50;
      subMatch = true;
    }
    
    // If no perfect match, check cross matches
    if (!starMatch && transitStarLord === cuspSubLord) {
      lordMatchScore += 30;
    }
    if (!subMatch && transitSubLord === cuspStarLord) {
      lordMatchScore += 30;
    }

    // Cap lord match score at 100
    lordMatchScore = Math.min(100, lordMatchScore);

    // Total Score for this planet: 60% Proximity, 40% Lord Alignment
    // If the planet is not within the orb, proximity score is 0, but lord matches can still indicate ambient alignment
    const totalScore = Math.round((proximityScore * 0.6) + (lordMatchScore * 0.4));

    planetScores[pName] = {
      planet: pName,
      longitude: transitLon,
      starLord: transitStarLord,
      subLord: transitSubLord,
      degreeDifference: Number(diff.toFixed(4)),
      proximityScore,
      lordMatchScore,
      totalScore
    };
  });

  // Calculate overall score (maximum score among the key triggering planets)
  const scoresArray = Object.values(planetScores).map(p => p.totalScore);
  const overallScore = scoresArray.length > 0 ? Math.max(...scoresArray) : 0;

  // Determine trigger activity and classification
  let description = '';
  if (overallScore >= 75) {
    description = 'Very Strong Transit Trigger: High degree proximity and matching cusp lords.';
  } else if (overallScore >= 50) {
    description = 'Moderate Transit Trigger: Planer is in proximity or lords align nicely.';
  } else if (overallScore >= 25) {
    description = 'Weak Transit Alignment: Ambient lord connections but far from exact degree.';
  } else {
    description = 'No significant transit trigger active.';
  }

  return {
    targetDate: dateObj.toISOString(),
    eventHouse: houseIndex,
    cuspLongitude: cuspLon,
    cuspStarLord,
    cuspSubLord,
    cuspSignLord,
    planetScores,
    overallScore,
    isTriggerActive: overallScore >= 50,
    description
  };
}
