import { useState, useCallback, useEffect } from 'react';

const API_KEY_STORAGE_KEY = 'srvb_api_key';
const PROVIDER_STORAGE_KEY = 'srvb_llm_provider';

export type LLMProvider = 'anthropic';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

const VALID_PROVIDERS: LLMProvider[] = ['anthropic'];

function isValidProvider(value: string | null): value is LLMProvider {
  if (value === null) {
    return false;
  }
  return (VALID_PROVIDERS as readonly string[]).includes(value);
}

export function getStoredProvider(): LLMProvider {
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  return isValidProvider(stored) ? stored : 'anthropic';
}

export function hasApiKey(): boolean {
  const key = getStoredApiKey();
  return key !== null && key.length > 0;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<LLMProvider>('anthropic');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = getStoredApiKey();
      const storedProvider = getStoredProvider();
      setHasStoredKey(storedKey !== null && storedKey.length > 0);
      setApiKey(storedKey || '');
      setProvider(storedProvider);
      setTestResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = useCallback(() => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
      setHasStoredKey(true);
      setTestResult({ success: true, message: 'Settings saved' });
    }
  }, [apiKey, provider]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(PROVIDER_STORAGE_KEY);
    setApiKey('');
    setProvider('anthropic');
    setHasStoredKey(false);
    setTestResult(null);
  }, []);

  const handleTestConnection = useCallback(() => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Basic validation - check if the key has the expected format
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      setTestResult({ success: false, message: 'Invalid API key format for Anthropic' });
      setIsTesting(false);
      return;
    }

    // In a real implementation, this would call the LLM service to validate
    // For now, we just validate the format
    setTestResult({ success: true, message: 'API key format is valid' });
    setIsTesting(false);
  }, [apiKey, provider]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              LLM Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const value = e.target.value;
                if (isValidProvider(value)) {
                  setProvider(value);
                }
              }}
              className="w-full bg-slate-700 text-slate-100 rounded-md px-3 py-2 border border-slate-600 focus:border-pink-500 focus:outline-none"
            >
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
              {hasStoredKey && (
                <span className="ml-2 text-xs text-green-400">(saved)</span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasStoredKey ? '••••••••••••••••' : 'Enter your API key'}
              className="w-full bg-slate-700 text-slate-100 rounded-md px-3 py-2 border border-slate-600 focus:border-pink-500 focus:outline-none placeholder-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-md text-sm ${
                testResult.success
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-red-900/50 text-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey.trim()}
              className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-100 rounded-md px-4 py-2 transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md px-4 py-2 transition-colors"
            >
              Save
            </button>
          </div>

          {hasStoredKey && (
            <button
              onClick={handleClear}
              className="w-full text-sm text-slate-400 hover:text-red-400 transition-colors mt-2"
            >
              Clear stored API key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
