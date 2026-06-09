import React, { useState, useMemo } from 'react';
import kpRules from '../utils/kpRules.json';
import { evaluateKPEvent } from '../utils/kpRuleInterpreter.js';
import { getHouseSignificators } from '../utils/kpEngine.js';
import { serializeKPData } from '../utils/kpSerializer.js';
import KPResultSummary from './KPResultSummary.jsx';
import KPSignificatorsList from './KPSignificatorsList.jsx';

export default function KPInterpretation({ cusps, planets }) {
  // 1. Group categories for display names
  const categoriesList = useMemo(() => {
    return Object.keys(kpRules).map(catKey => {
      let name = catKey.replace(/_/g, ' ');
      // Capitalize words
      name = name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      // Friendly name map
      if (catKey === 'INCOME') name = 'Income & Career';
      if (catKey === 'LOSSES') name = 'Losses & Debt';
      if (catKey === 'CHILD_BIRTH') name = 'Child Birth';
      if (catKey === 'DIFFICULTY') name = 'Health & Difficulties';
      if (catKey === 'MARRIAGE') name = 'Marriage & Relationships';
      if (catKey === 'TRAVEL') name = 'Travel & Journeys';
      if (catKey === 'PROPERTY') name = 'Property & Vehicles';

      return { key: catKey, label: name };
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(categoriesList[0]?.key || '');
  
  // 2. Fetch subcategories dynamically based on active category
  const subcategoriesList = useMemo(() => {
    if (!selectedCategory || !kpRules[selectedCategory]) return [];
    return Object.keys(kpRules[selectedCategory]).map(subKey => {
      const ruleObj = kpRules[selectedCategory][subKey];
      return { key: subKey, label: ruleObj.matter };
    });
  }, [selectedCategory]);

  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  // Auto-select first subcategory when category changes
  React.useEffect(() => {
    if (subcategoriesList.length > 0) {
      setSelectedSubcategory(subcategoriesList[0].key);
    } else {
      setSelectedSubcategory('');
    }
  }, [subcategoriesList]);

  // 3. Serialize chart data for use in evaluator
  const serializedChartData = useMemo(() => {
    if (!cusps || !planets) return null;
    try {
      const significatorsMap = getHouseSignificators(cusps, planets);
      return serializeKPData(planets, cusps, significatorsMap);
    } catch (e) {
      console.error("Failed to serialize KP data inside KPInterpretation:", e);
      return null;
    }
  }, [cusps, planets]);

  const [evaluationResult, setEvaluationResult] = useState(null);

  const handleEvaluate = () => {
    if (!selectedCategory || !selectedSubcategory || !serializedChartData) return;
    try {
      const res = evaluateKPEvent(selectedCategory, selectedSubcategory, serializedChartData);
      setEvaluationResult(res);
    } catch (e) {
      alert(`Evaluation failed: ${e.message}`);
    }
  };

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* 1. Category and Subcategory Selector Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-serif font-bold text-base text-slate-800">Automated Event Interpretation</h3>
          <p className="text-xs text-slate-500 mt-1">
            Query the KP Astrology rule book to verify promises and significations for specific life events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Category Dropdown */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Event Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setEvaluationResult(null); // Clear previous result
              }}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold text-slate-700"
            >
              {categoriesList.map(cat => (
                <option key={`opt-cat-${cat.key}`} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Dropdown */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Specific Query / Matter
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => {
                setSelectedSubcategory(e.target.value);
                setEvaluationResult(null); // Clear previous result
              }}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold text-slate-700"
              disabled={subcategoriesList.length === 0}
            >
              {subcategoriesList.map(sub => (
                <option key={`opt-sub-${sub.key}`} value={sub.key}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Button */}
          <div className="md:col-span-1">
            <button
              onClick={handleEvaluate}
              className="w-full p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase shadow-sm transition-all tracking-wider"
              disabled={!selectedCategory || !selectedSubcategory || !serializedChartData}
            >
              Evaluate Event
            </button>
          </div>
        </div>
      </div>

      {/* 2. Results Layout */}
      {evaluationResult ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8 items-start">
          
          {/* Left: Summary Panel */}
          <div className="xl:col-span-1">
            <KPResultSummary result={evaluationResult} />
          </div>

          {/* Right: Significators Breakdown Matrix */}
          <div className="xl:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <KPSignificatorsList 
                result={evaluationResult} 
                computedChartData={serializedChartData} 
              />
            </div>
          </div>

        </div>
      ) : (
        /* Empty Placeholder Screen */
        <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center bg-slate-50/50 flex flex-col items-center justify-center min-h-[260px] space-y-3">
          <span className="text-3xl">🔍</span>
          <h4 className="font-serif font-bold text-base text-slate-750">Ready for Evaluation</h4>
          <p className="text-xs text-slate-450 max-w-sm leading-relaxed">
            Select a category and subcategory event query above, then click <strong>"Evaluate Event"</strong> to analyze this birth profile.
          </p>
        </div>
      )}

    </div>
  );
}
