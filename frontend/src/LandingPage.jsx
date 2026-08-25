import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  MessageSquareText,
  RotateCcw,
  Instagram,
  Linkedin
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "./utils";

gsap.registerPlugin(ScrollTrigger);

const programs = [
  {
    step: "01",
    title: "Upload Course Material",
    copy: "Drag and drop your PDFs, lecture slides, and notes. StudyLoop organizes your materials while keeping every page number and slide reference exact.",
    className: "bg-lemon",
    icon: FileText,
    visual: "upload"
  },
  {
    step: "02",
    title: "Ask Doubts With Page Citations",
    copy: "Ask any question and get clear answers sourced strictly from your uploaded files. If a concept isn't in your notes, StudyLoop tells you directly instead of making things up.",
    className: "bg-iris text-white",
    icon: MessageSquareText,
    visual: "ask"
  },
  {
    step: "03",
    title: "Fix Foundation Gaps",
    copy: "When you miss a practice question, StudyLoop traces back to the basic concept you need to review first so you're 100% ready for exam day.",
    className: "bg-berry",
    icon: RotateCcw,
    visual: "loop"
  }
];

const programTabs = [
  {
    id: "confidence-tutor",
    label: "Accurate AI Tutor",
    color: "bg-[#ffd356]",
    textColor: "text-[#171717]",
    badgeColor: "bg-[#ff8b67]",
    badgeText: "NO MADE-UP FACTS",
    headline: "STRICT ACCURACY AI TUTOR.",
    tagline: "No fake facts. Zero guesswork.",
    description:
      "If a topic isn't in your lecture slides, StudyLoop explicitly refuses to answer rather than fabricating information. Every single response links back to the exact page and slide number.",
    cards: [
      {
        title: "Exact Page Links",
        subtitle: "Every answer links directly to a real slide & page",
        bg: "bg-[#e0f7fa]",
        asset: "/hero-assets/1.png"
      },
      {
        title: "Syllabus Boundary",
        subtitle: "Declines questions outside your course material",
        bg: "bg-[#ffecb3]",
        asset: "/hero-assets/2.png"
      },
      {
        title: "Slide Excerpts",
        subtitle: "Click to preview the raw text from your notes",
        bg: "bg-[#ffcdd2]",
        asset: "/hero-assets/3.png"
      },
      {
        title: "Smart Notes Search",
        subtitle: "Finds matching ideas even if you use different words",
        bg: "bg-[#e1bee7]",
        asset: "/hero-assets/6.png"
      }
    ]
  },
  {
    id: "root-cause",
    label: "Foundation Tracing",
    color: "bg-[#6574ff]",
    textColor: "text-white",
    badgeColor: "bg-[#ffd356]",
    badgeText: "SMART CONCEPT MAP",
    headline: "ROOT-CAUSE CONCEPT MAP.",
    tagline: "Fix why you got a question wrong.",
    description:
      "Struggling with a difficult topic usually happens because an earlier basic concept wasn't clear. StudyLoop maps topic prerequisites so you can quickly strengthen your weak spots.",
    cards: [
      {
        title: "Interactive Concept Map",
        subtitle: "Visual map showing how topics build on each other",
        bg: "bg-[#e0f7fa]",
        asset: "/hero-assets/7.png"
      },
      {
        title: "Prerequisite Callout",
        subtitle: "Highlights the foundational concept to review",
        bg: "bg-[#ffecb3]",
        asset: "/hero-assets/4.png"
      },
      {
        title: "Weak Topic Tracker",
        subtitle: "Saves topics you found tricky for quick revision",
        bg: "bg-[#ffcdd2]",
        asset: "/hero-assets/1.png"
      },
      {
        title: "Mastery Progress",
        subtitle: "Updates your score as you practice and improve",
        bg: "bg-[#e1bee7]",
        asset: "/hero-assets/5.png"
      }
    ]
  },
  {
    id: "exam-schedule",
    label: "Exam Planner",
    color: "bg-[#ff57ce]",
    textColor: "text-white",
    badgeColor: "bg-[#39d5c8]",
    badgeText: "EXAM DEADLINE READY",
    headline: "EXAM-DATE-AWARE REVISION.",
    tagline: "Spaced practice built around your exam date.",
    description:
      "Ordinary flashcard apps assume you have endless time. StudyLoop automatically organizes your daily practice cards so you finish reviewing everything before your midterm or final exam.",
    cards: [
      {
        title: "Memory Tracker",
        subtitle: "Calculates when you are about to forget a card",
        bg: "bg-[#e0f7fa]",
        asset: "/hero-assets/3.png"
      },
      {
        title: "Deadline Planner",
        subtitle: "Adjusts daily practice count based on days remaining",
        bg: "bg-[#ffecb3]",
        asset: "/hero-assets/2.png"
      },
      {
        title: "Urgency Boost",
        subtitle: "Prioritizes urgent topics as exam day gets closer",
        bg: "bg-[#ffcdd2]",
        asset: "/hero-assets/6.png"
      },
      {
        title: "Pace Indicator",
        subtitle: "Clear badge showing if you're on track to finish",
        bg: "bg-[#e1bee7]",
        asset: "/hero-assets/7.png"
      }
    ]
  },
  {
    id: "class-pulse",
    label: "Class Pulse",
    color: "bg-[#39d5c8]",
    textColor: "text-[#171717]",
    badgeColor: "bg-[#ff8b67]",
    badgeText: "100% ANONYMOUS",
    headline: "ANONYMOUS CLASS HEATMAP.",
    tagline: "See which topics your class finds tricky.",
    description:
      "View an anonymous class heatmap to see which concepts are hardest for your peers. Know whether a topic is genuinely difficult for everyone without sacrificing anyone's privacy.",
    cards: [
      {
        title: "Class Difficulty Map",
        subtitle: "Shows the hardest topics across your classmate group",
        bg: "bg-[#e0f7fa]",
        asset: "/hero-assets/8.png"
      },
      {
        title: "Privacy Protection",
        subtitle: "Keeps all student stats completely anonymous",
        bg: "bg-[#ffecb3]",
        asset: "/hero-assets/4.png"
      },
      {
        title: "Class Comparison",
        subtitle: "See how your progress compares to class average",
        bg: "bg-[#ffcdd2]",
        asset: "/hero-assets/5.png"
      },
      {
        title: "Hard Topic Spotlight",
        subtitle: "Highlights lecture topics that need extra attention",
        bg: "bg-[#e1bee7]",
        asset: "/hero-assets/9.png"
      }
    ]
  }
];

