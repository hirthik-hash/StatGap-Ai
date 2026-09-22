"""Statistical document chunker with sentence boundary preservation and provenance tracking."""
import re
from typing import List, Dict, Any, Optional
from backend.app.ingestion.metadata import ChunkMetadata
from backend.app.ingestion.text_extractor import ExtractedSection


class DocumentChunk:
    def __init__(
        self,
        document_id: str,
        chunk_index: int,
        text: str,
        page_number: Optional[int] = None,
        section_title: Optional[str] = None,
        token_count: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.document_id = document_id
        self.chunk_index = chunk_index
        self.text = text.strip()
        self.page_number = page_number
        self.section_title = section_title
        self.token_count = token_count
        self.metadata = metadata or {}


class StatisticalDocumentChunker:
    def __init__(self, target_chunk_words: int = 150, overlap_words: int = 30):
        self.target_chunk_words = target_chunk_words
        self.overlap_words = overlap_words

    def chunk_sections(
        self,
        document_id: str,
        sections: List[ExtractedSection],
        base_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:
        """Splits extracted document sections into overlapping, boundary-aware chunks."""
        chunks: List[DocumentChunk] = []
        chunk_index = 0
        base_meta = base_metadata or {}

        for section in sections:
            paragraphs = [p.strip() for p in section.text.split("\n\n") if p.strip()]
            if not paragraphs:
                paragraphs = [section.text]

            current_words: List[str] = []

            for paragraph in paragraphs:
                sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                for sentence in sentences:
                    sentence_words = sentence.split()
                    if not sentence_words:
                        continue

                    # If adding sentence exceeds target, flush chunk
                    if len(current_words) + len(sentence_words) > self.target_chunk_words and current_words:
                        chunk_text = " ".join(current_words)
                        chunks.append(DocumentChunk(
                            document_id=document_id,
                            chunk_index=chunk_index,
                            text=chunk_text,
                            page_number=section.page_number,
                            section_title=section.section_title,
                            token_count=len(current_words),
                            metadata={
                                **base_meta,
                                "section_title": section.section_title,
                                "page_number": section.page_number,
                            },
                        ))
                        chunk_index += 1
                        # Retain overlap words
                        current_words = current_words[-self.overlap_words:] if len(current_words) > self.overlap_words else current_words

                    current_words.extend(sentence_words)

            if current_words:
                chunk_text = " ".join(current_words)
                chunks.append(DocumentChunk(
                    document_id=document_id,
                    chunk_index=chunk_index,
                    text=chunk_text,
                    page_number=section.page_number,
                    section_title=section.section_title,
                    token_count=len(current_words),
                    metadata={
                        **base_meta,
                        "section_title": section.section_title,
                        "page_number": section.page_number,
                    },
                ))
                chunk_index += 1

        return chunks
