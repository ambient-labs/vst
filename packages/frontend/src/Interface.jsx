import { useState, useEffect } from 'react';
import Knob from './Knob.jsx';
import { Settings, hasApiKey } from './components/Settings.tsx';

import manifest from '../public/manifest.json';

// The interface of our plugin, exported here as a React.js function
// component.
//
// We use the `props.requestParamValueUpdate` callback provided by the parent
// component to propagate new parameter values to the host.
export default function Interface(props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);

  useEffect(() => {
    setApiKeySet(hasApiKey());
  }, [settingsOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl+K to open settings
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const colorProps = {
    meterColor: '#EC4899',
    knobColor: '#64748B',
    thumbColor: '#F8FAFC',
  };

  const params = manifest.parameters.map(({paramId, name}) => {
    const currentValue = props[paramId] || 0;

    return {
      paramId,
      name,
      value: currentValue,
      readout: `${Math.round(currentValue * 100)}%`,
      setValue: (v) => props.requestParamValueUpdate(paramId, v),
    };
  });

  return (
    <>
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-3 right-3 p-2 text-slate-400 hover:text-pink-400 transition-colors"
        title="Settings (Cmd/Ctrl+K)"
        aria-label="Open settings"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {!apiKeySet && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>
      {params.map(({name, value, readout, setValue}) => (
        <div key={name} className="flex flex-col flex-1 justify-center items-center">
          <Knob className="h-20 w-20 m-4" value={value} onChange={setValue} {...colorProps} />
          <div className="flex-initial mt-2">
            <div className="text-sm text-pink-500 text-center font-light">{name}</div>
            <div className="text-sm text-pink-500 text-center font-light">{readout}</div>
          </div>
        </div>
      ))}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
