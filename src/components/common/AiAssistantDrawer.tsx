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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-[#2A1E19]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#FBF8F2] text-[#2F2520] h-full shadow-2xl flex flex-col border-l border-[#DED2C5] animate-slide-left">
        {/* Top Header */}
        <div className="p-4 border-b border-[#DED2C5] bg-[#3A2921] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6B4A35]/30 border border-[#8A6A52]/40 flex items-center justify-center text-[#CBB9A7]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F8F3EB]">STAT-GAP AI Assistant</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#6B4A35]/40 text-[#CBB9A7] border border-[#8A6A52]/50 rounded">
                  RAG Grounded
                </span>
              </div>
              <p className="text-xs text-[#B8A28F]">
                MoSPI Domain Expert · Role: <span className="text-[#F8F3EB]">{roleTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B8A28F] hover:text-[#F8F3EB] hover:bg-[#4D3628] transition-colors"
            title="Close Assistant"
            aria-label="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
          {messages.length === 0 && (
            <div className="py-6 px-2 space-y-6">
              <div className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-4 text-[#6E625A]">
                <div className="flex items-center gap-2 text-[#6B4A35] font-medium mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Role-Aware Statistical Assistant</span>
                </div>
                <p className="text-xs leading-relaxed text-[#93877D]">
                  Ask questions regarding MoSPI survey methodologies, standard operating procedures,
                  statistical diagnostic concepts, competency requirements, or recommended iGOT/NSSTA training pathways.
                </p>
              </div>

              {/* Suggestions */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#93877D] mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#6B4A35]" />
                  <span>Suggested Inquiries for Your Cadre</span>
                </div>
                <div className="space-y-2">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="w-full text-left p-3 rounded-lg bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] transition-all hover:border-[#B8A28F] group flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-medium text-[#6B4A35] mb-0.5">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#6E625A] line-clamp-2">{item.query}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#B8A28F] group-hover:text-[#6B4A35] shrink-0 mt-1 transition-colors" />
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
                    ? 'bg-[#EEE4D8] text-[#2A1E19] shadow-sm border border-[#DED2C5]'
                    : 'bg-[#FFFDFC] border border-[#DED2C5] text-[#2F2520]'
                }`}
              >
                {/* Header for assistant */}
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#EEE4D8] text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-[#6E625A]">
                      <Sparkles className="w-3.5 h-3.5 text-[#6B4A35]" />
                      <span>STAT-GAP AI</span>
                    </div>

                    {/* Grounding Badge */}
                    {msg.groundingStatus === 'GROUNDED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Grounded (
                        {Math.round((msg.confidenceScore || 0.8) * 100)}%)
                      </span>
                    )}
                    {msg.groundingStatus === 'WEAKLY_GROUNDED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Moderate Grounding (
                        {Math.round((msg.confidenceScore || 0.5) * 100)}%)
                      </span>
                    )}
                    {msg.groundingStatus === 'INSUFFICIENT_EVIDENCE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Ungrounded / Refusal
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#EEE4D8]">
                    <div className="text-[11px] font-semibold text-[#8A6A52] mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#6B4A35]" /> Grounded Sources & Manuals:
                    </div>
                    <div className="space-y-1">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="text-xs p-1.5 rounded bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between text-[#6E625A]"
                        >
                          <span className="truncate pr-2">
                            <span className="font-semibold text-[#6B4A35]">[{i + 1}]</span>{' '}
                            {c.title}
                            {c.section ? ` · ${c.section}` : ''}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#EEE4D8] text-[#8A6A52] rounded shrink-0">
                            {c.source_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up actions */}
                {msg.followups && msg.followups.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#EEE4D8] flex flex-wrap gap-1.5">
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
                        className="px-2.5 py-1 text-xs rounded bg-[#EEE4D8] text-[#6B4A35] hover:bg-[#DED2C5] border border-[#CBB9A7] transition-colors flex items-center gap-1"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp & Disclaimer */}
              <div className="text-[10px] text-[#93877D] mt-1 px-1 flex items-center gap-2">
                <span>{msg.timestamp}</span>
                {msg.disclaimer && <span className="italic">{msg.disclaimer}</span>}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-[#8A6A52] text-xs p-3 bg-[#F8F3EB] border border-[#DED2C5] rounded-xl max-w-xs animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6B4A35]" />
              <span>Verifying statistical grounding against MoSPI manuals...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#DED2C5] bg-[#F8F3EB]">
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
              className="flex-1 bg-[#FFFDFC] border border-[#DED2C5] rounded-lg px-3.5 py-2 text-sm text-[#2F2520] placeholder-[#B8A28F] focus:outline-none focus:border-[#6B4A35] focus:ring-1 focus:ring-[#6B4A35] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!queryInput.trim() || isLoading}
              className="p-2.5 bg-[#5E402E] hover:bg-[#493124] disabled:bg-[#EEE4D8] disabled:text-[#B8A28F] text-[#F8F3EB] rounded-lg transition-colors shrink-0"
              title="Send Inquiry"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-[#93877D] text-center mt-1.5">
            Strict anti-hallucination safeguard active. MoSPI citation backed.
          </div>
        </div>
      </div>
    </div>
  );
};
