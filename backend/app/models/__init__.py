from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.misconception import Misconception
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk
from backend.app.models.assessment_item import (
    AssessmentItem,
    AssessmentItemConcept,
    AssessmentItemRelationship,
)
from backend.app.models.assessment_session import (
    AssessmentSession,
    AssessmentResponse,
)
from backend.app.models.verification import (
    CompetencyVerification,
    PracticalVerification,
)
from backend.app.models.retention import (
    KnowledgeRetention,
    RefreshRecommendation,
)
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.models.competency_requirement import CompetencyRequirement
from backend.app.models.officer_competency_state import OfficerCompetencyState
from backend.app.models.structured_evidence import StructuredEvidence
from backend.app.models.digital_twin_snapshot import DigitalTwinSnapshot
from backend.app.models.task_readiness import (
    TaskDefinition,
    TaskRequirement,
    TaskReadinessEvaluation,
)
from backend.app.models.training_resource import TrainingResource
from backend.app.models.future_role_requirement import FutureRoleRequirement
from backend.app.models.learning_activity import LearningActivity

__all__ = [
    "Base",
    "User",
    "OfficerProfile",
    "Competency",
    "CompetencyEvidence",
    "CompetencyNode",
    "CompetencyRelationship",
    "Misconception",
    "GapDiagnosis",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "AssessmentItem",
    "AssessmentItemConcept",
    "AssessmentItemRelationship",
    "AssessmentSession",
    "AssessmentResponse",
    "CompetencyVerification",
    "PracticalVerification",
    "KnowledgeRetention",
    "RefreshRecommendation",
    "CompetencyAuditEvent",
    "CompetencyRequirement",
    "OfficerCompetencyState",
    "StructuredEvidence",
    "DigitalTwinSnapshot",
    "TaskDefinition",
    "TaskRequirement",
    "TaskReadinessEvaluation",
    "TrainingResource",
    "FutureRoleRequirement",
    "LearningActivity",
]

