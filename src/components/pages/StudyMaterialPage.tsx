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
            <span className="text-[11px] text-[#93877D]">Official Manuals & Methodology</span>
          </div>
          <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">Study Material (RAG Grounding)</h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Official government statistical documentation for responsible AI question generation and provenance checks.
          </p>
        </div>
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#93877D]" />
          <input
            type="text"
            placeholder="Search manuals & excerpts…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-xs text-[#2F2520] placeholder-[#93877D] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] focus:bg-[#FFFDFC] w-56 transition-all"
          />
        </div>
      </div>

      {/* ── Upload Section with 6-Stage Pipeline ──── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-[#6B4A35]" />
          <h2 className="text-sm font-bold text-[#2F2520] uppercase tracking-wide">Ingest New Knowledge Document</h2>
          <span className="text-[10px] text-[#93877D] font-mono">{ACCEPTED_EXTENSIONS.join(', ')} · max 20 MB</span>
        </div>

        {/* 6-Stage Pipeline Indicator */}
        <div className="mb-5 p-4 bg-[#F8F3EB] border border-[#DED2C5] rounded-xl">
          <div className="flex items-center gap-1.5 mb-3">
            <Database className="w-3 h-3 text-[#8A6A52]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6E625A]">
              Backend Ingestion Pipeline
            </span>
            {uploadStatus === 'idle' && (
              <span className="text-[10px] text-[#93877D] ml-1">— awaiting upload</span>
            )}
            {uploadStatus === 'uploading' && (
              <span className="text-[10px] text-[#6B4A35] font-semibold ml-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing…
              </span>
            )}
            {uploadStatus === 'success' && (
              <span className="text-[10px] text-[#547A5A] font-semibold ml-1">
                — Backend confirmed indexed
              </span>
            )}
            {uploadStatus === 'error' && (
              <span className="text-[10px] text-[#9A4B42] font-semibold ml-1">
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
                        dotState === 'done' ? 'text-[#547A5A]' :
                        dotState === 'active' ? 'text-[#6B4A35]' :
                        dotState === 'error' ? 'text-[#9A4B42]' : 'text-[#93877D]'
                      }`}>
                        {stage.label}
                      </div>
                      <div className="text-[8px] text-[#93877D] hidden sm:block">{stage.desc}</div>
                    </div>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 transition-colors ${
                      pipelineStageIdx > idx && !isError ? 'bg-[#547A5A]' : 'bg-[#DED2C5]'
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
                  ? 'border-[#6B4A35] bg-[#EEE4D8] text-[#3A2921]'
                  : 'border-[#CBB9A7] hover:border-[#6B4A35] hover:bg-[#F8F3EB] text-[#6E625A]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0 text-[#6B4A35]" />
              <span className="truncate">
                {uploadFile ? uploadFile.name : 'Choose file — PDF, DOCX, PPTX, TXT, MD'}
              </span>
              {uploadFile && (
                <span className="text-[10px] text-[#6E625A] font-mono shrink-0">
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
                ? 'bg-[#EEE4D8] text-[#93877D] border border-[#DED2C5] cursor-not-allowed'
                : 'bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] shadow-xs cursor-pointer'
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
              className="p-2.5 rounded-xl text-[#93877D] hover:text-[#3A2921] hover:bg-[#EEE4D8] transition-colors shrink-0"
              aria-label="Clear upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error */}
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-[#FBF0EF] border border-[#D4958F] text-xs text-[#7A2E2A]">
            <AlertCircle className="w-4 h-4 text-[#9A4B42] shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Success — only shown when backend confirms indexed */}
        {uploadStatus === 'success' && uploadResult && (
          <div className="mt-3 p-4 rounded-xl bg-[#EFF6EF] border border-[#A8C9AC]">
            <div className="flex items-center gap-2 text-[#2E5B34] font-bold text-xs mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#547A5A]" />
              Document confirmed indexed by backend — RAG grounding active
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <div className="text-[#6E625A] uppercase tracking-wider text-[9px] font-bold mb-0.5">Title</div>
                <div className="text-[#2F2520] font-semibold truncate">{uploadResult.title}</div>
              </div>
              <div>
                <div className="text-[#6E625A] uppercase tracking-wider text-[9px] font-bold mb-0.5">RAG Status</div>
                <div className="text-[#2E5B34] font-bold">{docStatusDisplay(uploadResult.status).label}</div>
              </div>
              <div>
                <div className="text-[#6E625A] uppercase tracking-wider text-[9px] font-bold mb-0.5">Knowledge Chunks</div>
                <div className="text-[#3A2921] font-bold font-mono">{uploadResult.chunkCount}</div>
              </div>
              <div>
                <div className="text-[#6E625A] uppercase tracking-wider text-[9px] font-bold mb-0.5">Authority</div>
                <div className="text-[#2F2520] font-semibold">{uploadResult.authority}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Live Backend Document Index ──────────── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#6B4A35]" />
            <h2 className="text-sm font-bold text-[#2F2520] uppercase tracking-wide">
              Backend-Indexed Documents
            </h2>
            <span className="text-[10px] text-[#93877D]">— Confirmed in vector store</span>
          </div>
          <button
            onClick={refreshLiveDocs}
            className="text-[11px] text-[#6B4A35] hover:text-[#3A2921] font-semibold"
          >
            Refresh
          </button>
        </div>

        {docsLoading ? (
          <div className="flex items-center gap-2 text-xs text-[#6E625A] py-3">
            <Loader2 className="w-4 h-4 animate-spin text-[#6B4A35]" />
            Loading indexed documents from backend…
          </div>
        ) : liveDocuments.length === 0 ? (
          <div className="py-4 text-xs text-[#93877D] italic">
            No documents are currently indexed in the backend vector store. Upload a document above to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {liveDocuments.map((doc) => {
              const statusInfo = docStatusDisplay(doc.status);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[#DED2C5] bg-[#F8F3EB] hover:border-[#CBB9A7] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-4 h-4 text-[#6B4A35] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2F2520] truncate">{doc.title}</div>
                      <div className="text-[10px] text-[#93877D] font-mono mt-0.5">
                        {doc.filename} · Knowledge Chunks: {doc.chunkCount} · {doc.authority}
                        {doc.createdAt && ` · ${new Date(doc.createdAt).toLocaleDateString('en-IN')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#EEE4D8] text-[#3A2921]">
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
          { label: 'Ingested Manuals', value: `${STUDY_DOCUMENTS.length}`, sub: 'PLFS & Econometric primers', color: 'text-[#2F2520]' },
          { label: 'Indexed Sections', value: `${totalSections}`, sub: 'Extracted semantic chunks', color: 'text-[#3A2921]' },
          { label: 'Grounded Questions', value: `${totalQuestions}`, sub: 'With page citations', color: 'text-[#547A5A]' },
          { label: 'Human Review Flags', value: `${flaggedCount}`, sub: 'HITL validation required', color: 'text-[#A97838]' },
        ].map((kpi) => (
          <div key={kpi.label} className="officer-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#93877D] mb-1">{kpi.label}</div>
            <div className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-[#6E625A] mt-0.5">{kpi.sub}</div>
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
                  isSelected ? 'bg-gradient-to-br from-[#2A1E19] to-[#3A2921] border-[#4D3628] text-[#FBF8F2] shadow-md' : 'officer-card hover:border-[#CBB9A7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-[#4D3628] text-[#EEE4D8]' : 'bg-[#EEE4D8] text-[#3A2921]'}`}>
                    {doc.fileSize}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#547A5A]/30 text-[#A8C9AC]' : 'bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC]'}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-[#D4A96A]' : 'text-[#6B4A35]'}`} />
                  <div>
                    <h3 className={`text-xs font-bold leading-snug ${isSelected ? 'text-[#FBF8F2]' : 'text-[#2F2520]'}`}>
                      {doc.fileName}
                    </h3>
                    <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-[#B8A28F]' : 'text-[#93877D]'}`}>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DED2C5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEE4D8] flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#6B4A35]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2F2520]">{selectedDoc.fileName}</h2>
                  <p className="text-xs text-[#6E625A]">
                    {selectedDoc.extractedSections} semantic chunks · Verified MoSPI publication
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#EEE4D8] text-[#3A2921]">
                {selectedDoc.fileSize}
              </span>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-[#6E625A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#A97838]" />
                Grounding Verification & Generated Questions ({selectedDoc.generatedQuestions.length})
              </h3>
              <div className="space-y-3">
                {selectedDoc.generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#DED2C5] bg-[#F8F3EB] space-y-2.5 hover:border-[#CBB9A7] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#3A2921] text-[#FBF8F2] flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-[#2F2520] leading-snug">{q.question}</h4>
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
                    <div className="p-3 bg-[#FFFDFC] rounded-lg border border-[#DED2C5] text-xs text-[#2F2520] leading-relaxed">
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[#8A6A52] mb-1">
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#6B4A35]" /> Source Provenance</span>
                        <span>{q.page > 0 ? `Page ${q.page}` : 'No Direct Page Citation'}</span>
                      </div>
                      <p className="italic text-[#6E625A]">&ldquo;{q.sourceExcerpt}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#DED2C5] flex items-center justify-between">
              <span className="text-xs text-[#6E625A]">Assess competencies with these grounded items?</span>
              <button
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold rounded-xl shadow-xs transition-all"
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
