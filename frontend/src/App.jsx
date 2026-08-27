import { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { AboutPage } from "./AboutPage";
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";
import { UploadPage } from "./UploadPage";
import { ChatPage } from "./ChatPage";
import { ReviewPage } from "./ReviewPage";
import { ConceptMapPage } from "./ConceptMapPage";
import { ClassPulsePage } from "./ClassPulsePage";
import { auth, consumeOAuthRedirect, fetchCurrentUser, getStoredUser } from "./api";
import { SourcesPanel } from "./SourcesPanel";
import { CardLibrary } from "./CardLibrary";

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState("landing"); // 'landing' | 'dashboard' | 'upload' | 'chat' | 'review' | 'concepts' | 'pulse'
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [initialChatPrompt, setInitialChatPrompt] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

  // Runs once on load
  useEffect(() => {
    (async () => {
      const redirected = consumeOAuthRedirect();
      if (redirected) {
        const oauthUser = await fetchCurrentUser();
        if (oauthUser) {
          setUser(oauthUser);
          setCurrentView("dashboard");
        }
        setRestoringSession(false);
        return;
      }

      const cachedUser = getStoredUser();
      if (cachedUser) {
        setUser(cachedUser);
        setCurrentView("dashboard");
        const confirmedUser = await fetchCurrentUser();
        if (!confirmedUser) {
          setUser(null);
          setCurrentView("landing");
        }
      }
      setRestoringSession(false);
    })();
  }, []);

  function handleAuthSuccess(userData) {
    setUser(userData);
    setShowAuthModal(false);
    setCurrentView("dashboard");
  }

  function handleNavigate(targetView, courseId = null, extraData = null) {
    if (targetView === "logout") {
      auth.signOut();
      setUser(null);
      setCurrentView("landing");
      return;
    }
    if (courseId) setActiveCourseId(courseId);
    if (extraData && extraData.prompt) {
      setInitialChatPrompt(extraData.prompt);
    } else {
      setInitialChatPrompt(null);
    }
    setCurrentView(targetView);
  }

  const [initialAuthEmail, setInitialAuthEmail] = useState("");

  function handleOpenAuth(prefilledEmail = "") {
    setInitialAuthEmail(typeof prefilledEmail === "string" ? prefilledEmail : "");
    setShowAuthModal(true);
  }

  if (restoringSession) {
    return null;
  }

  return (
    <div>
      {currentView === "landing" && (
        <LandingPage onOpenAuth={handleOpenAuth} onNavigate={handleNavigate} />
      )}

      {currentView === "about" && (
        <AboutPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
      )}

      {showAuthModal && (
        <Auth
          initialEmail={initialAuthEmail}
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {currentView === "dashboard" && (
        <Dashboard user={user} onNavigate={handleNavigate} />
      )}

      {currentView === "upload" && (
        <UploadPage
          user={user}
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "chat" && (
        <ChatPage
          user={user}
          courseId={activeCourseId}
          initialPrompt={initialChatPrompt}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "review" && (
        <ReviewPage
          user={user}
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "concepts" && (
        <ConceptMapPage
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "pulse" && (
        <ClassPulsePage
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "sources" && (
        <SourcesPanel
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "cards" && (
        <CardLibrary
          courseId={activeCourseId}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}