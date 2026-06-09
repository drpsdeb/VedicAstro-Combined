import { getAuthHeaders } from './apiConfig.js';

// ============================================================================
// 🧠 KP ASTROLOGY AI SERVICE LAYER
// ============================================================================

/**
 * 2. AI Service Layer (Old helper)
 * Sends serialized KP chart data and the user's question to the Gemini API.
 * 
 * @param {object} serializedChartData - The JSON-serialized KP data from serializeKPData
 * @param {string} userQuestion - The question asked by the user
 * @param {string} geminiKey - The user's Gemini API Key
 * @param {string} [language='English'] - Language for the response
 * @returns {Promise<object>} Object containing { text: string } or { error: string }
 */
export async function fetchKPAiAnalysis(serializedChartData, userQuestion, geminiKey, language = 'English') {
  if (!geminiKey || String(geminiKey).trim().length < 10) {
    return { error: "Gemini API Key is not configured. Please add your key in the settings panel." };
  }
  if (!userQuestion || String(userQuestion).trim().length === 0) {
    return { error: "Please enter a valid question for the AI Astrologer." };
  }
  if (!serializedChartData) {
    return { error: "No chart data was provided for serialization." };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  // 1. Establish the system instructions defining the expert KP Astrologer
  const systemInstruction = `You are a highly skilled, professional Krishnamurti Paddhati (KP) Astrologer.
Your goal is to answer the user's question by performing a precise analysis of their serialized natal KP chart data.
Under KP rules, the final verdict of an event depends on:
1. Identifying the primary house cusp for the queried event (e.g. 7th house for marriage, 10th house for job promotion, 4th house for property, 12th for foreign travel, 5th for child birth, etc.) and its supporting houses.
2. Analyzing the Sub-Lord of that primary house cusp.
3. Seeing whether that cusp Sub-Lord is a significator of the primary or supporting houses. If it does, the event is promised.
4. Timing of the event: The event is triggered during the joint Dasa, Bhukti, and Antara periods of the significator planets of the relevant houses.

Structure your analysis using clean Markdown headings:
### 1. Promise Verdict
State clearly whether the queried event is promised in the natal chart (Yes, No, or Weak) based on the primary cusp's sub-lord significations.

### 2. Cusp and Significations Analysis
Detail the primary house cusp, its sub-lord, and the significator levels (A, B, C, D) for the relevant houses.

### 3. Favorable Timing (Dasa & Transits)
Identify which planets' Dasa, Bhukti, or Antara periods will be most favorable for triggering the event, and explain what transits (e.g., Jupiter, Saturn, or Sun crossing cusp degrees) to watch for.

### 4. Consultative Advice
Provide positive, actionable lifestyle guidelines or preventative Upayas based on the planetary alignments.

Keep the tone warm, consultative, and expert. Avoid making medical diagnostics or specific stock market predictions. You MUST write the response in ${language}.`;

  // 2. Build the payload wrapping user query and serialized JSON
  const prompt = `User Question: "${userQuestion}"
Preferred Language: "${language}"

Here is the serialized KP Chart Data (JSON):
\`\`\`json
${JSON.stringify(serializedChartData, null, 2)}
\`\`\`

Analyze the above data according to Krishnamurti Paddhati (KP) rules and answer the user question.`;

  // 3. Perform REST fetch with retry support
  const fetchWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw err;
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  };

  try {
    const data = await fetchWithRetry();
    if (data.error) {
      return { error: String(data.error.message || 'Gemini API Error') };
    }
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!textResult) {
      return { error: "Gemini returned an empty response. Please try rephrasing your question." };
    }
    return { text: String(textResult) };
  } catch (error) {
    console.error("Gemini KP AI request failed:", error);
    return { error: error.message || "Failed to communicate with Gemini. Check your network or API key." };
  }
}

/**
 * 2. AI Service Layer (New standard function)
 * Securely communicates with the Gemini REST API using saved credentials/headers from apiConfig.js.
 * 
 * @param {string|object} serializedChart - The JSON-serialized KP chart string (or object)
 * @param {string} userQuestion - The question asked by the native
 * @param {string} [language='English'] - Preferred response language
 * @returns {Promise<object>} Object containing { text: string } or { error: string }
 */
export async function fetchKPAiConsultation(serializedChart, userQuestion, language = 'English') {
  const headers = getAuthHeaders();
  const geminiKey = headers['x-api-key'] || localStorage.getItem('gemini_api_key') || localStorage.getItem('API_KEY');

  if (!geminiKey || String(geminiKey).trim().length < 10) {
    return { error: "Gemini API Key is not configured. Please set your credentials/API key in the settings panel." };
  }
  if (!userQuestion || String(userQuestion).trim().length === 0) {
    return { error: "Please enter a valid question for the AI Astrologer." };
  }
  if (!serializedChart) {
    return { error: "No chart data was provided for serialization." };
  }

  let chartJsonStr = serializedChart;
  if (typeof serializedChart === 'object') {
    chartJsonStr = JSON.stringify(serializedChart, null, 2);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  // Establish system instructions defining the expert KP Astrologer
  const systemInstruction = `You are a highly skilled, professional Krishnamurti Paddhati (KP) Astrologer.
Your goal is to answer the user's question by performing a precise analysis of their serialized natal KP chart data.
Under KP rules, the final verdict of an event depends on:
1. Identifying the primary house cusp for the queried event (e.g. 7th house for marriage, 10th house for job promotion, 4th house for property, 12th for foreign travel, 5th for child birth, etc.) and its supporting houses.
2. Analyzing the Sub-Lord of that primary house cusp.
3. Seeing whether that cusp Sub-Lord is a significator of the primary or supporting houses. If it does, the event is promised.
4. Timing of the event: The event is triggered during the joint Dasa, Bhukti, and Antara periods of the significator planets of the relevant houses.

Structure your analysis using clean Markdown headings:
### 1. Promise Verdict
State clearly whether the queried event is promised in the natal chart (Yes, No, or Weak) based on the primary cusp's sub-lord significations.

### 2. Cusp and Significations Analysis
Detail the primary house cusp, its sub-lord, and the significator levels (A, B, C, D) for the relevant houses.

### 3. Favorable Timing (Dasa & Transits)
Identify which planets' Dasa, Bhukti, or Antara periods will be most favorable for triggering the event, and explain what transits (e.g., Jupiter, Saturn, or Sun crossing cusp degrees) to watch for.

### 4. Consultative Advice
Provide positive, actionable lifestyle guidelines or preventative Upayas based on the planetary alignments.

Keep the tone warm, consultative, and expert. Avoid making medical diagnostics or specific stock market predictions. You MUST write the response in ${language}.`;

  const prompt = `User Question: "${userQuestion}"
Preferred Language: "${language}"

Here is the serialized KP Chart Data (JSON):
\`\`\`json
${chartJsonStr}
\`\`\`

Analyze the above data according to Krishnamurti Paddhati (KP) rules and answer the user question.`;

  const fetchWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw err;
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  };

  try {
    const data = await fetchWithRetry();
    if (data.error) {
      return { error: String(data.error.message || 'Gemini API Error') };
    }
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!textResult) {
      return { error: "Gemini returned an empty response. Please try rephrasing your question." };
    }
    return { text: String(textResult) };
  } catch (error) {
    console.error("Gemini KP AI Consultation request failed:", error);
    return { error: error.message || "Failed to communicate with Gemini. Check your network or API key." };
  }
}
