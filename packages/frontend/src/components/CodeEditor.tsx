import { useCallback, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface CodeEditorProps {
  code: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

const darkTheme = {
  '&': {
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
  },
  '.cm-content': {
    caretColor: '#EC4899',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#EC4899',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#334155',
  },
  '.cm-gutters': {
    backgroundColor: '#0F172A',
    color: '#64748B',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1E293B',
  },
  '.cm-activeLine': {
    backgroundColor: '#1E293B40',
  },
};

export function CodeEditor({ code, onChange, readOnly = false, className = '' }: CodeEditorProps) {
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
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightSelectionMatches: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}

export default CodeEditor;
