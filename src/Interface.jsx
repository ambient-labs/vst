import React, { useState } from 'react';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/20/solid'

import Knob from './Knob.jsx';

import manifest from '../public/manifest.json';


// Generated from Lockup.svg using svgr, and then I changed the generated code
// a bit to use a currentColor fill on the text path, and to move the strokeLinejoin/cap
// style properties to actual dom attributes because somehow that was causing problems
function ErrorAlert({message, reset}) {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-red-800">{message}</p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={reset}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// The interface of our plugin, exported here as a React.js function
// component.
//
// We use the `props.requestParamValueUpdate` callback provided by the parent
// component to propagate new parameter values to the host.
export default function Interface(props) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      // TODO: Replace with actual LLM API call
      // For now, this is a placeholder that will need to be configured
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        alert('Please set VITE_OPENAI_API_KEY in your .env file or environment variables');
        setIsGenerating(false);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert in Elementary Audio, a JavaScript audio processing library. 
              Generate complete, runnable Elementary audio code. The code should:
              - Import from '@elemaudio/core': { Renderer, el }
              - Create a Renderer instance: let core = new Renderer((batch) => { __postNativeMessage__(JSON.stringify(batch)); });
              - Define globalThis.__receiveStateChange__ to handle state updates
              - Use el.in({ channel: 0 }) and el.in({ channel: 1 }) for stereo input
              - Return stereo output via core.render(leftOutput, rightOutput)
              - Include globalThis.__receiveHydrationData__ if needed
              Return ONLY the JavaScript code, no markdown formatting.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const generatedCode = data.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      const cleanCode = generatedCode.replace(/^```javascript\n?/g, '').replace(/^```js\n?/g, '').replace(/^```\n?/g, '').replace(/```$/g, '').trim();
      
      if (props.updateDSPCode) {
        props.updateDSPCode(cleanCode);
      }
      setPrompt('');
    } catch (error) {
      console.error('Error generating code:', error);
      alert('Failed to generate code. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const colorProps = {
    meterColor: '#EC4899',
    knobColor: '#64748B',
    thumbColor: '#F8FAFC',
  };

  let params = manifest.parameters.map(({paramId, name, min, max, defaultValue}) => {
    let currentValue = props[paramId] || 0;

    return {
      paramId,
      name,
      value: currentValue,
      readout: `${Math.round(currentValue * 100)}%`,
      setValue: (v) => props.requestParamValueUpdate(paramId, v),
    };
  });

  return (
    <div className="w-full h-screen min-w-[492px] min-h-[238px] bg-slate-800 bg-mesh p-8">
      <div className="flex flex-col h-4/5">
        <div className="flex flex-1">
          {params.map(({name, value, readout, setValue}) => (
            <div key={name} className="flex flex-col flex-1 justify-center items-center">
              <Knob className="h-20 w-20 m-4" value={value} onChange={setValue} {...colorProps} />
              <div className="flex-initial mt-2">
                <div className="text-sm text-slate-50 text-center font-light">{name}</div>
                <div className="text-sm text-pink-500 text-center font-light">{readout}</div>
              </div>
            </div>
          ))}
        </div>
        {/* LLM Code Generator */}
        <div className="mt-4 border-t border-slate-700 pt-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">AI Code Generator</h3>
          <div className="flex flex-col gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the audio effect you want... (e.g., 'a phaser with feedback')"
              className="w-full bg-slate-900 text-slate-300 rounded p-2 text-sm font-mono resize-none"
              rows={3}
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded text-sm font-medium transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </div>
        {/* Console Log Viewer */}
        {props.logs && props.logs.length > 0 && (
          <div className="mt-4 border-t border-slate-700">
            <div className="flex justify-between items-center p-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase">Console Logs ({props.logs.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    const logText = props.logs.map((log) => 
                      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
                    ).join('\n');
                    navigator.clipboard.writeText(logText).then(() => {
                      // Show brief feedback
                      const btn = e.target;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 1000);
                    }).catch(err => {
                      console.error('Failed to copy logs:', err);
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1"
                >
                  Copy
                </button>
                <button
                  onClick={props.clearLogs}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded p-3 max-h-48 overflow-y-auto">
              <code className="text-xs font-mono text-slate-300 block whitespace-pre-wrap">
                {props.logs.map((log, i) => (
                  <span key={i} className={`block ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    'text-slate-300'
                  }`}>
                    [{log.timestamp}] {log.level.toUpperCase()}: {log.message}
                  </span>
                ))}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
