import React, { useState } from 'react';
import { getKPDivisions } from '../utils/kpEngine.js';

// Weekday/Lords definition
const VIMSHOTTARI_LORDS = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'
];

export default function FourStepAnalysis({ cusps, planets }) {
  const [selectedPlanet, setSelectedPlanet] = useState('Sun');

  // Helpers to get house calculations
  const getOccupiedHouse = (planetName) => {
    const p = planets.find((pl) => (pl.name || pl.planet) === planetName);
    if (!p) return 1;
    const deg = p.longitude !== undefined ? p.longitude : (p.fullDegree !== undefined ? p.fullDegree : p.l);
    
    for (let h = 1; h <= 12; h++) {
      const start = cusps[h];
      const end = cusps[h === 12 ? 1 : h + 1];
      if (start < end) {
        if (deg >= start - 1e-9 && deg < end) return h;
      } else {
        if (deg >= start - 1e-9 || deg < end) return h;
      }
    }
    return 1;
  };

  const getRuledHouses = (planetName) => {
    const ruled = [];
    for (let h = 1; h <= 12; h++) {
      const cuspLon = cusps[h];
      const cuspDiv = getKPDivisions(cuspLon);
      if (cuspDiv.signLord === planetName) {
        ruled.push(h);
      }
    }
    return ruled;
  };

  // Build the details for a planet at any step level
  const getStepDetails = (planetName) => {
    const p = planets.find((pl) => (pl.name || pl.planet) === planetName);
    const lon = p 
      ? (p.longitude !== undefined ? p.longitude : (p.fullDegree !== undefined ? p.fullDegree : p.l))
      : 0;
    const div = getKPDivisions(lon);
    const occupied = getOccupiedHouse(planetName);
    const ruled = getRuledHouses(planetName);

    return {
      name: planetName,
      signLord: div.signLord,
      starLord: div.starLord,
      subLord: div.subLord,
      occupied,
      ruled,
      lon
    };
  };

  // Generate 4 steps for selected planet:
  // Step 1: Planet itself
  const step1 = getStepDetails(selectedPlanet);
  // Step 2: Star Lord of Planet
  const step2 = getStepDetails(step1.starLord);
  // Step 3: Sub Lord of Planet
  const step3 = getStepDetails(step1.subLord);
  // Step 4: Star Lord of Sub Lord
  const step4 = getStepDetails(step3.starLord);

  const steps = [
    { title: "Step 1: Planet Itself", data: step1, desc: "The source planet initiating the query." },
    { title: "Step 2: Star Lord", data: step2, desc: "Star Lord indicates the nature, potential, and strength of the promise." },
    { title: "Step 3: Sub Lord", data: step3, desc: "Sub Lord determines the final manifestation (Yes/No outcome) of the event." },
    { title: "Step 4: Sub Lord's Star Lord", data: step4, desc: "Validates the environment and final feedback of the outcome." }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      
      {/* Left Sidebar - Planet Select */}
      <div className="w-full md:w-56 bg-slate-50 border-r border-slate-100 p-4 shrink-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Planet</h3>
        <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
          {VIMSHOTTARI_LORDS.map((planet) => {
            const isSelected = selectedPlanet === planet;
            return (
              <button
                key={`select-${planet}`}
                onClick={() => setSelectedPlanet(planet)}
                className={`py-2 px-3 text-xs md:text-sm font-semibold rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {planet}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Content - 4-Step Timeline */}
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h3 className="font-serif font-black text-xl text-slate-800">4-Step Significator Analysis</h3>
          <p className="text-xs text-slate-500 mt-1">Detailed structural breakdown for planet <strong className="text-amber-600">{selectedPlanet}</strong></p>
        </div>

        {/* Timeline Layout */}
        <div className="space-y-6 relative border-l-2 border-slate-100 pl-6 ml-4">
          {steps.map((step, idx) => (
            <div key={`step-${idx}`} className="relative">
              
              {/* Timeline node dot */}
              <span className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-white border-4 border-amber-500 shadow-sm flex items-center justify-center font-bold text-[9px] text-slate-700"></span>

              {/* Step Card */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-2 mb-3 gap-1">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-slate-800">{step.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{step.desc}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 bg-amber-100/60 text-amber-900 border border-amber-200/40 px-2 py-0.5 rounded-md">
                    Planet: {step.data.name}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Occupies House</span>
                    <span className="text-slate-800 font-black text-sm">House {step.data.occupied}</span>
                  </div>
                  
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Rules Houses</span>
                    <span className="text-slate-800 font-black text-sm">
                      {step.data.ruled.length > 0 ? `Houses ${step.data.ruled.join(', ')}` : "None"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Star / Sub Lord</span>
                    <span className="text-slate-800 font-black text-xs">
                      Star: {step.data.starLord} • Sub: {step.data.subLord}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Sign Lord / Longitude</span>
                    <span className="text-slate-800 font-black text-xs">
                      Sign Ld: {step.data.signLord} ({step.data.lon.toFixed(2)}°)
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
