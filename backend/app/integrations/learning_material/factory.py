"""Factory to select the appropriate LearningMaterialAdapter by filename/format."""
from __future__ import annotations

from typing import List, Optional
from .base import BaseLearningMaterialAdapter, IngestedDocumentResult
from .text_adapter import TextMaterialAdapter
from .pdf_adapter import PDFMaterialAdapter
from .docx_adapter import DocxMaterialAdapter
from .pptx_adapter import PptxMaterialAdapter
from .video_transcript_adapter import VideoTranscriptAdapter

_ADAPTERS: List[BaseLearningMaterialAdapter] = [
    TextMaterialAdapter(),
    PDFMaterialAdapter(),
    DocxMaterialAdapter(),
    PptxMaterialAdapter(),
    VideoTranscriptAdapter(),
]


def get_learning_material_adapter(filename: str) -> BaseLearningMaterialAdapter:
    """Returns the matching adapter or falls back to TextMaterialAdapter."""
    for adapter in _ADAPTERS:
        if adapter.supports_extension(filename):
            return adapter
    return TextMaterialAdapter()


def get_material_adapter(filename: str) -> BaseLearningMaterialAdapter:
    """Alias for get_learning_material_adapter."""
    return get_learning_material_adapter(filename)


def get_supported_extensions() -> List[str]:
    """Returns list of supported file extensions across all configured adapters."""
    return [".txt", ".md", ".pdf", ".docx", ".pptx", ".vtt", ".srt", ".transcript.json"]


def extract_learning_material(
    file_bytes: bytes, filename: str, metadata: Optional[dict] = None
) -> IngestedDocumentResult:
    """Convenience function to parse learning material directly with the correct adapter."""
    adapter = get_learning_material_adapter(filename)
    return adapter.extract_text_and_metadata(file_bytes, filename, metadata)


def ingest_material_file(
    file_bytes: bytes, filename: str, metadata: Optional[dict] = None
) -> IngestedDocumentResult:
    """Alias for extract_learning_material."""
    return extract_learning_material(file_bytes, filename, metadata)
