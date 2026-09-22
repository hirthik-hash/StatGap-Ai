"""Adaptive Assessment Engine and IRT Question Bank Schema

Revision ID: 004_adaptive_assessment
Revises: 003_rag_and_ai
Create Date: 2026-09-08 20:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_adaptive_assessment'
down_revision: Union[str, None] = '003_rag_and_ai'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create assessment_items table
    op.create_table(
        'assessment_items',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('competency_id', sa.String(length=64), nullable=False),
        sa.Column('question_type', sa.String(length=32), nullable=False),
        sa.Column('stem', sa.Text(), nullable=False),
        sa.Column('options', sa.Text(), nullable=False),
        sa.Column('correct_answer', sa.Integer(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('difficulty_b', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('discrimination_a', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('guessing_c', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('cognitive_level', sa.String(length=32), nullable=False, server_default='application'),
        sa.Column('source_document_id', sa.String(length=64), nullable=True),
        sa.Column('source_chunk_id', sa.String(length=64), nullable=True),
        sa.Column('misconception_id', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='validated'),
        sa.Column('review_status', sa.String(length=32), nullable=False, server_default='unreviewed'),
        sa.Column('reviewed_by', sa.String(length=64), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_document_id'], ['knowledge_documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_chunk_id'], ['knowledge_chunks.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['misconception_id'], ['misconceptions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "question_type IN ('single_concept', 'misconception_probe', 'application', 'integrated_concept')",
            name='valid_question_type_check',
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'validated', 'review_required', 'retired')",
            name='valid_item_status_check',
        ),
    )
    op.create_index(op.f('ix_assessment_items_id'), 'assessment_items', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_items_competency_id'), 'assessment_items', ['competency_id'], unique=False)

    # 2. Create assessment_item_concepts table
    op.create_table(
        'assessment_item_concepts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('item_id', sa.String(length=64), nullable=False),
        sa.Column('concept_id', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='primary'),
        sa.ForeignKeyConstraint(['item_id'], ['assessment_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['concept_id'], ['competency_nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessment_item_concepts_id'), 'assessment_item_concepts', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_item_concepts_item_id'), 'assessment_item_concepts', ['item_id'], unique=False)

    # 3. Create assessment_item_relationships table
    op.create_table(
        'assessment_item_relationships',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('item_id', sa.String(length=64), nullable=False),
        sa.Column('relationship_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['item_id'], ['assessment_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['relationship_id'], ['competency_relationships.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assessment_item_relationships_id'), 'assessment_item_relationships', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_item_relationships_item_id'), 'assessment_item_relationships', ['item_id'], unique=False)

    # 4. Create assessment_sessions table
    op.create_table(
        'assessment_sessions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), nullable=False),
        sa.Column('target_competency_id', sa.String(length=64), nullable=False),
        sa.Column('diagnosis_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=32), server_default='active', nullable=False),
        sa.Column('initial_theta', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('current_theta', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('standard_error', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('items_answered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('current_assigned_item_id', sa.String(length=64), nullable=True),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('stopping_reason', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['officer_profile_id'], ['officer_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_competency_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['diagnosis_id'], ['gap_diagnoses.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['current_assigned_item_id'], ['assessment_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('active', 'completed', 'abandoned')", name='valid_session_status_check'),
    )
    op.create_index(op.f('ix_assessment_sessions_id'), 'assessment_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_sessions_officer_profile_id'), 'assessment_sessions', ['officer_profile_id'], unique=False)
    op.create_index(op.f('ix_assessment_sessions_target_competency_id'), 'assessment_sessions', ['target_competency_id'], unique=False)

    # 5. Create assessment_responses table
    op.create_table(
        'assessment_responses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('item_id', sa.String(length=64), nullable=False),
        sa.Column('selected_answer', sa.Integer(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('confidence', sa.String(length=32), server_default='Medium', nullable=False),
        sa.Column('response_time_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('theta_before', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('theta_after', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('information', sa.Float(), server_default='0.25', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['assessment_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id', 'item_id', name='uq_session_item_response'),
    )
    op.create_index(op.f('ix_assessment_responses_id'), 'assessment_responses', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_responses_session_id'), 'assessment_responses', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_assessment_responses_session_id'), table_name='assessment_responses')
    op.drop_index(op.f('ix_assessment_responses_id'), table_name='assessment_responses')
    op.drop_table('assessment_responses')

    op.drop_index(op.f('ix_assessment_sessions_target_competency_id'), table_name='assessment_sessions')
    op.drop_index(op.f('ix_assessment_sessions_officer_profile_id'), table_name='assessment_sessions')
    op.drop_index(op.f('ix_assessment_sessions_id'), table_name='assessment_sessions')
    op.drop_table('assessment_sessions')

    op.drop_index(op.f('ix_assessment_item_relationships_item_id'), table_name='assessment_item_relationships')
    op.drop_index(op.f('ix_assessment_item_relationships_id'), table_name='assessment_item_relationships')
    op.drop_table('assessment_item_relationships')

    op.drop_index(op.f('ix_assessment_item_concepts_item_id'), table_name='assessment_item_concepts')
    op.drop_index(op.f('ix_assessment_item_concepts_id'), table_name='assessment_item_concepts')
    op.drop_table('assessment_item_concepts')

    op.drop_index(op.f('ix_assessment_items_competency_id'), table_name='assessment_items')
    op.drop_index(op.f('ix_assessment_items_id'), table_name='assessment_items')
    op.drop_table('assessment_items')
