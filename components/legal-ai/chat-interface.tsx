"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  CalendarClock,
  Compass,
  FileText,
  Landmark,
  MessageSquare,
  MessageSquareText,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import type {
  ConversationSummary,
  UiMessage,
  UiSource,
  UiStructuredResponse,
} from "@/lib/legal-ai/types";
import { Message } from "@/components/legal-ai/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ChatApiResponse {
  conversation_id: string;
  assistant_message: {
    id: string;
    content: string;
    structured_response: UiStructuredResponse;
    sources: UiSource[];
    recommended_lawyers?: import("@/lib/legal-ai/types").UiRecommendedLawyer[];
    created_at: string;
  };
}

function uid(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRESET_QUESTIONS = [
  {
    category: "Tenancy & Rented Premises",
    jurisdiction: "Sindh / Karachi",
    question: "Can my landlord evict me without notice under the Sindh Rented Premises Ordinance?",
  },
  {
    category: "Cheque Dishonour",
    jurisdiction: "Pakistan Penal Code",
    question: "What are the legal steps to lodge an FIR under Section 489-F PPC for a bounced cheque?",
  },
  {
    category: "Family Law & Khula",
    jurisdiction: "Family Courts Act",
    question: "What is the procedure and timeline for filing for Khula in a Pakistani Family Court?",
  },
  {
    category: "Consumer Court Rights",
    jurisdiction: "Consumer Protection",
    question: "What are the legal notice requirements before filing a case in Consumer Court Karachi?",
  },
];

const LEGAL_TOPICS = [
  "Rent Disputes & Eviction",
  "Cheque Dishonour (489-F)",
  "Family & Child Custody",
  "Consumer Protection",
  "Cybercrime & PECA",
  "Employment & Labour Rights",
  "Inheritance & Succession",
  "Police FIR Procedure",
];

export function ChatInterface() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("All Pakistan & Sindh");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/legal/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  const selectConversation = useCallback(
    async (id: string) => {
      if (activeId === id && messages.length > 0) return;
      setActiveId(id);
      setLoadingConversation(true);
      setMessages([]);
      setSidebarOpen(false);
      try {
        const res = await fetch(`/api/legal/conversations/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            structured_response: UiStructuredResponse | null;
            sources: UiSource[] | null;
            created_at: string;
          }>;
        };
        setMessages(
          (data.messages ?? []).map((m) => ({
            ...m,
            sources: m.sources ?? null,
            structured_response: m.structured_response ?? null,
            recommended_lawyers:
              m.structured_response?.recommended_lawyers ?? null,
            status: "done" as const,
          }))
        );
      } catch {
        setMessages([
          {
            id: uid(),
            role: "assistant",
            content: "",
            status: "error",
            error: "Could not load this conversation. Please try again.",
          },
        ]);
      } finally {
        setLoadingConversation(false);
      }
    },
    [activeId, messages.length]
  );

  const startNewConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/legal/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      if (activeId === id) startNewConversation();
    },
    [activeId, conversations, startNewConversation]
  );

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const message = (overrideText ?? input).trim();
      if (!message || sending) return;

      const tempId = uid();
      const userMessage: UiMessage = {
        id: tempId,
        role: "user",
        content: message,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setSending(true);

      try {
        const res = await fetch("/api/legal/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, conversation_id: activeId ?? undefined }),
        });

        if (res.status === 429) {
          throw new Error("Rate limit reached. Please wait a few seconds before asking another question.");
        }

        const data = (await res.json()) as ChatApiResponse | { error?: string };
        if (!res.ok || ("error" in data && data.error)) {
          throw new Error(
            ("error" in data && data.error) ||
              "Could not retrieve legal answer. Please verify you are signed in."
          );
        }
        const chat = data as ChatApiResponse;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, role: "user", status: "done" } : m
          )
        );

        setMessages((prev) => [
          ...prev,
          {
            id: chat.assistant_message.id,
            role: "assistant",
            content: chat.assistant_message.content,
            structured_response: chat.assistant_message.structured_response ?? null,
            sources: chat.assistant_message.sources ?? null,
            recommended_lawyers:
              chat.assistant_message.recommended_lawyers ||
              chat.assistant_message.structured_response?.recommended_lawyers ||
              null,
            created_at: chat.assistant_message.created_at,
            status: "done",
          },
        ]);

        if (!activeId || activeId !== chat.conversation_id) {
          setActiveId(chat.conversation_id);
          await loadConversations();
        } else {
          loadConversations();
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, role: "user", status: "error", error: err.message }
              : m
          )
        );
      } finally {
        setSending(false);
      }
    },
    [input, sending, activeId, loadConversations]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-100">
          <Button
            type="button"
            onClick={startNewConversation}
            className="w-full bg-[#0d2b43] hover:bg-[#0d2b43]/90 text-white font-medium text-xs h-10 shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="size-4 text-[#0fa176]" />
            New Legal Consultation
          </Button>
        </div>

        {/* Legal Topics Pills */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Practice Precedents
          </p>
          <div className="flex flex-wrap gap-1">
            {LEGAL_TOPICS.slice(0, 4).map((topic) => (
              <button
                key={topic}
                onClick={() => sendMessage(`What does Pakistani law state regarding ${topic}?`)}
                className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-[#0fa176] hover:text-[#0fa176] transition-colors truncate max-w-full text-left"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations History */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1">
            Consultation History
          </p>
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-slate-400">
              No previous consultations. Your conversations will be safely saved here.
            </p>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-lg px-2.5 py-2 transition-all ${
                    active
                      ? "bg-[#ecfdf5] text-[#0d2b43] font-medium border border-[#0fa176]/30 shadow-xs"
                      : "text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquareText
                      className={`size-3.5 shrink-0 ${active ? "text-[#0fa176]" : "text-slate-400"}`}
                    />
                    <span className="truncate text-xs">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    aria-label="Delete consultation"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Verification Note Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="size-4 text-[#0fa176] shrink-0" />
          <span>Grounded in Pakistan Code & Sindh Code</span>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#0d2b43] text-[#0fa176] shadow-xs">
              <Scale className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-base font-bold text-[#0d2b43]">
                  AI Legal Intelligence Assistant
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex bg-[#ecfdf5] text-[#0fa176] border-[#0fa176]/40 text-[10px] font-semibold"
                >
                  Verified RAG v2.4
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Pakistan Code • Sindh Code • High Court & Statutory Precedents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden text-xs h-8 text-[#0d2b43]"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <MessageSquare className="size-3.5 mr-1 text-[#0fa176]" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              className="text-xs h-8 border-slate-200 hover:border-[#0fa176] text-slate-700"
            >
              <Plus className="size-3.5 mr-1 text-[#0fa176]" />
              New Chat
            </Button>
          </div>
        </header>

        {/* Mobile History Drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs">
            <div className="w-4/5 max-w-xs bg-white h-full p-4 flex flex-col shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-heading font-bold text-sm text-[#0d2b43]">
                  Consultation History
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="py-3">
                <Button
                  onClick={startNewConversation}
                  className="w-full bg-[#0d2b43] text-white text-xs h-9"
                >
                  <Plus className="size-3.5 mr-1 text-[#0fa176]" />
                  New Consultation
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className="w-full text-left p-2 rounded-lg text-xs truncate hover:bg-slate-100 text-slate-700"
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8 bg-[#F8FAFC]">
          {messages.length === 0 && !loadingConversation ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
              <div className="size-16 rounded-2xl bg-[#0d2b43] text-[#0fa176] flex items-center justify-center shadow-md">
                <Scale className="size-8" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-[#0d2b43] sm:text-3xl">
                  Understand the Law. Act with Confidence.
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 max-w-lg mx-auto">
                  Ask any legal question in plain English or Urdu. Every response is synthesized exclusively from verified statutory texts under the Pakistan Penal Code, Code of Civil Procedure, Sindh Rented Premises Ordinance, and verified court precedents.
                </p>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="grid w-full gap-3 sm:grid-cols-2 text-left pt-2">
                {PRESET_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(item.question)}
                    className="group rounded-xl border border-slate-200/90 bg-white p-3.5 text-left transition-all hover:border-[#0fa176] hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#0fa176] uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.jurisdiction}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-[#0d2b43] group-hover:text-[#0fa176] transition-colors leading-snug">
                      &ldquo;{item.question}&rdquo;
                    </p>
                  </button>
                ))}
              </div>

              {/* Grounded Citation Assurance Pill */}
              <div className="flex items-center gap-2 rounded-full border border-[#0fa176]/30 bg-[#ecfdf5] px-4 py-1.5 text-xs text-[#0d2b43] font-medium">
                <ShieldCheck className="size-4 text-[#0fa176]" />
                All citations cite official statutory sections and verified legal sources.
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
            </div>
          )}

          {/* Smooth Sending / Generating Indicator */}
          {sending && (
            <div className="max-w-3xl mx-auto flex items-center gap-3 rounded-xl border border-[#0fa176]/30 bg-white p-3.5 shadow-xs">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#0d2b43] text-[#0fa176]">
                <Scale className="size-4 animate-pulse" />
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0d2b43]">
                  <span>Synthesizing Legal Analysis</span>
                  <span className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-[#0fa176] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1.5 rounded-full bg-[#0fa176] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-[#0fa176] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Retrieving relevant sections from Pakistan Code & Sindh Code database...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Floating Composer */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border-2 border-slate-200 bg-white p-1.5 focus-within:border-[#0fa176] transition-colors shadow-xs">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your legal issue or ask a statute question... (Enter to send, Shift+Enter for newline)"
                rows={1}
                className="max-h-36 min-h-[44px] resize-none border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm text-[#0d2b43]"
                aria-label="Your legal question"
              />
              <Button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending || input.trim().length === 0}
                className="size-10 shrink-0 rounded-xl bg-[#0fa176] hover:bg-[#0c8863] text-white transition-transform active:scale-95 disabled:bg-slate-200"
                aria-label="Send message"
              >
                {sending ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUp className="size-4.5 stroke-[2.5]" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500">
              LegalEase provides automated legal intelligence grounded in verified statutory texts. It does not establish advocate-client privilege. For formal representation, schedule a consultation with a verified advocate.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}