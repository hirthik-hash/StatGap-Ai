"""Task Definition seeder for STAT-GAP AI — Phase 6.

Seeds 4 representative operational tasks for India's Official Statistical System,
mapped to the competency catalog from seed_data.py.

These task definitions represent realistic work roles in MoSPI / NSO / State DES.
They are used for:
  - Task Readiness evaluation
  - What-If simulation
  - Automated test fixtures

IMPORTANT: This is synthetic seed data for architectural demonstration.
Actual civil service task requirements must be defined by HR/training authorities.
"""
import os
import sys
from sqlalchemy.orm import Session

# Ensure workspace root is in sys.path
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(workspace_root, ".env"))
load_dotenv(os.path.join(workspace_root, "backend", ".env"))

from backend.app.models.task_readiness import TaskDefinition, TaskRequirement


# ---------------------------------------------------------------------------
# Task Definition Seed Data
# ---------------------------------------------------------------------------
SEED_TASKS = [
    {
        "id": "task_survey_design",
        "name": "Sample Survey Design & Coordination",
        "description": (
            "Design, plan, and coordinate a multi-stage sample survey (e.g., NSS/PLFS round). "
            "Requires statistical sampling proficiency, questionnaire design, and field protocol management."
        ),
        "category": "Field Operations",
        "cadre_applicable": "ISS",
        "requirements": [
            {"competency_id": "comp_stat_analysis",    "required_level": 0.75, "is_critical": True,  "notes": "Core statistical rigor for sampling design"},
            {"competency_id": "comp_survey_methods",   "required_level": 0.80, "is_critical": True,  "notes": "Primary competency for survey design"},
            {"competency_id": "comp_data_quality",     "required_level": 0.70, "is_critical": True,  "notes": "Ensures data collection quality standards"},
            {"competency_id": "comp_official_stats",   "required_level": 0.65, "is_critical": False, "notes": "Contextual understanding of official stat system"},
        ],
    },
    {
        "id": "task_national_accounts",
        "name": "National Account Compilation",
        "description": (
            "Compile GDP and sector-level National Account estimates per CSO/NAD methodology. "
            "Requires macroeconomic statistics knowledge, data reconciliation, and official reporting."
        ),
        "category": "National Accounts",
        "cadre_applicable": "ISS",
        "requirements": [
            {"competency_id": "comp_stat_analysis",  "required_level": 0.80, "is_critical": True,  "notes": "Quantitative analysis of national data"},
            {"competency_id": "comp_economic_stats", "required_level": 0.85, "is_critical": True,  "notes": "Primary competency for national accounts"},
            {"competency_id": "comp_data_quality",   "required_level": 0.75, "is_critical": True,  "notes": "Data validation and reconciliation"},
            {"competency_id": "comp_official_stats", "required_level": 0.70, "is_critical": False, "notes": "Statutory reporting context"},
        ],
    },
    {
        "id": "task_data_quality_audit",
        "name": "State-Level Data Quality Audit",
        "description": (
            "Conduct an independent data quality audit for state statistical offices. "
            "Review collection instruments, data entry, validation, and reporting accuracy."
        ),
        "category": "Quality Assurance",
        "cadre_applicable": "ISS",
        "requirements": [
            {"competency_id": "comp_data_quality",    "required_level": 0.85, "is_critical": True,  "notes": "Primary competency for quality audits"},
            {"competency_id": "comp_stat_analysis",   "required_level": 0.70, "is_critical": True,  "notes": "Statistical checks on collected data"},
            {"competency_id": "comp_official_stats",  "required_level": 0.75, "is_critical": False, "notes": "Context of official statistical reporting"},
        ],
    },
    {
        "id": "task_statistical_report",
        "name": "Statistical Report Authoring (Annual Publication)",
        "description": (
            "Author an official statistical report for publication (e.g., District Fact Sheet, "
            "State Statistical Abstract). Requires data visualization, interpretation, and official writing standards."
        ),
        "category": "Reporting & Dissemination",
        "cadre_applicable": "ISS",
        "requirements": [
            {"competency_id": "comp_stat_analysis",    "required_level": 0.70, "is_critical": True,  "notes": "Analytical rigor for reported statistics"},
            {"competency_id": "comp_data_quality",     "required_level": 0.65, "is_critical": True,  "notes": "Accuracy of disseminated statistics"},
            {"competency_id": "comp_official_stats",   "required_level": 0.70, "is_critical": True,  "notes": "Understanding of publication standards"},
        ],
    },
]


def seed_task_definitions(db: Session, skip_existing: bool = True) -> int:
    """Seeds task definitions and their requirements.

    Args:
        db:             Active SQLAlchemy session.
        skip_existing:  If True, skips tasks that already exist by ID.

    Returns:
        Number of tasks actually inserted.
    """
    inserted = 0
    for task_data in SEED_TASKS:
        existing = db.query(TaskDefinition).filter(TaskDefinition.id == task_data["id"]).first()
        if existing and skip_existing:
            continue

        task = TaskDefinition(
            id=task_data["id"],
            name=task_data["name"],
            description=task_data["description"],
            category=task_data["category"],
            cadre_applicable=task_data.get("cadre_applicable"),
            is_active=True,
        )
        db.add(task)
        db.flush()

        for req_data in task_data["requirements"]:
            req = TaskRequirement(
                task_id=task.id,
                competency_id=req_data["competency_id"],
                required_level=req_data["required_level"],
                is_critical=req_data["is_critical"],
                notes=req_data.get("notes"),
            )
            db.add(req)

        inserted += 1

    db.commit()
    return inserted


if __name__ == "__main__":
    from backend.app.core.database import SessionLocal

    db = SessionLocal()
    try:
        count = seed_task_definitions(db)
        print(f"Task definitions seeded: {count} tasks inserted.")
    finally:
        db.close()
