// src/ClassPulsePage.jsx
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users
} from "lucide-react";
import { apiStats } from "./api";
import { cn } from "./utils";

const DEFAULT_PULSE = {
  enabled: false,
  cohort_size: 0,
  your_rank_pct: 0,
  concepts: []
};

export function ClassPulsePage({ courseId, onNavigate }) {
  const [pulse, setPulse] = useState(DEFAULT_PULSE);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'needs_attention' | 'my_gaps'
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await apiStats.getPulse(courseId);
        setPulse(data || DEFAULT_PULSE);
      } catch (err) {
        console.error("Failed to fetch Class Pulse:", err);
        setPulse(DEFAULT_PULSE);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const concepts = pulse?.concepts || [];
  const totalConcepts = concepts.length;
  const myGapsCount = concepts.filter((c) => c.you_struggling).length;
  const highFrictionCount = concepts.filter((c) => c.pct_of_class_struggling >= 0.5).length;

  const filteredConcepts = concepts
    .filter((c) => {
      if (activeTab === "needs_attention") return c.pct_of_class_struggling >= 0.5;
      if (activeTab === "my_gaps") return c.you_struggling;
      return true;
    })
    .filter((c) =>
      searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => b.pct_of_class_struggling - a.pct_of_class_struggling);

  return (
    <div className="min-h-screen bg-[#141414] px-4 pb-24 pt-6 text-white sm:px-8 lg:px-12 font-sans antialiased">
      <div className="mx-auto max-w-4xl">
        
        {/* Top Navigation */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white transition hover:bg-white hover:text-[#171717]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-white leading-none">
                Anonymous Class Pulse
              </h1>
              <p className="mt-1 text-xs font-bold text-white/50">
                Identify hardest syllabus topics before exam day
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border-2 border-[#171717] bg-[#39d5c8] px-3.5 py-1 text-[10px] font-black uppercase text-[#171717] shadow-sm w-fit">
            <ShieldCheck className="h-3.5 w-3.5" />
            &ge; 3 Users Anonymity Shield
          </span>
        </div>

        {/* State 1: Skeleton Loading */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="h-64 rounded-3xl bg-white/5 animate-pulse" />
          </div>
        ) : !pulse?.enabled ? (
          /* State 2: Cohort Privacy Guard */
          <div className="rounded-3xl border-3 border-dashed border-white/20 bg-white/5 p-10 text-center">
            <Users className="mx-auto h-12 w-12 text-white/30 mb-3" />
            <h2 className="font-display text-2xl uppercase tracking-tight">
              Cohort Privacy Active
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-white/60">
              Class Pulse requires at least 3 active students enrolled in this syllabus to display anonymized difficulty heatmaps.
            </p>
          </div>
        ) : (
          /* State 3: Main Dashboard */
          <div className="space-y-6">
            
            {/* Top Stat Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border-3 border-[#171717] bg-[#6574ff] p-4 text-white shadow-hard">
                <span className="text-[10px] font-black uppercase opacity-80">Cohort Enrolled</span>
                <p className="font-display text-3xl uppercase mt-0.5">{pulse.cohort_size} Students</p>
              </div>

              <div className="rounded-2xl border-3 border-[#171717] bg-[#a7ef59] p-4 text-[#171717] shadow-hard">
                <span className="text-[10px] font-black uppercase opacity-70">Your Standing</span>
                <p className="font-display text-3xl uppercase mt-0.5">
                  Top {Math.round((1 - (pulse.your_rank_pct || 0.25)) * 100)}%
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border-3 border-[#171717] bg-[#ffd356] p-4 text-[#171717] shadow-hard">
                <span className="text-[10px] font-black uppercase opacity-70">Severe Friction</span>
                <p className="font-display text-3xl uppercase mt-0.5 text-[#171717]">{highFrictionCount} Topics</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Pill Tabs */}
              <div className="flex rounded-xl border-2 border-[#171717] bg-black/40 p-1">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 text-xs font-black uppercase transition-all",
                    activeTab === "all" ? "bg-[#ffd356] text-[#171717]" : "text-white/60 hover:text-white"
                  )}
                >
                  All ({totalConcepts})
                </button>
                <button
                  onClick={() => setActiveTab("needs_attention")}
                  className={cn(
                    "flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 text-xs font-black uppercase transition-all",
                    activeTab === "needs_attention" ? "bg-[#ff6b6b] text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  &gt; 50% Stuck ({highFrictionCount})
                </button>
                <button
                  onClick={() => setActiveTab("my_gaps")}
                  className={cn(
                    "flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 text-xs font-black uppercase transition-all",
                    activeTab === "my_gaps" ? "bg-[#39d5c8] text-[#171717]" : "text-white/60 hover:text-white"
                  )}
                >
                  My Gaps ({myGapsCount})
                </button>
              </div>

              {/* Search Field */}
              <div className="flex items-center rounded-xl border-2 border-white/15 bg-white/5 px-3 py-2 text-xs font-bold w-full sm:w-60">
                <Search className="mr-2 h-4 w-4 text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by concept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Clean Topic List */}
            <div className="space-y-3">
              {filteredConcepts.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/5 p-8 text-center text-xs font-bold text-white/40">
                  No concepts matching selected filter.
                </div>
              ) : (
                filteredConcepts.map((concept, idx) => {
                  const pct = Math.round(concept.pct_of_class_struggling * 100);
                  const isHigh = pct >= 50;

                  return (
                    <div
                      key={concept.id}
                      className={cn(
                        "rounded-2xl border-3 border-[#171717] p-4 sm:p-5 transition-all shadow-hard bg-white text-[#171717]",
                        concept.you_struggling && "ring-2 ring-[#ff6b6b]"
                      )}
                    >
                      {/* Top Row: Rank, Title, Badges, Percentage */}
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#171717] font-display text-sm font-black",
                              isHigh ? "bg-[#ff6b6b] text-white" : "bg-[#ffd356] text-[#171717]"
                            )}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-lg uppercase leading-tight sm:text-xl">
                                {concept.name}
                              </h3>
                              {concept.you_struggling && (
                                <span className="rounded-full bg-[#ff6b6b] px-2 py-0.5 text-[9px] font-black uppercase text-white">
                                  Your Mistake Gap
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-black/60 mt-0.5">
                              {isHigh ? "Critical bottleneck across students" : "Moderate class difficulty"}
                            </p>
                          </div>
                        </div>

                        {/* Big Clear Percentage Indicator */}
                        <div className="text-right shrink-0">
                          <span className="font-display text-2xl sm:text-3xl leading-none">
                            {pct}%
                          </span>
                          <span className="block text-[9px] font-black uppercase text-black/40">
                            Struggling
                          </span>
                        </div>
                      </div>

                      {/* Clean Progress Meter */}
                      <div className="mt-3.5 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#171717] bg-black/10">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              isHigh ? "bg-[#ff6b6b]" : "bg-[#ffd356]"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Inline Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onNavigate("chat", courseId)}
                            className="rounded-lg border-2 border-[#171717] bg-white px-2.5 py-1 text-[10px] font-black uppercase text-[#171717] hover:bg-[#ffd356] transition"
                          >
                            Doubt
                          </button>
                          <button
                            onClick={() => onNavigate("review", courseId)}
                            className="rounded-lg border-2 border-[#171717] bg-[#171717] px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-[#6574ff] transition"
                          >
                            Practice
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}