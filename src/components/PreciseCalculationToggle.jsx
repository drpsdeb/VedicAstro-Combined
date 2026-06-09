import React, { useState, useEffect } from 'react';
import { Cpu, Zap, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function PreciseCalculationToggle() {
  const [usePrecise, setUsePrecise] = useState(() => localStorage.getItem('use_precise_api') === 'true');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    // Check credentials on load
    const checkCreds = () => {
      const key = localStorage.getItem('astrology_api_key') || localStorage.getItem('API_KEY');
      const user = localStorage.getItem('astrology_user_id') || localStorage.getItem('USER_ID');
      setHasCredentials(!!(key && user));
    };

    checkCreds();
    
    // Listen for custom toggle and storage updates
    const handleToggleChange = () => {
      const active = localStorage.getItem('use_precise_api') === 'true';
      setUsePrecise(active);
      checkCreds();
      if (!active) {
        setFetchStatus('idle');
        setFetchError('');
      } else {
        setFetchStatus('success');
      }
    };

    const handleFetching = () => {
      setFetchStatus('loading');
      setFetchError('');
    };

    const handleSuccess = () => {
      setFetchStatus('success');
      setFetchError('');
    };

    const handleFailed = (e) => {
      setFetchStatus('error');
      setFetchError(e.detail || 'API request failed');
    };

    if (localStorage.getItem('use_precise_api') === 'true') {
      setFetchStatus('success');
    }

    window.addEventListener('api_toggle_changed', handleToggleChange);
    window.addEventListener('storage', handleToggleChange);
    window.addEventListener('planetary_positions_fetching', handleFetching);
    window.addEventListener('planetary_positions_fetch_success', handleSuccess);
    window.addEventListener('planetary_positions_fetch_failed', handleFailed);

    return () => {
      window.removeEventListener('api_toggle_changed', handleToggleChange);
      window.removeEventListener('storage', handleToggleChange);
      window.removeEventListener('planetary_positions_fetching', handleFetching);
      window.removeEventListener('planetary_positions_fetch_success', handleSuccess);
      window.removeEventListener('planetary_positions_fetch_failed', handleFailed);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
      <span className="text-[10px] uppercase font-bold text-slate-500 px-2 tracking-wider">Calculation Engine:</span>
      
      <div className="flex bg-slate-200 rounded-xl p-0.5 relative">
        <button
          type="button"
          onClick={() => {
            if (usePrecise) {
              localStorage.setItem('use_precise_api', 'false');
              setUsePrecise(false);
              window.dispatchEvent(new CustomEvent('api_toggle_changed'));
              window.dispatchEvent(new CustomEvent('planetary_positions_updated'));
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
            !usePrecise
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
          }`}
        >
          <Cpu size={12} />
          Local Engine
        </button>

        <button
          type="button"
          onClick={() => {
            if (!usePrecise) {
              localStorage.setItem('use_precise_api', 'true');
              setUsePrecise(true);
              window.dispatchEvent(new CustomEvent('api_toggle_changed'));
              window.dispatchEvent(new CustomEvent('planetary_positions_updated'));
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
            usePrecise
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-300/50'
          }`}
        >
          <Zap size={12} className={usePrecise ? 'text-amber-300 animate-pulse' : ''} />
          AstrologyAPI
        </button>
      </div>

      {usePrecise && !hasCredentials && (
        <div className="flex items-center gap-1 text-[9px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
          <AlertCircle size={10} className="shrink-0" />
          <span>No API Credentials saved!</span>
        </div>
      )}

      {usePrecise && hasCredentials && fetchStatus === 'loading' && (
        <div className="flex items-center gap-1 text-[9px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 animate-pulse">
          <Loader2 size={10} className="shrink-0 animate-spin" />
          <span>Syncing precise coordinates...</span>
        </div>
      )}

      {usePrecise && hasCredentials && fetchStatus === 'error' && (
        <div className="flex items-center gap-1.5 text-[9px] text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
          <AlertCircle size={10} className="shrink-0" />
          <span>API Error: {fetchError}</span>
        </div>
      )}

      {usePrecise && hasCredentials && fetchStatus === 'success' && (
        <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <ShieldCheck size={10} className="shrink-0" />
          <span>Precise Coordinates Active</span>
        </div>
      )}
    </div>
  );
}
