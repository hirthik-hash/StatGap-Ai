"""Knowledge Document Upload and Listing Endpoints.

Provides authenticated document ingestion into the RAG/pgvector pipeline.
Security:
- Authentication required (Bearer JWT).
- 20 MB file size limit enforced before saving.
- Extension AND content-type validation.
- Temporary files use a secure random name, never the original filename.
- Temporary files are always deleted in finally blocks.
- Raw filesystem paths, exception tracebacks, and API keys are never returned.
"""
import os
import secrets
import tempfile
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.ingestion.ingestion_service import DocumentIngestionService

router = APIRouter(prefix="/knowledge", tags=["Knowledge Document Management"])

# Allowed file extensions (lowercase, with leading dot)
_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}

# Allowed MIME content types
_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    # Some browsers send generic binary for .docx/.pptx
    "application/octet-stream",
    "application/zip",
}

# 20 MB limit in bytes
_MAX_FILE_BYTES = 20 * 1024 * 1024


@router.post(
    "/documents/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a knowledge document into the RAG pipeline",
)
def upload_knowledge_document(
    file: UploadFile = File(..., description="Document file to ingest (PDF, DOCX, PPTX, TXT, MD)"),
    title: Optional[str] = Form(None, description="Optional document title override"),
    authority: str = Form("NSSTA", description="Issuing authority (default: NSSTA)"),
    description: Optional[str] = Form(None, description="Optional document description"),
    competency_ids: Optional[str] = Form(None, description="Comma-separated competency IDs to associate"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts a file upload, validates it, saves to a secure temp location,
    invokes DocumentIngestionService, and returns ingestion metadata.

    On failure the error is reported cleanly. Temp files are always deleted.
    Raw filesystem paths, exception tracebacks, and secrets are never returned.
    """
    # --- 1. Validate filename extension ---
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Filename is missing from the upload.",
        )

    original_filename = file.filename
    _, ext = os.path.splitext(original_filename.lower())
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported file format '{ext}'. "
                f"Supported formats: {', '.join(sorted(_ALLOWED_EXTENSIONS))}"
            ),
        )

    # --- 2. Validate content-type (best-effort; extension is authoritative) ---
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Content-Type '{content_type}' is not permitted. "
                "Please upload a PDF, DOCX, PPTX, TXT, or MD file."
            ),
        )

    # --- 3. Read file content and enforce size limit ---
    file_bytes = file.file.read()
    if len(file_bytes) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the 20 MB maximum size limit ({len(file_bytes) // (1024*1024)} MB uploaded).",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # --- 4. Write to secure temp file (random name, never original path) ---
    tmp_path: Optional[str] = None
    try:
        # Use secrets.token_hex for an unpredictable temp filename
        safe_suffix = ext  # only the validated extension
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=safe_suffix, prefix=f"statgap_{secrets.token_hex(8)}_")
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            tmp_file.write(file_bytes)

        # --- 5. Parse competency IDs ---
        comp_ids: List[str] = []
        if competency_ids:
            comp_ids = [c.strip() for c in competency_ids.split(",") if c.strip()]

        # --- 6. Run ingestion pipeline ---
        service = DocumentIngestionService(db)
        doc = service.ingest_file(
            file_path=tmp_path,
            title=title or os.path.splitext(original_filename)[0].replace("_", " ").title(),
            source=f"Officer Upload: {current_user.profile.name if current_user.profile else current_user.igot_id}",
            authority=authority,
            competency_ids=comp_ids if comp_ids else None,
            description=description,
        )

        chunk_count = len(doc.chunks) if doc.chunks is not None else 0

        return {
            "id": doc.id,
            "title": doc.title,
            "filename": original_filename,
            "documentType": doc.document_type,
            "authority": doc.authority,
            "source": doc.source,
            "version": doc.version,
            "status": doc.status,
            "chunkCount": chunk_count,
            "createdAt": doc.created_at.isoformat() if doc.created_at else None,
            "isDuplicate": False,
        }

    except HTTPException:
        raise
    except RuntimeError as exc:
        # Ingestion failure — clean message, no traceback
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document ingestion failed: {str(exc)}",
        ) from None
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during document ingestion. Please try again.",
        ) from None
    finally:
        # Always clean up the temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass  # best-effort cleanup


@router.get(
    "/documents",
    status_code=status.HTTP_200_OK,
    summary="List all indexed knowledge documents (backend-confirmed only)",
)
def list_knowledge_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns metadata for all documents confirmed as indexed in the vector store."""
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "documentType": d.document_type,
            "authority": d.authority,
            "source": d.source,
            "version": d.version,
            "status": d.status,
            "chunkCount": len(d.chunks) if d.chunks is not None else 0,
            "createdAt": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]
