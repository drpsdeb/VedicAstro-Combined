// ============================================================================
// 📕 LAL KITAB ENGINE & KALPURUSH MAPPING
// ============================================================================

/**
 * Converts a standard D1 chart into a Lal Kitab Kalpurush Chart.
 * In Lal Kitab, the 1st House is ALWAYS Aries. Planets are placed in signs
 * matching their D1 House number (e.g., a planet in the 4th house is placed in Cancer).
 */
export const generateKalpurushChart = (placements) => {
  if (!placements) return null;
  
  const kalpurushPlacements = {};
  // 1=Aries, 2=Taurus, 3=Gemini, 4=Cancer, 5=Leo, 6=Virgo, 7=Libra, 8=Scorpio, 9=Sagittarius, 10=Capricorn, 11=Aquarius, 12=Pisces
  
  Object.keys(placements).forEach(planet => {
    const houseNum = placements[planet]; // The house it occupies in D1 (1-12)
    kalpurushPlacements[planet] = houseNum; // In Kalpurush, House Num = Sign Num
  });
  
  return kalpurushPlacements;
};

/**
 * Dictionary of Classical Lal Kitab Remedies based on Planet + House.
 */
export const getLalKitabRemedy = (planet, houseNum) => {
  const remedies = {
    Sun: {
      1: "Nail copper nails to the four corners of your bed to stabilize health.",
      6: "Feed wheat to brown ants or monkeys. Keep Gangajal (holy water) in your home.",
      7: "Bury a square piece of copper in the ground. Avoid starting businesses in your wife's name.",
      8: "Throw a copper coin into a flowing river or burning furnace to ease professional obstacles."
    },
    Moon: {
      6: "Serve milk to your father or elders. Avoid drinking milk at night.",
      8: "Avoid building a house under your own name. Bring water from a cremation ground and keep it safely at home.",
      11: "Donate milk in a Bhairav temple or offer it to a grinding stone."
    },
    Mars: {
      4: "Keep a square piece of silver with you. Offer sweet milk to the roots of a Banyan tree.",
      8: "Wear a silver chain around your neck. Offer tandoori rotis to stray dogs.",
      12: "Eat honey first thing in the morning. Wear a solid silver ring."
    },
    Mercury: {
      3: "Clean your teeth with alum (Fitkari) daily. Donate green items or Moong dal.",
      8: "Bury honey in an earthen pot in an isolated or deserted place.",
      12: "Wear a stainless steel ring. Avoid accepting talismans or amulets from sadhus."
    },
    Jupiter: {
      7: "Do not keep idols of deities in your home. Offer water to a Peepal tree daily.",
      10: "Clean your nose thoroughly before starting any new or important work. Wear a gold chain."
    },
    Venus: {
      6: "Keep a solid silver ball in your pocket or purse. Ensure your spouse dresses neatly.",
      9: "Bury a small piece of silver under a Neem tree. Feed cows regularly."
    },
    Saturn: {
      1: "Pour mustard oil on bare earth or grass. Avoid consuming non-vegetarian food and alcohol.",
      8: "Keep a square piece of silver with you. Do not walk barefoot, especially on wet ground."
    },
    Rahu: {
      1: "Wear a silver chain around your neck. Toss barley or wheat washed in milk into running water.",
      8: "Keep a square piece of silver in your wallet. Toss 8 lead coins into a river."
    },
    Ketu: {
      6: "Wear a gold ring on your left hand. Feed stray dogs regularly to ward off hidden enemies.",
      8: "Donate a black and white blanket at a temple. Keep a dog as a pet."
    }
  };

  if (remedies[planet] && remedies[planet][houseNum]) {
    return remedies[planet][houseNum];
  }
  return `Maintain good moral character, avoid taking items for free, and serve elders to keep the energy of ${planet} positive in the ${houseNum}th house.`;
};

/**
 * Generates the Insights Q&A for the Lal Kitab UI
 */
