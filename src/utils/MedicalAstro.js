import { AstroEngine, RASIS, getBVRamanFunctionalDignity } from './ephemerisEngine';

// Mapping of 12 houses (zodiac signs starting from Ascendant) to human body parts
export const BODY_PARTS_MAPPING = {
  1: { organ: "Head & Brain", part: "Head, brain, skull, forehead, eyes", desc: "Governs general vitality, physical appearance, constitution, and mental energy." },
  2: { organ: "Throat & Face", part: "Throat, neck, teeth, tongue, gums, mouth, vocal cords", desc: "Governs speech, facial organs, taste, and early physical nourishment." },
  3: { organ: "Shoulders, Lungs & Nerves", part: "Shoulders, arms, hands, upper chest, lungs, collar bones, nervous system", desc: "Governs respiratory health, shoulder strength, and sensory/neurological connections." },
  4: { organ: "Heart & Chest", part: "Heart, chest, breasts, upper ribs, diaphragm", desc: "Governs cardiovascular systems, lung capacity, and emotional chest stress." },
  5: { organ: "Stomach & Upper Abdomen", part: "Stomach, liver, spleen, gallbladder, pancreas, upper spine", desc: "Governs digestion, enzyme production, metabolism, and spinal alignment." },
  6: { organ: "Intestines & Immune Defense", part: "Large/small intestines, appendix, kidneys, lower abdomen, immune system", desc: "Governs digestive absorption, gut immunity, acute illness triggers, and general physical resistance." },
  7: { organ: "Lower Back & Kidneys", part: "Kidneys, adrenal glands, lower back, lumbar area, bladder, ovaries/prostate", desc: "Governs filtration systems, hormone secretion, and pelvic/lower back support." },
  8: { organ: "Genital & Excretory System", part: "Genitals, prostate, uterus, bladder, rectum, colon, pelvic bone", desc: "Governs elimination organs, reproduction, chronic disorders, and surgeries." },
  9: { organ: "Hips & Thighs", part: "Hips, thighs, sciatic nerve, femoral arteries", desc: "Governs locomotion, blood circulation lines in the lower body, and hip mobility." },
  10: { organ: "Bones & Joint Systems", part: "Knee joints, bones, skeleton, teeth structure, skin", desc: "Governs structural strength, calcium absorption, skin barrier, and knees." },
  11: { organ: "Legs & Blood Circulation", part: "Calves, shins, ankles, left ear, venous/circulatory systems", desc: "Governs venous return, calf muscle performance, and arterial/blood pressure balances." },
  12: { organ: "Feet & Lymphatic System", part: "Feet, toes, lymphatic system, left eye, sleep cycles", desc: "Governs waste drainage, fluid balance, sleep health, and foot stability." }
};

// Check if a planet is combust (within 8 degrees of the Sun)
function checkCombustion(planet, sun) {
  if (!planet || !sun || planet.planet === 'Sun') return false;
  let diff = Math.abs(planet.fullDegree - sun.fullDegree) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff < 8.0;
}

/**
 * Calculates Deha Bala (Physical Vitality Score), Tri-Dosha percentages,
 * organ vulnerabilities, and triggers specific health alert flags.
 */
