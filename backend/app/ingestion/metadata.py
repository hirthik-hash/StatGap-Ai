"""Pydantic schemas for document and chunk metadata in the ingestion pipeline."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DocumentMetadata(BaseModel):
    title: str
    filename: str
    document_type: str  # pdf, docx, pptx, txt, md
    source: str
    source_url: Optional[str] = None
    version: Optional[str] = None
    authority: str = "NSSTA"
    description: Optional[str] = None
    checksum: str
    competency_ids: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class ChunkMetadata(BaseModel):
    document_id: str
    chunk_index: int
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    token_count: int = 0
    competency_ids: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)
    authority: str = "NSSTA"
    extra: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)
