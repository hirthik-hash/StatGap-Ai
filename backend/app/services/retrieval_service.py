"""Vector Retrieval Service: Semantic similarity search with pgvector and metadata filtering."""
import json
import math
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk
from backend.app.services.embedding_service import EmbeddingProvider, get_embedding_provider


class RetrievedChunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        text: str,
        similarity_score: float,
        document_title: str,
        page_number: Optional[int] = None,
        section: Optional[str] = None,
        source: str = "",
        authority: str = "NSSTA",
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.text = text
        self.similarity_score = round(similarity_score, 4)
        self.document_title = document_title
        self.page_number = page_number
        self.section = section
        self.source = source
        self.authority = authority

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "text": self.text,
            "similarity_score": self.similarity_score,
            "document_title": self.document_title,
            "page_number": self.page_number,
            "section": self.section,
            "source": self.source,
            "authority": self.authority,
        }


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class VectorRetrievalService:
    def __init__(self, db: Session, embedding_provider: Optional[EmbeddingProvider] = None):
        self.db = db
        self.embedder = embedding_provider or get_embedding_provider()

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        min_similarity: float = 0.0,
    ) -> List[RetrievedChunk]:
        """
        Performs semantic similarity retrieval for query against stored KnowledgeChunks.
        Uses pgvector on PostgreSQL and in-memory cosine fallback for SQLite testing.
        """
        if not query.strip():
            return []

        query_embedding = self.embedder.embed_text(query)
        dialect_name = self.db.bind.dialect.name if self.db.bind else "sqlite"

        chunks_query = self.db.query(KnowledgeChunk).options(joinedload(KnowledgeChunk.document))

        # Apply basic SQL filters where possible
        if filters:
            if "document_id" in filters:
                chunks_query = chunks_query.filter(KnowledgeChunk.document_id == filters["document_id"])
            if "authority" in filters:
                chunks_query = chunks_query.join(KnowledgeDocument).filter(
                    KnowledgeDocument.authority == filters["authority"]
                )

        if dialect_name == "postgresql":
            # Native PostgreSQL pgvector cosine distance search
            try:
                distance_col = KnowledgeChunk.embedding.cosine_distance(query_embedding).label("distance")
                stmt = (
                    select(KnowledgeChunk, distance_col)
                    .options(joinedload(KnowledgeChunk.document))
                    .order_by("distance")
                    .limit(top_k * 2)
                )
                results = self.db.execute(stmt).all()

                retrieved: List[RetrievedChunk] = []
                for chunk, distance in results:
                    similarity = 1.0 - float(distance)
                    if similarity < min_similarity:
                        continue
                    if self._matches_metadata_filters(chunk, filters):
                        retrieved.append(RetrievedChunk(
                            chunk_id=chunk.id,
                            document_id=chunk.document_id,
                            text=chunk.text,
                            similarity_score=similarity,
                            document_title=chunk.document.title if chunk.document else "Official Document",
                            page_number=chunk.page_number,
                            section=chunk.section_title,
                            source=chunk.document.source if chunk.document else "",
                            authority=chunk.document.authority if chunk.document else "NSSTA",
                        ))
                    if len(retrieved) >= top_k:
                        break
                return retrieved
            except Exception:
                # Fallback to Python cosine calculation if pgvector query fails in edge conditions
                pass

        # Python cosine similarity fallback (universal across SQLite and PostgreSQL)
        all_chunks = chunks_query.all()
        scored_chunks = []

        for chunk in all_chunks:
            if not chunk.embedding:
                continue
            if not self._matches_metadata_filters(chunk, filters):
                continue

            sim = _cosine_similarity(query_embedding, chunk.embedding)
            if sim >= min_similarity:
                scored_chunks.append((sim, chunk))

        # Sort descending by similarity
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:top_k]

        return [
            RetrievedChunk(
                chunk_id=c.id,
                document_id=c.document_id,
                text=c.text,
                similarity_score=s,
                document_title=c.document.title if c.document else "Official Document",
                page_number=c.page_number,
                section=c.section_title,
                source=c.document.source if c.document else "",
                authority=c.document.authority if c.document else "NSSTA",
            )
            for s, c in top_chunks
        ]

    def _matches_metadata_filters(self, chunk: KnowledgeChunk, filters: Optional[Dict[str, Any]]) -> bool:
        if not filters:
            return True

        if "competency_id" in filters:
            target_comp = filters["competency_id"]
            if chunk.chunk_metadata:
                try:
                    meta = json.loads(chunk.chunk_metadata)
                    comp_list = meta.get("competency_ids", [])
                    if comp_list and target_comp not in comp_list:
                        return False
                except Exception:
                    pass

        return True
