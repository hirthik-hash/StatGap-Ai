"""Abstract base adapter for Learning Material Ingestion — Phase 9.

Supports multi-format ingestion of statistical learning resources:
  - PDF documents
  - DOCX word documents
  - PPTX presentations
  - Plaintext / Markdown
  - Video Transcripts (Architecture Ready)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IngestedDocumentResult(BaseModel):
    """Normalized output from a learning material parser."""

    title: str
    content_text: str
    format_type: str
    estimated_reading_minutes: int = 5
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_transcript: bool = False
    language: str = "en"


class BaseLearningMaterialAdapter(ABC):
    """Abstract interface for format-specific document and transcript extractors."""

    @abstractmethod
    def supports_extension(self, filename: str) -> bool:
        """Returns True if the adapter handles the given file extension."""
        pass

    @abstractmethod
    def extract_text_and_metadata(
        self, file_bytes: bytes, filename: str, metadata: Optional[Dict[str, Any]] = None
    ) -> IngestedDocumentResult:
        """Parses file content and returns standardized IngestedDocumentResult."""
        pass
