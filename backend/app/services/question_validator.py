"""Question Validation Pipeline: Enforces deterministic quality, structure, and grounding standards."""
import json
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.models.competency import Competency
from backend.app.models.knowledge_graph import CompetencyNode
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk
from backend.app.models.assessment_item import VALID_QUESTION_TYPES


class QuestionValidator:
    @classmethod
    def validate_item_data(
        cls,
        data: Dict[str, Any],
        db: Optional[Session] = None,
    ) -> Tuple[bool, List[str]]:
        """
        Validates candidate assessment item data against strict deterministic standards.
        Returns (is_valid, error_list).
        """
        errors: List[str] = []

        # 1. Required core fields
        for f in ["id", "competency_id", "question_type", "stem", "options", "correct_answer", "explanation"]:
            if f not in data or data[f] is None:
                errors.append(f"Missing required field: '{f}'")

        if errors:
            return False, errors

        # 2. Question type validation
        q_type = data.get("question_type")
        if q_type not in VALID_QUESTION_TYPES:
            errors.append(f"Invalid question_type '{q_type}'. Must be one of {VALID_QUESTION_TYPES}")

        # 3. Stem validation
        stem = str(data.get("stem", "")).strip()
        if len(stem) < 15:
            errors.append("Question stem is too short (< 15 characters)")

        # 4. Options validation
        raw_options = data.get("options")
        if isinstance(raw_options, str):
            try:
                options = json.loads(raw_options)
            except Exception:
                errors.append("Options field must be valid JSON array")
                options = []
        elif isinstance(raw_options, list):
            options = raw_options
        else:
            errors.append("Options must be a list or JSON array string")
            options = []

        if len(options) < 2:
            errors.append("Question must contain at least 2 options")
        elif len(options) > 6:
            errors.append("Question must not exceed 6 options")

        cleaned_options = [str(o).strip() for o in options]
        if any(len(o) == 0 for o in cleaned_options):
            errors.append("Question options must not contain empty strings")

        if len(set(cleaned_options)) < len(cleaned_options):
            errors.append("Question options contain duplicate text")

        # 5. Correct answer index
        try:
            correct_idx = int(data.get("correct_answer"))
            if correct_idx < 0 or correct_idx >= len(options):
                errors.append(f"correct_answer index {correct_idx} out of range for options count {len(options)}")
        except (ValueError, TypeError):
            errors.append("correct_answer must be an integer index")

        # 6. Explanation validation
        explanation = str(data.get("explanation", "")).strip()
        if len(explanation) < 15:
            errors.append("Explanation is missing or too brief (< 15 characters)")

        # 7. Difficulty parameter b bounds
        try:
            b = float(data.get("difficulty_b", 0.0))
            if b < -3.0 or b > 3.0:
                errors.append(f"Difficulty parameter b ({b}) out of permitted range [-3.0, +3.0]")
        except (ValueError, TypeError):
            errors.append("difficulty_b must be a float")

        # 8. Relational database integrity checks (when db session provided)
        if db:
            comp_id = data.get("competency_id")
            comp = db.query(Competency).filter(Competency.id == comp_id).first()
            if not comp:
                errors.append(f"Referenced competency_id '{comp_id}' does not exist in database")

            doc_id = data.get("source_document_id")
            chunk_id = data.get("source_chunk_id")

            if doc_id:
                doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
                if not doc:
                    errors.append(f"Referenced source_document_id '{doc_id}' not found in database")

            if chunk_id:
                chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
                if not chunk:
                    errors.append(f"Referenced source_chunk_id '{chunk_id}' not found in database")
                elif doc_id and chunk.document_id != doc_id:
                    errors.append(f"source_chunk_id '{chunk_id}' does not belong to source_document_id '{doc_id}'")

            concept_ids = data.get("concept_ids", [])
            for cid in concept_ids:
                cnode = db.query(CompetencyNode).filter(CompetencyNode.id == cid).first()
                if not cnode:
                    errors.append(f"Referenced concept_id '{cid}' not found in knowledge graph")

        return len(errors) == 0, errors
