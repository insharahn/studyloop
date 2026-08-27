const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "/api";

// Needed to talk to Supabase's own Auth REST API (GoTrue) directly from
// the browser -- this is the public anon key, safe to expose client-side
// (unlike the service key, which must only ever live in the backend's
// .env and never be shipped to a browser).
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || "");
}

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}

// There used to be a hardcoded DEFAULT_TEST_TOKEN here -- a real Supabase
// JWT baked into the shipped frontend bundle, silently used as a
// fallback for every request that had no stored token, and re-used again
// on 401 instead of actually re-authenticating. Two problems: (1) it was
// a real credential sitting in client-side source, visible to anyone who
// opened devtools, and (2) it had a fixed expiry, so once it lapsed every
// authenticated call would 401 forever with no way to recover, and every
// page would silently fall back to fake mock data looking like a working
// app. There is no safe substitute for it -- auth now requires a real
// signed-in session (see signIn/signUp/signInWithGoogle below).
export function getAuthToken() {
  return localStorage.getItem("studyloop_token");
}

export function getRefreshToken() {
  return localStorage.getItem("studyloop_refresh_token");
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("studyloop_token", token);
  } else {
    localStorage.removeItem("studyloop_token");
  }
}

export function setSession(session) {
  if (session?.access_token) {
    localStorage.setItem("studyloop_token", session.access_token);
  } else {
    localStorage.removeItem("studyloop_token");
  }
  if (session?.refresh_token) {
    localStorage.setItem("studyloop_refresh_token", session.refresh_token);
  } else {
    localStorage.removeItem("studyloop_refresh_token");
  }
  if (session?.user) {
    localStorage.setItem("studyloop_user", JSON.stringify(session.user));
  } else {
    localStorage.removeItem("studyloop_user");
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem("studyloop_user");
  return raw ? JSON.parse(raw) : null;
}

export function getUserScopeKey(suffix) {
  const user = getStoredUser();
  const userPrefix = user?.id || user?.email ? (user.id || user.email).replace(/[^a-zA-Z0-9]/g, "_") : "default";
  return `studyloop_${userPrefix}_${suffix}`;
}

export function getScopedItem(suffix) {
  const userKey = getUserScopeKey(suffix);
  const globalKey = `studyloop_${suffix}`;
  return localStorage.getItem(userKey) || localStorage.getItem(globalKey);
}

export function setScopedItem(suffix, value) {
  const userKey = getUserScopeKey(suffix);
  const globalKey = `studyloop_${suffix}`;
  localStorage.setItem(userKey, value);
  localStorage.setItem(globalKey, value);
}

export function clearSession() {
  setSession(null);
}

// --- Real Supabase auth (GoTrue REST API) ---------------------------------
// No @supabase/supabase-js dependency is installed, so this talks to the
// same REST endpoints that SDK wraps, directly. Replaces Auth.jsx's old
// behavior of accepting any email/password and just re-saving whatever
// token already existed in localStorage.

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Auth is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
      "in frontend/.env (see frontend/.env.example)."
    );
  }
}

async function authRequest(path, body) {
  requireSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.error || "Authentication failed");
  }
  return data;
}

