import { useState, useCallback, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  isStreaming?: boolean;
  error?: string;
}

interface ChatInterfaceProps {
  onApplyCode: (code: string) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="bg-pink-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  code,
  isStreaming,
  error,
  onApplyCode,
}: {
  content: string;
  code?: string;
  isStreaming?: boolean;
  error?: string;
  onApplyCode: (code: string) => void;
}) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-slate-700 text-slate-100 rounded-lg px-4 py-2 max-w-[80%]">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">
              {content}
              {isStreaming && <span className="animate-pulse">▊</span>}
            </p>
            {code && !isStreaming && (
              <div className="mt-3 border-t border-slate-600 pt-3">
                <pre className="bg-slate-800 rounded p-3 text-xs overflow-x-auto mb-2">
                  <code>{code}</code>
                </pre>
                <button
                  onClick={() => onApplyCode(code)}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-white text-sm rounded px-3 py-1.5 transition-colors"
                >
                  Apply Code
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ChatInterface({ onApplyCode, hasApiKey, onOpenSettings }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) {
        return;
      }

      if (!hasApiKey) {
        onOpenSettings();
        return;
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: input.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      // Create streaming assistant message
      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          isStreaming: true,
        },
      ]);

      try {
        // TODO: Replace with actual LLM service call (Issue #29)
        // This is a placeholder that simulates streaming
        const mockResponse = {
          content: `I'll create an audio effect based on your request: "${userMessage.content}"`,
          code: `// Generated DSP code for: ${userMessage.content}
import { el } from '@elemaudio/core';

export default function process(props, left, right) {
  const decay = props.decay || 0.5;

  // Apply processing based on the request
  const processedLeft = el.mul(left, el.sm(decay));
  const processedRight = el.mul(right, el.sm(decay));

  return [processedLeft, processedRight];
}`,
        };

        // Simulate streaming character by character
        let streamedContent = '';
        for (let i = 0; i < mockResponse.content.length; i++) {
          streamedContent += mockResponse.content[i];
          const currentContent = streamedContent;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: currentContent } : msg
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        // Complete the message with code
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: mockResponse.content, code: mockResponse.code, isStreaming: false }
              : msg
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, error: errorMessage, isStreaming: false } : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, hasApiKey, onOpenSettings]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-center p-4">
            <div>
              <p className="text-lg mb-2">Describe your audio effect</p>
              <p className="text-sm">
                e.g., "Create a reverb with decay control" or "Make a tremolo effect"
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === 'user' ? (
                <UserMessage key={msg.id} content={msg.content} />
              ) : (
                <AssistantMessage
                  key={msg.id}
                  content={msg.content}
                  code={msg.code}
                  isStreaming={msg.isStreaming}
                  error={msg.error}
                  onApplyCode={onApplyCode}
                />
              )
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-slate-700 p-4">
        {!hasApiKey && (
          <div className="mb-2 text-center">
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-sm text-pink-400 hover:text-pink-300"
            >
              Set up your API key to start chatting
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? 'Describe your audio effect...' : 'API key required'}
            disabled={!hasApiKey || isLoading}
            className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 placeholder-slate-500"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasApiKey}
            className="bg-pink-600 hover:bg-pink-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 py-2 transition-colors"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatInterface;
