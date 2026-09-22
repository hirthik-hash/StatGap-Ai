import React, { useState, useEffect, useRef } from 'react';
import { STUDY_DOCUMENTS } from '../../data/mockData';
import { NavPageId } from '../common/Sidebar';
import {
  uploadKnowledgeDocument,
  listKnowledgeDocuments,
  validateDocumentFile,
  ACCEPTED_EXTENSIONS,
  KnowledgeDocumentResult,
} from '../../services/knowledgeService';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowRight,
  FileCheck,
  Scale,
  Upload,
  Loader2,
  X,
  Database,
  Shield,
} from 'lucide-react';

interface StudyMaterialPageProps {
  onNavigate: (page: NavPageId) => void;
}

/** 6-stage ingestion pipeline definition */
const PIPELINE_STAGES = [
  { id: 'upload',  label: 'UPLOAD',  desc: 'File received' },
  { id: 'extract', label: 'EXTRACT', desc: 'Text extraction' },
  { id: 'chunk',   label: 'CHUNK',   desc: 'Semantic chunking' },
  { id: 'embed',   label: 'EMBED',   desc: 'Vector embeddings' },
  { id: 'index',   label: 'INDEX',   desc: 'Vector store' },
  { id: 'ready',   label: 'RAG READY', desc: 'Grounding active' },
];

/**
 * Maps upload state to the highest completed pipeline stage index.
 * IMPORTANT: Never advances beyond what the backend has confirmed.
 * idle       → -1 (no stages lit)
 * uploading  → 0  (UPLOAD in progress)
 * success    → 5  (all stages — backend confirmed indexed)
 * error      → -2 (error state)
 */
function uploadStatusToPipelineStage(status: string): number {
  if (status === 'idle')      return -1;
  if (status === 'uploading') return 0;
  if (status === 'success')   return 5;
  if (status === 'error')     return -2;
  return -1;
}

/** Maps backend document status string to a human-readable label and style */
function docStatusDisplay(status: string): { label: string; cls: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'indexed' || s === 'ready' || s === 'rag_ready') {
    return { label: 'RAG Ready', cls: 'badge badge-rag-ready' };
  }
  if (s === 'processing' || s === 'extracting' || s === 'chunking' || s === 'indexing') {
    return { label: 'Indexing…', cls: 'badge badge-processing' };
  }
  if (s === 'failed' || s === 'error') {
    return { label: 'Failed', cls: 'badge badge-failed' };
  }
  return { label: status, cls: 'badge badge-unverified' };
}