function ProgramVisual({ type }) {
  if (type === "upload") {
    return (
      <div className="how-ui-preview upload-vertical-preview rounded-2xl border-[3px] border-ink bg-white p-3 text-ink">
        <span data-upload-scan className="upload-scan-line" />
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-aqua">
          <FileText className="h-5 w-5" />
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs font-black">Lecture_04.pdf</p>
          <p className="text-[10px] font-bold opacity-60">Parsing pages</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {["Page 12", "Page 13", "Page 14"].map((page) => (
            <div key={page} data-upload-page className="rounded-lg border-2 border-ink/20 bg-paper px-2 py-1 text-center text-[10px] font-black">
              {page}
            </div>
          ))}
        </div>
        <span data-upload-percent className="absolute right-2 top-2 rounded-full bg-lemon px-2 py-0.5 text-[10px] font-black">84%</span>
      </div>
    );
  }

  if (type === "ask") {
    return (
      <div className="how-ui-preview space-y-2 rounded-2xl border-[3px] border-white/80 bg-white p-3 text-ink">
        <p data-chat-bubble className="max-w-[82%] rounded-xl bg-paper px-3 py-2 text-xs font-bold">Why does AVL rotation fix imbalance?</p>
        <div data-chat-bubble className="ml-auto max-w-[88%] rounded-xl bg-aqua px-3 py-2 text-xs font-bold">
          <span data-chat-text className="chat-type-text">Rotations restore height bounds using the local subtree structure.</span>
          <span data-citation-tag className="mt-2 inline-block rounded-full bg-ink px-2.5 py-1 text-[10px] font-black text-white">[Page 14, Lecture 04]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="how-ui-preview rounded-2xl border-[3px] border-ink bg-white p-3 text-ink">
      <div data-review-card className="rounded-xl bg-paper p-3">
        <p className="text-[10px] font-black uppercase opacity-50">Review feedback</p>
        <p className="mt-1.5 text-xs font-black">Missed prerequisite detected</p>
      </div>
      <div data-root-cause className="mt-2 rounded-xl bg-iris px-3 py-2 text-xs font-black text-white">
        Root Cause: Tree Balancing
        <span className="mt-1 block text-[10px] opacity-80">62% Mastery</span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/25">
          <span data-mastery-bar className="block h-full rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}

export function LandingPage({ onOpenAuth, onNavigate }) {
  const rootRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-rise]", {
        y: 42,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out"
      });

      gsap.to("[data-float]", {
        y: "random(-12, 12)",
        x: "random(-8, 8)",
        rotation: "random(-8, 8)",
        duration: "random(2.4, 4)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.15
      });

      // Section 2 Scroll Trigger
      gsap.from("[data-loop-heading]", {
        scrollTrigger: {
          trigger: "[data-loop-section]",
          start: "top 72%",
          once: true
        },
        y: 34,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out"
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: "[data-loop-section]",
          start: "top 82%",
          end: "top 38%",
          scrub: 0.8
        }
      })
        .from("[data-loop-title-word]", {
          yPercent: 110,
          rotate: 4,
          opacity: 0,
          stagger: 0.08,
          ease: "power4.out"
        })
        .fromTo(
          "[data-loop-highlight]",
          { scale: 0.78, rotate: -10, "--highlight-sweep": "-120%" },
          {
            scale: 1,
            rotate: -5,
            "--highlight-sweep": "120%",
            ease: "back.out(1.7)"
          },
          "-=0.28"
        );

      const loopCards = gsap.utils.toArray("[data-loop-card]");
      gsap.set(loopCards, {
        transformPerspective: 900,
        transformOrigin: "50% 100%",
        willChange: "transform, opacity, filter"
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: "[data-loop-grid]",
          start: "top 90%",
          end: "center 52%",
          scrub: 0.8
        }
      }).from(loopCards, {
        y: 120,
        scale: 0.82,
        rotateX: 16,
        rotateZ: -3,
        opacity: 0,
        filter: "blur(18px)",
        stagger: 0.18,
        ease: "power3.out"
      });

      // Section 2 How-It-Works Visual Card Entry & Micro-Interactions
      gsap.from("[data-loop-visual]", {
        scrollTrigger: {
          trigger: "[data-loop-grid]",
          start: "top 58%",
          once: true
        },
        y: 24,
        scale: 0.94,
        opacity: 0,
        duration: 0.65,
        stagger: 0.12,
        ease: "back.out(1.4)"
      });

      // Micro-interaction 1: Upload scanning & parsing animation
      gsap.timeline({ repeat: -1, repeatDelay: 0.65 })
        .fromTo("[data-upload-scan]", { y: -8, opacity: 0 }, { y: 120, opacity: 1, duration: 1.05, ease: "power1.inOut" })
        .fromTo("[data-upload-page]", { x: -10, opacity: 0.35 }, { x: 0, opacity: 1, duration: 0.28, stagger: 0.12, ease: "power2.out" }, 0.1)
        .to("[data-upload-percent]", { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 0.75)
        .to("[data-upload-page]", { opacity: 0.55, duration: 0.22, stagger: 0.08 }, 1.15);

      // Micro-interaction 2: Interactive chat bubbles & citation tag
      gsap.timeline({ repeat: -1, repeatDelay: 0.85 })
        .fromTo("[data-chat-bubble]", { y: 10, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.36, stagger: 0.34, ease: "back.out(1.7)" })
        .fromTo("[data-chat-text]", { width: "0%" }, { width: "100%", duration: 0.8, ease: "steps(18)" }, 0.55)
        .fromTo("[data-citation-tag]", { scale: 0.78, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(2)" }, 1.2)
        .to("[data-chat-bubble]", { opacity: 0, y: -6, duration: 0.25, stagger: 0.08 }, 2.2);

      // Micro-interaction 3: Root cause prerequisite & mastery recalibration bar
      gsap.timeline({ repeat: -1, repeatDelay: 0.75 })
        .fromTo("[data-review-card]", { y: 8, opacity: 0.65 }, { y: 0, opacity: 1, duration: 0.38, ease: "power2.out" })
        .fromTo("[data-root-cause]", { y: 10, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.42, ease: "back.out(1.7)" }, 0.3)
        .fromTo("[data-mastery-bar]", { width: "12%" }, { width: "62%", duration: 0.7, ease: "power2.out" }, 0.5)
        .to("[data-root-cause]", { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, 1.15)
        .to(["[data-review-card]", "[data-root-cause]"], { opacity: 0.72, duration: 0.28 }, 2.15);

      // Section 3 Headline & Honest Badge GSAP Animation
      gsap.timeline({
        scrollTrigger: {
          trigger: "#program",
          start: "top 82%",
          end: "top 45%",
          scrub: 0.8
        }
      })
        .from("[data-program-title-word]", {
          yPercent: 110,
          rotate: 4,
          opacity: 0,
          stagger: 0.06,
          ease: "power4.out"
        })
        .fromTo(
          "[data-program-honest-sticker]",
          { scale: 0.75, rotate: -8 },
          { scale: 1, rotate: -1, ease: "back.out(1.7)" },
          "-=0.25"
        );

      // Section 3 Container Entry
      gsap.from("[data-program-panel]", {
        scrollTrigger: {
          trigger: "#program",
          start: "top 70%",
          once: true
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Section 4 (Waitlist) Headline & Content GSAP Animation
      gsap.timeline({
        scrollTrigger: {
          trigger: "#waitlist",
          start: "top 88%",
          end: "center 55%",
          scrub: 1.2
        }
      })
        .from("[data-waitlist-title-word]", {
          yPercent: 110,
          rotate: 4,
          opacity: 0,
          stagger: 0.07,
          ease: "power4.out"
        })
        .from(
          "[data-waitlist-subheading]",
          {
            y: 28,
            opacity: 0,
            ease: "power3.out"
          },
          "-=0.2"
        )
        .from(
          "[data-waitlist-form]",
          {
            y: 36,
            scale: 0.92,
            opacity: 0,
            ease: "back.out(1.5)"
          },
          "-=0.2"
        );

      const hero = rootRef.current?.querySelector("[data-hero]");
      if (!hero) return;

      const setBgX = gsap.quickTo(hero, "--hero-bg-x", { duration: 0.75, ease: "power3.out" });
      const setBgY = gsap.quickTo(hero, "--hero-bg-y", { duration: 0.75, ease: "power3.out" });
      const setTitleX = gsap.quickTo(hero, "--hero-title-x", { duration: 0.45, ease: "power3.out" });
      const setTitleY = gsap.quickTo(hero, "--hero-title-y", { duration: 0.45, ease: "power3.out" });
      const setAssetX = gsap.quickTo(hero, "--hero-asset-x", { duration: 0.65, ease: "power3.out" });
      const setAssetY = gsap.quickTo(hero, "--hero-asset-y", { duration: 0.65, ease: "power3.out" });
      const setHoverShade = gsap.quickTo(hero, "--hero-hover-shade", { duration: 0.25, ease: "power2.out" });

      function handlePointerMove(event) {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const cursorX = ((event.clientX - rect.left) / rect.width) * 100;
        const cursorY = ((event.clientY - rect.top) / rect.height) * 100;

        hero.style.setProperty("--hero-cursor-x", `${cursorX}%`);
        hero.style.setProperty("--hero-cursor-y", `${cursorY}%`);
        setHoverShade(1);
        setBgX(`${x * -5}px`);
        setBgY(`${y * -5}px`);
        setTitleX(`${x * 12}px`);
        setTitleY(`${y * 9}px`);
        setAssetX(`${x * 6}px`);
        setAssetY(`${y * 5}px`);
      }

      function resetHeroMotion() {
        setHoverShade(0);
        setBgX("0px");
        setBgY("0px");
        setTitleX("0px");
        setTitleY("0px");
        setAssetX("0px");
        setAssetY("0px");
      }

      hero.addEventListener("pointermove", handlePointerMove);
      hero.addEventListener("pointerleave", resetHeroMotion);

      return () => {
        hero.removeEventListener("pointermove", handlePointerMove);
        hero.removeEventListener("pointerleave", resetHeroMotion);
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (onOpenAuth) {
      onOpenAuth(email.trim());
    } else {
      setSubmitted(true);
    }
  }

  return (
    <main ref={rootRef} className="min-h-screen overflow-x-hidden bg-ink text-white">
      {/* Hero Section */}
      <section data-hero className="hero-noise relative min-h-screen overflow-hidden px-4 pb-12 pt-6 sm:px-8 sm:pt-8 lg:px-12">
        <nav data-rise className="relative z-20 mx-auto grid max-w-5xl grid-cols-2 items-center text-[11px] font-medium text-white/65 sm:grid-cols-5">
          <a className="hidden justify-self-start transition hover:text-white sm:block" href="#loop">
            Feature
          </a>
          <a className="hidden justify-self-center transition hover:text-white sm:block" href="#program">
            Our Services
          </a>
          <a className="brand-mark justify-self-start font-black uppercase tracking-normal text-white sm:justify-self-center" href="#">
            StudyLoop
          </a>
          <a
            className="hidden justify-self-center transition hover:text-white sm:block cursor-pointer"
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) onNavigate("about");
            }}
          >
            About Us
          </a>
          <div className="relative justify-self-end flex items-center justify-center">
            {/* Gray Arrows pointing towards Join Us circle */}
            <svg
              className="pointer-events-none absolute -inset-7 h-[calc(100%+56px)] w-[calc(100%+56px)] text-white/40 z-10 overflow-visible"
              viewBox="0 0 200 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Arrow 1: Top-Left pointing down-right */}
              <path d="M 15 10 Q 40 20 60 32" strokeDasharray="4 3" />
              <path d="M 48 32 L 60 32 L 58 20" />

              {/* Arrow 2: Bottom-Left pointing up-right */}
              <path d="M 20 90 Q 45 75 62 60" strokeDasharray="4 3" />
              <path d="M 52 61 L 62 60 L 60 70" />

              {/* Arrow 3: Bottom pointing straight up */}
              <path d="M 100 98 Q 100 80 100 66" strokeDasharray="4 3" />
              <path d="M 93 74 L 100 66 L 107 74" />

              {/* Arrow 4: Bottom-Right pointing up-left */}
              <path d="M 180 90 Q 155 75 138 60" strokeDasharray="4 3" />
              <path d="M 140 70 L 138 60 L 148 61" />

              {/* Arrow 5: Top-Right pointing down-left */}
              <path d="M 185 10 Q 160 20 140 32" strokeDasharray="4 3" />
              <path d="M 142 20 L 140 32 L 152 32" />
            </svg>

            <a
              className="contact-ring relative z-20 rounded-full px-4 py-2.5 text-[10px] font-semibold text-white/80 transition hover:text-white sm:px-5 sm:py-3"
              href="#waitlist"
              onClick={(e) => {
                if (onOpenAuth) {
                  e.preventDefault();
                  onOpenAuth();
                }
              }}
            >
              Join Us
            </a>
          </div>
        </nav>

        <div className="hero-poster relative z-10 mx-auto flex min-h-0 sm:min-h-[calc(100vh-96px)] max-w-5xl items-center justify-center py-6 sm:py-16">
          <img className="hero-asset hero-pencil" src="/hero-assets/1.png" alt="" />
          <img className="hero-asset hero-checklist" src="/hero-assets/2.png" alt="" />
          <img className="hero-asset hero-cap" src="/hero-assets/3.png" alt="" />
          <img className="hero-asset hero-medal" src="/hero-assets/4.png" alt="" />
          <img className="hero-asset hero-sparkles-a" src="/hero-assets/5.png" alt="" />
          <img className="hero-asset hero-sparkles-b" src="/hero-assets/6.png" alt="" />

          <div className="hero-copy text-center">
            <h1 data-rise className="poster-title uppercase">
              <span className="line">
                <span className="word word-white">Study smarter</span>
              </span>
              <span className="line line-two">
                <span className="word word-white">from your</span>
                <span className="word word-blue">mistakes,</span>
              </span>
              <span className="line line-three">
                <span className="word word-outline">not just</span>
              </span>
              <span className="line">
                <span className="word word-yellow" data-text="your notes.">your notes.</span>
              </span>
            </h1>
            <p data-rise className="hero-subheading">
              Upload your lecture slides and PDFs. Get zero-hallucination answers with exact page citations, and auto-generated flashcards scheduled around your actual exam date.
            </p>
            <div data-rise className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 sm:border-4 border-white bg-lemon px-6 py-3.5 text-sm sm:text-base font-black text-ink shadow-[3px_4px_0_#171717] sm:shadow-hard transition hover:-translate-y-0.5 hover:bg-aqua sm:w-auto"
                href="#waitlist"
                onClick={(e) => {
                  if (onOpenAuth) {
                    e.preventDefault();
                    onOpenAuth();
                  }
                }}
              >
                Get Started Free
              </a>
              <a
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 sm:border-4 border-white bg-white px-6 py-3.5 text-sm sm:text-base font-black text-ink shadow-[3px_4px_0_#171717] sm:shadow-hard transition hover:-translate-y-0.5 hover:bg-lemon sm:w-auto cursor-pointer"
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) onNavigate("about");
                }}
              >
                More About Us
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="loop" data-loop-section className="relative overflow-hidden rounded-t-[42px] bg-[#242424] px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
        <img data-float className="how-works-sticker how-works-plane" src="/hero-assets/7.png" alt="" />
        <img data-float className="how-works-sticker how-works-spark" src="/hero-assets/5.png" alt="" />
        <img data-float className="how-works-sticker how-works-medal" src="/hero-assets/4.png" alt="" />
        <div className="mx-auto max-w-7xl">
          <div data-loop-heading className="relative z-10 mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-normal text-grass">
                How It Works
              </p>
              <h2 className="loop-title max-w-4xl font-display text-4xl uppercase text-white sm:text-7xl md:text-8xl">
                <span className="loop-title-word-wrap">
                  <span data-loop-title-word>The</span>
                </span>{" "}
                <span className="loop-title-word-wrap">
                  <span data-loop-title-word>revision</span>
                </span>{" "}
                <span className="loop-title-word-wrap">
                  <span data-loop-title-word>loop</span>
                </span>{" "}
                <span className="loop-title-word-wrap">
                  <span data-loop-title-word>that</span>
                </span>{" "}
                <span data-loop-highlight className="loop-title-highlight fixes-gap-sticker text-xl sm:text-3xl md:text-5xl">
                  <span className="inline-block px-1.5 sm:px-2.5">FIXES GAPS</span>
                </span>
              </h2>
            </div>
            <p className="max-w-md text-xs font-semibold leading-relaxed text-white/60 sm:text-sm">
              From raw lecture slides to targeted mastery in three automated steps.
            </p>
          </div>

          <div data-loop-grid className="loop-card-grid mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {programs.map((program) => {
              const Icon = program.icon;
              return (
                <div data-loop-card key={program.title} className="loop-card how-card-wrap relative">
                  <article className={cn("how-card relative flex flex-col text-ink", program.className)}>
                    <div className="mb-2 flex items-center justify-between">
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.4} />
                      <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 text-[10px] font-black text-ink">{program.step}</span>
                    </div>
                    <div data-loop-visual className="mx-auto mb-3 w-full max-w-[260px] sm:max-w-[240px]">
                      <ProgramVisual type={program.visual} />
                    </div>
                    <div className="mt-auto">
                      <h3 className="font-display text-[1.2rem] uppercase leading-none sm:text-[1.32rem]">{program.title}</h3>
                      <p className="mt-1.5 text-[10px] font-bold leading-[1.35] opacity-85">{program.copy}</p>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Program / Core Differentiators Section (Updated with #242424 bg and matched GSAP) */}
      <section id="program" className="relative bg-[#242424] px-4 pb-24 pt-10 sm:px-8 sm:pb-28 lg:px-12">
        <div className="relative mx-auto max-w-5xl">
          
          {/* Animated Headline with Increased Capsule Padding */}
          <h2 className="program-title mb-8 max-w-5xl font-display text-4xl uppercase tracking-tight text-white sm:text-6xl md:text-7xl">
            <span className="loop-title-word-wrap">
              <span data-program-title-word>Your</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>revision</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>is</span>
            </span>{" "}
            <span
              data-program-honest-sticker
              className="program-easy-sticker inline-block px-2.5 py-1 align-middle text-xl sm:px-5 sm:py-2 sm:text-3xl md:text-5xl"
            >
              <span className="inline-block px-1.5 sm:px-2.5">honest</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>and</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>locked</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>to</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>your</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>exam</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-program-title-word>deadline</span>
            </span>
          </h2>

          {/* Floating Sticker 1: Top-Right Planet */}
          <img
            data-float
            src="/hero-assets/9.png"
            alt=""
            className="sticker hidden sm:block -right-4 top-1 z-20 w-20 sm:-right-8 sm:top-2 sm:w-36 md:w-44 filter drop-shadow-[6px_8px_0_rgba(0,0,0,0.45)]"
          />

          {/* Floating Sticker 2: Left Orbit / Blue Planet */}
          <img
            data-float
            src="/hero-assets/8.png"
            alt=""
            className="sticker hidden sm:block -left-6 top-8 z-10 w-24 sm:-left-20 sm:top-10 sm:w-44 md:-left-28 md:w-52 filter drop-shadow-[8px_10px_0_rgba(0,0,0,0.5)]"
          />

          {/* Folder Tabs Header */}
          <div className="relative z-10 grid grid-cols-2 gap-1.5 pb-1 sm:flex sm:flex-wrap sm:items-end sm:gap-1 sm:pb-0">
            {programTabs.map((tab, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(idx)}
                  type="button"
                  className={cn(
                    "relative rounded-t-[14px] sm:rounded-t-[22px] sm:-mb-[3px] border-3 sm:border-4 border-b-0 border-[#171717] px-2.5 py-2 text-xs font-black text-center sm:px-6 sm:py-3.5 sm:text-xs transition-all",
                    tab.color,
                    (idx === 0 || idx === 3) && "text-[#171717]",
                    (idx === 1 || idx === 2) && "text-white",
                    isActive ? "z-20 scale-100 opacity-100 shadow-md sm:shadow-none" : "z-0 opacity-75 hover:opacity-90"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Folder Main Container */}
          <div
            data-program-panel
            className={cn(
              "relative z-10 overflow-visible rounded-b-[30px] rounded-tr-[30px] sm:rounded-b-[36px] sm:rounded-tr-[36px] border-4 border-[#171717] p-5 shadow-hard transition-colors duration-200 sm:p-8 md:p-10",
              programTabs[activeTab].color,
              programTabs[activeTab].textColor
            )}
          >
            {/* Inner 2-Column Grid */}
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
              {/* Left Column */}
              <div className="pr-1 sm:pr-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider opacity-80">
                  {programTabs[activeTab].tagline}
                </span>
                <h3 className="mt-1 font-display text-3xl uppercase leading-[0.9] tracking-tight sm:text-5xl md:text-6xl">
                  {programTabs[activeTab].headline}
                </h3>
                <p className="mt-4 max-w-md text-xs font-bold leading-relaxed opacity-90 sm:text-sm">
                  {programTabs[activeTab].description}
                </p>
              </div>

              {/* Right Column */}
              <div className="relative rounded-[20px] sm:rounded-[24px] border-4 border-[#171717] bg-white p-3.5 sm:p-5 md:p-6 shadow-hard">
                {/* Top Bar Indicator */}
                <div className="mb-3 flex items-center gap-1.5 border-b-2 border-gray-100 pb-2.5">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#ffd356]" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#39d5c8]" />
                </div>

                {/* 4 Feature Rounded Cards */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  {programTabs[activeTab].cards.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-[16px] sm:rounded-[20px] border-2 border-[#171717]/15 p-3 sm:p-4 text-center transition-transform hover:scale-[1.02]",
                        item.bg
                      )}
                    >
                      <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <img src={item.asset} alt="" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
                      </div>
                      <p className="mt-2 text-[10px] sm:text-xs font-black uppercase text-[#171717]">
                        {item.title}
                      </p>
                      <span className="mt-0.5 text-[9px] sm:text-[10px] font-bold leading-tight text-[#171717]/70">
                        {item.subtitle}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dashed Stamp Badge (Overlapping Preview - Shadow removed) */}
                <div
                  className={cn(
                    "mt-4 inline-block sm:absolute sm:-bottom-5 sm:-left-5 sm:mt-0 z-20 rotate-[-8deg] sm:rotate-[-12deg] rounded-full border-[3px] sm:border-4 border-dashed border-[#171717] px-3.5 py-1.5 sm:px-4 sm:py-2 font-display text-xs sm:text-sm md:text-base uppercase tracking-wider text-[#171717]",
                    programTabs[activeTab].badgeColor
                  )}
                >
                  {programTabs[activeTab].badgeText}
                </div>
              </div>
            </div>

            {/* Floating Sticker 3: Bottom-Left Arrow Badge */}
            <img
              data-float
              src="/hero-assets/4.png"
              alt=""
              className="sticker hidden sm:block -bottom-6 -left-6 z-30 w-16 sm:-bottom-9 sm:-left-9 sm:w-24 filter drop-shadow-[5px_7px_0_rgba(0,0,0,0.35)]"
            />

            {/* Floating Sticker 4: Bottom-Right Moon / Orbit */}
            <img
              data-float
              src="/hero-assets/5.png"
              alt=""
              className="sticker hidden sm:block -bottom-6 -right-6 z-30 w-16 sm:-bottom-9 sm:-right-9 sm:w-24 filter drop-shadow-[5px_7px_0_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="grid-paper relative px-4 py-16 text-ink sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <img
            data-float
            src="/hero-assets/1.png"
            alt=""
            className="sticker hidden sm:block left-[4%] top-10 w-16 sm:left-[8%] sm:top-14 sm:w-28 filter drop-shadow-[6px_8px_0_rgba(0,0,0,0.2)]"
          />
          <img
            data-float
            src="/hero-assets/2.png"
            alt=""
            className="sticker hidden sm:block right-[4%] top-12 w-16 sm:right-[10%] sm:top-16 sm:w-28 filter drop-shadow-[6px_8px_0_rgba(0,0,0,0.2)]"
          />
          <img
            data-float
            src="/hero-assets/3.png"
            alt=""
            className="sticker hidden sm:block left-[6%] bottom-6 w-14 sm:left-[12%] sm:bottom-10 sm:w-24 filter drop-shadow-[5px_7px_0_rgba(0,0,0,0.18)]"
          />
          <img
            data-float
            src="/hero-assets/7.png"
            alt=""
            className="sticker hidden sm:block right-[6%] bottom-8 w-16 sm:right-[12%] sm:bottom-12 sm:w-28 filter drop-shadow-[6px_8px_0_rgba(0,0,0,0.18)]"
          />

          <h2 className="loop-title font-display text-4xl uppercase sm:text-7xl md:text-8xl">
            <span className="loop-title-word-wrap">
              <span data-waitlist-title-word>Let&apos;s</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-waitlist-title-word>unlock</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-waitlist-title-word>your</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-waitlist-title-word>potential</span>
            </span>{" "}
            <span className="loop-title-word-wrap">
              <span data-waitlist-title-word>with</span>
            </span>
            <span className="mt-2 block w-full sm:mt-4">
              <span data-waitlist-title-word className="inline-block w-full text-center">
                <img
                  src="/hero-assets/logo.png"
                  alt="StudyLoop"
                  className="mx-auto h-22 w-auto max-w-[92%] object-contain sm:h-32 md:h-40"
                />
              </span>
            </span>
          </h2>
          <p data-waitlist-subheading className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-relaxed text-ink/75 sm:text-base md:text-lg">
            Join the early list for the study app that keeps your revision honest, cited, and tuned to your next exam.
          </p>

          <form data-waitlist-form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-[22px] sm:rounded-[26px] border-3 sm:border-4 border-ink bg-white p-3 shadow-hard sm:flex-row sm:p-3.5">
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitted(false);
              }}
              placeholder="studyloop@gmail.com"
              className="min-h-12 sm:min-h-14 flex-1 rounded-xl sm:rounded-2xl border-2 border-ink/15 bg-[#f8f8f8] px-4 text-sm sm:text-base font-bold text-ink outline-none transition focus:border-ink focus:bg-white"
            />
            <button className="inline-flex min-h-12 sm:min-h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-ink px-6 font-black text-white transition hover:bg-iris" type="submit">
              Join Us
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </form>
          {submitted ? <p className="mt-4 text-xs sm:text-sm font-black text-ink">You&apos;re on the list. Tiny win, big momentum.</p> : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-ink bg-[#171717] px-4 py-8 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row text-center sm:text-left">
          <div>
            <span className="brand-mark font-black uppercase text-white">StudyLoop</span>
            <p className="mt-1 text-xs font-bold text-white/60">
              Study smarter from your mistakes, not just your notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.instagram.com/studyloop89?igsi=cHMwdnoyMjV1enU0"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-[#ff57ce] hover:border-white transition shadow-sm"
            >
              <Instagram className="h-4 w-4 text-[#ff57ce] group-hover:text-white transition-colors" />
              <span>Instagram</span>
            </a>

            <a
              href="https://in.linkedin.com/in/study-loop-8408a5430"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-[#0077b5] hover:border-white transition shadow-sm"
            >
              <Linkedin className="h-4 w-4 text-[#39d5c8] group-hover:text-white transition-colors" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}