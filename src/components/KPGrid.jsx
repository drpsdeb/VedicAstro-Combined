import React from 'react';
import { getKPDivisions } from '../utils/kpEngine.js';

// Convert longitude degree to zodiac format e.g. "12° Ar 34'"
const formatDegree = (degree) => {
  if (degree === undefined || degree === null) return '';
  const signIdx = Math.floor(degree / 30) % 12;
  const signShorts = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
  const degInSign = degree % 30;
  const deg = Math.floor(degInSign);
  const min = Math.floor((degInSign - deg) * 60);
  return `${deg}° ${signShorts[signIdx]} ${min.toString().padStart(2, '0')}'`;
};

// Simple badges for planets/lords to improve visual scanning
const LordBadge = ({ name }) => {
  const badgeColors = {
    Sun: 'bg-red-50 text-red-700 border-red-200',
    Moon: 'bg-slate-100 text-slate-700 border-slate-200',
    Mars: 'bg-rose-50 text-rose-700 border-rose-200',
    Mercury: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Jupiter: 'bg-amber-50 text-amber-700 border-amber-200',
    Venus: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    Saturn: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Rahu: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    Ketu: 'bg-stone-100 text-stone-700 border-stone-200'
  };

  const style = badgeColors[name] || 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${style}`}>
      {name}
    </span>
  );
};

export default function KPGrid({ cusps, planets }) {
  // Map planets to include division data
  const planetsWithDivs = planets.map((p) => {
    const lon = p.longitude !== undefined ? p.longitude : (p.fullDegree !== undefined ? p.fullDegree : p.l);
    const div = getKPDivisions(lon);
    return {
      name: p.name || p.planet,
      longitude: lon,
      signLord: div.signLord,
      starLord: div.starLord,
      subLord: div.subLord,
      subSubLord: div.subSubLord
    };
  });

  return (
    <div className="w-full space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-start">
        
        {/* Placidus House Cusps Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-serif font-bold text-lg text-slate-800">12 Placidus House Cusps</h3>
            <p className="text-xs text-slate-500 mt-1">Calculated using unequal Placidus house division</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">House</th>
                  <th className="py-3 px-4">Cusp Longitude</th>
                  <th className="py-3 px-4">Sign Lord</th>
                  <th className="py-3 px-4">Star Lord</th>
                  <th className="py-3 px-4">Sub Lord</th>
                  <th className="py-3 px-4">Sub-Sub Lord</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cusps.slice(1).map((degree, index) => {
                  const houseNum = index + 1;
                  const div = getKPDivisions(degree);
                  return (
                    <tr key={`cusp-row-${houseNum}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">House {houseNum}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatDegree(degree)}</td>
                      <td className="py-3 px-4"><LordBadge name={div.signLord} /></td>
                      <td className="py-3 px-4"><LordBadge name={div.starLord} /></td>
                      <td className="py-3 px-4"><LordBadge name={div.subLord} /></td>
                      <td className="py-3 px-4"><LordBadge name={div.subSubLord} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Planetary Positions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-serif font-bold text-lg text-slate-800">Planetary Positions & Lords</h3>
            <p className="text-xs text-slate-500 mt-1">KP Star, Sub, and Sub-Sub lords (249 Divisions)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">Planet</th>
                  <th className="py-3 px-4">Longitude</th>
                  <th className="py-3 px-4">Sign Lord</th>
                  <th className="py-3 px-4">Star Lord</th>
                  <th className="py-3 px-4">Sub Lord</th>
                  <th className="py-3 px-4">Sub-Sub Lord</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {planetsWithDivs.map((p) => (
                  <tr key={`planet-row-${p.name}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{formatDegree(p.longitude)}</td>
                    <td className="py-3 px-4"><LordBadge name={p.signLord} /></td>
                    <td className="py-3 px-4"><LordBadge name={p.starLord} /></td>
                    <td className="py-3 px-4"><LordBadge name={p.subLord} /></td>
                    <td className="py-3 px-4"><LordBadge name={p.subSubLord} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
