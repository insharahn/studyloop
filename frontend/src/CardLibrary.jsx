// src/CardLibrary.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, Layers, ChevronDown, FileText } from "lucide-react";
import { apiCards } from "./api";
import { cn } from "./utils";

export function CardLibrary({ courseId, onNavigate }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState({}); // card_id -> bool

  useEffect(() => {
    async function load() {
      try {
        const { cards } = await apiCards.listCourseCards(courseId);
        setCards(cards || []);
      } catch (err) {
        console.warn("Failed to load cards:", err.message);
        setCards([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  function toggleReveal(cardId) {
    setRevealed((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  // Group by concept_name, preserving the backend's order.
  const grouped = [];
  const groupIndex = {};
  for (const card of cards) {
    const key = card.concept_name || "General";
    if (!(key in groupIndex)) {
      groupIndex[key] = grouped.length;
      grouped.push({ concept_name: key, cards: [] });
    }
    grouped[groupIndex[key]].cards.push(card);
  }

  return (
    <div className="min-h-screen bg-[#171717] px-4 pb-16 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-white/10 pb-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white hover:bg-white hover:text-[#171717]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl uppercase leading-none sm:text-2xl">Flashcard Library</h2>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl border-2 border-white/10 bg-white/5" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-center text-xs font-bold text-white/60">
            No flashcards generated yet.
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.concept_name}>
                <div className="mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#39d5c8]" />
                  <h3 className="font-display text-lg uppercase tracking-tight text-[#39d5c8]">
                    {group.concept_name}
                  </h3>
                  <span className="text-[10px] font-bold text-white/40">
                    {group.cards.length} card{group.cards.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.cards.map((card) => {
                    const isRevealed = !!revealed[card.card_id];
                    return (
                      <div
                        key={card.card_id}
                        className="rounded-2xl border-2 border-white/15 bg-white/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="mb-1 inline-block rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase text-white/60">
                              {card.type}
                            </span>
                            <p className="text-xs font-bold sm:text-sm">{card.question}</p>
                          </div>
                        </div>

                        {card.type === "mcq" && card.options && (
                          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {card.options.map((opt, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-bold",
                                  isRevealed && opt.trim().toLowerCase() === (card.answer || "").trim().toLowerCase()
                                    ? "border-[#a7ef59] bg-[#a7ef59]/20 text-[#a7ef59]"
                                    : "border-white/15 text-white/70"
                                )}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => toggleReveal(card.card_id)}
                          className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase text-[#ffd356] hover:text-yellow-300"
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isRevealed && "rotate-180")} />
                          {isRevealed ? "Hide Answer" : "Show Answer"}
                        </button>

                        {isRevealed && (
                          <div className="mt-2 rounded-xl border-2 border-[#171717] bg-white p-3 text-[#171717]">
                            <p className="text-xs font-black">{card.answer}</p>
                            {card.explanation && (
                              <p className="mt-1 text-[11px] font-bold text-black/70">{card.explanation}</p>
                            )}
                            {card.source_page && (
                              <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-black/50">
                                <FileText className="h-3 w-3" />
                                Page {card.source_page}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}