export const StudyMaterialPage: React.FC<StudyMaterialPageProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(STUDY_DOCUMENTS[0].id);

  // Upload state — preserve original logic exactly
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<KnowledgeDocumentResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live backend document list — preserve original logic exactly
  const [liveDocuments, setLiveDocuments] = useState<KnowledgeDocumentResult[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setDocsLoading(true);
    listKnowledgeDocuments()
      .then((docs) => { if (active) setLiveDocuments(docs); })
      .catch(() => { if (active) setLiveDocuments([]); })
      .finally(() => { if (active) setDocsLoading(false); });
    return () => { active = false; };
  }, []);

  const refreshLiveDocs = () => {
    listKnowledgeDocuments()
      .then(setLiveDocuments)
      .catch(() => setLiveDocuments([]));
  };

  const filteredDocs = STUDY_DOCUMENTS.filter(
    (doc) =>
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.generatedQuestions.some(
        (q) =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.sourceExcerpt.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const selectedDoc = STUDY_DOCUMENTS.find((d) => d.id === selectedDocId) || STUDY_DOCUMENTS[0];
  const totalSections = STUDY_DOCUMENTS.reduce((acc, d) => acc + d.extractedSections, 0);
  const totalQuestions = STUDY_DOCUMENTS.reduce((acc, d) => acc + d.generatedQuestions.length, 0);
  const flaggedCount = STUDY_DOCUMENTS.reduce(
    (acc, d) => acc + d.generatedQuestions.filter((q) => q.requiresHumanReview).length, 0
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
    setUploadResult(null);
    setUploadStatus('idle');
    if (!file) { setUploadFile(null); return; }
    const err = validateDocumentFile(file);
    if (err) { setUploadError(err); setUploadFile(null); return; }
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadError(null);
    setUploadStatus('uploading');
    try {
      const result = await uploadKnowledgeDocument(uploadFile, { authority: 'NSSTA' });
      setUploadResult(result);
      setUploadStatus('success');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshLiveDocs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
      setUploadStatus('error');
    }
  };

  const handleClearUpload = () => {
    setUploadFile(null);
    setUploadError(null);
    setUploadResult(null);
    setUploadStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Pipeline stage state (derived from backend upload status — never faked)
  const pipelineStageIdx = uploadStatusToPipelineStage(uploadStatus);
  const isError = uploadStatus === 'error';

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">

      {/* ── Header ──────────────────────────────────── */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-unverified uppercase">Evidence & Grounding</span>
            <span className="text-[11px] text-slate-400">Official Manuals & Methodology</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Study Material (RAG Grounding)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Official government statistical documentation for responsible AI question generation and provenance checks.
          </p>
        </div>
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search manuals & excerpts…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-56"
          />
        </div>
      </div>

      {/* ── Upload Section with 6-Stage Pipeline ──── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-blue-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Ingest New Knowledge Document</h2>
          <span className="text-[10px] text-slate-400 font-mono">{ACCEPTED_EXTENSIONS.join(', ')} · max 20 MB</span>
        </div>

        {/* 6-Stage Pipeline Indicator
            IMPORTANT: Stage progress is driven exclusively by uploadStatus from the backend.
            No stage auto-advances without backend confirmation. */}
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-1.5 mb-3">
            <Database className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Backend Ingestion Pipeline
            </span>
            {uploadStatus === 'idle' && (
              <span className="text-[10px] text-slate-400 ml-1">— awaiting upload</span>
            )}
            {uploadStatus === 'uploading' && (
              <span className="text-[10px] text-blue-600 font-semibold ml-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing…
              </span>
            )}
            {uploadStatus === 'success' && (
              <span className="text-[10px] text-emerald-600 font-semibold ml-1">
                — Backend confirmed indexed
              </span>
            )}
            {uploadStatus === 'error' && (
              <span className="text-[10px] text-rose-600 font-semibold ml-1">
                — Ingestion failed
              </span>
            )}
          </div>

          <div className="flex items-center">
            {PIPELINE_STAGES.map((stage, idx) => {
              let dotState = 'pending';
              if (isError) {
                dotState = idx === 0 ? 'error' : 'pending';
              } else if (pipelineStageIdx === 0 && idx === 0) {
                dotState = 'active';
              } else if (pipelineStageIdx >= idx) {
                dotState = 'done';
              }

              return (
                <React.Fragment key={stage.id}>
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={`pipeline-dot ${dotState}`}>
                      {dotState === 'done' ? '✓' : idx + 1}
                    </div>
                    <div className={`text-center ${dotState === 'pending' ? 'opacity-40' : ''}`}>
                      <div className={`text-[9px] font-black uppercase leading-tight ${
                        dotState === 'done' ? 'text-emerald-700' :
                        dotState === 'active' ? 'text-blue-700' :
                        dotState === 'error' ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                        {stage.label}
                      </div>
                      <div className="text-[8px] text-slate-400 hidden sm:block">{stage.desc}</div>
                    </div>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 transition-colors ${
                      pipelineStageIdx > idx && !isError ? 'bg-emerald-400' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Dropzone / File selector */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="knowledge-upload-input"
              className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all text-xs font-medium ${
                uploadFile
                  ? 'border-blue-400 bg-blue-50/50 text-blue-800'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 text-slate-600'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {uploadFile ? uploadFile.name : 'Choose file — PDF, DOCX, PPTX, TXT, MD'}
              </span>
              {uploadFile && (
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {(uploadFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </label>
            <input
              id="knowledge-upload-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt,.md"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploadStatus === 'uploading'}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              !uploadFile || uploadStatus === 'uploading'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#0c1a30] hover:bg-[#102a4e] text-white cursor-pointer'
            }`}
          >
            {uploadStatus === 'uploading' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploadStatus === 'uploading' ? 'Ingesting…' : 'Upload & Ingest'}
          </button>

          {(uploadFile || uploadStatus !== 'idle') && (
            <button
              onClick={handleClearUpload}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Clear upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error */}
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Success — only shown when backend confirms indexed */}
        {uploadStatus === 'success' && uploadResult && (
          <div className="mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Document confirmed indexed by backend — RAG grounding active
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-0.5">Title</div>
                <div className="text-slate-900 font-semibold truncate">{uploadResult.title}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-0.5">RAG Status</div>
                <div className="text-emerald-700 font-bold">{docStatusDisplay(uploadResult.status).label}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-0.5">Knowledge Chunks</div>
                <div className="text-blue-900 font-bold font-mono">{uploadResult.chunkCount}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold mb-0.5">Authority</div>
                <div className="text-slate-900 font-semibold">{uploadResult.authority}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Live Backend Document Index ──────────── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Backend-Indexed Documents
            </h2>
            <span className="text-[10px] text-slate-400">— Confirmed in vector store</span>
          </div>
          <button
            onClick={refreshLiveDocs}
            className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold"
          >
            Refresh
          </button>
        </div>

        {docsLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
            Loading indexed documents from backend…
          </div>
        ) : liveDocuments.length === 0 ? (
          <div className="py-4 text-xs text-slate-500 italic">
            No documents are currently indexed in the backend vector store. Upload a document above to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {liveDocuments.map((doc) => {
              const statusInfo = docStatusDisplay(doc.status);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{doc.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {doc.filename} · Knowledge Chunks: {doc.chunkCount} · {doc.authority}
                        {doc.createdAt && ` · ${new Date(doc.createdAt).toLocaleDateString('en-IN')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {doc.documentType}
                    </span>
                    <span className={statusInfo.cls}>{statusInfo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── KPI Summary ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ingested Manuals', value: `${STUDY_DOCUMENTS.length}`, sub: 'PLFS & Econometric primers', color: 'text-slate-900' },
          { label: 'Indexed Sections', value: `${totalSections}`, sub: 'Extracted semantic chunks', color: 'text-blue-900' },
          { label: 'Grounded Questions', value: `${totalQuestions}`, sub: 'With page citations', color: 'text-emerald-700' },
          { label: 'Human Review Flags', value: `${flaggedCount}`, sub: 'HITL validation required', color: 'text-amber-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="officer-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{kpi.label}</div>
            <div className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Mock Document Repository ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Document list */}
        <div className="lg:col-span-4 space-y-2">
          <div className="section-label">Official Repository ({filteredDocs.length})</div>
          {filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected ? 'bg-[#0c1a30] border-blue-900 shadow-md' : 'officer-card hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-600'}`}>
                    {doc.fileSize}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-amber-300' : 'text-blue-700'}`} />
                  <div>
                    <h3 className={`text-xs font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {doc.fileName}
                    </h3>
                    <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-blue-300' : 'text-slate-400'}`}>
                      {doc.uploadedDate} · {doc.extractedSections} sections
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Document detail */}
        <div className="lg:col-span-8">
          <div className="officer-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedDoc.fileName}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedDoc.extractedSections} semantic chunks · Verified MoSPI publication
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                {selectedDoc.fileSize}
              </span>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Grounding Verification & Generated Questions ({selectedDoc.generatedQuestions.length})
              </h3>
              <div className="space-y-3">
                {selectedDoc.generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#0c1a30] text-white flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{q.question}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.isSourceGrounded ? (
                          <span className="inline-flex items-center gap-1 badge badge-rag-ready">
                            <CheckCircle2 className="w-3 h-3" />
                            Grounded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 badge badge-failed">
                            <AlertCircle className="w-3 h-3" />
                            Ungrounded
                          </span>
                        )}
                        {q.requiresHumanReview && (
                          <span className="inline-flex items-center gap-1 badge badge-processing">
                            <Scale className="w-3 h-3" />
                            Human Review
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 mb-1">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Source Provenance</span>
                        <span>{q.page > 0 ? `Page ${q.page}` : 'No Direct Page Citation'}</span>
                      </div>
                      <p className="italic text-slate-600">&ldquo;{q.sourceExcerpt}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Assess competencies with these grounded items?</span>
              <button
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c1a30] hover:bg-[#102a4e] text-white text-xs font-bold rounded-xl transition-all"
              >
                Take Adaptive Assessment
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
