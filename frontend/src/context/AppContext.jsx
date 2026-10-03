// Global application context — manages dataset state and analysis results
// No fabricated defaults; all values start as null until computed

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { apiClient, createSessionId, getSessionApiClient, getUserSessionId } from '../api';
import { GUIDED_DEMO_STEPS } from '../guidedDemo';

const AppContext = createContext(null);

const GUIDED_DEMO_STORAGE_KEY = 'market-analytics-guided-demo';

function getModuleFromLocation() {
  if (window.location.pathname === '/regression') return 'regression';
  if (window.location.pathname === '/evaluation' || window.location.pathname === '/model-evaluation') {
    return 'evaluation';
  }
  return 'landing';
}

function readSavedGuidedDemo() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(GUIDED_DEMO_STORAGE_KEY));
    if (
      saved?.active === true &&
      typeof saved.sessionId === 'string' &&
      Number.isInteger(saved.step) &&
      saved.step >= 0 &&
      saved.step < GUIDED_DEMO_STEPS.length
    ) {
      return {
        active: true,
        sessionId: saved.sessionId,
        step: saved.step,
        returnModule: saved.returnModule || 'landing',
        currentModule: saved.currentModule || GUIDED_DEMO_STEPS[saved.step].module,
        error: null,
      };
    }
  } catch (error) {
    console.error('Could not restore the Guided Demo session:', error);
  }
  return { active: false, sessionId: null, step: 0, returnModule: 'landing', currentModule: 'landing', error: null };
}

