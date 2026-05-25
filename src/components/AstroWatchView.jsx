// ============================================================================
// 🌌 ASTROWATCH HIGH-PRECISION CELESTIAL WATCHFACE & ORRERY (FINAL COMPILATION)
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart2, ShieldAlert, Sparkles, Clock, Compass, Home, X, Loader2 } from 'lucide-react';
import { 
  getD9RasiIndex, getD10RasiIndex, getD6RasiIndex, getD20RasiIndex, calculateShadbala, GRAHAS,
  OfflineEphemeris, AstroEngine, getPositionsForProfile
} from '../utils/ephemerisEngine';
import SearchableDropdown from './SearchableDropdown';

const ASTRO_FAQS = [
  {
    category: "Health & Longevity",
    icon: "🩺",
    subcategories: [
      {
        name: "Longevity & Lifespan",
        questions: [
          "How long will I/the child live?",
          "Will I have an untimely or accidental death?"
        ]
      },
      {
        name: "Chronic Diseases & Health Vulnerabilities",
        questions: [
          "Which planets are causing my health problems?",
          "Am I prone to specific chronic or recurring conditions?",
          "Why do I have a mysterious or undiagnosed illness?"
        ]
      },
      {
        name: "Timing of Illness and Recovery",
        questions: [
          "When will a specific disease flare up?",
          "When will I recover from this health issue?"
        ]
      },
      {
        name: "Preventative Measures & Remedies",
        questions: [
          "What can I do to improve or protect my health?"
        ]
      }
    ]
  },
  {
    category: "Education",
    icon: "🎓",
    subcategories: [
      {
        name: "Academic Success & Challenges",
        questions: [
          "Will I find success in my higher education?",
          "Why is there failure in education or no inclination for study?",
          "Are there indications for a scholarship?",
          "Will I study abroad (Foreign education)?",
          "Which field of education aligns best with my planets?",
          "Will I win any prize or awards in my studies?"
        ]
      }
    ]
  },
  {
    category: "Career & Finances",
    icon: "💼",
    subcategories: [
      {
        name: "Career Path & Choices",
        questions: [
          "What career path aligns with my birth chart?",
          "Should I choose a Job or Business?",
          "Is a business partnership advisable according to my chart?",
          "Will I get a foreign job or a government job?"
        ]
      },
      {
        name: "Timing & Professional Trajectory",
        questions: [
          "When is the right time for a career change?",
          "When will I get a promotion or career advancement?",
          "How can I overcome current workplace obstacles?"
        ]
      },
      {
        name: "Wealth & Financial Prospects",
        questions: [
          "What is my wealth potential in my horoscope?",
          "When will my financial struggles end?",
          "Is this a good time for me to invest?"
        ]
      }
    ]
  },
  {
    category: "Marriage & Love",
    icon: "💍",
    subcategories: [
      {
        name: "Timing and Destiny",
        questions: [
          "When will I get married?",
          "Will my marriage be a love marriage or an arranged marriage?",
          "Will I find my true love?",
          "When will I meet my soulmate or get married early or late?"
        ]
      },
      {
        name: "Compatibility & Dynamics",
        questions: [
          "Are my partner and I compatible?",
          "Will our relationship last?",
          "Do we have good physical and sexual chemistry?",
          "Will it be a love marriage out of cast, creed, and culture?",
          "Will I have platonic love or physical relationship?",
          "Are there indications of a hidden, scandalous, or commercial love affair?",
          "Will there be termination of a love affair or multiple love affairs?",
          "Will I have a love affair with a person older or younger?"
        ]
      },
      {
        name: "Obstacles & Remedies",
        questions: [
          "Why are my relationships never working out?",
          "Will my family oppose my marriage?",
          "What astrological remedies can I perform to reduce conflicts?"
        ]
      }
    ]
  },
  {
    category: "Children",
    icon: "👶",
    subcategories: [
      {
        name: "Conception & Family Planning",
        questions: [
          "Will I have children according to my chart?",
          "When will I conceive?",
          "Are there obstacles to having children?"
        ]
      },
      {
        name: "Parenting & Child Development",
        questions: [
          "What is my child's natural temperament?",
          "Which educational paths suit them best?",
          "How can I improve my relationship with my child?",
          "Will my child be healthy and balanced?"
        ]
      }
    ]
  },
  {
    category: "Life Purpose & Karma",
    icon: "🔮",
    subcategories: [
      {
        name: "Life Purpose & Dharma",
        questions: [
          "What is my soul's true purpose in this lifetime?",
          "What are my natural, hidden gifts and talents?",
          "How can I best serve the world with my unique skills?",
          "What is my path to professional or personal fulfillment?"
        ]
      },
      {
        name: "Past Lives & Karma",
        questions: [
          "What unresolved karma or patterns did I bring from past lives?",
          "What karmic lessons am I supposed to master in this incarnation?",
          "What specific habits or baggage am I meant to leave behind?"
        ]
      },
      {
        name: "Spiritual Growth & Transitions",
        questions: [
          "What is my natural inclination toward spiritual connection?",
          "How can I best connect with the divine or my higher self?",
          "How do I develop my intuition or psychic abilities?",
          "How can I navigate this period of intense personal transformation?",
          "What is the deeper spiritual meaning of my current life crisis?"
        ]
      }
    ]
  }
];

const PLANET_LORE = {
  Sun: 'Soul, authority, vitality, father, confidence, and public power.',
  Moon: 'Mind, emotion, mother, comfort, memory, and daily feeling.',
  Mars: 'Action, courage, heat, competition, siblings, and decisive force.',
  Mercury: 'Speech, intellect, trade, calculation, learning, and analysis.',
  Jupiter: 'Wisdom, teachers, children, dharma, expansion, and protection.',
  Venus: 'Love, art, pleasure, vehicles, comforts, beauty, and relationship.',
  Saturn: 'Karma, discipline, delay, service, endurance, and responsibility.',
  Rahu: 'Worldly desire, ambition, foreignness, disruption, and amplification.',
  Ketu: 'Detachment, moksha, past-life residue, cuts, and spiritual insight.'
};

const HOUSE_LORE = [
  'Self, body, character, health, and life direction.',
  'Wealth, speech, family, food, and early learning.',
  'Effort, courage, siblings, skills, writing, and short journeys.',
  'Home, mother, inner peace, property, roots, and emotional security.',
  'Children, creativity, mantra, intelligence, merit, and romance.',
  'Service, disease, debt, competition, obstacles, and problem solving.',
  'Marriage, partnership, contracts, public dealings, and others.',
  'Longevity, secrets, sudden events, research, inheritance, and transformation.',
  'Fortune, dharma, father, teachers, pilgrimage, and higher wisdom.',
  'Career, status, action in the world, authority, and reputation.',
  'Gains, networks, elder siblings, ambitions, and fulfillment.',
  'Expenses, sleep, isolation, foreign places, loss, and liberation.'
];