export function calculateMedicalAstro(planets, lagnaIndex, lagnaDegree) {
  if (!Array.isArray(planets) || planets.length === 0) return null;

  const sun = planets.find(p => p.planet === 'Sun');
  const moon = planets.find(p => p.planet === 'Moon');
  const lagnaRasi = RASIS[lagnaIndex]?.name || "Aries";

  // Placements of all planets by sign index (0-11)
  const planetPlacements = {};
  planets.forEach(p => {
    planetPlacements[p.planet] = {
      rasiIndex: p.rasiIndex,
      fullDegree: p.fullDegree,
      isRetro: p.isRetro,
      isCombust: checkCombustion(p, sun)
    };
  });

  // Determine the house index for each planet (1 to 12)
  // House = (planetRasi - lagnaRasi + 12) % 12 + 1
  const planetHouses = {};
  planets.forEach(p => {
    planetHouses[p.planet] = ((p.rasiIndex - lagnaIndex + 12) % 12) + 1;
  });

  // Rashi rulers (standard lord index mapping)
  const RASHI_LORDS_INDEX = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4]; // Mars, Venus, Mercury, Moon, Sun, Mercury, Venus, Mars, Jupiter, Saturn, Saturn, Jupiter
  const RULER_PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  const getRasiLord = (rasiIdx) => {
    const lordIdx = RASHI_LORDS_INDEX[rasiIdx];
    return RULER_PLANET_NAMES[lordIdx];
  };

  const getHouseLord = (houseNum) => {
    const rasiIdx = (lagnaIndex + houseNum - 1) % 12;
    return getRasiLord(rasiIdx);
  };

  // Exaltation & Debilitation signs
  const EXALT_SIGNS = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const DEBIL_SIGNS = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };

  // ==========================================================================
  // 1. DEHA BALA (Vitality Score) Calculation
  // ==========================================================================
  const lagnaLordName = getRasiLord(lagnaIndex);
  const lagnaLord = planetPlacements[lagnaLordName];
  
  let vitalityPoints = 60; // base score

  if (lagnaLord) {
    // Lord Dignity
    if (lagnaLord.rasiIndex === EXALT_SIGNS[lagnaLordName]) {
      vitalityPoints += 25; // Exalted
    } else if (lagnaLord.rasiIndex === DEBIL_SIGNS[lagnaLordName]) {
      vitalityPoints -= 15; // Debilitated
    } else if (RASHI_LORDS_INDEX[lagnaLord.rasiIndex] === RASHI_LORDS_INDEX[lagnaIndex]) {
      vitalityPoints += 15; // Swakshetra (Own sign)
    }

    // Lord combustion
    if (lagnaLord.isCombust) {
      vitalityPoints -= 12;
    }

    // Lord in Dusthana houses (6, 8, 12)
    const lordHouse = planetHouses[lagnaLordName];
    if ([6, 8, 12].includes(lordHouse)) {
      vitalityPoints -= 12;
    }
  }

  // Malefics/Benefics in the 1st House
  planets.forEach(p => {
    if (planetHouses[p.planet] === 1) {
      const dignity = getBVRamanFunctionalDignity(p.planet, lagnaRasi);
      if (dignity === 'Malefic') {
        vitalityPoints -= 5; // Malefic afflicting Lagna
      } else if (dignity === 'Benefic' && p.planet !== lagnaLordName) {
        vitalityPoints += 6; // Benefic strengthening Lagna
      }
    }
  });

  // Cap Vitality between 25% and 98%
  const vitalityScore = Math.max(25, Math.min(98, vitalityPoints));

  // Determine constitution label
  let constitutionType = "Moderate physical constitution";
  if (vitalityScore >= 80) constitutionType = "Excellent vitality & strong immune resistance (Bala)";
  else if (vitalityScore >= 60) constitutionType = "Good constitution with normal resistance";
  else if (vitalityScore >= 45) constitutionType = "Delicate constitution, prone to seasonal stress";
  else constitutionType = "Vulnerable physical constitution, requires active self-care";

  // ==========================================================================
  // 2. TRI-DOSHA PROFILE CALCULATIONS
  // ==========================================================================
  let vataPoints = 0;
  let pittaPoints = 0;
  let kaphaPoints = 0;

  // Sign Dosha classification
  // Fire = Pitta, Air = Vata, Water = Kapha
  // Earth: Taurus = Kapha, Virgo = Vata, Capricorn = Vata
  const SIGN_DOSHA = [
    'pitta',  // 0. Aries (Pitta)
    'kapha',  // 1. Taurus (Kapha)
    'vata',   // 2. Gemini (Vata)
    'kapha',  // 3. Cancer (Kapha)
    'pitta',  // 4. Leo (Pitta)
    'vata',   // 5. Virgo (Vata)
    'vata',   // 6. Libra (Vata)
    'pitta',  // 7. Scorpio (Pitta/Kapha - mixed, assign pitta)
    'pitta',  // 8. Sagittarius (Pitta)
    'vata',   // 9. Capricorn (Vata)
    'vata',   // 10. Aquarius (Vata)
    'kapha'   // 11. Pisces (Kapha)
  ];

  // Planet Dosha classification
  const PLANET_DOSHA = {
    Sun: 'pitta',
    Moon: 'kapha',
    Mars: 'pitta',
    Mercury: 'vata',
    Jupiter: 'kapha',
    Venus: 'kapha',
    Saturn: 'vata',
    Rahu: 'vata',
    Ketu: 'pitta'
  };

  const addDoshaPoints = (type, pts) => {
    if (type === 'vata') vataPoints += pts;
    else if (type === 'pitta') pittaPoints += pts;
    else if (type === 'kapha') kaphaPoints += pts;
  };

  // Add points for Lagna Sign
  addDoshaPoints(SIGN_DOSHA[lagnaIndex], 5);
  // Add points for Lagna Lord
  if (PLANET_DOSHA[lagnaLordName]) {
    addDoshaPoints(PLANET_DOSHA[lagnaLordName], 4);
  }

  // Add points for Moon placement
  if (moon) {
    addDoshaPoints(SIGN_DOSHA[moon.rasiIndex], 4);
    addDoshaPoints('kapha', 3); // Moon has natural Kapha nature
  }

  // Add points for Sun placement
  if (sun) {
    addDoshaPoints(SIGN_DOSHA[sun.rasiIndex], 3);
    addDoshaPoints('pitta', 3); // Sun has natural Pitta nature
  }

  // Add points for other planets
  planets.forEach(p => {
    const pName = p.planet;
    // Base planet nature
    if (PLANET_DOSHA[pName]) {
      addDoshaPoints(PLANET_DOSHA[pName], 2);
    }
    // Sign placement nature
    addDoshaPoints(SIGN_DOSHA[p.rasiIndex], 1);
  });

  const totalDosha = vataPoints + pittaPoints + kaphaPoints;
  const vataPct = Math.round((vataPoints / totalDosha) * 100);
  const pittaPct = Math.round((pittaPoints / totalDosha) * 100);
  const kaphaPct = 100 - (vataPct + pittaPct); // make sure it sums to 100%

  // ==========================================================================
  // 3. HOUSE & ORGAN VULNERABILITY SCORING (12 Houses)
  // ==========================================================================
  const organVulnerabilities = {};

  for (let H = 1; H <= 12; H++) {
    const signIdx = (lagnaIndex + H - 1) % 12;
    const lordName = getHouseLord(H);
    const lordInfo = planetPlacements[lordName];
    
    let vulnerabilityScore = 15; // Base level of vulnerability

    // Check planets occupying this house
    let hasMalefics = false;
    let maleficCount = 0;
    let beneficCount = 0;
    
    planets.forEach(p => {
      if (planetHouses[p.planet] === H) {
        const dignity = getBVRamanFunctionalDignity(p.planet, lagnaRasi);
        if (dignity === 'Malefic') {
          hasMalefics = true;
          maleficCount++;
          vulnerabilityScore += 25; // Large vulnerability spike
        } else if (dignity === 'Benefic') {
          beneficCount++;
          vulnerabilityScore -= 10; // Protective buffer
        }
      }
    });

    // Check lord strength
    if (lordInfo) {
      if (lordInfo.isCombust) {
        vulnerabilityScore += 15;
      }
      if (lordInfo.rasiIndex === DEBIL_SIGNS[lordName]) {
        vulnerabilityScore += 20;
      }
      // Lord in a Dusthana house (6th, 8th, 12th)
      const lordHouse = planetHouses[lordName];
      if ([6, 8, 12].includes(lordHouse) && lordHouse !== H) {
        vulnerabilityScore += 15;
      }
    }

    // 6th house multiplier (Acute diseases)
    if (H === 6) {
      vulnerabilityScore += 10;
    }
    // 8th house multiplier (Chronic diseases)
    if (H === 8) {
      vulnerabilityScore += 15;
    }

    // Normalizing scores between 10% and 95%
    const normalizedScore = Math.max(10, Math.min(95, vulnerabilityScore));
    
    let statusLabel = "Optimal / Healthy";
    if (normalizedScore > 65) statusLabel = "High Vulnerability";
    else if (normalizedScore > 40) statusLabel = "Moderate Vulnerability";
    
    organVulnerabilities[H] = {
      score: normalizedScore,
      status: statusLabel,
      organ: BODY_PARTS_MAPPING[H].organ,
      part: BODY_PARTS_MAPPING[H].part,
      desc: BODY_PARTS_MAPPING[H].desc,
      hasMalefics,
      maleficCount,
      beneficCount
    };
  }

  // ==========================================================================
  // 4. SPECIFIC DISEASE ALERTS & COMBINATIONS
  // ==========================================================================
  const specificAlerts = [];

  const addAlert = (title, level, desc, rule) => {
    specificAlerts.push({ title, level, desc, rule });
  };

  // Rule 1: Mental stress / Depression (Moon-Saturn affliction)
  const saturnHouse = planetHouses['Saturn'];
  const moonHouse = planetHouses['Moon'];
  const saturnRasi = planetPlacements['Saturn']?.rasiIndex;
  const moonRasi = planetPlacements['Moon']?.rasiIndex;

  let isMoonSaturnAfflicted = false;
  if (saturnHouse && moonHouse) {
    const houseDiff = (saturnHouse - moonHouse + 12) % 12;
    // Check conjunction, mutual aspect (7th), or Saturn's 3rd and 10th aspects
    if (houseDiff === 0 || houseDiff === 6 || houseDiff === 2 || houseDiff === 9) {
      isMoonSaturnAfflicted = true;
    }
  }
  if (isMoonSaturnAfflicted) {
    addAlert(
      "Emotional & Nervous System Sensitivity (Chandra-Sani)",
      "Moderate",
      "Moon afflicted by Saturn can cause sluggishness in fluid circulation, minor emotional burnout, Vata mental stress, or a tendency to collect anxiety. Upaya: Chant Chandra/Sani mantras, practice breathwork.",
      "Saturn aspecting or conjunct Moon in the transit/natal chart."
    );
  }

  // Rule 2: Circulation / Hypertension (Mars-Sun affliction)
  let isMarsSunAfflicted = false;
  const marsHouse = planetHouses['Mars'];
  const sunHouse = planetHouses['Sun'];
  if (marsHouse && sunHouse) {
    const houseDiff = (marsHouse - sunHouse + 12) % 12;
    // Conjunction or mutual aspect (7th), or Mars 4th and 8th aspects
    if (houseDiff === 0 || houseDiff === 6 || houseDiff === 3 || houseDiff === 7) {
      isMarsSunAfflicted = true;
    }
  }
  if (isMarsSunAfflicted || planetPlacements['Mars']?.rasiIndex === 4) { // Mars in Leo
    addAlert(
      "Cardiovascular & Fire Element Irritation (Surya-Mangal)",
      "Moderate",
      "Mars/Sun contact increases excess Pitta (fire) in the blood. This can result in mild blood pressure shifts, heat rashes, high body temperature, or inflammatory flare-ups. Upaya: Keep hydrated, avoid hot spices.",
      "Sun-Mars mutual aspect/conjunction or Mars located in Leo (sun-ruled rashi)."
    );
  }

  // Rule 3: Metabolic / Liver stress (Jupiter in 6th/8th or combust)
  const jupiterHouse = planetHouses['Jupiter'];
  const jupiterCombust = planetPlacements['Jupiter']?.isCombust;
  if ([6, 8].includes(jupiterHouse) || jupiterCombust) {
    addAlert(
      "Digestive Enzyme & Liver Sluggishness (Guru-Affliction)",
      "Moderate",
      "Jupiter represents liver systems, lipids, and sugar metabolism. Its placement in illness houses or in combustion suggests a sensitive gallbladder or metabolic system. Avoid excessive sweets and processed fats. Upaya: Turmeric milk, fasting on Thursdays.",
      "Jupiter placed in the 6th or 8th house, or combust by the Sun."
    );
  }

  // Rule 4: Respiratory / Allergy (Mercury in 6th or afflicted by Rahu/Saturn)
  const mercuryHouse = planetHouses['Mercury'];
  const mercuryRahuConj = planetPlacements['Mercury'] && planetPlacements['Rahu'] && (planetPlacements['Mercury'].rasiIndex === planetPlacements['Rahu'].rasiIndex);
  if (mercuryHouse === 6 || mercuryRahuConj) {
    addAlert(
      "Allergic & Respiratory System Vulnerability (Budha-Dusthana)",
      "Moderate",
      "Mercury represents the lungs, skin barrier, and nervous communication. When placed in the 6th house or conjunct Rahu, it can trigger breathing allergies, eczema, or sensitive nerve reactions. Upaya: Green vegetables, yoga breathing (Pranayama).",
      "Mercury located in the 6th house or conjunct Rahu."
    );
  }

  // Rule 5: Digestion Fire imbalances (Sun or Mars in 5th or 6th house)
  if ([5, 6].includes(sunHouse) || [5, 6].includes(marsHouse)) {
    addAlert(
      "Excessive Digestive Acid (Teevra Agni)",
      "Low",
      "Sun or Mars in digestive zones (5th/6th houses) indicates hyperactive digestion. While digestion is fast, it can create high acidity, acid reflux, or burning sensations. Upaya: Drink coconut water, cooling herbs.",
      "Sun or Mars located in the 5th or 6th house of digestion."
    );
  }

  // Rule 6: Chronic/Bone challenges (Saturn in 6th/8th/12th or combust)
  const saturnCombust = planetPlacements['Saturn']?.isCombust;
  if ([6, 8, 12].includes(saturnHouse) || saturnCombust) {
    addAlert(
      "Skeletal Joints & Calcium Absorption Sluggishness",
      "Moderate",
      "Saturn governs the teeth, bones, and joints. Placement in health stress houses or combustion suggests bone joint friction, stiffness, or slow calcium metabolism. Upaya: Morning sun exposure, oil joint massage.",
      "Saturn located in the 6th, 8th, or 12th houses, or combust by the Sun."
    );
  }

  // Default alert if nothing else is triggered
  if (specificAlerts.length === 0) {
    addAlert(
      "Equilibrium & Balanced Vitality",
      "Low",
      "No severe planetary health stress rules are triggered. Keep maintaining healthy physical habits and Ayurvedic routines to protect your constitutional strength.",
      "No standard malefic-benefic medical combinations found."
    );
  }

  // ==========================================================================
  // 5. TRIDOSHA BALANCED UPAYAS & REMEDIES
  // ==========================================================================
  const doshaDominant = vataPct >= pittaPct && vataPct >= kaphaPct ? 'vata' : pittaPct >= vataPct && pittaPct >= kaphaPct ? 'pitta' : 'kapha';

  const remedies = {
    vata: {
      type: "Vata Pacifying Routine (वात नाशक)",
      diet: "Favor warm, cooked, nourishing, and oily foods. Sweet, sour, and salty tastes are beneficial. Avoid cold, dry, raw foods, and dry grains.",
      lifestyle: "Establish regular timings for sleeping and eating. Daily warm sesame oil self-massage (Abhyanga). Stay warm and avoid dry wind.",
      herbs: "Ginger, Ashwagandha, Cinnamon, Fennel, Cardamom.",
      yoga: "Slow, grounding yoga poses (like Tadasana, Balasana, Virabhadrasana) and warm meditation."
    },
    pitta: {
      type: "Pitta Pacifying Routine (पित्त नाशक)",
      diet: "Favor cooling, hydrating, and mildly dry foods. Sweet, bitter, and astringent tastes are beneficial. Avoid spicy, sour, fermented, and fried foods.",
      lifestyle: "Avoid excessive heat, prolonged sun exposure, and highly competitive, high-pressure environments. Practice relaxation and daily gratitude.",
      herbs: "Coriander, Mint, Turmeric, Cardamom, Fennel, Aloe Vera, Shatavari.",
      yoga: "Cooling and calming postures (like Shavasana, Baddha Konasana, Paschimottanasana) and Sheetali Pranayama."
    },
    kapha: {
      type: "Kapha Pacifying Routine (कफ नाशक)",
      diet: "Favor light, dry, warm, and spicy foods. Pungent, bitter, and astringent tastes are beneficial. Avoid heavy, sweet, oily, cold, and salty dairy items.",
      lifestyle: "Avoid oversleeping and sleeping during daytime. Stay active with daily vigorous exercise, dry massage, and exposure to warmth.",
      herbs: "Black pepper, Ginger, Mustard, Turmeric, Cinnamon, Tulsi.",
      yoga: "Active, warming vinyasa flows (like Sun Salutations/Surya Namaskar, Dhanurasana) and Kapalbhati Pranayama."
    }
  };

  return {
    vitalityScore,
    constitutionType,
    lagnaLordName,
    
    // Dosha percentages
    dosha: {
      vata: vataPct,
      pitta: pittaPct,
      kapha: kaphaPct,
      dominant: doshaDominant
    },
    
    // 12 houses vulnerabilities
    vulnerabilities: organVulnerabilities,
    
    // Specific health alerts
    alerts: specificAlerts,
    
    // Dominant remedies
    remedy: remedies[doshaDominant]
  };
}

