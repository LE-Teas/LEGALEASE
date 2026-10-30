"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  SendHorizonal,
  Sparkles,
  User,
  ShieldCheck,
  Scale,
  ArrowRight,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  recommendLawyer?: boolean;
}

const promptStarters = [
  {
    title: "Tenancy Deposit Dispute",
    law: "Sindh Rented Premises Ord. 1979",
    query: "My landlord in Karachi refuses to refund my security deposit after I vacated with proper notice.",
  },
  {
    title: "Dishonoured Cheque (§ 489-F)",
    law: "Pakistan Penal Code § 489-F",
    query: "A client gave me a business cheque that bounced due to insufficient funds. What are my legal remedies?",
  },
  {
    title: "Khula & Maintenance",
    law: "Family Courts Act 1964",
    query: "What is the procedure for obtaining Khula and child maintenance in Family Court?",
  },
  {
    title: "Defective Consumer Goods",
    law: "Sindh Consumer Protection Act 2014",
    query: "An electronics vendor sold me a defective product and refuses to provide a replacement or refund.",
  },
];

const cannedKnowledge: {
  match: RegExp;
  reply: string;
  citations: string[];
  recommendLawyer: boolean;
}[] = [
  {
    match: /deposit|landlord|rent|tenant|premises/i,
    reply:
      "Under the Sindh Rented Premises Ordinance, 1979 (and the Punjab Rented Premises Act, 2009):\n\n1. **Security Deposit Deductions**: A landlord may only deduct sums for documented physical damage beyond normal wear and tear or unpaid utility bills. Arbitrary forfeiture is legally impermissible.\n2. **Statutory Notice**: Send a formal 14-day legal demand notice via registered post / TCS demanding refund with bank account details.\n3. **Controller Recourse**: If unpaid, you can file an application before the Rent Controller having local territorial jurisdiction over the premises.\n4. **Eviction Protection**: A landlord cannot forcefully eject a tenant without a valid eviction order from the Rent Controller.",
    citations: [
      "Sindh Rented Premises Ordinance 1979, Section 15",
      "Punjab Rented Premises Act 2009, Section 12",
    ],
    recommendLawyer: true,
  },
  {
    match: /cheque|bounced|dishonour|489-f|fraud|recovery/i,
    reply:
      "Dishonour of a cheque issued with dishonest intention is a cognizable criminal offence in Pakistan:\n\n1. **Section 489-F PPC**: Carries imprisonment up to 3 years, fine, or both if issued dishonestly toward repayment of a loan or fulfillment of an obligation.\n2. **Immediate Action**: Obtain the official Bank Return Memo with the exact reason code (Insufficient Funds / Account Closed).\n3. **Legal Notice**: Send a formal legal notice within 30 days giving 14 days to pay.\n4. **Registration of FIR**: Approach the jurisdictional Police Station for FIR registration under Section 489-F, or file a Private Complaint under Section 200 CrPC.",
    citations: [
      "Pakistan Penal Code (Act XLV of 1860), Section 489-F",
      "Code of Criminal Procedure 1898, Section 154 & 200",
    ],
    recommendLawyer: true,
  },
  {
    match: /khula|divorce|maintenance|custody|family|guardian/i,
    reply:
      "Family law disputes in Pakistan are governed by the Family Courts Act, 1964 and Muslim Family Laws Ordinance, 1961:\n\n1. **Right to Khula**: A Muslim wife can seek dissolution of marriage through Khula before the Family Court without needing to prove cruelty, subject to returning the prompt dower (Haq Mehr) or part thereof.\n2. **Maintenance of Minor Children**: The father is legally obligated to maintain his minor children under Section 9 of the Family Courts Act, regardless of who has physical custody.\n3. **Interim Orders**: Family Courts are empowered to pass interim monthly maintenance orders pending final decree.",
    citations: [
      "Family Courts Act 1964, Section 5, 9 & 10",
      "Muslim Family Laws Ordinance 1961, Section 7 & 9",
    ],
    recommendLawyer: true,
  },
  {
    match: /consumer|defective|product|vendor|faulty|warranty/i,
    reply:
      "Consumer rights are safeguarded under provincial consumer protection legislation (e.g., Sindh Consumer Protection Act 2014 & Punjab Consumer Protection Act 2005):\n\n1. **Statutory Duty**: Manufacturers and sellers are strictly liable for defective products and deficient services.\n2. **Written Notice Requirement**: The consumer must serve a 15-day written notice to the seller before initiating legal action.\n3. **Consumer Court**: If the vendor fails to redress the grievance, file a claim before the Consumer Court for replacement, refund, and damages for mental agony.",
    citations: [
      "Sindh Consumer Protection Act 2014, Section 13-17",
      "Punjab Consumer Protection Act 2005, Section 28",
    ],
    recommendLawyer: false,
  },
];

function getReply(text: string) {
  const match = cannedKnowledge.find(({ match: regex }) => regex.test(text));
  if (!match) {
    return {
      reply:
        "Under Pakistani statutory law, your inquiry falls under civil and statutory remedies. To proceed effectively:\n\n1. Preserve all documentary evidence, contracts, written correspondence, and banking transaction slips.\n2. Serve a formal statutory legal notice through a licensed advocate of the High Court.\n3. Choose whether to pursue resolution through alternative dispute mediation or by filing a suit in the competent Civil Court / Tribunal.",
      citations: [
        "Code of Civil Procedure 1908 (Act V of 1908)",
        "Qanun-e-Shahadat Order 1984 (Law of Evidence)",
      ],
      recommendLawyer: true,
    };
  }
  return match;
}

