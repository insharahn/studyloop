// src/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import gsap from "gsap";
import { apiReview } from "./api";
import { cn } from "./utils";

export function ChatPage({ user, courseId, onNavigate }) {
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      content: "Ask any doubt. I will answer strictly from your uploaded slides with exact slide & page citations.",
      grounded: true,
      citations: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState(null);
  const messagesEndRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { id: "u_" + Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiReview.sendChat({
        course_id: courseId,
        message: userMsg.content,
        session_id: sessionId
      });
      if (res.session_id) {
        setSessionId(res.session_id);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id || "msg_" + Date.now(),
          role: "assistant",
          content: res.answer,
          grounded: res.grounded,
          confidence: res.confidence,
          citations: res.citations || []
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "assistant",
          content: "Failed to connect to retrieval engine.",
          grounded: false,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#171717] text-white">
      {/* Top Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-white/10 px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white transition hover:bg-white hover:text-[#171717]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-display text-xl uppercase leading-none sm:text-2xl">Lecture Tutor</h2>
            <span className="text-[10px] font-bold text-[#39d5c8] uppercase tracking-wider">
              Confidence-Gated RAG
            </span>
          </div>
        </div>

        <button
          onClick={() => setInput("Explain quantum physics in french")}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-2 border-[#171717] bg-[#ffd356] px-3 py-1 text-[10px] font-black uppercase text-[#171717] shadow-sm hover:bg-amber-300"
        >
          <Sparkles className="h-3 w-3" />
          Test Refusal Gate
        </button>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((m) => {
          const isUser = m.role === "user";

          // Refusal Banner (grounded = false)
          if (!isUser && m.grounded === false) {
            return (
              <div
                key={m.id}
                className="rounded-[22px] border-3 border-[#171717] bg-[#ff6b6b] p-4 text-[#171717] shadow-hard sm:p-5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="h-5 w-5 text-[#171717]" />
                  <span className="font-display text-lg uppercase tracking-tight">
                    Not In Syllabus (Refusal Triggered)
                  </span>
                </div>
                <p className="text-xs font-bold leading-relaxed sm:text-sm">{m.content}</p>
                <div className="mt-3 inline-block rounded-lg bg-black/10 px-2.5 py-1 text-[10px] font-black uppercase">
                  Confidence Score: {Math.round((m.confidence || 0) * 100)}% (Below 35% Threshold)
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[92%] sm:max-w-[80%] rounded-[22px] border-3 border-[#171717] p-4 text-xs sm:text-sm font-bold shadow-hard",
                  isUser ? "bg-[#ffd356] text-[#171717]" : "bg-white text-[#171717]"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                {/* Citations Pill Bar */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 border-t-2 border-black/10 pt-2.5">
                    <span className="block text-[9px] font-black uppercase text-black/50 mb-1.5">
                      Verified Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSnippet(c)}
                          className="flex items-center gap-1 rounded-lg border-2 border-[#171717] bg-[#39d5c8] px-2.5 py-1 text-[10px] font-black uppercase text-[#171717] hover:bg-cyan-300 transition"
                        >
                          <FileText className="h-3 w-3" />
                          Page {c.page} • {c.filename}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border-2 border-white/20 bg-white/5 px-4 py-3 text-xs font-bold text-white/70 w-fit">
            <Loader2 className="h-4 w-4 animate-spin text-[#39d5c8]" />
            Retrieving chunks and checking syllabus confidence...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Snippet Preview Drawer / Modal */}
      {activeSnippet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border-4 border-[#171717] bg-[#ffd356] p-6 text-[#171717] shadow-hard">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <h4 className="font-display text-xl uppercase leading-none">Source Verification</h4>
              </div>
              <button
                onClick={() => setActiveSnippet(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171717] bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl border-2 border-[#171717] bg-white p-3.5 text-xs font-bold text-black/80 mb-3">
              <p className="italic leading-relaxed">&ldquo;{activeSnippet.snippet}&rdquo;</p>
            </div>
            <div className="text-[11px] font-black uppercase text-black/70 flex justify-between">
              <span>{activeSnippet.filename}</span>
              <span>Slide / Page {activeSnippet.page}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t-2 border-white/10 bg-[#171717] p-3 sm:p-4 shrink-0">
        <form onSubmit={handleSend} className="mx-auto flex max-w-4xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a doubt about AVL rotations, B-trees..."
            className="min-h-12 flex-1 rounded-xl sm:rounded-2xl border-2 border-white/20 bg-white/10 px-4 text-xs sm:text-sm font-bold text-white outline-none focus:border-[#39d5c8]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex min-h-12 w-12 sm:w-auto sm:px-6 items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl border-2 border-[#171717] bg-[#39d5c8] text-xs font-black uppercase text-[#171717] shadow-hard transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Ask Doubt</span>
          </button>
        </form>
      </div>
    </div>
  );
}