// ============================================================================
// 📊 VEDIC ASTROLOGY MATCHMAKING CRITERIA (12-KOOT LOOKUP MATRIX)
// ============================================================================

export const DWADASH_KOOT_RULES = [
  { id: 1, key: 'dina', name: "Dina / Tara", description: "Health, destiny compatibility, and longevity indicators.", maxPoints: 3 },
  { id: 2, key: 'gana', name: "Gana", description: "Temperament, disposition, and mental wavelength alignment.", maxPoints: 6 },
  { id: 3, key: 'yoni', name: "Yoni", description: "Physical, instinctual, and deep biological compatibility.", maxPoints: 4 },
  { id: 4, key: 'maitri', name: "Graha Maitri", description: "Psychological compatibility and planetary friendship harmonies.", maxPoints: 2 },
  { id: 5, key: 'bhakoot', name: "Rasi / Bhakoot", description: "Destiny family growth, emotional welfare, and prosperity cycles.", maxPoints: 7 },
  { id: 6, key: 'nadi', name: "Nadi", description: "Physiological, genetic health compatibility, and core life forces.", maxPoints: 8 },
  { id: 7, key: 'varna', name: "Varna", description: "Work compatibility, spiritual evolution, and natural ego matching.", maxPoints: 1 },
  { id: 8, key: 'vashya', name: "Vashya", description: "Mutual interpersonal attraction, dominance balances, and affection.", maxPoints: 2 },
  { id: 9, key: 'mahendra', name: "Mahendra", description: "Promotes lifetime security, well-being, and longevity of attachment.", maxPoints: 4 },
  { id: 10, key: 'striDirgha', name: "Stree Deergha", description: "Ensures continuing joy, good luck, and long-term prosperity.", maxPoints: 3 },
  { id: 11, key: 'rajju', name: "Rajju", description: "Protects long-term marital fidelity and checks structural mishaps.", maxPoints: 7 },
  { id: 12, key: 'vedha', name: "Vedha", description: "Absence of structural obstacles or unseen karmic afflictions.", maxPoints: 3 }
];

export const generateMatchSynthesisPrompt = (matchState) => {
  const { 
    boyName, girlName, 
    totalScore, maxScore, 
    mangalVerdict, 
    activeWarnings, // e.g., ['Nadi Dosha', 'Navamsha 8th House Malefic']
    kootBreakdown, // Array of individual Koot scores
    overlays
  } = matchState;
  
  return `
    You are an expert, empathetic Vedic Astrologer providing a relationship synthesis for a couple considering marriage.
    
    COUPLE DATA:
    - Partner A: ${boyName}
    - Partner B: ${girlName}
    - DwadashKoot Score: ${totalScore} out of ${maxScore}
    - Mangal Dosha Status: ${mangalVerdict}
    - Critical Alerts: ${activeWarnings.length > 0 ? activeWarnings.join(', ') : 'None'}
    - Key Synastry Overlays: ${overlays.length > 0 ? overlays.map(o => o.desc).join(' | ') : 'No major distinct overlays'}
    
    INSTRUCTIONS:
    Write a highly personalized, 3-paragraph relationship verdict.
    1. Paragraph 1 (The Bond): Interpret their total score. Highlight the strengths of their connection based on a high/medium/low score. Integrate any Key Synastry Overlays into your assessment of their bond, explaining how their specific planets impact each other's charts.
    2. Paragraph 2 (The Friction): Address their Mangal Dosha status and any Critical Alerts (like Nadi Dosha). Explain *how* these specific afflictions will manifest in their daily life (e.g., communication clashes, health concerns) rather than just stating the astrological names.
    3. Paragraph 3 (The Verdict & Upayas): Provide a final overarching verdict on whether this is a supportive match. Suggest 1 or 2 practical Vedic remedies (Upayas) specifically targeting their Critical Alerts to help harmonize their union.
    Keep the tone objective, deeply insightful, and constructive.
  `;
};

// ============================================================================
// 🌌 MUTUAL PLANETARY OVERLAYS (SYNASTRY)
// ============================================================================

export const calculateSynastryOverlays = (boyLagna, boyPlacements, girlLagna, girlPlacements) => {
  if (boyLagna === undefined || girlLagna === undefined || !boyPlacements || !girlPlacements) return [];
  
  const overlays = [];

  // Helper function to find which House a planet falls into
  const getHouse = (planetSign, lagnaSign) => ((planetSign - lagnaSign + 12) % 12) + 1;

  // 1. Venus/Lagna Connections (Attraction)
  const boyVenusInGirl = getHouse(boyPlacements['Venus'], girlLagna);
  if (boyVenusInGirl === 1 || boyVenusInGirl === 7) {
     overlays.push({ type: 'Positive', title: 'Magnetic Attraction', desc: "Boy's Venus falls in Girl's 1st/7th House axis. Indicates strong natural romantic and physical magnetism." });
  }
  const girlVenusInBoy = getHouse(girlPlacements['Venus'], boyLagna);
  if (girlVenusInBoy === 1 || girlVenusInBoy === 7) {
     overlays.push({ type: 'Positive', title: 'Magnetic Attraction', desc: "Girl's Venus falls in Boy's 1st/7th House axis. Indicates strong natural romantic and physical magnetism." });
  }

  // 2. Jupiter's Blessing (Growth & Prosperity)
  const girlJupiterInBoy = getHouse(girlPlacements['Jupiter'], boyLagna);
  if ([1, 5, 9].includes(girlJupiterInBoy)) {
     overlays.push({ type: 'Positive', title: 'Spiritual Blessing', desc: "Girl's Jupiter falls in Boy's Dharma Trikona (1, 5, 9). She brings luck, wisdom, and expansion to his life path." });
  }

  // 3. Saturn/Moon Connections (Karmic Restriction)
  if (boyPlacements['Saturn'] === girlPlacements['Moon']) {
     overlays.push({ type: 'Warning', title: 'Karmic Weight', desc: "Boy's Saturn is conjunct Girl's Moon. Creates an intense karmic tie, but can feel emotionally restrictive or heavy for the Girl." });
  }
  if (girlPlacements['Saturn'] === boyPlacements['Moon']) {
     overlays.push({ type: 'Warning', title: 'Karmic Weight', desc: "Girl's Saturn is conjunct Boy's Moon. Creates an intense karmic tie, but can feel emotionally restrictive or heavy for the Boy." });
  }

  // 4. Mars in 8th (Friction)
  const boyMarsInGirl = getHouse(boyPlacements['Mars'], girlLagna);
  if (boyMarsInGirl === 8) {
     overlays.push({ type: 'Warning', title: 'Eighth House Mars', desc: "Boy's Mars falls in Girl's 8th House. Indicates potential for sudden ego clashes and requires conscious patience during conflicts." });
  }

  return overlays;
};