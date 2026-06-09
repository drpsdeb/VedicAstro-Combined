// ============================================================================
// 🧠 KRISHNAMURTI PADDHATI (KP) ASTROLOGY ENGINE
// ============================================================================

import { RASHI_LORDS, NAKSHATRAS } from './ephemerisEngine.js';

// Vimshottari Dasa sequence of lords and their respective years
export const VIMSHOTTARI_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

export const DASA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

// Trigonometric helpers for degrees/radians conversions
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (rad) => (rad * 180) / Math.PI;
const norm = (d) => ((d % 360) + 360) % 360;

/**
 * 1. Placidus House Cusps Calculation
 * Computes the 12 unequal house cusps using the Placidus house system method.
 *
 * @param {number} ascendantLongitude - Longitude of the Ascendant (Lagna) in degrees
 * @param {number} latitude - Geographic latitude in degrees
 * @param {number} obliquity - Obliquity of the ecliptic in degrees
 * @returns {Array<number|null>} 1-indexed array of house cusps (index 0 is null)
 */
export function calculatePlacidusCusps(ascendantLongitude, latitude, obliquity) {
  const lamAsc = rad(norm(ascendantLongitude));
  const phi = rad(latitude);
  const eps = rad(obliquity);

  // Calculate Ascendant's declination (D_asc) and Right Ascension (RA_asc)
  const sinD_asc = Math.sin(lamAsc) * Math.sin(eps);
  const D_asc = Math.asin(sinD_asc);
  const RA_asc = Math.atan2(Math.sin(lamAsc) * Math.cos(eps), Math.cos(lamAsc));

  // Compute Oblique Ascension of the Ascendant (OA_asc)
  const tanPhi = Math.tan(phi);
  let sinAD_asc = tanPhi * Math.tan(D_asc);
  // Cap to avoid domain errors near poles
  sinAD_asc = Math.max(-0.999999, Math.min(0.999999, sinAD_asc));
  const AD_asc = Math.asin(sinAD_asc);
  const OA_asc = RA_asc - AD_asc;

  // Calculate Right Ascension of the Midheaven (RAMC)
  // RAMC = OA_asc - 90 degrees
  const RAMC = (OA_asc - Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI);

  // Calculate the Midheaven (MC, Cusp 10) longitude
  const MC = Math.atan2(Math.sin(RAMC), Math.cos(RAMC) * Math.cos(eps));
  const cusp10 = norm(deg(MC));

  // Iterative solver for Placidus intermediate cusps
  const solveCusp = (C, sign, F) => {
    let RA = (RAMC + C + 4 * Math.PI) % (2 * Math.PI);
    for (let iter = 0; iter < 100; iter++) {
      // tan D = sin RA * tan epsilon
      const tanD = Math.sin(RA) * Math.tan(eps);
      let sinAD = tanPhi * tanD;
      // Cap to avoid NaN at polar latitudes
      sinAD = Math.max(-0.999999, Math.min(0.999999, sinAD));
      const AD = Math.asin(sinAD);
      const newRA = (RAMC + C + sign * F * AD + 4 * Math.PI) % (2 * Math.PI);

      let diff = Math.abs(newRA - RA);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < 1e-9) {
        RA = newRA;
        break;
      }
      RA = newRA;
    }
    const lambda = Math.atan2(Math.sin(RA), Math.cos(RA) * Math.cos(eps));
    return norm(deg(lambda));
  };

  // Intermediate cusps in eastern hemisphere
  const cusp11 = solveCusp(Math.PI / 6, 1, 1 / 3);  // RAMC + 30 deg, F = 1/3
  const cusp12 = solveCusp(Math.PI / 3, 1, 2 / 3);  // RAMC + 60 deg, F = 2/3
  const cusp2 = solveCusp(2 * Math.PI / 3, -1, 2 / 3); // RAMC + 120 deg, F = 2/3 (nocturnal)
  const cusp3 = solveCusp(5 * Math.PI / 6, -1, 1 / 3); // RAMC + 150 deg, F = 1/3 (nocturnal)

  // Ascendant is Cusp 1
  const cusp1 = norm(ascendantLongitude);

  // Opposite cusps
  const cusp4 = norm(cusp10 + 180);
  const cusp5 = norm(cusp11 + 180);
  const cusp6 = norm(cusp12 + 180);
  const cusp7 = norm(cusp1 + 180);
  const cusp8 = norm(cusp2 + 180);
  const cusp9 = norm(cusp3 + 180);

  return [
    null, // 1-indexed array padding
    cusp1, cusp2, cusp3, cusp4, cusp5, cusp6,
    cusp7, cusp8, cusp9, cusp10, cusp11, cusp12
  ];
}

/**
 * 2. Star, Sub, and Sub-Sub Lord Array (249 Divisions)
 * Mapping utility that takes any degree/longitude and returns the exact lords
 * along with their respective sub-division and sub-sub-division extents.
 *
 * @param {number} longitude - Zodiac longitude in degrees (0-360)
 * @returns {object} Object containing Sign, Star, Sub, and Sub-Sub lords and extents
 */