/**
 * Generates the wellness AI prompt based on the user's health state.
 */
export const generateWellnessAIPrompt = (healthState) => {
  const { dehaBala, doshas, activeVulnerabilities, lagnaSign } = healthState;
  
  // Find the dominant dosha
  const dominantDosha = Object.keys(doshas).reduce((a, b) => doshas[a] > doshas[b] ? a : b);
  
  return `
    You are an expert Ayurvedic Astrologer. Analyze the following astrological health profile and provide a short, highly personalized 3-paragraph wellness guide.
    
    PATIENT PROFILE:
    - Ascendant: ${lagnaSign}
    - Constitution Strength (Deha Bala): ${dehaBala}%
    - Dominant Dosha: ${dominantDosha} (${doshas[dominantDosha]}%)
    - Key Vulnerabilities: ${activeVulnerabilities.length > 0 ? activeVulnerabilities.join(', ') : 'None currently elevated'}
    
    INSTRUCTIONS:
    1. Paragraph 1: Explain their energetic baseline and what their Deha Bala % means for their daily immunity.
    2. Paragraph 2: Provide specific dietary advice to pacify their ${dominantDosha} dosha (e.g., specific meal timings, spices to use or avoid).
    3. Paragraph 3: Suggest one preventative lifestyle habit or yoga posture specifically targeting their key vulnerabilities.
    Keep the tone clinical, holistic, and empowering.
  `;
};