export function AiAssistantPreview() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Assalam-o-Alaikum! I am your LegalEase AI Statutory Assistant. Describe your legal situation in plain words (e.g. rent issues, cheque bounce, employment dues, or consumer claims) and I will retrieve statutory provisions under Pakistan Code and guide your next steps.",
      citations: [
        "Constitution of the Islamic Republic of Pakistan, Article 10A",
        "Pakistan Code & Sindh Statutory Database",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || isTyping) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      const match = getReply(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: match.reply,
          citations: match.citations,
          recommendLawyer: match.recommendLawyer,
        },
      ]);
      setIsTyping(false);
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }, 600);
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        text: "Assalam-o-Alaikum! I am your LegalEase AI Statutory Assistant. Describe your legal situation in plain words and I will retrieve statutory provisions under Pakistan Code.",
        citations: [
          "Constitution of the Islamic Republic of Pakistan, Article 10A",
          "Pakistan Code & Sindh Statutory Database",
        ],
      },
    ]);
  };

  return (
    <div className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-2xl shadow-[#0d2b43]/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 bg-[#0d2b43] px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#0fa176] shadow-sm text-white">
            <Scale className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-base font-semibold text-white tracking-tight">
                LegalEase AI Legal Assistant
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0fa176]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#0fa176] border border-[#0fa176]/30">
                <span className="size-1.5 rounded-full bg-[#0fa176] animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-xs text-white/70 font-sans">
              Pakistani Statutory Guidance & Precedents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white/80 hover:text-white hover:bg-white/10 font-sans font-medium text-xs h-8 px-2.5 rounded-lg"
            title="Reset conversation"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Clear
          </Button>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 border border-white/10">
            <ShieldCheck className="size-3.5 text-[#0fa176]" />
            Encrypted & Private
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6 bg-[#f8fafc]/50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto flex max-w-[85%] items-start justify-end gap-3"
                : "mr-auto flex max-w-[92%] items-start gap-3"
            }
          >
            {message.role === "assistant" && (
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d2b43] text-[#0fa176] shadow-xs">
                <Bot className="size-4" />
              </span>
            )}

            <div className="space-y-2">
              <div
                className={
                  message.role === "user"
                    ? "rounded-2xl rounded-tr-xs bg-[#0d2b43] px-5 py-3.5 text-sm leading-relaxed text-white shadow-sm"
                    : "rounded-2xl rounded-tl-xs border border-border/80 bg-white px-5 py-4 text-sm leading-relaxed text-[#050d15] shadow-xs"
                }
              >
                <div className="whitespace-pre-line">{message.text}</div>

                {/* Statutory Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0d2b43] mb-1.5">
                      <BookOpen className="size-3 text-[#0fa176]" />
                      Statutory Citations:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.map((cite, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-[#0fa176]/10 px-2 py-0.5 text-[11px] font-medium text-[#0fa176] border border-[#0fa176]/20"
                        >
                          {cite}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action recommendation pill for assistant replies */}
              {message.recommendLawyer && (
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-muted-foreground">
                    Requires representation?
                  </span>
                  <Link
                    href="/lawyers"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0fa176] hover:text-[#0c8863] transition-colors"
                  >
                    Consult verified advocates
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>

            {message.role === "user" && (
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d2b43]/10 text-[#0d2b43]">
                <User className="size-4" />
              </span>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="mr-auto flex items-start gap-3">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d2b43] text-[#0fa176]">
              <Sparkles className="size-4 animate-spin" />
            </span>
            <div className="rounded-2xl rounded-tl-xs border border-border/80 bg-white px-4 py-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#0fa176] animate-bounce" />
                <span
                  className="size-2 rounded-full bg-[#0fa176] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="size-2 rounded-full bg-[#0fa176] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Prompt Starters & Input Box */}
      <div className="border-t border-border/70 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#0d2b43] mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#0fa176]" />
            Common Inquiries under Pakistani Law:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {promptStarters.map((starter) => (
              <button
                key={starter.title}
                type="button"
                onClick={() => send(starter.query)}
                className="flex items-start justify-between p-2.5 rounded-xl border border-border/70 hover:border-[#0fa176]/50 bg-white hover:bg-[#0fa176]/5 text-left transition-all duration-200 group"
              >
                <div>
                  <div className="text-xs font-medium text-[#0d2b43] group-hover:text-[#0fa176] transition-colors">
                    {starter.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {starter.law}
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-[#0fa176] group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <Input
            aria-label="Ask the legal assistant"
            placeholder="Describe your legal matter in plain words (e.g. cheque bounce, rent notice, inheritance)..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 bg-white border-border/80 focus-visible:ring-[#0fa176] text-sm h-11"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-[#0fa176] hover:bg-[#0c8863] text-white font-sans font-medium px-5 h-11 shrink-0 rounded-xl transition-colors shadow-sm"
          >
            <SendHorizonal className="size-4 mr-1.5" />
            Send
          </Button>
        </form>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Informational legal AI based on Pakistan Code & Sindh Code. Not formal legal representation.
        </p>
      </div>
    </div>
  );
}