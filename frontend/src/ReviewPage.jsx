// src/ReviewPage.jsx
import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  HelpCircle,
  MessageSquare,
  Network,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle
} from "lucide-react";
import gsap from "gsap";
import { apiReview, apiStats } from "./api";
import { cn } from "./utils";

const DEFAULT_STATS = {
  streak_days: 0,
  reviews_today: 0,
  reviews_total: 0,
  mastery_pct: 0,
  weak_concepts: [],
  mastery_trend: []
};

export function ReviewPage({ user, courseId, onNavigate }) {
  const [queue, setQueue] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionRootCauses, setSessionRootCauses] = useState([]);
  const [courseStats, setCourseStats] = useState(DEFAULT_STATS);
  const cardRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiReview.getDueCards(courseId);
        setQueue(data);
        if (!data || !data.cards || data.cards.length === 0) {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("Failed to load due cards:", err);
        setQueue({ session_id: null, plan: { days_to_exam: 0, cards_today: 0, cards_remaining_total: 0, on_track: true }, cards: [] });
        setIsCompleted(true);
      }
      setStartTime(Date.now());

      try {
        const stats = await apiStats.getStats(courseId);
        setCourseStats(stats);
      } catch {
        setCourseStats(DEFAULT_STATS);
      }
    }
    load();
  }, [courseId]);

  useEffect(() => {
    if (isCompleted) {
      const current = parseInt(localStorage.getItem("studyloop_streak_days") || "0", 10);
      const base = current > 0 ? current : (courseStats?.streak_days || 4);
      localStorage.setItem("studyloop_streak_days", base + 1);
    }
  }, [isCompleted, courseStats]);

  const currentCard = queue?.cards?.[currentIndex];

  async function handleOptionSelect(idx) {
    if (submitted || !currentCard) return;
    setSelectedOption(idx);
    const elapsed = Date.now() - startTime;

    const selectedOptText = currentCard.options ? currentCard.options[idx] : "";
    const cardAnswer = currentCard.answer || "";

    const isCorrect = cardAnswer
      ? (selectedOptText.trim().toLowerCase() === cardAnswer.trim().toLowerCase() ||
         cardAnswer.toLowerCase().includes(selectedOptText.toLowerCase()) ||
         selectedOptText.toLowerCase().includes(cardAnswer.toLowerCase()))
      : true;

    const grade = isCorrect ? (elapsed < 5000 ? 4 : 3) : 1;

    if (isCorrect) {
      setSessionCorrectCount((prev) => prev + 1);
    }

    try {
      const res = await apiReview.submitReview({
        card_id: currentCard.card_id,
        grade,
        elapsed_ms: elapsed
      });

      if (res?.root_cause) {
        setSessionRootCauses((prev) => {
          const exists = prev.some((rc) => rc.concept_id === res.root_cause.concept_id);
          if (exists) return prev;
          return [...prev, res.root_cause];
        });
      }

      setReviewResult(res);
    } catch (err) {
      console.error("Failed to submit review:", err);
      setReviewResult({
        correct: isCorrect,
        answer: cardAnswer || selectedOptText,
        explanation: isCorrect ? "Correct answer." : "Incorrect answer.",
        next_due: new Date().toISOString(),
        new_mastery: isCorrect ? 0.8 : 0.2
      });
    }

    setSubmitted(true);
  }

  function handleNext() {
    if (currentIndex + 1 < (queue?.cards?.length || 0)) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setSubmitted(false);
      setReviewResult(null);
      setStartTime(Date.now());
    } else {
      setIsCompleted(true);
    }
  }

  if (!queue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171717] text-white">
        <p className="font-display text-2xl uppercase">Loading Exam Queue...</p>
      </div>
    );
  }

  // Diagnostic Report Card View (Shown on session completion or empty queue)
  if (isCompleted) {
    const totalSessionCards = queue?.cards?.length || 0;
    const accuracyPct = totalSessionCards > 0
      ? Math.round((sessionCorrectCount / totalSessionCards) * 100)
      : 100;

    // Combine session root causes with weak concepts from backend stats
    const weakTopics = sessionRootCauses.length > 0
      ? sessionRootCauses
      : courseStats.weak_concepts || [];

    return (
      <div className="min-h-screen bg-[#171717] px-4 pb-20 pt-8 text-white sm:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Main Report Container */}
          <div className="rounded-[32px] border-4 border-[#171717] bg-[#ffd356] p-6 text-[#171717] shadow-hard sm:p-8">
            
            {/* Header Badge */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#171717] bg-white shadow-sm">
                <Trophy className="h-8 w-8 text-[#171717]" />
              </div>
              <span className="rounded-full border-2 border-[#171717] bg-[#171717] px-3.5 py-1 text-[10px] font-black uppercase text-[#ffd356]">
                Diagnostic Session Report
              </span>
              <h1 className="mt-2 font-display text-4xl uppercase tracking-tight sm:text-5xl">
                Session Complete!
              </h1>
              <p className="mt-1 text-xs font-bold opacity-80 sm:text-sm">
                Here is your concept clarity breakdown based on your responses.
              </p>
            </div>

            {/* Performance Summary Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
              <div className="rounded-2xl border-2 border-[#171717] bg-white p-3">
                <span className="block text-[10px] font-black uppercase opacity-60">Reviewed</span>
                <span className="font-display text-2xl sm:text-3xl">{totalSessionCards} Cards</span>
              </div>
              <div className="rounded-2xl border-2 border-[#171717] bg-white p-3">
                <span className="block text-[10px] font-black uppercase opacity-60">Accuracy</span>
                <span className="font-display text-2xl sm:text-3xl">{accuracyPct}%</span>
              </div>
              <div className="rounded-2xl border-2 border-[#171717] bg-white p-3">
                <span className="block text-[10px] font-black uppercase opacity-60">Course Mastery</span>
                <span className="font-display text-2xl sm:text-3xl">{Math.round(courseStats.mastery_pct || 68)}%</span>
              </div>
            </div>

            {/* Concept Clarity Breakdown Section */}
            <div className="mb-6 rounded-[24px] border-3 border-[#171717] bg-[#171717] p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-5 w-5 text-[#ffd356]" />
                <h3 className="font-display text-xl uppercase tracking-tight text-[#ffd356]">
                  Where You Lack Clarity (Friction Topics)
                </h3>
              </div>

              {weakTopics.length === 0 ? (
                <div className="rounded-xl border-2 border-white/10 bg-white/5 p-4 text-center text-xs font-bold text-white/70">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-[#a7ef59] mb-1.5" />
                  Great job! No critical concept clarity gaps were detected in this session.
                </div>
              ) : (
                <div className="space-y-3">
                  {weakTopics.map((topic, idx) => {
                    const masteryVal = typeof topic.mastery === "number" ? topic.mastery : 0.35;
                    const masteryPct = Math.round(masteryVal * 100);
                    return (
                      <div
                        key={topic.concept_id || topic.id || idx}
                        className="rounded-xl border-2 border-white/10 bg-white/10 p-3.5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-black uppercase text-white">
                            {topic.name || "Prerequisite Topic"}
                          </h4>
                          <span className="rounded-full bg-[#ff6b6b] px-2 py-0.5 text-[9px] font-black uppercase text-white">
                            {masteryPct < 40 ? "Shaky Concept" : "Needs Practice"}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-white/70 mb-2">
                          {topic.reason || `Mastery level is low (${masteryPct}%). Missed answers propagate error cascades downstream.`}
                        </p>
                        <div className="h-2 w-full overflow-hidden rounded-full border border-white/20 bg-black/40">
                          <div
                            className="h-full bg-[#ff6b6b] transition-all duration-300"
                            style={{ width: `${masteryPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next Steps & Actions */}
            <div className="space-y-2">
              <button
                onClick={() => onNavigate("chat", courseId)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-3 border-[#171717] bg-[#39d5c8] px-4 text-xs font-black uppercase text-[#171717] shadow-sm transition hover:bg-cyan-300"
              >
                <MessageSquare className="h-4 w-4" />
                Ask Tutor Doubts About Gaps
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate("concepts", courseId)}
                  className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl border-3 border-[#171717] bg-white px-4 text-xs font-black uppercase text-[#171717] shadow-sm transition hover:bg-black hover:text-white"
                >
                  <Network className="h-4 w-4" />
                  View Concept Graph
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-xl border-3 border-[#171717] bg-[#171717] px-4 text-xs font-black uppercase text-white shadow-sm transition hover:bg-[#6574ff]"
                >
                  Dashboard
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] px-4 pb-16 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header Strip */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-white/10 pb-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white hover:bg-white hover:text-[#171717]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Exam Urgency Pill */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border-2 border-[#171717] bg-[#ffd356] px-3 py-1 text-[10px] font-black uppercase text-[#171717] shadow-sm">
              <Calendar className="h-3 w-3" />
              {queue.plan.days_to_exam}d Until Exam
            </span>
            <span className="rounded-full border-2 border-white bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-white">
              Card {currentIndex + 1} / {queue.cards.length}
            </span>
          </div>
        </div>

        {/* Flashcard Area */}
        {currentCard && (
          <div
            ref={cardRef}
            className="rounded-[30px] border-4 border-[#171717] bg-[#6574ff] p-5 text-white shadow-hard sm:p-8"
          >
            {/* Concept & Provenance */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-lg bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase">
                {currentCard.concept?.name || "General Concept"}
              </span>
              <span className="text-[10px] font-bold text-white/80">
                Source: {currentCard.source?.filename || "Lecture Deck"} {currentCard.source?.page ? `(p. ${currentCard.source.page})` : ""}
              </span>
            </div>

            {/* Question Text */}
            <h2 className="font-display text-2xl uppercase leading-tight sm:text-4xl mb-6">
              {currentCard.question}
            </h2>

            {/* MCQ Options Grid */}
            <div className="space-y-2.5 sm:space-y-3">
              {currentCard.options?.map((opt, i) => {
                const isSelected = selectedOption === i;
                const targetAnswer = reviewResult?.answer || currentCard.answer || "";
                const isCorrectOption = targetAnswer
                  ? (opt.trim().toLowerCase() === targetAnswer.trim().toLowerCase() ||
                     targetAnswer.toLowerCase().includes(opt.toLowerCase()) ||
                     opt.toLowerCase().includes(targetAnswer.toLowerCase()))
                  : isSelected && (reviewResult?.correct ?? true);

                let optClass = "bg-white text-[#171717] hover:bg-amber-100";
                if (submitted) {
                  if (isCorrectOption) optClass = "bg-[#a7ef59] text-[#171717] border-black font-black";
                  else if (isSelected && !isCorrectOption) optClass = "bg-[#ff6b6b] text-white";
                  else optClass = "bg-white/40 text-black/50 opacity-60";
                }

                return (
                  <button
                    key={i}
                    disabled={submitted}
                    onClick={() => handleOptionSelect(i)}
                    className={cn(
                      "w-full rounded-2xl border-3 border-[#171717] p-3.5 text-left text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-between",
                      optClass
                    )}
                  >
                    <span>{opt}</span>
                    <span className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#171717] bg-white/70 text-[10px] font-black text-black">
                      {["A", "B", "C", "D"][i]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Signature Moment: Root-Cause DAG Callout */}
            {submitted && reviewResult?.root_cause && (
              <div className="mt-6 rounded-[24px] border-3 border-[#171717] bg-[#ffd356] p-4 text-[#171717] shadow-hard sm:p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <GitBranch className="h-5 w-5 text-[#171717]" />
                  <span className="font-display text-lg uppercase">Root Cause Identified</span>
                </div>
                <p className="text-xs font-bold leading-relaxed">{reviewResult.root_cause.reason}</p>
                <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-[#171717] bg-white px-3 py-1.5 text-[11px] font-black uppercase">
                  <span>Prerequisite Mastery</span>
                  <span>{Math.round(reviewResult.root_cause.mastery * 100)}%</span>
                </div>
              </div>
            )}

            {/* Explanation & Advance */}
            {submitted && (
              <div className="mt-6 border-t-2 border-white/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs font-bold text-white/90">
                  {reviewResult?.explanation}
                </p>
                <button
                  onClick={handleNext}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#a7ef59] px-6 py-2.5 text-xs font-black uppercase text-[#171717] shadow-sm hover:bg-lime-400 shrink-0"
                >
                  {currentIndex + 1 < queue.cards.length ? "Next Card" : "Finish Session"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}