// src/UploadPage.jsx
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import gsap from "gsap";
import { ToastContainer, toast as reactToast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { api, apiConcepts } from "./api";
import { cn } from "./utils";

export function UploadPage({ user, courseId, onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || "");
  const [documents, setDocuments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeUploads, setActiveUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hasNoCourses = !loading && courses.length === 0;

  function showToast(message, type = "error") {
    if (type === "error") {
      reactToast.error(message, {
        position: "top-right",
        autoClose: 4500,
        theme: "colored"
      });
    } else if (type === "warning") {
      reactToast.warn(message, {
        position: "top-right",
        autoClose: 4500,
        theme: "colored"
      });
    } else {
      reactToast.success(message, {
        position: "top-right",
        autoClose: 4500,
        theme: "colored"
      });
    }
  }

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial Load: Courses & Existing Docs
  useEffect(() => {
    async function init() {
      const courseList = await api.getCourses();
      setCourses(courseList);
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || "");
      const validPassedId = (courseId && isUUID(courseId) && courseList.some((c) => c.id === courseId)) ? courseId : null;
      const activeId = validPassedId || courseList[0]?.id || "";
      setSelectedCourseId(activeId);

      if (activeId && isUUID(activeId)) {
        const docs = await api.getDocuments(activeId);
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
      setLoading(false);
    }
    init();
  }, [courseId]);

  // Load docs on course switch
  async function handleCourseChange(newId) {
    setSelectedCourseId(newId);
    setDropdownOpen(false);
    setActiveUploads([]);
    setLoading(true);
    const docs = await api.getDocuments(newId);
    setDocuments(docs);
    setLoading(false);
  }

  const MAX_FILE_SIZE_MB = 25;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // File Drop / Selection Handler
  async function handleFiles(files) {
    const rawFiles = Array.from(files);
    if (!rawFiles.length) return;

    if (!selectedCourseId) {
      showToast("Please create a course before uploading notes.", "error");
      return;
    }

    for (const file of rawFiles) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Please upload a PDF file.", "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`File exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "warning");
        continue;
      }

      // Show feedback immediately, before the network request even starts
      const tempId = "uploading_" + Date.now() + "_" + file.name;
      setActiveUploads((prev) => [
        { doc_id: tempId, filename: file.name, progress: 5, status: "uploading" },
        ...prev,
      ]);

      try {
        const initialUpload = await api.uploadDocument(selectedCourseId, file);

        // Swap the temporary placeholder for the real doc_id once the POST resolves
        setActiveUploads((prev) =>
          prev.map((u) =>
            u.doc_id === tempId
              ? { doc_id: initialUpload.doc_id, filename: file.name, progress: 15, status: "processing" }
              : u
          )
        );
        pollStatus(initialUpload.doc_id, file.name);
      } catch (err) {
        console.error("Upload failed:", err);
        showToast("Failed to process document.", "error");
        setActiveUploads((prev) =>
          prev.map((u) =>
            u.doc_id === tempId
              ? { ...u, status: "failed", error: err.message || "Upload failed" }
              : u
          )
        );
      }
    }
  }

  // 2-second Polling Loop until ready/failed
  function pollStatus(docId, filename) {
    const interval = setInterval(async () => {
      try {
        const res = await api.getDocumentStatus(docId);

        if (res.status === "ready") {
          clearInterval(interval);

          setActiveUploads((current) =>
            current.map((u) =>
              u.doc_id === docId ? { ...u, status: "generating", progress: 100 } : u
            )
          );

          try {
            const conceptsResult = await apiConcepts.buildConcepts(selectedCourseId);
            if (!conceptsResult?.concepts_created) {
              throw new Error(
                "No concepts could be extracted from this PDF. Please ensure the PDF contains readable text."
              );
            }
            const cardsResult = await apiConcepts.generateCards(selectedCourseId);
            if (!cardsResult?.created) {
              throw new Error("Concepts were found but no flashcards were generated. Try again in a moment.");
            }
            setActiveUploads((current) => current.filter((u) => u.doc_id !== docId));
            showToast("Document uploaded successfully!", "success");
          } catch (err) {
            console.error("Concept/card generation failed:", err);
            showToast("Failed to process document.", "error");
            setActiveUploads((current) =>
              current.map((u) =>
                u.doc_id === docId
                  ? { ...u, status: "failed", error: "Flashcard generation failed: " + err.message }
                  : u
              )
            );
          }

          setDocuments((currentDocs) => {
            const exists = currentDocs.some((d) => d.doc_id === res.doc_id);
            if (exists) return currentDocs;
            return [
              {
                doc_id: res.doc_id,
                filename: filename,
                page_count: res.page_count,
                chunk_count: res.chunk_count,
                status: "ready",
                created_at: new Date().toISOString().split("T")[0]
              },
              ...currentDocs
            ];
          });
        } else if (res.status === "failed") {
          clearInterval(interval);
          setActiveUploads((current) =>
            current.map((u) => (u.doc_id === docId ? { ...u, status: "failed", error: res.error || "Failed" } : u))
          );
        } else {
          setActiveUploads((current) =>
            current.map((u) => (u.doc_id === docId ? { ...u, progress: res.progress || u.progress } : u))
          );
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(interval);
        setActiveUploads((current) =>
          current.map((u) =>
            u.doc_id === docId
              ? { ...u, status: "failed", error: err.message || "Could not check upload status" }
              : u
          )
        );
      }
    }, 2000);
  }

  async function handleDelete(docId) {
    try {
      await api.deleteDocument(docId, selectedCourseId);
    } catch (err) {
      console.warn("Backend delete document notice:", err.message);
    } finally {
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
      if (selectedCourseId) {
        const localDocsJson = localStorage.getItem(`studyloop_docs_${selectedCourseId}`);
        if (localDocsJson) {
          const localDocs = JSON.parse(localDocsJson).filter((d) => d.doc_id !== docId);
          localStorage.setItem(`studyloop_docs_${selectedCourseId}`, JSON.stringify(localDocs));
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-[#171717] px-4 pb-20 pt-6 text-white sm:px-8 lg:px-12">
      <ToastContainer position="top-right" autoClose={4500} theme="colored" />

      <div className="mx-auto max-w-5xl">
        {/* Navigation / Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-white/10 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white transition hover:bg-white hover:text-[#171717]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-3xl uppercase sm:text-4xl">Upload Lecture Notes</h1>
              <p className="text-xs font-bold text-white/60">PDFs are parsed with slide numbers & page provenance strictly preserved.</p>
            </div>
          </div>

          {/* Course Selector Dropdown */}
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <label className="text-xs font-black uppercase text-white/70">Course:</label>
            
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border-2 border-[#171717] bg-[#ffd356] px-3.5 py-2 text-xs font-black uppercase text-[#171717] shadow-sm transition hover:bg-amber-300 active:translate-y-0.5"
            >
              <span>
                {courses.find((c) => c.id === selectedCourseId)?.code ||
                 courses.find((c) => c.id === selectedCourseId)?.name ||
                 "Select Course"}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border-3 border-[#171717] bg-[#ffd356] p-1.5 text-[#171717] shadow-hard animate-in fade-in slide-in-from-top-2 duration-150">
                {courses.map((c) => {
                  const isSelected = c.id === selectedCourseId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCourseChange(c.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-black uppercase transition-colors mb-1 last:mb-0",
                        isSelected ? "bg-[#171717] text-[#ffd356]" : "hover:bg-[#171717]/10 text-[#171717]"
                      )}
                    >
                      <span>{c.code ? `${c.code} — ${c.name}` : c.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[#ffd356]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drag & Drop Zone */}
        {hasNoCourses ? (
          <div className="flex flex-col items-center justify-center rounded-[32px] border-4 border-dashed border-white/20 bg-white/5 p-8 text-center sm:p-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#171717] bg-[#ffd356] text-[#171717] shadow-hard">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-tight sm:text-3xl">
              No courses yet
            </h3>
            <p className="mt-1 text-xs font-bold text-white/60">
              You need to create a course before you can upload lecture notes.
            </p>
            <button
              onClick={() => onNavigate("dashboard")}
              className="mt-4 rounded-full border-2 border-white bg-white/10 px-5 py-2 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-white hover:text-[#171717]"
            >
              Go to Dashboard to Add a Course
            </button>
          </div>
        ) : (
          <div
            ref={dropZoneRef}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center rounded-[32px] border-4 border-dashed p-8 text-center transition-all sm:p-12",
              isDragging
                ? "scale-[1.01] border-[#39d5c8] bg-[#39d5c8]/10"
                : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#171717] bg-[#ffd356] text-[#171717] shadow-hard">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-tight sm:text-3xl">
              Drop your slides or notes here
            </h3>
            <p className="mt-1 text-xs font-bold text-white/60">
              Supports PDF-only lecture decks, typed notes, and dense handouts.
            </p>
            <span className="mt-4 rounded-full border-2 border-white bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white">
              Browse Local Files
            </span>
          </div>
        )}

        {/* Active Processing Section */}
        {activeUploads.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-2xl uppercase tracking-tight mb-3 text-[#39d5c8]">
              Processing...
            </h2>
            <div className="space-y-3">
              {activeUploads.map((item) => (
                <div
                  key={item.doc_id}
                  className="rounded-[22px] border-3 border-[#171717] bg-[#242424] p-4 shadow-hard"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.status !== "failed" && (
                        <Loader2 className="h-4 w-4 animate-spin text-[#39d5c8]" />
                      )}
                      <span className="text-xs font-black">{item.filename}</span>
                    </div>
                    <span className="rounded-full bg-[#39d5c8] px-2.5 py-0.5 text-[10px] font-black text-[#171717]">
                      {item.status === "generating"
                      ? "Generating flashcards..."
                      : item.status === "uploading"
                      ? "Uploading..."
                      : item.status === "failed"
                      ? "Failed"
                      : `${item.progress}%`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-[#171717] bg-white/20">
                    <div
                      className="h-full bg-[#39d5c8] transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.status === "failed" && item.error && (
                    <p className="mt-2 text-[11px] font-bold text-rose-400">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Documents List */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl uppercase tracking-tight sm:text-3xl">
              Documents ({documents.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-[20px] bg-[#242424] animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-[24px] border-2 border-white/10 bg-white/5 p-8 text-center text-xs font-bold text-white/50">
              No documents uploaded for this syllabus yet.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.doc_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[22px] border-3 border-[#171717] bg-white p-4 text-[#171717] shadow-hard"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6574ff] text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black leading-tight">{doc.filename}</h4>
                      <p className="text-[11px] font-bold opacity-60">
                        {doc.page_count} Pages • {doc.chunk_count} Chunks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="flex items-center gap-1 rounded-full border-2 border-[#171717] bg-[#a7ef59] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#171717]">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </span>
                    <button
                      onClick={() => handleDelete(doc.doc_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#171717] bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}