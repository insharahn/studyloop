// src/SourcesPanel.jsx
import { useState, useEffect } from "react";
import { FileText, X, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { apiDocuments } from "./api";

export function SourcesPanel({ courseId, onNavigate }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null); // { filename, url }
  const [viewerLoading, setViewerLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { documents } = await apiDocuments.listCourseDocuments(courseId);
        setDocuments(documents || []);
      } catch (err) {
        console.warn("Failed to load documents:", err.message);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  async function openDocument(doc) {
    setViewerLoading(true);
    try {
      const res = await apiDocuments.getDocumentViewUrl(doc.doc_id);
      setViewerDoc({ filename: res.filename, url: res.url });
    } catch (err) {
      console.warn("Failed to open document:", err.message);
    } finally {
      setViewerLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#171717] px-4 pb-16 pt-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-white/10 pb-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white hover:bg-white hover:text-[#171717]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl uppercase leading-none sm:text-2xl">Sources</h2>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl border-2 border-white/10 bg-white/5" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-center text-xs font-bold text-white/60">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <button
                key={doc.doc_id}
                onClick={() => openDocument(doc)}
                disabled={viewerLoading}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-white/15 bg-white/5 p-4 text-left transition hover:border-[#39d5c8] disabled:opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-[#39d5c8]" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold sm:text-sm">{doc.filename}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase">
                      {doc.page_count} pages • {doc.status}
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-white/40" />
              </button>
            ))}
          </div>
        )}
      </div>

      {viewerLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <Loader2 className="h-8 w-8 animate-spin text-[#39d5c8]" />
        </div>
      )}

      {viewerDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between border-b-2 border-white/10 p-3 sm:p-4">
            <p className="truncate text-xs font-bold text-white sm:text-sm">{viewerDoc.filename}</p>
            <div className="flex items-center gap-2">
            <a
                href={viewerDoc.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-lg border-2 border-white/20 bg-white/10 px-2.5 text-[10px] font-black uppercase text-white hover:bg-white/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                New Tab
              </a>
              <button
                onClick={() => setViewerDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe
            src={viewerDoc.url}
            title={viewerDoc.filename}
            className="flex-1 w-full bg-white"
          />
        </div>
      )}
    </div>
  );
}