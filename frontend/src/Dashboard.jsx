import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  LogOut,
  MessageSquare,
  Network,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  FileText,
  X
} from "lucide-react";
import { api, apiStats, calculateRealDailyStreak } from "./api";
import { cn } from "./utils";
import { SkeletonBlock, EmptyState } from "./States";
function StylizedCalendarPicker({ value, onChange, minDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState("bottom");

  const initialDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart position detection: open above or below depending on available space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 330;
      if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
        setPosition("top");
      } else {
        setPosition("bottom");
      }
    }
  }, [isOpen, viewDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day) => {
    const selectedDate = new Date(year, month, day);
    if (selectedDate < today) return;

    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const formattedDisplay = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "Select Exam Date";

  const startYear = today.getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => startYear + i);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Input Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border-2 border-[#171717] bg-white px-3.5 py-2.5 text-xs font-bold text-[#171717] outline-none shadow-sm hover:border-[#6574ff] transition"
      >
        <span className={value ? "text-[#171717] font-black" : "text-[#171717]/50"}>
          {formattedDisplay}
        </span>
        <Calendar className="h-4 w-4 text-[#171717] shrink-0" />
      </div>

      {/* Stylized Calendar Popover / Mobile Modal */}
      {isOpen && (
        <div
          className={cn(
            "z-50 rounded-2xl border-3 border-[#171717] bg-white p-3.5 text-[#171717] shadow-hard animate-in fade-in zoom-in-95 duration-150",
            // Mobile: centered modal dialog
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[320px]",
            // Desktop: relative popup above or below based on space
            "sm:absolute sm:left-0 sm:w-full sm:min-w-[290px] sm:max-w-none sm:translate-x-0 sm:translate-y-0",
            position === "top" ? "sm:bottom-full sm:top-auto sm:mb-2" : "sm:top-full sm:bottom-auto sm:mt-2"
          )}
        >
          {/* Header Month & Year Controls */}
          <div className="mb-3 flex items-center justify-between border-b-2 border-[#171717]/15 pb-2.5 gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#171717] bg-[#ffd356] text-xs font-black hover:bg-[#39d5c8] transition"
              title="Previous Month"
            >
              ‹
            </button>

            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm uppercase tracking-tight text-[#171717]">
                {monthNames[month]}
              </span>

              {/* Year Selector Dropdown */}
              <select
                value={year}
                onChange={(e) => setViewDate(new Date(parseInt(e.target.value, 10), month, 1))}
                className="rounded-lg border-2 border-[#171717] bg-[#ffd356] px-1.5 py-0.5 font-display text-xs font-black text-[#171717] outline-none cursor-pointer hover:bg-[#39d5c8] transition"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#171717] bg-[#ffd356] text-xs font-black hover:bg-[#39d5c8] transition"
              title="Next Month"
            >
              ›
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="text-[10px] font-black uppercase text-[#171717]/60">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day);
              dateObj.setHours(0, 0, 0, 0);

              const isPast = dateObj < today;
              const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = value === isoStr;
              const isToday = dateObj.getTime() === today.getTime();

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-lg text-xs font-black transition-all",
                    isPast && "opacity-25 cursor-not-allowed bg-black/5 text-[#171717]",
                    isSelected && "bg-[#171717] text-white border-2 border-[#171717] shadow-xs scale-105",
                    !isSelected && isToday && "bg-[#ffd356] text-[#171717] border-2 border-[#171717]",
                    !isSelected && !isPast && !isToday && "bg-white hover:bg-[#39d5c8] border border-[#171717]/20 text-[#171717]"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard({ user, onNavigate }) {
  const [courses, setCourses] = useState(() => {
    try {
      const cached = localStorage.getItem("studyloop_cached_courses");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem("studyloop_cached_courses");
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  async function handleDeleteCourse(courseId, e) {
    e.stopPropagation();
    await api.deleteCourse(courseId);
    setCourses((prev) => {
      const updated = prev.filter((c) => c.id !== courseId);
      try {
        localStorage.setItem("studyloop_cached_courses", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  useEffect(() => {
    async function loadCourses() {
      if (!courses || courses.length === 0) {
        setLoading(true);
      }
      try {
        const fetchedCourses = await api.getCourses();
        setCourses(fetchedCourses);
        try {
          localStorage.setItem("studyloop_cached_courses", JSON.stringify(fetchedCourses));
        } catch {}

        if (fetchedCourses?.[0]?.id) {
          const fetchedStats = await apiStats.getStats(fetchedCourses[0].id);
          setStats(fetchedStats);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const totalDueToday = courses.reduce((acc, c) => acc + (c.due_today || 0), 0);
  
  const activeCoursesWithDocs = courses.filter((c) => (c.doc_count || 0) > 0);
  const coursesToAvg = activeCoursesWithDocs.length > 0 ? activeCoursesWithDocs : courses;
  const averageMastery = coursesToAvg.length > 0
    ? Math.round(
        coursesToAvg.reduce((acc, c) => {
          const raw = typeof c.mastery_pct === "number" ? c.mastery_pct : 0;
          const pct = raw > 1 ? raw : raw * 100;
          return acc + pct;
        }, 0) / coursesToAvg.length
      )
    : 0;

  const today = new Date();
  const minDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!newCourseName || isCreatingCourse) return;

    if (newExamDate && newExamDate < minDateStr) {
      alert("Please select today or a future date for the exam.");
      return;
    }

    setIsCreatingCourse(true);
    try {
      const created = await api.createCourse({
        name: newCourseName,
        code: newCourseCode || undefined,
        exam_date: newExamDate || undefined
      });

      const newCourseObj = {
        ...created,
        doc_count: 0,
        card_count: 0,
        due_today: 0,
        mastery_pct: 0
      };

      setCourses((prev) => {
        const updated = [...prev, newCourseObj];
        try {
          localStorage.setItem("studyloop_cached_courses", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setShowAddModal(false);
      setNewCourseName("");
      setNewCourseCode("");
      setNewExamDate("");
    } finally {
      setIsCreatingCourse(false);
    }
  }

  const displayName =
    user?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Student";

  return (
    <div className="min-h-screen bg-[#171717] px-4 pb-20 pt-6 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        {/* Top Navbar */}
        <header className="mb-8 flex flex-row items-center justify-between gap-3 border-b-2 border-white/10 pb-6">
          <div>
            <span className="brand-mark text-xl font-black uppercase text-white">StudyLoop</span>
            <p className="mt-1 text-xs font-bold text-white/60">
              Logged in as <span className="text-[#ffd356]">{displayName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate("upload")}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#39d5c8] px-3 sm:px-4 text-xs font-black uppercase text-[#171717] shadow-hard transition hover:-translate-y-0.5"
              title="Upload PDF"
            >
              <UploadCloud className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-white bg-white/10 px-3 sm:px-4 text-xs font-black uppercase text-white backdrop-blur transition hover:bg-white hover:text-[#171717]"
              title="Add Course"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Add Course</span>
            </button>
            <button
              onClick={() => onNavigate("logout")}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-white/30 bg-white/10 px-3 sm:px-3.5 text-xs font-black uppercase text-white transition hover:bg-rose-500 hover:border-rose-600 hover:text-white"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Global Progress Strip */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-[20px] border-3 border-[#171717] bg-[#ffd356] p-4 text-[#171717] shadow-hard">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Daily Streak</span>
              <Flame className="h-5 w-5 text-orange-600 fill-orange-500" />
            </div>
            <p className="font-display text-4xl uppercase mt-1">
              {calculateRealDailyStreak()} {calculateRealDailyStreak() === 1 ? "DAY" : "DAYS"}
            </p>
          </div>

          <div className="rounded-[20px] border-3 border-[#171717] bg-[#6574ff] p-4 text-white shadow-hard">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Cards Due</span>
              <RotateCcw className="h-5 w-5" />
            </div>
            <p className="font-display text-4xl uppercase mt-1">{totalDueToday} CARDS</p>
          </div>

          <div className="rounded-[20px] border-3 border-[#171717] bg-[#a7ef59] p-4 text-[#171717] shadow-hard">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Avg Mastery</span>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="font-display text-4xl uppercase mt-1">{averageMastery}%</p>
          </div>

          <div className="rounded-[20px] border-3 border-[#171717] bg-white p-4 text-[#171717] shadow-hard">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Active Courses</span>
              <GraduationCap className="h-5 w-5 text-[#6574ff]" />
            </div>
            <p className="font-display text-4xl uppercase mt-1">{courses.length} ENROLLED</p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">Your Syllabi</h2>
          <span className="text-xs font-bold text-white/50">Ordered by exam pressure</span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <SkeletonBlock className="h-64 rounded-[28px]" />
            <SkeletonBlock className="h-64 rounded-[28px]" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses enrolled"
            description="Create your first subject and link your syllabus to generate flashcards and exam schedules."
            actionText="Add First Course"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course, idx) => {
              const bgColors = ["bg-[#ffd356] text-[#171717]", "bg-[#6574ff] text-white", "bg-[#ff57ce] text-white"];
              const cardBg = bgColors[idx % bgColors.length];

              const docCount = course.doc_count || 0;
              const cardCount = docCount === 0 ? 0 : (course.card_count || 0);
              const dueToday = docCount === 0 ? 0 : (course.due_today || 0);
              
              const rawMastery = typeof course.mastery_pct === "number" ? course.mastery_pct : 0;
              const masteryPercent = docCount === 0 ? 0 : (rawMastery > 1 ? Math.round(rawMastery) : Math.round(rawMastery * 100));

              return (
                <div
                  key={course.id}
                  className={cn(
                    "relative rounded-[28px] border-4 border-[#171717] p-5 shadow-hard transition-transform hover:-translate-y-1 sm:p-6",
                    cardBg
                  )}
                >
                  {/* Spiral Notebook Binding Effect (3 Black Dashes on Top Right Edge) */}
                  <div className="pointer-events-none absolute right-6 -top-3.5 flex items-center gap-1.5 z-20">
                    <span className="h-6 w-2 rounded-full bg-[#171717] shadow-sm transform -rotate-12" />
                    <span className="h-6 w-2 rounded-full bg-[#171717] shadow-sm transform -rotate-12" />
                    <span className="h-6 w-2 rounded-full bg-[#171717] shadow-sm transform -rotate-12" />
                  </div>

                  {/* Exam Countdown Badge */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border-2 border-[#171717] bg-white px-3 py-0.5 text-[10px] font-black uppercase text-[#171717]">
                        {course.code || "COURSE"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteCourse(course.id, e)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#171717] bg-white text-[#171717] hover:bg-rose-500 hover:text-white transition shadow-sm"
                        title="Delete Course"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {course.days_to_exam !== null && (
                      <span className="flex items-center gap-1 rounded-full border-2 border-[#171717] bg-[#171717] px-3 py-0.5 text-[10px] font-black uppercase text-[#ffd356]">
                        <Calendar className="h-3 w-3" />
                        {course.days_to_exam} Days to Exam
                      </span>
                    )}
                  </div>

                  {/* Course Title */}
                  <h3 className="font-display text-3xl uppercase leading-none sm:text-4xl">
                    {course.name}
                  </h3>

                  {/* Stats Pill Row */}
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-lg bg-black/15 px-2.5 py-1 backdrop-blur-sm">
                      📄 {docCount} Docs
                    </span>
                    <span className="rounded-lg bg-black/15 px-2.5 py-1 backdrop-blur-sm">
                      ⚡ {cardCount} Generated Cards
                    </span>
                    <span className="rounded-lg bg-black/15 px-2.5 py-1 backdrop-blur-sm">
                      🎯 {dueToday} Due Today
                    </span>
                  </div>

                  {/* Mastery Progress Bar */}
                  <div className="mt-5">
                    <div className="mb-1 flex justify-between text-[11px] font-black uppercase">
                      <span>Course Mastery</span>
                      <span>{masteryPercent}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-white/40">
                      <div
                        className="h-full bg-[#171717] transition-all duration-500"
                        style={{ width: `${Math.max(masteryPercent, docCount > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Conditional Action: Upload PDF for Empty Course vs Practice/Doubts/Graph/Pulse */}
                  {docCount === 0 ? (
                    <div className="mt-5 rounded-2xl border-2 border-dashed border-[#171717]/40 bg-white/40 p-4 text-center">
                      <p className="text-xs font-bold text-[#171717]">No lecture notes or syllabus uploaded yet.</p>
                      <button
                        onClick={() => onNavigate("upload", course.id)}
                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#171717] bg-[#39d5c8] px-4 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-cyan-300 transition"
                      >
                        <UploadCloud className="h-4 w-4" />
                        Upload PDF & Generate Cards
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-wrap gap-2 border-t-2 border-black/10 pt-4">
                      <button
                        onClick={() => onNavigate("review", course.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#a7ef59] px-3 py-2 text-xs font-black uppercase text-[#171717] shadow-sm transition hover:bg-lime-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Practice ({dueToday})
                      </button>
                      <button
                        onClick={() => onNavigate("chat", course.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-white/80 px-3 py-2 text-xs font-black uppercase text-[#171717] transition hover:bg-white"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Doubts
                      </button>
                      <button
                        onClick={() => onNavigate("concepts", course.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-white/80 px-3 py-2 text-xs font-black uppercase text-[#171717] transition hover:bg-white"
                      >
                        <Network className="h-3.5 w-3.5" />
                        Graph
                      </button>
                      <button
                        onClick={() => onNavigate("pulse", course.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-white/80 px-3 py-2 text-xs font-black uppercase text-[#171717] transition hover:bg-white"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Report
                      </button>
                      <button
                        onClick={() => onNavigate("sources", course.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-white/80 px-3 py-2 text-xs font-black uppercase text-[#171717] transition hover:bg-white"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Sources
                      </button>
                      <button
                        onClick={() => onNavigate("cards", course.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-white/80 px-3 py-2 text-xs font-black uppercase text-[#171717] transition hover:bg-white"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Cards
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[28px] border-4 border-[#171717] bg-[#ffd356] p-6 text-[#171717] shadow-hard sm:p-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171717] bg-white font-black"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-3xl uppercase">Add New Course</h3>
            <p className="mt-0.5 text-xs font-bold opacity-80">Link your syllabus and exam deadline.</p>

            <form onSubmit={handleCreateCourse} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#171717] bg-white px-3.5 py-2.5 text-xs font-bold text-[#171717] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase mb-1">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS401"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#171717] bg-white px-3.5 py-2.5 text-xs font-bold text-[#171717] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase mb-1">Exam / Midterm Date *</label>
                <StylizedCalendarPicker
                  value={newExamDate}
                  onChange={(dateStr) => setNewExamDate(dateStr)}
                  minDate={minDateStr}
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingCourse}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#39d5c8] text-xs font-black uppercase text-[#171717] shadow-hard transition hover:bg-[#2fc4b7] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingCourse ? "Creating..." : "Create Course & Plan"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}