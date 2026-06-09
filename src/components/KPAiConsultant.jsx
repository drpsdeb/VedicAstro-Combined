import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, AlertCircle, MessageSquare, Copy, Check, HelpCircle } from 'lucide-react';
import { serializeKPData, serializeKPChart } from '../utils/kpSerializer.js';
import { fetchKPAiConsultation } from '../utils/kpAiService.js';
import { getHouseSignificators } from '../utils/kpEngine.js';
import { calculateKPDasas } from '../utils/kpDasaEngine.js';

const PRESETS = [
  {
    id: 'MARRIAGE',
    label: '💍 Marriage & Relationships',
    query: 'Will I get married soon, and what does my KP chart indicate about the timing, promise, and nature of my marriage?'
  },
  {
    id: 'CAREER',
    label: '💼 Career & Job Promotion',
    query: 'What are my career and job prospects? Will I get a promotion, job change, or new career opportunity soon?'
  },
  {
    id: 'FINANCE',
    label: '💰 Financial Gain & Property',
    query: 'How will my financial situation develop? Are there indications of financial gains, property, or vehicle purchase?'
  },
  {
    id: 'TRAVEL',
    label: '✈️ Foreign Travel & Settlement',
    query: 'Will I travel or settle abroad for work, business, or studies? Is foreign travel promised in my KP chart?'
  },
  {
    id: 'EDUCATION',
    label: '🎓 Education & Studies',
    query: 'Will I succeed in higher studies, exams, or competitive academic opportunities according to my cusps?'
  },
  {
    id: 'HEALTH',
    label: '🩺 Vitality & Health Recovery',
    query: 'How is my general health baseline and physical vitality? What do my cusps indicate about recovery and well-being?'
  },
  {
    id: 'CUSTOM',
    label: '❓ Custom Question...',
    query: ''
  }
];

