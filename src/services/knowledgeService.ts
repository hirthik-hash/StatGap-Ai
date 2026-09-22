/**
 * STAT-GAP AI — Knowledge Document Service
 * Interfaces with the backend knowledge document ingestion and retrieval API.
 * - POST /api/knowledge/documents/upload  → ingest a document into the RAG pipeline
 * - GET  /api/knowledge/documents         → list all backend-confirmed indexed documents
 *
 * NEVER fakes success. Never falls back to mock data silently.
 * All errors are propagated to the caller for explicit display.
 */
import { apiClient } from './apiClient';

export interface KnowledgeDocumentResult {
  id: string;
  title: string;
  filename: string;
  documentType: string;
  authority: string;
  source: string;
  version: string | null;
  status: string;
  chunkCount: number;
  createdAt: string | null;
  isDuplicate?: boolean;
}

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.txt', '.md'];
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
].join(',');

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validates file before uploading: extension, size.
 * Returns an error string if invalid, null if valid.
 */
export function validateDocumentFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExt) {
    return `Unsupported file format. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is 20 MB.`;
  }
  if (file.size === 0) {
    return 'File is empty. Please select a valid document.';
  }
  return null;
}

/**
 * Uploads a document file to the backend ingestion pipeline.
 * Uses multipart/form-data. Bearer token injected by apiClient.
 * Throws on any backend or network error — caller must handle.
 */
export async function uploadKnowledgeDocument(
  file: File,
  options: {
    title?: string;
    authority?: string;
    description?: string;
    competencyIds?: string[];
  } = {}
): Promise<KnowledgeDocumentResult> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  if (options.title) formData.append('title', options.title);
  if (options.authority) formData.append('authority', options.authority);
  if (options.description) formData.append('description', options.description);
  if (options.competencyIds?.length) {
    formData.append('competency_ids', options.competencyIds.join(','));
  }

  return apiClient.request<KnowledgeDocumentResult>('/api/knowledge/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Lists all documents confirmed as indexed in the backend vector store.
 * Returns empty array if no documents exist (not an error).
 */
export async function listKnowledgeDocuments(): Promise<KnowledgeDocumentResult[]> {
  return apiClient.get<KnowledgeDocumentResult[]>('/api/knowledge/documents');
}
