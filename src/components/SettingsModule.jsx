import React, { useState, useEffect } from 'react';
import { Key, User, Save, Trash2, ShieldCheck, ShieldAlert, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { fetchPlanetaryData } from '../utils/apiService';

export default function SettingsModule() {
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Alert structure: { type: 'success' | 'error' | 'info', text: '' }
  const [alert, setAlert] = useState(null);

  // Load initial values from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('astrology_api_key') || localStorage.getItem('API_KEY') || '';
    const savedUser = localStorage.getItem('astrology_user_id') || localStorage.getItem('USER_ID') || '';
    
    setApiKey(savedKey);
    setUserId(savedUser);
    
    if (savedKey && savedUser) {
      setIsSaved(true);
    }
  }, []);

  const handleSave = (e) => {
    if (e) e.preventDefault();
    
    if (!apiKey.trim() || !userId.trim()) {
      setAlert({
        type: 'error',
        text: 'Both User ID and API Key are required to save.'
      });
      return;
    }

    try {
      localStorage.setItem('astrology_api_key', apiKey.trim());
      localStorage.setItem('astrology_user_id', userId.trim());
      
      // Also write to old keys for compatibility
      localStorage.setItem('API_KEY', apiKey.trim());
      localStorage.setItem('USER_ID', userId.trim());
      
      setIsSaved(true);
      setAlert({
        type: 'success',
        text: 'Credentials saved successfully!'
      });
    } catch (err) {
      setAlert({
        type: 'error',
        text: `Failed to save credentials: ${err.message}`
      });
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem('astrology_api_key');
      localStorage.removeItem('astrology_user_id');
      localStorage.removeItem('API_KEY');
      localStorage.removeItem('USER_ID');
      
      setApiKey('');
      setUserId('');
      setIsSaved(false);
      
      setAlert({
        type: 'info',
        text: 'Credentials cleared from local storage.'
      });
    } catch (err) {
      setAlert({
        type: 'error',
        text: `Failed to clear credentials: ${err.message}`
      });
    }
  };

  const handleTestConnection = async () => {
    // Temporarily apply current inputs to localStorage if not saved yet
    const originalKey = localStorage.getItem('astrology_api_key');
    const originalUser = localStorage.getItem('astrology_user_id');
    
    setTesting(true);
    setAlert({ type: 'info', text: 'Testing connection to astrologyapi.com...' });

    try {
      // Mock temporary set for testing if user hasn't saved yet
      localStorage.setItem('astrology_api_key', apiKey.trim());
      localStorage.setItem('astrology_user_id', userId.trim());

      // Test payload: Hyderabad birth coordinates for current time
      const testData = {
        dob: '2000-01-01',
        time: '12:00',
        lat: 17.3850,
        lon: 78.4867,
        tzone: 5.5
      };

      const result = await fetchPlanetaryData(testData);
      
      if (result && result.length > 0) {
        setAlert({
          type: 'success',
          text: `Success! Successfully fetched positions for ${result.length} planets.`
        });
      } else {
        setAlert({
          type: 'success',
          text: 'Success! Connection established with AstrologyAPI.'
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        text: `Connection failed: ${err.message}`
      });
      
      // Restore original credentials if test failed
      if (originalKey !== null) localStorage.setItem('astrology_api_key', originalKey);
      else localStorage.removeItem('astrology_api_key');
      
      if (originalUser !== null) localStorage.setItem('astrology_user_id', originalUser);
      else localStorage.removeItem('astrology_user_id');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        {/* Banner with gradient */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 p-6 md:p-8 text-white relative">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
            {isSaved ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-200">Active</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-[10px] uppercase tracking-wider text-amber-200">Pending Credentials</span>
              </>
            )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-serif font-black tracking-wide flex items-center gap-2">
            <Sparkles className="text-amber-300 w-6 h-6 animate-spin-slow" />
            API Credentials Settings
          </h2>
          <p className="text-sm text-emerald-100 mt-2 font-light">
            Configure your own credentials from <a href="https://astrologyapi.com" target="_blank" rel="noreferrer" className="underline hover:text-white font-medium transition-colors">astrologyapi.com</a> to enable high-precision calculations.
          </p>
        </div>

        {/* Body content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Notification Alert banner */}
          {alert && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border text-sm transition-all duration-300 animate-fade-in ${
              alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              alert.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <div className="mt-0.5 shrink-0">
                {alert.type === 'success' ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
              </div>
              <div className="flex-1 font-medium">{alert.text}</div>
              <button 
                onClick={() => setAlert(null)} 
                className="text-xs uppercase font-bold opacity-60 hover:opacity-100 transition-opacity ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* User ID Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                User ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your AstrologyAPI User ID (e.g. 600123)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* API Key Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                API Key (Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                  <Key size={18} />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter your AstrologyAPI Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Status summary */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span>Required for calls to <code>astrologyapi.com</code></span>
              {isSaved ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ Credentials Configured
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  ⚠ Credentials Missing
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-700/10 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Credentials
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiKey.trim() || !userId.trim()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-200"
              >
                <RefreshCw size={18} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              {isSaved && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 font-bold py-3.5 px-5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border border-rose-200"
                  title="Clear saved keys"
                >
                  <Trash2 size={18} />
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
