"""Document Ingestion Service: Orchestrates extraction, chunking, embedding, and storage."""
import os
import json
import hashlib
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk
from backend.app.ingestion.metadata import DocumentMetadata
from backend.app.ingestion.text_extractor import TextExtractor
from backend.app.ingestion.chunker import StatisticalDocumentChunker
from backend.app.services.embedding_service import EmbeddingProvider, get_embedding_provider


class DocumentIngestionService:
    def __init__(self, db: Session, embedding_provider: Optional[EmbeddingProvider] = None):
        self.db = db
        self.embedder = embedding_provider or get_embedding_provider()
        self.chunker = StatisticalDocumentChunker(target_chunk_words=140, overlap_words=25)

    def ingest_file(
        self,
        file_path: str,
        title: Optional[str] = None,
        source: Optional[str] = None,
        authority: str = "NSSTA",
        competency_ids: Optional[List[str]] = None,
        version: Optional[str] = "1.0",
        description: Optional[str] = None,
    ) -> KnowledgeDocument:
        """
        Parses, extracts, chunks, embeds, and indexes a document file.
        Deduplicates based on SHA-256 file content checksum.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        doc_title = title or os.path.splitext(filename)[0].replace("_", " ").title()
        doc_source = source or f"Official Curriculum: {authority}"

        # Calculate file checksum
        with open(file_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # Check deduplication
        existing_doc = self.db.query(KnowledgeDocument).filter(KnowledgeDocument.checksum == checksum).first()
        if existing_doc:
            return existing_doc

        doc_id = f"doc_{checksum[:12]}"
        new_doc = KnowledgeDocument(
            id=doc_id,
            title=doc_title,
            filename=filename,
            document_type=ext,
            source=doc_source,
            source_url=None,
            version=version,
            authority=authority,
            description=description,
            checksum=checksum,
            status="processing",
        )
        self.db.add(new_doc)
        self.db.flush()

        try:
            # 1. Extract structural sections
            sections = TextExtractor.extract_from_file(file_path)

            # 2. Chunk sections
            base_meta = {
                "competency_ids": competency_ids or [],
                "authority": authority,
                "document_title": doc_title,
            }
            doc_chunks = self.chunker.chunk_sections(doc_id, sections, base_metadata=base_meta)

            if not doc_chunks:
                new_doc.status = "indexed"
                self.db.commit()
                return new_doc

            # 3. Generate embeddings
            texts_to_embed = [c.text for c in doc_chunks]
            embeddings = self.embedder.embed_chunks(texts_to_embed)

            # 4. Save chunks
            for i, chunk_data in enumerate(doc_chunks):
                chunk_id = f"chk_{doc_id}_{chunk_data.chunk_index}"
                chunk_obj = KnowledgeChunk(
                    id=chunk_id,
                    document_id=doc_id,
                    chunk_index=chunk_data.chunk_index,
                    text=chunk_data.text,
                    page_number=chunk_data.page_number,
                    section_title=chunk_data.section_title,
                    token_count=chunk_data.token_count,
                    chunk_metadata=json.dumps(chunk_data.metadata),
                    embedding=embeddings[i],
                )
                self.db.add(chunk_obj)

            new_doc.status = "indexed"
            self.db.commit()
            self.db.refresh(new_doc)
            return new_doc

        except Exception as e:
            self.db.rollback()
            new_doc.status = "failed"
            self.db.commit()
            raise RuntimeError(f"Document ingestion failed for {filename}: {str(e)}") from e