const safeStr = (str, delimiter) => {
  if (typeof str !== 'string' || !str) return '';
  return str.split(delimiter)[0] || '';
};

const numOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const makeProfileDate = (dob, timeValue) => {
  const d = new Date(`${dob || '2000-01-01'}T${timeValue || '12:00'}:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

// ==========================================
// CENTRAL ROTATED COORDINATE RINGS
// ==========================================
const InfoTooltip = ({ title, subtitle }) => (
  <div className="absolute bottom-full mb-1 hidden group-hover:block pointer-events-none z-[100] w-max max-w-[150px] bg-slate-900/90 text-white text-[9px] px-2 py-1.5 rounded shadow-xl text-center leading-tight border border-slate-700/50">
    <strong className="text-amber-300">{title}</strong>
    {subtitle ? <><br /><span className="text-slate-200">{subtitle}</span></> : null}
  </div>
);

const BaseRings = ({ lagnaIndex, onSymbolClick }) => {
  const safeLagnaIndex = isNaN(lagnaIndex) ? 0 : lagnaIndex;

  return (
    <div className="absolute inset-0">
      {[...Array(12)].map((_, i) => (
        <div key={`line-${i}`} className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${i * 30}deg)` }}>
          <div className="absolute top-[6%] left-1/2 w-[1px] h-[28%] bg-[#d8d8b6] -translate-x-1/2"></div>
        </div>
      ))}
      {AstroEngine.NAK_SHORTS.map((nakShort, i) => {
        const rot = i * (360 / 27); const tRot = rot + (180 / 27);
        return (
          <React.Fragment key={`nak-${i}`}>
            <div className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${rot}deg)` }}><div className="absolute top-[0%] left-1/2 w-[1px] h-[6%] bg-[#d8d8b6] -translate-x-1/2"></div></div>
            <div className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${tRot}deg)` }}>
              <button
                type="button"
                className="absolute top-[1%] md:top-[1.5%] left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer group"
                style={{ transform: `rotate(-${tRot}deg)` }}
                onClick={() => onSymbolClick?.({ title: AstroEngine.NAKSHATRAS[i], subtitle: 'Nakshatra', text: `Nakshatra ${i + 1} of 27. Used for lunar temperament, dasha seed, and fine timing.`, promptData: { type: 'nakshatra', entity: AstroEngine.NAKSHATRAS[i], index: i } })}
              >
                <span className="text-[6px] md:text-[8px] font-bold text-slate-500 tracking-tighter bg-[#fdfde8] px-0.5 rounded group-hover:text-blue-600 group-hover:scale-150 transition-transform inline-block">{nakShort}</span>
                <InfoTooltip title={AstroEngine.NAKSHATRAS[i]} subtitle="Nakshatra" />
              </button>
            </div>
          </React.Fragment>
        );
      })}
      {[...Array(12)].map((_, i) => (
        <div key={`ring-clk-${i}`} className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${i * 30}deg)` }}>
          <div className="absolute top-[1%] left-1/2 -translate-x-1/2 text-sm md:text-lg font-bold text-slate-800" style={{ transform: `rotate(-${i * 30}deg)` }}>{i === 0 ? 12 : i}</div>
        </div>
      ))}
      {AstroEngine.RASHI_ROMAN.map((roman, i) => {
        const rasiIndex = i;
        const houseNum = ((rasiIndex - safeLagnaIndex + 12) % 12) + 1;
        const rashiName = safeStr(AstroEngine.SIDEREAL_RASIS[i], ' (');
        return (
          <div key={`rom-${i}`} className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${i * 30 + 15}deg)` }}>
            <button
              type="button"
              className="absolute top-[7%] left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer group"
              style={{ transform: `rotate(-${i * 30 + 15}deg)` }}
              onClick={() => onSymbolClick?.({
                title: AstroEngine.SIDEREAL_RASIS[i],
                subtitle: `Rashi ${roman}`,
                text: `${rashiName} sign sector. Clicked from the watchface zodiac ring.`,
                promptData: { type: 'rashi', rashi: rashiName, house: houseNum, rasiIndex }
              })}
            >
              <span className="text-xs font-bold text-slate-700 bg-[#fbfbf0] px-1 rounded group-hover:text-blue-600 group-hover:scale-125 transition-transform inline-block">{roman}</span>
              <InfoTooltip title={rashiName} subtitle={`Rashi ${roman}`} />
            </button>
          </div>
        );
      })}
      {[...Array(12)].map((_, rasiIndex) => {
        const houseNum = ((rasiIndex - safeLagnaIndex + 12) % 12) + 1;
        return (
          <div key={`hou-${rasiIndex}`} className="absolute inset-0 pointer-events-none" style={{ transform: `rotate(${rasiIndex * 30 + 15}deg)` }}>
            <button
              type="button"
              className="absolute top-[13.5%] left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer group"
              style={{ transform: `rotate(-${rasiIndex * 30 + 15}deg)` }}
              onClick={() => onSymbolClick?.({ title: houseNum === 1 ? 'Lagna / House 1' : `House ${houseNum}`, subtitle: safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' ('), text: HOUSE_LORE[houseNum - 1], promptData: { type: 'house', house: houseNum, rashi: safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' ('), rasiIndex } })}
            >
              <span className={`text-[10px] font-bold flex items-center group-hover:text-blue-600 group-hover:scale-125 transition-transform ${houseNum === 1 ? 'text-purple-700 font-extrabold scale-110' : 'text-purple-900/60'}`}><Home size={10} className="inline mr-0.5" />{houseNum}</span>
              <InfoTooltip title={`House ${houseNum}`} subtitle={safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' (')} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const NorthIndianChart = ({ planets, lagnaIndex, chartTitle, onSymbolClick }) => {
  const houses = [
    { h: 1, x: 50, y: 25 }, { h: 2, x: 25, y: 12.5 }, { h: 3, x: 12.5, y: 25 }, { h: 4, x: 25, y: 50 },
    { h: 5, x: 12.5, y: 75 }, { h: 6, x: 25, y: 87.5 }, { h: 7, x: 50, y: 75 }, { h: 8, x: 75, y: 87.5 },
    { h: 9, x: 87.5, y: 75 }, { h: 10, x: 75, y: 50 }, { h: 11, x: 87.5, y: 25 }, { h: 12, x: 75, y: 12.5 }
  ];

  return (
    <div className="w-[300px] h-[300px] xl:w-[350px] xl:h-[350px] border-2 border-amber-800 bg-white shadow-lg relative rounded-xl overflow-hidden shrink-0">
       <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none stroke-amber-800/20" style={{ strokeWidth: 1.5 }}>
          <line x1="0" y1="0" x2="100%" y2="100%" /><line x1="100%" y1="0" x2="0" y2="100%" />
          <line x1="50%" y1="0" x2="100%" y2="50%" /><line x1="100%" y1="50%" x2="50%" y2="100%" />
          <line x1="50%" y1="100%" x2="0" y2="50%" /><line x1="0" y1="50%" x2="50%" y2="0" />
       </svg>
       <div className="absolute top-1 left-1/2 -translate-x-1/2 text-amber-800/30 text-[9px] uppercase font-bold tracking-widest pointer-events-none">{chartTitle}</div>
       {houses.map(house => {
          const rasiIndex = ((lagnaIndex || 0) + house.h - 1) % 12;
          const rashiName = safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' (');
          return (
             <button
               key={house.h}
               type="button"
               onClick={() => onSymbolClick?.({ title: `House ${house.h}`, subtitle: rashiName, text: `${HOUSE_LORE[house.h - 1]} This house carries the sign ${rashiName}.`, promptData: { type: 'house', house: house.h, rashi: rashiName, rasiIndex } })}
               className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] cursor-pointer"
               style={{ left: `${house.x}%`, top: `${house.y}%` }}
             >
                <div className={`absolute top-0 text-[9px] font-bold ${house.h === 1 ? 'text-red-600' : 'text-amber-800/40'}`}>{rasiIndex + 1}</div>
                {house.h === 1 && <div className="absolute -top-3.5 text-[8px] text-red-600 font-bold uppercase pointer-events-none">Asc</div>}
                <div className="flex flex-wrap content-center justify-center gap-1 pt-2 z-10">
                    {planets.filter(p => p.rasiIndex === rasiIndex).map(p => (
                        <button
                          key={p.planet}
                          type="button"
                          onClick={e => { e.stopPropagation(); onSymbolClick?.(planetInfo(p, 'Natal', lagnaIndex)); }}
                          className={`font-bold text-[11px] ${AstroEngine.PLANET_TEXT_COLORS[p.planet]} hover:scale-110 transition-transform`}
                        >{AstroEngine.PLANET_SHORTS[p.planet]}</button>
                    ))}
                </div>
             </button>
          )
       })}
    </div>
  );
};

