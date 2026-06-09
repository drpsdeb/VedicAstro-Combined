export function getAuthHeaders() {
  const apiKey = localStorage.getItem('astrology_api_key') || localStorage.getItem('API_KEY');
  const userId = localStorage.getItem('astrology_user_id') || localStorage.getItem('USER_ID');

  if (!apiKey || !userId) {
    return {}; // Return empty if not configured
  }

  let base64Credentials = '';
  const rawCreds = `${userId}:${apiKey}`;

  // Create base64 string
  if (typeof btoa === 'function') {
    base64Credentials = btoa(rawCreds);
  } else {
    base64Credentials = Buffer.from(rawCreds).toString('base64');
  }

  // --- ADD THIS RETURN STATEMENT ---
  return {
    'Authorization': `Basic ${base64Credentials}`,
    'x-api-key': apiKey,
    'x-api-user': userId
  };
}