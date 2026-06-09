// ============================================================================
// 🧠 KP VIMSHOTTARI DASA TIMING ENGINE
// ============================================================================

import { VIMSHOTTARI_LORDS, DASA_YEARS } from './kpEngine.js';

/**
 * 1. KP Dasa Timing Engine
 * Calculates nested Vimshottari Dasa periods down to the Dasa, Bhukti, Antara, and Sookshma levels.
 * Based on the Star Lord and elapsed fraction of the Moon's natal longitude.
 * 
 * @param {number} moonLongitude - Moon's natal longitude in degrees (0-360)
 * @param {string|number|Date} birthTimestamp - Date/Time of birth
 * @returns {Array<object>} Hierarchical nested Dasa tree covering 120 years
 */
export function calculateKPDasas(moonLongitude, birthTimestamp) {
  const birthDate = new Date(birthTimestamp);
  const deg = ((moonLongitude % 360) + 360) % 360;

  // Find Moon's Nakshatra (Star)
  const nakIndex = Math.floor(deg / (40 / 3));
  const starStart = nakIndex * (40 / 3);
  const fractionPassed = (deg - starStart) / (40 / 3);

  const startLordIndex = nakIndex % 9;
  const firstLord = VIMSHOTTARI_LORDS[startLordIndex];
  const firstLordYears = DASA_YEARS[firstLord];

  // Dasa cycle begins before birth such that elapsed fraction aligns with birthTimestamp
  const firstDasaStartMs = birthDate.getTime() - fractionPassed * firstLordYears * 365.2425 * 86400000;

  const dasas = [];
  let currentDasaStartMs = firstDasaStartMs;

  for (let d = 0; d < 9; d++) {
    const dLord = VIMSHOTTARI_LORDS[(startLordIndex + d) % 9];
    const dYears = DASA_YEARS[dLord];
    const dSpanMs = dYears * 365.2425 * 86400000;
    const dEndMs = currentDasaStartMs + dSpanMs;

    const bhuktis = [];
    let currentBhuktiStartMs = currentDasaStartMs;
    const dLordCycleIndex = VIMSHOTTARI_LORDS.indexOf(dLord);

    for (let b = 0; b < 9; b++) {
      const bLord = VIMSHOTTARI_LORDS[(dLordCycleIndex + b) % 9];
      const bYears = DASA_YEARS[bLord];
      // Bhukti span = (dasaYears * bhuktiYears) / 120
      const bSpanMs = (dYears * bYears / 120) * 365.2425 * 86400000;
      const bEndMs = currentBhuktiStartMs + bSpanMs;

      const antaras = [];
      let currentAntaraStartMs = currentBhuktiStartMs;
      const bLordCycleIndex = VIMSHOTTARI_LORDS.indexOf(bLord);

      for (let a = 0; a < 9; a++) {
        const aLord = VIMSHOTTARI_LORDS[(bLordCycleIndex + a) % 9];
        const aYears = DASA_YEARS[aLord];
        // Antara span = (bhuktiSpan * antaraYears) / 120
        const aSpanMs = (bYears * aYears / (120 * 120)) * dYears * 365.2425 * 86400000;
        const aEndMs = currentAntaraStartMs + aSpanMs;

        const sookshmas = [];
        let currentSookshmaStartMs = currentAntaraStartMs;
        const aLordCycleIndex = VIMSHOTTARI_LORDS.indexOf(aLord);

        for (let s = 0; s < 9; s++) {
          const sLord = VIMSHOTTARI_LORDS[(aLordCycleIndex + s) % 9];
          const sYears = DASA_YEARS[sLord];
          // Sookshma span = (antaraSpan * sookshmaYears) / 120
          const sSpanMs = (aYears * sYears / (120 * 120 * 120)) * dYears * bYears * 365.2425 * 86400000;
          const sEndMs = currentSookshmaStartMs + sSpanMs;

          sookshmas.push({
            lord: sLord,
            start: new Date(currentSookshmaStartMs),
            end: new Date(sEndMs)
          });
          currentSookshmaStartMs = sEndMs;
        }

        antaras.push({
          lord: aLord,
          start: new Date(currentAntaraStartMs),
          end: new Date(aEndMs),
          sookshmas
        });
        currentAntaraStartMs = aEndMs;
      }

      bhuktis.push({
        lord: bLord,
        start: new Date(currentBhuktiStartMs),
        end: new Date(bEndMs),
        antaras
      });
      currentBhuktiStartMs = bEndMs;
    }

    dasas.push({
      lord: dLord,
      start: new Date(currentDasaStartMs),
      end: new Date(dEndMs),
      bhuktis
    });
    currentDasaStartMs = dEndMs;
  }

  return dasas;
}

/**
 * 2. Active Dasa Lords Helper
 * Returns the active Lords (Dasa, Bhukti, Antara, Sookshma) ruling on any given target date.
 * 
 * @param {string|number|Date} targetDate - Date to check
 * @param {Array<object>} dasaHierarchy - Dasa tree calculated from calculateKPDasas
 * @returns {object} Object containing active lords and periods
 */
export function getActiveDasaLords(targetDate, dasaHierarchy) {
  const targetMs = new Date(targetDate).getTime();

  let activeDasa = null;
  let activeBhukti = null;
  let activeAntara = null;
  let activeSookshma = null;

  // Find Mahadasa
  for (const d of dasaHierarchy) {
    if (targetMs >= d.start.getTime() && targetMs < d.end.getTime()) {
      activeDasa = d;
      break;
    }
  }

  if (activeDasa) {
    // Find Bhukti
    for (const b of activeDasa.bhuktis) {
      if (targetMs >= b.start.getTime() && targetMs < b.end.getTime()) {
        activeBhukti = b;
        break;
      }
    }
  }

  if (activeBhukti) {
    // Find Antara
    for (const a of activeBhukti.antaras) {
      if (targetMs >= a.start.getTime() && targetMs < a.end.getTime()) {
        activeAntara = a;
        break;
      }
    }
  }

  if (activeAntara) {
    // Find Sookshma
    for (const s of activeAntara.sookshmas) {
      if (targetMs >= s.start.getTime() && targetMs < s.end.getTime()) {
        activeSookshma = s;
        break;
      }
    }
  }

  return {
    dasa: activeDasa ? activeDasa.lord : null,
    bhukti: activeBhukti ? activeBhukti.lord : null,
    antara: activeAntara ? activeAntara.lord : null,
    sookshma: activeSookshma ? activeSookshma.lord : null,
    dasaPeriod: activeDasa ? { start: activeDasa.start, end: activeDasa.end } : null,
    bhuktiPeriod: activeBhukti ? { start: activeBhukti.start, end: activeBhukti.end } : null,
    antaraPeriod: activeAntara ? { start: activeAntara.start, end: activeAntara.end } : null,
    sookshmaPeriod: activeSookshma ? { start: activeSookshma.start, end: activeSookshma.end } : null
  };
}
