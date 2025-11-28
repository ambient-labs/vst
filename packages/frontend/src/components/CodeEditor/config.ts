export const darkTheme = {
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
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
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

export const basicSetupConfig = {
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
};