const planetInfo = (p, kind, lagnaIndex) => {
  const rasiIndex = isNaN(p?.rasiIndex) ? 0 : p.rasiIndex;
  const houseNum = ((rasiIndex - (isNaN(lagnaIndex) ? 0 : lagnaIndex) + 12) % 12) + 1;
  const rashiName = safeStr(AstroEngine.SIDEREAL_RASIS[rasiIndex], ' (');
  const nakExact = (((p?.fullDegree || 0) % 360 + 360) % 360) / (40 / 3);
  const nakIndex = Math.floor(nakExact) % 27;
  const pada = Math.floor((nakExact - Math.floor(nakExact)) * 4) + 1;
  return {
    title: `${p.planet}${p.isRetro && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? ' (Retro)' : ''} in ${rashiName}`,
    subtitle: `${kind} • House ${houseNum} • ${AstroEngine.NAKSHATRAS[nakIndex]} P${pada}`,
    text: `${PLANET_LORE[p.planet] || 'Planetary significations.'}\n\nLongitude: ${(p.fullDegree || 0).toFixed(2)} degrees.`,
    promptData: {
      type: 'planet',
      chart: kind.toLowerCase(),
      planet: p.planet,
      rashi: rashiName,
      house: houseNum,
      nakshatra: AstroEngine.NAKSHATRAS[nakIndex],
      pada,
      isRetro: p.isRetro,
      fullDegree: p.fullDegree
    }
  };
};

const CosmicOrrery = ({ transits, lagnaIndex, onSymbolClick }) => {
  const lengths = { Sun: '35%', Moon: '44%', Mars: '32%', Mercury: '41%', Jupiter: '29%', Venus: '38%', Saturn: '23%', Rahu: '26%', Ketu: '26%' };
  const colors = { Sun: 'bg-red-400', Moon: 'bg-slate-300', Mars: 'bg-red-700', Mercury: 'bg-green-500', Jupiter: 'bg-orange-400', Venus: 'bg-fuchsia-400', Saturn: 'bg-blue-500', Rahu: 'bg-gray-500', Ketu: 'bg-amber-700' };

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[550px] lg:h-[550px] rounded-full bg-[#fdfde8] shadow-xl flex items-center justify-center shrink-0 select-none animate-in fade-in duration-300">
      <div className="absolute inset-0 rounded-full border-[3px] border-[#d8d8b6] bg-white"></div>
      <div className="absolute inset-[6%] rounded-full border border-[#d8d8b6] bg-[#fbfbf0]"></div>
      <div className="absolute inset-[12%] rounded-full border border-[#d8d8b6] bg-[#fdfde8]"></div>
      <BaseRings lagnaIndex={lagnaIndex} onSymbolClick={onSymbolClick} />
      
      {/* 🚀 FIXED HIGH-PRECISION ORRERY INDICATOR HANDS */}
      {transits?.map(p => {
           const rot = p.fullDegree;
           return (
             <div key={`orrery-${p.planet}`} className="absolute w-[2px] z-30 origin-bottom flex flex-col items-center justify-start pointer-events-none" style={{ height: lengths[p.planet] || '30%', bottom: '50%', left: 'calc(50% - 1px)', transform: `rotate(${rot}deg)` }}>
                <button type="button" onClick={() => onSymbolClick?.(planetInfo(p, 'Transit', lagnaIndex))} className={`relative pointer-events-auto cursor-pointer group flex items-center justify-center w-5 h-5 bg-white rounded-full border border-slate-300 shadow-md z-40 hover:scale-125 transition-transform ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`} style={{ transform: `rotate(-${rot}deg)` }}>
                   <span className="font-bold text-[10px] pb-[1px]">{AstroEngine.PLANET_SYMBOLS[p.planet]}</span>
                   <InfoTooltip title={p.planet} subtitle={`${(p.fullDegree || 0).toFixed(1)} deg`} />
                </button>
                <div className={`w-[2px] h-full ${colors[p.planet]} opacity-70`}></div>
             </div>
           );
      })}
      <div className="absolute w-8 h-8 bg-blue-100 rounded-full border-[3px] border-blue-400 shadow flex items-center justify-center z-50 text-md">🌍</div>
    </div>
  );
};

