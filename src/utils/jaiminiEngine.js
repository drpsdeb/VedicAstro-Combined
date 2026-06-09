// ============================================================================
// 🔮 JAIMINI ASTROLOGY ENGINE - CHARA KARAKAS
// ============================================================================

/**
 * Calculates the 7 Chara Karakas for a given list of planetary positions.
 * The 7 planets used are Sun, Moon, Mars, Mercury, Jupiter, Venus, and Saturn.
 * Rahu and Ketu are excluded from this 7-Karaka system.
 * 
 * Planets are sorted by their degree within their occupied sign (longitude % 30)
 * in descending order, and assigned:
 * 1. Atmakaraka (AK) - Soul / Self
 * 2. Amatyakaraka (AmK) - Career / Advisor
 * 3. Bhratrukaraka (BK) - Siblings / Gurus
 * 4. Matrukaraka (MK) - Mother / Home
 * 5. Putrakaraka (PK) - Children / Intellect
 * 6. Gnatikaraka (GK) - Relatives / Obstacles / Health
 * 7. Darakaraka (DK) - Spouse / Partners
 * 
 * @param {Array} planets - Array of planet objects (from ephemerisEngine)
 * @returns {Object|null} - Maps by Karaka and by Planet containing names and degrees
 */
export function calculateCharaKarakas(planets) {
  if (!Array.isArray(planets)) return null;

  const mainPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const eligible = planets.filter(p => {
    const name = p.name || p.planet;
    return mainPlanets.includes(name);
  });

  if (eligible.length < 7) {
    console.warn(`calculateCharaKarakas: Expected 7 planets, but only found ${eligible.length}`);
  }

  // Map each eligible planet to its degree inside its zodiac sign (0 to 30)
  const planetDegrees = eligible.map(p => {
    const name = p.name || p.planet;
    // Calculate degree within the sign (longitude % 30)
    const deg = typeof p.rasiDegrees === 'number' 
      ? p.rasiDegrees 
      : ((p.fullDegree ?? p.longitude ?? 0) % 30);
    return {
      planet: name,
      degree: deg
    };
  });

  // Sort by degree in descending order (highest degree gets AK, lowest gets DK)
  planetDegrees.sort((a, b) => b.degree - a.degree);

  const karakaLabels = ['AK', 'AmK', 'BK', 'MK', 'PK', 'GK', 'DK'];
  const karakaFullNames = {
    AK: 'Atmakaraka',
    AmK: 'Amatyakaraka',
    BK: 'Bhratrukaraka',
    MK: 'Matrukaraka',
    PK: 'Putrakaraka',
    GK: 'Gnatikaraka',
    DK: 'Darakaraka'
  };

  const results = {
    byKaraka: {},
    byPlanet: {},
    sortedList: []
  };

  planetDegrees.forEach((item, idx) => {
    if (idx < karakaLabels.length) {
      const label = karakaLabels[idx];
      const fullName = karakaFullNames[label];
      const entry = {
        planet: item.planet,
        degree: item.degree,
        label,
        fullName
      };
      
      results.byKaraka[label] = entry;
      results.byPlanet[item.planet] = entry;
      results.sortedList.push(entry);
    }
  });

  return results;
}

/**
 * Gets the list of signs aspected by a given sign index based on Jaimini Sutras.
 * 
 * Rules:
 * - Cardinal signs (0, 3, 6, 9) aspect Fixed signs (1, 4, 7, 10) except adjacent (which is index + 1).
 * - Fixed signs (1, 4, 7, 10) aspect Cardinal signs (0, 3, 6, 9) except adjacent (which is index - 1).
 * - Mutable signs (2, 5, 8, 11) aspect all other Mutable signs.
 * 
 * @param {number} rasiIndex - 0-indexed sign index (0 = Aries, ..., 11 = Pisces)
 * @returns {Array<number>} - Array of aspected 0-indexed sign indices
 */
export function getRashiAspects(rasiIndex) {
  const idx = (parseInt(rasiIndex, 10) % 12 + 12) % 12;
  if (isNaN(idx)) return [];

  const signType = idx % 3; // 0 = Cardinal, 1 = Fixed, 2 = Mutable

  if (signType === 0) {
    // Cardinal
    const fixedSigns = [1, 4, 7, 10];
    const adjacentFixed = (idx + 1) % 12;
    return fixedSigns.filter(f => f !== adjacentFixed);
  } else if (signType === 1) {
    // Fixed
    const cardinalSigns = [0, 3, 6, 9];
    const adjacentCardinal = (idx - 1 + 12) % 12;
    return cardinalSigns.filter(c => c !== adjacentCardinal);
  } else {
    // Mutable
    const mutableSigns = [2, 5, 8, 11];
    return mutableSigns.filter(m => m !== idx);
  }
}

