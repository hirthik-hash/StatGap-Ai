"""Knowledge Graph and Diagnostic Gap Engine Schema.

Revision ID: 002_knowledge_graph_and_diagnostics
Revises: 001_initial_schema
Create Date: 2026-09-08 20:08:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_knowledge_graph'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. competency_nodes table
    op.create_table(
        'competency_nodes',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=255), nullable=False),
        sa.Column('level', sa.String(length=64), server_default=sa.text("'intermediate'"), nullable=False),
        sa.Column('competency_id', sa.String(length=64), nullable=True),
        sa.Column('active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_competency_nodes_id'), 'competency_nodes', ['id'], unique=False)
    op.create_index(op.f('ix_competency_nodes_competency_id'), 'competency_nodes', ['competency_id'], unique=False)

    # 2. competency_relationships table
    op.create_table(
        'competency_relationships',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('source_node_id', sa.String(length=64), nullable=False),
        sa.Column('target_node_id', sa.String(length=64), nullable=False),
        sa.Column('relationship_type', sa.String(length=64), nullable=False),
        sa.Column('weight', sa.Float(), server_default=sa.text('1.0'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "relationship_type IN ('prerequisite', 'depends_on', 'related_to', 'applied_in', 'part_of', 'commonly_confused_with')",
            name='valid_relationship_type_check'
        ),
        sa.ForeignKeyConstraint(['source_node_id'], ['competency_nodes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_node_id'], ['competency_nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_competency_relationships_id'), 'competency_relationships', ['id'], unique=False)
    op.create_index(op.f('ix_competency_relationships_source_node_id'), 'competency_relationships', ['source_node_id'], unique=False)
    op.create_index(op.f('ix_competency_relationships_target_node_id'), 'competency_relationships', ['target_node_id'], unique=False)

    # 3. misconceptions table
    op.create_table(
        'misconceptions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('concept', sa.String(length=255), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('detection_rule', sa.Text(), nullable=False),
        sa.Column('confidence_level', sa.String(length=32), server_default=sa.text("'High'"), nullable=False),
        sa.Column('counter_example', sa.Text(), nullable=False),
        sa.Column('remediation_hint', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_misconceptions_id'), 'misconceptions', ['id'], unique=False)

    # 4. gap_diagnoses table
    op.create_table(
        'gap_diagnoses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('officer_profile_id', sa.Integer(), nullable=False),
        sa.Column('competency_id', sa.String(length=64), nullable=False),
        sa.Column('diagnosis_type', sa.String(length=64), nullable=False),
        sa.Column('severity', sa.String(length=32), server_default=sa.text("'moderate'"), nullable=False),
        sa.Column('confidence', sa.Float(), server_default=sa.text('0.85'), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('evidence_references', sa.Text(), nullable=True),
        sa.Column('reasoning_trace', sa.Text(), nullable=True),
        sa.Column('root_cause_competency_id', sa.String(length=64), nullable=True),
        sa.Column('misconception_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "diagnosis_type IN ('basic_concept', 'statistical_misconception', 'integrated_concept', 'application_gap', 'insufficient_evidence')",
            name='valid_diagnosis_type_check'
        ),
        sa.ForeignKeyConstraint(['officer_profile_id'], ['officer_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['misconception_id'], ['misconceptions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gap_diagnoses_id'), 'gap_diagnoses', ['id'], unique=False)
    op.create_index(op.f('ix_gap_diagnoses_officer_profile_id'), 'gap_diagnoses', ['officer_profile_id'], unique=False)
    op.create_index(op.f('ix_gap_diagnoses_competency_id'), 'gap_diagnoses', ['competency_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_gap_diagnoses_competency_id'), table_name='gap_diagnoses')
    op.drop_index(op.f('ix_gap_diagnoses_officer_profile_id'), table_name='gap_diagnoses')
    op.drop_index(op.f('ix_gap_diagnoses_id'), table_name='gap_diagnoses')
    op.drop_table('gap_diagnoses')

    op.drop_index(op.f('ix_misconceptions_id'), table_name='misconceptions')
    op.drop_table('misconceptions')

    op.drop_index(op.f('ix_competency_relationships_target_node_id'), table_name='competency_relationships')
    op.drop_index(op.f('ix_competency_relationships_source_node_id'), table_name='competency_relationships')
    op.drop_index(op.f('ix_competency_relationships_id'), table_name='competency_relationships')
    op.drop_table('competency_relationships')

    op.drop_index(op.f('ix_competency_nodes_competency_id'), table_name='competency_nodes')
    op.drop_index(op.f('ix_competency_nodes_id'), table_name='competency_nodes')
    op.drop_table('competency_nodes')

