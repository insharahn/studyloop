// src/ClassPulsePage.jsx
import { useState, useEffect } from "react";
import {
  Download,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  GraduationCap
} from "lucide-react";
import { api, apiStats } from "./api";
import { cn } from "./utils";

const DEFAULT_REPORT = {
  enabled: true,
  overall_clarity_pct: 0,
  overall_accuracy_pct: 0,
  correct_count: 0,
  incorrect_count: 0,
  letter_grade: "UNREVIEWED",
  understanding_level: "Not Yet Graded",
  needs_revision_count: 0,
  solid_count: 0,
  specific_topics_to_revise: [],
  concepts: []
};

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBookOpenSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Paper rustle noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.16);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);

    // Subtle page sweep whoosh
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

function playBookCloseSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Solid thud thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.11);

    oscGain.gain.setValueAtTime(0.38, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);

    // Cover snap noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1000, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

export function ClassPulsePage({ courseId, onNavigate }) {
  const [report, setReport] = useState(DEFAULT_REPORT);
  const [courseDetails, setCourseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleBook = (shouldOpen) => {
    if (shouldOpen) {
      playBookOpenSound();
      setIsOpen(true);
    } else {
      playBookCloseSound();
      setIsOpen(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [data, coursesList] = await Promise.all([
          apiStats.getPulse(courseId),
          api.getCourses()
        ]);
        setReport(data || DEFAULT_REPORT);
        
        const matched = (coursesList || []).find((c) => c.id === courseId);
        if (matched) {
          setCourseDetails(matched);
        }
      } catch (err) {
        console.error("Failed to fetch Course Report:", err);
        setReport(DEFAULT_REPORT);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const handleSavePDF = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 680;
      const ctx = canvas.getContext("2d");

      // 1. Neobrutalist Outer Card Casing (#ffd356)
      ctx.fillStyle = "#ffd356";
      ctx.fillRect(0, 0, 1200, 680);
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#171717";
      ctx.strokeRect(6, 6, 1188, 668);

      // 2. Inner White Card Container
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(36, 36, 1128, 608);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#171717";
      ctx.strokeRect(36, 36, 1128, 608);

      // 3. Top Header Bar
      ctx.fillStyle = "#171717";
      ctx.fillRect(36, 36, 1128, 90);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("STUDYLOOP · ACADEMIC REPORT CARD", 64, 92);

      ctx.fillStyle = "#ffd356";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(
        new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        960,
        90
      );

      // 4. Course Title Header
      ctx.fillStyle = "#171717";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(displayTitle.toUpperCase(), 64, 185);

      // 5. Letter Grade Badge Box
      const badgeBg = letterGrade.includes("GRADE A") ? "#a7ef59" : letterGrade.includes("GRADE B") ? "#ffd356" : "#39d5c8";
      ctx.fillStyle = badgeBg;
      ctx.fillRect(900, 140, 220, 75);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#171717";
      ctx.strokeRect(900, 140, 220, 75);

      ctx.fillStyle = "#171717";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(letterGrade, 1010, 188);
      ctx.textAlign = "left";

      // 6. Section Divider
      ctx.beginPath();
      ctx.moveTo(64, 235);
      ctx.lineTo(1120, 235);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#171717";
      ctx.stroke();

      // 7. Performance Bars
      ctx.fillStyle = "#171717";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("PERFORMANCE BREAKDOWN", 64, 275);

      const drawBar = (x, y, label, pct, color) => {
        ctx.fillStyle = "#171717";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(label, x, y);
        ctx.fillText(`${pct}%`, x + 1010, y);

        // Track
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(x, y + 10, 1056, 18);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#171717";
        ctx.strokeRect(x, y + 10, 1056, 18);

        // Fill
        if (pct > 0) {
          ctx.fillStyle = color;
          ctx.fillRect(x + 2, y + 12, (pct / 100) * 1052, 14);
        }
      };

      drawBar(64, 310, "Overall Course Clarity", clarityPct, "#ff57ce");
      drawBar(64, 375, "Level 1: Foundational Prerequisites", tier1.avgClarity, "#a7ef59");
      drawBar(64, 440, "Level 2: Core Syllabus Topics", tier2.avgClarity, "#ffd356");
      drawBar(64, 505, "Level 3: Advanced Applications", tier3.avgClarity, "#6574ff");

      // 8. Footer Certificate Tagline
      ctx.fillStyle = "#171717";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Verified Academic Report Card · Powered by StudyLoop AI", 64, 605);

      // 9. Instant Automatic File Download
      const link = document.createElement("a");
      link.download = `StudyLoop_Report_Card_${displayTitle.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate Report Card Card:", err);
      window.print();
    }
  };

  const concepts = report?.concepts || [];
  const totalConcepts = concepts.length;
  const clarityPct = Math.round(report.overall_clarity_pct ?? 0);
  const letterGrade = report.letter_grade || "UNREVIEWED";

  // Human-readable Subject Title (Name > Code > Clean Fallback)
  const displayTitle = courseDetails?.name || courseDetails?.code || (courseId && !courseId.includes("-") ? courseId.toUpperCase() : "COURSE REPORT");

  const getTierStats = (levelNum) => {
    const tierConcepts = concepts.filter((c) => (c.level || 1) === levelNum);
    if (!tierConcepts.length) return { total: 0, avgClarity: 0, label: "Unrated", mastered: 0 };
    const avgClarity = Math.round(
      tierConcepts.reduce((acc, c) => acc + (c.clarity_pct || 0), 0) / tierConcepts.length
    );
    const mastered = tierConcepts.filter((c) => (c.clarity_pct || 0) >= 75).length;
    let label = "Low";
    if (avgClarity >= 75) label = "Mastered";
    else if (avgClarity >= 50) label = "Moderate";

    return { total: tierConcepts.length, avgClarity, label, mastered };
  };

  const tier1 = getTierStats(1);
  const tier2 = getTierStats(2);
  const tier3 = getTierStats(3);

  const weakTopics = concepts.filter(
    (c) => c.you_struggling || (c.clarity_pct || 0) < 70
  );

  let gradeTagColor = "bg-[#ffd356] text-[#171717]";
  if (letterGrade.includes("GRADE A")) gradeTagColor = "bg-[#a7ef59] text-[#171717]";
  else if (letterGrade.includes("GRADE B")) gradeTagColor = "bg-[#ffd356] text-[#171717]";
  else if (letterGrade.includes("GRADE C")) gradeTagColor = "bg-[#39d5c8] text-[#171717]";
  else if (letterGrade.includes("GRADE F")) gradeTagColor = "bg-[#ff6b6b] text-white";

  return (
    <div className="relative min-h-screen w-full bg-[#141414] px-4 py-6 text-white font-sans antialiased overflow-hidden flex flex-col justify-between items-center select-none selection:bg-[#ffd356] selection:text-[#171717]">
      
      {/* Warm Ambient Spotlight Glow Behind 3D Book */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
        <div className="h-[450px] w-[450px] rounded-full bg-[#ffd356]/12 blur-[130px]" />
        <div className="h-[350px] w-[350px] rounded-full bg-[#6574ff]/10 blur-[100px]" />
      </div>
      
      {/* Top App Header */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2 z-20">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white transition hover:bg-white hover:text-[#171717] shadow-sm active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 rounded-xl border-2 border-white/20 bg-black/30 backdrop-blur-md px-3.5 py-1.5 shadow-sm">
          <GraduationCap className="h-4 w-4 text-[#ffd356]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
            Academic Journal
          </span>
        </div>

        <button
          onClick={handleSavePDF}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#171717] bg-[#a7ef59] text-[#171717] shadow-hard transition hover:bg-white active:scale-95 no-print"
          title="Save Report Card PDF"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Title & Status (Displays Human-Readable Course Name) */}
      <div className="text-center my-2 z-20">
        <h1 className="font-display text-2xl sm:text-4xl uppercase tracking-tight text-white leading-tight drop-shadow-md">
          {displayTitle}
        </h1>
        <p className="text-xs font-bold text-white/70 flex items-center justify-center gap-1.5 mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#a7ef59] animate-pulse" />
          <span className="hidden sm:inline">
            {isOpen ? "Pages 1 & 2 (Open Spread)" : "Tap Cover To Open Book"}
          </span>
          <span className="inline sm:hidden">Official Academic Report Card</span>
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="my-auto w-full max-w-sm px-2 sm:max-w-none sm:w-auto flex justify-center">
          <div className="hidden sm:block h-[440px] w-64 rounded-3xl bg-white/10 border-4 border-white/20 animate-pulse" />
          <div className="block sm:hidden h-72 w-full rounded-[24px] bg-white/10 border-4 border-white/20 animate-pulse" />
        </div>
      ) : totalConcepts === 0 ? (
        <div className="rounded-[28px] border-4 border-[#171717] bg-white p-8 text-center text-[#171717] shadow-hard max-w-md my-auto">
          <Sparkles className="mx-auto h-10 w-10 text-[#6574ff] mb-3" />
          <h3 className="font-display text-2xl uppercase">No Concept Data Yet</h3>
          <p className="mt-1 text-xs font-bold text-black/60">
            Upload lecture notes to extract concepts and populate your official report card.
          </p>
          <button
            onClick={() => onNavigate("upload", courseId)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-[#171717] bg-[#ffd356] px-5 py-2.5 text-xs font-black uppercase text-[#171717] hover:bg-[#6574ff] hover:text-white transition shadow-hard"
          >
            Upload Lecture Slides
          </button>
        </div>
      ) : (
        <>
          {/* 1. DEDICATED MOBILE REPORT CARD VIEW (< sm screens) */}
          <div className="w-full max-w-sm space-y-4 my-auto block sm:hidden z-10 px-2">
            
            {/* Top Grade Summary Card */}
            <div className="rounded-[24px] border-4 border-[#171717] bg-white p-5 text-[#171717] shadow-hard">
              <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-black/50 tracking-wider block">Academic Status</span>
                  <h2 className="font-display text-2xl uppercase tracking-tight leading-none mt-0.5">{displayTitle}</h2>
                </div>
                <span className={cn("rounded-full border-2 border-[#171717] px-3 py-1 text-xs font-black uppercase", gradeTagColor)}>
                  {letterGrade}
                </span>
              </div>

              {/* Overall Progress Meter */}
              <div className="mt-4 bg-[#ffd356]/20 rounded-2xl border-2 border-[#171717] p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-black/60 block">Overall Course Clarity</span>
                  <span className="font-display text-3xl font-black">{clarityPct}%</span>
                </div>
                <div className="h-12 w-12 rounded-xl border-2 border-[#171717] bg-[#ffd356] flex items-center justify-center font-display font-black text-base shadow-sm">
                  {letterGrade.includes("GRADE") ? letterGrade.replace("GRADE ", "") : "D"}
                </div>
              </div>

              {/* Tiers Breakdown */}
              <div className="mt-4 space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-black">
                    <span>Level 1: Foundations</span>
                    <span>{tier1.avgClarity}%</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                    <div className="h-full bg-[#a7ef59] transition-all duration-500" style={{ width: `${tier1.avgClarity}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-black">
                    <span>Level 2: Core Topics</span>
                    <span>{tier2.avgClarity}%</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                    <div className="h-full bg-[#ffd356] transition-all duration-500" style={{ width: `${tier2.avgClarity}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-black">
                    <span>Level 3: Advanced</span>
                    <span>{tier3.avgClarity}%</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                    <div className="h-full bg-[#6574ff] transition-all duration-500" style={{ width: `${tier3.avgClarity}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Ledger & Action Card */}
            <div className="rounded-[24px] border-4 border-[#171717] bg-white p-5 text-[#171717] shadow-hard space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black/10 pb-2.5">
                <h3 className="font-display text-lg uppercase">Topic Ledger</h3>
                <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-[9px] font-black text-white uppercase">{concepts.length} Units</span>
              </div>

              {weakTopics.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase text-black/60 block mb-1.5">Priority Prerequisite Focus:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto styled-scrollbar">
                    {weakTopics.map((t) => (
                      <span key={t.id} className="rounded-lg border border-[#171717] bg-[#ff6b6b] px-2 py-0.5 text-[10px] font-black text-white">
                        ⚠️ {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onNavigate("chat", courseId)}
                  className="flex-1 rounded-xl border-2 border-[#171717] bg-white py-2.5 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-[#ffd356] transition"
                >
                  Ask Doubt
                </button>
                <button
                  onClick={() => onNavigate("review", courseId)}
                  className="flex-1 rounded-xl border-2 border-[#171717] bg-[#a7ef59] py-2.5 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-white transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Practice
                </button>
              </div>
            </div>

          </div>

          {/* 2. DESKTOP INTERACTIVE 3D JOURNAL STAGE (>= sm screens) */}
          <div className="hidden sm:flex relative my-auto w-full max-w-3xl items-center justify-center py-4 [perspective:2400px]">
            <div 
              className={`relative transition-all duration-700 ease-in-out ${
                isOpen ? "w-[680px]" : "w-72"
              } scale-100 opacity-100`}
            >
              
              {/* Outer Casing */}
              <div 
                className={`absolute inset-0 rounded-[28px] border-4 border-[#171717] bg-[#6574ff] p-3 shadow-[0_35px_65px_-10px_rgba(0,0,0,0.7)] transition-all duration-700 pointer-events-none ${
                  isOpen ? "opacity-100 scale-100 -rotate-1" : "opacity-0 scale-95"
                }`}
              >
                <div className="h-full w-full rounded-[20px] border-2 border-[#171717] bg-[#6574ff]/20" />
              </div>

              {/* Inner Open Spread (2 Pages) */}
              <div 
                className={`relative h-[460px] w-full rounded-[28px] border-4 border-[#171717] bg-[#fcfbf7] shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 flex z-10 ${
                  isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                {/* Left Page: Profile & Tiers */}
                <div className="relative flex-1 bg-[#fcfbf7] p-7 text-[#171717] flex flex-col justify-between shrink-0">
                  <div>
                    <div className="flex items-center justify-between border-b-3 border-[#171717] pb-3">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-black/50 block">Course Profile</span>
                        <h2 className="font-display text-lg uppercase tracking-tight text-[#171717]">Performance Tiers</h2>
                      </div>
                      <span className={cn("rounded-full border-2 border-[#171717] px-3 py-0.5 text-xs font-black uppercase", gradeTagColor)}>
                        {letterGrade}
                      </span>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      <div>
                        <div className="flex justify-between items-baseline text-xs font-black">
                          <span>Overall Clarity</span>
                          <span className="text-black/70">{clarityPct}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                          <div className="h-full rounded-full bg-[#ff57ce] transition-all duration-500" style={{ width: `${clarityPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline text-xs font-black">
                          <span>Level 1: Foundations</span>
                          <span className="text-black/70">{tier1.avgClarity}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                          <div className="h-full rounded-full bg-[#a7ef59] transition-all duration-500" style={{ width: `${tier1.avgClarity}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline text-xs font-black">
                          <span>Level 2: Core Topics</span>
                          <span className="text-black/70">{tier2.avgClarity}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                          <div className="h-full rounded-full bg-[#ffd356] transition-all duration-500" style={{ width: `${tier2.avgClarity}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline text-xs font-black">
                          <span>Level 3: Advanced</span>
                          <span className="text-black/70">{tier3.avgClarity}%</span>
                        </div>
                        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-black/10">
                          <div className="h-full rounded-full bg-[#6574ff] transition-all duration-500" style={{ width: `${tier3.avgClarity}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-[#171717] bg-[#39d5c8]/20 p-3 text-[11px] font-bold leading-relaxed text-[#171717]">
                    Academic Status: <strong>{report.understanding_level || "Active Progress"}</strong> ({clarityPct}% comprehension).
                  </div>
                </div>

                {/* Center Spine Crease */}
                <div className="w-5 bg-gradient-to-r from-black/20 via-black/40 to-black/20 border-x border-black/20 shadow-inner z-10" />

                {/* Right Page: Topic Ledger & Action */}
                <div className="relative flex-1 bg-[#fcfbf7] p-7 text-[#171717] flex flex-col justify-between shrink-0">
                  <div>
                    <div className="flex items-center justify-between border-b-3 border-[#171717] pb-3">
                      <h2 className="font-display text-lg uppercase tracking-tight text-[#171717]">Topic Ledger</h2>
                      <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-[9px] font-black uppercase text-white">
                        {concepts.length} Nodes
                      </span>
                    </div>

                    <div className="rounded-xl border-2 border-[#171717] bg-black/5 p-3 mt-3">
                      <div className="grid grid-flow-col auto-cols-fr gap-1 items-end h-28 pb-1 border-b-2 border-black/10">
                        {concepts.map((concept) => {
                          const pct = Math.round(concept.clarity_pct || 0);
                          const hasAttempted = pct > 0 || (concept.correct_count || 0) > 0 || (concept.incorrect_count || 0) > 0;
                          const isSolid = pct >= 70;
                          return (
                            <div key={concept.id} className="flex flex-col items-center h-full justify-end">
                              <div className="w-full max-w-[14px] h-full flex items-end bg-black/10 border border-[#171717] rounded-t-sm overflow-hidden" title={`${concept.name}: ${hasAttempted ? `${pct}% Clarity` : "Unattempted"}`}>
                                <div
                                  className={`w-full rounded-t-sm transition-all duration-500 ${
                                    !hasAttempted ? "bg-black/10" : isSolid ? "bg-[#a7ef59]" : "bg-[#ff6b6b]"
                                  }`}
                                  style={{ height: hasAttempted ? `${Math.max(10, pct)}%` : "0%" }}
                                />
                              </div>
                              <span className="text-[7px] font-black text-black/70 truncate w-6 text-center mt-1">
                                {concept.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {weakTopics.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[9px] font-black uppercase text-black/60 block mb-1">Prerequisite Priority:</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1.5 styled-scrollbar">
                          {weakTopics.map((topic) => (
                            <span key={topic.id} className="rounded-md border border-[#171717] bg-[#ff6b6b] px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                              ⚠️ {topic.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onNavigate("chat", courseId)}
                      className="flex-1 rounded-xl border-2 border-[#171717] bg-white py-2.5 text-xs font-black uppercase text-[#171717] hover:bg-[#ffd356] transition shadow-hard flex items-center justify-center gap-1.5"
                    >
                      <span>Doubt</span>
                    </button>
                    <button
                      onClick={() => onNavigate("review", courseId)}
                      className="flex-1 rounded-xl border-2 border-[#171717] bg-[#a7ef59] py-2.5 text-xs font-black uppercase text-[#171717] hover:bg-white transition shadow-hard flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Front Cover */}
              <div
                onClick={() => !isOpen && handleToggleBook(true)}
                style={{
                  transformOrigin: "left center",
                  transform: isOpen ? "rotateY(-180deg)" : "rotateY(0deg)",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden"
                }}
                className={`absolute inset-0 h-[460px] w-72 rounded-r-[28px] rounded-l-md border-4 border-[#171717] bg-[#ffd356] p-6 shadow-[25px_30px_50px_rgba(0,0,0,0.65)] transition-transform duration-700 ease-in-out cursor-pointer flex flex-col justify-between z-20 text-[#171717] ${
                  isOpen ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
                }`}
              >
                <div className="absolute inset-y-0 left-0 w-6 rounded-l-md bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />

                <div className="flex justify-start items-center">
                  <span className="rounded-full bg-[#171717] px-3 py-1 text-[9px] font-black uppercase text-white">
                    REPORT CARD
                  </span>
                </div>

                <div className="text-center px-2 space-y-3">
                  <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-[#171717] leading-tight max-h-20 overflow-hidden">
                    {displayTitle}
                  </h2>
                  
                  <div className="mx-auto flex h-20 max-w-[210px] items-center justify-center rounded-2xl border-4 border-[#171717] bg-white px-4 shadow-hard">
                    <span className={cn(
                      "text-[#171717] tracking-wide uppercase text-center leading-tight",
                      letterGrade.length > 8 ? "text-xs sm:text-sm font-bold tracking-wider" : "font-display font-black text-2xl sm:text-3xl"
                    )}>
                      {letterGrade}
                    </span>
                  </div>
                  
                  <p className="text-xs font-black uppercase tracking-wider text-[#171717]/80">
                    {clarityPct}% Course Clarity
                  </p>
                </div>

                <div className="text-center">
                  <span className="inline-block rounded-xl border-2 border-[#171717] bg-[#171717] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#6574ff] transition">
                    Tap To Open Book →
                  </span>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Bottom Control Dock (Desktop only) */}
      <div className="w-full max-w-sm hidden sm:flex items-center justify-center gap-3 pb-4 z-20">
        <button
          onClick={() => handleToggleBook(!isOpen)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#171717] bg-white py-3 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-[#ffd356] transition active:scale-95"
        >
          <span>{isOpen ? "Close Book" : "Open Book"}</span>
        </button>

        <button
          onClick={() => onNavigate("review", courseId)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#171717] bg-[#a7ef59] py-3 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-white transition active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Practice</span>
        </button>
      </div>

    </div>
  );
}