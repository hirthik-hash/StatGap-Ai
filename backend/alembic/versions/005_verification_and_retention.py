"""Independent Verification, Knowledge Decay, and Refresh Recommendations Schema

Revision ID: 005_verification_and_retention
Revises: 004_adaptive_assessment
Create Date: 2026-09-08 21:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '005_verification_and_retention'
down_revision: Union[str, None] = '004_adaptive_assessment'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add requires_practical_verification to competencies
    op.add_column(
        'competencies',
        sa.Column('requires_practical_verification', sa.Boolean(), server_default='false', nullable=False)
    )

    # 2. Add assessment_purpose to assessment_sessions
    op.add_column(
        'assessment_sessions',
        sa.Column('assessment_purpose', sa.String(length=30), server_default='initial', nullable=False)
    )
    op.create_check_constraint(
        'ck_assessment_purpose',
        'assessment_sessions',
        "assessment_purpose IN ('initial', 'verification', 'refresh_reassessment')"
    )

    # 3. Create competency_verifications table
    op.create_table(
        'competency_verifications',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('officer_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('verification_status', sa.String(length=30), nullable=False, server_default='unverified'),
        sa.Column('independent_score', sa.Float(), nullable=True),
        sa.Column('practical_score', sa.Float(), nullable=True),
        sa.Column('composite_score', sa.Float(), nullable=True),
        sa.Column('assessment_session_id', sa.String(length=64), sa.ForeignKey('assessment_sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criteria_details', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('verification_notes', sa.Text(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "verification_status IN ('unverified', 'in_progress', 'verified', 'failed', 'expired', 'revoked')",
            name='ck_competency_verification_status'
        )
    )
    op.create_index('ix_competency_verifications_officer_id', 'competency_verifications', ['officer_id'])
    op.create_index('ix_competency_verifications_competency_id', 'competency_verifications', ['competency_id'])
    op.create_index('ix_competency_verifications_status', 'competency_verifications', ['verification_status'])

    # 4. Create practical_verifications table
    op.create_table(
        'practical_verifications',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('officer_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('practical_type', sa.String(length=50), nullable=False, server_default='practical_exercise'),
        sa.Column('practical_score', sa.Float(), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('evaluator_notes', sa.Text(), nullable=True),
        sa.Column('evidence_data', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('verified_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "practical_type IN ('dataset_audit', 'field_survey_audit', 'code_review', 'practical_exercise')",
            name='ck_practical_type'
        )
    )
    op.create_index('ix_practical_verifications_officer_id', 'practical_verifications', ['officer_id'])
    op.create_index('ix_practical_verifications_competency_id', 'practical_verifications', ['competency_id'])

    # 5. Create knowledge_retention table
    op.create_table(
        'knowledge_retention',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('officer_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('baseline_retention', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('stability_days', sa.Float(), nullable=False),
        sa.Column('calculated_retention', sa.Float(), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=False, server_default='low'),
        sa.Column('last_evaluated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('days_since_last_interaction', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('decay_parameters', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "risk_level IN ('low', 'moderate', 'at_risk', 'critical')",
            name='ck_retention_risk_level'
        )
    )
    op.create_index('ix_knowledge_retention_officer_id', 'knowledge_retention', ['officer_id'])
    op.create_index('ix_knowledge_retention_competency_id', 'knowledge_retention', ['competency_id'])
    op.create_index('ix_knowledge_retention_risk_level', 'knowledge_retention', ['risk_level'])

    # 6. Create refresh_recommendations table
    op.create_table(
        'refresh_recommendations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('officer_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trigger_reason', sa.String(length=50), nullable=False, server_default='retention_decay'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('recommended_modules', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('reassessment_session_id', sa.String(length=64), sa.ForeignKey('assessment_sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name='ck_refresh_recommendation_priority'
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'dismissed')",
            name='ck_refresh_recommendation_status'
        )
    )
    op.create_index('ix_refresh_recommendations_officer_id', 'refresh_recommendations', ['officer_id'])
    op.create_index('ix_refresh_recommendations_competency_id', 'refresh_recommendations', ['competency_id'])
    op.create_index('ix_refresh_recommendations_priority', 'refresh_recommendations', ['priority'])
    op.create_index('ix_refresh_recommendations_status', 'refresh_recommendations', ['status'])

    # 7. Create competency_audit_events table
    op.create_table(
        'competency_audit_events',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('officer_id', sa.Integer(), sa.ForeignKey('officer_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('competency_id', sa.String(length=64), sa.ForeignKey('competencies.id', ondelete='CASCADE'), nullable=True),
        sa.Column('event_type', sa.String(length=60), nullable=False),
        sa.Column('actor', sa.String(length=50), nullable=False, server_default='system'),
        sa.Column('event_data', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_competency_audit_events_officer_id', 'competency_audit_events', ['officer_id'])
    op.create_index('ix_competency_audit_events_competency_id', 'competency_audit_events', ['competency_id'])
    op.create_index('ix_competency_audit_events_event_type', 'competency_audit_events', ['event_type'])
    op.create_index('ix_competency_audit_events_timestamp', 'competency_audit_events', ['timestamp'])


def downgrade() -> None:
    op.drop_table('competency_audit_events')
    op.drop_table('refresh_recommendations')
    op.drop_table('knowledge_retention')
    op.drop_table('practical_verifications')
    op.drop_table('competency_verifications')
    op.drop_constraint('ck_assessment_purpose', 'assessment_sessions', type_='check')
    op.drop_column('assessment_sessions', 'assessment_purpose')
    op.drop_column('competencies', 'requires_practical_verification')