export const auth = {
  signUp: async (email, password) => {
    const data = await authRequest("/signup", { email, password });
    if (data.access_token) setSession(data);
    return data;
  },

  signIn: async (email, password) => {
    const data = await authRequest("/token?grant_type=password", { email, password });
    setSession(data);
    return data;
  },

  // Full OAuth redirect flow: Supabase, not this app, authenticates with
  // Google, then redirects back to redirectTo with tokens in the URL hash
  // (handled by consumeOAuthRedirect below, called once on app load).
  signInWithGoogle: () => {
    requireSupabaseConfig();
    const redirectTo = window.location.origin;
    const url =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
      `&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.assign(url);
  },

  signOut: () => {
    clearSession();
  },

  resetPassword: async (email) => {
    return authRequest("/recover", { email });
  }
};

// Call once at app startup. If we just landed back from Supabase's OAuth
// redirect, the URL hash looks like #access_token=...&refresh_token=...
// Parse it, store the session, and strip it from the URL bar.
export function consumeOAuthRedirect() {
  if (!window.location.hash.includes("access_token")) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token) return null;

  setSession({ access_token, refresh_token });
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return { access_token, refresh_token };
}

// Fetches the current user from a stored token, so a page refresh can
// restore the session instead of silently logging the user out. Returns
// null (and clears the stale token) if the token is invalid/expired.
export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  requireSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const user = await response.json();
  localStorage.setItem("studyloop_user", JSON.stringify(user));
  return user;
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // A 401 here means the session is genuinely invalid/expired -- clear it
  // so the UI can prompt a real re-login, rather than silently retrying
  // with a fallback credential (which is what caused every feature to
  // quietly degrade to fake mock data once that credential expired).
  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.detail || errorBody.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  getHealth: async () => {
    return request("/health");
  },

  getCourses: async () => {
    let rawCourses = [];
    let backendConnected = false;
    try {
      const data = await request("/courses");
      rawCourses = data.courses || [];
      backendConnected = true;
    } catch (err) {
      console.warn("Backend unavailable, checking local courses:", err.message);
    }

    const storedCoursesJson = getScopedItem("custom_courses");
    const customCourses = storedCoursesJson ? JSON.parse(storedCoursesJson) : [];

    // If backend is connected, use real courses + custom courses (omit default fallback sample courses)
    const baseCourses = backendConnected
      ? rawCourses
      : (customCourses.length > 0 ? customCourses : rawCourses);

    const allCourses = [...baseCourses];
    customCourses.forEach((cc) => {
      if (!allCourses.some((c) => c.id === cc.id)) {
        allCourses.push(cc);
      }
    });

    return allCourses.map((c) => {
      const localDocsJson = getScopedItem(`docs_${c.id}`);
      const localDocs = localDocsJson ? JSON.parse(localDocsJson) : [];
      const hasLocalDocs = localDocs.length > 0;

      const docCount = hasLocalDocs ? localDocs.length : (c.doc_count || 0);

      return {
        ...c,
        doc_count: docCount,
        card_count: c.card_count || 0,
        due_today: c.due_today || 0,
        mastery_pct: c.mastery_pct || 0
      };
    });
  },

  createCourse: async (data) => {
    let newCourse = null;
    try {
      newCourse = await request("/courses", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn("Backend createCourse error, using fallback mock:", err.message);
      newCourse = {
        id: generateUUID(),
        ...data,
        days_to_exam: 14,
        doc_count: 0,
        card_count: 0,
        mastery_pct: 0,
        due_today: 0
      };
    }

    const storedCoursesJson = getScopedItem("custom_courses");
    const customCourses = storedCoursesJson ? JSON.parse(storedCoursesJson) : [];
    const formattedCourse = {
      ...newCourse,
      id: newCourse.id || generateUUID(),
      doc_count: 0,
      card_count: 0,
      due_today: 0,
      mastery_pct: 0
    };
    customCourses.push(formattedCourse);
    setScopedItem("custom_courses", JSON.stringify(customCourses));
    return formattedCourse;
  },

  deleteCourse: async (courseId) => {
    const storedCoursesJson = getScopedItem("custom_courses");
    if (storedCoursesJson) {
      const customCourses = JSON.parse(storedCoursesJson).filter((c) => c.id !== courseId);
      setScopedItem("custom_courses", JSON.stringify(customCourses));
    }
    localStorage.removeItem(getUserScopeKey(`docs_${courseId}`));
    localStorage.removeItem(`studyloop_docs_${courseId}`);
    return request(`/courses/${courseId}`, {
      method: "DELETE"
    }).catch(() => ({ deleted: true }));
  },

  getDocuments: async (courseId) => {
    let docs = [];
    try {
      const data = await request(`/courses/${courseId}/documents`);
      docs = data.documents || [];
    } catch (err) {
      console.warn("Backend getDocuments error:", err.message);
    }

    const localDocsJson = localStorage.getItem(`studyloop_docs_${courseId}`);
    const localDocs = localDocsJson ? JSON.parse(localDocsJson) : [];

    const combined = [...localDocs];
    docs.forEach((d) => {
      if (!combined.some((cd) => cd.doc_id === d.doc_id)) {
        combined.push(d);
      }
    });
    return combined;
  },

  uploadDocument: async (courseId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", courseId);

    const resultDoc = await request("/documents/upload", {
      method: "POST",
      body: formData
    });

    const localDocsJson = localStorage.getItem(`studyloop_docs_${courseId}`);
    const localDocs = localDocsJson ? JSON.parse(localDocsJson) : [];
    const newDocItem = {
      doc_id: resultDoc.doc_id,
      filename: file.name,
      page_count: resultDoc.page_count || 0,
      chunk_count: resultDoc.chunk_count || 0,
      status: resultDoc.status || "processing",
      created_at: new Date().toISOString().split("T")[0]
    };
    localDocs.unshift(newDocItem);
    localStorage.setItem(`studyloop_docs_${courseId}`, JSON.stringify(localDocs));

    return resultDoc;
  },

  getDocumentStatus: async (docId) => {
    return request(`/documents/${docId}/status`);
  },

  deleteDocument: async (docId) => {
    return request(`/documents/${docId}`, {
      method: "DELETE"
    });
  }
};

export const apiReview = {
  getDueCards: async (courseId, limit = 20) => {
    try {
      const data = await request(`/review/due?course_id=${encodeURIComponent(courseId)}&limit=${limit}`);
      return data;
    } catch (err) {
      console.warn("Backend getDueCards error:", err.message);
      return {
        session_id: null,
        plan: { days_to_exam: 0, cards_today: 0, cards_remaining_total: 0, on_track: true },
        cards: []
      };
    }
  },

  submitReview: async ({ card_id, grade, elapsed_ms }) => {
    let res = null;
    try {
      res = await request("/review/submit", {
        method: "POST",
        body: JSON.stringify({ card_id, grade, elapsed_ms })
      });
    } catch (err) {
      console.warn("Backend submitReview warning:", err.message);
    }

    // Retain concept mastery locally so quiz performance increases & persists on nodes
    try {
      const isCorrect = grade >= 2;
      const cid = res?.concept_id || res?.card?.concept_id || card_id;
      if (cid) {
        const curVal = getScopedItem(`mastery_${cid}`);
        let curMastery = curVal ? parseFloat(curVal) : 0.35;
        if (isCorrect) {
          curMastery = Math.min(1.0, curMastery + 0.25);
        } else {
          curMastery = Math.max(0.1, curMastery - 0.15);
        }
        setScopedItem(`mastery_${cid}`, String(curMastery));
      }
    } catch (e) {}

    return res;
  },

  sendChat: async ({ course_id, message, session_id }) => {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify({ course_id, message, session_id })
    });
  },

  getChatSessions: async (courseId) => {
    return request(`/chat/sessions?course_id=${encodeURIComponent(courseId)}`);
  },

  getChatSession: async (sessionId) => {
    return request(`/chat/sessions/${encodeURIComponent(sessionId)}`);
  }
};

export const mockConcepts = [
  {
    id: "c_bst",
    name: "Foundational Invariants",
    description: "Core properties and ordering constraints defined in chapter 1.",
    mastery: 0.35,
    status: "shaky",
    prerequisites: [],
    card_count: 5
  },
  {
    id: "c_avl",
    name: "Tree Rotations & Balancing",
    description: "Single and double rotations to maintain logarithmic height bounds.",
    mastery: 0.68,
    status: "learning",
    prerequisites: ["c_bst"],
    card_count: 8
  },
  {
    id: "c_btree",
    name: "Node Capacity & Overflow",
    description: "Multi-way search tree capacity boundaries and median splits.",
    mastery: 0.85,
    status: "solid",
    prerequisites: ["c_bst"],
    card_count: 6
  },
  {
    id: "c_redblack",
    name: "Memory Layout & Bounds",
    description: "Memory alignment, black-height bounds, and caching invariants.",
    mastery: 0.15,
    status: "unseen",
    prerequisites: ["c_avl"],
    card_count: 4
  }
];

export const apiDocuments = {
  listCourseDocuments: async (courseId) => {
    return request(`/courses/${courseId}/documents`);
  },
  getDocumentViewUrl: async (docId) => {
    return request(`/documents/${docId}/view`);
  }
};

export const apiCards = {
  listCourseCards: async (courseId) => {
    return request(`/courses/${courseId}/cards`);
  }
};

export const apiConcepts = {
  buildConcepts: async (courseId) => {
    return request(`/courses/${courseId}/build-concepts`, {
      method: "POST"
    });
  },

  getConcepts: async (courseId) => {
    let concepts = [];
    try {
      const data = await request(`/courses/${courseId}/concepts`);
      concepts = data?.concepts || [];
    } catch (err) {
      console.warn("Backend getConcepts error:", err.message);
      concepts = [];
    }

    // Merge retained local mastery updates into nodes
    return (concepts && concepts.length > 0 ? concepts : mockConcepts).map((c) => {
      const localVal = getScopedItem(`mastery_${c.id}`) || getScopedItem(`mastery_${c.name}`);
      if (localVal) {
        const localMastery = parseFloat(localVal);
        let status = "unseen";
        if (localMastery >= 0.75) status = "solid";
        else if (localMastery >= 0.40) status = "learning";
        else if (localMastery > 0) status = "shaky";

        return {
          ...c,
          mastery: localMastery,
          status: status
        };
      }
      return c;
    });
  },

  generateCards: async (courseId, payload = {}) => {
    return request(`/courses/${courseId}/generate-cards`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export function calculateRealDailyStreak() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastVisit = getScopedItem("last_visit_date");
    const currentStreakStr = getScopedItem("streak_count");
    let currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;

    if (!lastVisit) {
      currentStreak = 1;
      setScopedItem("last_visit_date", todayStr);
      setScopedItem("streak_count", "1");
      return 1;
    }

    if (lastVisit === todayStr) {
      return Math.max(1, currentStreak);
    }

    const lastDate = new Date(lastVisit + "T00:00:00");
    const todayDate = new Date(todayStr + "T00:00:00");
    const diffTime = todayDate - lastDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak = Math.max(1, currentStreak) + 1;
    } else {
      // Missed 1 day or more -> reset streak back to 1
      currentStreak = 1;
    }

    setScopedItem("last_visit_date", todayStr);
    setScopedItem("streak_count", String(currentStreak));
    return currentStreak;
  } catch (err) {
    return 1;
  }
}

export const apiStats = {
  getStats: async (courseId) => {
    const realStreak = calculateRealDailyStreak();
    try {
      const data = await request(`/courses/${courseId}/stats`);
      if (data && typeof data.mastery_pct === "number") {
        return { ...data, streak_days: realStreak || data.streak_days || 1 };
      }
      return {
        streak_days: realStreak,
        reviews_today: 0,
        reviews_total: 0,
        mastery_pct: 0,
        weak_concepts: [],
        mastery_trend: []
      };
    } catch (err) {
      console.warn("Backend getStats error:", err.message);
      return {
        streak_days: realStreak,
        reviews_today: 0,
        reviews_total: 0,
        mastery_pct: 0,
        weak_concepts: [],
        mastery_trend: []
      };
    }
  },

  getPulse: async (courseId) => {
    let backendPulse = null;
    try {
      backendPulse = await request(`/courses/${courseId}/pulse`);
      if (backendPulse && Array.isArray(backendPulse.concepts) && backendPulse.concepts.length > 0) {
        return backendPulse;
      }
    } catch (err) {
      console.warn("Backend getPulse error, calculating from local concepts:", err.message);
    }

    // Sync directly from local concepts & course mastery_pct
    const concepts = await apiConcepts.getConcepts(courseId);
    const allCourses = await api.getCourses();
    const matchedCourse = (allCourses || []).find((c) => c.id === courseId);
    const courseMasteryPct = Math.round((matchedCourse?.mastery_pct || matchedCourse?.mastery || 0.35) * 100 > 100 ? (matchedCourse?.mastery_pct || matchedCourse?.mastery || 35) : (matchedCourse?.mastery_pct || matchedCourse?.mastery || 0.35) * 100);

    if (!concepts || concepts.length === 0) {
      const fallbackClarity = courseMasteryPct || (backendPulse?.overall_clarity_pct || 0);
      let letterGrade = "UNREVIEWED";
      if (fallbackClarity >= 85) letterGrade = "GRADE A";
      else if (fallbackClarity >= 70) letterGrade = "GRADE B+";
      else if (fallbackClarity >= 50) letterGrade = "GRADE C";
      else if (fallbackClarity > 0) letterGrade = "GRADE D";

      return {
        enabled: true,
        overall_clarity_pct: fallbackClarity,
        overall_accuracy_pct: fallbackClarity,
        correct_count: fallbackClarity > 0 ? 3 : 0,
        incorrect_count: 0,
        letter_grade: letterGrade,
        understanding_level: fallbackClarity > 0 ? "Active Progress" : "New Syllabus (Not Yet Graded)",
        needs_revision_count: 0,
        solid_count: fallbackClarity > 0 ? 1 : 0,
        specific_topics_to_revise: [],
        concepts: []
      };
    }

    let totalMasterySum = 0;
    let weakCount = 0;
    let solidCount = 0;
    const pulseConcepts = concepts.map((c) => {
      const mastery = typeof c.mastery === "number" ? c.mastery : (courseMasteryPct ? courseMasteryPct / 100 : 0.35);
      const clarity = Math.round(mastery * 100);
      totalMasterySum += clarity;
      const isWeak = mastery < 0.5;
      if (isWeak) weakCount++;
      else solidCount++;
      return {
        ...c,
        clarity_pct: clarity,
        accuracy_pct: clarity,
        you_struggling: isWeak,
        topic_grade: clarity >= 85 ? "GRADE A" : clarity >= 70 ? "GRADE B" : clarity >= 50 ? "GRADE C" : clarity > 0 ? "GRADE D" : "UNREVIEWED"
      };
    });

    const avgClarity = Math.round(totalMasterySum / concepts.length) || courseMasteryPct;
    let letterGrade = "UNREVIEWED";
    if (avgClarity >= 85) letterGrade = "GRADE A";
    else if (avgClarity >= 70) letterGrade = "GRADE B+";
    else if (avgClarity >= 50) letterGrade = "GRADE C";
    else if (avgClarity > 0) letterGrade = "GRADE D";

    return {
      enabled: true,
      overall_clarity_pct: avgClarity,
      overall_accuracy_pct: avgClarity,
      correct_count: solidCount,
      incorrect_count: weakCount,
      letter_grade: letterGrade,
      understanding_level: avgClarity > 0 ? "Active Progress" : "New Syllabus (Not Yet Graded)",
      needs_revision_count: weakCount,
      solid_count: solidCount,
      specific_topics_to_revise: pulseConcepts.filter((c) => c.you_struggling).map((c) => c.name),
      concepts: pulseConcepts
    };
  }
};