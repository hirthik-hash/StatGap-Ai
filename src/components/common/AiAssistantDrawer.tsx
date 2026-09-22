import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import {
  aiAssistantService,
  AssistantCitation,
  AssistantFollowup,
  AssistantQueryResponse,
  SuggestionItem,
} from '../../services/aiAssistantService';
import { User } from '../../types';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onNavigateToPage?: (page: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: AssistantCitation[];
  groundingStatus?: 'GROUNDED' | 'WEAKLY_GROUNDED' | 'INSUFFICIENT_EVIDENCE';
  confidenceScore?: number;
  followups?: AssistantFollowup[];
  suggestedQueries?: string[];
  disclaimer?: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onNavigateToPage,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [roleTitle, setRoleTitle] = useState('Statistical Officer');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load proactive suggestions on initial open
  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const loadSuggestions = async () => {
    try {
      const data = await aiAssistantService.getSuggestions(user.id);
      setSuggestions(data.suggestions || []);
      setRoleTitle(data.role_title || user.role || 'Officer');
    } catch (err) {
      // Fallback suggestions
      setSuggestions([
        {
          category: 'Standard Operating Procedure',
          title: 'ASHE Sampling Guidelines',
          query: 'What are the strata allocation rules for Annual Survey of Unincorporated Sector Enterprises (ASUSE)?',
        },
        {
          category: 'Diagnostic Support',
          title: 'Index Number Formulae',
          query: 'Explain the difference between Laspeyres and Paasche index weights in CPI calculation.',
        },
        {
          category: 'Training Intervention',
          title: 'Recommended Modules',
          query: 'What training courses on iGOT are recommended for Survey Sampling Design?',
        },
      ]);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || queryInput).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQueryInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.sender,
        content: m.text,
      }));

      const res: AssistantQueryResponse = await aiAssistantService.askAssistant({
        query: text,
        officer_id: user.id,
        conversation_history: history,
      });

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations,
        groundingStatus: res.grounding_status,
        confidenceScore: res.confidence_score,
        followups: res.followup_actions,
        suggestedQueries: res.suggested_queries,
        disclaimer: res.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: `Error contacting assistant: ${err.message || 'Service temporarily unavailable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingStatus: 'INSUFFICIENT_EVIDENCE',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0f172a] text-slate-100 h-full shadow-2xl flex flex-col border-l border-slate-700 animate-slide-left">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-[#1e293b]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">STAT-GAP AI Assistant</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700 rounded">
                  RAG Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                MoSPI Domain Expert · Role: <span className="text-slate-200">{roleTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
          {messages.length === 0 && (
            <div className="py-6 px-2 space-y-6">
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 text-slate-300">
                <div className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Role-Aware Statistical Assistant</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Ask questions regarding MoSPI survey methodologies, standard operating procedures,
                  statistical diagnostic concepts, competency requirements, or recommended iGOT/NSSTA training pathways.
                </p>
              </div>

              {/* Suggestions */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Suggested Inquiries for Your Cadre</span>
                </div>
                <div className="space-y-2">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="w-full text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-all hover:border-blue-500/50 group flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-medium text-blue-300 mb-0.5">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-2">{item.query}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl p-3.5 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}
              >
                {/* Header for assistant */}
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-700/60 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>STAT-GAP AI</span>
                    </div>

                    {/* Grounding Badge */}
                    {msg.groundingStatus === 'GROUNDED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Grounded (
                        {Math.round((msg.confidenceScore || 0.8) * 100)}%)
                      </span>
                    )}
                    {msg.groundingStatus === 'WEAKLY_GROUNDED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Moderate Grounding (
                        {Math.round((msg.confidenceScore || 0.5) * 100)}%)
                      </span>
                    )}
                    {msg.groundingStatus === 'INSUFFICIENT_EVIDENCE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Ungrounded / Refusal
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/70">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-400" /> Grounded Sources & Manuals:
                    </div>
                    <div className="space-y-1">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="text-xs p-1.5 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between text-slate-300"
                        >
                          <span className="truncate pr-2">
                            <span className="font-semibold text-blue-300">[{i + 1}]</span>{' '}
                            {c.title}
                            {c.section ? ` · ${c.section}` : ''}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded shrink-0">
                            {c.source_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up actions */}
                {msg.followups && msg.followups.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/70 flex flex-wrap gap-1.5">
                    {msg.followups.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (act.context_type && onNavigateToPage) {
                            onNavigateToPage(act.context_type);
                          } else {
                            handleSendMessage(act.query);
                          }
                        }}
                        className="px-2.5 py-1 text-xs rounded bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 border border-blue-700/50 transition-colors flex items-center gap-1"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp & Disclaimer */}
              <div className="text-[10px] text-slate-500 mt-1 px-1 flex items-center gap-2">
                <span>{msg.timestamp}</span>
                {msg.disclaimer && <span className="italic">{msg.disclaimer}</span>}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs p-3 bg-slate-800/60 rounded-xl max-w-xs animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Verifying statistical grounding against MoSPI manuals...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#1e293b]/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask about methodology, standards, or gaps..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!queryInput.trim() || isLoading}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors shrink-0"
              title="Send Inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-500 text-center mt-1.5">
            Strict anti-hallucination safeguard active. MoSPI citation backed.
          </div>
        </div>
      </div>
    </div>
  );
};