// ============================================================================
// ⏱️ REAL-TIME HEALTH TRIGGERS (DASHA & TRANSITS)
// ============================================================================

export const calculateHealthTriggers = (lagnaIndex, currentDashaLord, transitPlacements) => {
  const triggers = [];
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  // 1. Dasha Lord Analysis (Checking 6th, 8th, and 12th Lords)
  const lordOf6th = lagnaLords[(lagnaIndex + 5) % 12];
  const lordOf8th = lagnaLords[(lagnaIndex + 7) % 12];
  const lordOf12th = lagnaLords[(lagnaIndex + 11) % 12];

  if (currentDashaLord === lordOf6th) {
    triggers.push({ 
        type: 'Dasha Alert', 
        severity: 'High', 
        color: 'text-orange-700 bg-orange-50 border-orange-200',
        message: `You are currently running the period of ${currentDashaLord}, Lord of the 6th House (Disease & Immunity). Chronic vulnerabilities identified in Step 3 are highly active. Emphasize daily preventative care.` 
    });
  } else if (currentDashaLord === lordOf8th) {
    triggers.push({ 
        type: 'Dasha Alert', 
        severity: 'Critical', 
        color: 'text-red-700 bg-red-50 border-red-200',
        message: `You are currently running the period of ${currentDashaLord}, Lord of the 8th House (Sudden Events). Focus strictly on safety, avoid extreme physical risks, and prioritize routine diagnostics.` 
    });
  } else if (currentDashaLord === lordOf12th) {
    triggers.push({ 
        type: 'Dasha Alert', 
        severity: 'Moderate', 
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        message: `You are currently running the period of ${currentDashaLord}, Lord of the 12th House. Sleep disruptions and subtle energy drain are common. Focus on rest and mental isolation.` 
    });
  }

  // 2. Transit Analysis (Checking Heavy Malefics - Saturn/Rahu)
  if (transitPlacements) {
    const saturnHouse = ((transitPlacements['Saturn'] - lagnaIndex + 12) % 12) + 1;
    if ([6, 8, 12].includes(saturnHouse)) {
      triggers.push({ 
          type: 'Transit Alert', 
          severity: 'High', 
          color: 'text-slate-700 bg-slate-100 border-slate-300',
          message: `Transiting Saturn is heavily aspecting your ${saturnHouse}th House. This creates a high-friction period for physical recovery. Do not ignore minor symptoms.` 
      });
    }
  }

  if (triggers.length === 0) {
    triggers.push({ 
        type: 'All Clear', 
        severity: 'Low', 
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        message: 'No major malefic Dasha or heavy transit health triggers are currently active. Your energetic baseline is stable.'
    });
  }

  return triggers;
};
