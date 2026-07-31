const logger = require('./logger');

const GRANOLA_API_BASE = 'https://public-api.granola.ai';
const token = process.env.GRANOLA_API_TOKEN;

if (!token) {
  throw new Error('GRANOLA_API_TOKEN not set in .env');
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function get(endpoint) {
  try {
    const res = await fetch(`${GRANOLA_API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      throw new Error(`Granola API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    logger.error(`Granola API call failed: ${endpoint}`, { error: err.message });
    throw err;
  }
}

async function getNotes(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page_size) params.append('page_size', Math.min(filters.page_size, 30)); // Max 30
  if (filters.created_after) params.append('created_after', filters.created_after);
  if (filters.updated_after) params.append('updated_after', filters.updated_after);
  if (filters.cursor) params.append('cursor', filters.cursor);
  
  return get(`/v1/notes?${params.toString()}`);
}

async function getNote(noteId, includeTranscript = false) {
  const params = new URLSearchParams();
  if (includeTranscript) params.append('include', 'transcript');
  
  const queryStr = params.toString();
  return get(`/v1/notes/${noteId}${queryStr ? '?' + queryStr : ''}`);
}

module.exports = {
  getNotes,
  getNote,
};