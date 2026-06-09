// ============================================================================
// 🧠 KRISHNAMURTI PADDHATI (KP) ASTROLOGY RULES & PREDICTIONS
// ============================================================================

import { getKPDivisions } from './kpEngine.js';
import { OfflineEphemeris } from './ephemerisEngine.js';

// Standard KP Event house combinations
export const KP_EVENT_HOUSES = {
  MARRIAGE: { primary: 7, supporting: [2, 11] },
  JOB_PROMOTION: { primary: 10, supporting: [2, 6, 11] },
  FINANCIAL_GAIN: { primary: 2, supporting: [6, 11] },
  FOREIGN_TRAVEL: { primary: 12, supporting: [3, 9] },
  EDUCATION: { primary: 4, supporting: [9, 11] },
  HEALTH_RECOVERY: { primary: 11, supporting: [1, 5] },
  PROPERTY_PURCHASE: { primary: 4, supporting: [11, 12] },
  CHILD_BIRTH: { primary: 5, supporting: [2, 11] }
};

// Weekday lords sequence (Sunday = Sun, Monday = Moon, etc.)
const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/**
 * 1. KP Event Promise Engine
 * Evaluates whether an event is promised under KP astrology rules.
 * 
 * Strict Hierarchy: The Star-lord of a planet shows the "direction/intent", 
 * but the Sub-lord of the cusp gives the "final verdict" (yes/no).
 * 
 * @param {string} eventType - Type of event (e.g. MARRIAGE, JOB_PROMOTION)
 * @param {Array<number>} houseCusps - Array of Placidus house cusps (1-indexed)
 * @param {object} significatorsMap - Signification matrix returned by getHouseSignificators
 * @returns {object} Promise evaluation object { isPromised, primarySubLord, primarySignificators, supportingSignificators }
 */
export function evaluateEventPromise(eventType, houseCusps, significatorsMap) {
  const normEvent = String(eventType).toUpperCase();
  const eventInfo = KP_EVENT_HOUSES[normEvent];

  if (!eventInfo) {
    return {
      isPromised: false,
      error: `Unknown event type: ${eventType}`
    };
  }

  const primaryHouse = eventInfo.primary;
  const supportingHouses = eventInfo.supporting;

  // 1. Find the Sub-Lord of the primary house cusp
  const cuspLon = houseCusps[primaryHouse];
  const cuspDiv = getKPDivisions(cuspLon);
  const cuspSubLord = cuspDiv.subLord;

  // 2. Retrieve significators of the primary house
  const primarySignificators = significatorsMap[primaryHouse]
    ? significatorsMap[primaryHouse].allSignificators
    : [];

  // 3. Retrieve significators of all supporting houses
  const supportingSignificatorsSet = new Set();
  supportingHouses.forEach((h) => {
    if (significatorsMap[h]) {
      significatorsMap[h].allSignificators.forEach((planet) => {
        supportingSignificatorsSet.add(planet);
      });
    }
  });
  const supportingSignificators = Array.from(supportingSignificatorsSet);

  // 4. Strict KP Rule: Event is promised only if the primary cusp's sub-lord
  // signifies the primary house OR at least one supporting house.
  const signifiesPrimary = primarySignificators.includes(cuspSubLord);
  const signifiesSupporting = supportingSignificators.includes(cuspSubLord);
  const isPromised = signifiesPrimary || signifiesSupporting;

  return {
    isPromised,
    primarySubLord: cuspSubLord,
    primarySignificators,
    supportingSignificators,
    details: {
      eventType: normEvent,
      primaryHouse,
      supportingHouses,
      signifiesPrimary,
      signifiesSupporting,
      ruleEmphasized: "Sub-lord of relevant cusp is the final decider of event promise."
    }
  };
}

/**
 * 2. Ruling Planets (RP) Module for Horary / Prashna
 * Calculates the Ruling Planets at the given timestamp and location.
 * Uses local sunrise calculations to determine the true Day Lord.
 * 
 * @param {string|number|Date} timestamp - Date/Time of judgment
 * @param {object} location - Location object { latitude, longitude, timezone }
 * @param {object} [ephemerisData] - Optional pre-calculated ephemeris data
 * @returns {object} Ruling planets object containing 5 primary factors and the unique set
 */
export function calculateRulingPlacements(timestamp, location, ephemerisData) {
  const dateObj = new Date(timestamp);
  const lat = Number(location.latitude ?? 17.3850);
  const lon = Number(location.longitude ?? 78.4867);
  const timezone = Number(location.timezone ?? 5.5);

  // 1. Obtain planetary positions at judgment time
  const positions = ephemerisData || OfflineEphemeris.getPositions(dateObj, lat, lon);

  const lagnaLon = positions.lagnaDegree ?? positions.lagna.longitude;
  const moonLon = positions.moonDegree ?? positions.planets.find(p => p.name === 'Moon' || p.planet === 'Moon').longitude;

  // 2. Map Lagna (Ascendant) and Moon positions to KP divisions
  const lagnaDiv = getKPDivisions(lagnaLon);
  const moonDiv = getKPDivisions(moonLon);

  // 3. Calculate Day Lord adjusted for local sunrise
  // Convert UTC timestamp to local Date
  const localTimeMs = dateObj.getTime() + timezone * 3600000;
  const localDate = new Date(localTimeMs);
  let dayIndex = localDate.getUTCDay(); // Weekday index (0 = Sunday, 1 = Monday, etc.)

  // Construct local midnight UTC Date for calculating the correct day's sunrise
  const localYear = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth();
  const localDay = localDate.getUTCDate();
  const midUTC = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0));

  // Fetch local sunrise fraction for this date
  const sunTimes = OfflineEphemeris.getSunTimes(midUTC, lat, lon, timezone);
  const localHours = localDate.getUTCHours() + localDate.getUTCMinutes() / 60 + localDate.getUTCSeconds() / 3600;

  // If local time is before local sunrise, the Day Lord belongs to the previous day
  if (localHours < sunTimes.sunrise.frac) {
    dayIndex = (dayIndex - 1 + 7) % 7;
  }

  const dayLord = WEEKDAY_LORDS[dayIndex];

  // 4. Combine the 5 primary factors into a unique set
  const ascendantRasiLord = lagnaDiv.signLord;
  const ascendantStarLord = lagnaDiv.starLord;
  const moonRasiLord = moonDiv.signLord;
  const moonStarLord = moonDiv.starLord;

  const rulingSet = new Set([
    ascendantRasiLord,
    ascendantStarLord,
    moonRasiLord,
    moonStarLord,
    dayLord
  ]);

  return {
    ascendantRasiLord,
    ascendantStarLord,
    moonRasiLord,
    moonStarLord,
    dayLord,
    rulingPlanets: Array.from(rulingSet)
  };
}