export const generateLalKitabInsights = (kalpurushPlacements) => {
  if (!kalpurushPlacements) return [];
  
  const insights = [];
  
  // 1. Core Principle Explanation
  insights.push({
    question: "What is the Lal Kitab Kalpurush Chart?",
    answer: "Unlike traditional Vedic astrology which shifts the Ascendant based on your birth time, Lal Kitab freezes the Ascendant as Aries (The Cosmic Man). Your planets are evaluated purely on the house they occupy. This strips away complex astrological math to focus on immediate, karmic realities and physical remedies.",
    icon: 'BookOpen', color: 'text-red-700', bg: 'bg-red-50'
  });

  // 2. Identify 3 Key Upayas (Remedies) based on Malefics or significant placements
  const keyPlanets = ['Saturn', 'Rahu', 'Ketu', 'Mars', 'Sun'];
  const upayas = [];
  
  keyPlanets.forEach(planet => {
    if (kalpurushPlacements[planet]) {
      const house = kalpurushPlacements[planet];
      // Only grab specific documented remedies, avoid the generic fallback if possible to keep it punchy
      const remedy = getLalKitabRemedy(planet, house);
      if (!remedy.includes('Maintain good moral character')) {
        upayas.push(`**${planet} in House ${house}:** ${remedy}`);
      }
    }
  });

  // Add generic ones if we didn't find specific harsh placements
  if (upayas.length === 0) {
      upayas.push(`**Sun in House ${kalpurushPlacements['Sun']}:** ${getLalKitabRemedy('Sun', kalpurushPlacements['Sun'])}`);
      upayas.push(`**Moon in House ${kalpurushPlacements['Moon']}:** ${getLalKitabRemedy('Moon', kalpurushPlacements['Moon'])}`);
  }

  insights.push({
    question: "What are my immediate practical remedies (Upayas) for this year?",
    answer: `Based on your Kalpurush mapping, here are your most critical physical remedies to balance karmic debts:\n\n${upayas.join('\n\n')}`,
    icon: 'Shield', color: 'text-orange-700', bg: 'bg-orange-50'
  });

  // 3. Check for Ancestral Debts (Pitr Rin)
  // Classical Rule: Afflictions to the 9th house (Jupiter's natural house) by Rahu, Ketu, or Mercury indicates Pitr Rin.
  const ninthHousePlanets = Object.keys(kalpurushPlacements).filter(p => kalpurushPlacements[p] === 9);
  const hasPitrRin = ninthHousePlanets.includes('Rahu') || ninthHousePlanets.includes('Ketu') || ninthHousePlanets.includes('Mercury');

  if (hasPitrRin) {
    insights.push({
      question: "Do I have any Ancestral Debts (Pitr Rin), and how do I clear them?",
      answer: `Your Kalpurush chart shows ${ninthHousePlanets.join(', ')} in the 9th House. In Lal Kitab, this combination indicates an Ancestral Debt (Pitr Rin) passed down your family line. To clear this karmic blockage, the classical remedy is to collect an equal amount of money (even a small coin) from all your blood relatives and donate it to a temple or spiritual place on a single day.`,
      icon: 'AlertTriangle', color: 'text-amber-700', bg: 'bg-amber-50'
    });
  }

  // 4. Check for Sleeping Houses (Soya Hua Ghar) - All 12 Houses
  const allHouses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const sleepingHouses = allHouses.filter(h => !Object.values(kalpurushPlacements).includes(h));
  
  if (sleepingHouses.length > 0) {
    insights.push({
      question: "Which areas of my life are 'Sleeping', and how do I wake them up?",
      answer: `Your Kalpurush chart shows that Houses ${sleepingHouses.join(', ')} are currently 'sleeping' (empty). In Lal Kitab, sleeping houses lie dormant. To activate a sleeping house, you generally look to its ruling planet or physically trigger its significations (e.g., to wake up an empty 7th house, you focus on marriage or partnerships; to wake up an empty 9th, you visit a temple).`,
      icon: 'Moon', color: 'text-indigo-700', bg: 'bg-indigo-50'
    });
  }

  // 5. Check for Blind Horoscope (Andha Tewa)
  // Classical Rule: The 10th House contains mutually inimical planets, causing career/status blind spots.
  const tenthHousePlanets = Object.keys(kalpurushPlacements).filter(p => kalpurushPlacements[p] === 10);
  
  // Standard Lal Kitab enemy pairs
  const enemyPairs = [
    ['Sun', 'Saturn'], ['Sun', 'Rahu'], ['Sun', 'Venus'],
    ['Moon', 'Rahu'], ['Moon', 'Ketu'],
    ['Jupiter', 'Venus'], ['Mars', 'Mercury']
  ];
  
  let isBlind = false;
  let conflictingPlanets = [];
  
  enemyPairs.forEach(pair => {
    if (tenthHousePlanets.includes(pair[0]) && tenthHousePlanets.includes(pair[1])) {
      isBlind = true;
      conflictingPlanets = pair;
    }
  });
  
  if (isBlind) {
    insights.push({
      question: "Does my chart have an 'Andha Tewa' (Blind Horoscope) condition?",
      answer: `Your Kalpurush chart shows ${conflictingPlanets.join(' and ')} placed together in the 10th House. In Lal Kitab, when mutually inimical planets occupy the 10th House, it creates an 'Andha Tewa' (Blind Horoscope). This means your professional and public life may suffer from blind spots or sudden fluctuations. The classical remedy is to feed ten blind people and to never make major career or financial decisions without consulting trusted elders.`,
      icon: 'EyeOff', color: 'text-slate-700', bg: 'bg-slate-50'
    });
  }

  // 6. Check for Dharmi Kundali (Righteous/Protected Chart)
  // Classical Rule: Jupiter & Saturn conjunct, Saturn in 11th, or Rahu/Ketu in 4th.
  const isJuSatConjunct = kalpurushPlacements['Jupiter'] && kalpurushPlacements['Saturn'] && (kalpurushPlacements['Jupiter'] === kalpurushPlacements['Saturn']);
  const isSatIn11 = kalpurushPlacements['Saturn'] === 11;
  const isRahuKetuIn4 = kalpurushPlacements['Rahu'] === 4 || kalpurushPlacements['Ketu'] === 4;
  
  if (isJuSatConjunct || isSatIn11 || isRahuKetuIn4) {
    let dharmiReason = [];
    if (isJuSatConjunct) dharmiReason.push("Jupiter and Saturn are conjunct");
    if (isSatIn11) dharmiReason.push("Saturn is in the 11th House");
    if (isRahuKetuIn4) dharmiReason.push("Rahu or Ketu occupies the 4th House");

    insights.push({
      question: "Is my chart a 'Dharmi Kundali' (Protected Horoscope)?",
      answer: `Yes! Your Kalpurush chart is classified as a 'Dharmi Kundali' because ${dharmiReason.join(' and ')}. In Lal Kitab, a Dharmi (righteous) chart acts as a divine shield. It significantly softens the blows of other negative planetary combinations and protects you from ultimate ruin or sudden calamities. To maintain this cosmic protection, you must strictly avoid unethical deeds, deceit, or disrespecting spiritual places.`,
      icon: 'ShieldCheck', color: 'text-teal-700', bg: 'bg-teal-50'
    });
  }

  // 7. Check for Nabalig Kundali (Underaged/Minor Horoscope)
  // Classical Rule: The Kendra houses (1, 4, 7, 10) are completely empty.
  const kendraHouses = [1, 4, 7, 10];
  const isNabalig = !Object.values(kalpurushPlacements).some(house => kendraHouses.includes(house));
  
  if (isNabalig) {
    insights.push({
      question: "Is my chart a 'Nabalig Kundali' (Underaged Horoscope)?",
      answer: "Your Kalpurush chart shows that the core Kendra houses (1, 4, 7, and 10) are completely empty. In Lal Kitab, this creates a 'Nabalig' (Minor/Underaged) Kundali. This indicates that your destiny is highly malleable and heavily influenced by your own current karma and your family's karma rather than predetermined fate. Because the foundation is 'immature', Lal Kitab advises strictly following good moral conduct and avoiding major risky ventures, as your chart relies purely on your actions rather than planetary planetary safety nets.",
      icon: 'UserMinus', color: 'text-blue-700', bg: 'bg-blue-50'
    });
  }

  return insights;
};
