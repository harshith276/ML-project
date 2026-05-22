import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, AlertCircle, Trash2, Zap } from 'lucide-react';

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How many customers are in each segment?',
  'Which segment has the highest average spend?',
  'What should I do about At-Risk customers?',
  'Give me a summary of all segments.',
  'How many outliers are in the database?',
  'Which segment is most at risk of churn?',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
        <Bot size={13} className="text-teal-600" />
      </div>
      <div className="bg-white dark:bg-[#1A1E2E] border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 typing-dot" />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="max-w-[75%] bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed">{msg.content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
          <User size={13} className="text-slate-600 dark:text-slate-300" />
        </div>
      </div>
    );
  }

  if (msg.role === 'error') {
    return (
      <div className="flex items-start gap-2 justify-start">
        <div className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle size={13} className="text-red-500" />
        </div>
        <div className="max-w-[75%] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
        <Bot size={13} className="text-teal-600" />
      </div>
      <div className="max-w-[75%] bg-white dark:bg-[#1A1E2E] border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
        <Bot size={32} className="text-teal-300" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">
          Ask me anything about your customers
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          I have live access to your segment data and can answer questions
          about customers, revenue, and marketing tactics.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-full hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all duration-200"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function AiChat() {
  // messages: { role: 'user' | 'assistant' | 'error', content: string }[]
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef             = useRef(null);
  const textareaRef                = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const sendMessage = async (question) => {
    const q = (question ?? input).trim();
    if (!q || isLoading) return;

    // Append user message immediately
    const userMsg = { role: 'user', content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
    setIsLoading(true);

    try {
      // Build the payload: include only user/assistant messages for context
      // (exclude 'error' role entries from history sent to backend)
      const history = updatedMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('https://segmentiq-api.onrender.com/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      let friendly = err.message;
      if (friendly.includes('fetch') || friendly.includes('Failed to fetch')) {
        friendly =
          'Cannot reach the backend. Make sure FastAPI is running:\n' +
          'uvicorn backend.main:app --reload --port 8000';
      } else if (friendly.toLowerCase().includes('ollama')) {
        friendly =
          'Ollama is not running. Start it with:\n' +
          '  ollama serve\n' +
          'Then ensure the model is pulled:\n' +
          '  ollama pull qwen2.5-coder:1.5b';
      }
      setMessages(prev => [...prev, { role: 'error', content: friendly }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>

        {/* Chat Card */}
        <div className="bg-white dark:bg-[#12151F] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col flex-1 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                <Bot size={16} className="text-teal-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">SegmentIQ AI</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Zap size={10} className="text-amber-400" />
                  Powered by Ollama · 100% local · No data egress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs text-teal-600 font-medium">Online</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && !isLoading ? (
              <EmptyState onSuggestion={q => sendMessage(q)} />
            ) : (
              <>
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent px-4 py-3">
            <div className="flex items-end gap-2 bg-white dark:bg-[#1A1E2E] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all duration-200">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your segments, customers, or marketing strategy..."
                disabled={isLoading}
                className="flex-1 resize-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent focus:outline-none max-h-36 py-1 disabled:opacity-60"
                style={{ height: '36px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 mb-0.5"
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Enter</kbd> to send ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
