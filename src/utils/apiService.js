import { getAuthHeaders } from './apiConfig.js';

/**
 * Service function to fetch planetary positions from astrologyapi.com
 * @param {Object} birthData - Birth details (dob, time, lat, lon, tzone)
 * @returns {Promise<Object>} AstrologyAPI planetary response data
 */
export async function fetchPlanetaryData(birthData) {
  const headers = getAuthHeaders();

  // If credentials are missing, throw the required error message
  if (!headers['x-api-key'] || !headers['x-api-user']) {
    throw new Error('Please set your API credentials in Settings');
  }

  if (!birthData || !birthData.dob || !birthData.time) {
    throw new Error('Invalid birth data provided. Require dob and time.');
  }

  // Parse birthData fields (dob: 'YYYY-MM-DD', time: 'HH:MM')
  const [year, month, day] = birthData.dob.split('-').map(Number);
  const timeStr = birthData.time || birthData.tob || '12:00';
  const [hour, min] = timeStr.split(':').map(Number);
  const lat = Number(birthData.lat ?? 0);
  const lon = Number(birthData.lon ?? 0);
  const tzone = Number(birthData.tzone ?? birthData.tz ?? 5.5);

  const payload = {
    day,
    month,
    year,
    hour,
    min,
    lat,
    lon,
    tzone
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const targetUrl = isLocalhost
    ? '/api/v1/planets'
    : `https://corsproxy.io/?url=${encodeURIComponent('https://json.astrologyapi.com/v1/planets')}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.msg || errorData?.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
