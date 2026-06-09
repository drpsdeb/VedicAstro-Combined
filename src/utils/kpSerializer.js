// ============================================================================
// 🧠 KP ASTROLOGY DATA SERIALIZATION UTILITY
// ============================================================================

import { getKPDivisions } from './kpEngine.js';

/**
 * 1. Data Serialization Utility
 * Serializes core KP chart metrics into a structured, lightweight JSON object for AI consumption.
 * 
 * @param {Array<object>} placements - Natal planetary positions
 * @param {Array<number>} houseCusps - 1-indexed array of Placidus house cusp degrees (index 0 is null)
 * @param {object} significatorsMap - Signification matrix returned by getHouseSignificators
 * @returns {object} Clean serialized KP chart data
 */
export function serializeKPData(placements, houseCusps, significatorsMap) {
  if (!houseCusps || houseCusps.length < 13) {
    throw new Error("Invalid house cusps array for serialization. Must be a 1-indexed array of length 13.");
  }
  if (!placements || !Array.isArray(placements)) {
    throw new Error("Invalid placements array for serialization.");
  }
  if (!significatorsMap) {
    throw new Error("Invalid significators map for serialization.");
  }

  // 1. Serialize Ascendant (Lagna) details
  const lagnaLon = houseCusps[1];
  const lagnaDiv = getKPDivisions(lagnaLon);
  const ascendant = {
    longitude: Number(lagnaLon.toFixed(4)),
    signLord: lagnaDiv.signLord,
    starLord: lagnaDiv.starLord,
    subLord: lagnaDiv.subLord
  };

  // Helper to determine occupied house based on unequal Placidus cusps
  const getHouseForLongitude = (lon) => {
    const deg = ((lon % 360) + 360) % 360;
    for (let h = 1; h <= 12; h++) {
      const start = houseCusps[h];
      const end = houseCusps[h === 12 ? 1 : h + 1];
      if (start < end) {
        if (deg >= start - 1e-9 && deg < end) return h;
      } else {
        if (deg >= start - 1e-9 || deg < end) return h;
      }
    }
    return 1;
  };

  // 2. Serialize Placidus Cusps (1-12)
  const cusps = [];
  for (let h = 1; h <= 12; h++) {
    const cuspLon = houseCusps[h];
    const cuspDiv = getKPDivisions(cuspLon);
    const sigInfo = significatorsMap[h];

    cusps.push({
      house: h,
      longitude: Number(cuspLon.toFixed(4)),
      signLord: cuspDiv.signLord,
      starLord: cuspDiv.starLord,
      subLord: cuspDiv.subLord,
      significators: sigInfo ? {
        levelA: sigInfo.levels?.a || [],
        levelB: sigInfo.levels?.b || [],
        levelC: sigInfo.levels?.c || [],
        levelD: sigInfo.levels?.d || [],
        all: sigInfo.allSignificators || []
      } : null
    });
  }

  // 3. Serialize Planets placements
  const planets = placements.map((p) => {
    const name = p.name || p.planet;
    // Handle different ephemeris properties for longitude
    const lonVal = p.longitude !== undefined ? p.longitude : (p.fullDegree !== undefined ? p.fullDegree : p.l);
    if (lonVal === undefined) return null;

    const div = getKPDivisions(lonVal);
    const occupiedHouse = getHouseForLongitude(lonVal);

    return {
      name,
      longitude: Number(lonVal.toFixed(4)),
      signLord: div.signLord,
      starLord: div.starLord,
      subLord: div.subLord,
      occupiedHouse,
      isRetrograde: !!p.isRetro
    };
  }).filter(Boolean);

  return {
    ascendant,
    cusps,
    planets
  };
}

/**
 * Serializes the core KP chart and Dasa timing data into a clean JSON string for AI review.
 * 
 * @param {object} computedChartData - Serialized KP chart data (contains ascendant, cusps, planets)
 * @param {Array} dasaPeriods - Array of active Dasa periods
 * @returns {string} Clean JSON string representation
 */
export function serializeKPChart(computedChartData, dasaPeriods) {
  const payload = {
    ascendant: computedChartData?.ascendant || null,
    cusps: computedChartData?.cusps || [],
    planets: computedChartData?.planets || [],
    activeDasaPeriods: dasaPeriods || []
  };
  return JSON.stringify(payload, null, 2);
}