export default function KPAiConsultant({ cusps, planets, profile, geminiKey, language = 'English' }) {
  const [selectedPreset, setSelectedPreset] = useState('MARRIAGE');
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const activeKey = geminiKey || localStorage.getItem('astrology_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('API_KEY') || '';

  // Calculate moon longitude for Dasa period calculations
  const moonLongitude = useMemo(() => {
    const moon = planets?.find(p => p.name === 'Moon' || p.planet === 'Moon');
    return moon ? (moon.longitude ?? moon.fullDegree ?? moon.l) : 0;
  }, [planets]);

  // Compute Dasa periods active for the native
  const dasaTree = useMemo(() => {
    if (!profile || !profile.dob) return [];
    try {
      return calculateKPDasas(moonLongitude, profile.dob);
    } catch (e) {
      console.error("Dasa calculation error in KPAiConsultant:", e);
      return [];
    }
  }, [moonLongitude, profile]);

  // Get active question query
  const activeQuestion = () => {
    if (selectedPreset === 'CUSTOM') {
      return customQuestion;
    }
    const preset = PRESETS.find(p => p.id === selectedPreset);
    return preset ? preset.query : '';
  };

  const handleAskAI = async () => {
    const question = activeQuestion();
    if (!question || question.trim().length === 0) {
      setError("Please select a preset question or type a custom question.");
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setCopied(false);

    try {
      // 1. Calculate significators map
      const significatorsMap = getHouseSignificators(cusps, planets);

      // 2. Serialize chart data
      const computedChartData = serializeKPData(planets, cusps, significatorsMap);

      // 3. Serialize chart + dasa periods into a clean, concise JSON string
      const serializedChartString = serializeKPChart(computedChartData, dasaTree);

      // 4. Fetch Gemini Analysis
      const res = await fetchKPAiConsultation(serializedChartString, question, language);

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res.text);
      }
    } catch (e) {
      setError(e.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple Markdown formatter to HTML
  const renderFormattedResult = (text) => {
    if (!text) return null;

    let html = text;

    // Clean up carriage returns
    html = html.replace(/\r/g, '');

    // Format headers ###
    html = html.replace(/^### (.*$)/gim, '<h4 class="font-serif font-black text-sm text-green-900 mt-5 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">$1</h4>');
    
    // Format headers ##
    html = html.replace(/^## (.*$)/gim, '<h3 class="font-serif font-black text-base text-slate-800 mt-6 mb-3 border-b border-slate-200 pb-2 flex items-center gap-1.5">$1</h3>');

    // Format bold text **word**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-800 font-bold">$1</strong>');

    // Format bullet points
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="list-disc list-inside ml-2.5 my-1.5 text-slate-700 leading-relaxed">$1</li>');

    // Replace double line breaks with paragraph blocks, single with br
    const paragraphs = html.split('\n\n');
    const formattedParagraphs = paragraphs.map((p, idx) => {
      let content = p.trim().replace(/\n/g, '<br/>');
      if (content.startsWith('<h') || content.startsWith('<li')) {
        return content;
      }
      return `<p class="my-2.5 leading-relaxed text-xs text-slate-700 font-serif">${content}</p>`;
    }).join('');

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formattedParagraphs }} 
        className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-serif"
      />
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8 items-start text-left">
      
      {/* Left Column: Form Controls */}
      <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-serif font-bold text-base text-slate-800">AI Astrologer Consultation</h3>
          <p className="text-xs text-slate-500 mt-1">Ask questions and obtain consultative predictions based on KP sub-lords</p>
        </div>

        {/* API Key warning block */}
        {!activeKey && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-[10.5px] leading-relaxed text-amber-850">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-900">API Key Required:</strong> Please configure your Gemini API Key in the settings panel to enable the AI Consultation feature.
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Question Category</label>
            <select 
              value={selectedPreset} 
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                setError('');
              }} 
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-green-500 outline-none cursor-pointer font-bold text-slate-700"
            >
              {PRESETS.map(p => (
                <option key={`preset-${p.id}`} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {selectedPreset === 'CUSTOM' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Your Question</label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Example: Will I secure a software developer job in August 2026?"
                rows={4}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:border-green-500 outline-none resize-none font-medium text-slate-800"
              />
            </div>
          )}

          <button
            onClick={handleAskAI}
            disabled={loading || !activeKey || (selectedPreset === 'CUSTOM' && !customQuestion.trim())}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Analyzing Chart...
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-amber-400" />
                Ask AI Astrologer
              </>
            )}
          </button>
        </div>

        {selectedPreset !== 'CUSTOM' && (
          <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-[10.5px] text-slate-500 font-serif leading-relaxed flex gap-2">
            <HelpCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Question to be asked:</strong><br/>
              "{PRESETS.find(p => p.id === selectedPreset)?.query}"
            </div>
          </div>
        )}
      </div>

      {/* Right Column: AI Analysis Result Display */}
      <div className="xl:col-span-2 space-y-6">
        {loading && (
          <div className="bg-white border border-slate-250 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <Loader2 className="animate-spin text-green-700" size={32} />
            <div>
              <h4 className="font-serif font-bold text-slate-800 text-sm">Consulting the Cosmic Mappings</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                Gemini is synthesizing the Placidus cusps, checking the primary house sub-lords, and scanning the Vimshottari Dasa timeline...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-xs text-rose-800">
            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-900 block font-bold mb-0.5">Consultation Failed:</strong>
              {error}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-700">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-serif font-black text-sm text-slate-800">AI Consultation Analysis</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Krishnamurti Paddhati Synthesis Report
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-xs"
                title="Copy report to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={11} className="text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    Copy Report
                  </>
                )}
              </button>
            </div>

            {/* Formatted Markdown Box */}
            <div className="bg-[#fdfdfb] border border-amber-900/10 rounded-2xl p-5 text-left max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-950/20">
              {renderFormattedResult(result)}
            </div>
            
            <p className="text-[9.5px] text-slate-400 italic text-center leading-normal">
              Disclaimer: KP AI Consultation generates insights based on mathematical parameters. It is for spiritual support and personal review.
            </p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="bg-slate-50 border border-slate-250 border-dashed rounded-2xl p-8 text-center text-slate-500 font-serif min-h-[300px] flex flex-col items-center justify-center space-y-2">
            <MessageSquare size={32} className="text-slate-350" />
            <span className="text-xs font-bold">Astrology Consultation Sandbox</span>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              Use the control panel on the left to select or write a question. The AI Astrologer will evaluate the sub-lords, significations, and timing cycles to provide a detailed consultative report.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
