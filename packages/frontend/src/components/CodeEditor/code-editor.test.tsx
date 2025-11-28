import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeEditor } from './code-editor.tsx';

// Mock CodeMirror since it requires DOM APIs not available in jsdom
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange, editable }: { value: string; onChange?: (v: string) => void; editable?: boolean }) => (
    <textarea
      data-testid="codemirror-mock"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={!editable}
    />
  ),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with provided code', () => {
    const code = 'const x = 1;';
    render(<CodeEditor code={code} />);

    const editor = screen.getByTestId('codemirror-mock');
    expect(editor).toHaveValue(code);
  });

  it('calls onChange when code is modified', () => {
    const onChange = vi.fn();
    render(<CodeEditor code="initial" onChange={onChange} />);

    const editor = screen.getByTestId('codemirror-mock');
    fireEvent.change(editor, { target: { value: 'modified' } });

    expect(onChange).toHaveBeenCalledWith('modified');
  });

  it('renders in read-only mode when readOnly is true', () => {
    render(<CodeEditor code="const x = 1;" readOnly={true} />);

    const editor = screen.getByTestId('codemirror-mock');
    expect(editor).toHaveAttribute('readonly');
  });

  it('renders copy button', () => {
    render(<CodeEditor code="const x = 1;" />);

    const copyButton = screen.getByTitle('Copy to clipboard');
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveTextContent('Copy');
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    const code = 'const x = 1;';
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(<CodeEditor code={code} />);

    const copyButton = screen.getByTitle('Copy to clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(code);
    });
  });

  it('shows "Copied!" feedback after successful copy', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(<CodeEditor code="test" />);

    const copyButton = screen.getByTitle('Copy to clipboard');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(copyButton).toHaveTextContent('Copied!');
    });
  });

  it('applies custom className', () => {
    const { container } = render(<CodeEditor code="test" className="custom-class" />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });
});