export function getKPDivisions(longitude) {
  const deg = norm(longitude);

  // 1. Sign (Rashi) Lord
  const rasiIdx = Math.floor(deg / 30);
  const signLord = RASHI_LORDS[rasiIdx];

  // 2. Star (Nakshatra) Lord
  const nakIndex = Math.floor(deg / (40 / 3));
  const starLord = VIMSHOTTARI_LORDS[nakIndex % 9];
  const starStart = nakIndex * (40 / 3);
  const starEnd = starStart + (40 / 3);

  // 3. Sub Lord
  const startLordIndex = nakIndex % 9;
  let subStart = starStart;
  let subLord = null;
  let subEnd = null;
  let subSpan = 0;

  for (let i = 0; i < 9; i++) {
    const sLord = VIMSHOTTARI_LORDS[(startLordIndex + i) % 9];
    const sSpan = (DASA_YEARS[sLord] / 120) * (40 / 3);
    const sEnd = subStart + sSpan;

    if (deg >= subStart - 1e-9 && deg <= sEnd + 1e-9) {
      subLord = sLord;
      subEnd = sEnd;
      subSpan = sSpan;
      break;
    }
    subStart = sEnd;
  }

  // Split boundaries at Rashi limits (producing the 249 divisions structure)
  const lowerRashi = Math.floor(subStart / 30);
  const upperRashi = Math.floor(subEnd / 30);
  let splitSubStart = subStart;
  let splitSubEnd = subEnd;

  if (lowerRashi !== upperRashi && subEnd > (lowerRashi + 1) * 30 && (lowerRashi + 1) * 30 < starEnd) {
    const boundary = (lowerRashi + 1) * 30;
    if (deg < boundary) {
      splitSubEnd = boundary;
    } else {
      splitSubStart = boundary;
    }
  }

  // 4. Sub-Sub Lord
  const subLordIndex = VIMSHOTTARI_LORDS.indexOf(subLord);
  let subSubStart = subStart; // Use original unsplit subStart for proportions
  let subSubLord = null;
  let subSubEnd = null;

  for (let j = 0; j < 9; j++) {
    const ssLord = VIMSHOTTARI_LORDS[(subLordIndex + j) % 9];
    const ssSpan = (DASA_YEARS[ssLord] / 120) * subSpan;
    const ssEnd = subSubStart + ssSpan;

    if (deg >= subSubStart - 1e-9 && deg <= ssEnd + 1e-9) {
      subSubLord = ssLord;
      subSubEnd = ssEnd;
      break;
    }
    subSubStart = ssEnd;
  }

  return {
    longitude: deg,
    signLord,
    starLord,
    subLord,
    subSubLord,
    starStart,
    starEnd,
    subStart: splitSubStart,
    subEnd: splitSubEnd,
    subSubStart,
    subSubEnd,
    nakshatra: NAKSHATRAS[nakIndex],
    pada: Math.floor(((deg - starStart) / (40 / 3)) * 4) + 1
  };
}

/**
 * 3. House Signification Matrix
 * Determines the significators for each of the 12 houses based on the standard KP hierarchy.
 *
 * @param {Array<number>} cuspCusps - Array of Placidus house cusp longitudes (1-12 or 0-11)
 * @param {Array<object>} planetaryPlacements - Array of planet positions (name and longitude)
 * @returns {object} Signification matrix mapped by house number (1-12)
 */
export function getHouseSignificators(cuspCusps, planetaryPlacements) {
  // Normalize cusps to a 1-indexed array [null, Cusp1, ..., Cusp12]
  let cusps = [];
  if (Array.isArray(cuspCusps)) {
    if (cuspCusps.length === 12) {
      cusps = [null, ...cuspCusps];
    } else if (cuspCusps.length === 13) {
      cusps = cuspCusps;
    } else {
      cusps = [null, ...cuspCusps.slice(0, 12)];
    }
  } else {
    cusps = [null];
    for (let i = 1; i <= 12; i++) {
      cusps.push(cuspCusps[i]);
    }
  }

  const significators = {};

  // Helper to determine the house occupant position based on unequal Placidus cusps
  const getHouseForLongitude = (lon) => {
    const deg = norm(lon);
    for (let h = 1; h <= 12; h++) {
      const start = cusps[h];
      const end = cusps[h === 12 ? 1 : h + 1];
      if (start < end) {
        if (deg >= start - 1e-9 && deg < end) return h;
      } else {
        if (deg >= start - 1e-9 || deg < end) return h;
      }
    }
    return 1; // Fallback
  };

  // Map planetary parameters
  const planets = planetaryPlacements.map((p) => {
    const longitude = p.longitude !== undefined ? p.longitude : (p.fullDegree !== undefined ? p.fullDegree : p.l);
    const name = p.name || p.planet;
    const div = getKPDivisions(longitude);
    return {
      name,
      longitude,
      starLord: div.starLord,
      house: getHouseForLongitude(longitude)
    };
  });

  for (let h = 1; h <= 12; h++) {
    const cuspLon = cusps[h];
    const cuspDiv = getKPDivisions(cuspLon);
    const cuspSubLord = cuspDiv.subLord;
    const houseLord = cuspDiv.signLord;

    // a. Sub-lord of the house cusp
    const levelA = [cuspSubLord];

    // b. Planets posited in the star of the house cusp sub-lord
    const levelB = planets
      .filter((p) => p.starLord === cuspSubLord)
      .map((p) => p.name);

    // c. Occupants of the house
    const levelC = planets
      .filter((p) => p.house === h)
      .map((p) => p.name);

    // d. Planets posited in the star of the house lord
    const levelD = planets
      .filter((p) => p.starLord === houseLord)
      .map((p) => p.name);

    significators[h] = {
      house: h,
      cuspLongitude: cuspLon,
      houseLord: houseLord,
      cuspSubLord: cuspSubLord,
      levels: {
        a: levelA,
        b: levelB,
        c: levelC,
        d: levelD
      },
      allSignificators: Array.from(
        new Set([...levelA, ...levelB, ...levelC, ...levelD])
      )
    };
  }

  return significators;
}
