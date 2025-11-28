export interface CodeEditorProps {
  code: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}
