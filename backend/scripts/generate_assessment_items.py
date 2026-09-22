"""Assessment Item Generation Pipeline using Grounded RAG + Gemini with Strict Validation."""
import os
import json
import argparse
from typing import Optional, Dict, Any, List

from backend.app.core.database import SessionLocal
from backend.app.models.competency import Competency
from backend.app.models.assessment_item import AssessmentItem, AssessmentItemConcept
from backend.app.services.rag_service import RAGService
from backend.app.services.llm_service import get_llm_provider
from backend.app.services.question_validator import QuestionValidator


ITEM_GEN_PROMPT = """You are an expert psychometrician and official statistical curriculum specialist for the Indian Statistical Service (ISS / MoSPI / NSSTA).

Based strictly on the provided verified curriculum context, generate a single multiple-choice assessment item.

COMPETENCY: {competency_name}
TARGET QUESTION TYPE: {question_type}
DESIRED DIFFICULTY LEVEL: {difficulty_level}

VERIFIED OFFICIAL CURRICULUM CONTEXT:
{curriculum_context}

RULES:
1. Ground the stem, all 4 options, and explanation strictly on facts in the curriculum context.
2. DO NOT hallucinate formulas or administrative rules.
3. For 'misconception_probe', craft an attractive distractor reflecting an empirical fallacy.
4. For 'integrated_concept', require connecting two distinct concepts from the text.
5. Provide difficulty parameter b between -2.5 (very easy) and +2.5 (advanced).
"""


def generate_item_for_competency(
    competency_id: str,
    question_type: str = "single_concept",
    difficulty_level: str = "moderate",
    db=None,
) -> Optional[AssessmentItem]:
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        comp = db.query(Competency).filter(Competency.id == competency_id).first()
        if not comp:
            print(f"Competency {competency_id} not found.")
            return None

        rag = RAGService(db)
        query = f"{comp.name} {question_type} principles definitions official methodology"
        grounded_context = rag.get_grounded_context(query, top_k=3)

        if grounded_context.grounding_status == "insufficient_grounding":
            print(f"Cannot generate item: Insufficient curriculum grounding for {comp.name}.")
            return None

        prompt = ITEM_GEN_PROMPT.format(
            competency_name=comp.name,
            question_type=question_type,
            difficulty_level=difficulty_level,
            curriculum_context=grounded_context.formatted_context,
        )

        schema_desc = """{
  "stem": "Question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 0,
  "explanation": "Detailed explanation of correct answer and distractors",
  "difficulty_b": 0.5,
  "cognitive_level": "recall | comprehension | application | analysis | synthesis"
}"""

        provider = get_llm_provider()
        raw_res = provider.generate_json(prompt, schema_desc)

        item_id = f"gen_item_{os.urandom(6).hex()}"
        item_data = {
            "id": item_id,
            "competency_id": comp.id,
            "question_type": question_type,
            "stem": raw_res.get("stem", "Sample statistical question stem?"),
            "options": raw_res.get("options", ["A", "B", "C", "D"]),
            "correct_answer": int(raw_res.get("correct_answer", 0)),
            "explanation": raw_res.get("explanation", "Standard statistical methodology explanation."),
            "difficulty_b": float(raw_res.get("difficulty_b", 0.0)),
            "cognitive_level": raw_res.get("cognitive_level", "application"),
            "source_document_id": grounded_context.sources[0].document_id if grounded_context.sources else None,
            "source_chunk_id": grounded_context.sources[0].chunk_id if grounded_context.sources else None,
        }

        # Run deterministic validation
        is_valid, errors = QuestionValidator.validate_item_data(item_data, db=db)
        item_status = "validated" if is_valid else "review_required"

        new_item = AssessmentItem(
            id=item_data["id"],
            competency_id=item_data["competency_id"],
            question_type=item_data["question_type"],
            stem=item_data["stem"],
            options=json.dumps(item_data["options"]),
            correct_answer=item_data["correct_answer"],
            explanation=item_data["explanation"],
            difficulty_b=item_data["difficulty_b"],
            cognitive_level=item_data["cognitive_level"],
            source_document_id=item_data["source_document_id"],
            source_chunk_id=item_data["source_chunk_id"],
            status=item_status,
            review_status="unreviewed",
            review_notes="Auto-generated via RAG + Gemini pipeline; passed deterministic validation." if is_valid else f"Validation warnings: {errors}",
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        print(f"Generated item '{new_item.id}' (Status: {new_item.status}, Difficulty b: {new_item.difficulty_b}).")
        return new_item
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate grounded assessment items")
    parser.add_argument("--competency", default="comp_stat_analysis", help="Target competency ID")
    parser.add_argument("--type", default="single_concept", choices=["single_concept", "misconception_probe", "application", "integrated_concept"])
    parser.add_argument("--difficulty", default="moderate", choices=["easy", "moderate", "difficult"])
    args = parser.parse_args()

    generate_item_for_competency(args.competency, args.type, args.difficulty)