const WatchFace = ({ time, transits, natalPlanets, lagnaIndex, sunTimes, onSymbolClick }) => {
  const timeDeg = { s: (time.getSeconds() / 60) * 360, m: ((time.getMinutes() + time.getSeconds() / 60) / 60) * 360, h: ((time.getHours() % 12 + time.getMinutes() / 60) / 12) * 360 };
  const currentSunDeg = ((time.getHours() + time.getMinutes() / 60 + 12) % 24) * 15;
  const sunsetDeg = sunTimes ? ((sunTimes.sunset.frac + 12) % 24) * 15 : 270;
  const sunriseDeg = sunTimes ? ((sunTimes.sunrise.frac + 12) % 24) * 15 : 90;
  const sunTransit = transits?.find(p => p.planet === 'Sun');
  const moonTransit = transits?.find(p => p.planet === 'Moon');
  const lunarElongation = sunTransit && moonTransit ? ((moonTransit.fullDegree - sunTransit.fullDegree + 360) % 360) : 0;
  const tithiNum = Math.floor(lunarElongation / 12) + 1;
  const tithiNames = "Pratipada,Dwitiya,Tritiya,Chaturthi,Panchami,Shashthi,Saptami,Ashtami,Navami,Dashami,Ekadashi,Dwadashi,Trayodashi,Chaturdashi,Purnima,Pratipada,Dwitiya,Tritiya,Chaturthi,Panchami,Shashthi,Saptami,Ashtami,Navami,Dashami,Ekadashi,Dwadashi,Trayodashi,Chaturdashi,Amavasya".split(',');
  const tithiInfo = sunTransit && moonTransit
    ? `${tithiNames[(tithiNum || 1) - 1] || 'Unknown'} • ${tithiNum <= 15 ? 'Shukla Paksha' : 'Krishna Paksha'}`
    : 'Calculating...';
  const moonDialDeg = sunTransit && moonTransit
    ? (currentSunDeg - lunarElongation + 360) % 360
    : currentSunDeg;

  const renderPlanets = (planets, baseTopPercent, isTransit) => {
    if (!planets || !Array.isArray(planets)) return null;
    const grouped = {};
    planets.forEach(p => {
      if (!p) return;
      const idx = isNaN(p.rasiIndex) ? 0 : p.rasiIndex;
      grouped[idx] = grouped[idx] || [];
      grouped[idx].push(p);
    });

    return Object.keys(grouped).map(rasiIndexStr => {
      const rasiIndex = parseInt(rasiIndexStr, 10);
      const group = grouped[rasiIndexStr];
      const centerAngle = rasiIndex * 30 + 15;

      return group.map((p, idx) => {
        const angleOffset = (idx - (group.length - 1) / 2) * 5.5;
        const angle = centerAngle + angleOffset;
        return (
          <div key={`${p.planet}-${isTransit ? 'tr' : 'nt'}`} className="absolute inset-0 pointer-events-none z-20" style={{ transform: `rotate(${angle}deg)` }}>
            <button
              type="button"
              className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer group font-serif font-bold text-[10px] md:text-[14px] drop-shadow-sm hover:scale-150 transition-transform ${AstroEngine.PLANET_TEXT_COLORS[p.planet]}`}
              style={{ top: `${baseTopPercent}%`, transform: `rotate(-${angle}deg)` }}
              onClick={() => onSymbolClick?.(planetInfo(p, isTransit ? 'Transit' : 'Natal', lagnaIndex))}
            >
              <span>{AstroEngine.PLANET_SYMBOLS[p.planet]}</span>
              {isTransit && <span className="text-[6px] align-super text-amber-600 font-sans font-black">t</span>}
              <InfoTooltip title={`${p.planet}${isTransit ? ' Transit' : ' Natal'}`} subtitle={`${(p.fullDegree || 0).toFixed(1)} deg`} />
            </button>
          </div>
        );
      });
    });
  };

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[550px] lg:h-[550px] rounded-full bg-[#fdfde8] shadow-2xl flex items-center justify-center font-serif shrink-0 select-none animate-in fade-in duration-300">
      <div className="absolute inset-0 rounded-full border-[3px] border-[#d8d8b6] bg-white"></div>
      <div className="absolute inset-[6%] rounded-full border border-[#d8d8b6] bg-[#fbfbf0]"></div>
      <div className="absolute inset-[12%] rounded-full border border-[#d8d8b6] bg-[#fdfde8]"></div>
      <div className="absolute inset-[18%] rounded-full border border-[#d8d8b6] bg-[#fbfbf0]"></div>
      <div className="absolute inset-[26%] rounded-full border border-[#d8d8b6] bg-[#fdfde8]"></div>
      
      <div className="absolute inset-[34%] rounded-full border border-[#d8d8b6] shadow-inner overflow-hidden" style={{ background: `conic-gradient(from 0deg, #bae6fd 0deg, #bae6fd ${sunsetDeg}deg, #1e293b ${sunsetDeg}deg, #1e293b ${sunriseDeg}deg, #bae6fd ${sunriseDeg}deg)` }}><div className="absolute inset-[25%] rounded-full bg-[#fdfde8] border border-slate-300"></div></div>
      
      <div className="absolute w-[2px] z-30 origin-bottom flex flex-col items-center justify-start pointer-events-none" style={{ height: '34%', bottom: '50%', left: 'calc(50% - 1px)', transform: `rotate(${currentSunDeg}deg)` }}>
         <button type="button" onClick={() => onSymbolClick?.({ title: '24-Hour Sunclock', subtitle: 'Diurnal Indicator', text: 'This hand completes one revolution every 24 hours. The light band shows daytime and the dark band shows nighttime.' })} style={{ transform: `rotate(-${currentSunDeg}deg)` }} className="pointer-events-auto cursor-pointer group bg-amber-400 rounded-full border border-amber-600 text-[10px] w-4 h-4 flex items-center justify-center mt-1 font-sans shadow hover:scale-125 transition-transform">☀️<InfoTooltip title="Sunclock" subtitle="24-hour hand" /></button>
         <div className="w-[1.5px] h-full bg-amber-400/80"></div>
      </div>

      <div className="absolute w-[2px] z-20 origin-bottom flex flex-col items-center justify-start pointer-events-none" style={{ height: '28%', bottom: '50%', left: 'calc(50% - 1px)', transform: `rotate(${moonDialDeg}deg)` }}>
         <button type="button" onClick={() => onSymbolClick?.({ title: 'Lunar Position & Tithi', subtitle: tithiInfo, text: `The Moon hand is derived from the angular separation between the transit Moon and transit Sun.\n\nCurrent tithi: ${tithiInfo}\nSun-Moon distance: ${lunarElongation.toFixed(2)} degrees.` })} style={{ transform: `rotate(-${moonDialDeg}deg)` }} className="pointer-events-auto cursor-pointer group bg-slate-100 rounded-full border border-slate-400 text-[10px] w-4 h-4 flex items-center justify-center mt-1 font-sans shadow hover:scale-125 transition-transform">🌙<InfoTooltip title="Moon hand" subtitle={tithiInfo} /></button>
         <div className="w-[1.5px] h-full bg-slate-300/80"></div>
      </div>

      <BaseRings lagnaIndex={lagnaIndex} onSymbolClick={onSymbolClick} />
      {renderPlanets(transits, 20.5, true)}
      {renderPlanets(natalPlanets, 28.5, false)}
      <div className="absolute w-3 h-3 bg-slate-800 rounded-full z-40"></div>
      <div className="absolute w-1.5 bg-slate-800 rounded-full z-30 origin-bottom" style={{ height: '35%', bottom: '50%', left: 'calc(50% - 3px)', transform: `rotate(${timeDeg.h}deg)` }}></div>
      <div className="absolute w-1 bg-slate-600 rounded-full z-30 origin-bottom" style={{ height: '45%', bottom: '50%', left: 'calc(50% - 2px)', transform: `rotate(${timeDeg.m}deg)` }}></div>
      <div className="absolute w-0.5 bg-red-600 rounded-full z-30 origin-bottom" style={{ height: '50%', bottom: '50%', left: 'calc(50% - 1px)', transform: `rotate(${timeDeg.s}deg)` }}></div>
    </div>
  );
};

export default function AstroWatchView({ savedProfiles, onBack, currentProfileName, onSelectProfile, geminiKey, astroLevel = 'beginner', language = 'English' }) {
  const sortedProfiles = useMemo(() => {
    if (!savedProfiles) return [];
    return [...savedProfiles]
      .filter(p => p && p.name)
      .sort((a, b) => {
        const nameA = String(a.name).trim().toLowerCase();
        const nameB = String(b.name).trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [savedProfiles]);

  const [selectedProfile, setSelectedProfile] = useState(currentProfileName || sortedProfiles[0]?.name || '');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return sortedProfiles;
    return sortedProfiles.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedProfiles, searchQuery]);

  const [expandedFolders, setExpandedFolders] = useState({
    Family: true,
    Friend: true,
    Patient: true,
    Facebook: true,
    Client: true,
    Other: true
  });

  const toggleFolder = (key) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedCategories = useMemo(() => {
    const matchedSet = new Set(filteredProfiles.map(o => o.id));
    const categoriesList = ["Family", "Friend", "Patient", "Facebook", "Client", "Other"];
    
    const catMap = {};
    categoriesList.forEach(c => { catMap[c] = []; });
    
    sortedProfiles.forEach(opt => {
      const cat = opt.category || "Family";
      if (!catMap[cat]) {
        catMap[cat] = [];
      }
      catMap[cat].push(opt);
    });

    const result = [];

    categoriesList.forEach(catName => {
      const items = catMap[catName];
      if (!items || items.length === 0) return;

      const headsInCat = items.filter(opt => !opt.familyHeadId || opt.familyHeadId === opt.id);
      const membersInCat = items.filter(opt => opt.familyHeadId && opt.familyHeadId !== opt.id);
      
      const referencedHeadIds = new Set(membersInCat.map(m => m.familyHeadId));
      const allHeadsMap = new Map();
      headsInCat.forEach(h => allHeadsMap.set(h.id, h));
      
      referencedHeadIds.forEach(headId => {
        if (!allHeadsMap.has(headId)) {
          const globalHead = sortedProfiles.find(o => o.id === headId);
          if (globalHead) {
            allHeadsMap.set(headId, globalHead);
          }
        }
      });
      
      const groups = [];
      const groupedItemIds = new Set();
      
      allHeadsMap.forEach((head, headId) => {
        const groupMembers = membersInCat.filter(m => m.familyHeadId === headId);
        if (groupMembers.length > 0) {
          const headMatches = items.some(opt => opt.id === headId) && matchedSet.has(headId);
          const matchedMembers = groupMembers.filter(m => matchedSet.has(m.id));
          
          if (headMatches || matchedMembers.length > 0) {
            groups.push({
              head,
              showHead: headMatches,
              members: matchedMembers
            });
            if (headMatches) groupedItemIds.add(headId);
            matchedMembers.forEach(m => groupedItemIds.add(m.id));
          }
        }
      });
      
      const standaloneItems = items.filter(opt => matchedSet.has(opt.id) && !groupedItemIds.has(opt.id));

      if (groups.length > 0 || standaloneItems.length > 0) {
        result.push({
          categoryName: catName,
          groups,
          standaloneItems
        });
      }
    });

    return result;
  }, [sortedProfiles, filteredProfiles]);


  const [viewMode, setViewMode] = useState('chart'); 
  const [subChart, setSubChart] = useState('d9');
  const [panchangView, setPanchangView] = useState('transit');
  const [isManualMode, setIsManualMode] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'AstroWatch AI is ready. Click any planet, house, nakshatra or Shadbala score, then ask a specific question to dig into the profile.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedContext, setSelectedContext] = useState(null);
  const [time, setTime] = useState(new Date());
  const [faqOpen, setFaqOpen] = useState(false);
  const [expandedFaqCat, setExpandedFaqCat] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const addChatMessage = (message) => setChatMessages(prev => [...prev, message]);

  const generateAiAnswer = (context, question) => {
    const c = context || {};
    const promptData = c.promptData || {};
    const baseTitle = c.title || 'Selected astrological factor';
    const baseSubtitle = c.subtitle ? ` ${c.subtitle}` : '';
    const baseText = c.text ? `${c.text}` : 'This item is part of the current birth and transit map.';
    const userQuestion = question ? ` You asked: "${question}"` : '';
    const type = promptData.type || 'general';

    const makePlanetAnswer = () => {
      const retro = promptData.isRetro ? ' It is retrograde, which adds an internalized and deliberate quality.' : '';
      const degree = promptData.fullDegree != null && !Number.isNaN(Number(promptData.fullDegree)) ? ` It is currently at ${Number(promptData.fullDegree).toFixed(1)}° in ${promptData.rashi}.` : '';
      return `This is the ${promptData.chart} planet ${promptData.planet} in ${promptData.rashi} of House ${promptData.house}.${retro}${degree} ${baseText}${userQuestion}`;
    };

    const makeHouseAnswer = () => {
      return `The ${promptData.house} House is ruled by ${promptData.rashi} and governs the matters listed. ${baseText}${userQuestion}`;
    };

    const makeRashiAnswer = () => {
      return `The sign ${promptData.rashi} is entered on House ${promptData.house}. ${baseText}${userQuestion}`;
    };

    const makeNakshatraAnswer = () => {
      return `The Nakshatra ${promptData.entity} vibrates with its own lunar energy and emotional tone. ${baseText}${userQuestion}`;
    };

    const makeShadbalaAnswer = () => {
      const score = promptData.score;
      const level = score > 120 ? 'strong' : score < 80 ? 'weak' : 'balanced';
      return `The Shadbala score is ${score}%, which is ${level} strength. ${baseText}${userQuestion}`;
    };

    let answer;
    switch (type) {
      case 'planet': answer = makePlanetAnswer(); break;
      case 'house': answer = makeHouseAnswer(); break;
      case 'rashi': answer = makeRashiAnswer(); break;
      case 'nakshatra': answer = makeNakshatraAnswer(); break;
      case 'shadbala': answer = makeShadbalaAnswer(); break;
      default: answer = `This AstroWatch element is ${baseTitle}.${baseSubtitle} ${baseText}${userQuestion}`;
    }

    return answer;
  };

  const handleWatchClick = (clickData) => {
    setPopupInfo(clickData);
    setSelectedContext(clickData);
    const userText = `Review ${clickData.title}.`;
    const aiText = generateAiAnswer(clickData, 'Give me a contextual interpretation based on this active profile.');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }, { role: 'assistant', text: aiText }]);
  };

  const handleChatSubmit = async (event) => {
    if (event) event.preventDefault();
    const question = chatInput.trim();
    if (!question) return;

    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatLoading(true);

    if (geminiKey && geminiKey.trim().length >= 10) {
      const lagnaName = safeStr(AstroEngine.SIDEREAL_RASIS[isNaN(lagnaIndex) ? 0 : lagnaIndex], ' ');
      const natalStr = natalPlanets.map(p => `${p.planet}${p.isRetro ? '(R)' : ''} in ${safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], ' ')}`).join(', ');
      const transitStr = transits.map(p => `${p.planet}${p.isRetro ? '(R)' : ''} in ${safeStr(AstroEngine.SIDEREAL_RASIS[p.rasiIndex], '')}`).join(', ');

      let contextStr = "";
      if (selectedContext) {
        contextStr = `Active Selected Context: Title: ${selectedContext.title}. Subtitle: ${selectedContext.subtitle || ''}. Details/Lore: ${selectedContext.text || ''}.`;
      }

      let savContext = "";
      if (ashtakavargaData && ashtakavargaData.sav) {
        savContext = ` SAV Scores (Houses 1-12 starting from Ascendant): ${ashtakavargaData.sav.join(', ')}.`;
      }

      const prompt = `Client Name: ${profile?.name || 'User'}. Ascendant: ${lagnaName}. Natal: ${natalStr}. Transit: ${transitStr}.${savContext} ${contextStr} Question: ${question}. Act as AstroWatch AI, an advanced real-time Vedic astrology assistant. Keep the response to 3-4 concise, highly insightful sentences answering the user's question directly.`;

      try {
        const response = await AstroEngine.callGemini(prompt, geminiKey, astroLevel, language);
        const answer = response.error ? `Error consulting stars: ${response.error}` : (response.text || 'No response from AI.');
        setChatMessages(prev => [...prev, { role: 'assistant', text: answer }]);
      } catch (err) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: `Failed to connect: ${err.message}` }]);
      } finally {
        setChatLoading(false);
      }
    } else {
      setTimeout(() => {
        const aiText = generateAiAnswer(selectedContext, question);
        const notice = `\n\n⚠️ Note: To get live Gemini AI answers, please configure your Gemini API Key in the settings on the main page. Currently displaying simulated interpretation.`;
        setChatMessages(prev => [...prev, { role: 'assistant', text: aiText + notice }]);
        setChatLoading(false);
      }, 600);
    }
  };

  const profile = useMemo(() => {
    return savedProfiles.find(p => p.name === selectedProfile) || savedProfiles[0];
  }, [selectedProfile, savedProfiles]);

  const coreAstro = useMemo(() => {
    return getPositionsForProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (isManualMode) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isManualMode]);

  const natalPlanets = useMemo(() => {
    if (!coreAstro) return [];
    return coreAstro.planets.map(p => ({ planet: p.planet, fullDegree: p.fullDegree, rasiIndex: p.rasiIndex, isRetro: p.isRetro }));
  }, [coreAstro]);

  const lagnaIndex = coreAstro ? coreAstro.lagnaIndex : 0;
  const lagnaDegree = coreAstro ? coreAstro.lagnaDegree : 0;
  const functionalNature = AstroEngine.FUNCTIONAL_ROLES[lagnaIndex] || AstroEngine.FUNCTIONAL_ROLES[0];

  const transits = useMemo(() => {
    if (!profile) return [];
    const lat = profile.sameAsBirth !== false ? numOr(profile.lat, 17.3850) : numOr(profile.currentLat, numOr(profile.lat, 17.3850));
    const lon = profile.sameAsBirth !== false ? numOr(profile.lon, 78.4867) : numOr(profile.currentLon, numOr(profile.lon, 78.4867));
    return OfflineEphemeris.getPositions(time, lat, lon).planets;
  }, [profile, time]);

  const shadbalaScores = useMemo(() => {
    if (!coreAstro || !profile) return null;
    const tz = Number(profile.tzone ?? profile.tz ?? 5.5);
    const lat = Number(profile.lat ?? 17.3850);
    const lon = Number(profile.lon ?? 78.4867);
    const [y, m, d] = String(profile.dob).split('-').map(Number);
    const [hr, min] = String(profile.time || '12:00').split(':').map(Number);
    if (![y, m, d, hr, min, tz, lat, lon].every(Number.isFinite)) return null;
    const bDate = new Date(Date.UTC(y, m - 1, d, hr, min) - (tz * 3600000));
    const sTimesNatal = OfflineEphemeris.getSunTimes(bDate, lat, lon, tz);
    return calculateShadbala(coreAstro.planets, coreAstro.lagnaDegree, bDate, sTimesNatal);
  }, [coreAstro, profile]);

  const d9Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: getD9RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d10Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: getD10RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d6Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: getD6RasiIndex(p.fullDegree) })), [natalPlanets]);
  const d20Planets = useMemo(() => natalPlanets.map(p => ({ ...p, rasiIndex: getD20RasiIndex(p.fullDegree) })), [natalPlanets]);

  const sunTimes = useMemo(() => {
    const lat = profile?.sameAsBirth !== false ? numOr(profile?.lat, 17.3850) : numOr(profile?.currentLat, numOr(profile?.lat, 17.3850));
    const lon = profile?.sameAsBirth !== false ? numOr(profile?.lon, 78.4867) : numOr(profile?.currentLon, numOr(profile?.lon, 78.4867));
    const tzone = profile?.sameAsBirth !== false ? numOr(profile?.tzone, 5.5) : numOr(profile?.currentTzone, numOr(profile?.tzone, 5.5));
    return AstroEngine.getSunTimes(time, lat, lon, tzone);
  }, [profile, time]);
  const currentPanchang = AstroEngine.getPanchang(transits.find(p => p.planet === 'Sun')?.fullDegree || 60, transits.find(p => p.planet === 'Moon')?.fullDegree || 150, time);
  const natalPanchang = coreAstro ? AstroEngine.getPanchang(coreAstro.planets.find(p=>p.planet==='Sun')?.fullDegree || 0, coreAstro.planets.find(p=>p.planet==='Moon')?.fullDegree || 0, makeProfileDate(profile?.dob, '12:00')) : currentPanchang;

  return (
    <div className="min-h-screen bg-[#ececd6] text-slate-800 font-sans antialiased flex flex-col">
      <div className="h-12 bg-white/80 border-b border-slate-200 shadow-sm flex items-center justify-between px-4 shrink-0">
        <button onClick={(e) => { e.preventDefault(); if (onBack) onBack(); }} className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 uppercase tracking-tighter">← Back to Hub</button>
        <div className="font-serif text-sm font-bold text-amber-900 hidden sm:block">AstroWatch Analytical Studio</div>
        <div className="text-right text-[10px] sm:text-xs truncate max-w-[260px] text-emerald-900 font-bold font-serif">
          {profile ? `${profile.dob} ${profile.time || ''} | Birth: ${profile.city || profile.place || ''}` : 'No Active Profile'}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
        <aside className="w-full lg:w-[250px] shrink-0 bg-white/85 border border-slate-200 rounded-lg shadow-sm p-3 flex flex-col gap-2 max-h-[220px] lg:max-h-[calc(100vh-80px)]">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="🔍 Search profiles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-800"
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-blue-500 shrink-0" />
            <SearchableDropdown
              options={sortedProfiles}
              value={sortedProfiles.find(p => p.name === selectedProfile)?.id}
              onChange={id => {
                const found = sortedProfiles.find(p => p.id === id);
                if (found) {
                  setSelectedProfile(found.name);
                  if (onSelectProfile) onSelectProfile(found);
                }
              }}
              placeholder="Select Profile"
              className="flex-1 min-w-0"
              buttonClassName="w-full bg-emerald-50 border border-emerald-200 text-emerald-955 text-xs font-bold font-serif"
              groupByCategory={true}
            />
            <Compass size={14} className="text-emerald-700 shrink-0" />
          </div>
          <div className="text-[10px] text-slate-500 px-1">Select Profile</div>
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-slate-100 pt-1 space-y-2">
            {filteredProfiles.length > 0 ? (
              groupedCategories.map((catGroup) => {
                const isCatExpanded = expandedFolders[catGroup.categoryName] !== false;
                return (
                  <div key={catGroup.categoryName} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleFolder(catGroup.categoryName)}
                      className="w-full px-2 py-1 text-[10px] uppercase font-extrabold tracking-wider bg-emerald-50 hover:bg-emerald-100 rounded flex items-center justify-between text-left font-serif text-emerald-950 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <span>{isCatExpanded ? '📂' : '📁'}</span>
                        {catGroup.categoryName}
                      </span>
                      <span className="text-[8px] opacity-60">{isCatExpanded ? '▼' : '▶'}</span>
                    </button>
                    
                    {isCatExpanded && (
                      <div className="pl-1.5 space-y-1.5 border-l border-emerald-800/10 ml-1">
                        {catGroup.groups.map((fam) => {
                          const famKey = `family_${fam.head.id}`;
                          const isFamExpanded = expandedFolders[famKey] !== false;
                          return (
                            <div key={fam.head.id} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => toggleFolder(famKey)}
                                className="w-full px-1.5 py-0.5 text-[9px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50/50 hover:bg-amber-50 rounded flex items-center justify-between text-left transition-colors"
                              >
                                <span className="flex items-center gap-1">
                                  <span>👨‍👩‍👧‍👦</span>
                                  {fam.head.name}'s Group
                                </span>
                                <span className="text-[7px] opacity-60">{isFamExpanded ? '▼' : '▶'}</span>
                              </button>
                              
                              {isFamExpanded && (
                                <div className="pl-2 border-l border-amber-800/10 ml-1 space-y-0.5">
                                  {fam.showHead && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedProfile(fam.head.name);
                                        if (onSelectProfile) onSelectProfile(fam.head);
                                      }}
                                      className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                        fam.head.name === selectedProfile ? 'bg-slate-600 text-white font-bold' : 'text-emerald-950 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {fam.head.name} (Self)
                                    </button>
                                  )}
                                  {fam.members.map((m) => {
                                    const isActive = m.name === selectedProfile;
                                    return (
                                      <button
                                        type="button"
                                        key={m.id}
                                        onClick={() => {
                                          setSelectedProfile(m.name);
                                          if (onSelectProfile) onSelectProfile(m);
                                        }}
                                        className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                          isActive ? 'bg-slate-600 text-white font-bold' : 'text-slate-600 hover:bg-emerald-50'
                                        }`}
                                      >
                                        ├─ {m.name} {m.relationship ? `(${m.relationship})` : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {catGroup.standaloneItems.map((p) => {
                          const isActive = p.name === selectedProfile;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProfile(p.name);
                                if (onSelectProfile) onSelectProfile(p);
                              }}
                              className={`w-full text-left px-2 py-1 text-xs font-serif truncate block ${
                                isActive ? 'bg-slate-600 text-white font-bold' : 'text-emerald-950 hover:bg-emerald-50'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-[10px] text-slate-400 py-3 font-serif">No profiles found</div>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col items-center justify-start relative overflow-hidden">
          <div className="mb-3 flex flex-col items-center gap-3">
            <div className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-mono font-bold flex items-center gap-2 shadow">
              <Clock size={12} className="text-amber-400"/>
              <span>{time.toLocaleDateString('en-GB')}</span> <span className="text-amber-300">{time.toLocaleTimeString()}</span>
            </div>

            <div className="flex bg-slate-800 rounded-full p-1 text-[11px] font-black shadow-lg">
              <button onClick={() => setViewMode('chart')} className={`px-4 py-1.5 rounded-full ${viewMode==='chart'?'bg-amber-600 text-white shadow':'text-white'}`}>Transit Watch</button>
              <button onClick={() => setViewMode('orrery')} className={`px-4 py-1.5 rounded-full ${viewMode==='orrery'?'bg-cyan-600 text-white shadow':'text-white'}`}>Cosmic Orrery</button>
              <button onClick={() => setViewMode('vargas')} className={`px-4 py-1.5 rounded-full ${viewMode==='vargas'?'bg-purple-600 text-white shadow':'text-white'}`}>Vargas Grid</button>
            </div>
          </div>

          <div className="flex items-start justify-center flex-1 w-full min-h-0 overflow-auto pb-4">
          {viewMode === 'chart' && <WatchFace time={time} transits={transits} natalPlanets={natalPlanets} lagnaIndex={lagnaIndex} sunTimes={sunTimes} onSymbolClick={handleWatchClick} />}
          {viewMode === 'orrery' && <CosmicOrrery transits={transits} lagnaIndex={lagnaIndex} onSymbolClick={handleWatchClick} />}
          {viewMode === 'vargas' && (
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-center">
              <NorthIndianChart planets={natalPlanets} lagnaIndex={lagnaIndex} chartTitle="Rasi Kundali (D1)" onSymbolClick={handleWatchClick} />
              <div className="flex flex-col items-center gap-2">
                <div className="flex bg-slate-200 rounded-full p-0.5 text-[9px] font-bold">
                  {['d9','d10','d6','d20'].map(d => <button key={d} onClick={()=>setSubChart(d)} className={`px-2 py-1 rounded-full uppercase ${subChart===d?'bg-purple-600 text-white':''}`}>{d}</button>)}
                </div>
                {subChart==='d9' && <NorthIndianChart planets={d9Planets} lagnaIndex={lagnaIndex} chartTitle="Navamsha (D9)" onSymbolClick={handleWatchClick} />}
                {subChart==='d10' && <NorthIndianChart planets={d10Planets} lagnaIndex={lagnaIndex} chartTitle="Dashamsha (D10)" onSymbolClick={handleWatchClick} />}
                {subChart==='d6' && <NorthIndianChart planets={d6Planets} lagnaIndex={lagnaIndex} chartTitle="Shashthamsha (D6)" onSymbolClick={handleWatchClick} />}
                {subChart==='d20' && <NorthIndianChart planets={d20Planets} lagnaIndex={lagnaIndex} chartTitle="Vimshamsha (D20)" onSymbolClick={handleWatchClick} />}
              </div>
            </div>
          )}
          </div>
        </main>

        <aside className="w-full lg:w-[340px] shrink-0 bg-[#fdfde8] border border-amber-200 p-3 rounded-2xl shadow-lg flex flex-col overflow-hidden h-[calc(100vh-80px)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-amber-900">Astro AI Chat</div>
              <div className="text-[10px] text-slate-500">Ask about planets, nakshatras, houses or shadbala strengths.</div>
            </div>
            <span className="text-[10px] text-slate-600">Live AI prompt</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 text-[10px] text-slate-700">
            <div className="font-bold uppercase text-[9px] tracking-wide mb-2">Active context</div>
            {selectedContext ? (
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{selectedContext.title}</div>
                {selectedContext.subtitle ? <div className="text-[9px] text-slate-500">{selectedContext.subtitle}</div> : null}
                <div className="text-[9px] leading-snug text-slate-600 whitespace-pre-wrap">{selectedContext.text}</div>
              </div>
            ) : (
              <div className="text-[9px] text-slate-500">Click a planet, house, nakshatra or shadbala item on the watchface to anchor your AI query.</div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`rounded-2xl p-3 ${msg.role === 'assistant' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100/80 text-slate-900 self-end'} shadow-sm`}> 
                <div className="text-[9px] uppercase tracking-wide font-black mb-1">{msg.role === 'assistant' ? 'AI' : 'You'}</div>
                <div className="text-[11px] leading-normal whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div className="rounded-2xl p-3 bg-slate-100 text-slate-800 shadow-sm animate-pulse flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-amber-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consulting stars...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* SUGGESTED FAQS DRAWER */}
          <div className="border border-amber-100 rounded-xl p-2.5 bg-amber-50/20 mb-2 overflow-y-auto max-h-[140px] shrink-0">
            <button 
              type="button"
              onClick={() => setFaqOpen(!faqOpen)}
              className="w-full text-left text-[10px] font-bold text-amber-800 flex justify-between items-center outline-none cursor-pointer"
            >
              <span className="flex items-center gap-1.5"><span>❓</span> Suggested Questions / FAQs</span>
              <span className="text-[9px]">{faqOpen ? '▲' : '▼'}</span>
            </button>
            
            {faqOpen && (
              <div className="mt-2 space-y-1.5">
                {ASTRO_FAQS.map((cat, cIdx) => {
                  const isCatExpanded = expandedFaqCat === cIdx;
                  return (
                    <div key={cIdx} className="border border-amber-100/40 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqCat(isCatExpanded ? null : cIdx)}
                        className="w-full text-left px-2 py-1.5 text-[9px] font-bold text-slate-700 bg-slate-50 hover:bg-amber-50 flex justify-between items-center outline-none cursor-pointer animate-fade-in"
                      >
                        <span className="flex items-center gap-1.5 text-left">
                          <span>{cat.icon}</span> {cat.category}
                        </span>
                        <span className="text-[8px] text-slate-400">{isCatExpanded ? '▼' : '▶'}</span>
                      </button>
                      {isCatExpanded && (
                        <div className="p-2 bg-white space-y-2">
                          {cat.subcategories.map((sub, sIdx) => (
                            <div key={sIdx} className="space-y-1">
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tight border-b border-slate-100 pb-0.5">{sub.name}</div>
                              <ul className="space-y-1 pl-1">
                                {sub.questions.map((q, qIdx) => (
                                  <li key={qIdx} className="text-left">
                                    <button 
                                      type="button"
                                      onClick={() => setChatInput(q)}
                                      className="w-full text-left text-[10px] text-amber-700 hover:text-amber-955 font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer transition-colors leading-tight"
                                    >
                                      • {q}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="bg-slate-50 border-t border-slate-200 pt-3">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-700">Ask a specific question</label>
            <textarea
              rows={5}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              placeholder={selectedContext ? 'Ask about this selected element...' : 'Ask about the chart, or click an element first...'}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-shadow focus:shadow-outline disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e);
                }
              }}
            />
             <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2 text-[9px] text-slate-600">
                <button type="button" disabled={chatLoading} onClick={() => setChatInput('How does this placement shape career and reputation?')} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 transition disabled:opacity-50">Career</button>
                <button type="button" disabled={chatLoading} onClick={() => setChatInput('What does this tell me about relationships and emotions?')} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 transition disabled:opacity-50">Relationships</button>
                <button type="button" disabled={chatLoading} onClick={() => setChatInput('What is the most important takeaway from this chart element?')} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 transition disabled:opacity-50">Summary</button>
              </div>
              <button type="submit" disabled={chatLoading} className="rounded-full bg-amber-600 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition disabled:opacity-50">
                {chatLoading ? 'Asking...' : 'Ask Astro AI'}
              </button>
            </div>
            {selectedContext ? <div className="mt-3 text-[9px] text-slate-500">Current target: {selectedContext.title}</div> : null}
          </form>
        </aside>
      </div>
      {popupInfo ? (
        <div className="fixed inset-0 z-[200] bg-slate-900/35 flex items-center justify-center p-4" onClick={() => setPopupInfo(null)}>
          <div className="w-full max-w-md bg-[#fdfde8] border-2 border-amber-700 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-800 text-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-serif font-bold text-sm truncate">{popupInfo.title}</div>
                {popupInfo.subtitle ? <div className="text-[10px] text-amber-100 uppercase tracking-wider truncate">{popupInfo.subtitle}</div> : null}
              </div>
              <button type="button" onClick={() => setPopupInfo(null)} className="p-1 rounded hover:bg-white/15 shrink-0" aria-label="Close details"><X size={16} /></button>
            </div>
            <div className="p-4 text-sm text-slate-800 font-serif whitespace-pre-wrap leading-relaxed">
              {popupInfo.text || 'No detail available.'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
