import React from 'react'
import ReactDOM from 'react-dom/client'
import Interface from './Interface.jsx'

import createHooks from 'zustand'
import createStore from 'zustand/vanilla'

import './index.css'


// Initial state management
const store = createStore(() => {});
const useStore = createHooks(store);

const errorStore = createStore(() => ({ error: null }));
const useErrorStore = createHooks(errorStore);

// Log store for console messages
const logStore = createStore(() => ({ logs: [] }));
const useLogStore = createHooks(logStore);

// Override console to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function addLog(level, ...args) {
  const timestamp = new Date().toLocaleTimeString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  logStore.setState((state) => ({
    logs: [...(state.logs || []).slice(-99), { timestamp, level, message }]
  }));
  
  // Also call original console methods
  if (level === 'log') originalConsoleLog(...args);
  else if (level === 'error') originalConsoleError(...args);
  else if (level === 'warn') originalConsoleWarn(...args);
}

console.log = (...args) => addLog('log', ...args);
console.error = (...args) => addLog('error', ...args);
console.warn = (...args) => addLog('warn', ...args);

// Interop bindings
function requestParamValueUpdate(paramId, value) {
  if (typeof globalThis.__postNativeMessage__ === 'function') {
    globalThis.__postNativeMessage__("setParameterValue", {
      paramId,
      value,
    });
  }
}

function updateDSPCode(code) {
  if (typeof globalThis.__postNativeMessage__ === 'function') {
    globalThis.__postNativeMessage__("updateDSPCode", code);
  }
}

if (process.env.NODE_ENV !== 'production') {
  import.meta.hot.on('reload-dsp', () => {
    console.log('Sending reload dsp message');

    if (typeof globalThis.__postNativeMessage__ === 'function') {
      globalThis.__postNativeMessage__('reload');
    }
  });
}

globalThis.__receiveStateChange__ = function(state) {
  store.setState(JSON.parse(state));
};

globalThis.__receiveError__ = (err) => {
  errorStore.setState({ error: err });
};

// Mount the interface
function App(props) {
  let state = useStore();
  let {error} = useErrorStore();
  let {logs = []} = useLogStore();

  return (
    <Interface
      {...state}
      error={error}
      logs={logs}
      requestParamValueUpdate={requestParamValueUpdate}
      updateDSPCode={updateDSPCode}
      resetErrorState={() => errorStore.setState({ error: null })}
      clearLogs={() => logStore.setState({ logs: [] })} />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Request initial processor state
if (typeof globalThis.__postNativeMessage__ === 'function') {
  globalThis.__postNativeMessage__("ready");
}
