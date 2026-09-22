"""RAG Service: Formulates diagnostic queries, retrieves official curriculum evidence, and enforces grounding gates."""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.competency import Competency
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.misconception import Misconception
from backend.app.services.retrieval_service import VectorRetrievalService, RetrievedChunk
from backend.app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
from backend.app.core.config import settings


class GroundedContext:
    def __init__(
        self,
        query: str,
        sources: List[RetrievedChunk],
        grounding_status: str,  # "grounded", "weak_grounding", "insufficient_grounding"
        formatted_context: str,
    ):
        self.query = query
        self.sources = sources
        self.grounding_status = grounding_status
        self.formatted_context = formatted_context

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "sources": [s.to_dict() for s in self.sources],
            "grounding_status": self.grounding_status,
            "has_sufficient_grounding": self.grounding_status in ("grounded", "weak_grounding"),
        }


class RAGService:
    def __init__(self, db: Session, retrieval_service: Optional[VectorRetrievalService] = None):
        self.db = db
        self.retrieval = retrieval_service or VectorRetrievalService(db)
        self.kg_repo = KnowledgeGraphRepository(db)

    def build_diagnostic_query(
        self,
        competency: Competency,
        diagnosis: Optional[GapDiagnosis] = None,
        misconception: Optional[Misconception] = None,
    ) -> str:
        """
        Constructs an enriched semantic query by synthesizing:
        - Competency name and description
        - Misconception title, concept, and detection rule (if applicable)
        - Knowledge graph prerequisite concept terms
        """
        parts = [competency.name, competency.description or ""]

        if misconception:
            parts.append(misconception.title)
            parts.append(misconception.concept)
            parts.append(misconception.explanation)

        # Retrieve knowledge graph neighbors
        nodes = self.kg_repo.get_nodes_by_competency_id(competency.id)
        for n in nodes:
            parts.append(n.name)
            prereqs = self.kg_repo.get_prerequisites_for_node(n.id)
            for p in prereqs:
                if p.source_node:
                    parts.append(p.source_node.name)

        if diagnosis and diagnosis.explanation:
            parts.append(diagnosis.explanation)

        query = " ".join(p for p in parts if p).strip()
        # Deduplicate terms while preserving order
        seen = set()
        deduped_words = []
        for word in query.split():
            clean = word.lower().strip(".,()[]{}")
            if clean and clean not in seen:
                seen.add(clean)
                deduped_words.append(word)

        return " ".join(deduped_words[:60])

    def get_grounded_context(
        self,
        query: str,
        top_k: int = 4,
        filters: Optional[Dict[str, Any]] = None,
        grounded_threshold: Optional[float] = None,
        weak_threshold: Optional[float] = None,
    ) -> GroundedContext:
        """
        Retrieves relevant curriculum chunks and deterministically evaluates grounding status.
        Never leaves the grounding decision to the LLM.

        Thresholds are sourced from settings (config.py) — the single authoritative source.
        Callers may override for explicit testing of boundary conditions only.
        """
        # Read from authoritative config; allow explicit override for test stubs only
        _grounded = grounded_threshold if grounded_threshold is not None else settings.RAG_GROUNDED_THRESHOLD
        _weak = weak_threshold if weak_threshold is not None else settings.RAG_WEAK_GROUNDING_THRESHOLD
        chunks = self.retrieval.retrieve(query=query, top_k=top_k, filters=filters)

        if not chunks:
            return GroundedContext(
                query=query,
                sources=[],
                grounding_status="insufficient_grounding",
                formatted_context="[NO OFFICIAL EVIDENCE RETRIEVED - INSUFFICIENT GROUNDING]",
            )

        best_score = max(c.similarity_score for c in chunks)

        if best_score >= _grounded:
            status = "grounded"
        elif best_score >= _weak:
            status = "weak_grounding"
        else:
            status = "insufficient_grounding"

        context_lines: List[str] = []
        for i, chunk in enumerate(chunks, 1):
            source_citation = f"Source [{i}]: {chunk.document_title}"
            if chunk.section:
                source_citation += f" — Section: {chunk.section}"
            if chunk.page_number:
                source_citation += f" (p. {chunk.page_number})"
            source_citation += f" [{chunk.authority}]"

            context_lines.append(f"{source_citation}\n\"{chunk.text}\"\n")

        formatted_context = "\n".join(context_lines)

        return GroundedContext(
            query=query,
            sources=chunks,
            grounding_status=status,
            formatted_context=formatted_context,
        )