const savedGuidedDemo = readSavedGuidedDemo();
const initialState = {
  // Data
  dataset: null,         // AnalyticalDataset metadata
  datasetFull: null,     // includes full arrays
  dataLoading: false,
  dataError: null,

  // Analysis results
  descriptive: null,
  correlation: null,
  regression: null,
  report: null,

  // UI state
  beginnerMode: true,
  testFraction: 0.20,
  activeModule: savedGuidedDemo.active ? savedGuidedDemo.currentModule : getModuleFromLocation(),
  guidedDemo: savedGuidedDemo,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, dataLoading: action.payload, dataError: null };
    case 'SET_DATASET':
      return {
        ...state,
        dataset: action.payload,
        dataLoading: false,
        dataError: null,
        // Clear analysis when dataset changes
        descriptive: null,
        correlation: null,
        regression: null,
        report: null,
      };
    case 'SET_DATASET_FULL':
      return { ...state, datasetFull: action.payload };
    case 'SET_DATA_ERROR':
      return { ...state, dataError: action.payload, dataLoading: false };
    case 'SET_DESCRIPTIVE':
      return { ...state, descriptive: action.payload };
    case 'SET_CORRELATION':
      return { ...state, correlation: action.payload };
    case 'SET_REGRESSION':
      return { ...state, regression: action.payload };
    case 'SET_REPORT':
      return { ...state, report: action.payload };
    case 'SET_BEGINNER_MODE':
      return { ...state, beginnerMode: action.payload };
    case 'SET_TEST_FRACTION':
      return { ...state, testFraction: action.payload, regression: null };
    case 'SET_ACTIVE_MODULE':
      return {
        ...state,
        activeModule: action.payload,
        guidedDemo: state.guidedDemo.active
          ? { ...state.guidedDemo, currentModule: action.payload }
          : state.guidedDemo,
      };
    case 'START_GUIDED_DEMO':
      return {
        ...state,
        dataset: null,
        datasetFull: null,
        descriptive: null,
        correlation: null,
        regression: null,
        report: null,
        dataLoading: true,
        dataError: null,
        activeModule: 'landing',
        guidedDemo: {
          active: true,
          sessionId: action.sessionId,
          step: 0,
          returnModule: action.returnModule,
          currentModule: 'landing',
          error: null,
        },
      };
    case 'SET_GUIDED_DEMO_STEP': {
      const step = Math.max(0, Math.min(GUIDED_DEMO_STEPS.length - 1, action.step));
      const module = GUIDED_DEMO_STEPS[step].module;
      return {
        ...state,
        activeModule: module,
        guidedDemo: { ...state.guidedDemo, step, currentModule: module, error: null },
      };
    }
    case 'SET_GUIDED_DEMO_ERROR':
      return {
        ...state,
        dataLoading: false,
        guidedDemo: { ...state.guidedDemo, error: action.message },
      };
    case 'CLEAR_GUIDED_DEMO_ERROR':
      return { ...state, guidedDemo: { ...state.guidedDemo, error: null } };
    case 'END_GUIDED_DEMO':
      return {
        ...action.state,
        activeModule: action.destination || action.state.activeModule,
        guidedDemo: {
          active: false,
          sessionId: null,
          step: 0,
          returnModule: 'landing',
          currentModule: action.destination || action.state.activeModule,
          error: null,
        },
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const userStateSnapshot = useRef(null);
  const recoveredDemoSession = useRef(false);
  const hydratedUserSession = useRef(!!savedGuidedDemo.active);
  const startingGuidedDemo = useRef(false);
  const activeSessionIdRef = useRef(
    state.guidedDemo.active ? state.guidedDemo.sessionId : getUserSessionId()
  );

  useEffect(() => {
    try {
      if (state.guidedDemo.active) {
        sessionStorage.setItem(GUIDED_DEMO_STORAGE_KEY, JSON.stringify(state.guidedDemo));
      } else {
        sessionStorage.removeItem(GUIDED_DEMO_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Could not persist the Guided Demo session:', error);
    }
  }, [state.guidedDemo]);

  useEffect(() => {
    const syncModuleFromLocation = () => {
      if (state.guidedDemo.active) return;
      dispatch({ type: 'SET_ACTIVE_MODULE', payload: getModuleFromLocation() });
    };
    window.addEventListener('popstate', syncModuleFromLocation);
    return () => window.removeEventListener('popstate', syncModuleFromLocation);
  }, [state.guidedDemo.active]);

  useEffect(() => {
    if (state.guidedDemo.active || state.dataset || hydratedUserSession.current) return;
    hydratedUserSession.current = true;
    const sessionId = getUserSessionId();
    apiClient.getDataset()
      .then((dataset) => {
        if (activeSessionIdRef.current === sessionId) {
          dispatch({ type: 'SET_DATASET', payload: dataset });
        }
      })
      .catch((error) => {
        if (error.status !== 404 && activeSessionIdRef.current === sessionId) {
          console.error('Could not restore the user dataset:', error);
        }
      });
  }, [state.guidedDemo.active, state.dataset]);

  useEffect(() => {
    if (!state.guidedDemo.active || state.dataset || recoveredDemoSession.current) return;
    recoveredDemoSession.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });
    const demoApi = getSessionApiClient(state.guidedDemo.sessionId);
    const sessionId = state.guidedDemo.sessionId;
    demoApi.getDataset()
      .catch((error) => {
        if (error.status === 404) return demoApi.loadDemo();
        throw error;
      })
      .then((dataset) => {
        if (activeSessionIdRef.current === sessionId) {
          dispatch({ type: 'SET_DATASET', payload: dataset });
        }
      })
      .catch((error) => {
        if (activeSessionIdRef.current === sessionId) {
          dispatch({ type: 'SET_GUIDED_DEMO_ERROR', message: error.message });
        }
      });
  }, [state.guidedDemo.active, state.guidedDemo.sessionId, state.dataset]);

  const loadDemo = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const ds = await getSessionApiClient(sessionId).loadDemo();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_DATASET', payload: ds });
    } catch (err) {
      if (activeSessionIdRef.current === sessionId) {
        dispatch({ type: 'SET_DATA_ERROR', payload: err.message });
      }
    }
  }, []);

  const uploadCSV = useCallback(async (file, sourceDescription, colMapping) => {
    const sessionId = activeSessionIdRef.current;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const ds = await getSessionApiClient(sessionId).uploadCSV(file, sourceDescription, colMapping);
      if (activeSessionIdRef.current !== sessionId) return ds;
      dispatch({ type: 'SET_DATASET', payload: ds });
      return ds;
    } catch (err) {
      if (activeSessionIdRef.current === sessionId) {
        dispatch({ type: 'SET_DATA_ERROR', payload: err.message });
      }
      throw err;
    }
  }, []);

  const loadDatasetFull = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    try {
      const full = await getSessionApiClient(sessionId).getDatasetFull();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_DATASET_FULL', payload: full });
    } catch (err) {
      if (activeSessionIdRef.current === sessionId) {
        console.error('Could not load full dataset:', err);
      }
    }
  }, []);

  const runDescriptive = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    try {
      const result = await getSessionApiClient(sessionId).getDescriptive();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_DESCRIPTIVE', payload: result });
    } catch (err) {
      if (activeSessionIdRef.current !== sessionId) return;
      console.error('Descriptive statistics failed:', err);
      throw err;
    }
  }, []);

  const runCorrelation = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    try {
      const result = await getSessionApiClient(sessionId).getCorrelation();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_CORRELATION', payload: result });
    } catch (err) {
      if (activeSessionIdRef.current !== sessionId) return;
      console.error('Correlation failed:', err);
      throw err;
    }
  }, []);

  const runRegression = useCallback(async (testFraction) => {
    const sessionId = activeSessionIdRef.current;
    try {
      const tf = testFraction ?? state.testFraction;
      const result = await getSessionApiClient(sessionId).getRegression(tf);
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_REGRESSION', payload: result });
    } catch (err) {
      if (activeSessionIdRef.current !== sessionId) return;
      console.error('Regression failed:', err);
      throw err;
    }
  }, [state.testFraction]);

  const runReport = useCallback(async (testFraction) => {
    const sessionId = activeSessionIdRef.current;
    const result = await getSessionApiClient(sessionId).getReport(testFraction ?? state.testFraction);
    if (activeSessionIdRef.current !== sessionId) return null;
    dispatch({ type: 'SET_REPORT', payload: result });
    return result;
  }, [state.testFraction]);

  const startGuidedDemo = useCallback(async () => {
    if (startingGuidedDemo.current) return;
    startingGuidedDemo.current = true;
    let userSnapshot = state;
    if (!userSnapshot.dataset) {
      try {
        const userDataset = await apiClient.getDataset();
        userSnapshot = { ...state, dataset: userDataset };
      } catch (error) {
        if (error.status !== 404) {
          console.error('Could not preserve the current user dataset before Guided Demo:', error);
        }
      }
    }
    const sessionId = createSessionId();
    userStateSnapshot.current = userSnapshot;
    recoveredDemoSession.current = true;
    activeSessionIdRef.current = sessionId;
    dispatch({
      type: 'START_GUIDED_DEMO',
      sessionId,
      returnModule: state.activeModule,
    });
    try {
      sessionStorage.setItem(GUIDED_DEMO_STORAGE_KEY, JSON.stringify({
        active: true,
        sessionId,
        step: 0,
        returnModule: state.activeModule,
        currentModule: 'landing',
        error: null,
      }));
    } catch (error) {
      console.error('Could not persist the Guided Demo session:', error);
    }

    try {
      const demoDataset = await getSessionApiClient(sessionId).loadDemo();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_DATASET', payload: demoDataset });
    } catch (error) {
      if (activeSessionIdRef.current === sessionId) {
        dispatch({ type: 'SET_GUIDED_DEMO_ERROR', message: error.message });
      }
    } finally {
      startingGuidedDemo.current = false;
    }
  }, [state]);

  const setGuidedDemoStep = useCallback((step) => {
    dispatch({ type: 'SET_GUIDED_DEMO_STEP', step });
  }, []);

  const retryGuidedDemo = useCallback(async () => {
    const sessionId = state.guidedDemo.sessionId;
    dispatch({ type: 'CLEAR_GUIDED_DEMO_ERROR' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const demoDataset = await getSessionApiClient(sessionId).loadDemo();
      if (activeSessionIdRef.current !== sessionId) return;
      dispatch({ type: 'SET_DATASET', payload: demoDataset });
    } catch (error) {
      if (activeSessionIdRef.current === sessionId) {
        dispatch({ type: 'SET_GUIDED_DEMO_ERROR', message: error.message });
      }
    }
  }, [state.guidedDemo.sessionId]);

  const exitGuidedDemo = useCallback(async (destination) => {
    const returnModule = destination || state.guidedDemo.returnModule || 'landing';
    if (userStateSnapshot.current) {
      const snapshot = userStateSnapshot.current;
      userStateSnapshot.current = null;
      activeSessionIdRef.current = getUserSessionId();
      dispatch({ type: 'END_GUIDED_DEMO', state: snapshot, destination: returnModule });
      return;
    }

    const demoSessionId = state.guidedDemo.sessionId;
    try {
      const dataset = await apiClient.getDataset();
      if (activeSessionIdRef.current !== demoSessionId) return;
      activeSessionIdRef.current = getUserSessionId();
      dispatch({
        type: 'END_GUIDED_DEMO',
        state: { ...initialState, dataset, activeModule: returnModule },
        destination: returnModule,
      });
    } catch (error) {
      if (activeSessionIdRef.current !== demoSessionId) return;
      if (error.status !== 404) {
        dispatch({ type: 'SET_GUIDED_DEMO_ERROR', message: error.message });
        return;
      }
      activeSessionIdRef.current = getUserSessionId();
      dispatch({
        type: 'END_GUIDED_DEMO',
        state: { ...initialState, activeModule: returnModule },
        destination: returnModule,
      });
    }
  }, [state.guidedDemo.returnModule, state.guidedDemo.sessionId]);

  const setBeginnerMode = useCallback((val) => {
    dispatch({ type: 'SET_BEGINNER_MODE', payload: val });
  }, []);

  const setTestFraction = useCallback((val) => {
    dispatch({ type: 'SET_TEST_FRACTION', payload: val });
  }, []);

  const setActiveModule = useCallback((val) => {
    if (!state.guidedDemo.active) {
      const routes = {
        regression: '/regression',
        evaluation: '/evaluation',
      };
      const route = routes[val];
      if (route && window.location.pathname !== route) {
        window.history.pushState({ module: val }, '', route);
      } else if (
        !route &&
        ['/regression', '/evaluation', '/model-evaluation'].includes(window.location.pathname)
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
    dispatch({ type: 'SET_ACTIVE_MODULE', payload: val });
  }, [state.guidedDemo.active]);

  const value = {
    ...state,
    loadDemo,
    uploadCSV,
    loadDatasetFull,
    runDescriptive,
    runCorrelation,
    runRegression,
    runReport,
    setBeginnerMode,
    setTestFraction,
    setActiveModule,
    startGuidedDemo,
    setGuidedDemoStep,
    retryGuidedDemo,
    exitGuidedDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
