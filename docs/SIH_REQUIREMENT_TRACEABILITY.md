# STAT-GAP AI — SIH Problem Statement Requirement Traceability Matrix

**Project:** STAT-GAP AI (Ministry of Statistics and Programme Implementation — MoSPI)  
**Document Version:** 1.0.0 (Phase 9 Full Closure)  
**Evaluation Standard:** Smart India Hackathon (SIH) — National Statistical System Competency Intelligence  

---

## 1. Executive Summary & Verification Matrix

STAT-GAP AI closes all 25 functional, pedagogical, computational, and administrative requirements specified under the MoSPI Statistical Capacity Building problem statement. Every requirement is traceable to verified backend code, database models, frontend interfaces, and automated pytest suites.

```
Total Requirements: 25 | Fully Closed: 25 | Partial/Deferred: 0 | Fabricated Claims: 0
```

---

## 2. Requirement-by-Requirement Traceability

| Req # | Problem Statement Requirement | Core Architecture Component | Code Implementation Links | Verification / Test Suite | Status |
|---|---|---|---|---|---|
| **REQ-01** | Role-based Competency Modeling (NSSTA/MoSPI) | Preserved 4-Factor Weighted Model & Ontology | [`backend/app/models/competency.py`](file:///d:/StatGap%20Ai/backend/app/models/competency.py), [`backend/app/services/competency_service.py`](file:///d:/StatGap%20Ai/backend/app/services/competency_service.py) | `test_phase3_competency_intelligence.py` | **CLOSED** |
| **REQ-02** | Multi-Source Evidence Ingestion | Structured & Legacy Evidence Models | [`backend/app/models/structured_evidence.py`](file:///d:/StatGap%20Ai/backend/app/models/structured_evidence.py), [`backend/app/services/evidence_service.py`](file:///d:/StatGap%20Ai/backend/app/services/evidence_service.py) | `test_phase2_postgres_auth_rbac.py` | **CLOSED** |
| **REQ-03** | Dynamic Competency Digital Twin | Mathematical State & Snapshot Tracking | [`backend/app/models/officer_competency_state.py`](file:///d:/StatGap%20Ai/backend/app/models/officer_competency_state.py), [`backend/app/services/digital_twin_service.py`](file:///d:/StatGap%20Ai/backend/app/services/digital_twin_service.py) | `test_phase3_competency_intelligence.py` | **CLOSED** |
| **REQ-04** | Bayesian Knowledge Tracing (BKT) | Multi-Opportunity Hidden Markov Parameter Engine | [`backend/app/services/bkt_service.py`](file:///d:/StatGap%20Ai/backend/app/services/bkt_service.py) | `test_phase5_bkt.py` | **CLOSED** |
| **REQ-05** | Adaptive 1PL / Rasch Item Response Theory (IRT) | Item Difficulty ($b$) & Real-Time Ability ($\theta$) | [`backend/app/services/irt_service.py`](file:///d:/StatGap%20Ai/backend/app/services/irt_service.py), [`backend/app/services/assessment_service.py`](file:///d:/StatGap%20Ai/backend/app/services/assessment_service.py) | `test_adaptive_assessment.py` | **CLOSED** |
| **REQ-06** | Explainable WHY-GAP Root Cause Diagnosis | Distractor Analysis & Cognitive Misconception DB | [`backend/app/models/misconception.py`](file:///d:/StatGap%20Ai/backend/app/models/misconception.py), [`backend/app/services/why_gap_service.py`](file:///d:/StatGap%20Ai/backend/app/services/why_gap_service.py) | `test_diagnostics_and_graph.py` | **CLOSED** |
| **REQ-07** | Responsible RAG Vector Retrieval | ChromaDB / Vector Search with Chunk Citations | [`backend/app/services/retrieval_service.py`](file:///d:/StatGap%20Ai/backend/app/services/retrieval_service.py), [`backend/app/services/rag_service.py`](file:///d:/StatGap%20Ai/backend/app/services/rag_service.py) | `test_rag_and_ai.py` | **CLOSED** |
| **REQ-08** | Deterministic Anti-Hallucination Gating | Phase 4 Grounding Thresholds ($\ge 0.65$ Grounded, $0.48-0.65$ Weak, $<0.48$ Refusal) | [`backend/app/core/config.py`](file:///d:/StatGap%20Ai/backend/app/core/config.py), [`backend/app/services/rag_service.py`](file:///d:/StatGap%20Ai/backend/app/services/rag_service.py) | `test_rag_and_ai.py` | **CLOSED** |
| **REQ-09** | Knowledge Graph Prerequisite Traversal | Directed Competency Graph & Dependency Checks | [`backend/app/repositories/competency_graph_repository.py`](file:///d:/StatGap%20Ai/backend/app/repositories/competency_graph_repository.py) | `test_diagnostics_and_graph.py` | **CLOSED** |
| **REQ-10** | Independent Competency Verification | Multi-Evidence Verification & Rubrics | [`backend/app/models/competency_verification.py`](file:///d:/StatGap%20Ai/backend/app/models/competency_verification.py), [`backend/app/services/verification_service.py`](file:///d:/StatGap%20Ai/backend/app/services/verification_service.py) | `test_verification_and_retention.py` | **CLOSED** |
| **REQ-11** | Knowledge Retention Decay (Ebbinghaus) | Longitudinal Retention Curves & Spaced Alerts | [`backend/app/models/knowledge_retention.py`](file:///d:/StatGap%20Ai/backend/app/models/knowledge_retention.py), [`backend/app/services/retention_decay_service.py`](file:///d:/StatGap%20Ai/backend/app/services/retention_decay_service.py) | `test_verification_and_retention.py` | **CLOSED** |
| **REQ-12** | Survey Task Readiness Evaluator | PLFS, ASI, CPI, and Field Operations Eligibility | [`backend/app/models/task_readiness.py`](file:///d:/StatGap%20Ai/backend/app/models/task_readiness.py), [`backend/app/services/task_readiness_service.py`](file:///d:/StatGap%20Ai/backend/app/services/task_readiness_service.py) | `test_phase6_task_readiness.py` | **CLOSED** |
| **REQ-13** | What-If Simulation Engine | Pre/Post Intervention Mathematical Estimation | [`backend/app/services/digital_twin_service.py`](file:///d:/StatGap%20Ai/backend/app/services/digital_twin_service.py#L324) | `test_phase6_task_readiness.py` | **CLOSED** |
| **REQ-14** | iGOT Karmayogi Adapter Layer | Mock & Production Adapter with Sync Engine | [`backend/app/integrations/training/igot_adapter.py`](file:///d:/StatGap%20Ai/backend/app/integrations/training/igot_adapter.py), [`backend/app/services/training_sync_service.py`](file:///d:/StatGap%20Ai/backend/app/services/training_sync_service.py) | `test_phase7_training_interventions.py` | **CLOSED** |
| **REQ-15** | NSSTA Academy Integration | Residential/Workshop Programme Scheduling | [`backend/app/integrations/training/nssta_adapter.py`](file:///d:/StatGap%20Ai/backend/app/integrations/training/nssta_adapter.py) | `test_phase7_training_interventions.py` | **CLOSED** |
| **REQ-16** | TPAC Syllabus Calibration | Training Programme Advisory Committee Syllabus | [`backend/app/integrations/training/tpac_adapter.py`](file:///d:/StatGap%20Ai/backend/app/integrations/training/tpac_adapter.py) | `test_phase7_training_interventions.py` | **CLOSED** |
| **REQ-17** | Training Intervention Optimizer | Multi-Constraint Knapsack Allocation (Hours/Budget) | [`backend/app/services/training_optimizer_service.py`](file:///d:/StatGap%20Ai/backend/app/services/training_optimizer_service.py) | `test_phase7_training_interventions.py` | **CLOSED** |
| **REQ-18** | Cadre Competency Heatmaps | SSO, JSO, ISS, Director Cadre Analytics | [`backend/app/services/workforce_analytics_service.py`](file:///d:/StatGap%20Ai/backend/app/services/workforce_analytics_service.py) | `test_phase8_admin_analytics.py` | **CLOSED** |
| **REQ-19** | Supervisor Oversight & Team Bottlenecks | FOD / Regional Office Team Readiness Scrutiny | [`backend/app/api/routes/admin.py`](file:///d:/StatGap%20Ai/backend/app/api/routes/admin.py) | `test_phase8_admin_analytics.py` | **CLOSED** |
| **REQ-20** | Future Role & Emerging Skill Benchmarking | JSO $\rightarrow$ SSO $\rightarrow$ Director Competency Deltas | [`backend/app/models/future_role_requirement.py`](file:///d:/StatGap%20Ai/backend/app/models/future_role_requirement.py), [`backend/app/services/career_planning_service.py`](file:///d:/StatGap%20Ai/backend/app/services/career_planning_service.py) | `test_phase9_system_integration.py` | **CLOSED** |
| **REQ-21** | Grounded AI Learning Assistant | Role-Aware, Citation-Backed RAG Chatbot | [`backend/app/services/ai_assistant_service.py`](file:///d:/StatGap%20Ai/backend/app/services/ai_assistant_service.py), [`src/components/common/AiAssistantDrawer.tsx`](file:///d:/StatGap%20Ai/src/components/common/AiAssistantDrawer.tsx) | `test_phase9_system_integration.py` | **CLOSED** |
| **REQ-22** | Multi-Format Learning Material Ingestion | PDF, DOCX, PPTX, Text, and Video Transcripts | [`backend/app/integrations/learning_material/`](file:///d:/StatGap%20Ai/backend/app/integrations/learning_material/) | `test_phase9_system_integration.py` | **CLOSED** |
| **REQ-23** | Interactive Learning & Virtual Lab Activities | Hands-on Statistical Exercise & Simulation Interface | [`backend/app/models/learning_activity.py`](file:///d:/StatGap%20Ai/backend/app/models/learning_activity.py) | `test_phase9_system_integration.py` | **CLOSED** |
| **REQ-24** | Multilingual Readiness Architecture | English & Hindi (Rajbhasha) + Regional Metadata | [`backend/app/schemas/multilingual.py`](file:///d:/StatGap%20Ai/backend/app/schemas/multilingual.py) | `test_phase9_system_integration.py` | **CLOSED** |
| **REQ-25** | Government SSO Safe Fallback | Parichay / MeriPehchaan with `NOT_CONFIGURED` Boundary | [`backend/app/integrations/sso/gov_sso_adapter.py`](file:///d:/StatGap%20Ai/backend/app/integrations/sso/gov_sso_adapter.py) | `test_phase9_system_integration.py` | **CLOSED** |

---

## 3. Scientific & Administrative Honesty Principles

1. **No Fabricated Machine Learning Predictions:** Future career progressions and what-if simulations are clearly stamped as institutional benchmarks and mathematical models, never misrepresented as infallible ML forecasts or promotion guarantees.
2. **Deterministic Anti-Hallucination:** Inquiries below the calibrated similarity threshold ($<0.48$) result in explicit refusal and guidance to official manuals, eliminating AI hallucination risks.
3. **Transparent Mock / Real Boundaries:** External government systems (iGOT, Parichay SSO, NSSTA) implement strict adapter boundaries that report `NOT_CONFIGURED` when production credentials are absent.
