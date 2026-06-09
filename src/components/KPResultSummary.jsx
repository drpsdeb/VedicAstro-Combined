import React from 'react';

export default function KPResultSummary({ result }) {
  if (!result) return null;

  const {
    matter,
    isPromised,
    primaryCusp,
    subLord,
    conditionChecks = []
  } = result;

  return (
    <div className={`border rounded-2xl p-5 shadow-sm transition-all text-left ${
      isPromised 
        ? 'bg-emerald-50/15 border-emerald-500/20' 
        : 'bg-rose-50/15 border-rose-500/20'
    }`}>
      
      {/* Header Outcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`text-3xl p-2.5 rounded-2xl bg-white shadow-xs border ${
            isPromised ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'
          }`}>
            {isPromised ? '✅' : '❌'}
          </div>
          <div>
            <h4 className="font-serif font-black text-lg text-slate-800 leading-tight">
              {matter}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">
              Event Promise Evaluation Verdict
            </p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className={`inline-flex flex-col items-center px-5 py-2 rounded-2xl border shadow-sm ${
          isPromised 
            ? 'bg-emerald-600 text-white border-emerald-700' 
            : 'bg-rose-600 text-white border-rose-700'
        }`}>
          <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-75">Event Promised</span>
          <span className="text-lg font-black tracking-wide leading-none mt-1">
            {isPromised ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {/* Governing House Cusp Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 mb-4 bg-white/60 p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between items-center pb-2 sm:pb-0 sm:border-r sm:border-slate-100 sm:pr-4">
          <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Governing Cusp</span>
          <span className="text-slate-850 font-black text-sm">Cusp {primaryCusp}</span>
        </div>
        <div className="flex justify-between items-center sm:pl-4">
          <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Cusp Sub-Lord</span>
          <span className="text-amber-800 font-black text-sm flex items-center gap-1">
            {subLord} 🎯
          </span>
        </div>
      </div>

      {/* Special Conditions List (if any) */}
      {conditionChecks && conditionChecks.length > 0 && (
        <div className="bg-[#fdfdfc] border border-slate-200/50 rounded-xl p-4 space-y-2.5">
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
            Special Astrological Conditions
          </span>
          <div className="space-y-2 text-xs">
            {conditionChecks.map((check, idx) => (
              <div 
                key={`check-${check.type}-${idx}`} 
                className="flex items-start justify-between gap-4 border-b border-slate-100/40 pb-2 last:border-b-0 last:pb-0"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 block capitalize">
                    {check.type.replace(/([A-Z])/g, ' $1')} Check
                  </span>
                  <p className="text-[10px] text-slate-450 font-medium">
                    {check.description}
                  </p>
                </div>
                
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                  check.status 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {check.status ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}
