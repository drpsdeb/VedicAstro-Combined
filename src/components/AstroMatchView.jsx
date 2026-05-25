// ============================================================================
// 💘 ASTROMATCH DASHBOARD VIEW COMPONENT
// ============================================================================

import React, { useState, useMemo } from 'react';
import { DWADASH_KOOT_RULES } from '../utils/dwadashKootRules';
import { NAKSHATRAS, RASHI_LORDS, getPositionsForProfile } from '../utils/ephemerisEngine';
import SearchableDropdown from './SearchableDropdown';

export default function AstroMatchView({ savedProfiles, onBack, onLoadCloudProfiles, cloudStatus, cloudLoading, isCloudSignedIn }) {
  const fileInputRef = React.useRef(null);

  const importProfilesFromFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Expected JSON array of profiles');
        const normalized = data.filter(p => p && (p.id || p.name)).map(p => ({
          id: p.id || (p.name && p.dob ? `${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${p.dob}` : String(Math.random())),
          name: p.name || 'Unnamed',
          dob: p.dob || '',
          time: p.time || p.tob || '12:00',
          lat: p.lat || p.latitude || 0,
          lon: p.lon || p.longitude || 0,
          tzone: p.tzone || p.tz || 5.5
        }));
        window.localStorage.setItem('astroClients', JSON.stringify(normalized));
        alert(`Imported ${normalized.length} profiles. The page will reload to reflect changes.`);
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => fileInputRef.current && fileInputRef.current.click();

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importProfilesFromFile(f);
  };

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

  const [selectedBoy, setSelectedBoy] = useState('');
  const [selectedGirl, setSelectedGirl] = useState('');
  const [matchResult, setMatchResult] = useState(null);

  // 🧮 Core Match Score Computation Trigger
  const handleCalculateMatch = () => {
    if (!selectedBoy || !selectedGirl) {
      alert("Please choose both profiles to run the alignment engine!");
      return;
    }

    const boyData = savedProfiles.find(p => p.id === selectedBoy);
    const girlData = savedProfiles.find(p => p.id === selectedGirl);

    if (!boyData || !girlData) return;

    const boyAstro = getPositionsForProfile(boyData);
    const girlAstro = getPositionsForProfile(girlData);

    const boyMoon = boyAstro?.planets.find(p => p.name === 'Moon');
    const girlMoon = girlAstro?.planets.find(p => p.name === 'Moon');

    if (!boyMoon || !girlMoon) {
      alert('Unable to calculate Moon placement for one of the profiles. Please verify birth details.');
      return;
    }

    const boyNakIndex = NAKSHATRAS.indexOf(boyMoon.nakshatra);
    const girlNakIndex = NAKSHATRAS.indexOf(girlMoon.nakshatra);
    const boyRasiIndex = boyMoon.rasiIndex;
    const girlRasiIndex = girlMoon.rasiIndex;

    const nakDistance = (from, to) => ((to - from + 27) % 27) + 1;
    const rasiDistance = (from, to) => ((to - from + 12) % 12) + 1;
    const boyFromGirlNak = nakDistance(girlNakIndex, boyNakIndex);
    const boyFromGirlRasi = rasiDistance(girlRasiIndex, boyRasiIndex);
    const girlFromBoyRasi = rasiDistance(boyRasiIndex, girlRasiIndex);

    const gana = ['Deva','Manushya','Rakshasa','Manushya','Manushya','Manushya','Deva','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
    const rajju = ['Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada','Pada','Kati','Nabhi','Kantha','Shira','Kantha','Nabhi','Kati','Pada'];
    const nadi = (idx) => idx % 3;
    const varnaRank = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
    const vedhaPairs = [[0,18],[1,17],[2,16],[3,15],[4,23],[5,22],[6,21],[7,20],[8,19],[9,26],[10,25],[11,24]];
    const vedhaBad = vedhaPairs.some(([a, b]) => (
      (boyNakIndex === a && girlNakIndex === b) ||
      (boyNakIndex === b && girlNakIndex === a)
    ));

    const friendships = {
      Sun: ['Moon', 'Mars', 'Jupiter'],
      Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'],
      Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'],
      Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus']
    };

    const boyLord = RASHI_LORDS[boyRasiIndex];
    const girlLord = RASHI_LORDS[girlRasiIndex];
    const areFriends = boyLord === girlLord || friendships[boyLord]?.includes(girlLord) || friendships[girlLord]?.includes(boyLord);

    const badBhakoot = (
      (boyFromGirlRasi === 2 && girlFromBoyRasi === 12) ||
      (boyFromGirlRasi === 12 && girlFromBoyRasi === 2) ||
      (boyFromGirlRasi === 6 && girlFromBoyRasi === 8) ||
      (boyFromGirlRasi === 8 && girlFromBoyRasi === 6) ||
      (boyFromGirlRasi === 5 && girlFromBoyRasi === 9) ||
      (boyFromGirlRasi === 9 && girlFromBoyRasi === 5)
    );

    const scores = {
      dina: [2, 4, 6, 8, 9].includes(boyFromGirlNak % 9 || 9) ? 3 : 0,
      gana: gana[boyNakIndex] === gana[girlNakIndex] ? 6 : (gana[boyNakIndex] === 'Rakshasa' || gana[girlNakIndex] === 'Rakshasa' ? 1 : 5),
      yoni: boyNakIndex === girlNakIndex ? 4 : (Math.abs(boyNakIndex - girlNakIndex) % 3 === 0 ? 3 : 2),
      maitri: areFriends ? 2 : 1,
      bhakoot: badBhakoot ? 0 : 7,
      nadi: nadi(boyNakIndex) === nadi(girlNakIndex) ? 0 : 8,
      varna: varnaRank[boyRasiIndex] >= varnaRank[girlRasiIndex] ? 1 : 0,
      vashya: boyRasiIndex === girlRasiIndex || Math.abs(boyRasiIndex - girlRasiIndex) === 1 ? 2 : 1,
      mahendra: [4, 7, 10, 13, 16, 19, 22, 25].includes(boyFromGirlNak) ? 4 : 0,
      striDirgha: boyFromGirlNak >= 14 ? 3 : 0,
      rajju: rajju[boyNakIndex] === rajju[girlNakIndex] ? 0 : 7,
      vedha: vedhaBad ? 0 : 3
    };

    const doshas = [];
    if (scores.rajju === 0) doshas.push('Rajju Dosha');
    if (scores.vedha === 0) doshas.push('Vedha Dosha');
    if (scores.nadi === 0) doshas.push('Nadi Dosha');
    if (scores.bhakoot === 0) doshas.push('Bhakoot Warning');

    const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);

    setMatchResult({
      totalScore,
      scores,
      doshas,
      boyDetails: { name: boyData.name || selectedBoy, rasi: boyMoon?.rasi || 'Unknown', nakshatra: boyMoon?.nakshatra || 'Unknown' },
      girlDetails: { name: girlData.name || selectedGirl, rasi: girlMoon?.rasi || 'Unknown', nakshatra: girlMoon?.nakshatra || 'Unknown' }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#fdfde8] p-4 md:p-8 pt-16 overflow-y-auto">
      
      {/* 🧭 NAVIGATION HEADER BAR */}
      <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white text-center py-1.5 px-4 text-[10px] font-bold z-50 shadow-md flex justify-center gap-1.5">
        <button
          onClick={onBack}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 px-2 py-1 text-xs font-bold text-amber-700 bg-white hover:bg-amber-50 rounded shadow-sm transition-all z-10 cursor-pointer"
        >
          <span>←</span> Back to Hub
        </button>
        AstroMatch Ver 1.5.0 - Isolated Sandbox Workspace
      </div>

      {/* 🔮 MAIN CONTENT LAYOUT CONTAINER */}
      <div className="max-w-4xl mx-auto bg-white border border-amber-300 rounded-2xl shadow-xl p-6 md:p-10 mt-4">
        <h2 className="text-3xl font-bold text-amber-800 mb-8 text-center tracking-wider">
          DWADASHKOOT GUNA MILAN
        </h2>

        {/* PROFILE SELECTION DROP-DOWNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* BOY SELECTION CARD */}
          <div className="flex flex-col gap-3 bg-blue-50 p-6 rounded-xl border border-blue-200">
            <label className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>👦</span> Boy's Profile
            </label>
            <SearchableDropdown
              options={sortedProfiles}
              value={selectedBoy}
              onChange={setSelectedBoy}
              placeholder="-- Choose Boy --"
              className="w-full"
              buttonClassName="w-full bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-slate-700 text-sm shadow-sm hover:bg-slate-50 text-left h-[46px]"
              variant="form"
              groupByCategory={true}
            />
          </div>

          {/* GIRL SELECTION CARD */}
          <div className="flex flex-col gap-3 bg-pink-50 p-6 rounded-xl border border-pink-200">
            <label className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>👩‍🦰</span> Girl's Profile
            </label>
            <SearchableDropdown
              options={sortedProfiles}
              value={selectedGirl}
              onChange={setSelectedGirl}
              placeholder="-- Choose Girl --"
              className="w-full"
              buttonClassName="w-full bg-white border border-slate-300 p-2.5 rounded-lg font-medium text-slate-700 text-sm shadow-sm hover:bg-slate-50 text-left h-[46px]"
              variant="form"
              groupByCategory={true}
            />
          </div>

        </div>

        {/* CALCULATION TRIGGER ENGINE ACTION */}
        <div className="text-center mb-10">
          <button
            onClick={handleCalculateMatch}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-md transform hover:-translate-y-0.5 transition-all text-lg cursor-pointer"
          >
            Calculate Match Score
          </button>
        </div>

        {/* RESULTS GRID RENDERER */}
        {matchResult && (
          <div className="mt-8 border-t border-amber-200 pt-8 animate-fade-in">
            <div className="text-center mb-4 bg-amber-50 p-6 rounded-xl border border-amber-200">
              <span className="text-sm font-semibold text-amber-700 uppercase tracking-wider block mb-1">TOTAL MILAN SCORE</span>
              <div className="text-5xl font-black text-emerald-600">
                {matchResult.totalScore} <span className="text-2xl text-slate-400 font-normal">/ 50</span>
              </div>
            </div>

            {matchResult.doshas?.length > 0 ? (
              <div className="mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                <div className="font-bold uppercase text-xs tracking-widest mb-2">Dosha / Warning</div>
                <div className="flex flex-wrap gap-2">
                  {matchResult.doshas.map((dosha) => (
                    <span key={dosha} className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-700">
                      <span>⚠️</span>{dosha}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold">
                No major doshas detected. Compatibility appears stable for the selected criteria.
              </div>
            )}

            {/* KOOT COMPREHENSIVE BREAKDOWN MATRIX */}
            <div className="overflow-x-auto shadow-sm border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Koot / Test Name</th>
                    <th className="p-4 text-center">Max Points</th>
                    <th className="p-4 text-center">Obtained Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm font-medium text-slate-700">
                  {DWADASH_KOOT_RULES.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{rule.name}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{rule.description}</div>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-bold">{rule.maxPoints}</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">{matchResult.scores?.[rule.key] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}