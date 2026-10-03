// API client — all communication with FastAPI backend
// CONSTITUTION RULE: Never fabricate data. If API fails, surface the error clearly.

import axios from 'axios';

const SESSION_STORAGE_KEY = 'market-analytics-session-id';
const sessionClients = new Map();
let fallbackUserSessionId = null;

const generateSessionId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export function getUserSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = generateSessionId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch (error) {
    console.error('Could not persist the analytics session ID:', error);
    if (!fallbackUserSessionId) fallbackUserSessionId = generateSessionId();
    return fallbackUserSessionId;
  }
}

export function createSessionId() {
  return generateSessionId();
}

export function getSessionApiClient(sessionId) {
  if (!sessionClients.has(sessionId)) {
    const api = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: { 'X-Session-ID': sessionId },
    });

    api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const detail = error.response?.data?.detail || error.message || 'Unknown error';
        const apiError = new Error(detail);
        apiError.status = error.response?.status;
        return Promise.reject(apiError);
      }
    );

    sessionClients.set(sessionId, {
      health: () => api.get('/health'),
      uploadCSV: (file, sourceDescription, columnMapping) => {
        const form = new FormData();
        form.append('file', file);
        form.append('source_description', sourceDescription || 'User-provided dataset');
        if (columnMapping) form.append('column_mapping', JSON.stringify(columnMapping));
        return api.post('/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      },
      loadDemo: () => api.get('/demo'),
      getDataset: () => api.get('/dataset'),
      getDatasetFull: () => api.get('/dataset/full'),
      getDescriptive: () => api.get('/descriptive'),
      getCorrelation: () => api.get('/correlation'),
      getRegression: (testFraction = 0.20) =>
        api.get(`/regression?test_fraction=${testFraction}`),
      getReport: (testFraction = 0.20) =>
        api.get(`/report?test_fraction=${testFraction}`),
    });
  }
  return sessionClients.get(sessionId);
}

export const apiClient = getSessionApiClient(getUserSessionId());
