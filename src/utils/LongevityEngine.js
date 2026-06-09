/**
 * ============================================================================
 * 💀 LONGEVITY & MARAKA EVALUATION ENGINE (OPTIMIZED)
 * Based on Dr. PS Deb's Longevity and Death Presentation
 * ============================================================================
 */

import { RASHI_LORDS } from './ephemerisEngine';

const EXALTATION_SIGNS = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6
};

const DEBILITATION_SIGNS = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0
};

export const LongevityEngine = {
  /**
   * Helper to build the chart object expected by the evaluation function
   * @param {Array} planets - Planetary data array
   * @param {Number} lagnaRasiIndex - Rasi index of the ascendant
   * @returns {Object} Structured chart containing houses and planets
   */
  constructChart: function(planets, lagnaRasiIndex) {
    const chart = {
      houses: {},
      planets: {}
    };

    const lagRasiIdx = isNaN(lagnaRasiIndex) ? 0 : lagnaRasiIndex;

    // 1. Initialize houses 1 to 12
    for (let h = 1; h <= 12; h++) {
      const rasiIndex = (lagRasiIdx + h - 1) % 12;
      chart.houses[h] = {
        lord: RASHI_LORDS[rasiIndex] || 'Sun',
        occupants: []
      };
    }

    // 2. Map planets
    if (Array.isArray(planets)) {
      planets.forEach(p => {
        if (!p) return;
        const pName = p.planet || p.name;
        if (!pName) return;
        const rIndex = isNaN(p.rasiIndex) ? 0 : p.rasiIndex;
        const houseNum = ((rIndex - lagRasiIdx + 12) % 12) + 1;
        
        chart.planets[pName] = {
          house: houseNum,
          isExalted: rIndex === EXALTATION_SIGNS[pName],
          isDebilitated: rIndex === DEBILITATION_SIGNS[pName],
          rasiIndex: rIndex
        };

        if (chart.houses[houseNum]) {
          chart.houses[houseNum].occupants.push(pName);
        }
      });
    }

    // Ensure all 9 traditional planets are defined to avoid ReferenceErrors
    const defaultPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    defaultPlanets.forEach(pName => {
      if (!chart.planets[pName]) {
        chart.planets[pName] = {
          house: 1,
          isExalted: false,
          isDebilitated: false,
          rasiIndex: 0
        };
      }
    });

    return chart;
  },

  /**
   * Main function to evaluate Longevity Yogas and Maraka threats
   * @param {Object} chart - The parsed ephemeris data (planets, houses, lagna)
   * @param {Object} functionalRoles - The already calculated { ben, mal, mar, bad } arrays from your main app
   * @returns {Object} Report containing active Yogas and risk levels
   */
  evaluateLongevity: function(chart, functionalRoles) {
    const roles = functionalRoles || { ben: [], mal: [], mar: [], bad: [] };

    const report = {
      marakas: { 
        primary: roles.mar || [], // Pulls straight from your existing app logic
        badhakas: roles.bad || [], // Pulls straight from your existing app logic
        secondary: [], 
        tertiary: [] 
      },
      ayurYogas: [], // Long life combinations
      arishtaYogas: [], // Short life combinations
    };

    const lord1 = chart.houses[1]?.lord || 'Sun';
    const lord3 = chart.houses[3]?.lord || 'Sun';
    const lord8 = chart.houses[8]?.lord || 'Sun';
    const lord6 = chart.houses[6]?.lord || 'Sun';

    // ==========================================
    // 1. IDENTIFY SECONDARY & TERTIARY THREATS 
    // ==========================================
    
    // Secondary Determinants: Lords of 3rd and 8th
    report.marakas.secondary.push(lord3, lord8);
    
    // Tertiary Determinants: Saturn associated with Marakas, Lords of 6th/8th.
    report.marakas.tertiary.push(lord6);
    
    // Check if Saturn is in a Maraka house (2nd or 7th)
    const saturnHouse = chart.planets['Saturn']?.house || 1;
    if (saturnHouse === 2 || saturnHouse === 7) {
      report.marakas.tertiary.push('Saturn');
    }

    // ==========================================
    // 2. LONG LIFE COMBINATIONS (Ayur Yogas)
    // ==========================================
    
    // Lord of 8th house in 3rd, 6th, 8th or 12th house increases Age
    const lord8House = chart.planets[lord8]?.house || 1;
    if ([3, 6, 8, 12].includes(lord8House)) {
      report.ayurYogas.push("Vipreet Ayur Yoga: 8th Lord in Dusthana (3, 6, 8, 12) protects longevity.");
    }

    // Lord of Lagna conjunct with Lord of 8th house increase Life
    if (chart.planets[lord1]?.house === chart.planets[lord8]?.house) {
      report.ayurYogas.push("Lagna & 8th Lord Conjunction: Increases life span.");
    }

    // Lagna Lord in Kendra or Trikona or Exalted
    const lord1House = chart.planets[lord1]?.house || 1;
    if ([1, 4, 5, 7, 9, 10].includes(lord1House) || chart.planets[lord1]?.isExalted) {
      report.ayurYogas.push("Strong Lagna Lord: Lagna lord in Kendra/Trikona or Exalted grants vitality.");
    }

    // Saturn Karaka of 8th house in 8th house 
    if (saturnHouse === 8) {
      report.ayurYogas.push("Saturnine Protection: Saturn (Ayush Karaka) in the 8th house gives long life.");
    }

    // ==========================================
    // 3. SHORT LIFE COMBINATIONS (Arishta Yogas)
    // ==========================================
    
    // Short life if Lagnas Lord is weak, while 8ths Lord is an angle.
    if (chart.planets[lord1]?.isDebilitated && [1, 4, 7, 10].includes(lord8House)) {
      report.arishtaYogas.push("Alpayu Yoga: Weak Lagna lord combined with 8th lord in Kendra.");
    }

    // 8th Lord in 8th with Malefics
    const occupants8th = chart.houses[8]?.occupants || [];
    const hasMaleficIn8th = occupants8th.some(p => ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p));
    if (lord8House === 8 && hasMaleficIn8th) {
      report.arishtaYogas.push("Afflicted 8th House: 8th lord in 8th with malefics requires health vigilance.");
    }

    return report;
  }
};
