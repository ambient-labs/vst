import { useCallback, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { darkTheme, basicSetupConfig } from './config';
import type { CodeEditorProps } from './types';

export type { CodeEditorProps } from './types';

export function CodeEditor({
  code,
  onChange,
  readOnly = false,
  className = '',
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  const handleChange = useCallback(
    (value: string) => {
      if (onChange) {
        onChange(value);
      }
    },
    [onChange]
  );

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <CodeMirror
        value={code}
        height="auto"
        minHeight="100px"
        maxHeight="400px"
        extensions={[javascript({ jsx: true })]}
        onChange={handleChange}
        editable={!readOnly}
        theme={darkTheme}
        basicSetup={basicSetupConfig}
      />
    </div>
  );
}

export default CodeEditor;