export const calculateArudhaLagna = (lagnaIndex, rasiPlacements) => {
  // 0=Aries, 1=Taurus, 2=Gemini, 3=Cancer, 4=Leo, 5=Virgo, 6=Libra, 7=Scorpio, 8=Sagittarius, 9=Capricorn, 10=Aquarius, 11=Pisces
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  const lagnaLord = lagnaLords[lagnaIndex];
  const lordPlacement = rasiPlacements[lagnaLord];
  
  if (lordPlacement === undefined) return null; // Fallback if data is missing

  // Step 1: Count from Lagna to Lagna Lord (inclusive)
  let distance = (lordPlacement - lagnaIndex);
  if (distance < 0) distance += 12;

  // Step 2: Count same distance from the Lord
  let arudhaLagna = (lordPlacement + distance) % 12;

  // Step 3: Apply Jaimini Exceptions
  // If AL is in the 1st house, it moves to the 10th house
  if (arudhaLagna === lagnaIndex) {
      arudhaLagna = (arudhaLagna + 9) % 12; // 10th from Lagna (0-indexed means add 9)
  } 
  // If AL is in the 7th house, it moves to the 4th house
  else if (arudhaLagna === (lagnaIndex + 6) % 12) {
      arudhaLagna = (arudhaLagna + 3) % 12; // 4th from Lagna (add 3)
  }

  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return { signIndex: arudhaLagna, signName: signs[arudhaLagna] };
};

export const calculateUpapadaLagna = (lagnaIndex, rasiPlacements) => {
  const lagnaLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  
  // 12th house is one house behind the Lagna
  const house12Index = (lagnaIndex + 11) % 12;
  const lord12 = lagnaLords[house12Index];
  const lordPlacement = rasiPlacements[lord12];
  
  if (lordPlacement === undefined) return null;

  // Step 1: Count from 12th House to 12th Lord
  let distance = (lordPlacement - house12Index);
  if (distance < 0) distance += 12;

  // Step 2: Count same distance forward from the Lord
  let upapadaLagna = (lordPlacement + distance) % 12;

  // Step 3: Apply Jaimini Exceptions for Arudhas
  // If UL falls in the 12th house itself, move it to the 10th from the 12th (which is the 9th house)
  if (upapadaLagna === house12Index) {
      upapadaLagna = (upapadaLagna + 9) % 12; 
  } 
  // If UL falls in the 7th from the 12th (which is the 6th house), move it to the 4th from the 12th (the 3rd house)
  else if (upapadaLagna === (house12Index + 6) % 12) {
      upapadaLagna = (upapadaLagna + 3) % 12; 
  }

  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const ulLord = lagnaLords[upapadaLagna];
  
  return { 
      signIndex: upapadaLagna, 
      signName: signs[upapadaLagna],
      lord: ulLord
  };
};

// Helper for Vrata (Fasting)
const getFastingDay = (lord) => {
  const days = { Sun: 'Sunday', Moon: 'Monday', Mars: 'Tuesday', Mercury: 'Wednesday', Jupiter: 'Thursday', Venus: 'Friday', Saturn: 'Saturday' };
  return days[lord] || 'a spiritually significant day';
};

