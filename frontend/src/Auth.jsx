// src/Auth.jsx
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, Sparkles, X } from "lucide-react";
import gsap from "gsap";
import { auth } from "./api";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function Auth({ onAuthSuccess, onClose }) {
  // 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { scale: 0.9, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.7)" }
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email) return;
      setSubmitting(true);
      try {
        await auth.resetPassword(email);
        setResetSent(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const data = await auth.signUp(email, password);
        if (!data.access_token) {
          // Email confirmation is required before a session exists yet --
          // Supabase's default project setting. There's no user object to
          // hand back to the app in that case.
          setError("Account created! Check your email to confirm before signing in.");
          setMode("signin");
          return;
        }
        onAuthSuccess(data.user);
      } else {
        const data = await auth.signIn(email, password);
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleSignIn() {
    setError("");
    // This redirects the whole page to Supabase/Google and back --
    // onAuthSuccess for this flow is triggered from App.jsx after the
    // redirect returns, not from here.
    auth.signInWithGoogle();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm select-none overflow-y-auto">
      <div
        ref={containerRef}
        className="relative my-auto w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[28px] border-4 border-[#171717] bg-[#ffd356] p-5 text-[#171717] shadow-hard sm:rounded-[32px] sm:p-8"
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#171717] bg-white font-black hover:bg-rose-100 transition sm:h-9 sm:w-9"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header */}
        <div className="mb-5 text-center sm:mb-6">
          <h2 className="font-display text-3xl uppercase tracking-tight sm:text-5xl">
            {mode === "forgot"
              ? "Reset Password"
              : mode === "signup"
              ? "Create Account"
              : "Welcome Back"}
          </h2>
          <p className="mt-1 text-xs font-bold opacity-80 sm:text-sm">
            {mode === "forgot"
              ? "Enter your email to receive a password reset link"
              : mode === "signup"
              ? "Start fixing your revision gaps"
              : "Access your syllabus and mistake queue"}
          </p>
        </div>

        {/* Mode Selector Tabs (only shown for Sign In & Sign Up) */}
        {mode !== "forgot" && (
          <div className="mb-5 flex rounded-2xl border-3 border-[#171717] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setResetSent(false);
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-black uppercase transition-all ${
                mode === "signin" ? "bg-[#6574ff] text-white shadow-sm" : "text-[#171717] opacity-70 hover:opacity-100"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setResetSent(false);
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-black uppercase transition-all ${
                mode === "signup" ? "bg-[#6574ff] text-white shadow-sm" : "text-[#171717] opacity-70 hover:opacity-100"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Google OAuth Button (Sign In & Sign Up) */}
        {mode !== "forgot" && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border-3 border-[#171717] bg-white px-4 text-xs font-black uppercase text-[#171717] shadow-sm transition hover:bg-amber-100 active:scale-[0.98]"
            >
              <GoogleIcon />
              <span>{mode === "signup" ? "Sign Up with Google" : "Continue with Google"}</span>
            </button>

            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="h-px flex-1 bg-[#171717]/20" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#171717]/60">OR</span>
              <span className="h-px flex-1 bg-[#171717]/20" />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-2xl border-3 border-[#171717] bg-rose-100 p-3 text-center text-xs font-bold text-[#171717] shadow-sm">
            {error}
          </div>
        )}

        {/* Forgot Password Confirmation Banner */}
        {mode === "forgot" && resetSent ? (
          <div className="rounded-2xl border-3 border-[#171717] bg-[#a7ef59] p-5 text-center text-[#171717] shadow-sm mb-4">
            <CheckCircle2 className="mx-auto h-8 w-8 mb-2" />
            <h4 className="font-display text-xl uppercase">Reset Link Sent!</h4>
            <p className="mt-1 text-xs font-bold opacity-90">
              We have sent a password reset link to <span className="underline">{email}</span>. Please check your inbox.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setResetSent(false);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#6574ff] px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-[#525fe3]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase">Email Address</label>
              <div className="flex items-center rounded-2xl border-2 border-[#171717] bg-white px-3.5 py-3">
                <Mail className="mr-2 h-4 w-4 opacity-50" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@studyloop.app"
                  className="w-full bg-transparent text-xs font-bold text-[#171717] outline-none sm:text-sm"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase">Password</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] font-black uppercase text-[#171717] opacity-70 underline hover:opacity-100"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="flex items-center rounded-2xl border-2 border-[#171717] bg-white px-3.5 py-3">
                  <Lock className="mr-2 h-4 w-4 opacity-50" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-xs font-bold text-[#171717] outline-none sm:text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-3 border-[#171717] bg-[#6574ff] px-6 text-xs font-black uppercase text-white shadow-hard transition hover:-translate-y-0.5 hover:bg-[#525fe3] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 sm:min-h-14 sm:text-sm"
            >
              {submitting
                ? "Please wait..."
                : mode === "forgot"
                ? "Send Reset Link"
                : mode === "signup"
                ? "Join StudyLoop"
                : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Back Link for Forgot Password */}
        {mode === "forgot" && !resetSent && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#171717] opacity-80 hover:opacity-100 underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
