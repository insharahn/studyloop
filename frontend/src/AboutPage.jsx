// src/AboutPage.jsx
import { useEffect, useRef } from "react";
import { ArrowLeft, Heart, ArrowRight, Instagram, Linkedin, Mail } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AboutPage({ onNavigate, onOpenAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

      // Hero headline & subheading entrance matching "How it works"
      gsap.timeline()
        .from("[data-about-badge]", {
          y: -20,
          opacity: 0,
          duration: 0.5,
          ease: "back.out(1.7)"
        })
        .from("[data-about-title-word]", {
          yPercent: 110,
          rotate: 4,
          opacity: 0,
          stagger: 0.08,
          duration: 0.7,
          ease: "power4.out"
        }, "-=0.2")
        .from("[data-about-subheading]", {
          y: 28,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out"
        }, "-=0.2");

      // Story Card scroll trigger
      gsap.from("[data-about-story]", {
        scrollTrigger: {
          trigger: "[data-about-story-section]",
          start: isMobile ? "top 92%" : "top 85%",
          end: "bottom top",
          toggleActions: "play reverse play reverse"
        },
        y: isMobile ? 25 : 0,
        x: isMobile ? 0 : -30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Phone Frame scroll trigger
      gsap.from("[data-about-phone]", {
        scrollTrigger: {
          trigger: "[data-about-phone]",
          start: isMobile ? "top 92%" : "top 85%",
          end: "bottom top",
          toggleActions: "play reverse play reverse"
        },
        y: 25,
        scale: 0.94,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Team Section Title Word Reveal Animation
      gsap.timeline({
        scrollTrigger: {
          trigger: "[data-about-team-section]",
          start: isMobile ? "top 92%" : "top 85%",
          end: "bottom top",
          toggleActions: "play reverse play reverse"
        }
      })
        .from("[data-about-team-title-word]", {
          yPercent: 110,
          rotate: 4,
          opacity: 0,
          stagger: 0.08,
          duration: 0.7,
          ease: "power4.out"
        })
        .from("[data-about-team-subheading]", {
          y: 24,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out"
        }, "-=0.3");

      gsap.from("[data-about-team-img]", {
        scrollTrigger: {
          trigger: "[data-about-team-img]",
          start: isMobile ? "top 90%" : "top 80%",
          end: "bottom top",
          toggleActions: "play reverse play reverse"
        },
        scale: 0.92,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.4)"
      });

      // CTA scroll trigger
      gsap.from("[data-about-cta]", {
        scrollTrigger: {
          trigger: "[data-about-cta-section]",
          start: isMobile ? "top 92%" : "top 90%",
          end: "bottom top",
          toggleActions: "play reverse play reverse"
        },
        y: 30,
        scale: 0.95,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#171717] text-white selection:bg-[#ffd356] selection:text-[#171717] overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="bg-[#171717]/95 px-3 py-3 sm:px-8 sm:py-4 backdrop-blur-md sticky top-0 z-50 lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate && onNavigate("landing")}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-[#171717] transition shadow-sm"
              title="Back to Home"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span
              onClick={() => onNavigate && onNavigate("landing")}
              className="brand-mark cursor-pointer font-black uppercase text-white"
            >
              StudyLoop
            </span>
          </div>

          <div className="relative flex items-center justify-center">
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

            <button
              onClick={() => onOpenAuth && onOpenAuth()}
              className="contact-ring relative z-20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-white/90 hover:text-white transition"
            >
              Join Us
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-10 pb-8 sm:px-8 sm:pt-14 sm:pb-14 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <span data-about-badge className="inline-flex items-center rounded-full border-2 border-[#171717] bg-[#ffd356] px-3.5 py-1 text-[11px] sm:text-xs font-black uppercase text-[#171717] shadow-sm mb-3">
            OUR STORY & TEAM
          </span>
          <h1 className="font-display text-2xl uppercase tracking-tight sm:text-6xl md:text-7xl leading-snug sm:leading-none text-center">
            <div className="flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2">
              <span className="loop-title-word-wrap inline-block">
                <span data-about-title-word>4</span>
              </span>
              <span className="loop-title-word-wrap inline-block">
                <span data-about-title-word>Students.</span>
              </span>
              <span className="loop-title-word-wrap inline-block">
                <span data-about-title-word>3</span>
              </span>
              <span className="loop-title-word-wrap inline-block">
                <span data-about-title-word>Nations.</span>
              </span>
              <span className="loop-title-word-wrap inline-block text-[#ffd356]">
                <span data-about-title-word>1</span>
              </span>
              <span className="loop-title-word-wrap inline-block text-[#ffd356]">
                <span data-about-title-word>Mission.</span>
              </span>
            </div>
          </h1>
          <p data-about-subheading className="mx-auto mt-4 max-w-xl text-xs font-bold leading-relaxed text-white/80 sm:text-lg px-2">
            We built StudyLoop out of personal frustration with unreliable AI study tools, exam anxiety, and infinite flashcard queues.
          </p>
        </div>
      </section>

      {/* Editorial Story Layout: Full Width -> Half Width with Mobile Video -> Full Width */}
      <section data-about-story-section className="px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Part 1: Full-Width Opening Story Card */}
          <div data-about-story className="rounded-[28px] border-4 border-[#171717] bg-white p-6 sm:p-10 text-[#171717] shadow-hard">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-[#ff57ce] px-3 py-0.5 text-[10px] font-black uppercase text-white">
                OUR ORIGIN STORY
              </span>
            </div>
            <h2 className="font-display text-3xl uppercase sm:text-5xl leading-tight mb-4">
              Why We Built StudyLoop
            </h2>
            <div>
              <strong className="font-black text-[#171717] text-base sm:text-xl block mb-2">
                The 3 AM Exam Panic
              </strong>
              <p className="text-sm sm:text-base font-medium leading-relaxed text-[#171717]/90">
                We&apos;ve all had that awful 3 AM feeling during exam week. The room is dead quiet, your eyes are burning from staring at 300 lecture slides, and panic starts setting in because nothing is sticking. You try asking an AI tool for help, and it gives you a super smooth, confident answer... that turns out to be totally wrong. Finding out an AI just lied to you when you&apos;re already stressed out of your mind is heartbreaking. You end up wasting hours manually flipping through PDFs just to fact-check your own study assistant.
              </p>
            </div>
          </div>

          {/* Part 2: Half-Width Story Card (Left) + Mobile Video Frame (Right) */}
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Side: Half-Width Story Content (7 cols) */}
            <div className="rounded-[28px] border-4 border-[#171717] bg-white p-6 sm:p-8 text-[#171717] shadow-hard space-y-6 lg:col-span-7">
              <div>
                <strong className="font-black text-[#171717] text-base sm:text-lg block mb-1">
                  The Constant Burnout
                </strong>
                <p className="text-sm sm:text-base font-medium leading-relaxed text-[#171717]/90">
                  Flashcard apps weren&apos;t saving us either. They felt cold and relentless — dumping 200 random cards on our screens every single morning, regardless of whether our exam was in two months or in 48 hours. If we got a basic question wrong, the app would just mark it wrong and move on. Nobody was helping us figure out <em>why</em> we didn&apos;t get it, or what foundational topic we were missing from weeks ago.
                </p>
              </div>

              <div>
                <strong className="font-black text-[#171717] text-base sm:text-lg block mb-1">
                  A Late-Night Call Across 3 Borders
                </strong>
                <p className="text-sm sm:text-base font-medium leading-relaxed text-[#171717]/90">
                  The four of us — Sanya in India 🇮🇳, Insharah and Saba in Pakistan 🇵🇰, and Alisha in Nepal 🇳🇵 — were connected through DoraDAO Fellowship 2.0, but what really brought us together was sharing our late-night exam stress. One night over a Discord call, after another exhausting study session, we asked each other: <em>&ldquo;Why can&apos;t we have a study tool that just tells us the truth? One that shows us the exact page in our own slides, never fakes answers, and helps us fix our root mistakes before test day?&rdquo;</em>
                </p>
              </div>
            </div>

            {/* Right Side: Smartphone Video Frame (5 cols) */}
            <div data-about-phone className="flex flex-col items-center justify-center lg:col-span-5">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border-2 border-[#171717] bg-[#39d5c8] px-3.5 py-1 text-[11px] font-black uppercase text-[#171717] shadow-sm">
                🎬 SEE STUDYLOOP IN ACTION
              </span>
              
              <div className="relative mx-auto w-[250px] sm:w-[280px]">
                {/* Outer Phone Bezel */}
                <div className="relative overflow-hidden rounded-[44px] border-[9px] border-[#171717] bg-[#171717] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] ring-2 ring-white/10">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-2 left-1/2 z-30 flex h-4 w-24 -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[#171717]">
                    <div className="h-2 w-2 rounded-full bg-white/20" />
                    <div className="h-1.5 w-8 rounded-full bg-white/10" />
                  </div>

                  {/* Video Player */}
                  <div className="relative aspect-[9/18] w-full overflow-hidden rounded-[34px] bg-black pt-5">
                    <video
                      src="/hero-assets/video.mp4"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Home Bar */}
                  <div className="absolute bottom-1.5 left-1/2 z-30 h-1 w-20 -translate-x-1/2 rounded-full bg-white/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Part 3: Full-Width Closing Story Card */}
          <div data-about-story className="rounded-[28px] border-4 border-[#171717] bg-[#6574ff] p-6 sm:p-10 text-white shadow-hard">
            <strong className="font-black text-white text-lg sm:text-2xl block mb-2">
              Built With Heart & Late-Night Coffee
            </strong>
            <p className="text-sm sm:text-base font-medium leading-relaxed text-white/95">
              We stopped waiting for someone else to build it and decided to build it ourselves. We spent endless weekends coding, designing, and testing across time zones. We built StudyLoop to be the study partner we desperately needed in university — honest, supportive, and focused on helping students actually understand their material without the extra anxiety. We hope it makes your exam weeks a little kinder.
            </p>
          </div>

        </div>
      </section>

      {/* Pixel Art Team Graphic & Gen-Z Speech Bubble Cards */}
      <section data-about-team-section className="px-4 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-display text-3xl uppercase tracking-tight sm:text-5xl text-white mb-1 leading-none">
            <span className="loop-title-word-wrap inline-block">
              <span data-about-team-title-word>Meet</span>
            </span>{" "}
            <span className="loop-title-word-wrap inline-block">
              <span data-about-team-title-word>The</span>
            </span>{" "}
            <span className="loop-title-word-wrap inline-block text-[#ffd356]">
              <span data-about-team-title-word>Team</span>
            </span>
          </h2>
          <p data-about-team-subheading className="text-xs font-bold text-white/60 sm:text-sm mb-10">
            Cross-border collaboration between India 🇮🇳, Pakistan 🇵🇰, and Nepal 🇳🇵
          </p>

          <div className="mx-auto grid grid-cols-1 items-center gap-6 md:grid-cols-2 lg:grid-cols-12 max-w-5xl">
            
            {/* Left Column Bubbles (Saba & Sanya - 4 cols on lg) */}
            <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-4">
              {/* Saba Card */}
              <div className="rounded-[24px] border-4 border-[#171717] bg-[#39d5c8] p-5 text-left text-[#171717] shadow-hard transform lg:-rotate-2 hover:scale-[1.03] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-[9px] font-black uppercase text-[#39d5c8]">
                    Secondary Backend
                  </span>
                  <span className="text-xl">🇵🇰</span>
                </div>
                <h4 className="font-display text-3xl uppercase leading-none">Saba</h4>
                <p className="mt-2 text-xs sm:text-sm font-black leading-relaxed">
                  &ldquo;Database main character 💅 Fixed your prerequisite gap logic so your brain doesn&apos;t error 404!&rdquo;
                </p>
              </div>

              {/* Sanya Card */}
              <div className="rounded-[24px] border-4 border-[#171717] bg-[#ffd356] p-5 text-left text-[#171717] shadow-hard transform lg:rotate-2 hover:scale-[1.03] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-[9px] font-black uppercase text-[#ffd356]">
                    Frontend Lead
                  </span>
                  <span className="text-xl">🇮🇳</span>
                </div>
                <h4 className="font-display text-3xl uppercase leading-none">Sanya</h4>
                <p className="mt-2 text-xs sm:text-sm font-black leading-relaxed">
                  &ldquo;UI is giving 10/10 no cap 🧙‍♀️✨ Making study apps super aesthetic so you don&apos;t cry during exam week fr!&rdquo;
                </p>
              </div>
            </div>

            {/* Center Pixel Art Team Graphic (4 cols on lg) */}
            <div data-about-team-img className="md:col-span-2 lg:col-span-4 mx-auto w-full max-w-sm sm:max-w-md shrink-0 rounded-[28px] border-4 border-[#171717] bg-[#6574ff] p-3 shadow-hard">
              <img
                src="/hero-assets/team_pixel_art.jpg"
                alt="Meet Our Team - 4 The Plot"
                className="w-full rounded-[20px] border-3 border-[#171717] object-cover"
              />
            </div>

            {/* Right Column Bubbles (Insharah & Alisha - 4 cols on lg) */}
            <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-4">
              {/* Insharah Card */}
              <div className="rounded-[24px] border-4 border-[#171717] bg-white p-5 text-left text-[#171717] shadow-hard transform lg:rotate-2 hover:scale-[1.03] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-[#6574ff] px-2.5 py-0.5 text-[9px] font-black uppercase text-white">
                    Primary Backend Lead
                  </span>
                  <span className="text-xl">🇵🇰</span>
                </div>
                <h4 className="font-display text-3xl uppercase leading-none text-[#171717]">Insharah</h4>
                <p className="mt-2 text-xs sm:text-sm font-black leading-relaxed">
                  &ldquo;RAG whisperer 🤫🔥 Taught the AI engine to stop capping & give real slide citations on god!&rdquo;
                </p>
              </div>

              {/* Alisha Card */}
              <div className="rounded-[24px] border-4 border-[#171717] bg-[#ff57ce] p-5 text-left text-white shadow-hard transform lg:-rotate-2 hover:scale-[1.03] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-[#171717] px-2.5 py-0.5 text-[9px] font-black uppercase text-[#ff57ce]">
                    Content & Marketing
                  </span>
                  <span className="text-xl">🇳🇵</span>
                </div>
                <h4 className="font-display text-3xl uppercase leading-none">Alisha</h4>
                <p className="mt-2 text-xs sm:text-sm font-black leading-relaxed">
                  &ldquo;Marketing slay queen 👑✨ Turning late-night study stress into relatable memes & viral stories!&rdquo;
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section data-about-cta-section className="px-4 py-16 sm:px-8 lg:px-12 text-center">
        <div data-about-cta className="mx-auto max-w-3xl rounded-[32px] border-4 border-[#171717] bg-[#ffd356] p-8 text-[#171717] shadow-hard">
          <h2 className="font-display text-3xl uppercase sm:text-5xl">Start Studying Honest Today</h2>
          <p className="mx-auto mt-2 max-w-md text-xs font-bold opacity-80 sm:text-sm">
            Upload your lecture slides, get exact citations, and fix foundational gaps before your next exam.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => onOpenAuth && onOpenAuth()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-3 border-[#171717] bg-[#171717] px-6 text-xs font-black uppercase text-white shadow-sm hover:bg-[#6574ff] transition"
            >
              Join Us Free <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate && onNavigate("landing")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-3 border-[#171717] bg-white px-6 text-xs font-black uppercase text-[#171717] shadow-sm hover:bg-amber-100 transition"
            >
              Back To Home
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-white/10 bg-[#171717] px-4 py-8 text-white sm:px-8 lg:px-12">
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
              className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase text-white hover:bg-[#ff57ce] hover:border-white transition"
            >
              <Instagram className="h-4 w-4 text-[#ff57ce] group-hover:text-white transition-colors" /> Instagram
            </a>
            <a
              href="https://www.linkedin.com/company/studyloopp/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase text-white hover:bg-[#0077b5] hover:border-white transition"
            >
              <Linkedin className="h-4 w-4 text-[#39d5c8] group-hover:text-white transition-colors" /> LinkedIn
            </a>
            <a
              href="mailto:studyloop770@gmail.com"
              className="group flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase text-white hover:bg-[#ea4335] hover:border-white transition"
            >
              <Mail className="h-4 w-4 text-[#ffd356] group-hover:text-white transition-colors" /> Email
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