export const generateJaiminiInsights = (karakas, arudhaLagna, upapadaLagna, placements, rasiPlacements, lagnaIndex) => {
  if (!karakas || !karakas.AK || !placements || !rasiPlacements) return [];
  
  const insights = [];
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // 1. Specific Atmakaraka
  const akPlanet = karakas.AK.planet;
  const akHouse = placements[akPlanet];
  const akSign = signs[rasiPlacements[akPlanet]];
  insights.push({
    question: "What is the primary desire and purpose of the soul in this lifetime?",
    answer: `Your Atmakaraka (AK) is the ${akPlanet}. While this generally indicates a soul lesson of ${getPlanetLesson(akPlanet)}, your specific chart places it in the ${akHouse}th house in the sign of ${akSign}. This means your deepest karmic battles and spiritual growth will primarily unfold through ${getHouseTheme(akHouse)}.`,
    icon: 'Sun', color: 'text-amber-700', bg: 'bg-amber-50'
  });

  // 2. Specific Karakamsha
  insights.push({
    question: "What are my soul's innate talents and ultimate vocational path?",
    answer: `Based on the Karakamsha (the Navamsha sign of your Atmakaraka), your deep-seated talents align with ${getKarakamshaTalent(akPlanet)}. The Jaimini Sutras state that the planet functioning as your AK strongly colors your Swamsha, dictating the skills you naturally master in this lifetime without needing formal training.`,
    icon: 'Star', color: 'text-indigo-700', bg: 'bg-indigo-50'
  });

  // 3. Specific Amatyakaraka
  if (karakas.AmK) {
    const amkPlanet = karakas.AmK.planet;
    const amkHouse = placements[amkPlanet];
    insights.push({
      question: "What drives my career, and how will I achieve success?",
      answer: `Your Amatyakaraka (AmK) is the ${amkPlanet}, placed in your ${amkHouse}th house. This planet is the minister to your soul. Because it sits in the house of ${getHouseTheme(amkHouse)}, your professional trajectory and the people who guide you will heavily involve these themes, utilizing your natural ${getCareerTrait(amkPlanet)}.`,
      icon: 'Briefcase', color: 'text-blue-700', bg: 'bg-blue-50'
    });
  }

  // 4. Specific Darakaraka
  if (karakas.DK) {
    const dkPlanet = karakas.DK.planet;
    const dkHouse = placements[dkPlanet];
    insights.push({
      question: "What is the true nature of my ideal spouse or life partner?",
      answer: `Your Darakaraka (DK) is the ${dkPlanet}, placed in your ${dkHouse}th house. In Jaimini, the planet with the lowest degree signifies the spouse. Sitting in the house of ${getHouseTheme(dkHouse)}, this suggests a partner who embodies ${getSpouseTrait(dkPlanet)} and whose life path aligns with these areas.`,
      icon: 'Heart', color: 'text-rose-700', bg: 'bg-rose-50'
    });
  }

  // 5. Specific Arudha Lagna
  if (arudhaLagna) {
    // Calculate distance from Lagna to find which house the AL falls in
    let alHouseNum = (arudhaLagna.signIndex - lagnaIndex) + 1;
    if (alHouseNum <= 0) alHouseNum += 12;
    
    insights.push({
      question: "How does the world perceive me, and what is my public status?",
      answer: `Your Arudha Lagna (AL) falls in the sign of ${arudhaLagna.signName}, which represents your ${alHouseNum}th house. The Arudha is the 'Maya' or image you project. Because it falls here, society perceives your status, wealth, and reputation primarily through the lens of ${getHouseTheme(alHouseNum)}—regardless of how you view yourself internally.`,
      icon: 'Eye', color: 'text-emerald-700', bg: 'bg-emerald-50'
    });
  }

  // 6. Specific Upapada Lagna
  if (upapadaLagna) {
    let ulHouseNum = (upapadaLagna.signIndex - lagnaIndex) + 1;
    if (ulHouseNum <= 0) ulHouseNum += 12;

    insights.push({
      question: "What is the spiritual nature of my marriage, and how can I protect it?",
      answer: `Your Upapada Lagna (UL) falls in ${upapadaLagna.signName}, landing in your ${ulHouseNum}th house. The UL reveals the reality of your marriage. The partnership will be deeply intertwined with ${getHouseTheme(ulHouseNum)}. To harmonize this relationship and protect it from obstacles, Jaimini principles suggest observing a spiritual fast (Vrata) on ${getFastingDay(upapadaLagna.lord)}s, as this day is ruled by ${upapadaLagna.lord}.`,
      icon: 'Heart', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50'
    });
  }

  return insights;
};

const getPlanetLesson = (planet) => {
  const lessons = { Sun: "ego suppression and humility", Moon: "emotional balance and compassion", Mars: "controlling anger and righteous action", Mercury: "truthful communication", Jupiter: "respecting beliefs and honoring Gurus", Venus: "purifying relationships and unconditional love", Saturn: "selfless service and enduring burdens", Rahu: "overcoming illusions and fears" };
  return lessons[planet] || "spiritual development";
};
const getCareerTrait = (planet) => {
  const traits = { Sun: "leadership and authority", Moon: "public relations and caregiving", Mars: "logic and decisive action", Mercury: "commerce and communication", Jupiter: "teaching and advisory", Venus: "diplomacy and arts", Saturn: "hard work and administration", Rahu: "out-of-the-box innovation" };
  return traits[planet] || "dedicated effort";
};
const getSpouseTrait = (planet) => {
  const traits = { Sun: "authoritative and proud", Moon: "nurturing and sensitive", Mars: "dynamic and protective", Mercury: "youthful and intellectual", Jupiter: "wise and traditional", Venus: "romantic and accommodating", Saturn: "mature and responsible", Rahu: "unconventional" };
  return traits[planet] || "supportive qualities";
};

const getKarakamshaTalent = (planet) => {
  const talents = { 
    Sun: "government work, social service, and authoritative roles", 
    Moon: "education, fine arts, and hospitality", 
    Mars: "metallurgy, chemistry, engineering, and fire-related professions", 
    Mercury: "business, weaving, sculpting, and legal disputes", 
    Jupiter: "philosophy, religious leadership, and traditional Vedic knowledge", 
    Venus: "politics, passionate endeavors, and luxury goods", 
    Saturn: "ancient traditions, historical trades, and executing hard responsibilities", 
    Rahu: "machinery, archery, and navigating unconventional or dangerous paths",
    Ketu: "mathematics, astrology, and highly precise calculations" 
  };
  return talents[planet] || "spiritual dedication";
};

const getHouseTheme = (houseNum) => {
  const themes = {
    1: "self-discovery, physical vitality, and personal identity",
    2: "wealth accumulation, family values, and speech",
    3: "courage, individual efforts, and communication",
    4: "home life, emotional security, and inner peace",
    5: "creativity, intellect, children, and leadership",
    6: "service, overcoming obstacles, and daily routines",
    7: "partnerships, spouse, and public dealings",
    8: "transformation, sudden changes, and deep psychological growth",
    9: "dharma, higher learning, and spiritual seeking",
    10: "career trajectory, public status, and major life actions",
    11: "gains, network circles, and realizing ambitions",
    12: "spirituality, letting go, and foreign connections"
  };
  return themes[houseNum] || "overall life experience";
};

