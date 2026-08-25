import { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";
import { UploadPage } from "./UploadPage";
import { ChatPage } from "./ChatPage";
import { ReviewPage } from "./ReviewPage";
import { ConceptMapPage } from "./ConceptMapPage";
import { ClassPulsePage } from "./ClassPulsePage";
import { auth, consumeOAuthRedirect, fetchCurrentUser, getStoredUser } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState("landing"); // 'landing' | 'dashboard' | 'upload' | 'chat' | 'review' | 'concepts' | 'pulse'
  const [activeCourseId, setActiveCourseId] = useState("c1");
  const [restoringSession, setRestoringSession] = useState(true);

  // Runs once on load: (1) if we just landed back from the Google OAuth
  // redirect, pick the session tokens out of the URL hash; (2) either
  // way, if a token is already stored, restore the session so a page
  // refresh doesn't silently log the user out.
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
        // Show the cached user immediately, then confirm the token is
        // still actually valid in the background.
        setUser(cachedUser);
        setCurrentView("dashboard");
        const confirmedUser = await fetchCurrentUser();
        if (!confirmedUser) {
          // Token had expired/was invalid -- back to signed-out state
          // rather than a dashboard full of an expired session's data.
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

  function handleNavigate(targetView, courseId = null) {
    if (targetView === "logout") {
      auth.signOut();
      setUser(null);
      setCurrentView("landing");
      return;
    }
    if (courseId) setActiveCourseId(courseId);
    setCurrentView(targetView);
  }

  if (restoringSession) {
    return null;
  }

  return (
    <div>
      {currentView === "landing" && (
        <LandingPage onOpenAuth={() => setShowAuthModal(true)} />
      )}

      {showAuthModal && (
        <Auth
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
    </div>
  );
}