"""Learning material multi-format ingestion package."""
from .base import BaseLearningMaterialAdapter, IngestedDocumentResult
from .text_adapter import TextMaterialAdapter
from .pdf_adapter import PDFMaterialAdapter
from .docx_adapter import DocxMaterialAdapter
from .pptx_adapter import PptxMaterialAdapter
from .video_transcript_adapter import VideoTranscriptAdapter
from .factory import get_learning_material_adapter, extract_learning_material

__all__ = [
    "BaseLearningMaterialAdapter",
    "IngestedDocumentResult",
    "TextMaterialAdapter",
    "PDFMaterialAdapter",
    "DocxMaterialAdapter",
    "PptxMaterialAdapter",
    "VideoTranscriptAdapter",
    "get_learning_material_adapter",
    "extract_learning_material",
]
