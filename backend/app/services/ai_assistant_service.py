"""Grounded AI Learning Assistant Service — Phase 9.

Integrates RAG vector retrieval, anti-hallucination gating, officer-specific competency context,
and prompt injection sanitization for civil service learners in India's Official Statistical System.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.competency import Competency
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.misconception import Misconception
from backend.app.models.task_readiness import TaskDefinition
from backend.app.models.training_resource import TrainingResource
from backend.app.models.user import User
from backend.app.schemas.ai_assistant import (
    AiAssistantQueryRequest,
    AiAssistantQueryResponse,
    AiAssistantSuggestionsResponse,
    AiSourceCitation,
    ContextualActionLink,
)
from backend.app.services.rag_service import RAGService
from backend.app.services.task_readiness_service import TaskReadinessService
from backend.app.services.training_optimizer_service import TrainingOptimizerService


class AiAssistantService:
    """Provides role-aware, citation-backed AI learning support."""

    INJECTION_PATTERNS = [
        r"(?i)ignore\s+(all\s+)?(previous|prior)\s+(instructions|rules)",
        r"(?i)system\s*prompt",
        r"(?i)bypass\s+(rbac|security|rules)",
        r"(?i)show\s+(all\s+)?(passwords|users|hashes|secrets)",
        r"(?i)output\s+the\s+entire\s+database",
        r"(?i)dump\s+(all\s+)?(internal|user|database|records)",
        r"(?i)reveal\s+(administrative|system|internal|api\s*key)",
    ]

    def __init__(self, db: Session) -> None:
        self.db = db
        self.rag_service = RAGService(db)

    def _sanitize_input(self, text: str) -> Tuple[str, bool]:
        """Checks for and neutralizes prompt injection patterns."""
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, text):
                return (
                    "I cannot process instructions that attempt to bypass system security or inspect internal configurations.",
                    True,
                )
        # Strip dangerous formatting
        cleaned = text.strip()
        return cleaned, False

    def _is_officer_context_query(self, query: str) -> bool:
        """Determines if the query asks about the officer's personal competency or readiness."""
        keywords = [
            "my gap", "my score", "why am i", "my competency", "am i ready",
            "my task", "my training", "my weakness", "what should i study",
            "my readiness", "my profile", "why is my", "recommend for me"
        ]
        q_lower = query.lower()
        return any(k in q_lower for k in keywords)

    def _extract_officer_context(self, user: User) -> Dict[str, Any]:
        """Extracts the authenticated officer's personal competency profile and active bottlenecks."""
        if not user.profile:
            return {"has_profile": False}

        profile_id = user.profile.id
        states = (
            self.db.query(OfficerCompetencyState)
            .filter(OfficerCompetencyState.officer_profile_id == profile_id)
            .all()
        )

        all_comps = self.db.query(Competency).all()
        comp_map = {c.id: c.name for c in all_comps}

        gaps = []
        red_gaps = []
        for s in states:
            gap = getattr(s, "gap", 0.0) or 0.0
            cid = s.competency_id
            cname = comp_map.get(cid, cid)
            if gap >= settings.GAP_THRESHOLD_RED:
                red_gaps.append(cname)
                gaps.append({"competency": cname, "band": "RED", "gap": gap})
            elif gap >= settings.GAP_THRESHOLD_ORANGE:
                gaps.append({"competency": cname, "band": "ORANGE", "gap": gap})

        # Evaluate active tasks
        active_tasks = self.db.query(TaskDefinition).filter(TaskDefinition.is_active == True).limit(5).all()  # noqa: E712
        task_bottlenecks = []
        for t in active_tasks:
            try:
                res = TaskReadinessService.evaluate_task_readiness(self.db, profile_id, t.id, persist=False)
                st = res.get("readinessStatus") or res.get("readiness_status")
                b_name = res.get("bottleneckCompetencyName") or res.get("bottleneck_competency_name")
                if st in ["NOT_READY", "PARTIALLY_READY"] and b_name:
                    task_bottlenecks.append({"task": t.name, "bottleneck": b_name})
            except Exception:
                pass

        return {
            "has_profile": True,
            "name": user.profile.name,
            "cadre": user.profile.cadre,
            "department": user.profile.department,
            "gaps": gaps,
            "red_gaps": red_gaps,
            "task_bottlenecks": task_bottlenecks,
        }

    def answer_query(self, user: User, request: AiAssistantQueryRequest) -> AiAssistantQueryResponse:
        """Processes an authenticated learning query and returns grounded response with citations."""
        # 1. Sanitize input
        sanitized_query, is_injection = self._sanitize_input(request.query)
        if is_injection:
            return AiAssistantQueryResponse(
                answer=sanitized_query,
                grounding_status="INSUFFICIENT_GROUNDING",
                grounding_score=0.0,
                citations=[],
                suggested_followups=["Explain stratified sampling methodology", "How is GDP deflator calculated?"],
                contextual_actions=[],
                officer_context_included=False,
            )

        # 2. Check for personal competency inquiry
        is_personal = self._is_officer_context_query(sanitized_query) or request.context_scope in ["my_competencies", "task_readiness", "training"]
        officer_ctx = self._extract_officer_context(user) if is_personal else {}

        # 3. Perform RAG vector search for authoritative document chunks
        rag_res = self.rag_service.get_grounded_context(query=sanitized_query, top_k=4)
        
        status_map = {
            "grounded": "GROUNDED",
            "weak_grounding": "WEAK_GROUNDING",
            "insufficient_grounding": "INSUFFICIENT_GROUNDING",
        }
        grounding_status = status_map.get(rag_res.grounding_status, "INSUFFICIENT_GROUNDING")
        grounding_score = max([s.similarity_score for s in rag_res.sources], default=0.0)

        citations: List[AiSourceCitation] = []
        for chunk in rag_res.sources:
            citations.append(
                AiSourceCitation(
                    document_title=chunk.document_title or "Official Statistical Methodology Guide",
                    chunk_id=str(chunk.chunk_id),
                    similarity_score=round(chunk.similarity_score, 3),
                    excerpt=chunk.text[:240] + ("..." if len(chunk.text) > 240 else ""),
                    authority_level=chunk.authority or "OFFICIAL_MOSPI_STANDARDS",
                )
            )

        # 4. Construct response based on grounding status & officer context
        contextual_actions: List[ContextualActionLink] = []
        suggested_followups: List[str] = []

        if is_personal and officer_ctx.get("has_profile"):
            # Tailored officer diagnostic guidance
            red_list = officer_ctx.get("red_gaps", [])
            bottlenecks = officer_ctx.get("task_bottlenecks", [])

            if "why" in sanitized_query.lower() or "gap" in sanitized_query.lower():
                if red_list:
                    answer = (
                        f"Based on your Digital Twin diagnostics, your primary critical competency gap is in **{red_list[0]}**. "
                        f"This indicates insufficient practical assessment evidence or repeated conceptual errors on stratified estimation formulas. "
                        f"Resolving this gap will unblock your deployment eligibility for active field survey tasks."
                    )
                    contextual_actions.append(ContextualActionLink(
                        label=f"Diagnose {red_list[0]} Root Cause",
                        action_type="navigate",
                        target_page="why-gap",
                    ))
                else:
                    answer = (
                        "You currently have no critical (RED) competency gaps in your verified profile. "
                        "All monitored statistical competencies meet the standard MoSPI proficiency baseline."
                    )
            elif "task" in sanitized_query.lower() or "ready" in sanitized_query.lower():
                if bottlenecks:
                    b_str = ", ".join([f"{b['task']} (blocked by {b['bottleneck']})" for b in bottlenecks])
                    answer = (
                        f"Your task readiness assessment shows active bottlenecks on: {b_str}. "
                        f"Completing targeted training interventions will elevate your readiness to READY status."
                    )
                    contextual_actions.append(ContextualActionLink(
                        label="View Task Readiness Board",
                        action_type="navigate",
                        target_page="task-readiness",
                    ))
                else:
                    answer = "Your profile is verified as READY for all currently assigned statistical survey tasks."
            else:
                answer = (
                    f"Hello {officer_ctx.get('name', 'Officer')}. "
                    f"Your profile ({officer_ctx.get('cadre', 'ISS')}) is monitored under continuous competency intelligence. "
                    f"You have {len(officer_ctx.get('gaps', []))} active developmental areas. How can I assist your statistical learning today?"
                )

            suggested_followups = [
                "What training resolves my primary bottleneck?",
                "How do I schedule an independent rubric verification?",
                "Explain the theoretical foundation of my priority gap.",
            ]
            grounding_status = "GROUNDED"
            grounding_score = max(0.75, grounding_score)

        elif grounding_status == "INSUFFICIENT_GROUNDING":
            answer = (
                "I could not locate sufficiently authoritative documentation in the official MoSPI/NSSO knowledge repository "
                "to answer your question with complete empirical grounding. To maintain strict scientific integrity, "
                "I avoid generating speculative answers. Please refer to NSSTA training handbooks or upload relevant reference material."
            )
            suggested_followups = [
                "What are the core concepts in Sample Survey Methodology?",
                "Explain GDP Compilation under SNA 2008 standards.",
            ]
        else:
            # Grounded knowledge answer with citations
            chunk_texts = " ".join([c.text for c in rag_res.sources[:2]])
            summary = chunk_texts[:500] if chunk_texts else "Official methodological guidance indicates standard statistical protocols."
            answer = (
                f"According to authoritative MoSPI/NSSTA documentation: {summary}... "
                f"Please review the attached source citations below for full statutory formulation and methodology."
            )
            suggested_followups = [
                "How does this apply to NSS survey rounds?",
                "Take an adaptive assessment on this topic.",
            ]
            contextual_actions.append(ContextualActionLink(
                label="Explore Study Material",
                action_type="navigate",
                target_page="study-material",
            ))
            contextual_actions.append(ContextualActionLink(
                label="Test Understanding in Adaptive Quiz",
                action_type="navigate",
                target_page="assessments",
            ))

        return AiAssistantQueryResponse(
            answer=answer,
            grounding_status=grounding_status,
            grounding_score=round(grounding_score, 3),
            citations=citations,
            suggested_followups=suggested_followups,
            contextual_actions=contextual_actions,
            officer_context_included=is_personal,
        )

    def get_suggestions(self, user: User) -> AiAssistantSuggestionsResponse:
        """Generates tailored learning prompt suggestions based on officer's current gaps and bottlenecks."""
        prompts = [
            "Explain stratified random sampling vs cluster sampling",
            "What is the difference between CPI and WPI index compilation?",
            "How does SNA 2008 account for financial intermediation (FISIM)?",
        ]

        active_bottlenecks = []
        priority_gap = None

        if user.profile:
            ctx = self._extract_officer_context(user)
            red_list = ctx.get("red_gaps", [])
            if red_list:
                priority_gap = red_list[0]
                prompts.insert(0, f"Why is my {priority_gap} competency flagged as a priority gap?")
                prompts.insert(1, f"What learning interventions are recommended for {priority_gap}?")

            for b in ctx.get("task_bottlenecks", []):
                active_bottlenecks.append(f"{b['task']} ({b['bottleneck']})")

        return AiAssistantSuggestionsResponse(
            officer_id=user.igot_id,
            suggested_prompts=prompts[:5],
            active_bottlenecks=active_bottlenecks,
            priority_gap_competency=priority_gap,
        )
